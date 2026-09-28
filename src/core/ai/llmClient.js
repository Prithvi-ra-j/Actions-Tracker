/**
 * Generic LLM Client (§30 AI Write Boundary).
 *
 * Browser-safe provider client. Production deployments should point this at
 * a same-origin/server gateway; direct browser-provider calls are retained
 * only for local development/backward compatibility.
 */

import { getSetting, setSetting } from '../../database/settingsRepository.js';
import { getSecureValue } from '../../native/secureStorage.js';
import { saveTelemetryEvent } from '../../database/telemetryRepository.js';

function normalizeApiKey(value) {
  let key = String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
  return key.replace(/^(?:["'\x60\u2018\u2019\u201C\u201D])(.+)(?:["'\x60\u2018\u2019\u201C\u201D])$/s, '$1').trim();
}

function assertHeaderSafeApiKey(value) {
  const key = normalizeApiKey(value);
  if (!key) throw new Error('API key is empty.');
  if ([...key].some(char => char.charCodeAt(0) > 0x7F)) {
    throw new Error('API key contains an invalid character. Paste the raw API key without smart quotes, spaces, or formatting.');
  }
  return key;
}

async function resolveEndpoint() {
  const gateway = await getSetting('aiGatewayUrl');
  if (gateway) {
    return { endpoint: gateway, provider: 'server-gateway', apiKey: null };
  }

  const storedApiKey = await getSecureValue('aiApiKey');
  const apiKey = normalizeApiKey(storedApiKey);
  const baseUrl = await getSetting('aiBaseUrl') || 'https://api.groq.com/openai/v1';
  let model = await getSetting('aiModel') || 'openai/gpt-oss-20b';

  if (/api\.groq\.com/i.test(baseUrl) && model === 'gemma2-9b-it') {
    model = 'openai/gpt-oss-20b';
    await setSetting('aiModel', model).catch(() => {});
  }

  return {
    endpoint: baseUrl.endsWith('/chat/completions')
      ? baseUrl
      : `${baseUrl.replace(/\/$/, '')}/chat/completions`,
    provider: 'direct',
    apiKey: assertHeaderSafeApiKey(apiKey),
    model,
  };
}

export async function queryLLM(messages, options = {}) {
  const config = await resolveEndpoint();
  const model = config.model || await getSetting('aiModel') || 'openai/gpt-oss-20b';
  const startedAt = Date.now();

  const payload = {
    model,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 1024,
  };
  if (options.jsonMode) payload.response_format = { type: 'json_object' };

  const headers = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    await recordAICallTelemetry(options, model, startedAt, null, false);
    const safeDetail = errorText.slice(0, 500);
    throw new Error(`LLM API Error (${response.status}): ${safeDetail}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('LLM returned an empty response.');

  await recordAICallTelemetry(options, model, startedAt, content, true, data.usage);
  return content;
}

async function recordAICallTelemetry(options, model, startedAt, output, success, usage = {}) {
  try {
    await saveTelemetryEvent('ai_call', new Date().toISOString().split('T')[0], {
      requestId: options.requestId || crypto.randomUUID?.() || `ai_${Date.now()}`,
      intent: options.intent || 'unknown',
      conversationId: options.conversationId || null,
      proposalId: options.proposalId || null,
      mode: options.mode || null,
      model,
      inputTokens: usage.prompt_tokens ?? usage.input_tokens ?? Math.ceil(JSON.stringify(options.messages || []).length / 4),
      outputTokens: usage.completion_tokens ?? usage.output_tokens ?? (output ? Math.ceil(output.length / 4) : 0),
      latencyMs: Date.now() - startedAt,
      success,
    });
  } catch (error) {
    console.warn('[LLMClient] Failed to record AI telemetry:', error);
  }
}

export async function queryLlmJson(prompt, schema, options = {}) {
  const messages = [];
  if (options.system) messages.push({ role: 'system', content: options.system });
  messages.push({ role: 'user', content: prompt });

  const rawResponse = await queryLLM(messages, { ...options, jsonMode: true, messages });
  const parsed = JSON.parse(rawResponse);
  return schema.parse(parsed);
}

export async function verifyLLMConnection(apiKey, baseUrl, model) {
  let safeApiKey;
  try { safeApiKey = assertHeaderSafeApiKey(apiKey); }
  catch (err) { return { ok: false, error: err.message }; }

  if (!baseUrl || !model) return { ok: false, error: 'Base URL and model are required.' };

  const endpoint = baseUrl.endsWith('/chat/completions')
    ? baseUrl
    : `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  const startedAt = Date.now();
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${safeApiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Reply with OK' }], temperature: 0, max_tokens: 4 }),
    });

    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      let userMessage = `API error (${response.status}).`;
      if (response.status === 401) userMessage = 'Invalid API key.';
      else if (response.status === 404) userMessage = `Model "${model}" not found at this endpoint.`;
      else if (response.status === 429) userMessage = 'Rate limited — try again in a moment.';
      return { ok: false, error: userMessage };
    }

    const data = await response.json();
    return { ok: true, model: data.model || model, latencyMs, response: data.choices?.[0]?.message?.content };
  } catch (err) {
    return { ok: false, error: `Connection failed: ${err.message}` };
  }
}

/**
 * Generic LLM Client (§30 AI Write Boundary).
 *
 * Uses `fetch` to talk to an OpenAI-compatible endpoint (like Groq).
 * Configuration (API Key, Base URL, Model) is pulled from settingsRepository.
 */

import { getSetting } from '../../database/settingsRepository.js';
import { getSecureValue } from '../../native/secureStorage.js';
import { saveTelemetryEvent } from '../../database/telemetryRepository.js';

export async function queryLLM(messages, options = {}) {
  const apiKey = await getSecureValue('aiApiKey');
  const baseUrl = await getSetting('aiBaseUrl') || 'https://api.groq.com/openai/v1';
  let model = await getSetting('aiModel') || 'openai/gpt-oss-20b';

  // Groq retired gemma2-9b-it on 2025-10-08. Keep existing installations
  // working by transparently moving that legacy default to a current
  // production model. User-selected models are otherwise left untouched.
  if (/api\\.groq\\.com/i.test(baseUrl) && model === 'gemma2-9b-it') {
    model = 'openai/gpt-oss-20b';
    await getSetting('aiModel').then(saved => {
      if (saved === 'gemma2-9b-it') {
        // Importing setSetting here would add another dependency to every call;
        // the runtime fallback is enough to make the request work immediately.
      }
    }).catch(() => {});
  }
  const startedAt = Date.now();

  if (!apiKey) {
    throw new Error('AI API Key is not configured. Please set it in Settings.');
  }

  const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  const payload = {
    model,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 1024,
  };

  // If we require JSON output, some providers support response_format
  if (options.jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: options.signal
  });

  if (!response.ok) {
    const errorText = await response.text();
    await recordAICallTelemetry(options, model, startedAt, null, false);
    throw new Error(`LLM API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('LLM returned an empty response.');
  }

  await recordAICallTelemetry(options, model, startedAt, content, true, data.usage);
  return content;
}

async function recordAICallTelemetry(options, model, startedAt, output, success, usage = {}) {
  try {
    await saveTelemetryEvent('ai_call', new Date().toISOString().split('T')[0], {
      intent: options.intent || 'unknown',
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

/**
 * Convenience wrapper for structured JSON requests.
 * @param {string} prompt The user prompt.
 * @param {import('zod').ZodSchema} schema The Zod schema to validate against.
 * @param {object} options Additional options (system prompt, temperature).
 */
export async function queryLlmJson(prompt, schema, options = {}) {
  const messages = [];
  if (options.system) messages.push({ role: 'system', content: options.system });
  messages.push({ role: 'user', content: prompt });
  
  const rawResponse = await queryLLM(messages, { 
    ...options, 
    jsonMode: true 
  });

  try {
    const parsed = JSON.parse(rawResponse);
    return schema.parse(parsed);
  } catch (err) {
    console.error('Failed to parse or validate LLM JSON output:', err);
    throw err;
  }
}

/**
 * Verify an LLM connection using explicit credentials (not persisted settings).
 * Sends a minimal prompt to check the API key and model are valid.
 * Returns { ok: true, model, latencyMs } on success or { ok: false, error } on failure.
 */
export async function verifyLLMConnection(apiKey, baseUrl, model) {
  if (!apiKey) {
    return { ok: false, error: 'API key is empty.' };
  }
  if (!baseUrl) {
    return { ok: false, error: 'Base URL is empty.' };
  }
  if (!model) {
    return { ok: false, error: 'Model name is empty.' };
  }

  const endpoint = baseUrl.endsWith('/chat/completions')
    ? baseUrl
    : `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  const startedAt = Date.now();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with OK' }],
        temperature: 0,
        max_tokens: 4,
      }),
    });

    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      const errorText = await response.text();
      let userMessage;
      if (response.status === 401) {
        userMessage = 'Invalid API key.';
      } else if (response.status === 404) {
        userMessage = `Model "${model}" not found at this endpoint.`;
      } else if (response.status === 429) {
        userMessage = 'Rate limited — try again in a moment.';
      } else {
        userMessage = `API error (${response.status}): ${errorText.slice(0, 150)}`;
      }
      return { ok: false, error: userMessage };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const actualModel = data.model || model;

    return { ok: true, model: actualModel, latencyMs, response: content };
  } catch (err) {
    return { ok: false, error: `Connection failed: ${err.message}` };
  }
}

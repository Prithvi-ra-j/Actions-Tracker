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
  const model = await getSetting('aiModel') || 'gemma2-9b-it';
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
    body: JSON.stringify(payload)
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

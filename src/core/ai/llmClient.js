/**
 * Generic LLM Client (§30 AI Write Boundary).
 *
 * Uses `fetch` to talk to an OpenAI-compatible endpoint (like Groq).
 * Configuration (API Key, Base URL, Model) is pulled from settingsRepository.
 */

import { getSetting } from '../../database/settingsRepository.js';
import { getSecureValue } from '../../native/secureStorage.js';

export async function queryLLM(messages, options = {}) {
  const apiKey = await getSecureValue('aiApiKey');
  const baseUrl = await getSetting('aiBaseUrl') || 'https://api.groq.com/openai/v1';
  const model = await getSetting('aiModel') || 'gemma2-9b-it';

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
    throw new Error(`LLM API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('LLM returned an empty response.');
  }

  return content;
}

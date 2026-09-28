import { getSetting, setSetting } from '../../database/settingsRepository.js';
import {
  getSecureValue,
  setSecureValue,
  clearSecureValue,
} from '../../native/secureStorage.js';

export const DEFAULT_JARVIS_BASE_URL = 'https://api.groq.com/openai/v1';
export const DEFAULT_JARVIS_MODEL = 'openai/gpt-oss-20b';
export const JARVIS_API_KEY_STORAGE_KEY = 'aiApiKey';
export const DEFAULT_JARVIS_GATEWAY_URL = import.meta.env.VITE_AI_GATEWAY_URL || '';

export async function hasJarvisApiKey() {
  const key = await getSecureValue(JARVIS_API_KEY_STORAGE_KEY);
  return Boolean(DEFAULT_JARVIS_GATEWAY_URL || key);
}

export async function getJarvisConfig() {
  const [apiKey, baseUrl, model, gatewayUrl] = await Promise.all([
    getSecureValue(JARVIS_API_KEY_STORAGE_KEY),
    getSetting('aiBaseUrl'),
    getSetting('aiModel'),
    getSetting('aiGatewayUrl'),
  ]);

  return {
    hasApiKey: Boolean(apiKey),
    baseUrl: baseUrl || DEFAULT_JARVIS_BASE_URL,
    model: model || DEFAULT_JARVIS_MODEL,
    gatewayUrl: gatewayUrl || DEFAULT_JARVIS_GATEWAY_URL,
  };
}

export async function saveJarvisConfig({ apiKey, baseUrl, model, gatewayUrl }) {
  if (!apiKey && !gatewayUrl) throw new Error('Jarvis API key or server gateway is required.');

  if (gatewayUrl) await setSetting('aiGatewayUrl', gatewayUrl);
  if (apiKey) await setSecureValue(JARVIS_API_KEY_STORAGE_KEY, apiKey);
  await setSetting('aiBaseUrl', baseUrl || DEFAULT_JARVIS_BASE_URL);
  await setSetting('aiModel', model || DEFAULT_JARVIS_MODEL);

  return getJarvisConfig();
}

export async function clearJarvisConfig() {
  await clearSecureValue(JARVIS_API_KEY_STORAGE_KEY);
}

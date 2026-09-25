import { getSetting, setSetting } from '../../database/settingsRepository.js';
import {
  getSecureValue,
  setSecureValue,
  clearSecureValue,
} from '../../native/secureStorage.js';

export const DEFAULT_JARVIS_BASE_URL = 'https://api.groq.com/openai/v1';
export const DEFAULT_JARVIS_MODEL = 'openai/gpt-oss-20b';
export const JARVIS_API_KEY_STORAGE_KEY = 'aiApiKey';

export async function hasJarvisApiKey() {
  const key = await getSecureValue(JARVIS_API_KEY_STORAGE_KEY);
  return Boolean(key);
}

export async function getJarvisConfig() {
  const [apiKey, baseUrl, model] = await Promise.all([
    getSecureValue(JARVIS_API_KEY_STORAGE_KEY),
    getSetting('aiBaseUrl'),
    getSetting('aiModel'),
  ]);

  return {
    hasApiKey: Boolean(apiKey),
    baseUrl: baseUrl || DEFAULT_JARVIS_BASE_URL,
    model: model || DEFAULT_JARVIS_MODEL,
  };
}

export async function saveJarvisConfig({ apiKey, baseUrl, model }) {
  if (!apiKey) throw new Error('Jarvis API key is required.');

  await setSecureValue(JARVIS_API_KEY_STORAGE_KEY, apiKey);
  await setSetting('aiBaseUrl', baseUrl || DEFAULT_JARVIS_BASE_URL);
  await setSetting('aiModel', model || DEFAULT_JARVIS_MODEL);

  return getJarvisConfig();
}

export async function clearJarvisConfig() {
  await clearSecureValue(JARVIS_API_KEY_STORAGE_KEY);
}

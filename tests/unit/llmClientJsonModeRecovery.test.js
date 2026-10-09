import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/native/secureStorage.js', () => ({
  getSecureValue: vi.fn(async () => 'sk-test-api-key'),
}));

vi.mock('../../src/database/settingsRepository.js', () => ({
  getSetting: vi.fn(async key => {
    if (key === 'aiBaseUrl') return 'https://example.test/v1';
    if (key === 'aiModel') return 'test-model';
    return null;
  }),
  setSetting: vi.fn(),
}));

vi.mock('../../src/database/telemetryRepository.js', () => ({
  saveTelemetryEvent: vi.fn(),
}));

import { queryLLM } from '../../src/core/ai/llmClient.js';

describe('llmClient JSON mode errors', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves rejected JSON output details for conversational recovery', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({
        error: {
          code: 'json_validate_failed',
          failed_generation: 'What does your evening routine look like?',
        },
      }),
    });

    await expect(queryLLM(
      [{ role: 'user', content: 'Continue onboarding.' }],
      { jsonMode: true, intent: 'jarvis_chat' }
    )).rejects.toMatchObject({
      status: 400,
      providerCode: 'json_validate_failed',
      failedGeneration: 'What does your evening routine look like?',
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/native/secureStorage.js', () => ({
  getSecureValue: vi.fn(),
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

import { verifyLLMConnection } from '../../src/core/ai/llmClient.js';

describe('llmClient API key header validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  it('rejects non-ASCII API keys before fetch', async () => {
    const result = await verifyLLMConnection(
      'sk-test-abc-\u201c',
      'https://example.test/v1',
      'test-model'
    );

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/invalid character/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('accepts a key wrapped in quotes and sends a safe header', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        model: 'test-model',
        choices: [{ message: { content: 'OK' } }],
      }),
    });

    const result = await verifyLLMConnection(
      '  "sk-test-abc123"  ',
      'https://example.test/v1',
      'test-model'
    );

    expect(result.ok).toBe(true);
    const [, requestInit] = global.fetch.mock.calls[0];
    expect(requestInit.headers.Authorization).toBe('Bearer sk-test-abc123');
  });
});

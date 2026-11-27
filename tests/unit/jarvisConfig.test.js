import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/database/settingsRepository.js', () => ({
  getSetting: vi.fn(),
  setSetting: vi.fn(),
}));
vi.mock('../../src/native/secureStorage.js', () => ({
  getSecureValue: vi.fn(),
  setSecureValue: vi.fn(),
  clearSecureValue: vi.fn(),
}));

import { getSetting } from '../../src/database/settingsRepository.js';
import { getSecureValue } from '../../src/native/secureStorage.js';
import { hasJarvisApiKey } from '../../src/core/ai/jarvisConfig.js';

describe('AI connection availability', () => {
  it('recognizes a saved gateway even without a local key', async () => {
    getSecureValue.mockResolvedValue(null);
    getSetting.mockResolvedValue('/api/assistant');
    expect(await hasJarvisApiKey()).toBe(true);
    expect(getSetting).toHaveBeenCalledWith('aiGatewayUrl');
  });
});

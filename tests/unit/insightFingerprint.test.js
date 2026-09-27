import { describe, expect, it } from 'vitest';
import { insightFingerprint } from '../../src/core/ai/insightFingerprint.js';

describe('insight fingerprint', () => {
  it('is deterministic for the same finding identity', () => {
    const a = insightFingerprint({ type: 'daily', title: 'Daily Summary: 2026-09-28', domain: 'body' });
    const b = insightFingerprint({ type: 'daily', title: 'Daily Summary: 2026-09-28', domain: 'body' });
    expect(a).toBe(b);
  });

  it('changes when the finding identity changes', () => {
    const a = insightFingerprint({ type: 'monthly', title: 'September audit', domain: 'body' });
    const b = insightFingerprint({ type: 'monthly', title: 'September audit', domain: 'strategy' });
    expect(a).not.toBe(b);
  });
});

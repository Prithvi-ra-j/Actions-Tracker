import { describe, expect, it } from 'vitest';
import { classifyEvidenceQuality } from '../../src/core/goals/goalProgressEngine.js';

describe('goal evidence quality', () => {
  it('distinguishes measured evidence from self-reported evidence', () => {
    expect(classifyEvidenceQuality([
      { source: { type: 'health_connect' }, type: 'body_workout' },
      { source: { type: 'manual' }, type: 'reflection' },
    ])).toBe('measured');
  });

  it('uses self-reported only when no measured evidence exists', () => {
    expect(classifyEvidenceQuality([
      { source: { type: 'manual' }, type: 'reflection' },
    ])).toBe('self_reported');
    expect(classifyEvidenceQuality([])).toBe('none');
  });
});

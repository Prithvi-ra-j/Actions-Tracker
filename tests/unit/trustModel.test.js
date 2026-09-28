import { describe, expect, it } from 'vitest';
import { classifyMemoryTruth, trustLevel } from '../../src/core/ai/trustModel.js';

describe('memory trust model', () => {
  it('distinguishes confirmed patterns from hypotheses', () => {
    expect(classifyMemoryTruth({ type: 'pattern', status: 'confirmed' })).toBe('pattern');
    expect(classifyMemoryTruth({ type: 'pattern', status: 'proposed' })).toBe('hypothesis');
    expect(trustLevel({ truthClass: 'hypothesis', confidence: 0.3 })).toBe('uncertain');
  });
});

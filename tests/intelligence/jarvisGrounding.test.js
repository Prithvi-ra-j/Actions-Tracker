import { describe, expect, it } from 'vitest';
import { createGroundedClaim, claimCanBeShown } from '../../src/core/evidence/claimEngine.js';

describe('Jarvis grounding', () => {
  it('requires evidence before a claim can be surfaced', () => {
    expect(() => createGroundedClaim({ text: 'Unsupported claim' })).toThrow();
    const claim = createGroundedClaim({
      text: 'Completion improved',
      evidence: [{ id: 'e1' }],
      confidence: 0.8,
    });
    expect(claimCanBeShown(claim)).toBe(true);
  });
});

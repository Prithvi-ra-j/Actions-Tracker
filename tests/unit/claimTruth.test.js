import { describe, expect, it } from 'vitest';
import { evaluateClaimTruth } from '../../src/core/evidence/claimTruth.js';

describe('claim truth boundary', () => {
  it('marks conflicting evidence as conflicted instead of choosing a winner', () => {
    const result = evaluateClaimTruth({
      claim: 'Completion is good',
      confidence: 0.95,
      evidence: [
        { id: 'self', subjectId: 'completion', polarity: 'positive' },
        { id: 'recorded', subjectId: 'completion', polarity: 'negative' },
      ],
    });
    expect(result.status).toBe('conflicted');
    expect(result.resolution).toBe('ask_user');
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('keeps unsupported confidence provisional', () => {
    const result = evaluateClaimTruth({
      claim: 'Pattern exists',
      confidence: 0.4,
      evidence: [{ id: 'e1', subjectId: 'x', polarity: 'positive' }],
    });
    expect(result.status).toBe('provisional');
    expect(result.confidence).toBe(0.4);
  });
});

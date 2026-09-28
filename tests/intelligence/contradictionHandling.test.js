import { describe, expect, it } from 'vitest';
import { detectContradictions, reconcileSources } from '../../src/core/evidence/contradictionEngine.js';

describe('contradiction handling', () => {
  it('does not silently select a source when evidence conflicts', () => {
    const result = reconcileSources([
      { id: 'u1', subjectId: 'exercise', polarity: 'positive' },
      { id: 'i1', subjectId: 'exercise', polarity: 'negative' },
    ]);
    expect(result.status).toBe('conflicted');
    expect(result.authoritative).toBeNull();
    expect(detectContradictions([
      { id: 'u1', subjectId: 'exercise', polarity: 'positive' },
      { id: 'i1', subjectId: 'exercise', polarity: 'negative' },
    ])).toHaveLength(1);
  });
});

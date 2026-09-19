import { describe, expect, it } from 'vitest';
import { projectThreeMonthImpact } from '../../src/core/ai/impactEngine.js';

describe('three-month impact projections', () => {
  it('returns deterministic, bounded scenarios with explicit assumptions', () => {
    const proposal = {
      actionType: 'add_habit',
      payload: {
        domain: 'creativity',
        frequency: { type: 'weekly', days: [4, 6] },
        phase: 'building',
        masteryRoadmap: { currentLevel: 1, levels: [{}, {}, {}] },
      },
    };
    const state = { stats: { creativity: 20 }, axisDetails: { creativity: { C: 20, V: 10, M: 0 } } };
    const result = projectThreeMonthImpact(proposal, state);

    expect(result.horizonDays).toBe(90);
    expect(result.before).toBe(20);
    expect(result.estimatedRange.low).toBeLessThanOrEqual(result.estimatedRange.high);
    expect(result.scenarios).toHaveLength(2);
    expect(result.assumptions).toEqual(expect.arrayContaining([
      expect.stringContaining('90 days'),
      expect.stringContaining('60% and 90%'),
    ]));
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('Volume remains unchanged'),
    ]));
  });
});
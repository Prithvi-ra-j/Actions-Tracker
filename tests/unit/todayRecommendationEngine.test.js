import { describe, expect, it } from 'vitest';
import { buildTodayRecommendations } from '../../src/core/today/todayRecommendationEngine.js';

describe('today recommendation engine', () => {
  it('prioritizes pending scheduled actions', () => {
    const result = buildTodayRecommendations({
      occurrences: [
        { id: '1', habitTitle: 'Train', status: 'unknown', axis: 'body' },
        { id: '2', habitTitle: 'German', status: 'completed', axis: 'knowledge' },
      ],
      stats: { body: 60 },
      axisDetails: { body: { confidence: 0.9, coverage: 0.9 } },
      goals: [],
    });
    expect(result.items[0].title).toBe('Train');
    expect(result.workload.pending).toBe(1);
  });

  it('recommends evidence collection when confidence is low', () => {
    const result = buildTodayRecommendations({
      occurrences: [],
      stats: { social: 50 },
      axisDetails: { social: { confidence: 0.2, coverage: 0.1 } },
      goals: [],
    });
    expect(result.items.some(item => item.id === 'evidence:social')).toBe(true);
  });

  it('does not mutate goals or create actions', () => {
    const goals = [{ id: 'g1', title: 'Run 10K', status: 'active' }];
    const result = buildTodayRecommendations({ goals });
    expect(goals).toEqual([{ id: 'g1', title: 'Run 10K', status: 'active' }]);
    expect(result.items.some(item => item.type === 'goal')).toBe(true);
  });
});

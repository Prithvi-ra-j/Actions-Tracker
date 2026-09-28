import { describe, expect, it } from 'vitest';
import { buildTodayRecommendations } from '../../src/core/today/todayRecommendationEngine.js';

describe('recommendation quality', () => {
  it('returns structured explainable recommendations', () => {
    const result = buildTodayRecommendations({
      occurrences: [{ id: 'o1', status: 'pending', habitTitle: 'Study', effort: 20, axis: 'knowledge' }],
      goals: [{ id: 'g1', title: 'German', status: 'at_risk', domain: 'knowledge' }],
      stats: { knowledge: 40 },
      axisDetails: { knowledge: { confidence: 0.8, coverage: 0.8 } },
      capacity: { used: 20, limit: 100 },
      now: new Date('2026-01-10T10:00:00Z'),
    });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]).toHaveProperty('recommendationId');
    expect(result.items[0]).toHaveProperty('expectedImpact');
    expect(result.items[0]).toHaveProperty('confidence');
    expect(result.items[0]).toHaveProperty('expiresAt');
  });
});

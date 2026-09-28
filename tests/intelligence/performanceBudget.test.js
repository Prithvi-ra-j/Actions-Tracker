import { describe, expect, it } from 'vitest';
import { measurePerformance } from '../../src/core/observability/performanceBudget.js';

describe('performance budgets', () => {
  it('measures local operations against explicit budgets', async () => {
    const measured = await measurePerformance('todayRecommendations', () => ({ ok: true }), 300);
    expect(measured.result.ok).toBe(true);
    expect(measured.metric.durationMs).toBeGreaterThanOrEqual(0);
    expect(measured.metric.withinBudget).toBe(true);
  });
});

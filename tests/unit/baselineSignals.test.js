import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBaselineSignals } from '../../src/core/calibration/baselineSignals.js';

vi.mock('../../src/database/factsRepository.js', () => ({
  getAllFacts: vi.fn(async () => [
    {
      id: 'obs_1',
      type: 'calibration.observation',
      objectId: 'action_completion',
      value: 40,
      occurredAt: '2026-09-01T08:00:00Z',
      meta: { evidenceId: 'e1' },
    },
    {
      id: 'obs_2',
      type: 'calibration.observation',
      objectId: 'action_completion',
      value: 45,
      occurredAt: '2026-09-08T08:00:00Z',
      meta: { evidenceId: 'e2' },
    },
    {
      id: 'obs_3',
      type: 'calibration.observation',
      objectId: 'action_completion',
      value: 20,
      occurredAt: '2026-09-15T08:00:00Z',
      meta: { evidenceId: 'e3' },
    },
  ]),
}));

vi.mock('../../src/core/calibration/baselineRepository.js', () => ({
  getAllBaselines: vi.fn(async () => ({
    action_completion: {
      value: 40,
      variance: 25,
      sampleSize: 12,
      confidence: 0.9,
      lastObservedAt: '2026-09-08T08:00:00Z',
    },
  })),
}));

describe('baseline signals', () => {
  beforeEach(() => vi.clearAllMocks());

  it('derives an explainable deviation from append-only observations and a baseline', async () => {
    const result = await getBaselineSignals({
      now: new Date('2026-09-28T12:00:00Z'),
      zThreshold: 1,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'baseline_deviation',
      metric: 'action_completion',
      severity: 'high',
    });
    expect(result[0].evidence.supportingEvidenceId).toBe('e3');
    expect(result[0].trend.direction).toBe('down');
  });
});

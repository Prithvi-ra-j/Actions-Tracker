import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { initDB, closeDB } from '../../src/database/db.js';
import { addFact } from '../../src/database/factsRepository.js';
import { addIntervention, getIntervention } from '../../src/database/interventionRepository.js';
import { runInterventionOutcomeScheduler } from '../../src/core/interventions/interventionOutcomeScheduler.js';
import { calculateEffectiveness } from '../../src/core/interventions/interventionEffectiveness.js';
import { rankInterventions } from '../../src/core/interventions/interventionPredictor.js';

describe('automatic intervention outcome lifecycle', () => {
  beforeEach(async () => {
    try { closeDB(); } catch {}
    await initDB();
  });

  it('runs an expired intervention from evidence collection through future ranking', async () => {
    const intervention = await addIntervention({
      id: 'intervention_lifecycle_1',
      recommendationId: 'rec_1',
      hypothesis: 'Moving the action earlier improves completion.',
      context: {
        interventionType: 'move_earlier',
        recommendationType: 'action',
      },
      expectedOutcome: 0.8,
      outcomeWindowDays: 14,
      proposedAt: '2026-09-01T08:00:00Z',
      measurement: {
        factType: 'habit_completion',
        objectId: 'habit_1',
        aggregation: 'average',
        baselineValue: 0.4,
        expectedValue: 0.8,
        minSamples: 1,
        higherIsBetter: true,
      },
    });

    await addFact({
      id: 'outcome_fact_1',
      type: 'habit_completion',
      objectId: 'habit_1',
      value: 0.9,
      occurredAt: '2026-09-10T08:00:00Z',
      source: { type: 'manual' },
    });

    const run = await runInterventionOutcomeScheduler({
      now: new Date('2026-09-16T08:00:00Z'),
    });

    expect(run.dueCount).toBe(1);
    expect(run.evaluated).toBe(1);
    expect(run.results[0].status).toBe('completed');

    const closed = await getIntervention(intervention.id);
    expect(closed.status).toBe('completed');
    expect(closed.evaluation.result).toBe('positive');
    expect(closed.evaluation.effect).toBeCloseTo(0.5);

    const effectiveness = calculateEffectiveness([closed], { minSamples: 1 });
    expect(effectiveness.move_earlier.successRate).toBe(1);
    expect(effectiveness.move_earlier.sampleSize).toBe(1);

    const ranked = rankInterventions(
      [{ id: 'candidate', type: 'intervention', recommendationType: 'action', interventionType: 'move_earlier', baseScore: 50 }],
      [closed],
    );
    expect(ranked[0].interventionLearning.successRate).toBe(1);
    expect(ranked[0].score).toBeGreaterThan(50);
  });

  it('does not close an expired intervention when the outcome evidence is insufficient', async () => {
    const intervention = await addIntervention({
      id: 'intervention_wait_1',
      hypothesis: 'Test evidence gate.',
      proposedAt: '2026-09-01T08:00:00Z',
      outcomeWindowDays: 14,
      measurement: {
        factType: 'habit_completion',
        objectId: 'missing_habit',
        baselineValue: 0.5,
        expectedValue: 0.8,
        minSamples: 2,
      },
    });

    const run = await runInterventionOutcomeScheduler({
      now: new Date('2026-09-16T08:00:00Z'),
    });

    expect(run.evaluated).toBe(0);
    expect(run.results[0].status).toBe('insufficient_evidence');
    expect((await getIntervention(intervention.id)).status).toBe('active');
  });
});

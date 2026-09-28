import { describe, expect, it, vi } from 'vitest';
import { buildGoalLifecycle } from '../../src/core/goals/goalLifecycle.js';

vi.mock('../../src/database/factsRepository.js', () => ({
  getAllFacts: vi.fn(async () => [
    { id: 'f1', objectId: 'g1', type: 'goal.progress', occurredAt: '2026-09-27T08:00:00Z' },
  ]),
}));

vi.mock('../../src/database/relationRepository.js', () => ({
  getRelationsTo: vi.fn(async () => [{ fromId: 'e1', toId: 'g1', type: 'contributes_to' }]),
  getRelationsFrom: vi.fn(async () => [{ fromId: 'a1', toId: 'g1', type: 'supports' }]),
}));

vi.mock('../../src/database/goalsRepository.js', () => ({
  getGoal: vi.fn(async () => ({
    id: 'g1',
    title: 'German B2',
    status: 'active',
    progress: 0.5,
    targetProgress: 1,
  })),
}));

vi.mock('../../src/core/goals/goalOutcomeEngine.js', () => ({
  evaluateGoalOutcome: vi.fn(() => ({
    status: 'behind',
    delta: -0.1,
    confidence: 0.8,
  })),
}));

vi.mock('../../src/core/goals/goalLearningEngine.js', () => ({
  learnGoal: vi.fn(async () => ({
    goalId: 'g1',
    assessmentCount: 1,
    adaptationCount: 1,
    learningCount: 1,
    planAdapted: true,
  })),
}));

describe('goal lifecycle snapshot', () => {
  it('combines goal, action, evidence, outcome and learning into one traceable view', async () => {
    const result = await buildGoalLifecycle('g1', {
      expectedTrajectory: [{ value: 0.6 }],
      actualTrajectory: [{ value: 0.5 }],
    });

    expect(result.goalId).toBe('g1');
    expect(result.evidenceCount).toBe(1);
    expect(result.supportingActionCount).toBe(1);
    expect(result.outcome.status).toBe('behind');
    expect(result.learning.planAdapted).toBe(true);
    expect(result.trace.factIds).toEqual(['f1']);
  });
});

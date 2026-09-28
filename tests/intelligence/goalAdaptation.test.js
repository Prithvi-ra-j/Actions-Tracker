import { describe, expect, it } from 'vitest';
import { evaluateGoalOutcome } from '../../src/core/goals/goalOutcomeEngine.js';

describe('goal adaptation intelligence', () => {
  it('detects a behind trajectory without pretending to prove causation', () => {
    const result = evaluateGoalOutcome({
      expectedTrajectory: [{ value: 0.8 }],
      actualTrajectory: [{ value: 0.5 }],
      deadline: '2026-12-31',
    });
    expect(result.status).toBe('behind');
    expect(result.delta).toBeCloseTo(-0.3);
  });
});

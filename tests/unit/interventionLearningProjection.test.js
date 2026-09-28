import { describe, expect, it } from 'vitest';
import { summarizeInterventionLearning, applyInterventionLearning } from '../../src/core/ai/interventionLearning.js';

describe('intervention learning projection', () => {
  it('summarizes outcomes by recommendation type', () => {
    const learning = summarizeInterventionLearning([
      { status: 'completed', context: { recommendationType: 'action' }, evaluation: { result: 'positive', effect: 0.4 } },
      { status: 'completed', context: { recommendationType: 'action' }, evaluation: { result: 'positive', effect: 0.2 } },
      { status: 'completed', context: { recommendationType: 'action' }, evaluation: { result: 'negative', effect: -0.1 } },
    ]);
    expect(learning.typeLearning.action.completed).toBe(3);
    expect(learning.typeLearning.action.positiveRate).toBeCloseTo(2 / 3);
  });

  it('changes recommendation priority only after enough outcome evidence', () => {
    expect(applyInterventionLearning(50, 'action', {
      typeLearning: { action: { completed: 1, positiveRate: 1, negative: 0 } },
    })).toBe(50);

    const learned = applyInterventionLearning(50, 'action', {
      typeLearning: { action: { completed: 4, positiveRate: 0.75, negative: 1 } },
    });
    expect(learned).toBeGreaterThan(50);
  });
});

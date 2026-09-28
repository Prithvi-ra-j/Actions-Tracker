import { describe, expect, it } from 'vitest';
import { calculateEffectiveness } from '../../src/core/interventions/interventionEffectiveness.js';
import { rankInterventions, shouldReuseIntervention } from '../../src/core/interventions/interventionPredictor.js';

describe('intervention effectiveness', () => {
  it('learns positive and negative outcomes without claiming causation', () => {
    const history = [
      { status: 'completed', context: { interventionType: 'move_earlier' }, evaluation: { result: 'positive', effect: 0.2, confidence: 0.8 } },
      { status: 'completed', context: { interventionType: 'move_earlier' }, evaluation: { result: 'positive', effect: 0.1, confidence: 0.8 } },
      { status: 'completed', context: { interventionType: 'move_earlier' }, evaluation: { result: 'negative', effect: -0.1, confidence: 0.7 } },
    ];
    const learning = calculateEffectiveness(history).move_earlier;
    expect(learning.sampleSize).toBe(3);
    expect(learning.successRate).toBeCloseTo(2 / 3);
    expect(shouldReuseIntervention(learning)).toBe(true);
    expect(rankInterventions([{ id: 'a', type: 'intervention', baseScore: 50, interventionType: 'move_earlier' }], history)[0].score).toBeGreaterThan(50);
  });
});

import { describe, expect, it } from 'vitest';
import { ActionProposalSchema } from '../../src/core/ai/actionSchemas.js';

const impact = {
  affectedDomains: [],
  scoringImpact: '',
  routineImpact: '',
  identityAlignment: '',
  disciplineImpact: '',
  risks: [],
  dependencies: [],
};

describe('ActionProposalSchema', () => {
  it('requires ids for mutating existing entities', () => {
    expect(() => ActionProposalSchema.parse({
      actionType: 'pause_habit',
      payload: {},
      impact,
      reasoning: 'pause',
      confidence: 0.8,
    })).toThrow();
  });

  it('accepts a complete add-habit proposal', () => {
    expect(ActionProposalSchema.parse({
      actionType: 'add_habit',
      payload: { name: 'Sketch' },
      impact,
      reasoning: 'Fits capacity',
      confidence: 0.8,
    }).actionType).toBe('add_habit');
  });
});

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
      payload: { name: 'Sketch', frequency: { type: 'daily' } },
      impact,
      reasoning: 'Fits capacity',
      confidence: 0.8,
    }).actionType).toBe('add_habit');
  });

  it('requires an explicit schedule for add-habit proposals', () => {
    const proposal = {
      actionType: 'add_habit',
      payload: { name: 'After-work gym' },
      impact,
      reasoning: 'Fits capacity',
      confidence: 0.8,
    };

    expect(() => ActionProposalSchema.parse(proposal)).toThrow(/frequency/i);
    expect(ActionProposalSchema.parse({
      ...proposal,
      payload: { ...proposal.payload, frequency: { type: 'weekly', days: [2, 4] } },
    }).payload.frequency).toEqual({ type: 'weekly', days: [2, 4] });
  });

  it('rejects invalid weekly day indexes and duplicates', () => {
    const base = {
      actionType: 'add_habit',
      payload: { name: 'After-work gym' },
      impact,
      reasoning: 'Fits capacity',
      confidence: 0.8,
    };

    expect(() => ActionProposalSchema.parse({
      ...base,
      payload: { ...base.payload, frequency: { type: 'weekly', days: [2, 7] } },
    })).toThrow();
    expect(() => ActionProposalSchema.parse({
      ...base,
      payload: { ...base.payload, frequency: { type: 'weekly', days: [2, 2] } },
    })).toThrow();
  });
});

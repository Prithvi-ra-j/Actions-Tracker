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

function proposal(actionType, payload) {
  return ActionProposalSchema.parse({
    actionType,
    payload,
    impact,
    reasoning: 'test',
    confidence: 0.8,
  });
}

describe('Jarvis action contracts', () => {
  it('accepts raw evidence capture', () => {
    expect(proposal('log_evidence', { text: 'Completed the planned run', domain: 'body' }).actionType)
      .toBe('log_evidence');
  });

  it('accepts reviewable memory proposals', () => {
    expect(proposal('propose_memory', { content: 'User prefers morning training' }).actionType)
      .toBe('propose_memory');
  });

  it('accepts bounded multi-step plans', () => {
    const result = proposal('create_plan', {
      steps: [
        { actionType: 'add_quest', payload: { title: 'Ship v1', metric: { type: 'manual' } } },
        { actionType: 'log_evidence', payload: { text: 'Plan approved' } },
      ],
    });
    expect(result.payload.steps).toHaveLength(2);
  });

  it('rejects an empty plan', () => {
    expect(() => proposal('create_plan', { steps: [] })).toThrow();
  });
});

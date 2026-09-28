import { describe, expect, it } from 'vitest';
import { buildExecutionPlan, validatePlanDependencies, evaluateCondition } from '../../src/core/ai/executionGraph.js';
import { listTools, hasTool } from '../../src/core/ai/toolRegistry.js';

describe('universal Jarvis orchestration', () => {
  it('exposes a governed tool registry', () => {
    expect(listTools().length).toBeGreaterThan(5);
    expect(hasTool('createGoal')).toBe(true);
    expect(hasTool('archiveHabit')).toBe(true);
  });

  it('rejects unknown and cyclic dependencies', () => {
    expect(() => buildExecutionPlan({
      inputId: 'input_1',
      actions: [{ id: 'a', tool: 'createGoal', arguments: {}, dependsOn: ['missing'] }],
    })).toThrow(/Unknown dependency/);

    const plan = {
      id: 'p',
      inputId: 'i',
      requiresConfirmation: false,
      status: 'draft',
      actions: [
        { id: 'a', tool: 'createGoal', arguments: {}, dependsOn: ['b'], riskLevel: 'low', status: 'queued' },
        { id: 'b', tool: 'createGoal', arguments: {}, dependsOn: ['a'], riskLevel: 'low', status: 'queued' },
      ],
    };
    expect(() => validatePlanDependencies(plan)).toThrow(/dependency cycle/i);
  });

  it('evaluates supported conditions against prior results', () => {
    const results = { first: { completed: true, id: 'x' } };
    expect(evaluateCondition({ type:'result_field_true', actionId:'first', field:'completed' }, results)).toBe(true);
    expect(evaluateCondition({ type:'result_field_equals', actionId:'first', field:'id', value:'x' }, results)).toBe(true);
    expect(evaluateCondition({ type:'result_exists', actionId:'first' }, results)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { createJarvisInput, JarvisTurnSchema } from '../../src/core/ai/jarvisContracts.js';

describe('Jarvis contracts', () => {
  it('normalizes a universal input from text', () => {
    const input = createJarvisInput({ source:'text', text:'log my workout', conversationId:'c1' });
    expect(input.source).toBe('text');
    expect(input.conversationId).toBe('c1');
    expect(input.text).toBe('log my workout');
  });

  it('validates structured multi-action turns', () => {
    const turn = JarvisTurnSchema.parse({
      intent:'PLAN',
      message:'I can do that.',
      clarification:null,
      actions:[
        { tool:'createGoal', arguments:{ title:'Marathon' }, dependsOn:[], condition:null },
        { tool:'createGoal', arguments:{ title:'German' }, dependsOn:[], condition:null },
      ],
    });
    expect(turn.actions).toHaveLength(2);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/core/ai/llmClient.js', () => ({
  queryLLM: vi.fn(),
}));

vi.mock('../../src/core/ai/contextBuilder.js', () => ({
  assembleContext: vi.fn(async () => JSON.stringify({
    context_version: 'test-v1',
    recent_evidence_facts: [],
    semantic_memories: [],
    active_habits: [],
    active_goals: [],
  })),
  validateClaimSupport: vi.fn(),
}));

import { queryLLM } from '../../src/core/ai/llmClient.js';
import { chatWithJarvis, generateInsight } from '../../src/core/ai/jarvisEngine.js';
import { JARVIS_INSIGHT_SYSTEM_PROMPT } from '../../src/core/ai/jarvisPersona.js';

describe('Jarvis chat provider recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows rejected plain-text output without permitting an action', async () => {
    const providerError = Object.assign(new Error('LLM API Error (400)'), {
      status: 400,
      providerCode: 'json_validate_failed',
      failedGeneration: 'What usually keeps you up at night?',
    });
    queryLLM.mockRejectedValue(providerError);

    const response = await chatWithJarvis(
      'I keep going to bed late.',
      [],
      null,
      { onboarding: true }
    );

    expect(response).toMatchObject({
      message: 'What usually keeps you up at night?',
      proposal: null,
      claims: [],
      responseWarning: expect.stringContaining('No changes were made'),
      contextUsed: { contextVersion: 'test-v1' },
    });
  });

  describe('Jarvis insight generation', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('uses the insight-specific output contract instead of the chat contract', async () => {
      queryLLM.mockResolvedValue(JSON.stringify({
        type: 'pattern',
        statement: 'Recent evidence shows a repeated late bedtime.',
        recommendedActions: ['Set a consistent wind-down cue.'],
      }));

      const insight = await generateInsight('Summarize the sleep pattern.');

      expect(insight).toMatchObject({
        type: 'pattern',
        statement: 'Recent evidence shows a repeated late bedtime.',
        recommendedActions: ['Set a consistent wind-down cue.'],
        status: 'proposed',
      });
      expect(queryLLM).toHaveBeenCalledWith(
        expect.arrayContaining([{ role: 'system', content: JARVIS_INSIGHT_SYSTEM_PROMPT }]),
        expect.objectContaining({ jsonMode: true, intent: 'audit' })
      );
      expect(JARVIS_INSIGHT_SYSTEM_PROMPT).toContain('"recommendedActions"');
    });
  });

  it('keeps valid conversational text when a proposal fails schema validation', async () => {
    queryLLM.mockResolvedValue(JSON.stringify({
      message: 'I have enough detail to suggest a simple two-day gym routine.',
      proposal: { actionType: 'unsupported_action', payload: {} },
      claims: [],
    }));

    const response = await chatWithJarvis('Suggest a gym habit.', [], null, { onboarding: true });

    expect(response).toMatchObject({
      message: 'I have enough detail to suggest a simple two-day gym routine.',
      proposal: null,
      claims: [],
      responseWarning: expect.stringContaining('No changes were made'),
    });
  });

  it('discards an add-habit proposal without an explicit frequency', async () => {
    queryLLM.mockResolvedValue(JSON.stringify({
      message: 'I prepared the gym habit for your review.',
      proposal: {
        actionType: 'add_habit',
        payload: { name: 'After-work gym' },
        impact: {
          affectedDomains: ['body'],
          scoringImpact: 'Evidence will accrue after completion.',
          routineImpact: 'A repeatable gym habit.',
          identityAlignment: 'Supports consistency.',
          disciplineImpact: 'Adds a repeatable cue.',
          risks: [],
          dependencies: [],
        },
        reasoning: 'It matches the request.',
        confidence: 0.9,
      },
      claims: [],
    }));

    const response = await chatWithJarvis('Create a gym habit.', [], null, { onboarding: true });

    expect(response.proposal).toBeNull();
    expect(response.responseWarning).toContain('No changes were made');
  });

  it('normalizes the common create_habit alias into an approved add_habit proposal', async () => {
    queryLLM.mockResolvedValue(JSON.stringify({
      message: 'I prepared the Tuesday and Thursday gym habit for your review.',
      proposal: {
        actionType: 'create_habit',
        payload: {
          name: 'After-work gym',
          frequency: { type: 'weekly', days: [2, 4] },
          durationMinutes: 30,
          implementationIntention: {
            anchor: 'Before work',
            behavior: 'Pack gym clothes',
            location: 'Home',
            timeSlot: 'Tuesday and Thursday at 7 p.m.',
          },
          routineSlot: { days: [2, 4], startTime: '19:00', duration: 30 },
        },
        impact: {
          affectedDomains: ['body', 'discipline'],
          scoringImpact: 'Evidence will accrue after completion.',
          routineImpact: 'Two weekly gym sessions.',
          identityAlignment: 'Supports consistency.',
          disciplineImpact: 'Adds a repeatable cue.',
          risks: [],
          dependencies: [],
        },
        reasoning: 'The schedule matches your request.',
        confidence: 0.9,
      },
      claims: [],
    }));

    const response = await chatWithJarvis('Create a two-day gym habit.', [], null, { onboarding: true });

    expect(response.proposal.actionType).toBe('add_habit');
    expect(response.proposal.payload.name).toBe('After-work gym');
    expect(response.responseWarning).toBeUndefined();
  });

  it('does not recover unrelated provider errors', async () => {
    queryLLM.mockRejectedValue(new Error('Provider unavailable'));

    await expect(chatWithJarvis('Hello', [], null, { onboarding: true }))
      .rejects.toThrow('Provider unavailable');
  });
});

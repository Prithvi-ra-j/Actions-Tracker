import { describe, expect, it } from 'vitest';
import { compactContext, projectEvidenceFacts, selectRelevantMemories } from '../../src/core/ai/contextBuilder.js';
import { conversationManager } from '../../src/core/ai/conversationManager.js';
import { validateEvidenceClaims } from '../../src/core/ai/jarvisEngine.js';

describe('AI context boundaries', () => {
  it('keeps recent semantic memories and drops stale memories', () => {
    const now = new Date('2026-09-20T12:00:00.000Z');
    const memories = [
      { id: 'old', content: 'old', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'recent', content: 'recent', createdAt: '2026-09-10T00:00:00.000Z' },
    ];

    expect(selectRelevantMemories(memories, { now })).toEqual([memories[1]]);
  });

  it('prioritizes a recent memory matching the user question', () => {
    const now = new Date('2026-09-20T12:00:00.000Z');
    const memories = [
      { id: 'generic', content: 'User prefers a consistent schedule.', createdAt: '2026-09-19T00:00:00.000Z' },
      { id: 'german', content: 'User wants to study German on weekends.', createdAt: '2026-08-20T00:00:00.000Z' },
    ];

    expect(selectRelevantMemories(memories, { now, query: 'Why is German failing?' })[0].id).toBe('german');
  });

  it('caps conversational history while preserving system messages', () => {
    conversationManager.clear();
    conversationManager.initialize('system');
    for (let index = 1; index <= 10; index += 1) {
      conversationManager.appendMessage('user', `message ${index}`);
    }

    expect(conversationManager.getHistory(4)).toEqual([
      { role: 'system', content: 'system' },
      { role: 'system', content: 'Earlier conversation excerpts:\nuser: message 1\nuser: message 2\nuser: message 3\nuser: message 4\nuser: message 5\nuser: message 6' },
      { role: 'user', content: 'message 7' },
      { role: 'user', content: 'message 8' },
      { role: 'user', content: 'message 9' },
      { role: 'user', content: 'message 10' },
    ]);
    conversationManager.clear();
  });

  it('projects evidence with stable source identifiers', () => {
    expect(projectEvidenceFacts([{
      id: 'fact_1',
      type: 'habit_completion',
      value: 1,
      localDate: '2026-09-20',
      source: { type: 'user' },
      meta: { unrelated: 'detail' },
    }])).toEqual([{
      id: 'fact_1',
      type: 'habit_completion',
      value: 1,
      date: '2026-09-20',
      source: 'user',
    }]);
  });

  it('rejects claims that cite evidence outside the context packet', () => {
    const response = { message: 'Grounded', claims: [{ text: 'habit completion 1', evidenceIds: ['fact_2'] }] };
    const context = JSON.stringify({
      recent_evidence_facts: [{ id: 'fact_1', type: 'habit_completion', value: 1 }],
      semantic_memories: [{ id: 'memory_1' }],
    });

    expect(() => validateEvidenceClaims(response, context)).toThrow('fact_2');
    expect(validateEvidenceClaims({ message: 'Grounded', claims: [{ text: 'habit completion 1', evidenceIds: ['fact_1'] }] }, context).message)
      .toBe('Grounded');
  });

  it('compacts removable context while retaining the context contract', () => {
    const compacted = compactContext({
      context_version: '1.0',
      latest_scores: { body: 50 },
      recent_evidence_facts: Array.from({ length: 20 }, (_, index) => ({ id: `fact_${index}` })),
      semantic_memories: Array.from({ length: 10 }, (_, index) => ({ id: `memory_${index}` })),
      active_habits: [],
    }, 100);

    expect(compacted.context_version).toBe('1.0');
    expect(compacted.latest_scores).toEqual({ body: 50 });
    expect(compacted.compacted).toBe(true);
    expect(compacted.estimated_tokens).toBeLessThanOrEqual(100);
  });
});
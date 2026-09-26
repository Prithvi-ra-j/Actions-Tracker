import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { initDB } from '../../src/database/db.js';
import { executeAction, undoAction, validateActionPreconditions } from '../../src/core/ai/actionExecutor.js';
import { getHabit } from '../../src/database/habitRepository.js';
import { getOccurrencesForHabit } from '../../src/database/habitOccurrenceRepository.js';
import { getRoutineConfig } from '../../src/database/routineRepository.js';
import { getAllFacts } from '../../src/database/factsRepository.js';
import { getSetting, setSetting } from '../../src/database/settingsRepository.js';
import { getSemanticMemories } from '../../src/database/memoryRepository.js';

const impact = {
  affectedDomains: ['creativity'],
  scoringImpact: 'test',
  routineImpact: 'test',
  identityAlignment: 'test',
  disciplineImpact: 'test',
  risks: [],
  dependencies: [],
};

describe('actionExecutor IndexedDB integration', () => {
  it('persists an approved habit, occurrence, routine slot, and audit fact', async () => {
    await initDB();
    const id = `e2e-habit-${Date.now()}`;
    const result = await executeAction({
      actionType: 'add_habit',
      payload: {
        id,
        name: 'IndexedDB test habit',
        domain: 'creativity',
        frequency: { type: 'daily' },
        durationMinutes: 20,
        routineSlot: { day: [1], startTime: '20:00' },
        masteryRoadmap: { currentLevel: 1, levels: [{ level: 1, name: 'Start' }] },
        identityVote: 'I finish what I start',
        tinyVersion: 'One line',
      },
      impact,
      reasoning: 'integration test',
      confidence: 1,
    });

    expect(result.id).toBe(id);
    expect((await getHabit(id)).masteryRoadmap.currentLevel).toBe(1);
    expect((await getHabit(id)).identityVote).toBe('I finish what I start');
    expect((await getOccurrencesForHabit(id)).length).toBeGreaterThan(0);
    expect((await getRoutineConfig()).timeSlots.some(slot => slot.habitId === id)).toBe(true);
    expect((await getAllFacts()).some(fact => fact.type === 'jarvis_action.add_habit' && fact.objectId === id)).toBe(true);
  });

  it('rejects malformed proposals before writing', async () => {
    await expect(executeAction({ actionType: 'pause_habit', payload: {} })).rejects.toThrow();
  });

  it('rejects a proposal whose target disappeared before approval', async () => {
    await expect(validateActionPreconditions({
      actionType: 'pause_habit',
      payload: { id: 'deleted-before-approval' },
      impact,
      reasoning: 'stale target test',
      confidence: 1,
    })).rejects.toThrow('no longer exists');
  });

  it('enforces the saved-memory privacy preference before writing', async () => {
    await initDB();
    await setSetting('jarvisSaveMemories', 'false');
    const proposal = {
      actionType: 'propose_memory',
      payload: { content: 'A private preference', type: 'semantic' },
      impact,
      reasoning: 'privacy preference test',
      confidence: 1,
    };

    await expect(executeAction(proposal)).rejects.toThrow('Memory saving is disabled');
    expect((await getSemanticMemories()).some(memory => memory.content === 'A private preference')).toBe(false);
    await setSetting('jarvisSaveMemories', 'true');
  });

  it('does not execute the same approved proposal twice and can undo a habit mutation', async () => {
    const id = `e2e-idempotent-${Date.now()}`;
    const proposal = {
      actionType: 'add_habit',
      payload: { id, name: 'Idempotent test habit', domain: 'body', frequency: { type: 'daily' } },
      impact,
      reasoning: 'idempotency test',
      confidence: 1,
    };
    const first = await executeAction(proposal);
    const second = await executeAction(proposal);
    expect(second.idempotent).toBe(true);
    expect(second.id).toBe(first.id);

    const actionFact = (await getAllFacts()).find(fact => fact.type === 'jarvis_action.add_habit' && fact.objectId === id);
    await undoAction(actionFact.id);
    expect((await getHabit(id)).status).toBe('archived');
  });

  it('executes the remaining declared action types through repositories', async () => {
    const id = `e2e-roadmap-${Date.now()}`;
    const proposal = (actionType, payload) => executeAction({ actionType, payload, impact, reasoning: 'integration test', confidence: 1 });
    await proposal('add_habit', { id, name: 'Action coverage habit', domain: 'body', frequency: { type: 'daily' }, masteryRoadmap: { currentLevel: 1, levels: [{ level: 1 }, { level: 2 }] } });
    await proposal('modify_habit', { id, tinyVersion: 'One rep' });
    await proposal('modify_roadmap', { id, masteryRoadmap: { currentLevel: 1, levels: [{ level: 1 }, { level: 2 }] } });
    await proposal('update_mastery_level', { id, currentLevel: 2 });
    await proposal('pause_habit', { id });
    await proposal('archive_habit', { id });
    await proposal('add_quest', { title: 'Coverage quest', domain: 'body', metric: { type: 'manual' } });
    await proposal('add_learning', { concept: 'Test concept', explanation: 'Test explanation' });
    await proposal('suggest_experiment', { domain: 'social', hypothesis: 'Test hypothesis', protocol: 'Test protocol' });
    await proposal('adjust_routine', { weeklyBudget: { total: 3, unit: 'hours' }, timeSlots: [], constraints: [] });
    await proposal('revise_target', { dimension: 'body', targetValue: 70, why: 'Test target', timeframe: '90 days' });

    const facts = await getAllFacts();
    for (const actionType of ['modify_habit', 'modify_roadmap', 'update_mastery_level', 'pause_habit', 'archive_habit', 'add_quest', 'add_learning', 'suggest_experiment', 'adjust_routine', 'revise_target']) {
      expect(facts.some(fact => fact.type === `jarvis_action.${actionType}`)).toBe(true);
    }
  });
});

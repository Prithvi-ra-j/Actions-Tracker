// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { closeDB, dbGet, initDB } from '../../src/database/db.js';
import { addOccurrence, getOccurrence } from '../../src/database/habitOccurrenceRepository.js';
import { executeTodayRecommendation } from '../../src/core/today/recommendationExecutor.js';

function deleteDatabase(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

describe('Today recommendation closed loop', () => {
  beforeEach(async () => {
    try { closeDB(); } catch {}
    await deleteDatabase('actions-tracker');
    await initDB();
  });

  it('Done completes the occurrence and emits completion evidence', async () => {
    const occurrenceId = await addOccurrence({
      id: 'occ-test-1',
      habitId: 'habit-test-1',
      scheduledFor: '2026-09-28',
      status: 'expected',
    });

    const result = await executeTodayRecommendation({
      recommendation: {
        id: 'occurrence:occ-test-1',
        type: 'action',
        actionId: occurrenceId,
        title: 'Run',
        domain: 'body',
        reason: 'Scheduled today',
      },
      action: 'done',
    });

    expect(result.executed).toBe(true);
    expect(result.execution).toBe('completed');
    expect(await getOccurrence(occurrenceId)).toMatchObject({ status: 'completed' });
    expect(await dbGet('facts', result.factId)).toMatchObject({
      type: 'habit_completion',
      objectId: 'habit-test-1',
    });
  });

  it('does not duplicate completion evidence when Done is repeated', async () => {
    const occurrenceId = await addOccurrence({
      id: 'occ-test-2',
      habitId: 'habit-test-2',
      scheduledFor: '2026-09-28',
      status: 'expected',
    });
    const recommendation = {
      id: 'occurrence:occ-test-2',
      type: 'action',
      actionId: occurrenceId,
      title: 'Study',
      domain: 'knowledge',
      reason: 'Scheduled today',
    };

    const first = await executeTodayRecommendation({ recommendation, action: 'done' });
    const second = await executeTodayRecommendation({ recommendation, action: 'done' });

    expect(first.factId).toBeTruthy();
    expect(second.executed).toBe(true);
    expect(second.factId).toBeUndefined();
  });

  it('defer records feedback without completing the occurrence', async () => {
    const occurrenceId = await addOccurrence({
      id: 'occ-test-3',
      habitId: 'habit-test-3',
      scheduledFor: '2026-09-28',
      status: 'expected',
    });

    const result = await executeTodayRecommendation({
      recommendation: {
        id: 'occurrence:occ-test-3',
        type: 'action',
        actionId: occurrenceId,
        title: 'Read',
        domain: 'knowledge',
        reason: 'Scheduled today',
      },
      action: 'defer',
    });

    expect(result.executed).toBe(false);
    expect(await getOccurrence(occurrenceId)).toMatchObject({ status: 'expected' });
  });
});

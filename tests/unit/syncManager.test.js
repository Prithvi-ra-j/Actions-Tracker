import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { getConnectorStatuses, registerConnector, runAllSyncs } from '../../src/core/sync/syncManager.js';
import { initDB } from '../../src/database/db.js';
import { getSyncState, markSyncSuccess } from '../../src/database/syncStateRepository.js';
import { getAllFacts } from '../../src/database/factsRepository.js';

describe('syncManager connector registry', () => {
  it('rejects incomplete connector objects', () => {
    expect(() => registerConnector({ id: 'invalid' })).toThrow();
  });

  it('exposes registered connector status without fabricating data', async () => {
    registerConnector({
      id: 'test-connector',
      getStatus: async () => 'disconnected',
      sync: async () => ({ status: 'success', facts: [] }),
    });
    expect((await getConnectorStatuses())['test-connector']).toBe('disconnected');
  });

  it('preserves the last good cursor and timestamp when a connector fails', async () => {
    await initDB();
    const id = `failure-${Date.now()}`;
    await markSyncSuccess(id, 'cursor-before-failure');
    const before = await getSyncState(id);
    registerConnector({
      id,
      getStatus: async () => 'connected',
      sync: async () => { throw new Error('provider offline'); },
    });

    const summary = await runAllSyncs();
    const after = await getSyncState(id);

    expect(summary.errors).toContainEqual({ id, message: 'provider offline' });
    expect(after.status).toBe('error');
    expect(after.lastError).toBe('provider offline');
    expect(after.cursor).toBe('cursor-before-failure');
    expect(after.lastSuccessfulSync).toBe(before.lastSuccessfulSync);

    registerConnector({
      id,
      getStatus: async () => 'disconnected',
      sync: async () => ({ status: 'success', facts: [] }),
    });
  });

  it('keeps the cursor until every fact is persisted and retries without duplicates', async () => {
    await initDB();
    const id = `partial-${Date.now()}`;
    const firstFactId = `${id}-first`;
    const secondFactId = `${id}-second`;
    const beforeCursor = 'cursor-before-partial-write';
    const afterCursor = 'cursor-after-retry';
    let failSecondFact = true;
    await markSyncSuccess(id, beforeCursor);

    registerConnector({
      id,
      getStatus: async () => 'connected',
      sync: async () => ({
        status: 'success',
        cursor: afterCursor,
        facts: [
          { id: firstFactId, type: 'test_sync_fact', source: { type: 'system' } },
          {
            id: secondFactId,
            type: 'test_sync_fact',
            source: { type: 'system' },
            meta: failSecondFact ? { invalid: () => true } : {},
          },
        ],
      }),
    });

    const failedSummary = await runAllSyncs();
    const failedState = await getSyncState(id);
    expect(failedSummary.errors.some(error => error.id === id)).toBe(true);
    expect(failedState.cursor).toBe(beforeCursor);
    expect((await getAllFacts()).filter(fact => [firstFactId, secondFactId].includes(fact.id)).map(fact => fact.id))
      .toEqual([firstFactId]);

    failSecondFact = false;
    const retrySummary = await runAllSyncs();
    const retriedState = await getSyncState(id);
    const syncedFacts = (await getAllFacts()).filter(fact => [firstFactId, secondFactId].includes(fact.id));
    expect(retrySummary.errors.some(error => error.id === id)).toBe(false);
    expect(retriedState.cursor).toBe(afterCursor);
    expect(syncedFacts.map(fact => fact.id).sort()).toEqual([firstFactId, secondFactId].sort());
  });
});
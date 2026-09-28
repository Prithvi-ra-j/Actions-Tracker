// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { closeDB, dbGetAll, initDB } from '../../src/database/db.js';
import { registerConnector, runAllSyncs } from '../../src/core/sync/syncManager.js';
import { markSyncSuccess } from '../../src/database/syncStateRepository.js';

function deleteDatabase(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

describe('integration replay safety', () => {
  beforeEach(async () => {
    try { closeDB(); } catch {}
    await deleteDatabase('actions-tracker');
    await initDB();
  });

  it('does not import the same provider fact twice across sync runs', async () => {
    const id = 'test-replay-safe';
    registerConnector({
      id,
      async getStatus() { return 'connected'; },
      async sync() {
        return {
          status: 'success',
          cursor: 'cursor-1',
          facts: [{
            type: 'activity',
            value: 10,
            source: { type: 'health_connect', connectorId: id, externalId: 'external-1', externalVersion: '1' },
          }],
        };
      },
    });

    const first = await runAllSyncs();
    const second = await runAllSyncs();

    expect(first.totalImported).toBe(1);
    expect(second.totalImported).toBe(0);
    expect(second.totalIgnored).toBe(1);

    const facts = await dbGetAll('facts');
    expect(facts.filter(f => f.source?.externalId === 'external-1')).toHaveLength(1);
  });
});

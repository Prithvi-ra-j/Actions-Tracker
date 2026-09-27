import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { closeDB, dbGet, initDB } from '../../src/database/db.js';
import {
  getSafetyBackup,
  parseRestorePreview,
  restoreWithSafetyBackup,
} from '../../src/database/restoreSafety.js';

function deleteDatabase(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

describe('persistence upgrade and recovery fixtures', () => {
  beforeEach(async () => {
    try { closeDB(); } catch {}
    await deleteDatabase('actions-tracker');
    localStorage.clear();
  });

  it('preserves representative user data during v10 → v11 upgrade', async () => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('actions-tracker', 10);
      request.onupgradeneeded = () => {
        const db = request.result;
        const facts = db.createObjectStore('facts', { keyPath: 'id' });
        facts.put({
          id: 'legacy-fact-1',
          type: 'training_session',
          objectId: 'goal-1',
          localDate: '2026-09-27',
          value: 1,
        });
      };
      request.onsuccess = () => { request.result.close(); resolve(); };
      request.onerror = () => reject(request.error);
    });

    await initDB();
    const preserved = await dbGet('facts', 'legacy-fact-1');
    expect(preserved).toMatchObject({ id: 'legacy-fact-1', value: 1 });
    expect((await dbGet('facts', 'legacy-fact-1')).localDate).toBe('2026-09-27');
  });

  it('keeps a durable safety snapshot when restore fails after preview', async () => {
    const backup = JSON.stringify({
      _meta: { appVersion: '1.5.1.1', schemaVersion: 1 },
      goals: [{ key: 'g1', value: 1 }],
    });

    await expect(
      restoreWithSafetyBackup(backup, {
        createBackup: async () => ({ json: 'CURRENT_STATE', createdAt: 'now', totalBytes: 13 }),
        importer: async () => { throw new Error('simulated write failure'); },
      })
    ).rejects.toThrow('simulated write failure');

    expect(getSafetyBackup()).toMatchObject({ json: 'CURRENT_STATE' });
    expect(parseRestorePreview(backup).totalRecords).toBe(1);
  });
});

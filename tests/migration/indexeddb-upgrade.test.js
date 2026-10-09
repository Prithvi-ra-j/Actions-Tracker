// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { closeDB, getDB, initDB } from '../../src/database/db.js';
import { getAllFacts } from '../../src/database/factsRepository.js';
import { getAllLogs } from '../../src/database/logsRepository.js';

const DATABASE_NAME = 'actions-tracker';

function deleteDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Database deletion was blocked.'));
  });
}

async function createVersionElevenDatabase() {
  await new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 11);
    request.onupgradeneeded = () => {
      const database = request.result;
      const logs = database.createObjectStore('logs', { keyPath: 'id' });
      logs.createIndex('date', 'date', { unique: false });
      logs.createIndex('axis', 'axis', { unique: false });
      const facts = database.createObjectStore('facts', { keyPath: 'id' });
      facts.createIndex('objectId', 'objectId', { unique: false });
      facts.createIndex('type', 'type', { unique: false });
      facts.createIndex('localDate', 'localDate', { unique: false });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(['logs', 'facts'], 'readwrite');
      transaction.objectStore('logs').put({ id: 'legacy-log', axis: 'body', date: '2025-01-01', type: 'manual_evidence' });
      transaction.objectStore('facts').put({ id: 'legacy-fact', type: 'habit_completion', localDate: '2025-01-01' });
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

describe('IndexedDB schema upgrade', () => {
  afterEach(async () => {
    closeDB();
    await deleteDatabase();
  });

  it('preserves existing records and adds v12 stores/indexes when opening v11 data', async () => {
    closeDB();
    await deleteDatabase();
    await createVersionElevenDatabase();

    await initDB();

    expect(getDB().version).toBe(12);
    expect(await getAllLogs()).toEqual([
      { id: 'legacy-log', axis: 'body', date: '2025-01-01', type: 'manual_evidence' },
    ]);
    expect(await getAllFacts()).toEqual([
      { id: 'legacy-fact', type: 'habit_completion', localDate: '2025-01-01' },
    ]);
    expect(getDB().objectStoreNames.contains('proposalExecutions')).toBe(true);
    expect(getDB().transaction('facts', 'readonly').objectStore('facts').indexNames.contains('type_localDate')).toBe(true);
  });
});

import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { clearAllDatabaseData, dbGetAll, dbPut, exportDatabase, getDB, importDatabase, initDB } from '../../src/database/db.js';
import { addLog, getAllLogs } from '../../src/database/logsRepository.js';
import { SCHEMA_VERSION } from '../../src/version.js';

describe('database backup import', () => {
  it('replaces records from a valid export and leaves data intact when parsing fails', async () => {
    await initDB();
    const originalMarker = `backup-before-${Date.now()}`;
    const laterMarker = `backup-after-${Date.now()}`;
    await addLog({
      axis: 'knowledge',
      type: 'manual_evidence',
      value: 1,
      date: '2026-09-26',
      meta: { content: originalMarker },
    });

    const backup = await exportDatabase();
    await addLog({
      axis: 'knowledge',
      type: 'manual_evidence',
      value: 1,
      date: '2026-09-26',
      meta: { content: laterMarker },
    });

    const result = await importDatabase(backup);
    expect(Object.values(result.counts).reduce((sum, count) => sum + count, 0)).toBeGreaterThan(0);
    let logs = await getAllLogs();
    expect(logs.some(log => log.meta?.content === originalMarker)).toBe(true);
    expect(logs.some(log => log.meta?.content === laterMarker)).toBe(false);

    await expect(importDatabase('{malformed json')).rejects.toThrow('JSON parse failed');
    logs = await getAllLogs();
    expect(logs.some(log => log.meta?.content === originalMarker)).toBe(true);
    expect(logs.some(log => log.meta?.content === laterMarker)).toBe(false);
  });

  it('preserves existing records when an imported record violates its IndexedDB key contract', async () => {
    await initDB();
    const marker = `before-invalid-record-${Date.now()}`;
    await addLog({
      axis: 'knowledge',
      type: 'manual_evidence',
      value: 1,
      date: '2026-10-02',
      meta: { content: marker },
    });
    const before = await getAllLogs();
    const backup = JSON.parse(await exportDatabase());
    backup.logs = [{ axis: 'knowledge', type: 'manual_evidence', value: 1 }];

    await expect(importDatabase(JSON.stringify(backup))).rejects.toThrow();

    expect(await getAllLogs()).toEqual(before);
  });

  it('round-trips a record from every object store', async () => {
    await initDB();
    await clearAllDatabaseData();
    const stores = Array.from(getDB().objectStoreNames);

    for (const store of stores) {
      const keyPath = getDB().transaction(store, 'readonly').objectStore(store).keyPath;
      expect(typeof keyPath).toBe('string');
      await dbPut(store, { [keyPath]: `round-trip-${store}` });
    }

    const result = await importDatabase(await exportDatabase());

    expect(Object.keys(result.counts).sort()).toEqual(stores.sort());
    for (const store of stores) {
      expect(await dbGetAll(store)).toEqual([{ [getDB().transaction(store, 'readonly').objectStore(store).keyPath]: `round-trip-${store}` }]);
    }
  });

  it('rejects a backup from a newer schema without changing current data', async () => {
    await initDB();
    const marker = `future-schema-${Date.now()}`;
    await addLog({
      axis: 'knowledge',
      type: 'manual_evidence',
      value: 1,
      date: '2026-10-02',
      meta: { content: marker },
    });
    const before = await getAllLogs();
    const backup = JSON.parse(await exportDatabase());
    backup._meta.schemaVersion = SCHEMA_VERSION + 1;

    await expect(importDatabase(JSON.stringify(backup))).rejects.toThrow('Schema version mismatch');

    expect(await getAllLogs()).toEqual(before);
  });
});

import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { exportDatabase, importDatabase, initDB } from '../../src/database/db.js';
import { addLog, getAllLogs } from '../../src/database/logsRepository.js';

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
});

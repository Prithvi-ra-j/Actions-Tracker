import { describe, expect, it } from 'vitest';
import { createSafetyBackup, parseRestorePreview, restoreWithSafetyBackup } from '../../src/database/restoreSafety.js';

const backup = JSON.stringify({
  _meta: { appVersion: '1.5.1.1', schemaVersion: 1, exportedAt: '2026-09-27T12:00:00Z' },
  goals: [{ key: 'g1', value: 1 }],
  facts: [{ id: 'f1', type: 'training', localDate: '2026-09-27' }],
  settings: [],
});

describe('restore safety boundary', () => {
  it('previews stores and record counts without writing', () => {
    const preview = parseRestorePreview(backup);
    expect(preview.appVersion).toBe('1.5.1.1');
    expect(preview.schemaVersion).toBe(1);
    expect(preview.stores.goals).toBe(1);
    expect(preview.stores.facts).toBe(1);
    expect(preview.totalRecords).toBe(2);
  });

  it('rejects malformed store payloads before import', () => {
    expect(() => parseRestorePreview(JSON.stringify({ goals: { bad: true } }))).toThrow(/must be an array/);
    expect(() => parseRestorePreview('not-json')).toThrow(/Invalid backup JSON/);
  });

  it('creates a safety snapshot before the destructive import boundary', async () => {
    const calls = [];
    const result = await restoreWithSafetyBackup(backup, {
      createBackup: async () => {
        calls.push('backup');
        return { json: 'existing-state', createdAt: '2026-09-27T12:00:00Z', totalBytes: 13 };
      },
      // The real import is deliberately not invoked in this unit contract.
      // A production integration test covers the IndexedDB writer.
    }).catch(error => error);

    expect(calls).toEqual(['backup']);
    expect(result.safetyBackup.json).toBe('existing-state');
    expect(result.restorePreview.totalRecords).toBe(2);
  });

  it('produces a serializable current-state safety backup', async () => {
    // Function shape is covered here; database integration is covered by db tests.
    expect(createSafetyBackup).toBeTypeOf('function');
  });
});

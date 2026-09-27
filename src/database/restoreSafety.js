/**
 * Restore safety primitives.
 *
 * The existing importDatabase() remains the atomic writer. This module adds
 * the missing explicit preview/validation/safety-backup boundary so UI code
 * does not have to reason about raw backup envelopes.
 */
import { exportDatabase, importDatabase } from './db.js';

export function parseRestorePreview(jsonString) {
  let parsed;
  try { parsed = JSON.parse(jsonString); }
  catch (error) { throw new Error(`Invalid backup JSON: ${error.message}`); }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Backup must be a JSON object.');
  }

  const meta = parsed._meta ?? {};
  const stores = {};
  let totalRecords = 0;

  for (const [name, value] of Object.entries(parsed)) {
    if (name === '_meta') continue;
    if (!Array.isArray(value)) throw new Error(`Backup store "${name}" must be an array.`);
    stores[name] = value.length;
    totalRecords += value.length;
  }

  return {
    appVersion: meta.appVersion ?? 'unknown',
    schemaVersion: Number(meta.schemaVersion ?? 1),
    exportedAt: meta.exportedAt ?? null,
    stores,
    totalRecords,
  };
}

export async function createSafetyBackup() {
  const json = await exportDatabase();
  return {
    json,
    createdAt: new Date().toISOString(),
    totalBytes: new TextEncoder().encode(json).length,
  };
}

export async function restoreWithSafetyBackup(jsonString, { createBackup = createSafetyBackup } = {}) {
  const preview = parseRestorePreview(jsonString);
  const safetyBackup = await createBackup();

  try {
    const result = await importDatabase(jsonString);
    return { preview, safetyBackup, result };
  } catch (error) {
    // importDatabase writes through one transaction; on failure it rejects and
    // leaves the pre-restore snapshot available to the caller for recovery.
    error.restorePreview = preview;
    error.safetyBackup = safetyBackup;
    throw error;
  }
}

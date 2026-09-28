/**
 * Restore safety primitives.
 *
 * The existing importDatabase() remains the atomic writer. This module adds
 * the missing explicit preview/validation/safety-backup boundary so UI code
 * does not have to reason about raw backup envelopes.
 */
import { exportDatabase, importDatabase } from './db.js';

const SAFETY_KEY = 'actions_tracker_pre_restore_safety_backup';
const KNOWN_STORES = new Set([
  'goals','milestones','settings','logs','axis_config','books','gymSessions','questBoard','statSnapshots',
  'facts','lifeObjects','selfModel','telemetry','appMeta','migrationRegistry','habits','habitOccurrences',
  'learnings','evidence','relations','memories','syncState','audits','insights','decisions','experiments',
  'creativeWorks','observations','jarvisConversations','routineConfig'
]);

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
  const backup = {
    json,
    createdAt: new Date().toISOString(),
    totalBytes: new TextEncoder().encode(json).length,
  };
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem(SAFETY_KEY, JSON.stringify(backup)); } catch { /* quota/storage unavailable */ }
  }
  return backup;
}

export function getSafetyBackup() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SAFETY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearSafetyBackup() {
  try { localStorage.removeItem(SAFETY_KEY); } catch { /* storage unavailable */ }
}

export async function restoreWithSafetyBackup(jsonString, { createBackup = createSafetyBackup, importer = importDatabase } = {}) {
  const preview = parseRestorePreview(jsonString);
  const safetyBackup = await createBackup();

  // The default creator persists the snapshot itself. Persist injected/custom
  // snapshots too so the restore boundary remains durable under fault tests.
  if (safetyBackup && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SAFETY_KEY, JSON.stringify(safetyBackup));
    } catch {
      // Storage unavailability must not turn a valid restore attempt into a new failure.
    }
  }

  try {
    const result = await importer(jsonString);
    return { preview, safetyBackup, result };
  } catch (error) {
    // importDatabase writes through one transaction; on failure it rejects and
    // leaves the pre-restore snapshot available to the caller for recovery.
    error.restorePreview = preview;
    error.safetyBackup = safetyBackup;
    throw error;
  }
}

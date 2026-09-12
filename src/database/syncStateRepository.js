/**
 * SyncState repository (§36 Incremental Sync, §37 Sync Failure Semantics).
 *
 * Tracks the sync cursor, last successful sync, and failure state for each
 * external connector (health, fitness, chess, finance, etc.).
 *
 * INVARIANT (§37): When sync fails:
 *   - DO NOT mark new data as zero
 *   - DO NOT mark habits as missed
 *   - DO NOT overwrite existing facts
 *   - DO NOT delete prior records
 *
 * Instead: set status='error' and record the error message.
 * The UI reads this to display "data may be stale" — not "you failed today".
 *
 * lastSuccessfulSync is NEVER zeroed by an error.
 */

import { dbGet, dbPut } from './db.js';

const STORE = 'syncState';
const SCHEMA_VERSION = 1;

function now() {
  return new Date().toISOString();
}

// ─── Write ─────────────────────────────────────────────────────────────────────

/**
 * Reads the current sync state for a connector, or returns a default.
 * @param {string} connectorId
 * @returns {Promise<object>}
 */
export async function getSyncState(connectorId) {
  const record = await dbGet(STORE, connectorId);
  return record ?? {
    connectorId,
    schemaVersion:      SCHEMA_VERSION,
    cursor:             null,
    lastSuccessfulSync: null,
    lastAttemptedSync:  null,
    status:             'idle',
    lastError:          null,
    connectorVersion:   '1.0',
  };
}

/**
 * Marks that a sync has started (status='syncing').
 * @param {string} connectorId
 * @returns {Promise<void>}
 */
export async function markSyncStarted(connectorId) {
  const state = await getSyncState(connectorId);
  await dbPut(STORE, {
    ...state,
    status:            'syncing',
    lastAttemptedSync: now(),
  });
}

/**
 * Marks a sync as successfully completed.
 * Updates lastSuccessfulSync and optionally stores a new cursor.
 * @param {string} connectorId
 * @param {string|null} cursor  — provider-specific change token for next incremental sync
 * @returns {Promise<void>}
 */
export async function markSyncSuccess(connectorId, cursor = null) {
  const state = await getSyncState(connectorId);
  await dbPut(STORE, {
    ...state,
    status:             'idle',
    cursor:             cursor ?? state.cursor,
    lastSuccessfulSync: now(),
    lastError:          null,
  });
}

/**
 * Records a sync failure.
 *
 * IMPORTANT: This does NOT zero lastSuccessfulSync, does NOT clear cursor,
 * and does NOT touch any facts or occurrences. Only the error fields are updated.
 *
 * @param {string} connectorId
 * @param {string} errorMessage
 * @returns {Promise<void>}
 */
export async function markSyncError(connectorId, errorMessage) {
  const state = await getSyncState(connectorId);
  await dbPut(STORE, {
    ...state,
    // lastSuccessfulSync intentionally preserved — do not zero it on error
    // cursor intentionally preserved — it may still be valid for the next retry
    status:    'error',
    lastError: errorMessage,
  });
}

/**
 * Resets the sync state for a connector to idle (e.g. after revoke/reconnect).
 * @param {string} connectorId
 * @param {string} [connectorVersion]
 * @returns {Promise<void>}
 */
export async function resetSyncState(connectorId, connectorVersion = '1.0') {
  await dbPut(STORE, {
    connectorId,
    schemaVersion:      SCHEMA_VERSION,
    cursor:             null,
    lastSuccessfulSync: null,
    lastAttemptedSync:  null,
    status:             'idle',
    lastError:          null,
    connectorVersion,
  });
}

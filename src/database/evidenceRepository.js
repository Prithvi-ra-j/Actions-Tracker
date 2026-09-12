/**
 * Evidence repository (§11 Evidence Model).
 *
 * Evidence is a reasoned signal derived from facts.
 * Facts are events. Evidence is interpretation of those events.
 *
 * Every Evidence record must carry supportingFactIds so it remains
 * traceable back to the raw fact ledger (architectural principle P08, §76).
 *
 * Evidence records are derived state — they can be rebuilt from facts.
 * Deleting evidence must never delete the underlying facts (invariant I05).
 */

import { dbGet, dbPut, dbGetAll, dbGetAllByIndex } from './db.js';

const STORE = 'evidence';
const SCHEMA_VERSION = 1;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateId() {
  return `evid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

// ─── Write ─────────────────────────────────────────────────────────────────────

/**
 * Persists a new Evidence record.
 *
 * @param {{
 *   domain:             'body'|'knowledge'|'strategy'|'creativity'|'social'|'discipline',
 *   signal:             string,    — e.g. 'habit_completion_rate', 'learning_application'
 *   value:              number,    — the computed signal value
 *   unit?:              string,
 *   confidence:         number,    — 0–1; low when data coverage is low
 *   timeWindow:         { start: string, end: string },  — ISO 8601 strings
 *   supportingFactIds:  string[],  — IDs from the facts store
 *   methodology:        { engineId: string, engineVersion: string, formula?: string },
 * }} fields
 * @returns {Promise<string>} The generated evidence ID
 */
export async function addEvidence(fields) {
  const ts = now();
  const record = {
    id:                fields.id ?? generateId(),
    schemaVersion:     SCHEMA_VERSION,
    domain:            fields.domain,
    signal:            fields.signal,
    value:             fields.value,
    unit:              fields.unit             ?? null,
    confidence:        fields.confidence,
    timeWindow:        fields.timeWindow,
    supportingFactIds: fields.supportingFactIds ?? [],
    methodology:       fields.methodology,
    createdAt:         ts,
  };
  await dbPut(STORE, record);
  return record.id;
}

// ─── Read ──────────────────────────────────────────────────────────────────────

/**
 * Returns a single evidence record by ID, or null.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getEvidence(id) {
  return dbGet(STORE, id);
}

/**
 * Returns all evidence records for a domain, sorted by createdAt ascending.
 * @param {string} domain
 * @returns {Promise<object[]>}
 */
export async function getEvidenceByDomain(domain) {
  const all = await dbGetAllByIndex(STORE, 'domain', domain);
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Returns evidence records for a domain within a time window.
 * Matches evidence whose timeWindow.start falls within [startISO, endISO].
 * @param {string} domain
 * @param {string} startISO
 * @param {string} endISO
 * @returns {Promise<object[]>}
 */
export async function getEvidenceByDomainAndWindow(domain, startISO, endISO) {
  const all = await getEvidenceByDomain(domain);
  return all.filter(e =>
    e.timeWindow.start >= startISO && e.timeWindow.start <= endISO
  );
}

/**
 * Returns the most recently created evidence record for a domain, or null.
 * @param {string} domain
 * @returns {Promise<object|null>}
 */
export async function getLatestEvidence(domain) {
  const all = await getEvidenceByDomain(domain);
  return all.length > 0 ? all[all.length - 1] : null;
}

/**
 * Returns all evidence records across all domains, sorted by createdAt ascending.
 * @returns {Promise<object[]>}
 */
export async function getAllEvidence() {
  const all = await dbGetAll(STORE);
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Facts repository — append-only event log (v1.1 / §30 Facts, §31 Event Ledger).
 *
 * A "fact" is a structured, immutable event record: something that happened
 * at a known time, tied to an optional Life Object, carrying typed data and
 * optional context (mood, energy, etc.).
 *
 * Schema version: 1
 *
 * Rules:
 *  - Never mutate a fact once written. Corrections are new facts of type 'correction'.
 *  - Never hard-delete. Soft-delete by writing a fact of type 'retraction'.
 *  - All derived state must be rebuildable from the raw facts store alone.
 */

import { dbPut, dbGet, dbGetAll, dbGetAllByIndex } from './db.js';
import { localDateStr, getLocalTimezone } from '../helpers/dateHelpers.js';

const STORE = 'facts';
const SCHEMA_VERSION = 1;

// ─── Write ─────────────────────────────────────────────────────────────────────

/**
 * Appends a new fact to the ledger.
 *
 * @param {{
 *   type:         string,   — e.g. 'habit_completion', 'journal_entry', 'goal_progress'
 *   objectId?:    string,   — ID of the Life Object this fact belongs to (optional)
 *   value?:       number,   — numeric payload (1 = done, XP amount, duration, etc.)
 *   meta?:        object,   — any extra payload (text, source, etc.)
  *   source?:      { type: string, integrationId?: string },
 *   context?: {             — §33 Context Model
 *     energy?:  number,     — 1–5
 *     mood?:    number,     — 1–5
 *     stress?:  number,     — 1–5
 *     location?: string,
 *     sleep?:   number,     — hours
 *   },
 *   occurredAt?:  string,   — ISO 8601 (defaults to now)
 * }} fact
 * @returns {Promise<string>} The generated fact ID
 */
export async function addFact(fact) {
  const now = new Date();
  const id = fact.id ?? `fact_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`;
  const timezone = getLocalTimezone();

  const record = {
    id,
    schemaVersion:  SCHEMA_VERSION,
    type:           fact.type,
    objectId:       fact.objectId  ?? null,
    value:          fact.value     ?? null,
    meta:           fact.meta      ?? {},
    source:         fact.source    ?? { type: 'user' },
    context:        fact.context   ?? {},
    occurredAt:     fact.occurredAt ?? now.toISOString(),
    recordedAt:     now.toISOString(),
    localDate:      localDateStr(now),
    timezone,
  };

  await dbPut(STORE, record);
  return id;
}

// ─── Read ──────────────────────────────────────────────────────────────────────

/**
 * Returns a single fact by ID, or null if not found.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getFact(id) {
  return dbGet(STORE, id);
}

/**
 * Returns all facts for a specific Life Object, ordered by occurredAt ascending.
 * @param {string} objectId
 * @returns {Promise<object[]>}
 */
export async function getFactsByObject(objectId) {
  const all = await dbGetAllByIndex(STORE, 'objectId', objectId);
  return all.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

/**
 * Returns all facts of a given type, ordered by occurredAt ascending.
 * @param {string} type
 * @returns {Promise<object[]>}
 */
export async function getFactsByType(type) {
  const all = await dbGetAllByIndex(STORE, 'type', type);
  return all.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

/**
 * Returns all facts for a specific localDate (YYYY-MM-DD).
 * @param {string} localDate
 * @returns {Promise<object[]>}
 */
export async function getFactsByDate(localDate) {
  const all = await dbGetAllByIndex(STORE, 'localDate', localDate);
  return all.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

/**
 * Returns all facts in the ledger, ordered by occurredAt ascending.
 * @returns {Promise<object[]>}
 */
export async function getAllFacts() {
  const all = await dbGetAll(STORE);
  return all.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
}

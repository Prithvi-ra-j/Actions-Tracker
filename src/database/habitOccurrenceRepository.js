/**
 * HabitOccurrence repository (§12 HabitOccurrence model).
 *
 * An occurrence is a specific scheduled instance of a habit.
 * It tracks whether the user did what they intended.
 *
 * Status semantics (architectural invariant I03):
 *   expected   — scheduled, not yet evaluated
 *   completed  — confirmed done
 *   missed     — confirmed NOT done (only set with explicit intent)
 *   rescheduled — moved to another time
 *   excused    — legitimately skipped with reason
 *   unknown    — evaluation not possible (e.g. sync data unavailable)
 *
 * INVARIANT: 'unknown' is NOT 'missed'.
 * Missing sync data must never produce status='missed'.
 * A sync gap produces status='unknown' via markOccurrenceUnknown().
 */

import { dbGet, dbPut, dbGetAll, dbGetAllByIndex } from './db.js';

const STORE = 'habitOccurrences';
const SCHEMA_VERSION = 1;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateId() {
  return `occ_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

// ─── Write ─────────────────────────────────────────────────────────────────────

/**
 * Creates a new HabitOccurrence, typically with status='expected'.
 *
 * @param {{
 *   habitId:           string,
 *   scheduledFor:      string,  — ISO 8601 datetime or YYYY-MM-DD date string
 *   status?:           'expected'|'completed'|'missed'|'rescheduled'|'excused'|'unknown',
 *   value?:            number,
 *   unit?:             string,
 *   supportingFactIds?: string[],
 *   reason?:           string,
 * }} fields
 * @returns {Promise<string>} The generated occurrence ID
 */
export async function addOccurrence(fields) {
  const record = {
    id:                fields.id ?? generateId(),
    schemaVersion:     SCHEMA_VERSION,
    habitId:           fields.habitId,
    scheduledFor:      fields.scheduledFor,
    status:            fields.status            ?? 'expected',
    completedAt:       fields.completedAt       ?? null,
    value:             fields.value             ?? null,
    unit:              fields.unit              ?? null,
    supportingFactIds: fields.supportingFactIds ?? [],
    reason:            fields.reason            ?? null,
  };
  await dbPut(STORE, record);
  return record.id;
}

/**
 * Marks an occurrence as completed.
 * @param {string} id
 * @param {number|null} value           — quantitative result if trackingMethod !== 'boolean'
 * @param {string[]} supportingFactIds  — fact IDs that corroborate this completion
 * @returns {Promise<void>}
 */
export async function completeOccurrence(id, value = null, supportingFactIds = []) {
  const existing = await dbGet(STORE, id);
  if (!existing) throw new Error(`[habitOccurrenceRepository] Occurrence not found: ${id}`);
  await dbPut(STORE, {
    ...existing,
    status:            'completed',
    completedAt:       now(),
    value:             value ?? existing.value,
    supportingFactIds: [...(existing.supportingFactIds ?? []), ...supportingFactIds],
  });
}

/**
 * Marks an occurrence as excused (legitimate skip with optional reason).
 * Does NOT count against discipline score per exceptionPolicy.
 * @param {string} id
 * @param {string} reason
 * @returns {Promise<void>}
 */
export async function excuseOccurrence(id, reason = '') {
  const existing = await dbGet(STORE, id);
  if (!existing) throw new Error(`[habitOccurrenceRepository] Occurrence not found: ${id}`);
  await dbPut(STORE, { ...existing, status: 'excused', reason });
}

/**
 * Records context for an occurrence without changing its evaluation status.
 * This is used after a grace window expires, when the system knows a pattern
 * needs explanation but still must preserve unknown != missed.
 */
export async function recordOccurrenceReason(id, reason = '') {
  const existing = await dbGet(STORE, id);
  if (!existing) throw new Error(`[habitOccurrenceRepository] Occurrence not found: ${id}`);
  await dbPut(STORE, { ...existing, reason });
}

/**
 * Marks an occurrence as missed (confirmed non-completion).
 *
 * IMPORTANT: This must only be called with explicit intent.
 * A missing sync does NOT justify calling this — use markOccurrenceUnknown() instead.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function missOccurrence(id) {
  const existing = await dbGet(STORE, id);
  if (!existing) throw new Error(`[habitOccurrenceRepository] Occurrence not found: ${id}`);
  await dbPut(STORE, { ...existing, status: 'missed' });
}

/**
 * Marks an occurrence as unknown (data unavailable — e.g. sync gap).
 *
 * This is the correct status when truth cannot be determined.
 * It must never be interpreted as a missed habit.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function markOccurrenceUnknown(id) {
  const existing = await dbGet(STORE, id);
  if (!existing) throw new Error(`[habitOccurrenceRepository] Occurrence not found: ${id}`);
  await dbPut(STORE, { ...existing, status: 'unknown' });
}

/**
 * Reschedules an occurrence to a new time.
 * @param {string} id
 * @param {string} newScheduledFor  — ISO 8601
 * @returns {Promise<void>}
 */
export async function rescheduleOccurrence(id, newScheduledFor) {
  const existing = await dbGet(STORE, id);
  if (!existing) throw new Error(`[habitOccurrenceRepository] Occurrence not found: ${id}`);
  await dbPut(STORE, { ...existing, status: 'rescheduled', scheduledFor: newScheduledFor });
}

// ─── Read ──────────────────────────────────────────────────────────────────────

/**
 * Updates an occurrence with arbitrary fields.
 * @param {string} id
 * @param {object} updates
 * @returns {Promise<void>}
 */
export async function updateOccurrence(id, updates) {
  const existing = await dbGet(STORE, id);
  if (!existing) throw new Error(`[habitOccurrenceRepository] Occurrence not found: ${id}`);
  await dbPut(STORE, { ...existing, ...updates });
}

/**
 * Returns all occurrences scheduled between startDate and endDate (inclusive).
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<object[]>}
 */
export async function getOccurrencesByDateRange(startDate, endDate) {
  const all = await dbGetAll(STORE);
  return all.filter(o => {
    // If scheduledFor is an ISO date, string comparison still works for filtering
    const dateStr = o.scheduledFor.split('T')[0];
    return dateStr >= startDate && dateStr <= endDate;
  });
}

/**
 * Returns a single occurrence by ID, or null.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getOccurrence(id) {
  return dbGet(STORE, id);
}

/**
 * Returns all occurrences for a specific habit.
 * @param {string} habitId
 * @returns {Promise<object[]>}
 */
export async function getOccurrencesForHabit(habitId) {
  const all = await dbGetAllByIndex(STORE, 'habitId', habitId);
  return all.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
}

/**
 * Returns all occurrences scheduled for a given date string (YYYY-MM-DD or date prefix match).
 * Uses the scheduledFor index and then filters by date prefix.
 * @param {string} localDate  — 'YYYY-MM-DD'
 * @returns {Promise<object[]>}
 */
export async function getOccurrencesForDate(localDate) {
  const all = await dbGetAll(STORE);
  return all.filter(o => o.scheduledFor.startsWith(localDate));
}

/**
 * Returns all occurrences with a given status.
 * @param {'expected'|'completed'|'missed'|'rescheduled'|'excused'|'unknown'} status
 * @returns {Promise<object[]>}
 */
export async function getOccurrencesByStatus(status) {
  return dbGetAllByIndex(STORE, 'status', status);
}

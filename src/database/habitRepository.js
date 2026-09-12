/**
 * Habit repository (§12 Habit Architecture).
 *
 * Owns all reads and writes to the 'habits' store.
 * UI components must never call dbGet/dbPut directly for habits.
 *
 * Habits are never hard-deleted — they are archived.
 * Status transitions: active → paused → active → archived
 */

import { dbGet, dbPut, dbGetAll, dbGetAllByIndex } from './db.js';

const STORE = 'habits';
const SCHEMA_VERSION = 1;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateId() {
  return `habit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

// ─── Write ─────────────────────────────────────────────────────────────────────

/**
 * Creates and persists a new Habit.
 *
 * @param {{
 *   name:             string,
 *   description?:     string,
 *   domain?:          'body'|'knowledge'|'strategy'|'creativity'|'social'|'general',
 *   frequency:        object,   — FrequencyRule: { type: 'daily'|'weekly'|'custom', days?: number[] }
 *   trackingMethod?:  'boolean'|'count'|'duration'|'distance'|'pages'|'metric'|'automatic',
 *   completionMode?:  'manual'|'automatic'|'hybrid',
 *   target?:          { value: number, unit: string },
 *   source?:          { type: 'user'|'core'|'integration', integrationId?: string },
 *   scoring?:         { enabled: boolean, weight: number, evidenceType: string },
 *   exceptionPolicy?: { allowSkip: boolean, requireReason: boolean, affectsDiscipline: boolean },
 * }} fields
 * @returns {Promise<string>} The generated habit ID
 */
export async function addHabit(fields) {
  const ts = now();
  const record = {
    id:              fields.id ?? generateId(),
    schemaVersion:   SCHEMA_VERSION,
    name:            fields.name,
    description:     fields.description     ?? null,
    domain:          fields.domain          ?? 'general',
    frequency:       fields.frequency,
    trackingMethod:  fields.trackingMethod  ?? 'boolean',
    completionMode:  fields.completionMode  ?? 'manual',
    target:          fields.target          ?? null,
    source:          fields.source          ?? { type: 'user' },
    scoring:         fields.scoring         ?? { enabled: false, weight: 1, evidenceType: '' },
    exceptionPolicy: fields.exceptionPolicy ?? { allowSkip: true, requireReason: false, affectsDiscipline: true },
    status:          'active',
    createdAt:       ts,
    updatedAt:       ts,
  };
  await dbPut(STORE, record);
  return record.id;
}

/**
 * Updates specified fields on an existing habit.
 * Always refreshes updatedAt.
 * @param {string} id
 * @param {Partial<object>} fields
 * @returns {Promise<void>}
 */
export async function updateHabit(id, fields) {
  const existing = await dbGet(STORE, id);
  if (!existing) throw new Error(`[habitRepository] Habit not found: ${id}`);
  await dbPut(STORE, { ...existing, ...fields, id, updatedAt: now() });
}

/**
 * Transitions a habit to 'archived'. Never hard-deletes.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function archiveHabit(id) {
  return updateHabit(id, { status: 'archived' });
}

/**
 * Pauses an active habit.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function pauseHabit(id) {
  return updateHabit(id, { status: 'paused' });
}

/**
 * Reactivates a paused habit.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function resumeHabit(id) {
  return updateHabit(id, { status: 'active' });
}

// ─── Read ──────────────────────────────────────────────────────────────────────

/**
 * Gets a single habit by ID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getHabit(id) {
  return dbGet(STORE, id);
}

/**
 * Gets all habits.
 * @returns {Promise<object[]>}
 */
export async function getAllHabits() {
  return dbGetAll(STORE);
}

/**
 * Returns all habits with status 'active'.
 * @returns {Promise<object[]>}
 */
export async function getActiveHabits() {
  return dbGetAllByIndex(STORE, 'status', 'active');
}

/**
 * Returns all habits for a specific domain.
 * @param {string} domain
 * @returns {Promise<object[]>}
 */
export async function getHabitsByDomain(domain) {
  return dbGetAllByIndex(STORE, 'domain', domain);
}

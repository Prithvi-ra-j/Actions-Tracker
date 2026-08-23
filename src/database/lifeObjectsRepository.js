/**
 * Life Objects repository (v1.1 / §26 Life Object Model).
 *
 * A "Life Object" is any meaningful unit of personal intent or commitment:
 * Goal, Habit, Task, Routine, and (in later versions) Project, Experiment,
 * Aspiration, Constraint, Principle, Commitment.
 *
 * Every Life Object has:
 *   id         — stable, globally unique string (never reused, even after soft-delete)
 *   type       — 'goal' | 'habit' | 'task' | 'routine' | ...
 *   status     — 'active' | 'paused' | 'completed' | 'archived'
 *   createdAt  — ISO 8601
 *   updatedAt  — ISO 8601
 *
 * This store uses upsert semantics (dbPut) — every write is a full record
 * replacement. The facts store is the append-only truth; the life objects
 * store is a mutable projection of intent.
 */

import { dbPut, dbGet, dbGetAll, dbGetAllByIndex } from './db.js';

const STORE = 'lifeObjects';

// ─── Write ─────────────────────────────────────────────────────────────────────

/**
 * Inserts or updates a Life Object record.
 * Always sets updatedAt to now.
 * @param {object} obj — Must include `id` and `type`.
 * @returns {Promise<object>} The saved record
 */
export async function upsertLifeObject(obj) {
  const now = new Date().toISOString();
  const record = {
    ...obj,
    createdAt: obj.createdAt ?? now,
    updatedAt: now,
    status:    obj.status   ?? 'active',
  };
  await dbPut(STORE, record);
  return record;
}

// ─── Read ──────────────────────────────────────────────────────────────────────

/**
 * Returns a single Life Object by ID, or null if not found.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getLifeObject(id) {
  return dbGet(STORE, id);
}

/**
 * Returns all Life Objects of a given type (e.g., 'goal', 'habit').
 * @param {string} type
 * @returns {Promise<object[]>}
 */
export async function getAllLifeObjectsByType(type) {
  return dbGetAllByIndex(STORE, 'type', type);
}

/**
 * Returns all Life Objects with status === 'active'.
 * (Filters in-memory since IDB compound indices aren't set up yet.)
 * @returns {Promise<object[]>}
 */
export async function getActiveLifeObjects() {
  const all = await dbGetAll(STORE);
  return all.filter(o => o.status === 'active');
}

/**
 * Returns all Life Objects regardless of status.
 * @returns {Promise<object[]>}
 */
export async function getAllLifeObjects() {
  return dbGetAll(STORE);
}

// ─── Soft-delete / Status transitions ──────────────────────────────────────────

/**
 * Sets a Life Object's status without touching any other fields.
 * @param {string} id
 * @param {'active'|'paused'|'completed'|'archived'} status
 */
export async function setLifeObjectStatus(id, status) {
  const existing = await getLifeObject(id);
  if (!existing) throw new Error(`[LifeObjects] Object not found: ${id}`);
  await upsertLifeObject({ ...existing, status });
}

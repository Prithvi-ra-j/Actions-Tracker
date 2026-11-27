/**
 * Goals repository (§19 Goal Architecture, §26 Life Object Model).
 *
 * Owns all reads and writes to Goal entities in the 'lifeObjects' store.
 * 
 * Note: A legacy 'goals' store exists which only holds checkbox state.
 * Target state should now be managed directly on the Goal object or via Facts.
 */

import { dbGet, dbPut, dbGetAllByIndex, writeSequence } from './db.js';
import { getLocalTimezone, localDateStr } from '../helpers/dateHelpers.js';
import { createGoal } from '../models/lifeObjectSchema.js';
import { GOALS as LEGACY_GOALS } from '../constants.js';

const STORE = 'lifeObjects';
const GOAL_TYPE = 'goal';

// ─── Initialization ────────────────────────────────────────────────────────────

/**
 * Ensures baseline goals exist. If none exist, migrates from constants.
 */
export async function initGoals() {
  // Fresh baseline: goals are created by the user/Jarvis after setup.
  // Existing database records remain untouched; this initializer never seeds
  // placeholder goals into a new database.
}

// ─── CRUD ──────────────────────────────────────────────────────────────────────

/**
 * Returns a single goal by ID, or null if not found.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getGoal(id) {
  const obj = await dbGet(STORE, id);
  return (obj && obj.type === GOAL_TYPE) ? obj : null;
}

/**
 * Returns all goals.
 * @returns {Promise<object[]>}
 */
export async function getAllGoals() {
  const goals = await dbGetAllByIndex(STORE, 'type', GOAL_TYPE);
  // Sort chronologically (oldest first)
  return goals.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Creates and stores a new goal.
 */
export async function addGoal(goalData) {
  const goal = createGoal(goalData);
  await dbPut(STORE, goal);
  return goal;
}

/**
 * Updates an existing goal.
 */
export async function updateGoal(id, fields) {
  let updated;
  await writeSequence([STORE, 'facts'], tx => {
    const store = tx.objectStore(STORE);
    const request = store.get(id);
    request.onsuccess = () => {
      const existing = request.result;
      if (!existing || existing.type !== GOAL_TYPE) {
        tx.abort();
        return;
      }
      updated = { ...existing, ...fields, updatedAt: new Date().toISOString() };
      recordRemovedMilestones(tx, existing, updated.targets || []);
      store.put(updated);
    };
  });
  return updated;
}

export async function deleteGoal(id) {
  await writeSequence([STORE, 'facts'], tx => {
    const store = tx.objectStore(STORE);
    const request = store.get(id);
    request.onsuccess = () => {
      const existing = request.result;
      if (!existing || existing.type !== GOAL_TYPE) {
        tx.abort();
        return;
      }
      recordRemovedMilestones(tx, existing, []);
      store.delete(id);
    };
  });
}

function recordRemovedMilestones(tx, goal, nextTargets) {
  const retained = new Set(nextTargets.filter(target => target.completed && target.completionId)
    .map(target => target.completionId));
  for (const target of goal.targets || []) {
    if (!target.completed || !target.completionId || retained.has(target.completionId)) continue;
    const now = new Date();
    tx.objectStore('facts').add({
      id: crypto.randomUUID(), schemaVersion: 1, type: 'correction', objectId: goal.id, value: null,
      meta: { action: 'remove_milestone', completionId: target.completionId,
        goalLabel: goal.label, previousTarget: target },
      source: { type: 'user' }, context: {}, occurredAt: now.toISOString(), recordedAt: now.toISOString(),
      localDate: localDateStr(now), timezone: getLocalTimezone(),
    });
  }
}

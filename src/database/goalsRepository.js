/**
 * Goals repository (§19 Goal Architecture, §26 Life Object Model).
 *
 * Owns all reads and writes to Goal entities in the 'lifeObjects' store.
 * 
 * Note: A legacy 'goals' store exists which only holds checkbox state.
 * Target state should now be managed directly on the Goal object or via Facts.
 */

import { dbGet, dbPut, dbDelete, dbGetAllByIndex, dbGetAll } from './db.js';
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
  const existing = await getGoal(id);
  if (!existing) throw new Error(`[goalsRepository] Goal not found: ${id}`);

  const updated = {
    ...existing,
    ...fields,
    updatedAt: new Date().toISOString(),
  };

  await dbPut(STORE, updated);
  return updated;
}


export async function deleteGoal(id) {
  await dbDelete(STORE, id);
}

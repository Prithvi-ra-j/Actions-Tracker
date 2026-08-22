/**
 * Goals repository.
 *
 * Schema for each record in the 'goals' object store:
 * {
 *   key:   string  — "gi-ti" where gi=goalIndex, ti=targetIndex
 *   value: 0|1
 * }
 */

import { dbPut, dbGetAll } from './db.js';

/**
 * Sets a goal target checkbox state.
 * @param {string}  key    e.g. "0-1" (goal 0, target 1)
 * @param {boolean} value
 */
export async function setGoalCheck(key, value) {
  await dbPut('goals', { key, value: value ? 1 : 0 });
}

/**
 * Returns all goal checkbox states as a plain object { key: boolean }.
 * Missing keys should be treated as false.
 */
export async function getAllGoalChecks() {
  const rows = await dbGetAll('goals');
  const map = {};
  for (const row of rows) {
    map[row.key] = !!row.value;
  }
  return map;
}

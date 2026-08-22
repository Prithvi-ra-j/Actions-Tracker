/**
 * Milestones repository.
 *
 * Schema for each record in the 'milestones' object store:
 * {
 *   key:   string  — "m-mi-ti" where mi=milestoneIndex, ti=taskIndex
 *   value: 0|1
 * }
 */

import { dbPut, dbGetAll } from './db.js';

/**
 * Sets a milestone task checkbox state.
 * @param {string}  key    e.g. "m-0-2"
 * @param {boolean} value
 */
export async function setMilestoneCheck(key, value) {
  await dbPut('milestones', { key, value: value ? 1 : 0 });
}

/**
 * Returns all milestone checkbox states as a plain object { key: boolean }.
 * Missing keys should be treated as false.
 */
export async function getAllMilestoneChecks() {
  const rows = await dbGetAll('milestones');
  const map = {};
  for (const row of rows) {
    map[row.key] = !!row.value;
  }
  return map;
}

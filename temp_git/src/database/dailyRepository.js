/**
 * Daily record repository.
 *
 * Schema for each record in the 'daily' object store:
 * {
 *   date:        string  — "YYYY-MM-DD", the primary key
 *   body:        0|1
 *   philosophy:  0|1
 *   art:         0|1
 *   history:     0|1
 * }
 *
 * Returned records from all public functions use booleans, not 0/1.
 */

import { dbGet, dbPut, dbGetAll, dbGetRange } from './db.js';
import { getMonthStartDate, getMonthEndDate } from '../helpers/dateHelpers.js';
import { addLog, deleteDailyCheckboxLog } from './logsRepository.js';

// ─── Write ─────────────────────────────────────────────────────────────────────

/**
 * Saves or updates a daily task record.
 *
 * @param {string} date   "YYYY-MM-DD" — must be the LOCAL calendar date
 * @param {{ body: boolean, philosophy: boolean, art: boolean, history: boolean }} tasks
 */
export async function saveDailyRecord(date, tasks) {
  const oldRow = await dbGet('daily', date);
  const oldTasks = oldRow ? normalise(oldRow) : { body: false, philosophy: false, art: false, history: false };

  await dbPut('daily', {
    date,
    body:        tasks.body        ? 1 : 0,
    philosophy:  tasks.philosophy  ? 1 : 0,
    art:         tasks.art         ? 1 : 0,
    history:     tasks.history     ? 1 : 0,
  });

  const taskToAxis = {
    body: 'discipline',
    philosophy: 'knowledge',
    art: 'creativity',
    history: 'strategy'
  };

  for (const [key, axis] of Object.entries(taskToAxis)) {
    const wasDone = oldTasks[key];
    const isDone = tasks[key];

    if (!wasDone && isDone) {
      await addLog({
        axis,
        type: 'daily_checkbox',
        value: 1,
        date,
        meta: { task: key }
      });
    } else if (wasDone && !isDone) {
      await deleteDailyCheckboxLog(date, key);
    }
  }
}

// ─── Read ──────────────────────────────────────────────────────────────────────

/**
 * Returns a single daily record (with boolean fields), or null if not found.
 * @param {string} date  "YYYY-MM-DD"
 */
export async function getDailyRecord(date) {
  const row = await dbGet('daily', date);
  return row ? normalise(row) : null;
}

/**
 * Returns ALL daily records as an object keyed by date.
 * { "2026-08-17": { date, body, philosophy, art, history }, ... }
 */
export async function getAllDailyRecords() {
  const rows = await dbGetAll('daily');
  return rowsToMap(rows);
}

/**
 * Returns daily records for a specific calendar month.
 * @param {number} year
 * @param {number} month  1-based
 */
export async function getMonthRecords(year, month) {
  const start = getMonthStartDate(year, month);
  const end   = getMonthEndDate(year, month);
  const rows  = await dbGetRange('daily', start, end);
  return rowsToMap(rows);
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

function normalise(row) {
  return {
    date:        row.date,
    body:        !!row.body,
    philosophy:  !!row.philosophy,
    art:         !!row.art,
    history:     !!row.history,
  };
}

function rowsToMap(rows) {
  const map = {};
  for (const row of rows) {
    map[row.date] = normalise(row);
  }
  return map;
}

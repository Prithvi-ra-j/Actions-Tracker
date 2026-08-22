/**
 * Pure statistical calculation functions.
 * All functions accept the recordsMap from the database:
 *   { "YYYY-MM-DD": { body, philosophy, art, history } }
 * No side effects, no database calls.
 */

import {
  localDateStr,
  areConsecutiveDays,
  getCurrentWeekDates,
} from './dateHelpers.js';

// ─── Day-level helpers ─────────────────────────────────────────────────────────

/**
 * Returns true if a daily record is a "perfect day" (all 4 tasks complete).
 * @param {object|null} record
 */
export function isDayPerfect(record) {
  if (!record) return false;
  return !!(record.body && record.philosophy && record.art && record.history);
}

/**
 * Returns the number of tasks completed in a record (0–4).
 * @param {object|null} record
 */
export function getDayScore(record) {
  if (!record) return 0;
  return [record.body, record.philosophy, record.art, record.history].filter(Boolean).length;
}

// ─── Streak calculations ───────────────────────────────────────────────────────

/**
 * Calculates the current streak of consecutive perfect days.
 *
 * - If today is perfect: today counts, then we look backwards.
 * - If today is incomplete: we start from yesterday and look backwards.
 * - A missing date (no record) breaks the streak.
 *
 * @param {Object} recordsMap  { "YYYY-MM-DD": { body, philosophy, art, history } }
 * @returns {number}
 */
export function calcCurrentStreak(recordsMap) {
  const todayStr = localDateStr();
  const todayPerfect = isDayPerfect(recordsMap[todayStr]);

  const startDate = new Date();
  if (!todayPerfect) {
    startDate.setDate(startDate.getDate() - 1);
  }

  let streak = 0;
  const d = new Date(startDate);

  for (let i = 0; i < 3650; i++) {
    const dateStr = localDateStr(d);
    if (!isDayPerfect(recordsMap[dateStr])) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }

  return streak;
}

/**
 * Calculates the longest ever streak of consecutive perfect days.
 * Correctly handles gaps between records — a missing date breaks the streak.
 *
 * @param {Object} recordsMap
 * @returns {number}
 */
export function calcLongestStreak(recordsMap) {
  const dates = Object.keys(recordsMap).sort();
  if (dates.length === 0) return 0;

  let longest = 0;
  let current = 0;
  let prevDate = null;

  for (const dateStr of dates) {
    if (isDayPerfect(recordsMap[dateStr])) {
      const consecutive = prevDate !== null && areConsecutiveDays(prevDate, dateStr);
      current = consecutive ? current + 1 : 1;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
    prevDate = dateStr;
  }

  return longest;
}

// ─── Aggregate statistics ──────────────────────────────────────────────────────

/**
 * Total number of perfect days across all recorded history.
 * @param {Object} recordsMap
 */
export function calcPerfectDays(recordsMap) {
  return Object.values(recordsMap).filter(isDayPerfect).length;
}

/**
 * Total number of individual tasks completed across all recorded history.
 * @param {Object} recordsMap
 */
export function calcTotalTasks(recordsMap) {
  return Object.values(recordsMap).reduce((sum, r) => sum + getDayScore(r), 0);
}

// ─── Weekly statistics ─────────────────────────────────────────────────────────

/**
 * Calculates statistics for the current Mon–Sun week.
 *
 * Future days are excluded from the denominator.
 *
 * @param {Object} recordsMap
 * @returns {{ pct: number, weekDates: string[], dayResults: Array }}
 */
export function calcWeeklyStats(recordsMap) {
  const weekDates = getCurrentWeekDates();
  const today = localDateStr();

  let totalPossible = 0;
  let totalDone = 0;
  const dayResults = [];

  for (const dateStr of weekDates) {
    if (dateStr > today) {
      dayResults.push({ date: dateStr, score: 0, possible: 0, isPerfect: false, hasData: false, isFuture: true });
      continue;
    }
    const record = recordsMap[dateStr];
    const score = getDayScore(record);
    const perfect = isDayPerfect(record);
    totalPossible += 4;
    totalDone += score;
    dayResults.push({ date: dateStr, score, possible: 4, isPerfect: perfect, hasData: !!record, isFuture: false });
  }

  const pct = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;
  return { pct, weekDates, dayResults, totalDone, totalPossible };
}

// ─── Monthly statistics ────────────────────────────────────────────────────────

/**
 * Calculates completion statistics for a given month.
 *
 * Future days within the month are excluded from the denominator.
 *
 * @param {Object} recordsMap
 * @param {number} year
 * @param {number} month  1-based
 * @returns {{ pct: number, totalDone: number, totalPossible: number }}
 */
export function calcMonthlyStats(recordsMap, year, month) {
  const today = localDateStr();
  const endDate = new Date(year, month, 0); // last day of month

  let totalPossible = 0;
  let totalDone = 0;

  const d = new Date(year, month - 1, 1); // first day of month
  while (d <= endDate) {
    const dateStr = localDateStr(d);
    if (dateStr > today) break; // don't count future days
    const record = recordsMap[dateStr];
    totalPossible += 4;
    totalDone += getDayScore(record);
    d.setDate(d.getDate() + 1);
  }

  const pct = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;
  return { pct, totalDone, totalPossible };
}

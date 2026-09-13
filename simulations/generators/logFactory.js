/**
 * simulations/generators/logFactory.js
 *
 * Utilities to generate streams of pure log entries for simulation.
 */
import { subDays } from './dateUtils.js';

let uuidCounter = 0;
function genId() {
  return `sim-log-${uuidCounter++}`;
}

export function makeLog(date, axis, type, meta = {}) {
  return { id: genId(), date, axis, type, meta };
}

export function makeDailyLogs(axis, type, today, daysBack, freqFn) {
  const logs = [];
  // daysBack 0 means just today. daysBack 29 means today-29 to today (30 days)
  for (let i = daysBack; i >= 0; i--) {
    const date = subDays(today, i);
    // freqFn(i, date) returning true means create log on this day
    if (freqFn(i, date)) {
      logs.push(makeLog(date, axis, type));
    }
  }
  return logs;
}

export function makeBookFinishedLog(date, axis, weight = 1.0) {
  return makeLog(date, axis, 'book_finished', { weight });
}

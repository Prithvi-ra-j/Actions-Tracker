import { createOccurrenceRecord } from '../database/habitOccurrenceRepository.js';
import { daysBetween, localDateStr, parseLocalDate, subtractDays } from '../helpers/dateHelpers.js';
import { writeSequence } from '../database/db.js';

export function isHabitDue(frequency, dayOfWeek) {
  const rule = frequency || { type: 'daily' };
  if ((rule.type === 'weekly' || rule.type === 'custom') && Array.isArray(rule.days)) {
    return rule.days.includes(dayOfWeek);
  }
  return true;
}

export function getGraceState(scheduledFor, currentDateStr) {
  const daysLate = daysBetween(scheduledFor.split('T')[0], currentDateStr);
  if (daysLate <= 0) return { daysLate: 0, state: 'scheduled' };
  if (daysLate === 1) return { daysLate, state: 'grace_day_one' };
  if (daysLate === 2) return { daysLate, state: 'grace_day_two' };
  return { daysLate, state: 'grace_expired' };
}

export function getGracePrompt(status, graceState) {
  if (status === 'expected' && graceState === 'grace_day_one') {
    return 'This was scheduled yesterday. You can still complete it.';
  }
  if (status === 'expected' && graceState === 'grace_day_two') {
    return 'This is still available if you want to complete it.';
  }
  if (status === 'unknown' && graceState === 'grace_expired') {
    return 'Pattern forming. What is getting in the way?';
  }
  return null;
}

/**
 * Sweeps old occurrences without treating ordinary one- or two-day gaps as misses.
 * Unknown remains neutral under the discipline invariant.
 */
async function evaluatePastOccurrences(currentDateStr) {
  try {
    const startStr = subtractDays(currentDateStr, 7);
    let unknownCount = 0;
    await writeSequence(['habitOccurrences'], tx => {
      const request = tx.objectStore('habitOccurrences').openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const occ = cursor.value;
        const date = occ.scheduledFor.split('T')[0];
        if (date >= startStr && date < currentDateStr && occ.status === 'expected') {
          const grace = getGraceState(date, currentDateStr);
          if (grace.state === 'grace_expired') {
            cursor.update({ ...occ, status: 'unknown', reason: 'grace_window_expired', graceDays: 2 });
            unknownCount++;
          } else {
            cursor.update({ ...occ, graceState: grace.state, graceDays: 2 });
          }
        }
        cursor.continue();
      };
    });
    
    if (unknownCount > 0) {
      console.log(`[occurrenceEngine] Evaluated ${unknownCount} past occurrences as unknown.`);
    }
  } catch (err) {
    console.error('[occurrenceEngine] Failed to evaluate past occurrences:', err);
    throw err;
  }
}

/**
 * Evaluates active habits and generates 'expected' occurrences for the given day.
 * Idempotent: running multiple times for the same day will not create duplicates.
 * 
 * @param {string} dateStr - 'YYYY-MM-DD'
 */
export async function generateOccurrencesForDate(dateStr = localDateStr()) {
  try {
    // First, sweep for missed habits from yesterday
    await evaluatePastOccurrences(dateStr);

    const dateObj = parseLocalDate(dateStr);
    if (!dateObj) throw new Error(`Invalid occurrence date: ${dateStr}`);
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    let generatedCount = 0;
    await writeSequence(['habits', 'habitOccurrences', 'settings'], tx => {
      const occurrenceStore = tx.objectStore('habitOccurrences');
      const habitsRequest = tx.objectStore('habits').getAll();
      const occurrencesRequest = occurrenceStore.getAll();
      const restRequest = tx.objectStore('settings').get('restDay');
      restRequest.onsuccess = () => {
        const existing = new Map(occurrencesRequest.result
          .filter(occ => occ.scheduledFor.split('T')[0] === dateStr).map(occ => [occ.habitId, occ]));
        const restDay = restRequest.result?.value === dateStr;
        for (const habit of habitsRequest.result) {
          if (habit.status !== 'active') continue;
          if (!isHabitDue(habit.frequency, dayOfWeek)) continue;
          const previous = existing.get(habit.id);
          if (previous) {
            if (previous.status === 'excused' && previous.reason === 'schedule_changed') {
              const { schedulePreviousStatus, schedulePreviousReason, ...record } = previous;
              occurrenceStore.put({ ...record, status: restDay ? 'excused' : schedulePreviousStatus || 'expected',
                reason: restDay ? 'rest_day' : schedulePreviousReason ?? null });
            }
            continue;
          }
          occurrenceStore.put(createOccurrenceRecord({
            habitId: habit.id,
            scheduledFor: dateStr,
            status: restDay ? 'excused' : 'expected',
            reason: restDay ? 'rest_day' : '',
          }));
          generatedCount++;
        }
      };
    });

    console.log(`[occurrenceEngine] Generated ${generatedCount} occurrences for ${dateStr}`);
    return generatedCount;
  } catch (err) {
    console.error('[occurrenceEngine] Failed to generate occurrences:', err);
    throw err;
  }
}

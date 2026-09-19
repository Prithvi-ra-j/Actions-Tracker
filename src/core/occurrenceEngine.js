import { getAllHabits } from '../database/habitRepository.js';
import { addOccurrence, getOccurrencesByDateRange, updateOccurrence } from '../database/habitOccurrenceRepository.js';
import { localDateStr } from '../helpers/dateHelpers.js';
import { addLog } from '../database/logsRepository.js';

export function getGraceState(scheduledFor, currentDateStr) {
  const scheduled = new Date(`${scheduledFor}T00:00:00`);
  const current = new Date(`${currentDateStr}T00:00:00`);
  const daysLate = Math.floor((current - scheduled) / 86400000);
  if (daysLate <= 0) return { daysLate: 0, state: 'scheduled' };
  if (daysLate === 1) return { daysLate, state: 'grace_day_one' };
  if (daysLate === 2) return { daysLate, state: 'grace_day_two' };
  return { daysLate, state: 'grace_expired' };
}

export function getGracePrompt(status, graceState) {
  if (status === 'expected' && graceState === 'grace_day_one') {
    return 'You missed yesterday. You still have today.';
  }
  if (status === 'expected' && graceState === 'grace_day_two') {
    return 'You missed yesterday and today. Tomorrow is the day that matters.';
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
    // Let's just look at the last 7 days for efficiency
    const d = new Date(currentDateStr);
    d.setDate(d.getDate() - 7);
    const startStr = d.toISOString().split('T')[0];

    const pastOccurrences = await getOccurrencesByDateRange(startStr, currentDateStr);
    let unknownCount = 0;

    for (const occ of pastOccurrences) {
      if (occ.scheduledFor < currentDateStr && occ.status === 'expected') {
        const grace = getGraceState(occ.scheduledFor, currentDateStr);
        if (grace.state === 'grace_expired') {
          await updateOccurrence(occ.id, { status: 'unknown', reason: 'grace_window_expired', graceDays: 2 });
          unknownCount++;
        } else {
          await updateOccurrence(occ.id, { graceState: grace.state, graceDays: 2 });
        }
      }
    }
    
    if (unknownCount > 0) {
      console.log(`[occurrenceEngine] Evaluated ${unknownCount} past occurrences as unknown.`);
    }
  } catch (err) {
    console.error('[occurrenceEngine] Failed to evaluate past occurrences:', err);
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

    const habits = await getAllHabits();
    const activeHabits = habits.filter(h => h.status === 'active');

    // Get existing occurrences for today to prevent duplicates
    const existingOccurrences = await getOccurrencesByDateRange(dateStr, dateStr);
    const existingHabitIds = new Set(existingOccurrences.map(o => o.habitId));

    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    let generatedCount = 0;

    for (const habit of activeHabits) {
      if (existingHabitIds.has(habit.id)) {
        continue; // Already scheduled
      }

      const freq = habit.frequency || { type: 'daily' };
      let isDue = false;

      if (freq.type === 'daily') {
        isDue = true;
      } else if (freq.type === 'weekly' && Array.isArray(freq.days)) {
        // days is an array of integers 0-6
        isDue = freq.days.includes(dayOfWeek);
      } else {
        // Fallback for custom or missing
        isDue = true; 
      }

      if (isDue) {
        await addOccurrence({
          habitId: habit.id,
          scheduledFor: dateStr,
          status: 'expected',
        });
        generatedCount++;
      }
    }

    console.log(`[occurrenceEngine] Generated ${generatedCount} occurrences for ${dateStr}`);
    return generatedCount;
  } catch (err) {
    console.error('[occurrenceEngine] Failed to generate occurrences:', err);
    throw err;
  }
}

import { getAllHabits } from '../database/habitRepository.js';
import { getOccurrencesForHabit } from '../database/habitOccurrenceRepository.js';
import { writeSequence } from '../database/db.js';
import { getLocalTimezone, localDateStr, parseLocalDate } from '../helpers/dateHelpers.js';
import { isHabitDue } from './occurrenceEngine.js';

export async function loadHabitSummaries() {
  const habits = await getAllHabits();
  return Promise.all(habits.filter(habit => habit.status !== 'archived').map(async habit => {
    const occurrences = await getOccurrencesForHabit(habit.id);
    const completedDays = new Set(occurrences.filter(occurrence => occurrence.status === 'completed')
      .map(occurrence => occurrence.scheduledFor.split('T')[0])).size;
    return { ...habit, completedDays };
  }));
}

export async function markRestDay(date) {
  await writeSequence(['settings', 'habitOccurrences'], tx => {
    tx.objectStore('settings').put({ key: 'restDay', value: date });
    tx.objectStore('settings').put({ key: `restDay:${date}`, value: 'true' });
    const store = tx.objectStore('habitOccurrences');
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const occurrence = cursor.value;
      if (occurrence.scheduledFor.split('T')[0] === date && ['expected', 'unknown'].includes(occurrence.status)) {
        cursor.update({ ...occurrence, status: 'excused', reason: 'rest_day' });
      }
      cursor.continue();
    };
  });
}

export async function saveHabitSchedule(habit, updates, today) {
  const day = parseLocalDate(today)?.getDay();
  if (day === undefined) throw new Error('Invalid date.');
  let savedHabit;
  await writeSequence(['habits', 'habitOccurrences'], tx => {
    const habits = tx.objectStore('habits');
    const request = habits.getAll();
    request.onsuccess = () => {
      const current = request.result.find(item => item.id === habit.id);
      if (!current) {
        tx.abort();
        return;
      }
      let reminder = updates.reminder ?? current.reminder;
      if (reminder?.enabled && !reminder.number) {
        const number = Math.max(0, ...request.result.map(item => item.reminder?.number || 0)) + 1;
        if (number > 268422955) {
          tx.abort();
          return;
        }
        reminder = { ...reminder, number };
      }
      savedHabit = { ...current, ...updates, reminder, updatedAt: new Date().toISOString() };
      habits.put(savedHabit);
      const due = savedHabit.status === 'active' && isHabitDue(savedHabit.frequency, day);
      const cursorRequest = tx.objectStore('habitOccurrences').openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        const occurrence = cursor.value;
        if (occurrence.habitId === habit.id && occurrence.status === 'completed' && !occurrence.attribution) {
          cursor.update({ ...occurrence, attribution: {
            primary: current.domain, secondary: current.secondaryDomain ?? null,
            primaryShare: current.primaryShare ?? 100,
          } });
        }
        if (!due && occurrence.habitId === habit.id && occurrence.scheduledFor.split('T')[0] === today &&
            ['expected', 'unknown'].includes(occurrence.status)) {
          cursor.update({ ...occurrence, status: 'excused', reason: 'schedule_changed',
            schedulePreviousStatus: occurrence.status, schedulePreviousReason: occurrence.reason });
        }
        cursor.continue();
      };
    };
  });
  return savedHabit;
}

export async function completeHabitOccurrence(id, { tiny = false } = {}) {
  let previous;
  const completedAt = new Date().toISOString();
  await writeSequence(['habits', 'habitOccurrences'], tx => {
    const store = tx.objectStore('habitOccurrences');
    const request = store.get(id);
    request.onsuccess = () => {
      const current = request.result;
      if (!current || ['completed', 'excused'].includes(current.status)) return;
      const habitRequest = tx.objectStore('habits').get(current.habitId);
      habitRequest.onsuccess = () => {
        const habit = habitRequest.result;
        if (!habit) return;
        previous = current;
        store.put({ ...current, status: 'completed', completedAt,
          completionVersion: tiny && habit.tinyVersion ? 'tiny' : 'regular',
          completionVersionText: tiny && habit.tinyVersion ? habit.tinyVersion : null, attribution: {
          primary: habit.domain, secondary: habit.secondaryDomain ?? null,
          primaryShare: habit.primaryShare ?? 100,
        } });
      };
    };
  });
  if (!previous) throw new Error('This occurrence is no longer available to complete.');
  return { previous, completedAt };
}

export async function undoCompletion(previous, completedAt) {
  let changed = false;
  await writeSequence(['settings', 'habits', 'habitOccurrences'], tx => {
    const store = tx.objectStore('habitOccurrences');
    const request = store.get(previous.id);
    request.onsuccess = () => {
      const current = request.result;
      if (!current || current.status !== 'completed' || current.completedAt !== completedAt) return;
      const habitRequest = tx.objectStore('habits').get(current.habitId);
      habitRequest.onsuccess = () => {
        const habit = habitRequest.result;
        const day = parseLocalDate(current.scheduledFor.split('T')[0])?.getDay();
        if (!habit || habit.status !== 'active' || day === undefined ||
            !isHabitDue(habit.frequency, day)) return;
        const restRequest = tx.objectStore('settings').get('restDay');
        restRequest.onsuccess = () => {
          const isRestDay = restRequest.result?.value === current.scheduledFor.split('T')[0] &&
            ['expected', 'unknown'].includes(previous.status);
          store.put({
            ...current,
            status: isRestDay ? 'excused' : previous.status,
            reason: isRestDay ? 'rest_day' : previous.reason,
            completedAt: previous.completedAt ?? null,
            value: previous.value ?? null,
            supportingFactIds: previous.supportingFactIds ?? [],
            attribution: previous.attribution ?? null,
            completionVersion: previous.completionVersion ?? null,
            completionVersionText: previous.completionVersionText ?? null,
          });
          changed = true;
        };
      };
    };
  });
  if (!changed) throw new Error('The occurrence has changed since completion.');
}

export async function correctHabitCompletion(id) {
  let changed = false;
  await writeSequence(['habitOccurrences', 'facts', 'settings'], tx => {
    const store = tx.objectStore('habitOccurrences');
    const request = store.get(id);
    request.onsuccess = () => {
      const occurrence = request.result;
      if (!occurrence || occurrence.status !== 'completed') return;
      const date = occurrence.scheduledFor.split('T')[0];
      const settings = tx.objectStore('settings');
      const restRequest = settings.get(`restDay:${date}`);
      const latestRestRequest = settings.get('restDay');
      latestRestRequest.onsuccess = () => {
        const now = new Date();
        const factId = `fact_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`;
        const isRestDay = restRequest.result?.value === 'true' || latestRestRequest.result?.value === date;
        tx.objectStore('facts').add({
          id: factId, schemaVersion: 1, type: 'correction', objectId: id, value: null,
          meta: { occurrenceId: id, action: 'remove_completion', previousCompletedAt: occurrence.completedAt,
            attribution: occurrence.attribution ?? null, scheduledFor: occurrence.scheduledFor,
            previousOccurrence: occurrence },
          source: { type: 'user' }, context: {}, occurredAt: now.toISOString(),
          recordedAt: now.toISOString(), localDate: localDateStr(now), timezone: getLocalTimezone(),
        });
        store.put({ ...occurrence, status: isRestDay ? 'excused' : 'unknown',
          reason: isRestDay ? 'rest_day' : 'completion_corrected', completedAt: null, attribution: null });
        changed = true;
      };
    };
  });
  if (!changed) throw new Error('This completion is no longer available to correct.');
}

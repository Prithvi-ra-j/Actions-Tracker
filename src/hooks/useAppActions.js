import { useCallback, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { localDateStr, subtractDays } from '../helpers/dateHelpers.js';
import { loadEnrichedOccurrences } from '../core/appData.js';
import { addLog, deleteLog } from '../database/logsRepository.js';
import { saveReminders } from '../database/settingsRepository.js';

function triggerHaptic() {
  try {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  } catch (error) {
    console.warn('[AppActions] Haptic feedback unavailable:', error);
  }
}

export default function useAppActions({
  today,
  setReminders,
  todayOccurrences,
  setTodayOccurrences,
  setCompletionFeedback,
  setLearnings,
  setBooks,
  recomputeStats,
  setHabitSummaries,
  setDailyError,
  setDailyNotice,
}) {
  const completingOccurrences = useRef(new Set());
  const refreshVersion = useRef(0);

  const refreshHabits = useCallback(async () => {
    const version = ++refreshVersion.current;
    const { loadHabitSummaries } = await import('../core/dailyHabits.js');
    const { generateOccurrencesForDate } = await import('../core/occurrenceEngine.js');
    await generateOccurrencesForDate(today);
    const [occurrences, habits] = await Promise.all([
      loadEnrichedOccurrences(subtractDays(today, 2), today, today),
      loadHabitSummaries(),
    ]);
    if (version === refreshVersion.current) {
      setTodayOccurrences(occurrences);
      setHabitSummaries(habits);
    }
  }, [today, setTodayOccurrences, setHabitSummaries]);

  const handleAddEvidence = useCallback(async ({ content, axis, evidenceType, secondary, primaryShare }) => {
    await addLog({
      axis,
      type: 'manual_evidence',
      value: 1,
      date: localDateStr(),
      meta: { content, evidenceType, source: 'manual', secondary, primaryShare },
    });
    void recomputeStats();
  }, [recomputeStats]);

  const handleAddHabit = useCallback(async (fields) => {
    const { addHabit } = await import('../database/habitRepository.js');
    await addHabit({ ...fields, frequency: { type: 'daily' } });
    try {
      await refreshHabits();
      void recomputeStats();
      return null;
    } catch (error) {
      console.error('[AppActions] Habit saved but occurrences could not be refreshed:', error);
      return 'Habit saved, but Today could not be refreshed. Restart the app to try again.';
    }
  }, [refreshHabits, recomputeStats]);

  const handleSaveReminders = useCallback(async (newReminders) => {
    try {
      await saveReminders(newReminders);
      setReminders(newReminders);
    } catch (error) {
      console.error('[AppActions] saveReminders failed:', error);
      throw error;
    }
  }, [setReminders]);

  const handleCompleteOccurrence = useCallback(async (id, options) => {
    if (completingOccurrences.current.has(id)) return;
    completingOccurrences.current.add(id);
    let completed = false;
    try {
      const occurrence = todayOccurrences.find(item => item.id === id);
      const { completeHabitOccurrence } = await import('../core/dailyHabits.js');
      const { previous, completedAt } = await completeHabitOccurrence(id, options);
      completed = true;
      triggerHaptic();
      setCompletionFeedback({ habitTitle: occurrence?.habitTitle || 'Habit completed', occurrence: previous, completedAt });
      setTodayOccurrences(items => items.map(item => item.id === id ? { ...item, status: 'completed', completedAt } : item));
      try {
        const { getHabit } = await import('../database/habitRepository.js');
        const { cancelHabitSnooze } = await import('../native/habitReminders.js');
        if (previous.scheduledFor.split('T')[0] === localDateStr()) {
          await cancelHabitSnooze(await getHabit(previous.habitId));
        }
      } catch (error) {
        console.error('[AppActions] Could not cancel snoozed reminder:', error);
        setDailyError('Habit completed, but its snoozed reminder could not be cancelled.');
      }
      await refreshHabits();
      await recomputeStats();
    } catch (error) {
      console.error('[AppActions] handleCompleteOccurrence failed:', error);
      setDailyError(completed
        ? 'Habit completed, but Today could not be refreshed. Restart the app to reload it.'
        : 'Could not complete the habit. Please try again.');
    } finally {
      completingOccurrences.current.delete(id);
    }
  }, [todayOccurrences, setCompletionFeedback, setTodayOccurrences, refreshHabits, recomputeStats, setDailyError]);

  const handleUndoCompletion = useCallback(async feedback => {
    if (!feedback?.occurrence || !feedback.completedAt) return;
    let undone = false;
    try {
      const { undoCompletion } = await import('../core/dailyHabits.js');
      await undoCompletion(feedback.occurrence, feedback.completedAt);
      undone = true;
      setCompletionFeedback(null);
      await refreshHabits();
      await recomputeStats();
    } catch (error) {
      console.error('[AppActions] Could not undo completion:', error);
      setDailyError(undone
        ? 'Completion undone, but Today could not be refreshed. Restart the app to reload it.'
        : 'Could not undo the completion; the habit may have changed.');
    }
  }, [setCompletionFeedback, refreshHabits, recomputeStats, setDailyError]);

  const handleCorrectCompletion = useCallback(async id => {
    const { correctHabitCompletion } = await import('../core/dailyHabits.js');
    await correctHabitCompletion(id);
    setCompletionFeedback(null);
    try {
      await refreshHabits();
      await recomputeStats();
    } catch (error) {
      console.error('[AppActions] Completion corrected but refresh failed:', error);
      setDailyError('Completion corrected, but Today could not be refreshed. Restart the app to reload it.');
    }
  }, [setCompletionFeedback, refreshHabits, recomputeStats, setDailyError]);

  const handleRestDay = useCallback(async () => {
    let saved = false;
    try {
      const { markRestDay } = await import('../core/dailyHabits.js');
      await markRestDay(today);
      saved = true;
      setDailyNotice('Rest day saved. Open habits today are excused.');
      try {
        const { getAllHabits } = await import('../database/habitRepository.js');
        const { cancelHabitSnooze } = await import('../native/habitReminders.js');
        const results = await Promise.allSettled((await getAllHabits()).map(cancelHabitSnooze));
        if (results.some(result => result.status === 'rejected')) {
          throw new Error('One or more snoozed reminders could not be cancelled.');
        }
      } catch (error) {
        console.error('[AppActions] Could not cancel snoozed reminders:', error);
        setDailyError('Rest day saved, but some snoozed reminders could not be cancelled.');
      }
      await refreshHabits();
      await recomputeStats();
    } catch (error) {
      console.error('[AppActions] Could not save rest day:', error);
      setDailyError(saved
        ? 'Rest day saved, but Today could not be refreshed. Restart the app to reload it.'
        : 'Could not save your rest day. Please try again.');
    }
  }, [today, refreshHabits, recomputeStats, setDailyError, setDailyNotice]);

  const handleUpdateHabit = useCallback(async (habit, updates) => {
    const { saveHabitSchedule } = await import('../core/dailyHabits.js');
    let reminder = updates.reminder;
    if (reminder?.enabled && ((updates.status ?? habit.status) === 'active' || !habit.reminder?.enabled)) {
      const { requestNotificationPermission } = await import('../native/notifications.js');
      if (!await requestNotificationPermission()) throw new Error('Notification permission was not granted.');
    }
    const changes = { ...updates, reminder };
    const savedHabit = await saveHabitSchedule(habit, changes, today);
    const problems = [];
    try {
      if (savedHabit.reminder?.number) {
        const { scheduleHabitReminder } = await import('../native/habitReminders.js');
        await scheduleHabitReminder(savedHabit, { cancelSnooze: true });
      }
    } catch (error) {
      console.error('[AppActions] Habit saved but reminder scheduling failed:', error);
      problems.push('its reminder could not be scheduled; check notification settings');
    }
    try {
      await refreshHabits();
      await recomputeStats();
    } catch (error) {
      console.error('[AppActions] Habit saved but Today could not be refreshed:', error);
      problems.push('Today could not be refreshed; restart the app');
    }
    if (problems.length) {
      const message = `Habit saved, but ${problems.join(' and ')}.`;
      setDailyError(message);
      throw new Error(message);
    }
  }, [today, refreshHabits, recomputeStats, setDailyError]);

  const handleExcuseOccurrence = useCallback(async (id, reason) => {
    try {
      const { excuseOccurrence, getOccurrence } = await import('../database/habitOccurrenceRepository.js');
      await excuseOccurrence(id, reason);
      try {
        const occurrence = await getOccurrence(id);
        if (occurrence?.scheduledFor.split('T')[0] === localDateStr()) {
          const { getHabit } = await import('../database/habitRepository.js');
          const { cancelHabitSnooze } = await import('../native/habitReminders.js');
          await cancelHabitSnooze(await getHabit(occurrence.habitId));
        }
      } catch (error) {
        console.error('[AppActions] Could not cancel snoozed reminder:', error);
        setDailyError('Habit excused, but its snoozed reminder could not be cancelled.');
      }
      setTodayOccurrences(await loadEnrichedOccurrences(
        subtractDays(today, 2),
        today,
        today
      ));
      await recomputeStats();
    } catch (error) {
      console.error('[AppActions] handleExcuseOccurrence failed:', error);
      setDailyError('Could not skip the habit or refresh Today. Please check and try again.');
    }
  }, [today, setTodayOccurrences, recomputeStats, setDailyError]);

  const handleOccurrenceReason = useCallback(async (id, reason) => {
    try {
      const { recordOccurrenceReason } = await import('../database/habitOccurrenceRepository.js');
      await recordOccurrenceReason(id, reason);
      setTodayOccurrences(await loadEnrichedOccurrences(
        subtractDays(today, 2),
        today,
        today
      ));
    } catch (error) {
      console.error('[AppActions] handleOccurrenceReason failed:', error);
    }
  }, [today, setTodayOccurrences]);

  const handleAddLearning = useCallback(async (fields) => {
    try {
      const { addLearning, getAllLearnings } = await import('../database/learningRepository.js');
      const learningId = await addLearning(fields);
      setLearnings(await getAllLearnings());

      if (fields.sourceId) {
        const { addRelation } = await import('../database/relationRepository.js');
        await addRelation(learningId, fields.sourceId, 'derived_from', 1.0);
      }
    } catch (error) {
      console.error('[AppActions] handleAddLearning failed:', error);
      throw error;
    }
  }, [setLearnings]);

  const handleLogLearningPractice = useCallback(async ({ learningId, content, axis }) => {
    const { getLearning, getAllLearnings, updateLearning } = await import('../database/learningRepository.js');
    const learning = await getLearning(learningId);
    if (!learning) throw new Error('This learning topic no longer exists.');

    const logId = await addLog({
      axis,
      type: 'learning_practice',
      value: 1,
      date: localDateStr(),
      meta: { learningId, content, source: 'manual' },
    });
    try {
      await updateLearning(learningId, {
        loopStep: 'Apply',
        lastPracticedAt: new Date().toISOString(),
      });
    } catch (error) {
      await deleteLog(logId).catch(() => {});
      throw error;
    }

    const freshLearnings = await getAllLearnings().catch(() => null);
    if (freshLearnings) setLearnings(freshLearnings);
    void recomputeStats();
  }, [setLearnings, recomputeStats]);

  const handleAddBook = useCallback(async (fields) => {
    try {
      const { addBook, getAllBooks } = await import('../database/booksRepository.js');
      await addBook(fields);
      setBooks(await getAllBooks());
    } catch (error) {
      console.error('[AppActions] handleAddBook failed:', error);
    }
  }, [setBooks]);

  const handleStartBook = useCallback(async (bookId, dateStr) => {
    try {
      const { updateBookStatus, getAllBooks } = await import('../database/booksRepository.js');
      await updateBookStatus(bookId, 'in_progress', dateStr);
      setBooks(await getAllBooks());
    } catch (error) {
      console.error('[AppActions] handleStartBook failed:', error);
    }
  }, [setBooks]);

  const handleUpdatePages = useCallback(async (bookId, pagesAdded, dateStr) => {
    try {
      const { updateBookPagesRead, getAllBooks } = await import('../database/booksRepository.js');
      await updateBookPagesRead(bookId, pagesAdded, dateStr);
      setBooks(await getAllBooks());
      await recomputeStats();
    } catch (error) {
      console.error('[AppActions] handleUpdatePages failed:', error);
    }
  }, [setBooks, recomputeStats]);

  const handleFinishBook = useCallback(async (bookId, dateStr) => {
    try {
      const { updateBookStatus, getAllBooks } = await import('../database/booksRepository.js');
      await updateBookStatus(bookId, 'finished', dateStr);
      setBooks(await getAllBooks());
      await recomputeStats();
    } catch (error) {
      console.error('[AppActions] handleFinishBook failed:', error);
    }
  }, [setBooks, recomputeStats]);

  return {
    handleAddEvidence,
    handleAddHabit,
    handleSaveReminders,
    handleCompleteOccurrence,
    handleUndoCompletion,
    handleCorrectCompletion,
    handleRestDay,
    handleUpdateHabit,
    handleExcuseOccurrence,
    handleOccurrenceReason,
    handleAddLearning,
    handleLogLearningPractice,
    handleAddBook,
    handleStartBook,
    handleUpdatePages,
    handleFinishBook,
  };
}

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
}) {
  const completingOccurrences = useRef(new Set());

  const handleAddEvidence = useCallback(async ({ content, axis, evidenceType }) => {
    await addLog({
      axis,
      type: 'manual_evidence',
      value: 1,
      date: localDateStr(),
      meta: { content, evidenceType, source: 'manual' },
    });
    void recomputeStats();
  }, [recomputeStats]);

  const handleAddHabit = useCallback(async (fields) => {
    const { addHabit } = await import('../database/habitRepository.js');
    await addHabit({ ...fields, frequency: { type: 'daily' } });
    try {
      const { generateOccurrencesForDate } = await import('../core/occurrenceEngine.js');
      await generateOccurrencesForDate(today);
      setTodayOccurrences(await loadEnrichedOccurrences(subtractDays(today, 2), today, today));
      void recomputeStats();
      return null;
    } catch (error) {
      console.error('[AppActions] Habit saved but occurrences could not be refreshed:', error);
      return 'Habit saved, but Today could not be refreshed. Restart the app to try again.';
    }
  }, [today, setTodayOccurrences, recomputeStats]);

  const handleSaveReminders = useCallback(async (newReminders) => {
    try {
      await saveReminders(newReminders);
      setReminders(newReminders);
    } catch (error) {
      console.error('[AppActions] saveReminders failed:', error);
    }
  }, [setReminders]);

  const handleCompleteOccurrence = useCallback(async (id) => {
    if (completingOccurrences.current.has(id)) return;
    completingOccurrences.current.add(id);
    try {
      const occurrence = todayOccurrences.find(item => item.id === id);
      const { completeOccurrence } = await import('../database/habitOccurrenceRepository.js');
      await completeOccurrence(id);
      triggerHaptic();
      setCompletionFeedback({ habitTitle: occurrence?.habitTitle || 'Habit completed' });
      setTodayOccurrences(await loadEnrichedOccurrences(
        subtractDays(today, 2),
        today,
        today
      ));
      await recomputeStats();
    } catch (error) {
      console.error('[AppActions] handleCompleteOccurrence failed:', error);
    } finally {
      completingOccurrences.current.delete(id);
    }
  }, [today, todayOccurrences, setCompletionFeedback, setTodayOccurrences, recomputeStats]);

  const handleExcuseOccurrence = useCallback(async (id, reason) => {
    try {
      const { excuseOccurrence } = await import('../database/habitOccurrenceRepository.js');
      await excuseOccurrence(id, reason);
      setTodayOccurrences(await loadEnrichedOccurrences(
        subtractDays(today, 2),
        today,
        today
      ));
      await recomputeStats();
    } catch (error) {
      console.error('[AppActions] handleExcuseOccurrence failed:', error);
    }
  }, [today, setTodayOccurrences, recomputeStats]);

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

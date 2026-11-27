import { getGraceState } from './occurrenceEngine.js';

export async function loadEnrichedOccurrences(startDate, endDate, currentDate) {
  const { getOccurrencesByDateRange } = await import('../database/habitOccurrenceRepository.js');
  const { getHabit } = await import('../database/habitRepository.js');
  const occurrences = await getOccurrencesByDateRange(startDate, endDate);
  return Promise.all(occurrences.map(async occurrence => {
    const habit = await getHabit(occurrence.habitId);
    const scheduledDate = occurrence.scheduledFor.split('T')[0];
    return {
      ...occurrence,
      habitTitle: habit?.name || 'Unknown Habit',
      axis: habit?.domain,
      timeSlot: habit?.implementationIntention?.timeSlot,
      graceState: getGraceState(scheduledDate, currentDate).state,
    };
  }));
}

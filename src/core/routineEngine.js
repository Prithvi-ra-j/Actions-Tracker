/**
 * Routine Engine (Step 3)
 * Pure functions for time-budget scheduling and habit capacity.
 */

function dayCount(slot) {
  if (Array.isArray(slot.day)) return Math.max(slot.day.length, 1);
  if (Array.isArray(slot.days)) return Math.max(slot.days.length, 1);
  return 1;
}

function minutesForSlot(slot) {
  return Math.max(Number(slot.duration) || 0, 0) * dayCount(slot);
}

function timeToMinutes(value) {
  const match = String(value ?? '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function slotDays(slot) {
  if (Array.isArray(slot.day)) return slot.day;
  if (Array.isArray(slot.days)) return slot.days;
  return [0, 1, 2, 3, 4, 5, 6];
}

/**
 * Returns all weekly time conflicts between routine slots and constraints.
 * Constraints use { days, startTime, endTime } and slots use { day(s), startTime, duration }.
 */
export function findRoutineConflicts(timeSlots = [], constraints = []) {
  const conflicts = [];
  const ranges = timeSlots.map((slot, index) => ({
    type: 'slot',
    index,
    days: slotDays(slot),
    start: timeToMinutes(slot.startTime),
    end: timeToMinutes(slot.endTime) ?? (timeToMinutes(slot.startTime) ?? 0) + (Number(slot.duration) || 0),
    label: slot.label || slot.habitId || `slot_${index}`,
  }));

  for (let left = 0; left < ranges.length; left += 1) {
    for (let right = left + 1; right < ranges.length; right += 1) {
      const a = ranges[left];
      const b = ranges[right];
      const sameDay = a.days.some(day => b.days.includes(day));
      if (sameDay && a.start !== null && b.start !== null && a.start < b.end && b.start < a.end) {
        conflicts.push({ type: 'slot_overlap', first: a.label, second: b.label });
      }
    }
  }

  for (const slot of ranges) {
    for (const constraint of constraints) {
      const constraintDays = Array.isArray(constraint.days) ? constraint.days : [];
      const sameDay = slot.days.some(day => constraintDays.includes(day));
      const constraintStart = timeToMinutes(constraint.startTime);
      const constraintEnd = timeToMinutes(constraint.endTime);
      if (sameDay && slot.start !== null && constraintStart !== null && constraintEnd !== null &&
          slot.start < constraintEnd && constraintStart < slot.end) {
        conflicts.push({ type: 'constraint_overlap', slot: slot.label, constraint: constraint.type || 'constraint' });
      }
    }
  }

  return conflicts;
}

/**
 * Calculates time budget capacity based on the routine config and active habits.
 * 
 * @param {object} routineConfig 
 * @param {object[]} activeHabits 
 * @returns {object} { usedHours, freeHours, utilizationPct, overcommitted, recommendations }
 */
export function calculateCapacity(routineConfig, activeHabits) {
  const weeklyBudgetHours = routineConfig?.weeklyBudget?.total || 0;
  const timeSlots = Array.isArray(routineConfig?.timeSlots) ? routineConfig.timeSlots : [];
  const slotMinutes = timeSlots.reduce((sum, slot) => sum + minutesForSlot(slot), 0);
  const estimatedHabitMinutes = (activeHabits || []).reduce((sum, habit) => {
    if (timeSlots.some(slot => slot.habitId === habit.id)) return sum;
    const duration = Number(habit.target?.durationMinutes ?? habit.durationMinutes ?? 15);
    const frequency = habit.frequency?.type === 'weekly' && Array.isArray(habit.frequency.days)
      ? habit.frequency.days.length
      : 7;
    return sum + Math.max(duration, 0) * frequency;
  }, 0);
  const usedHours = (slotMinutes + estimatedHabitMinutes) / 60;

  const freeHours = Math.max(0, weeklyBudgetHours - usedHours);
  const utilizationPct = weeklyBudgetHours > 0 ? (usedHours / weeklyBudgetHours) * 100 : (usedHours > 0 ? 100 : 0);
  const overcommitted = weeklyBudgetHours > 0 && usedHours > weeklyBudgetHours;
  const conflicts = findRoutineConflicts(timeSlots, routineConfig?.constraints || []);
  const recommendations = [];
  if (overcommitted) {
    recommendations.push('You are over budget for the week. Consider pausing a habit or moving one to maintenance phase.');
  } else if (utilizationPct < 50 && weeklyBudgetHours > 0) {
    recommendations.push('You have available capacity in your routine. Consider advancing a habit to the next mastery level.');
  }
  if (conflicts.length > 0) recommendations.push(`${conflicts.length} routine conflict(s) need resolution.`);
  
  return {
    usedHours,
    freeHours,
    utilizationPct,
    overcommitted,
    recommendations,
    conflicts,
  };
}

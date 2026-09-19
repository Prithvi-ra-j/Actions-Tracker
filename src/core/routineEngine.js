/**
 * Routine Engine (Step 3)
 * Pure functions for time-budget scheduling and habit capacity.
 */

/**
 * Calculates time budget capacity based on the routine config and active habits.
 * 
 * @param {object} routineConfig 
 * @param {object[]} activeHabits 
 * @returns {object} { usedHours, freeHours, utilizationPct, overcommitted, recommendations }
 */
export function calculateCapacity(routineConfig, activeHabits) {
  const weeklyBudgetHours = routineConfig?.weeklyBudget?.total || 0;
  
  // Basic calculation: sum the duration from timeSlots, or default to 0
  let usedHours = 0;
  if (routineConfig?.timeSlots && Array.isArray(routineConfig.timeSlots)) {
    // If timeslots declare durations in minutes
    const totalMinutes = routineConfig.timeSlots.reduce((sum, slot) => sum + (slot.duration || 0), 0);
    usedHours = totalMinutes / 60;
  } else if (activeHabits && activeHabits.length > 0) {
    // Fallback: estimate based on active habits count (e.g. 15 mins a day per habit = 1.75 hrs/week)
    usedHours = activeHabits.length * 1.75;
  }

  const freeHours = Math.max(0, weeklyBudgetHours - usedHours);
  const utilizationPct = weeklyBudgetHours > 0 ? (usedHours / weeklyBudgetHours) * 100 : (usedHours > 0 ? 100 : 0);
  const overcommitted = usedHours > weeklyBudgetHours && weeklyBudgetHours > 0;
  
  const recommendations = [];
  if (overcommitted) {
    recommendations.push('You are over budget for the week. Consider pausing a habit or moving one to maintenance phase.');
  } else if (utilizationPct < 50 && weeklyBudgetHours > 0) {
    recommendations.push('You have available capacity in your routine. Consider advancing a habit to the next mastery level.');
  }
  
  return {
    usedHours,
    freeHours,
    utilizationPct,
    overcommitted,
    recommendations
  };
}

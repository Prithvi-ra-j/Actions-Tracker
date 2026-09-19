/**
 * Repository for routine time-budgeting configuration (Step 3).
 * Stores a single config object with id: 'primary'.
 */

import { dbGet, dbPut } from './db.js';
import { getActiveHabits } from './habitRepository.js';
import { calculateCapacity } from '../core/routineEngine.js';

export async function getRoutineConfig() {
  const config = await dbGet('routineConfig', 'primary');
  if (!config) {
    return {
      id: 'primary',
      weeklyBudget: { total: 0, unit: 'hours' },
      timeSlots: [],
      constraints: [],
      computed: calculateCapacity({ weeklyBudget: { total: 0 }, timeSlots: [], constraints: [] }, []),
    };
  }
  return config;
}

export async function updateRoutineConfig(updates) {
  const current = await getRoutineConfig();
  const next = { ...current, ...updates };
  const activeHabits = await getActiveHabits();
  next.computed = calculateCapacity(next, activeHabits);
  await dbPut('routineConfig', next);
  return next;
}

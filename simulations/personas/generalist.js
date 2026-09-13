/**
 * simulations/personas/generalist.js
 */
import { makeDailyLogs } from '../generators/logFactory.js';
import { makeQuest } from '../generators/questFactory.js';

export function createCheckboxGamer(today) {
  // Spams checkboxes (discipline), full C and M, but V is 0
  const axisConfigs = [{ axis: 'discipline', expectedPerWeek: 7, hasConsistencyTerm: true }];
  const logs = makeDailyLogs('discipline', 'daily_checkbox', today, 89, () => true);
  const quests = []; // No quests -> V=0
  return { logs, quests, axisConfigs, name: 'Checkbox Gamer' };
}

export function createMomentumSprinter(today) {
  // Activity only in the last 13 days
  const axisConfigs = [{ axis: 'discipline', expectedPerWeek: 7, hasConsistencyTerm: true }];
  const logs = makeDailyLogs('discipline', 'daily_checkbox', today, 13, () => true);
  const quests = [makeQuest('q1', 'discipline', 50, 100)];
  return { logs, quests, axisConfigs, name: 'Momentum Sprinter' };
}

export function createSlowSteady(today) {
  // Perfect V, perfect C, but negative M because recent activity dropped
  const axisConfigs = [{ axis: 'discipline', expectedPerWeek: 7, hasConsistencyTerm: true }];
  const logs = [
    // 14-27 days ago (prior window) -> high activity
    ...makeDailyLogs('discipline', 'daily_checkbox', today, 27, (i) => i >= 14),
    // 0-13 days ago (recent window) -> low activity
    ...makeDailyLogs('discipline', 'daily_checkbox', today, 13, (i) => i % 3 === 0)
  ];
  // They've done everything
  const quests = [makeQuest('q1', 'discipline', 100, 100)];
  return { logs, quests, axisConfigs, name: 'Slow & Steady' };
}

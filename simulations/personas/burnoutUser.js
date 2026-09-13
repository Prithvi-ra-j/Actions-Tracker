import { subDays } from '../generators/dateUtils.js';

export function createBurnoutUser(today, days) {
  const logs = [];
  // Works extremely hard for first 60 days, then quits completely.
  for (let i = days - 1; i >= days - 60; i--) {
    const d = subDays(today, i);
    logs.push({ type: 'gym_session', axis: 'strength', date: d });
    logs.push({ type: 'study_session', axis: 'knowledge', date: d });
  }

  const quests = [
    { id: 'q-strength-1', axis: 'strength', targetValue: 40, currentValue: 0, done: false }
  ];

  const axisConfigs = [
    { axis: 'strength', expectedPerWeek: 4, hasConsistencyTerm: true },
    { axis: 'knowledge', expectedPerWeek: 7, hasConsistencyTerm: true }
  ];

  return { logs, quests, axisConfigs };
}

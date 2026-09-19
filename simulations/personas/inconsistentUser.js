import { subDays } from '../generators/dateUtils.js';

export function createInconsistentUser(today, days) {
  const logs = [];
  // Works for a week, stops for a month, works for 2 weeks, etc.
  for (let i = 0; i < days; i++) {
    const d = subDays(today, i);
    // e.g. works when i % 40 < 10 (10 days on, 30 days off)
    if (i % 40 < 10) {
      logs.push({ type: 'gym_session', axis: 'body', date: d });
    }
  }

  const quests = [
    { id: 'q-body-1', axis: 'body', targetValue: 20, currentValue: 0, done: false }
  ];

  const axisConfigs = [
    { axis: 'body', expectedPerWeek: 3, hasConsistencyTerm: true }
  ];

  return { logs, quests, axisConfigs };
}

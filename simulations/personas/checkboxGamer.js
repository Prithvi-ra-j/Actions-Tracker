import { subDays } from '../generators/dateUtils.js';

export function createCheckboxGamer(today, days) {
  const logs = [];
  // Gamer spams daily checkboxes every single day (say 4 checkboxes for body, mind, art, history)
  for (let i = 0; i < days; i++) {
    const d = subDays(today, i);
    logs.push({ type: 'daily_checkbox', axis: 'discipline', date: d, meta: { task: 'body' } });
    logs.push({ type: 'daily_checkbox', axis: 'knowledge',  date: d, meta: { task: 'philosophy' } });
    logs.push({ type: 'daily_checkbox', axis: 'creativity', date: d, meta: { task: 'art' } });
    logs.push({ type: 'daily_checkbox', axis: 'strategy',   date: d, meta: { task: 'history' } });
  }

  // But gamer never does any real quest work.
  const quests = [];

  const axisConfigs = [
    { axis: 'discipline', expectedPerWeek: 7, hasConsistencyTerm: true },
    { axis: 'knowledge',  expectedPerWeek: 7, hasConsistencyTerm: true },
    { axis: 'creativity', expectedPerWeek: 7, hasConsistencyTerm: true },
    { axis: 'strategy',   expectedPerWeek: 7, hasConsistencyTerm: true },
    { axis: 'social',     expectedPerWeek: null, hasConsistencyTerm: false },
    { axis: 'body',   expectedPerWeek: 4, hasConsistencyTerm: true },
  ];

  return { logs, quests, axisConfigs };
}

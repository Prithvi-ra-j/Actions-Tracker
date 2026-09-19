import { subDays } from '../generators/dateUtils.js';

export function createJournalSpammer(today, days) {
  const logs = [];
  // Spammer writes a journal entry every single day (sometimes multiple)
  for (let i = 0; i < days; i++) {
    const d = subDays(today, i);
    logs.push({ type: 'journal_entry', axis: 'social', date: d, meta: { text: 'Spam 1' } });
    if (i % 3 === 0) {
      logs.push({ type: 'journal_entry', axis: 'social', date: d, meta: { text: 'Spam 2' } });
    }
  }

  // Quests
  const quests = [
    { id: 'q-social-journal', axis: 'social', targetValue: 75, currentValue: 0, done: false }
  ];

  const axisConfigs = [
    { axis: 'social', expectedPerWeek: null, hasConsistencyTerm: false }
  ];

  return { logs, quests, axisConfigs };
}

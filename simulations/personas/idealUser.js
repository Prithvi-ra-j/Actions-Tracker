/**
 * simulations/personas/idealUser.js
 */
import { makeDailyLogs } from '../generators/logFactory.js';
import { makeQuest } from '../generators/questFactory.js';

export function createIdealUser(today, daysBack = 90) {
  // Configs representing ideal cadences
  const axisConfigs = [
    { axis: 'strength',   expectedPerWeek: 4, hasConsistencyTerm: true },
    { axis: 'discipline', expectedPerWeek: 7, hasConsistencyTerm: true },
    { axis: 'knowledge',  expectedPerWeek: 2, hasConsistencyTerm: true },
    { axis: 'strategy',   expectedPerWeek: 3, hasConsistencyTerm: true },
    { axis: 'creativity', expectedPerWeek: 1, hasConsistencyTerm: true },
    { axis: 'wisdom',     expectedPerWeek: 2, hasConsistencyTerm: false }
  ];

  // Logs exactly matching expectations
  const logs = [
    ...makeDailyLogs('strength', 'gym_session', today, daysBack, (i) => i % 7 < 4), // 4x/week
    ...makeDailyLogs('discipline', 'daily_checkbox', today, daysBack, () => true),   // 7x/week
    ...makeDailyLogs('knowledge', 'study_session', today, daysBack, (i) => i % 7 === 0 || i % 7 === 3), // 2x/week
    ...makeDailyLogs('strategy', 'reading_session', today, daysBack, (i) => i % 7 < 3), // 3x/week
    ...makeDailyLogs('creativity', 'creative_work', today, daysBack, (i) => i % 7 === 0), // 1x/week
    ...makeDailyLogs('wisdom', 'journal_entry', today, daysBack, (i) => i % 7 === 0 || i % 7 === 4), // 2x/week
  ];

  // Assume they are making good progress on quests
  const quests = [
    makeQuest('q-strength-1', 'strength', 20, 40),
    makeQuest('q-discipline-1', 'discipline', 80, 100),
    makeQuest('q-knowledge-1', 'knowledge', 5, 10),
    makeQuest('q-strategy-1', 'strategy', 1, 1, true),
    makeQuest('q-creativity-1', 'creativity', 1, 3),
    makeQuest('q-wisdom-1', 'wisdom', 10, 20)
  ];

  return { logs, quests, axisConfigs, name: 'Ideal User' };
}

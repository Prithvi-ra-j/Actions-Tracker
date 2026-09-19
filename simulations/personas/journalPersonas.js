/**
 * simulations/personas/journalPersonas.js
 */
import { makeDailyLogs } from '../generators/logFactory.js';
import { makeQuest } from '../generators/questFactory.js';

function createWisdomPersona(today, name, logsPredicate) {
  const axisConfigs = [
    { axis: 'social', expectedPerWeek: 2, hasConsistencyTerm: false }
  ];

  const logs = makeDailyLogs('social', 'journal_entry', today, 89, logsPredicate);
  const entriesCount = logs.length;
  
  // Social V relies on completing 10 entries for a quest
  const quests = [
    makeQuest('q-social-journal', 'social', entriesCount, 10, entriesCount >= 10)
  ];

  return { logs, quests, axisConfigs, name };
}

export function createDeepThinker(today) {
  // 1 per week
  return createWisdomPersona(today, 'Deep Thinker', (i) => i % 7 === 0);
}

export function createConsistentJournaler(today) {
  // 3 per week
  return createWisdomPersona(today, 'Consistent Journaler', (i) => i % 7 < 3);
}

export function createShallowSpammer(today) {
  // Every day
  return createWisdomPersona(today, 'Shallow Spammer', () => true);
}

export function createOccasional(today) {
  // 1 per month
  return createWisdomPersona(today, 'Occasional', (i) => i % 30 === 0);
}

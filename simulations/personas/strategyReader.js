/**
 * simulations/personas/strategyReader.js
 */
import { makeDailyLogs, makeBookFinishedLog } from '../generators/logFactory.js';
import { makeStrategyQuests } from '../generators/questFactory.js';
import { subDays } from '../generators/dateUtils.js';

export function createStrategyReader(today, pagesPerDay, finishBookOnDay0 = false) {
  // Strategy expects 7 reading sessions a week while active
  const axisConfigs = [
    { axis: 'strategy', expectedPerWeek: 7, hasConsistencyTerm: true, paused: false }
  ];

  // They read every day for 30 days
  const logs = makeDailyLogs('strategy', 'reading_session', today, 29, () => true);

  // Maybe finish the book today (day 0)
  if (finishBookOnDay0) {
    logs.push(makeBookFinishedLog(today, 'strategy'));
  }

  const quests = makeStrategyQuests(finishBookOnDay0 ? 1 : 0);

  return { 
    logs, 
    quests, 
    axisConfigs, 
    name: `${pagesPerDay} pages/day (${finishBookOnDay0 ? 'Finished' : 'Unfinished'})`
  };
}

export function createStrategyQuestsSimulation(today, booksFinished) {
  // Configs
  const axisConfigs = [
    { axis: 'strategy', expectedPerWeek: 7, hasConsistencyTerm: true, paused: false }
  ];

  const logs = makeDailyLogs('strategy', 'reading_session', today, 29, () => true);
  for(let i=0; i<booksFinished; i++) {
    logs.push(makeBookFinishedLog(subDays(today, i), 'strategy'));
  }

  // Model variants
  const currentQuests = makeStrategyQuests(booksFinished); // V=100 if 1 book
  const optionAQuests = [
    { id: 'q-strategy-biography', axis: 'strategy', currentValue: booksFinished, targetValue: 1, done: booksFinished >= 1 }
    // Only one quest given, or one is 0. Let's say we just pass the split:
  ];
  
  return { logs, axisConfigs, currentQuests, optionAQuests };
}

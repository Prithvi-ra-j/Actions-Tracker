/**
 * simulations/generators/questFactory.js
 *
 * Utilities to generate quest configurations with seeded progress.
 */

export function makeQuest(id, axis, current, target, done = false) {
  // Enforce done constraint just like the real engine
  if (current >= target) done = true;
  return { id, axis, currentValue: current, targetValue: target, done };
}

export function makeStrategyQuests(booksFinishedCount) {
  const done = booksFinishedCount >= 1;
  return [
    makeQuest('q-strategy-biography', 'strategy', booksFinishedCount, 1, done),
    makeQuest('q-strategy-48laws', 'strategy', booksFinishedCount, 1, done),
  ];
}

export function makeKnowledgeQuests(booksFinished, journalEntries, outsideGoalWeight = 0.5) {
  // This simulates the derivation logic mapping for these specific quests
  return [
    makeQuest('q-knowledge-books', 'knowledge', booksFinished, 6),
    makeQuest('q-knowledge-commonplace', 'knowledge', journalEntries, 40)
  ];
}

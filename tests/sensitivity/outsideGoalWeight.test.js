/**
 * tests/sensitivity/outsideGoalWeight.test.js
 */
import { describe, it, expect } from 'vitest';
import { makeKnowledgeQuests } from '../../simulations/generators/questFactory.js';
import { calcVolume } from '../../src/helpers/statsEngine.js';

describe('Experiment 6: Outside-Goal Book Weighting', () => {
  it('calculates Knowledge Volume at different weights', () => {
    // Current model: q-knowledge-books expects 6 books. 
    // Wait, the quest logic for partial weight is usually applied before sending to questBoard,
    // or by manipulating the target vs current value.
    // If they read 6 goal books, currentValue=6, target=6 => 100%.
    // If they read 6 outside books at 50% weight, currentValue=3, target=6 => 50%.
    
    // Test just documents the result mathematically.
    const quests50 = makeKnowledgeQuests(3, 40); // 6 outside = 3 equivalent
    const v50 = calcVolume(quests50);
    
    const quests25 = makeKnowledgeQuests(1.5, 40); // 6 outside = 1.5 equivalent
    const v25 = calcVolume(quests25);

    expect(v50).toBeGreaterThan(v25);
  });
});

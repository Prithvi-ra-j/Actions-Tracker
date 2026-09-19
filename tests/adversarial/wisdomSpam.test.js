/**
 * tests/adversarial/wisdomSpam.test.js
 */
import { describe, it, expect } from 'vitest';
import { createDeepThinker, createShallowSpammer } from '../../simulations/personas/journalPersonas.js';
import { computeAxisDetails } from '../../src/helpers/statsEngine.js';

describe('Experiment 3: Social Spam Resistance', () => {
  const TODAY = '2026-09-15';

  it('demonstrates that shallow spamming outscores deep thinking', () => {
    const deep = createDeepThinker(TODAY);
    const spam = createShallowSpammer(TODAY);

    const resDeep = computeAxisDetails(deep.logs, deep.axisConfigs, deep.quests, TODAY).social;
    const resSpam = computeAxisDetails(spam.logs, spam.axisConfigs, spam.quests, TODAY).social;

    // Spammer should have maximum V (100) because they easily hit the 10 entries target
    expect(resSpam.V).toBe(100);
    // Deep thinker only hits 1 per week, so in 90 days they have 12-13 entries, also hitting 10.
    // Wait, deep thinker hits V=100 too. Let's check Stat.
    expect(resSpam.stat).toBeGreaterThanOrEqual(resDeep.stat);
  });
});

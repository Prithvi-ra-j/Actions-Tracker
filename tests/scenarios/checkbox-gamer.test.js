/**
 * tests/scenarios/checkbox-gamer.test.js
 *
 * Scenario: A user who games the system by checking boxes obsessively
 * without doing real work. Rapid-fire daily_checkbox logs every day.
 *
 * Questions we're answering:
 *   1. How high can discipline/creativity get from checkbox-only activity?
 *   2. Does the system correctly keep knowledge/body/social/strategy separate?
 *   3. What does the stat look like at 7/day vs 1/day?
 *   4. Does it ever exceed 99? (No — should be capped.)
 *
 * This is not intended to "fix" gaming — it's to DOCUMENT what gaming produces.
 */

import { describe, it, expect } from 'vitest';
import { computeAllStats, computeAxisDetails } from '../../src/helpers/statsEngine.js';

const TODAY = '2025-06-15';

function daysAgo(n) {
  const d = new Date(TODAY + 'T00:00:00');
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const AXIS_CONFIGS = [
  { axis: 'body',   expectedPerWeek: 4,    paused: false, hasConsistencyTerm: true },
  { axis: 'discipline', expectedPerWeek: 7,    paused: false, hasConsistencyTerm: true },
  { axis: 'knowledge',  expectedPerWeek: 7,    paused: false, hasConsistencyTerm: true },
  { axis: 'social',     expectedPerWeek: null, paused: false, hasConsistencyTerm: false },
  { axis: 'creativity', expectedPerWeek: 1,    paused: false, hasConsistencyTerm: true },
  { axis: 'strategy',   expectedPerWeek: 7,    paused: true,  hasConsistencyTerm: true },
];

// 90 days of checkbox spam: 7 discipline checkboxes per day
function buildCheckboxSpamLogs(perDay = 7) {
  const logs = [];
  for (let i = 0; i < 90; i++) {
    const date = daysAgo(i);
    for (let j = 0; j < perDay; j++) {
      logs.push({ id: crypto.randomUUID(), date, axis: 'discipline', type: 'daily_checkbox' });
    }
  }
  return logs;
}

// No quest progress — the gamer doesn't do real work
const NO_QUESTS = [];

describe('Checkbox gamer scenario', () => {
  describe('1 checkbox per day (normal cadence)', () => {
    const logs = buildCheckboxSpamLogs(1);
    const stats = computeAllStats(logs, AXIS_CONFIGS, NO_QUESTS, TODAY);
    const details = computeAxisDetails(logs, AXIS_CONFIGS, NO_QUESTS, TODAY);

    it('discipline stat is in [0, 99]', () => {
      expect(stats.discipline).toBeGreaterThanOrEqual(0);
      expect(stats.discipline).toBeLessThanOrEqual(99);
    });

    it('discipline C is near 100 (1/day fills expected since expected=(30/7)×7≈30/day)', () => {
      // 1 log/day × 90 days. In the 30-day window, ~29-30 logs land.
      // expected = (30/7)×7 ≈ 30. So C = 29/30 × 100 ≈ 96.7 or 30/30 × 100 = 100
      // Either way, near-perfect consistency.
      expect(details.discipline.C).toBeGreaterThan(95);
      expect(details.discipline.C).toBeLessThanOrEqual(100);
    });

    it('other axes are unaffected', () => {
      expect(stats.body).toBe(0);
      expect(stats.knowledge).toBe(0);
      expect(stats.social).toBe(0);
    });
  });

  describe('7 checkboxes per day (spam, 7× normal rate)', () => {
    const logs = buildCheckboxSpamLogs(7);
    const stats = computeAllStats(logs, AXIS_CONFIGS, NO_QUESTS, TODAY);
    const details = computeAxisDetails(logs, AXIS_CONFIGS, NO_QUESTS, TODAY);

    it('discipline stat is capped at 99', () => {
      // Even with 7× activity, stat is bounded by clamp
      expect(stats.discipline).toBeLessThanOrEqual(99);
    });

    it('discipline V is 0 (no quests)', () => {
      // Checkbox spam gives C and M but no V since no quests are set
      expect(details.discipline.V).toBe(0);
    });

    it('discipline C is 100 (way over expected cadence)', () => {
      expect(details.discipline.C).toBe(100);
    });

    it('body is untouched by discipline spam', () => {
      expect(stats.body).toBe(0);
    });

    it('knowledge is untouched by discipline spam', () => {
      expect(stats.knowledge).toBe(0);
    });
  });

  describe('Gaming with quest progress set manually', () => {
    // Gamer also manipulates quest progress to maximize V
    const spamLogs = buildCheckboxSpamLogs(7);
    const fakeQuests = [
      { id: 'q-discipline-days', axis: 'discipline', currentValue: 90, targetValue: 90, done: true },
    ];
    const stats = computeAllStats(spamLogs, AXIS_CONFIGS, fakeQuests, TODAY);
    const details = computeAxisDetails(spamLogs, AXIS_CONFIGS, fakeQuests, TODAY);

    it('stat is still capped at 99', () => {
      expect(stats.discipline).toBeLessThanOrEqual(99);
    });

    it('discipline V is 100 with completed quest', () => {
      expect(details.discipline.V).toBe(100);
    });

    it('documents maximum achievable discipline stat with full gaming', () => {
      // C=100, V=100, M≈+20 (spam gives high momentum)
      // Max = clamp(0.45×100 + 0.40×100 + 0.15×20, 0, 99) = clamp(88, 0, 99) = 88
      // (Note: M might be exactly +20 since recent>>prior — but recent=prior if spam is uniform)
      // Either way, must not exceed 99
      expect(stats.discipline).toBeLessThanOrEqual(99);
      expect(stats.discipline).toBeGreaterThan(50); // should be high
      // Document the actual value (informational):
      console.log(`[checkbox-gamer] Maximum gaming scenario discipline stat: ${stats.discipline}`);
    });
  });
});

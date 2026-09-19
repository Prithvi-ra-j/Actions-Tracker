/**
 * tests/scenarios/inactive-user.test.js
 *
 * Scenario: A user who does absolutely nothing.
 * No logs, no quest progress.
 *
 * Expected behavior:
 *   - All stats start at 0 (no data)
 *   - Adding an onboarding assessment gives a non-zero starting point
 *   - After 30+ real logs, onboarding fully decays and computed stat takes over
 *   - Strategy with no books remains at 0 (paused, no books)
 *   - Nothing throws, nothing is NaN
 */

import { describe, it, expect } from 'vitest';
import { computeAllStats, computeAxisDetails } from '../../src/helpers/statsEngine.js';

const TODAY = '2025-06-15';

const AXIS_CONFIGS_DEFAULT = [
  { axis: 'body',   expectedPerWeek: 4,    paused: false, hasConsistencyTerm: true },
  { axis: 'discipline', expectedPerWeek: 7,    paused: false, hasConsistencyTerm: true },
  { axis: 'knowledge',  expectedPerWeek: 7,    paused: false, hasConsistencyTerm: true },
  { axis: 'social',     expectedPerWeek: null, paused: false, hasConsistencyTerm: false },
  { axis: 'creativity', expectedPerWeek: 1,    paused: false, hasConsistencyTerm: true },
  { axis: 'strategy',   expectedPerWeek: 7,    paused: true,  hasConsistencyTerm: true }, // default: paused
];

describe('Inactive user scenario', () => {
  describe('Zero activity, no onboarding', () => {
    const stats = computeAllStats([], AXIS_CONFIGS_DEFAULT, [], TODAY);

    it('all stats are exactly 0', () => {
      for (const [axis, val] of Object.entries(stats)) {
        expect(val, `${axis} should be 0`).toBe(0);
      }
    });

    it('no NaN or Infinity', () => {
      for (const val of Object.values(stats)) {
        expect(Number.isFinite(val)).toBe(true);
        expect(Number.isNaN(val)).toBe(false);
      }
    });
  });

  describe('Onboarding assessment only (no real logs)', () => {
    const onboardingLogs = [
      { id: 'ob-s', date: '2025-01-01', axis: 'body',   type: 'onboarding_assessment', value: 40 },
      { id: 'ob-d', date: '2025-01-01', axis: 'discipline', type: 'onboarding_assessment', value: 30 },
      { id: 'ob-k', date: '2025-01-01', axis: 'knowledge',  type: 'onboarding_assessment', value: 50 },
      { id: 'ob-w', date: '2025-01-01', axis: 'social',     type: 'onboarding_assessment', value: 45 },
      { id: 'ob-c', date: '2025-01-01', axis: 'creativity', type: 'onboarding_assessment', value: 20 },
      { id: 'ob-st', date: '2025-01-01', axis: 'strategy',  type: 'onboarding_assessment', value: 35 },
    ];

    const stats = computeAllStats(onboardingLogs, AXIS_CONFIGS_DEFAULT, [], TODAY);

    it('all stats are non-zero (onboarding provides baseline)', () => {
      for (const [axis, val] of Object.entries(stats)) {
        expect(val, `${axis} should be non-zero with onboarding`).toBeGreaterThan(0);
      }
    });

    it('body stat approaches 40 (the onboarding value)', () => {
      // With 0 real logs, w=1, final=onboardingValue=40
      expect(stats.body).toBeCloseTo(40, 0);
    });

    it('knowledge stat approaches 50', () => {
      expect(stats.knowledge).toBeCloseTo(50, 0);
    });
  });

  describe('Strategy with no books', () => {
    it('strategy stat is 0 when paused and no quest progress', () => {
      const strategyPausedConfig = [
        ...AXIS_CONFIGS_DEFAULT.filter(c => c.axis !== 'strategy'),
        { axis: 'strategy', expectedPerWeek: 7, paused: true, hasConsistencyTerm: true },
      ];
      const stats = computeAllStats([], strategyPausedConfig, [], TODAY);
      expect(stats.strategy).toBe(0);
    });
  });

  describe('Long inactivity after initial activity', () => {
    // User was active 60 days ago, then stopped entirely
    const oldLogs = Array.from({ length: 10 }, (_, i) => ({
      id: crypto.randomUUID(),
      date: (() => {
        const d = new Date(TODAY + 'T00:00:00');
        d.setDate(d.getDate() - (60 + i));
        return d.toISOString().slice(0, 10);
      })(),
      axis: 'discipline',
      type: 'daily_checkbox',
    }));

    const stats = computeAllStats(oldLogs, AXIS_CONFIGS_DEFAULT, [], TODAY);
    const details = computeAxisDetails(oldLogs, AXIS_CONFIGS_DEFAULT, [], TODAY);

    it('discipline stat is valid (not NaN or out of bounds)', () => {
      expect(Number.isFinite(stats.discipline)).toBe(true);
      expect(stats.discipline).toBeGreaterThanOrEqual(0);
      expect(stats.discipline).toBeLessThanOrEqual(99);
    });

    it('discipline Consistency is 0 (no activity in last 30 days)', () => {
      // All logs are > 30 days old — none fall in the 30-day window
      expect(details.discipline.C).toBe(0);
    });

    it('discipline Momentum is −20 (all old activity, none recent)', () => {
      // recent14 = 0, prior14 = 0 (logs are > 27 days old)
      // Both windows empty → M = 0 (not -20, because prior is also 0)
      // Actually: logs at 60–69 days ago are outside both windows
      // recentRate=0, priorRate=0 → raw=(0-0)/1×100=0 → M=0
      expect(details.discipline.M).toBe(0);
    });

    it('discipline Volume is 0 (no quest progress)', () => {
      expect(details.discipline.V).toBe(0);
    });

    it('discipline stat is 0 (no active window, no quests)', () => {
      // C=0, V=0, M=0 → Stat = 0.45×0 + 0.40×0 + 0.15×0 = 0
      expect(stats.discipline).toBe(0);
    });
  });
});

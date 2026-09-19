/**
 * tests/unit/statEngine.test.js
 *
 * Unit tests for calcAxisStat() and computeAllStats() / computeAxisDetails().
 *
 * Formulas:
 *   Standard: Stat = clamp((0.45 × C) + (0.40 × V) + (0.15 × M), 0, 99)
 *   Social:   Stat = clamp((0.55 × V) + (0.45 × M), 0, 99)
 *   With onboarding blend:
 *     w = max(0, 1 − realLogCount / 30)
 *     final = (1−w) × computed + w × onboardingValue
 *
 * Source: src/helpers/statsEngine.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calcAxisStat,
  computeAllStats,
  computeAxisDetails,
} from '../../src/helpers/statsEngine.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = '2025-06-15';

function daysAgo(n) {
  const d = new Date(TODAY + 'T00:00:00');
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function makeLog(date, type = 'daily_checkbox', axis = 'discipline') {
  return { id: crypto.randomUUID(), date, type, axis };
}

function makeQuest(id, axis, currentValue, targetValue, done = false) {
  return { id, axis, currentValue, targetValue, done };
}

// Standard axis config (hasConsistencyTerm=true)
const standardConfig = { hasConsistencyTerm: true, expectedPerWeek: 7, paused: false };
const wisdomConfig   = { hasConsistencyTerm: false, expectedPerWeek: null, paused: false };

// Pre-built "complete" set of quests for all axes (all at 100%)
function allAxesQuests100() {
  return [
    makeQuest('q-body-sessions', 'body', 90, 90, true),
    makeQuest('q-body-benchmark', 'body', 1, 1, true),
    makeQuest('q-discipline-days', 'discipline', 90, 90, true),
    makeQuest('q-knowledge-books', 'knowledge', 6, 6, true),
    makeQuest('q-knowledge-commonplace', 'knowledge', 40, 40, true),
    makeQuest('q-social-meditations', 'social', 10, 10, true),
    makeQuest('q-creativity-sketchbook', 'creativity', 52, 52, true),
    makeQuest('q-creativity-masters', 'creativity', 4, 4, true),
    makeQuest('q-creativity-piece', 'creativity', 1, 1, true),
    makeQuest('q-strategy-biography', 'strategy', 1, 1, true),
    makeQuest('q-strategy-48laws', 'strategy', 1, 1, true),
  ];
}

// ── calcAxisStat ─────────────────────────────────────────────────────────────

describe('calcAxisStat', () => {
  describe('output bounds', () => {
    it('returns a value in [0, 99] for standard axis with no data', () => {
      const result = calcAxisStat('discipline', [], standardConfig, [], TODAY);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(99);
    });

    it('never exceeds 99 even with perfect data', () => {
      const logs = Array.from({ length: 30 }, (_, i) => makeLog(daysAgo(i)));
      const quests = [makeQuest('q', 'discipline', 90, 90, true)];
      const result = calcAxisStat('discipline', logs, standardConfig, quests, TODAY);
      expect(result).toBeLessThanOrEqual(99);
    });

    it('never goes below 0 even with all negative momentum', () => {
      // 10 logs in prior window, 0 in recent → M = −20
      const logs = Array.from({ length: 10 }, (_, i) => makeLog(daysAgo(14 + i)));
      const result = calcAxisStat('discipline', logs, standardConfig, [], TODAY);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Social exception (no Consistency term)', () => {
    it('uses Social formula (0.55V + 0.45M) not standard formula', () => {
      // We can't see inside the formula directly, but we can verify:
      // With V=100, M=0 → social should give 55 (not 0.40×100 = 40 from standard)
      const quests = [makeQuest('q-social-meditations', 'social', 10, 10, true)]; // V=100
      const result = calcAxisStat('social', [], wisdomConfig, quests, TODAY);
      // V=100, M=0 (no logs) → 0.55×100 + 0.45×0 = 55
      expect(result).toBeCloseTo(55, 0);
    });

    it('is unaffected by expectedPerWeek since there is no C term', () => {
      const quests = [makeQuest('q', 'social', 5, 10)]; // V=50
      const config1 = { ...wisdomConfig };
      const config2 = { ...wisdomConfig, expectedPerWeek: 7 }; // even if set, ignored
      const r1 = calcAxisStat('social', [], config1, quests, TODAY);
      const r2 = calcAxisStat('social', [], config2, quests, TODAY);
      expect(r1).toBeCloseTo(r2, 5);
    });
  });

  describe('standard formula weights', () => {
    it('applies correct weights: 0.45C + 0.40V + 0.15M', () => {
      // Create conditions where C≈100, V=0, M≈0
      // 30 logs in window → C ≈ 100
      // No quests → V = 0
      // Equal recent and prior → M = 0
      // But M=0 requires activity in both windows equally.
      // Simpler: test that result matches the formula manually with known values.

      // Let's set up:
      //   15 logs today = full recent window activity
      //   15 logs in prior window → M ≈ 0
      //   30 logs total in 30-day window → C ≈ 100
      //   No quests → V = 0

      const recentLogs = Array.from({ length: 7 }, (_, i) => makeLog(daysAgo(i)));
      const priorLogs  = Array.from({ length: 7 }, (_, i) => makeLog(daysAgo(14 + i)));
      const logs = [...recentLogs, ...priorLogs];

      // With expectedPerWeek=7: expected = (30/7)×7 = 30
      // completed = 14 (7 recent + 7 prior in 30-day window)
      // C = clamp(14/30 × 100, 0, 100) ≈ 46.7
      // V = 0
      // M: recent=7, prior=7 → raw = (7-7)/7×100 = 0

      // Stat ≈ 0.45×46.7 + 0.40×0 + 0.15×0 = 21.0
      const result = calcAxisStat('discipline', logs, standardConfig, [], TODAY);
      expect(result).toBeCloseTo(21, 0);
    });
  });

  describe('onboarding blend', () => {
    it('uses onboarding value when there are no real logs', () => {
      const onboardingLog = {
        ...makeLog(daysAgo(60)),
        type: 'onboarding_assessment',
        value: 70, // self-assessed at 70
        axis: 'discipline',
      };
      // No real logs → w = 1 → final = onboardingValue = 70
      const result = calcAxisStat('discipline', [onboardingLog], standardConfig, [], TODAY);
      expect(result).toBeCloseTo(70, 0);
    });

    it('ignores onboarding value when 30+ real logs exist (fully decayed)', () => {
      const onboardingLog = {
        ...makeLog(daysAgo(60)),
        type: 'onboarding_assessment',
        value: 99, // extremely high self-assessment
        axis: 'discipline',
      };
      // 30 real logs → w = 0 → onboarding fully decayed
      const realLogs = Array.from({ length: 30 }, (_, i) => makeLog(daysAgo(i)));
      const logs = [onboardingLog, ...realLogs];
      const result = calcAxisStat('discipline', logs, standardConfig, [], TODAY);
      // Should be computed stat, NOT 99
      expect(result).toBeLessThan(90); // with no quests and moderate activity, stat is modest
    });

    it('blends partially when realLogCount < 30', () => {
      const onboardingLog = {
        ...makeLog(daysAgo(60)),
        type: 'onboarding_assessment',
        value: 80,
        axis: 'discipline',
      };
      // 15 real logs → w = max(0, 1 − 15/30) = 0.5
      const realLogs = Array.from({ length: 15 }, (_, i) => makeLog(daysAgo(i)));
      const logs = [onboardingLog, ...realLogs];
      const result = calcAxisStat('discipline', logs, standardConfig, [], TODAY);
      // Should be somewhere between computed (low, no quests) and 80
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(80);
    });
  });
});

// ── computeAllStats ───────────────────────────────────────────────────────────

describe('computeAllStats', () => {
  it('returns all 6 axes', () => {
    const result = computeAllStats([], [], [], TODAY);
    expect(result).toHaveProperty('body');
    expect(result).toHaveProperty('discipline');
    expect(result).toHaveProperty('knowledge');
    expect(result).toHaveProperty('social');
    expect(result).toHaveProperty('creativity');
    expect(result).toHaveProperty('strategy');
  });

  it('returns 0 for all axes with no data', () => {
    const result = computeAllStats([], [], [], TODAY);
    for (const axis of ['body', 'discipline', 'knowledge', 'social', 'creativity', 'strategy']) {
      expect(result[axis]).toBe(0);
    }
  });

  it('returns values in [0, 99] for all axes', () => {
    const logs = Array.from({ length: 30 }, (_, i) =>
      ['body', 'discipline', 'knowledge', 'social', 'creativity', 'strategy'].map(axis =>
        makeLog(daysAgo(i), 'daily_checkbox', axis)
      )
    ).flat();

    const axisConfigs = [
      { axis: 'body',   expectedPerWeek: 4,    paused: false, hasConsistencyTerm: true },
      { axis: 'discipline', expectedPerWeek: 7,    paused: false, hasConsistencyTerm: true },
      { axis: 'knowledge',  expectedPerWeek: 7,    paused: false, hasConsistencyTerm: true },
      { axis: 'social',     expectedPerWeek: null, paused: false, hasConsistencyTerm: false },
      { axis: 'creativity', expectedPerWeek: 1,    paused: false, hasConsistencyTerm: true },
      { axis: 'strategy',   expectedPerWeek: 7,    paused: false, hasConsistencyTerm: true },
    ];

    const result = computeAllStats(logs, axisConfigs, allAxesQuests100(), TODAY);
    for (const axis of Object.keys(result)) {
      expect(result[axis]).toBeGreaterThanOrEqual(0);
      expect(result[axis]).toBeLessThanOrEqual(99);
    }
  });

  it('is deterministic — same inputs always produce same output', () => {
    const logs = [makeLog(daysAgo(3), 'gym_session', 'body')];
    const configs = [{ axis: 'body', expectedPerWeek: 4, paused: false, hasConsistencyTerm: true }];
    const quests = [makeQuest('q-body-sessions', 'body', 30, 90)];
    const r1 = computeAllStats(logs, configs, quests, TODAY);
    const r2 = computeAllStats(logs, configs, quests, TODAY);
    expect(r1).toEqual(r2);
  });

  it('uses default config when axis has no entry in axisConfigs', () => {
    // Empty axisConfigs — should fall back to default and not throw
    expect(() => computeAllStats([], [], [], TODAY)).not.toThrow();
  });
});

// ── computeAxisDetails ────────────────────────────────────────────────────────

describe('computeAxisDetails', () => {
  it('returns C, V, M, and stat for each axis', () => {
    const result = computeAxisDetails([], [], [], TODAY);
    for (const axis of ['body', 'discipline', 'knowledge', 'social', 'creativity', 'strategy']) {
      expect(result[axis]).toHaveProperty('V');
      expect(result[axis]).toHaveProperty('M');
      expect(result[axis]).toHaveProperty('stat');
      // C is present but may be null for Social
      expect(result[axis]).toHaveProperty('C');
    }
  });

  it('returns C=null for Social axis', () => {
    const wisdomAxisConfig = [{ axis: 'social', expectedPerWeek: null, paused: false, hasConsistencyTerm: false }];
    const result = computeAxisDetails([], wisdomAxisConfig, [], TODAY);
    expect(result.social.C).toBeNull();
  });

  it('stat in details matches computeAllStats for the same axis', () => {
    const logs = [makeLog(daysAgo(2), 'gym_session', 'body')];
    const configs = [{ axis: 'body', expectedPerWeek: 4, paused: false, hasConsistencyTerm: true }];
    const quests = [makeQuest('q-body-sessions', 'body', 30, 90)];

    const all = computeAllStats(logs, configs, quests, TODAY);
    const details = computeAxisDetails(logs, configs, quests, TODAY);
    expect(details.body.stat).toBeCloseTo(all.body, 5);
  });
});

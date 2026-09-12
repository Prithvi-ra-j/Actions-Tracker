/**
 * tests/unit/tiers.test.js
 *
 * Unit tests for getThresholdTitle() — RPG tier labels per axis.
 *
 * Tier boundaries (from statsEngine.js THRESHOLDS):
 *   strength:   Conditioning(0), Athletic(30), Beast(60), Elite(80)
 *   discipline: Inconsistent(0), Forming Habits(25), Disciplined(55), Iron Will(80)
 *   knowledge:  Reader(0), Student(25), Scholar(55), Polymath(80)
 *   wisdom:     Observant(0), Reflective(25), Discerning(55), Sage(80)
 *   creativity: Dormant(0), Exploring(25), Craftsman(55), Artist(80)
 *   strategy:   Student(0), Tactician(25), Strategist(55), Grand Strategist(80)
 *
 * Source: src/helpers/statsEngine.js
 */

import { describe, it, expect } from 'vitest';
import { getThresholdTitle } from '../../src/helpers/statsEngine.js';

// ── Helper ────────────────────────────────────────────────────────────────────

function tier(axis, value, expected) {
  return { axis, value, expected };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getThresholdTitle', () => {
  describe('strength', () => {
    const cases = [
      tier('strength',  0,  'Conditioning'),
      tier('strength',  1,  'Conditioning'),
      tier('strength', 29,  'Conditioning'),
      tier('strength', 30,  'Athletic'),
      tier('strength', 59,  'Athletic'),
      tier('strength', 60,  'Beast'),
      tier('strength', 79,  'Beast'),
      tier('strength', 80,  'Elite'),
      tier('strength', 99,  'Elite'),
    ];
    cases.forEach(({ axis, value, expected }) => {
      it(`returns "${expected}" for value=${value}`, () => {
        expect(getThresholdTitle(axis, value)).toBe(expected);
      });
    });
  });

  describe('discipline', () => {
    const cases = [
      tier('discipline',  0, 'Inconsistent'),
      tier('discipline', 24, 'Inconsistent'),
      tier('discipline', 25, 'Forming Habits'),
      tier('discipline', 54, 'Forming Habits'),
      tier('discipline', 55, 'Disciplined'),
      tier('discipline', 79, 'Disciplined'),
      tier('discipline', 80, 'Iron Will'),
      tier('discipline', 99, 'Iron Will'),
    ];
    cases.forEach(({ axis, value, expected }) => {
      it(`returns "${expected}" for value=${value}`, () => {
        expect(getThresholdTitle(axis, value)).toBe(expected);
      });
    });
  });

  describe('knowledge', () => {
    const cases = [
      tier('knowledge',  0, 'Reader'),
      tier('knowledge', 24, 'Reader'),
      tier('knowledge', 25, 'Student'),
      tier('knowledge', 54, 'Student'),
      tier('knowledge', 55, 'Scholar'),
      tier('knowledge', 79, 'Scholar'),
      tier('knowledge', 80, 'Polymath'),
      tier('knowledge', 99, 'Polymath'),
    ];
    cases.forEach(({ axis, value, expected }) => {
      it(`returns "${expected}" for value=${value}`, () => {
        expect(getThresholdTitle(axis, value)).toBe(expected);
      });
    });
  });

  describe('wisdom', () => {
    const cases = [
      tier('wisdom',  0, 'Observant'),
      tier('wisdom', 19, 'Observant'),
      tier('wisdom', 20, 'Reflective'),
      tier('wisdom', 39, 'Reflective'),
      tier('wisdom', 40, 'Discerning'),
      tier('wisdom', 54, 'Discerning'),
      tier('wisdom', 55, 'Sage'),
      tier('wisdom', 99, 'Sage'),
    ];
    cases.forEach(({ axis, value, expected }) => {
      it(`returns "${expected}" for value=${value}`, () => {
        expect(getThresholdTitle(axis, value)).toBe(expected);
      });
    });
  });

  describe('creativity', () => {
    const cases = [
      tier('creativity',  0, 'Dormant'),
      tier('creativity', 24, 'Dormant'),
      tier('creativity', 25, 'Exploring'),
      tier('creativity', 54, 'Exploring'),
      tier('creativity', 55, 'Craftsman'),
      tier('creativity', 79, 'Craftsman'),
      tier('creativity', 80, 'Artist'),
      tier('creativity', 99, 'Artist'),
    ];
    cases.forEach(({ axis, value, expected }) => {
      it(`returns "${expected}" for value=${value}`, () => {
        expect(getThresholdTitle(axis, value)).toBe(expected);
      });
    });
  });

  describe('strategy', () => {
    const cases = [
      tier('strategy',  0, 'Student'),
      tier('strategy', 24, 'Student'),
      tier('strategy', 25, 'Tactician'),
      tier('strategy', 54, 'Tactician'),
      tier('strategy', 55, 'Strategist'),
      tier('strategy', 79, 'Strategist'),
      tier('strategy', 80, 'Grand Strategist'),
      tier('strategy', 99, 'Grand Strategist'),
    ];
    cases.forEach(({ axis, value, expected }) => {
      it(`returns "${expected}" for value=${value}`, () => {
        expect(getThresholdTitle(axis, value)).toBe(expected);
      });
    });
  });

  describe('edge cases', () => {
    it('returns empty string for an unknown axis', () => {
      expect(getThresholdTitle('nonexistent', 50)).toBe('');
    });

    it('handles value=0 for all axes', () => {
      const axes = ['strength', 'discipline', 'knowledge', 'wisdom', 'creativity', 'strategy'];
      for (const axis of axes) {
        expect(getThresholdTitle(axis, 0)).toBeTruthy();
      }
    });

    it('handles value=99 for all axes', () => {
      const axes = ['strength', 'discipline', 'knowledge', 'wisdom', 'creativity', 'strategy'];
      for (const axis of axes) {
        expect(getThresholdTitle(axis, 99)).toBeTruthy();
      }
    });
  });
});

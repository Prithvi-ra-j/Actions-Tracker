/**
 * tests/unit/volume.test.js
 *
 * Unit tests for calcVolume() — the Volume (V) component.
 * Formula: V = clamp( mean(min(currentValue/targetValue, 1.0) for each quest) × 100, 0, 100 )
 * Source: src/helpers/statsEngine.js
 */

import { describe, it, expect } from 'vitest';
import { calcVolume } from '../../src/helpers/statsEngine.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function quest(id, currentValue, targetValue, done = false) {
  return { id, currentValue, targetValue, done, axis: 'strength' };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('calcVolume', () => {
  it('returns 0 for empty quest array', () => {
    expect(calcVolume([])).toBe(0);
  });

  it('returns 0 for null/undefined quests', () => {
    expect(calcVolume(null)).toBe(0);
    expect(calcVolume(undefined)).toBe(0);
  });

  it('returns 0 when all quests have zero progress', () => {
    const quests = [quest('a', 0, 90), quest('b', 0, 10)];
    expect(calcVolume(quests)).toBe(0);
  });

  it('returns 100 when all quests are done', () => {
    const quests = [
      quest('a', 90, 90, true),
      quest('b', 10, 10, true),
    ];
    expect(calcVolume(quests)).toBe(100);
  });

  it('returns 50 for single quest at 50% progress', () => {
    expect(calcVolume([quest('a', 45, 90)])).toBeCloseTo(50, 1);
  });

  it('returns 100 for single quest at exactly 100% progress (not done flag)', () => {
    // currentValue === targetValue without done=true — still counts as 1.0
    expect(calcVolume([quest('a', 90, 90)])).toBeCloseTo(100, 1);
  });

  it('caps single quest at 100 even when currentValue exceeds targetValue', () => {
    // progress = min(120/90, 1.0) = 1.0 → V = 100
    expect(calcVolume([quest('a', 120, 90)])).toBe(100);
  });

  it('averages across multiple quests', () => {
    const quests = [
      quest('a', 90, 90, true),  // 100%
      quest('b', 0,  90),        // 0%
    ];
    // mean = (1.0 + 0.0) / 2 = 0.5 → V = 50
    expect(calcVolume(quests)).toBeCloseTo(50, 1);
  });

  it('handles a mix of done and in-progress quests', () => {
    const quests = [
      quest('a', 90, 90, true),  // done → 1.0
      quest('b', 45, 90),        // 0.5
      quest('c', 0,  10),        // 0.0
    ];
    // mean = (1.0 + 0.5 + 0.0) / 3 ≈ 0.5 → V = 50
    expect(calcVolume(quests)).toBeCloseTo(50, 1);
  });

  it('uses max(targetValue, 1) to avoid division by zero', () => {
    // If targetValue=0, denominator becomes max(0,1)=1
    const quests = [quest('a', 5, 0)];
    // progress = min(5/1, 1.0) = 1.0 → V = 100
    expect(calcVolume(quests)).toBe(100);
  });

  it('handles outside-goal book weighting correctly via quest currentValue', () => {
    // The 0.5 weight for outside_goals is applied at quest derivation time
    // (questBoardRepository.deriveQuestValue), not here.
    // Here we just confirm fractional currentValues work.
    const quests = [quest('q-knowledge-books', 0.5, 6)]; // half-weight book
    expect(calcVolume(quests)).toBeCloseTo((0.5 / 6) * 100, 1);
  });

  it('output is always between 0 and 100', () => {
    expect(calcVolume([quest('a', 0, 90)])).toBeGreaterThanOrEqual(0);
    expect(calcVolume([quest('a', 0, 90)])).toBeLessThanOrEqual(100);
    expect(calcVolume([quest('a', 999, 90)])).toBeLessThanOrEqual(100);
  });
});

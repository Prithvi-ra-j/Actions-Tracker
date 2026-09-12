/**
 * tests/unit/questDerivation.test.js
 *
 * Unit tests for deriveQuestValue() — the pure quest progress derivation function.
 *
 * This function is the single source of truth for how log entries map to
 * quest progress. It is already exported from questBoardRepository.js, making
 * it directly testable without any database.
 *
 * Source: src/database/questBoardRepository.js
 */

import { describe, it, expect } from 'vitest';
import { deriveQuestValue } from '../../src/database/questBoardRepository.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(axis, type, meta = {}) {
  return { id: crypto.randomUUID(), axis, type, date: '2025-06-15', meta };
}

function quest(id, axis = 'strength') {
  return { id, axis, targetValue: 1, currentValue: 0, done: false };
}

// ── Strength ──────────────────────────────────────────────────────────────────

describe('deriveQuestValue — q-strength-sessions', () => {
  const q = quest('q-strength-sessions', 'strength');

  it('returns 0 with no logs', () => {
    expect(deriveQuestValue(q, [])).toBe(0);
  });

  it('counts gym_session logs on the strength axis', () => {
    const logs = [
      log('strength', 'gym_session'),
      log('strength', 'gym_session'),
    ];
    expect(deriveQuestValue(q, logs)).toBe(2);
  });

  it('ignores non-gym_session logs', () => {
    const logs = [log('strength', 'daily_checkbox'), log('strength', 'journal_entry')];
    expect(deriveQuestValue(q, logs)).toBe(0);
  });

  it('ignores gym_session logs on other axes', () => {
    const logs = [log('discipline', 'gym_session')];
    expect(deriveQuestValue(q, logs)).toBe(0);
  });
});

describe('deriveQuestValue — q-strength-benchmark', () => {
  const q = quest('q-strength-benchmark', 'strength');

  it('returns 0 with no benchmark attempts', () => {
    expect(deriveQuestValue(q, [log('strength', 'gym_session')])).toBe(0);
  });

  it('returns 1 when any gym_session has isBenchmarkAttempt=true', () => {
    const logs = [
      log('strength', 'gym_session', { isBenchmarkAttempt: true }),
    ];
    expect(deriveQuestValue(q, logs)).toBe(1);
  });

  it('remains 1 even with multiple benchmark attempts (capped at 1)', () => {
    const logs = [
      log('strength', 'gym_session', { isBenchmarkAttempt: true }),
      log('strength', 'gym_session', { isBenchmarkAttempt: true }),
    ];
    expect(deriveQuestValue(q, logs)).toBe(1);
  });
});

// ── Discipline ────────────────────────────────────────────────────────────────

describe('deriveQuestValue — q-discipline-days', () => {
  const q = quest('q-discipline-days', 'discipline');

  it('returns 0 with no logs', () => {
    expect(deriveQuestValue(q, [])).toBe(0);
  });

  it('counts daily_checkbox logs on discipline axis', () => {
    const logs = [
      log('discipline', 'daily_checkbox'),
      log('discipline', 'daily_checkbox'),
      log('discipline', 'daily_checkbox'),
    ];
    expect(deriveQuestValue(q, logs)).toBe(3);
  });

  it('does not count non-discipline logs', () => {
    const logs = [log('strength', 'daily_checkbox')];
    expect(deriveQuestValue(q, logs)).toBe(0);
  });
});

// ── Knowledge ─────────────────────────────────────────────────────────────────

describe('deriveQuestValue — q-knowledge-books', () => {
  const q = quest('q-knowledge-books', 'knowledge');

  it('returns 0 with no finished books', () => {
    expect(deriveQuestValue(q, [])).toBe(0);
  });

  it('counts a full-weight book as 1.0', () => {
    const logs = [log('knowledge', 'book_finished', { weight: 1.0 })];
    expect(deriveQuestValue(q, logs)).toBeCloseTo(1.0, 5);
  });

  it('counts an outside-goal book as 0.5', () => {
    const logs = [log('knowledge', 'book_finished', { weight: 0.5 })];
    expect(deriveQuestValue(q, logs)).toBeCloseTo(0.5, 5);
  });

  it('defaults to weight 1.0 when meta.weight is missing', () => {
    const logs = [log('knowledge', 'book_finished')]; // no weight in meta
    expect(deriveQuestValue(q, logs)).toBeCloseTo(1.0, 5);
  });

  it('sums weights across multiple books correctly', () => {
    const logs = [
      log('knowledge', 'book_finished', { weight: 1.0 }),
      log('knowledge', 'book_finished', { weight: 0.5 }),
      log('knowledge', 'book_finished', { weight: 1.0 }),
    ];
    expect(deriveQuestValue(q, logs)).toBeCloseTo(2.5, 5);
  });

  it('does not count book_finished on other axes', () => {
    const logs = [log('strategy', 'book_finished', { weight: 1.0 })];
    expect(deriveQuestValue(q, logs)).toBe(0);
  });
});

describe('deriveQuestValue — q-knowledge-commonplace', () => {
  const q = quest('q-knowledge-commonplace', 'knowledge');

  it('counts journal_entry logs on knowledge axis', () => {
    const logs = [
      log('knowledge', 'journal_entry'),
      log('knowledge', 'journal_entry'),
    ];
    expect(deriveQuestValue(q, logs)).toBe(2);
  });

  it('does not count other log types', () => {
    const logs = [log('knowledge', 'daily_checkbox')];
    expect(deriveQuestValue(q, logs)).toBe(0);
  });
});

// ── Wisdom ────────────────────────────────────────────────────────────────────

describe('deriveQuestValue — q-wisdom-journal', () => {
  const q = quest('q-wisdom-journal', 'wisdom');

  it('sums evidence weights correctly', () => {
    const logs = [
      log('wisdom', 'journal_entry'),    // +1
      log('wisdom', 'reflection'),       // +3
      log('wisdom', 'behavior_change'),  // +5
      log('wisdom', 'journal_entry'),    // +1
    ];
    expect(deriveQuestValue(q, logs)).toBe(10);
  });

  it('does not count knowledge journal_entry logs', () => {
    const logs = [log('knowledge', 'journal_entry')];
    expect(deriveQuestValue(q, logs)).toBe(0);
  });
});

// ── Creativity ────────────────────────────────────────────────────────────────

describe('deriveQuestValue — q-creativity-sketchbook', () => {
  const q = quest('q-creativity-sketchbook', 'creativity');

  it('counts daily_checkbox logs on creativity axis', () => {
    const logs = [log('creativity', 'daily_checkbox'), log('creativity', 'daily_checkbox')];
    expect(deriveQuestValue(q, logs)).toBe(2);
  });
});

describe('deriveQuestValue — q-creativity-masters', () => {
  const q = quest('q-creativity-masters', 'creativity');

  it('counts master_copy logs on creativity axis', () => {
    const logs = [log('creativity', 'master_copy'), log('creativity', 'master_copy')];
    expect(deriveQuestValue(q, logs)).toBe(2);
  });
});

describe('deriveQuestValue — q-creativity-piece', () => {
  const q = quest('q-creativity-piece', 'creativity');

  it('counts finished_piece logs on creativity axis', () => {
    const logs = [log('creativity', 'finished_piece')];
    expect(deriveQuestValue(q, logs)).toBe(1);
  });
});

// ── Strategy ──────────────────────────────────────────────────────────────────

describe('deriveQuestValue — q-strategy-reading', () => {
  const reading = quest('q-strategy-reading', 'strategy');

  it('returns 0 with no finished strategy books', () => {
    expect(deriveQuestValue(reading, [])).toBe(0);
  });

  it('sums weights of finished strategy books', () => {
    const logs = [
      log('strategy', 'book_finished', { weight: 1.0 }),
      log('strategy', 'book_finished', { weight: 0.5 })
    ];
    expect(deriveQuestValue(reading, logs)).toBe(1.5);
  });
});

// ── Unknown quest ─────────────────────────────────────────────────────────────

describe('deriveQuestValue — unknown quest id', () => {
  it('returns 0 for an unknown quest id', () => {
    const q = quest('q-nonexistent-quest', 'strength');
    expect(deriveQuestValue(q, [log('strength', 'gym_session')])).toBe(0);
  });
});

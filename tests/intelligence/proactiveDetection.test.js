import { describe, expect, it } from 'vitest';
import { detectProactiveSignals } from '../../src/core/ai/proactiveDetectors.js';

describe('proactive intelligence', () => {
  it('surfaces deterministic early-warning signals from evidence gaps', () => {
    const signals = detectProactiveSignals({
      goals: [{ id: 'g1', title: 'Goal', status: 'active', progress: 0.1, targetProgress: 1 }],
      facts: [],
      occurrences: [
        { id: 'o1', status: 'missed' },
        { id: 'o2', status: 'missed' },
      ],
    });
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every(signal => signal.confidence !== undefined)).toBe(true);
  });
});

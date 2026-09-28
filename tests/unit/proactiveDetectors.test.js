import { describe, expect, it } from 'vitest';
import { detectGoalStagnation, detectMissedHabits, detectEvidenceGap } from '../../src/core/ai/proactiveDetectors.js';

describe('deterministic proactive detectors', () => {
  it('detects active goals without recent supporting evidence', () => {
    const signals = detectGoalStagnation([
      { id: 'g1', title: 'German', status: 'active', progress: 0.2, targetProgress: 1 },
    ], [], { now: new Date('2026-09-28T12:00:00') });
    expect(signals[0]).toMatchObject({ type: 'goal_stagnation', domain: 'general' });
  });

  it('detects repeated explicit habit misses without treating unknown as missed', () => {
    const signals = detectMissedHabits([
      { id: '1', status: 'missed' },
      { id: '2', status: 'missed' },
      { id: '3', status: 'unknown' },
    ]);
    expect(signals).toHaveLength(1);
    expect(signals[0].evidence.missedCount).toBe(2);
  });

  it('detects evidence gaps from low confidence and coverage', () => {
    const signals = detectEvidenceGap({
      body: { confidence: 0.2, coverage: 0.1 },
      knowledge: { confidence: 0.8, coverage: 0.9 },
    });
    expect(signals.map(item => item.domain)).toEqual(['body']);
  });
});

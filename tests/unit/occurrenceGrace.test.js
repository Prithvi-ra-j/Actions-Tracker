import { describe, expect, it } from 'vitest';
import { getGracePrompt, getGraceState } from '../../src/core/occurrenceEngine.js';

describe('occurrence grace window', () => {
  it('keeps the first two days neutral', () => {
    expect(getGraceState('2026-09-18', '2026-09-19').state).toBe('grace_day_one');
    expect(getGraceState('2026-09-18', '2026-09-20').state).toBe('grace_day_two');
  });

  it('expires after the two-day window', () => {
    expect(getGraceState('2026-09-17', '2026-09-20').state).toBe('grace_expired');
  });

  it('returns the required user prompts for each grace state', () => {
    expect(getGracePrompt('expected', 'grace_day_one')).toContain('You still have today');
    expect(getGracePrompt('expected', 'grace_day_two')).toContain('Tomorrow is the day that matters');
    expect(getGracePrompt('unknown', 'grace_expired')).toContain('What is getting in the way');
    expect(getGracePrompt('completed', 'grace_expired')).toBeNull();
  });
});

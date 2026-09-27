import { describe, expect, it } from 'vitest';
import {
  ONBOARDING_STEPS,
  createInitialOnboardingState,
  normalizeOnboardingState,
  onboardingProgress,
} from '../../src/core/onboarding/onboardingState.js';
import { advanceOnboarding, activateOnboarding } from '../../src/core/onboarding/onboardingEngine.js';

describe('onboarding state machine', () => {
  it('starts at intro and has deterministic ordered steps', () => {
    const state = createInitialOnboardingState();
    expect(state.step).toBe('intro');
    expect(ONBOARDING_STEPS).toEqual([
      'intro', 'story', 'current_state', 'direction', 'routine',
      'constraints', 'baseline', 'confirmation', 'calibrating', 'active',
    ]);
  });

  it('persists an answer while advancing exactly one step', () => {
    const state = createInitialOnboardingState();
    const next = advanceOnboarding(state, { answer: 'I want a clearer daily system.' });
    expect(next.step).toBe('story');
    expect(next.answers.intro).toBe('I want a clearer daily system.');
    expect(next.completedSteps).toContain('intro');
  });

  it('normalizes corrupted state without losing valid answers', () => {
    const state = normalizeOnboardingState({
      step: 'not-a-step',
      answers: { story: 'valid' },
      completedSteps: ['story', 'bad'],
    });
    expect(state.step).toBe('intro');
    expect(state.answers.story).toBe('valid');
    expect(state.completedSteps).toEqual(['story']);
    expect(state.schemaVersion).toBe(1);
  });

  it('reports bounded progress', () => {
    expect(onboardingProgress({ step: 'story' }).percent).toBeGreaterThan(0);
    expect(onboardingProgress({ step: 'confirmation' }).percent).toBe(75);
  });

  it('activates only after the confirmation boundary', () => {
    const active = activateOnboarding({ step: 'calibrating', status: 'in_progress' });
    expect(active.step).toBe('active');
    expect(active.status).toBe('active');
    expect(active.completedAt).toEqual(expect.any(String));
  });
});

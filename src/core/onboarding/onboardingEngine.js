import {
  ONBOARDING_STEPS,
  createInitialOnboardingState,
  normalizeOnboardingState,
  nextOnboardingStep,
} from './onboardingState.js';

export function advanceOnboarding(state, { answer, step } = {}) {
  const current = normalizeOnboardingState(state);
  const activeStep = step && ONBOARDING_STEPS.includes(step) ? step : current.step;
  const next = nextOnboardingStep(activeStep);
  const answerText = typeof answer === 'string' ? answer.trim() : '';

  return {
    ...current,
    step: next,
    answers: answerText ? { ...current.answers, [activeStep]: answerText } : current.answers,
    completedSteps: [...new Set([...current.completedSteps, activeStep])],
    updatedAt: new Date().toISOString(),
  };
}

export function beginOnboarding() {
  return createInitialOnboardingState();
}

export function confirmOnboarding(state, confirmed = true) {
  const current = normalizeOnboardingState(state);
  if (!confirmed) return current;
  return {
    ...current,
    step: 'calibrating',
    status: 'in_progress',
    completedSteps: [...new Set([...current.completedSteps, 'confirmation'])],
    updatedAt: new Date().toISOString(),
  };
}

export function activateOnboarding(state) {
  const current = normalizeOnboardingState(state);
  return {
    ...current,
    step: 'active',
    status: 'active',
    completedSteps: [...new Set([...current.completedSteps, 'calibrating', 'active'])],
    completedAt: current.completedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

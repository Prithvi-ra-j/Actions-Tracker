export const ONBOARDING_STEPS = Object.freeze([
  'intro',
  'story',
  'current_state',
  'direction',
  'routine',
  'constraints',
  'baseline',
  'confirmation',
  'calibrating',
  'active',
]);

export const STEP_LABELS = Object.freeze({
  intro: 'Welcome',
  story: 'Story',
  current_state: 'Reality',
  direction: 'Direction',
  routine: 'Routine',
  constraints: 'Constraints',
  baseline: 'Baseline',
  confirmation: 'Review',
  calibrating: 'Calibrating',
  active: 'Active',
});

export function createInitialOnboardingState() {
  return {
    schemaVersion: 1,
    status: 'in_progress',
    step: 'intro',
    answers: {},
    completedSteps: [],
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };
}

export function normalizeOnboardingState(value) {
  const base = createInitialOnboardingState();
  if (!value || typeof value !== 'object') return base;
  const step = ONBOARDING_STEPS.includes(value.step) ? value.step : base.step;
  const completedSteps = Array.isArray(value.completedSteps)
    ? value.completedSteps.filter(item => ONBOARDING_STEPS.includes(item))
    : [];
  return {
    ...base,
    ...value,
    schemaVersion: 1,
    step,
    status: value.status === 'active' ? 'active' : 'in_progress',
    answers: value.answers && typeof value.answers === 'object' ? value.answers : {},
    completedSteps: [...new Set(completedSteps)],
    startedAt: value.startedAt || base.startedAt,
    updatedAt: new Date().toISOString(),
    completedAt: value.completedAt || null,
  };
}

export function nextOnboardingStep(step) {
  const index = ONBOARDING_STEPS.indexOf(step);
  if (index < 0 || index >= ONBOARDING_STEPS.length - 1) return 'active';
  return ONBOARDING_STEPS[index + 1];
}

export function onboardingProgress(state) {
  const normalized = normalizeOnboardingState(state);
  const index = ONBOARDING_STEPS.indexOf(normalized.step);
  return {
    currentIndex: Math.max(0, index),
    total: ONBOARDING_STEPS.length - 2,
    label: STEP_LABELS[normalized.step] || 'Welcome',
    percent: Math.round((Math.min(index, ONBOARDING_STEPS.length - 2) / (ONBOARDING_STEPS.length - 2)) * 100),
  };
}

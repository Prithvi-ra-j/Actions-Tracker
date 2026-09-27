import { getSelfModel, updateSelfModel } from '../../database/selfModelRepository.js';
import { normalizeOnboardingState } from './onboardingState.js';

export async function getOnboardingState() {
  const model = await getSelfModel();
  return normalizeOnboardingState(model.onboarding);
}

export async function saveOnboardingState(state) {
  const normalized = normalizeOnboardingState(state);
  await updateSelfModel({ onboarding: normalized });
  return normalized;
}

export async function recordOnboardingAnswer(state, step, answer) {
  const next = {
    ...normalizeOnboardingState(state),
    answers: {
      ...normalizeOnboardingState(state).answers,
      [step]: typeof answer === 'string' ? answer.trim() : answer,
    },
    updatedAt: new Date().toISOString(),
  };
  return saveOnboardingState(next);
}

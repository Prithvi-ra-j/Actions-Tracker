import { STEP_LABELS } from './onboardingState.js';

export const ONBOARDING_QUESTIONS = Object.freeze({
  intro: {
    title: 'Let’s build this around your real life.',
    prompt: 'What would make using Actions feel genuinely useful to you?',
    hint: 'There is no right answer. Start wherever feels natural.',
    field: 'intro',
  },
  story: {
    title: 'Tell me what you are trying to change.',
    prompt: 'What are you trying to change, improve, or become better at right now?',
    hint: 'You can mention more than one thing.',
    field: 'story',
  },
  current_state: {
    title: 'What is reality like today?',
    prompt: 'What is going well, and what is currently getting in your way?',
    hint: 'Think about your actual week, not an ideal week.',
    field: 'currentState',
  },
  direction: {
    title: 'Where do you want this to go?',
    prompt: 'If the next few months went well, what would be meaningfully different?',
    hint: 'Describe the outcome in your own words.',
    field: 'direction',
  },
  routine: {
    title: 'What does a normal week look like?',
    prompt: 'What routines, commitments, or activities already take up your time?',
    hint: 'Include things you want to protect, not just things you want to add.',
    field: 'routine',
  },
  constraints: {
    title: 'What should the system respect?',
    prompt: 'What constraints should I never ignore when suggesting changes?',
    hint: 'Time, energy, schedule, preferences, responsibilities, or anything else.',
    field: 'constraints',
  },
  baseline: {
    title: 'Where are you starting from?',
    prompt: 'What useful starting signals do you already know about yourself?',
    hint: 'Numbers are optional. “I run twice a week” is enough.',
    field: 'baseline',
  },
  confirmation: {
    title: 'Here is what I understand so far.',
    prompt: 'Review the summary and tell me what is wrong, missing, or important to change.',
    hint: 'Nothing is committed until you confirm.',
    field: 'confirmation',
  },
});

export function getOnboardingQuestion(step) {
  return ONBOARDING_QUESTIONS[step] || {
    title: STEP_LABELS[step] || 'Onboarding',
    prompt: 'Tell me anything that would help me understand your situation.',
    hint: '',
    field: step,
  };
}

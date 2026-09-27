export const SCORING_CONTRACT_VERSION = '1.1';

export const SCORE_AXES = Object.freeze([
  'body',
  'discipline',
  'knowledge',
  'social',
  'creativity',
  'strategy',
]);

export const DISCIPLINE_CONTRACT = Object.freeze({
  contractVersion: SCORING_CONTRACT_VERSION,
  axis: 'discipline',
  signals: ['consistency', 'commitment_completion', 'routine_adherence', 'recovery'],
  explanation: 'Why did this number change?',
  explainability: 'Why did this number change?',
  description: 'Measures how reliably intention becomes action and how effectively the user recovers from misses.',
  formula: 'completion rate + recovery + routine continuity - disruption',
});

export const BODY_CONTRACT = Object.freeze({
  contractVersion: SCORING_CONTRACT_VERSION,
  axis: 'body',
  signals: ['training_volume', 'recovery', 'consistency', 'readiness'],
  explanation: 'Why did this number change?',
  explainability: 'Why did this number change?',
  description: 'Measures physical output, recovery, and consistency.',
  formula: 'training + recovery + consistency weighted by constraints',
});

export const KNOWLEDGE_CONTRACT = Object.freeze({
  contractVersion: SCORING_CONTRACT_VERSION,
  axis: 'knowledge',
  signals: ['learning_depth', 'application', 'retention', 'synthesis'],
  explanation: 'Why did this number change?',
  explainability: 'Why did this number change?',
  description: 'Measures learning depth, retention, and applied understanding.',
  formula: 'depth + application + synthesis',
});

export const SOCIAL_CONTRACT = Object.freeze({
  contractVersion: SCORING_CONTRACT_VERSION,
  axis: 'social',
  signals: ['connection_frequency', 'quality', 'initiative', 'repair'],
  explanation: 'Why did this number change?',
  explainability: 'Why did this number change?',
  description: 'Measures relationship maintenance, social effort, and recovery from friction.',
  formula: 'quality + consistency + repair - friction',
});

export const CREATIVITY_CONTRACT = Object.freeze({
  contractVersion: SCORING_CONTRACT_VERSION,
  axis: 'creativity',
  signals: ['practice', 'production', 'iteration', 'completion'],
  explanation: 'Why did this number change?',
  explainability: 'Why did this number change?',
  description: 'Measures how often creative work is practised, finished, and refined.',
  formula: 'practice + finished work + iteration',
});

export const STRATEGY_CONTRACT = Object.freeze({
  contractVersion: SCORING_CONTRACT_VERSION,
  axis: 'strategy',
  signals: ['planning', 'decision_quality', 'review_behavior', 'experiments'],
  explanation: 'Why did this number change?',
  explainability: 'Why did this number change?',
  description: 'Measures decision quality, planning effectiveness, and learning from outcomes.',
  formula: 'decision quality + planning + review + experimentation',
});

export const SCORING_CONTRACTS = Object.freeze({
  body: BODY_CONTRACT,
  discipline: DISCIPLINE_CONTRACT,
  knowledge: KNOWLEDGE_CONTRACT,
  social: SOCIAL_CONTRACT,
  creativity: CREATIVITY_CONTRACT,
  strategy: STRATEGY_CONTRACT,
});

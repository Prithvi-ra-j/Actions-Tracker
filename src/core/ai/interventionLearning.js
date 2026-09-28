export const INTERVENTION_RESULTS = Object.freeze(['positive', 'neutral', 'negative', 'inconclusive']);

const DAY_MS = 86400000;

function deriveOutcomeDueAt(startedAt, outcomeWindowDays) {
  const startMs = Date.parse(startedAt);
  if (!Number.isFinite(startMs)) return null;
  return new Date(startMs + Math.max(1, Math.floor(outcomeWindowDays)) * DAY_MS).toISOString();
}

export function createIntervention({
  id = `intervention_${Date.now()}`,
  recommendationId = null,
  hypothesis,
  context = {},
  expectedOutcome = null,
  measurement = null,
  outcomeWindowDays = 14,
  proposedAt = new Date().toISOString(),
} = {}) {
  if (!hypothesis) throw new Error('Intervention hypothesis is required');
  const normalizedWindowDays = Math.max(1, Math.floor(outcomeWindowDays));
  return {
    id,
    schemaVersion: 2,
    recommendationId,
    hypothesis,
    context,
    expectedOutcome,
    measurement,
    outcomeWindowDays: normalizedWindowDays,
    outcomeWindowStartedAt: proposedAt,
    outcomeDueAt: deriveOutcomeDueAt(proposedAt, normalizedWindowDays),
    status: 'active',
    proposedAt,
    completedAt: null,
  };
}

export function evaluateIntervention({
  baseline,
  outcome,
  expected,
  higherIsBetter = true,
  minEffect = 0,
} = {}) {
  const b = Number(baseline);
  const o = Number(outcome);
  const e = Number(expected);
  if (![b, o, e].every(Number.isFinite)) return { result: 'inconclusive', effect: null, confidence: 0 };

  const effect = o - b;
  const directionalEffect = higherIsBetter ? effect : -effect;
  const expectedDirection = higherIsBetter ? e - b : b - e;
  const meetsExpectation = directionalEffect >= Math.max(minEffect, expectedDirection);
  const confidence = Math.max(0, Math.min(1, Math.min(1, Math.abs(effect) / Math.max(1, Math.abs(expectedDirection || 1)))));
  return {
    result: meetsExpectation ? 'positive' : directionalEffect < 0 ? 'negative' : 'neutral',
    effect,
    expectedEffect: expectedDirection,
    confidence: Math.round(confidence * 100) / 100,
  };
}

export function closeIntervention(intervention, evaluation, completedAt = new Date().toISOString()) {
  return {
    ...intervention,
    status: 'completed',
    completedAt,
    evaluation: {
      result: evaluation?.result || 'inconclusive',
      effect: evaluation?.effect ?? null,
      expectedEffect: evaluation?.expectedEffect ?? null,
      confidence: evaluation?.confidence ?? 0,
    },
  };
}

export function summarizeInterventionLearning(interventions = []) {
  const completed = interventions.filter(item => item?.status === 'completed' && item?.evaluation);
  const positive = completed.filter(item => item.evaluation.result === 'positive');
  const negative = completed.filter(item => item.evaluation.result === 'negative');
  const byRecommendationType = new Map();

  for (const item of completed) {
    const key = item.context?.recommendationType || 'unknown';
    const entry = byRecommendationType.get(key) || { completed: 0, positive: 0, negative: 0, neutral: 0, inconclusive: 0, effects: [] };
    entry.completed += 1;
    entry[item.evaluation.result] = (entry[item.evaluation.result] || 0) + 1;
    if (Number.isFinite(item.evaluation.effect)) entry.effects.push(Number(item.evaluation.effect));
    byRecommendationType.set(key, entry);
  }

  const typeLearning = Object.fromEntries([...byRecommendationType.entries()].map(([type, entry]) => [
    type,
    {
      ...entry,
      positiveRate: entry.completed ? entry.positive / entry.completed : 0,
      averageEffect: entry.effects.length
        ? entry.effects.reduce((sum, value) => sum + value, 0) / entry.effects.length
        : null,
    },
  ]));

  return {
    totalCompleted: completed.length,
    positiveCount: positive.length,
    negativeCount: negative.length,
    overallPositiveRate: completed.length ? positive.length / completed.length : 0,
    typeLearning,
  };
}

export function applyInterventionLearning(score, recommendationType, learning = {}) {
  const entry = learning?.typeLearning?.[recommendationType];
  if (!entry || entry.completed < 2) return score;
  const adjustment = (entry.positiveRate - entry.negative / Math.max(1, entry.completed)) * 10;
  return Math.max(0, Math.min(100, Number(score || 0) + adjustment));
}

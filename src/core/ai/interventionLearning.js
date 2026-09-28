export const INTERVENTION_RESULTS = Object.freeze(['positive', 'neutral', 'negative', 'inconclusive']);

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
  return {
    id,
    schemaVersion: 1,
    recommendationId,
    hypothesis,
    context,
    expectedOutcome,
    measurement,
    outcomeWindowDays: Math.max(1, Math.floor(outcomeWindowDays)),
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

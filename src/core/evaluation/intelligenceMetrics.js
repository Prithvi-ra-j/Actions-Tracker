import { calculateDecisionOutcomeRate } from '../interventions/decisionOutcome.js';
import { calculateEffectiveness } from '../interventions/interventionEffectiveness.js';

export function evaluateIntelligence({ recommendations = [], interventions = [], groundedClaims = [], contradictions = [] } = {}) {
  const decision = calculateDecisionOutcomeRate(recommendations);
  const effectiveness = calculateEffectiveness(interventions);
  const grounded = groundedClaims.length
    ? groundedClaims.filter(c => c?.provenance?.evidenceIds?.length).length / groundedClaims.length
    : null;
  const contradictionRate = contradictions.length
    ? contradictions.filter(c => c?.status === 'conflicted' || c?.resolution === 'ask_user').length / contradictions.length
    : 0;
  return {
    decisionOutcomeRate: decision.rate,
    recommendation: decision,
    interventionEffectiveness: effectiveness,
    groundingRate: grounded,
    contradictionHandlingRate: contradictionRate,
    generatedAt: new Date().toISOString(),
  };
}

export function compareIntelligenceEvaluations(previous, current) {
  const delta = (key) => {
    const a = Number(previous?.[key]);
    const b = Number(current?.[key]);
    return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) * 1000) / 1000 : null;
  };
  return {
    decisionOutcomeRateDelta: delta('decisionOutcomeRate'),
    groundingRateDelta: delta('groundingRate'),
  };
}

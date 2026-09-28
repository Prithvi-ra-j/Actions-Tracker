import { calculateEffectiveness } from './interventionEffectiveness.js';

export function rankInterventions(candidates = [], history = []) {
  const effectiveness = calculateEffectiveness(history);
  return candidates.map(candidate => {
    const key = candidate.interventionType || candidate.recommendationType || 'unknown';
    const learning = effectiveness[key];
    const historicalSuccess = learning?.successRate ?? 0.5;
    const confidence = learning?.confidence ?? 0;
    const score = Number(candidate.baseScore || candidate.score || 0) +
      (historicalSuccess - 0.5) * 20 * confidence;
    return {
      ...candidate,
      score: Math.round(score * 100) / 100,
      interventionLearning: learning || null,
    };
  }).sort((a, b) => b.score - a.score);
}

export function shouldReuseIntervention(interventionLearning, { minSamples = 3, minSuccessRate = 0.6 } = {}) {
  return Boolean(
    interventionLearning &&
    interventionLearning.sampleSize >= minSamples &&
    interventionLearning.successRate >= minSuccessRate &&
    interventionLearning.confidence >= 0.35
  );
}

/**
 * Social Engine (§6.5 Social, §18 Social / Interpersonal Architecture).
 *
 * The Social domain measures communication and interpersonal capability.
 * Signals: interpersonal experiments, observations.
 *
 * Engine ID:      socialEngine
 * Engine Version: 1.0
 */

const ENGINE_ID      = 'socialEngine';
const ENGINE_VERSION = '1.0';

// Weights for Social signals (version 1.0)
const SIGNAL_WEIGHTS = Object.freeze({
  interaction: 0.40,
  reflection:  0.30,
  outcome:     0.30,
});

/**
 * Collects social signals from facts.
 *
 * @param {{ facts: object[] }} input
 * @returns {object[]} — signal objects: { signal, value, unit, confidence, supportingIds }
 */
export function collectSignals({ facts = [] }) {
  if (!facts || facts.length === 0) return [];
  const signals = [];

  // Interaction signal
  const interactionFacts = facts.filter(f => f.type === 'social.interaction');
  if (interactionFacts.length > 0) {
    let score = 0;
    for (const f of interactionFacts) {
      if (typeof f.value === 'number') score += f.value;
      else if (f.value?.score) score += f.value.score;
    }
    signals.push({
      signal: 'social.interaction',
      value: Math.min(100, (score / interactionFacts.length)),
      unit: 'score',
      confidence: 1.0,
      supportingIds: interactionFacts.map(f => f.id)
    });
  }

  // Reflection signal
  const reflectionFacts = facts.filter(f => f.type === 'social.reflection');
  if (reflectionFacts.length > 0) {
    let score = 0;
    for (const f of reflectionFacts) {
      if (typeof f.value === 'number') score += f.value;
      else if (f.value?.score) score += f.value.score;
    }
    signals.push({
      signal: 'social.reflection',
      value: Math.min(100, (score / reflectionFacts.length)),
      unit: 'score',
      confidence: 1.0,
      supportingIds: reflectionFacts.map(f => f.id)
    });
  }

  // Outcome signal
  const outcomeFacts = facts.filter(f => f.type === 'social.outcome');
  if (outcomeFacts.length > 0) {
    let score = 0;
    for (const f of outcomeFacts) {
      if (typeof f.value === 'number') score += f.value;
      else if (f.value?.score) score += f.value.score;
    }
    signals.push({
      signal: 'social.outcome',
      value: Math.min(100, (score / outcomeFacts.length)),
      unit: 'score',
      confidence: 1.0,
      supportingIds: outcomeFacts.map(f => f.id)
    });
  }

  return signals;
}

/**
 * Calculates a ScoreProjection from social signals.
 */
export function calculateScore(signals, period) {
  if (!signals || signals.length === 0) {
    return _lowCoverageProjection(period);
  }

  let totalScore = 0;
  let totalWeight = 0;
  let minConfidence = 1.0;
  const components = [];

  for (const s of signals) {
    let weight = 0;
    if (s.signal === 'social.interaction') weight = SIGNAL_WEIGHTS.interaction;
    else if (s.signal === 'social.reflection') weight = SIGNAL_WEIGHTS.reflection;
    else if (s.signal === 'social.outcome') weight = SIGNAL_WEIGHTS.outcome;

    if (weight > 0) {
      totalScore += s.value * weight;
      totalWeight += weight;
      if (s.confidence < minConfidence) minConfidence = s.confidence;

      components.push({
        signal: s.signal,
        value: s.value,
        weight,
        contribution: s.value * weight,
      });
    }
  }

  if (totalWeight === 0) return _lowCoverageProjection(period);

  const finalScore = (totalScore / totalWeight);
  const value = Math.min(99, Math.max(0, Math.round(finalScore)));
  const confidence = minConfidence * totalWeight; 

  return {
    domain: 'social',
    value,
    confidence,
    coverage: totalWeight,
    period,
    components,
    methodology: {
      engine: ENGINE_ID,
      version: ENGINE_VERSION,
    },
    supportingEvidenceIds: [],
    warnings: [],
  };
}

/**
 * Explains the social score.
 */
export function explain(scoreProjection, breakdown = null) {
  const { value, confidence, coverage, warnings } = scoreProjection;

  const headline = value >= 80
    ? 'High interpersonal focus — actively experimenting and observing social dynamics.'
    : value >= 50
    ? 'Moderate interpersonal focus — some experimentation or observation present.'
    : value > 0
    ? 'Low interpersonal focus — minimal deliberate social observation logged.'
    : 'Insufficient data to assess social domain.';

  return {
    headline,
    detail: 'Score reflects the volume of social experiments and recorded observations.',
    coverage: `${Math.round(coverage * 100)}% of expected signals present.`,
    confidence: `Confidence: ${Math.round(confidence * 100)}%.`,
    warnings: warnings ?? [],
  };
}

export function detectPatterns(signals) {
  const patterns = [];
  if (!signals) return patterns;
  const reflection = signals.find(s => s.signal === 'social.reflection');
  const interaction = signals.find(s => s.signal === 'social.interaction');
  if (reflection && interaction && reflection.value > 80 && interaction.value < 20) {
    patterns.push({
      type: 'over_reflection',
      description: 'You are reflecting heavily on social interactions but not actually interacting.',
      severity: 'medium'
    });
  }
  return patterns;
}

export function recommendNextActions(context) {
  const { score, patterns } = context || {};
  const recommendations = [];
  if (!score || score.value === 0) {
    return [{
      action: 'Run one deliberate social experiment and record the outcome.',
      rationale: 'No social evidence exists yet.',
      priority: 'high',
    }];
  }
  if (patterns?.some(pattern => pattern.type === 'over_reflection')) {
    recommendations.push({
      action: 'Replace one reflection block with a real conversation or experiment.',
      rationale: 'Reflection is outpacing direct social behavior.',
      priority: 'medium',
    });
  }
  return recommendations;
}

function _lowCoverageProjection(period) {
  return {
    domain: 'social',
    value: 0,
    confidence: 0,
    coverage: 0,
    period,
    components: [],
    methodology: { engine: ENGINE_ID, version: ENGINE_VERSION },
    supportingEvidenceIds: [],
    warnings: ['low_coverage: no usable social data in this period'],
  };
}

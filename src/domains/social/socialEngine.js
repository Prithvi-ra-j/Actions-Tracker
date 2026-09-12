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
  experimentation: 0.60,
  observation:     0.40,
});

/**
 * Collects social signals from facts.
 *
 * @param {{ facts: object[] }} input
 * @returns {object[]} — signal objects: { signal, value, unit, confidence, supportingIds }
 */
export function collectSignals({ facts = [] }) {
  if (!facts || facts.length === 0) return [];

  const experimentFacts = facts.filter(f => f.type === 'social.experiment.logged');
  
  const signals = [];

  if (experimentFacts.length > 0) {
    // Experimentation signal: running social experiments is a high-level skill
    // Baseline: 1 experiment per week = 100 score
    const expValue = Math.min(100, (experimentFacts.length / 1) * 100);
    signals.push({
      signal: 'social.experimentation',
      value: expValue,
      unit: 'score',
      confidence: 1.0,
      supportingIds: experimentFacts.map(f => f.id),
    });

    // Observation signal: recording outcomes and conclusions
    let observationCount = 0;
    for (const f of experimentFacts) {
      if (f.value?.observations?.length > 0 || f.value?.conclusion) {
        observationCount++;
      }
    }
    
    // Baseline: 1 detailed observation per week
    const obsValue = Math.min(100, (observationCount / 1) * 100);
    signals.push({
      signal: 'social.observation',
      value: obsValue,
      unit: 'score',
      confidence: experimentFacts.length > 0 ? 1.0 : 0.5,
      supportingIds: experimentFacts.filter(f => f.value?.observations?.length > 0 || f.value?.conclusion).map(f => f.id),
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
    if (s.signal === 'social.experimentation') weight = SIGNAL_WEIGHTS.experimentation;
    else if (s.signal === 'social.observation') weight = SIGNAL_WEIGHTS.observation;

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

export function detectPatterns(evidence) {
  return [];
}

export function recommendNextActions(context) {
  return [];
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

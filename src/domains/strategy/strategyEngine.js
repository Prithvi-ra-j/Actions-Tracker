/**
 * Strategy Engine (§6.3 Strategy, §16 Strategy Architecture).
 *
 * The Strategy domain measures the ability to reason, plan, decide,
 * anticipate and produce outcomes.
 *
 * Signals: planning accuracy, decision logged, outcome quality.
 *
 * Engine ID:      strategyEngine
 * Engine Version: 1.0
 */

const ENGINE_ID      = 'strategyEngine';
const ENGINE_VERSION = '1.0';

// Weights for Strategy signals (version 1.0)
const SIGNAL_WEIGHTS = Object.freeze({
  decision_volume:  0.20,
  outcome_accuracy: 0.80,
});

/**
 * Collects strategy signals from facts.
 *
 * @param {{ facts: object[] }} input
 * @returns {object[]} — signal objects: { signal, value, unit, confidence, supportingIds }
 */
export function collectSignals({ facts = [] }) {
  if (!facts || facts.length === 0) return [];

  const decisionFacts = facts.filter(f => f.type === 'strategy.decision.logged');
  // Look for evaluations of past decisions (which we can model as system.evaluation facts)
  // or just look at decisions that have actualOutcome filled.
  
  const signals = [];

  if (decisionFacts.length > 0) {
    // Decision Volume: logging decisions is good strategy practice.
    // Cap at say, 2 per week.
    const volumeValue = Math.min(100, (decisionFacts.length / 2) * 100);
    signals.push({
      signal: 'strategy.decision_volume',
      value: volumeValue,
      unit: 'score',
      confidence: 1.0,
      supportingIds: decisionFacts.map(f => f.id),
    });

    // Outcome Accuracy: requires decisions with actualOutcome vs expectedOutcome
    // For now, baseline is 50 unless we have explicit evaluation facts.
    // If they have decisions but no evaluations, confidence in outcome accuracy is low.
    let evaluatedCount = 0;
    let accuracySum = 0;
    
    for (const f of decisionFacts) {
      if (f.value?.accuracy) {
        evaluatedCount++;
        accuracySum += f.value.accuracy;
      }
    }

    if (evaluatedCount > 0) {
      signals.push({
        signal: 'strategy.outcome_accuracy',
        value: accuracySum / evaluatedCount, // assume accuracy is 0-100
        unit: 'score',
        confidence: evaluatedCount / decisionFacts.length,
        supportingIds: decisionFacts.filter(f => f.value?.accuracy).map(f => f.id),
      });
    }
  }

  return signals;
}

/**
 * Calculates a ScoreProjection from strategy signals.
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
    if (s.signal === 'strategy.decision_volume') weight = SIGNAL_WEIGHTS.decision_volume;
    else if (s.signal === 'strategy.outcome_accuracy') weight = SIGNAL_WEIGHTS.outcome_accuracy;

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
    domain: 'strategy',
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
 * Explains the strategy score.
 */
export function explain(scoreProjection, breakdown = null) {
  const { value, confidence, coverage, warnings } = scoreProjection;

  const headline = value >= 80
    ? 'High strategic clarity — decisions are well-reasoned and outcomes align with predictions.'
    : value >= 50
    ? 'Moderate strategic clarity — reasoning is sound but outcomes are mixed or untracked.'
    : value > 0
    ? 'Low strategic clarity — lacking deliberate decision tracking or poor prediction accuracy.'
    : 'Insufficient data to assess strategy domain.';

  return {
    headline,
    detail: 'Score reflects decision logging volume and the accuracy of predicted outcomes.',
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
    domain: 'strategy',
    value: 0,
    confidence: 0,
    coverage: 0,
    period,
    components: [],
    methodology: { engine: ENGINE_ID, version: ENGINE_VERSION },
    supportingEvidenceIds: [],
    warnings: ['low_coverage: no usable strategy data in this period'],
  };
}

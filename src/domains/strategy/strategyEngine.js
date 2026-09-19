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
  decision_volume:  0.15,
  outcome_accuracy: 0.25,
  financial:        0.15,
  planning:         0.15,
  risk:             0.15,
  leadership:       0.15
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

  // Financial signal
  const financialFacts = facts.filter(f => f.type === 'strategy.financial');
  if (financialFacts.length > 0) {
    let score = 0;
    for (const f of financialFacts) {
      if (typeof f.value === 'number') score += f.value;
      else if (f.value?.score) score += f.value.score;
    }
    signals.push({
      signal: 'strategy.financial',
      value: Math.min(100, (score / financialFacts.length)),
      unit: 'score',
      confidence: financialFacts.length >= 1 ? 1.0 : 0.5,
      supportingIds: financialFacts.map(f => f.id)
    });
  }

  // Planning signal
  const planningFacts = facts.filter(f => f.type === 'strategy.planning');
  if (planningFacts.length > 0) {
    let score = 0;
    for (const f of planningFacts) {
      if (typeof f.value === 'number') score += f.value;
      else if (f.value?.score) score += f.value.score;
    }
    signals.push({
      signal: 'strategy.planning',
      value: Math.min(100, (score / planningFacts.length)),
      unit: 'score',
      confidence: planningFacts.length >= 1 ? 1.0 : 0.5,
      supportingIds: planningFacts.map(f => f.id)
    });
  }

  // Risk signal
  const riskFacts = facts.filter(f => f.type === 'strategy.risk');
  if (riskFacts.length > 0) {
    let score = 0;
    for (const f of riskFacts) {
      if (typeof f.value === 'number') score += f.value;
      else if (f.value?.score) score += f.value.score;
    }
    signals.push({
      signal: 'strategy.risk',
      value: Math.min(100, (score / riskFacts.length)),
      unit: 'score',
      confidence: riskFacts.length >= 1 ? 1.0 : 0.5,
      supportingIds: riskFacts.map(f => f.id)
    });
  }

  // Leadership signal
  const leadershipFacts = facts.filter(f => f.type === 'strategy.leadership');
  if (leadershipFacts.length > 0) {
    let score = 0;
    for (const f of leadershipFacts) {
      if (typeof f.value === 'number') score += f.value;
      else if (f.value?.score) score += f.value.score;
    }
    signals.push({
      signal: 'strategy.leadership',
      value: Math.min(100, (score / leadershipFacts.length)),
      unit: 'score',
      confidence: leadershipFacts.length >= 1 ? 1.0 : 0.5,
      supportingIds: leadershipFacts.map(f => f.id)
    });
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
    else if (s.signal === 'strategy.financial') weight = SIGNAL_WEIGHTS.financial;
    else if (s.signal === 'strategy.planning') weight = SIGNAL_WEIGHTS.planning;
    else if (s.signal === 'strategy.risk') weight = SIGNAL_WEIGHTS.risk;
    else if (s.signal === 'strategy.leadership') weight = SIGNAL_WEIGHTS.leadership;

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

export function detectPatterns(signals) {
  const patterns = [];
  if (!signals) return patterns;
  const planning = signals.find(s => s.signal === 'strategy.planning');
  const outcome = signals.find(s => s.signal === 'strategy.outcome_accuracy');
  if (planning && outcome && planning.value > 70 && outcome.value < 30) {
    patterns.push({
      type: 'poor_execution',
      description: 'You are planning well but outcomes are missing expectations.',
      severity: 'medium'
    });
  }
  return patterns;
}

export function recommendNextActions(context) {
  const { score, patterns } = context || {};
  if (!score || score.value === 0) {
    return [{
      action: 'Log one decision with a prediction and a review date.',
      rationale: 'No strategic evidence exists yet.',
      priority: 'high',
    }];
  }
  if (patterns?.some(pattern => pattern.type === 'poor_execution')) {
    return [{
      action: 'Review the last failed prediction and name the assumption that broke.',
      rationale: 'Planning quality is not translating into accurate outcomes.',
      priority: 'high',
    }];
  }
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

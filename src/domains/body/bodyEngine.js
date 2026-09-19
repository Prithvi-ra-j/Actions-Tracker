/**
 * Body Engine (§6.1 Body, §21 Domain Engine Architecture).
 *
 * The Body domain measures physical capability and health-supporting behavior.
 * Signals: activity, training, sleep, consistency, body composition.
 *
 * Engine ID:      bodyEngine
 * Engine Version: 1.0
 */

const ENGINE_ID      = 'bodyEngine';
const ENGINE_VERSION = '1.0';

// Weights for Body signals (version 1.0)
const SIGNAL_WEIGHTS = Object.freeze({
  activity: 0.20,
  training: 0.30,
  recovery: 0.20,
  progression: 0.15,
  performance: 0.15
});

/**
 * Collects body signals from facts.
 *
 * @param {{ facts: object[] }} input
 * @returns {object[]} — signal objects: { signal, value, unit, confidence, supportingIds }
 */
export function collectSignals({ facts = [] }) {
  if (!facts || facts.length === 0) return [];

  const activityFacts = facts.filter(f => f.type === 'body.activity.steps');
  const trainingFacts = facts.filter(f => f.type === 'body.training.session');
  const recoveryFacts = facts.filter(f => f.type === 'body.recovery.sleep');

  const signals = [];

  // Activity signal (e.g., scoring steps against a 10,000 threshold)
  if (activityFacts.length > 0) {
    let totalSteps = 0;
    for (const f of activityFacts) {
      if (typeof f.value === 'number') totalSteps += f.value;
      else if (f.value?.amount) totalSteps += f.value.amount;
    }
    const days = new Set(activityFacts.map(f => f.localDate)).size;
    const avgSteps = days > 0 ? totalSteps / days : 0;
    // Cap at 10,000 for score calculation
    const activityValue = Math.min(100, (avgSteps / 10000) * 100);

    signals.push({
      signal: 'body.activity',
      value: activityValue,
      unit: 'score',
      confidence: days / 7, // Approximate confidence based on a 7-day window
      supportingIds: activityFacts.map(f => f.id),
      breakdown: { avgSteps, days },
    });
  }

  // Training signal
  if (trainingFacts.length > 0) {
    const days = new Set(trainingFacts.map(f => f.localDate)).size;
    // Assume 3 sessions per week is optimal
    const trainingValue = Math.min(100, (days / 3) * 100);

    signals.push({
      signal: 'body.training',
      value: trainingValue,
      unit: 'score',
      confidence: 1.0, 
      supportingIds: trainingFacts.map(f => f.id),
      breakdown: { sessions: trainingFacts.length, days },
    });
  }

  // Recovery signal
  if (recoveryFacts.length > 0) {
    let totalHours = 0;
    for (const f of recoveryFacts) {
      if (typeof f.value === 'number') totalHours += f.value;
      else if (f.value?.amount) totalHours += f.value.amount;
    }
    const days = new Set(recoveryFacts.map(f => f.localDate)).size;
    const avgHours = days > 0 ? totalHours / days : 0;
    // Target 8 hours
    const recoveryValue = Math.min(100, (avgHours / 8) * 100);

    signals.push({
      signal: 'body.recovery',
      value: recoveryValue,
      unit: 'score',
      confidence: days / 7,
      supportingIds: recoveryFacts.map(f => f.id),
      breakdown: { avgHours, days },
    });
  }

  // Progression signal
  const progressionFacts = facts.filter(f => f.type === 'body.progression');
  if (progressionFacts.length > 0) {
    let score = 0;
    for (const f of progressionFacts) {
      if (typeof f.value === 'number') score += f.value;
      else if (f.value?.score) score += f.value.score;
    }
    const val = Math.min(100, (score / progressionFacts.length));
    signals.push({
      signal: 'body.progression',
      value: val,
      unit: 'score',
      confidence: progressionFacts.length >= 2 ? 1.0 : 0.5,
      supportingIds: progressionFacts.map(f => f.id)
    });
  }

  // Performance signal
  const performanceFacts = facts.filter(f => f.type === 'body.performance');
  if (performanceFacts.length > 0) {
    let score = 0;
    for (const f of performanceFacts) {
      if (typeof f.value === 'number') score += f.value;
      else if (f.value?.score) score += f.value.score;
    }
    const val = Math.min(100, (score / performanceFacts.length));
    signals.push({
      signal: 'body.performance',
      value: val,
      unit: 'score',
      confidence: performanceFacts.length >= 1 ? 1.0 : 0.5,
      supportingIds: performanceFacts.map(f => f.id)
    });
  }

  return signals;
}

/**
 * Calculates a ScoreProjection from body signals.
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
    if (s.signal === 'body.activity') weight = SIGNAL_WEIGHTS.activity;
    else if (s.signal === 'body.training') weight = SIGNAL_WEIGHTS.training;
    else if (s.signal === 'body.recovery') weight = SIGNAL_WEIGHTS.recovery;
    else if (s.signal === 'body.progression') weight = SIGNAL_WEIGHTS.progression;
    else if (s.signal === 'body.performance') weight = SIGNAL_WEIGHTS.performance;

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

  // Normalize if not all signal types were present
  const finalScore = (totalScore / totalWeight);
  const value = Math.min(99, Math.max(0, Math.round(finalScore)));
  const confidence = minConfidence * totalWeight; // Penalize confidence if missing major signals

  const warnings = [];
  if (confidence < 0.3) warnings.push('low_coverage: insufficient data for reliable body score');
  if (totalWeight < 0.9) warnings.push('partial_data: missing one or more key body signals (activity, training, recovery)');

  return {
    domain: 'body',
    value,
    confidence,
    coverage: totalWeight, // Approximation of data coverage
    period,
    components,
    methodology: {
      engine: ENGINE_ID,
      version: ENGINE_VERSION,
    },
    supportingEvidenceIds: [],
    warnings,
  };
}

/**
 * Explains the body score.
 */
export function explain(scoreProjection, breakdown = null) {
  const { value, confidence, coverage, warnings } = scoreProjection;

  const headline = value >= 80
    ? 'Strong physical capability — activity, training, and recovery are balanced.'
    : value >= 50
    ? 'Moderate physical state — consistent behavior but room for optimization.'
    : value > 0
    ? 'Low physical state — gaps in activity, training, or recovery.'
    : 'Insufficient data to assess body domain.';

  return {
    headline,
    detail: 'Score reflects daily steps, training frequency, and sleep duration.',
    coverage: `${Math.round(coverage * 100)}% of expected signals present.`,
    confidence: `Confidence: ${Math.round(confidence * 100)}%.`,
    warnings: warnings ?? [],
  };
}

export function detectPatterns(signals) {
  const patterns = [];
  if (!signals) return patterns;
  const training = signals.find(s => s.signal === 'body.training');
  const recovery = signals.find(s => s.signal === 'body.recovery');
  if (training && recovery && training.value > 80 && recovery.value < 40) {
    patterns.push({
      type: 'high_training_low_recovery',
      description: 'You are training hard but not recovering adequately, risking burnout or injury.',
      severity: 'high'
    });
  }
  return patterns;
}

export function recommendNextActions(context) {
  const { score, patterns } = context || {};
  if (!score || score.value === 0) {
    return [{
      action: 'Log one training session and one recovery measure this week.',
      rationale: 'No body evidence exists yet.',
      priority: 'high',
    }];
  }
  if (patterns?.some(pattern => pattern.type === 'high_training_low_recovery')) {
    return [{
      action: 'Reduce training intensity temporarily and record sleep or recovery quality.',
      rationale: 'Training load is high while recovery evidence is low.',
      priority: 'high',
    }];
  }
  return [];
}

function _lowCoverageProjection(period) {
  return {
    domain: 'body',
    value: 0,
    confidence: 0,
    coverage: 0,
    period,
    components: [],
    methodology: { engine: ENGINE_ID, version: ENGINE_VERSION },
    supportingEvidenceIds: [],
    warnings: ['low_coverage: no usable body data in this period'],
  };
}

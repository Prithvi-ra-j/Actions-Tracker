/**
 * Creativity Engine (§6.4 Creativity, §17 Creativity Architecture).
 *
 * The Creativity domain measures development of creative capability and production.
 * Signals: practice minutes, skills practiced, outputs (creative_work), quality.
 *
 * Engine ID:      creativityEngine
 * Engine Version: 1.0
 */

const ENGINE_ID      = 'creativityEngine';
const ENGINE_VERSION = '1.0';

// Weights for Creativity signals (version 1.0)
const SIGNAL_WEIGHTS = Object.freeze({
  practice: 0.40,
  output:   0.60,
});

/**
 * Collects creativity signals from facts.
 *
 * @param {{ facts: object[] }} input
 * @returns {object[]} — signal objects: { signal, value, unit, confidence, supportingIds }
 */
export function collectSignals({ facts = [] }) {
  if (!facts || facts.length === 0) return [];

  const workFacts = facts.filter(f => f.type === 'creativity.work.logged');
  
  const signals = [];

  if (workFacts.length > 0) {
    // Practice signal
    let totalMinutes = 0;
    for (const f of workFacts) {
      if (f.value?.practiceMinutes) {
        totalMinutes += f.value.practiceMinutes;
      }
    }
    
    // Baseline: 120 minutes per week = 100 score
    const practiceValue = Math.min(100, (totalMinutes / 120) * 100);
    signals.push({
      signal: 'creativity.practice',
      value: practiceValue,
      unit: 'score',
      confidence: 1.0,
      supportingIds: workFacts.filter(f => f.value?.practiceMinutes).map(f => f.id),
    });

    // Output/Quality signal
    let totalQuality = 0;
    let qualityCount = 0;
    let outputCount = 0;

    for (const f of workFacts) {
      outputCount++;
      if (f.value?.qualityAssessment?.self) {
        totalQuality += f.value.qualityAssessment.self;
        qualityCount++;
      }
    }

    // Baseline: 2 outputs per week
    const volumeScore = Math.min(100, (outputCount / 2) * 100);
    // Average quality (if recorded, out of 10) mapped to 100
    const qualityScore = qualityCount > 0 ? (totalQuality / qualityCount) * 10 : 50; 
    
    // Output score is a mix of volume and quality
    const outputValue = (volumeScore * 0.4) + (qualityScore * 0.6);

    signals.push({
      signal: 'creativity.output',
      value: outputValue,
      unit: 'score',
      confidence: qualityCount > 0 ? 1.0 : 0.5, // lower confidence if no quality assessments
      supportingIds: workFacts.map(f => f.id),
    });
  }

  return signals;
}

/**
 * Calculates a ScoreProjection from creativity signals.
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
    if (s.signal === 'creativity.practice') weight = SIGNAL_WEIGHTS.practice;
    else if (s.signal === 'creativity.output') weight = SIGNAL_WEIGHTS.output;

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
    domain: 'creativity',
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
 * Explains the creativity score.
 */
export function explain(scoreProjection, breakdown = null) {
  const { value, confidence, coverage, warnings } = scoreProjection;

  const headline = value >= 80
    ? 'Strong creative production — practicing consistently and producing high-quality work.'
    : value >= 50
    ? 'Moderate creative output — either practicing without producing, or producing without deliberate practice.'
    : value > 0
    ? 'Low creative output — minimal practice or production logged.'
    : 'Insufficient data to assess creativity domain.';

  return {
    headline,
    detail: 'Score reflects practice minutes and the volume/quality of creative outputs.',
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
    domain: 'creativity',
    value: 0,
    confidence: 0,
    coverage: 0,
    period,
    components: [],
    methodology: { engine: ENGINE_ID, version: ENGINE_VERSION },
    supportingEvidenceIds: [],
    warnings: ['low_coverage: no usable creativity data in this period'],
  };
}

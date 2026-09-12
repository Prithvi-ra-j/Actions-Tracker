/**
 * Discipline Engine (§24 Discipline Engine, §21 Domain Engine Architecture).
 *
 * Discipline is not a domain — it is cross-cutting.
 * It measures how reliably intention becomes action:
 *
 *   Discipline = Reliability(Intentions → Expected Actions → Actual Actions)
 *
 * The engine must distinguish:
 *   - not done        (missed)
 *   - data unavailable (unknown)
 *   - legitimately excused (excused)
 *
 * INVARIANT: 'unknown' is NEVER treated as 'missed'.
 * A sync gap that prevents evaluation must not penalize the score.
 *
 * Pure functions — no DB calls, no React.
 * Wire DB reads in the scoring layer (Phase 6).
 *
 * Engine ID:      disciplineEngine
 * Engine Version: 1.0
 *
 * Formula (version 1.0):
 *   rate = completed / (expected - excused - unknown)
 *   confidence = known_count / expected_count
 *   score = rate * 100, clamped to [0, 99]
 */

const ENGINE_ID      = 'disciplineEngine';
const ENGINE_VERSION = '1.0';

// ─── Public interface (§21 DomainEngine) ──────────────────────────────────────

/**
 * Collects discipline signals from a set of HabitOccurrences.
 * Returns Evidence-like signal objects (not persisted here — caller persists).
 *
 * @param {object[]} occurrences — HabitOccurrence records in the evaluation window
 * @returns {object[]} — signal objects: { signal, value, unit, confidence, supportingIds }
 */
export function collectSignals(occurrences) {
  if (!occurrences || occurrences.length === 0) {
    return [];
  }

  const { rate, confidence, breakdown } = _computeRate(occurrences);

  return [
    {
      signal:       'habit_completion_rate',
      value:        rate,
      unit:         'ratio',
      confidence,
      breakdown,
      supportingIds: occurrences.map(o => o.id),
    },
  ];
}

/**
 * Calculates a ScoreProjection from discipline signals.
 *
 * @param {object[]} signals  — output of collectSignals()
 * @param {{ start: string, end: string }} period
 * @returns {object}  — ScoreProjection (call createScoreProjection to finalize)
 */
export function calculateScore(signals, period) {
  if (!signals || signals.length === 0) {
    return _lowCoverageProjection(period);
  }

  const completionSignal = signals.find(s => s.signal === 'habit_completion_rate');
  if (!completionSignal || completionSignal.confidence === 0) {
    return _lowCoverageProjection(period);
  }

  const rawScore   = completionSignal.value * 100;
  const value      = Math.min(99, Math.max(0, Math.round(rawScore)));
  const confidence = completionSignal.confidence;
  const coverage   = confidence;  // for discipline, coverage = confidence

  const warnings = [];
  if (coverage < 0.3) warnings.push('low_coverage: fewer than 30% of window has known status');
  if (completionSignal.breakdown?.unknown > 0) {
    warnings.push(`data_unavailable: ${completionSignal.breakdown.unknown} occurrence(s) have unknown status`);
  }

  return {
    domain:               'discipline',
    value,
    confidence,
    coverage,
    period,
    components: [
      {
        signal:       'habit_completion_rate',
        value:        completionSignal.value,
        weight:       1.0,
        // formula: completed / (expected - excused - unknown); version 1.0
        contribution: value,
      },
    ],
    methodology: {
      engine:  ENGINE_ID,
      version: ENGINE_VERSION,
    },
    supportingEvidenceIds: [],  // populated by scoreEngine after evidence is persisted
    warnings,
  };
}

/**
 * Returns a human-readable explanation of a score projection.
 *
 * @param {object} scoreProjection
 * @param {object} [breakdown]  — { completed, missed, excused, unknown, expected }
 * @returns {object}  — { headline, detail, warnings }
 */
export function explain(scoreProjection, breakdown = null) {
  const { value, confidence, coverage, warnings } = scoreProjection;

  const headline = value >= 80
    ? 'Strong discipline — intentions are converting to action reliably.'
    : value >= 55
    ? 'Moderate discipline — some gap between intention and execution.'
    : value > 0
    ? 'Low discipline — significant gap between intention and execution.'
    : 'Insufficient data to assess discipline.';

  const detail = breakdown
    ? `In this period: ${breakdown.completed} completed, ${breakdown.missed} missed, ` +
      `${breakdown.excused} excused, ${breakdown.unknown} with unknown status.`
    : 'Breakdown not available.';

  return {
    headline,
    detail,
    coverage:   `${Math.round(coverage * 100)}% of the period has known data.`,
    confidence: `Confidence: ${Math.round(confidence * 100)}%.`,
    warnings:   warnings ?? [],
  };
}

/**
 * Detects discipline patterns from a longer history of occurrences.
 *
 * @param {object[]} occurrences
 * @returns {object[]}  — array of pattern objects { type, description, severity }
 */
export function detectPatterns(occurrences) {
  const patterns = [];

  // Pattern: consistent weekend drop-off
  const weekendOccs = occurrences.filter(o => {
    const d = new Date(o.scheduledFor);
    return d.getDay() === 0 || d.getDay() === 6;
  });
  const weekdayOccs = occurrences.filter(o => {
    const d = new Date(o.scheduledFor);
    return d.getDay() >= 1 && d.getDay() <= 5;
  });

  const weekendRate  = _rateFrom(weekendOccs);
  const weekdayRate  = _rateFrom(weekdayOccs);

  if (weekdayRate > 0 && weekendRate < weekdayRate * 0.6) {
    patterns.push({
      type:        'weekend_dropoff',
      description: 'Completion rate drops significantly on weekends.',
      severity:    'medium',
    });
  }

  // Pattern: recent declining trend (last third vs first two thirds)
  const sorted = [...occurrences].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  const split  = Math.floor(sorted.length * 0.67);
  const early  = sorted.slice(0, split);
  const recent = sorted.slice(split);
  const earlyRate  = _rateFrom(early);
  const recentRate = _rateFrom(recent);

  if (earlyRate > 0.6 && recentRate < earlyRate * 0.7) {
    patterns.push({
      type:        'declining_trend',
      description: 'Discipline has declined in the most recent portion of the period.',
      severity:    'high',
    });
  }

  return patterns;
}

/**
 * Returns next-action recommendations based on discipline context.
 *
 * @param {{ score: object, patterns: object[], signals: object[] }} context
 * @returns {object[]}  — array of recommendation objects { action, rationale, priority }
 */
export function recommendNextActions(context) {
  const recommendations = [];
  const { score, patterns } = context;

  if (!score || score.value === 0) {
    recommendations.push({
      action:    'Start tracking habits with known, achievable schedules.',
      rationale: 'No discipline data exists yet.',
      priority:  'high',
    });
    return recommendations;
  }

  if (score.value < 40) {
    recommendations.push({
      action:    'Reduce the number of active habits to your highest-priority two.',
      rationale: 'Low completion rates across many habits indicate overcommitment.',
      priority:  'high',
    });
  }

  const hasWeekendDrop = patterns?.some(p => p.type === 'weekend_dropoff');
  if (hasWeekendDrop) {
    recommendations.push({
      action:    'Define a simpler weekend version of your core habits.',
      rationale: 'Weekend completion is significantly below weekday performance.',
      priority:  'medium',
    });
  }

  const hasDeclining = patterns?.some(p => p.type === 'declining_trend');
  if (hasDeclining) {
    recommendations.push({
      action:    'Identify what changed in recent weeks and address the root cause.',
      rationale: 'Discipline has declined meaningfully in the recent period.',
      priority:  'high',
    });
  }

  return recommendations;
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Computes the discipline rate from a set of occurrences.
 *
 * Formula (v1.0):
 *   rate = completed / (expected - excused - unknown)
 *   The denominator excludes excused (legitimate) and unknown (data unavailable).
 *   Unknown does NOT penalize the score (invariant I03).
 *
 * @param {object[]} occurrences
 * @returns {{ rate: number, confidence: number, breakdown: object }}
 */
function _computeRate(occurrences) {
  let completed = 0;
  let missed    = 0;
  let excused   = 0;
  let unknown   = 0;
  let expected  = 0;

  for (const o of occurrences) {
    switch (o.status) {
      case 'completed':    completed++;  expected++; break;
      case 'missed':       missed++;     expected++; break;
      case 'excused':      excused++;               break;  // excluded from denominator
      case 'unknown':      unknown++;               break;  // excluded from denominator (invariant I03)
      case 'expected':     expected++;              break;  // scheduled but not yet evaluated
      case 'rescheduled':                           break;  // neutral
    }
  }

  const denominator = completed + missed;  // only definite outcomes count
  const rate        = denominator > 0 ? completed / denominator : 0;

  // Confidence is how much of the expected window has a known outcome
  const totalScheduled = completed + missed + excused + unknown + expected;
  const knownCount     = completed + missed + excused;
  const confidence     = totalScheduled > 0 ? knownCount / totalScheduled : 0;

  return {
    rate,
    confidence,
    breakdown: { completed, missed, excused, unknown, expected: totalScheduled },
  };
}

/**
 * Computes rate from a subset of occurrences (used for pattern detection).
 */
function _rateFrom(occurrences) {
  const completed = occurrences.filter(o => o.status === 'completed').length;
  const missed    = occurrences.filter(o => o.status === 'missed').length;
  const denom     = completed + missed;
  return denom > 0 ? completed / denom : 0;
}

/**
 * Returns a low-coverage projection when data is insufficient.
 */
function _lowCoverageProjection(period) {
  return {
    domain:               'discipline',
    value:                0,
    confidence:           0,
    coverage:             0,
    period,
    components:           [],
    methodology:          { engine: ENGINE_ID, version: ENGINE_VERSION },
    supportingEvidenceIds: [],
    warnings:             ['low_coverage: no usable discipline data in this period'],
  };
}

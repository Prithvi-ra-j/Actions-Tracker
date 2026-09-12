/**
 * Knowledge Engine (§21 Domain Engine Architecture, §84 Domain Scoring Governance).
 *
 * Knowledge is demonstrated through understanding and application, not consumption volume.
 *
 * The lifecycle (§14 Learning Architecture):
 *   Encounter → Capture → Explain → Connect → Recall → Apply → Observe → Refine
 *
 * Signals (in ascending evidence strength):
 *   exposure      — books started / content encountered
 *   understanding — learnings captured with explanations
 *   retention     — mastery.retention > 0
 *   synthesis     — learnings with relatedLearningIds (connected thinking)
 *   application   — learnings with personalApplication set
 *   impact        — learnings with mastery.impact > 0 (observed real-world result)
 *
 * Anti-gaming (§85): books completed alone ≠ knowledge.
 *   10 books with 0 learnings → low score
 *   3 books with 10 applied learnings → higher score
 *
 * Pure functions — no DB calls, no React.
 *
 * Engine ID:      knowledgeEngine
 * Engine Version: 1.0
 *
 * Score formula (version 1.0):
 *   knowledge_score = weighted sum of signal scores, clamped to [0, 99]
 *
 * Weights (version 1.0) — formula: KE-v1.0
 *   exposure      × 0.05  (consumption is weak evidence)
 *   understanding × 0.25
 *   retention     × 0.20
 *   synthesis     × 0.15
 *   application   × 0.25  (application is strong evidence)
 *   impact        × 0.10  (demonstrated impact is strongest)
 */

const ENGINE_ID      = 'knowledgeEngine';
const ENGINE_VERSION = '1.0';

// Weights must sum to 1.0
// Formula: KE-v1.0 — derived 2026-09 from §84 scoring governance + §85 anti-gaming rules
const SIGNAL_WEIGHTS = Object.freeze({
  exposure:      0.05,
  understanding: 0.25,
  retention:     0.20,
  synthesis:     0.15,
  application:   0.25,
  impact:        0.10,
});

// ─── Public interface (§21 DomainEngine) ──────────────────────────────────────

/**
 * Collects knowledge signals from a set of facts and learnings.
 *
 * @param {{
 *   facts:     object[],    — Fact records in the time window
 *   learnings: object[],    — Learning records (all time, for mastery signals)
 *   books:     object[],    — Book records in the window
 * }} input
 * @returns {object[]}  — signal objects
 */
export function collectSignals({ facts = [], learnings = [], books = [] }) {
  const signals = [];

  // Exposure: books started or in progress, content encountered
  const booksWithProgress = books.filter(b => b.currentPage > 0 || b.status === 'completed');
  const bookCompletedFacts = facts.filter(f => f.type === 'knowledge.book.completed');
  const exposureScore = Math.min(1, (booksWithProgress.length * 0.1) + (bookCompletedFacts.length * 0.15));

  signals.push({
    signal:     'exposure',
    value:      exposureScore,
    unit:       'ratio',
    confidence: booksWithProgress.length + bookCompletedFacts.length > 0 ? 0.9 : 0,
  });

  // Understanding: learnings with non-empty explanations
  const withExplanation = learnings.filter(l => l.explanation && l.explanation.trim().length > 20);
  const understandingScore = Math.min(1, withExplanation.length / 10);

  signals.push({
    signal:     'understanding',
    value:      understandingScore,
    unit:       'ratio',
    confidence: learnings.length > 0 ? 0.85 : 0,
  });

  // Retention: learnings with mastery.retention > 0
  const withRetention = learnings.filter(l => (l.mastery?.retention ?? 0) > 0);
  const retentionScore = learnings.length > 0
    ? Math.min(1, withRetention.length / Math.max(1, learnings.length))
    : 0;

  signals.push({
    signal:     'retention',
    value:      retentionScore,
    unit:       'ratio',
    confidence: learnings.length >= 3 ? 0.8 : learnings.length > 0 ? 0.5 : 0,
  });

  // Synthesis: learnings connected to other learnings
  const withRelations = learnings.filter(l =>
    Array.isArray(l.relatedLearningIds) && l.relatedLearningIds.length > 0
  );
  const synthesisScore = learnings.length > 0
    ? Math.min(1, withRelations.length / Math.max(1, learnings.length))
    : 0;

  signals.push({
    signal:     'synthesis',
    value:      synthesisScore,
    unit:       'ratio',
    confidence: learnings.length >= 3 ? 0.75 : learnings.length > 0 ? 0.4 : 0,
  });

  // Application: learnings with personalApplication set (strong evidence)
  const withApplication = learnings.filter(l =>
    l.personalApplication && l.personalApplication.trim().length > 0
  );
  const applicationScore = learnings.length > 0
    ? Math.min(1, withApplication.length / Math.max(1, learnings.length) * 1.5)
    : 0;

  signals.push({
    signal:     'application',
    value:      Math.min(1, applicationScore),
    unit:       'ratio',
    confidence: withApplication.length > 0 ? 0.9 : learnings.length > 0 ? 0.7 : 0,
  });

  // Impact: learnings with mastery.impact > 0 (observed real-world result)
  const withImpact = learnings.filter(l => (l.mastery?.impact ?? 0) > 0);
  const impactScore = learnings.length > 0
    ? Math.min(1, withImpact.length / Math.max(1, learnings.length) * 2)
    : 0;

  signals.push({
    signal:     'impact',
    value:      Math.min(1, impactScore),
    unit:       'ratio',
    confidence: withImpact.length > 0 ? 0.95 : learnings.length > 0 ? 0.5 : 0,
  });

  return signals;
}

/**
 * Calculates a ScoreProjection from knowledge signals.
 *
 * @param {object[]} signals  — output of collectSignals()
 * @param {{ start: string, end: string }} period
 * @returns {object}  — ScoreProjection shape (call createScoreProjection to finalize)
 */
export function calculateScore(signals, period) {
  if (!signals || signals.length === 0) {
    return _lowCoverageProjection(period);
  }

  const signalMap = Object.fromEntries(signals.map(s => [s.signal, s]));
  const components = [];
  let weightedSum  = 0;
  let totalWeight  = 0;
  let totalConf    = 0;

  for (const [sig, weight] of Object.entries(SIGNAL_WEIGHTS)) {
    const s = signalMap[sig];
    if (!s) continue;

    const contribution = s.value * weight * 100;
    weightedSum += contribution;
    totalWeight += weight;
    totalConf   += (s.confidence ?? 0) * weight;

    components.push({
      signal:       sig,
      value:        s.value,
      weight,
      contribution: Math.round(contribution),
    });
  }

  if (totalWeight === 0) return _lowCoverageProjection(period);

  const value      = Math.min(99, Math.max(0, Math.round(weightedSum)));
  const confidence = totalWeight > 0 ? totalConf / totalWeight : 0;
  const coverage   = totalWeight;  // how much of the max weight was present

  const warnings = [];
  if (confidence < 0.4) warnings.push('low_confidence: limited knowledge data in this period');

  // Anti-gaming warning: check if consumption >> application
  const exposureSignal     = signalMap['exposure'];
  const applicationSignal  = signalMap['application'];
  if (exposureSignal?.value > 0.5 && (applicationSignal?.value ?? 0) < 0.1) {
    warnings.push('consumption_application_imbalance: high content consumption, low application evidence');
  }

  return {
    domain:               'knowledge',
    value,
    confidence,
    coverage,
    period,
    components,
    methodology:          { engine: ENGINE_ID, version: ENGINE_VERSION },
    supportingEvidenceIds: [],  // populated by scoreEngine after evidence is persisted
    warnings,
  };
}

/**
 * Returns a human-readable explanation of a knowledge score.
 *
 * @param {object} scoreProjection
 * @returns {object}  — { headline, detail, signals, warnings }
 */
export function explain(scoreProjection) {
  const { value, confidence, components, warnings } = scoreProjection;

  const headline = value >= 75
    ? 'Strong knowledge development — exposure and application are connected.'
    : value >= 45
    ? 'Moderate knowledge development — application and synthesis need attention.'
    : value > 0
    ? 'Early-stage knowledge development — focus on understanding and applying learnings.'
    : 'Insufficient knowledge data to assess.';

  const signalDescriptions = (components ?? []).map(c =>
    `${c.signal}: ${Math.round(c.value * 100)}% (contributes ${c.contribution} pts)`
  );

  return {
    headline,
    detail:     'Score reflects the full lifecycle from exposure to demonstrated impact.',
    signals:    signalDescriptions,
    confidence: `Confidence: ${Math.round(confidence * 100)}%.`,
    warnings:   warnings ?? [],
  };
}

/**
 * Detects knowledge patterns from learnings and signals.
 *
 * @param {object[]} signals
 * @param {object[]} learnings
 * @returns {object[]}  — array of pattern objects
 */
export function detectPatterns(signals, learnings) {
  const patterns = [];
  const sigMap   = Object.fromEntries(signals.map(s => [s.signal, s]));

  // Pattern: consumption without application
  const exposure    = sigMap['exposure']?.value    ?? 0;
  const application = sigMap['application']?.value ?? 0;
  if (exposure > 0.4 && application < exposure * 0.2) {
    patterns.push({
      type:        'consumption_without_application',
      description: 'High content exposure with little evidence of application.',
      severity:    'medium',
    });
  }

  // Pattern: isolated learnings (no synthesis)
  const synthesis = sigMap['synthesis']?.value ?? 0;
  if (learnings.length >= 5 && synthesis < 0.1) {
    patterns.push({
      type:        'isolated_learnings',
      description: 'Many learnings captured but few connected to each other.',
      severity:    'low',
    });
  }

  return patterns;
}

/**
 * Returns next-action recommendations based on knowledge context.
 *
 * @param {{ score: object, patterns: object[], signals: object[] }} context
 * @returns {object[]}
 */
export function recommendNextActions(context) {
  const { score, patterns, signals } = context;
  const recommendations = [];
  const sigMap = Object.fromEntries((signals ?? []).map(s => [s.signal, s]));

  if (!score || score.value === 0) {
    recommendations.push({
      action:    'Start by capturing one learning from your current reading with a full explanation.',
      rationale: 'No knowledge evidence exists yet.',
      priority:  'high',
    });
    return recommendations;
  }

  if ((sigMap['application']?.value ?? 0) < 0.2) {
    recommendations.push({
      action:    'For each learning you captured this week, write one real-world application.',
      rationale: 'Application is the strongest knowledge evidence and is currently low.',
      priority:  'high',
    });
  }

  const hasConsumptionImbalance = patterns?.some(p => p.type === 'consumption_without_application');
  if (hasConsumptionImbalance) {
    recommendations.push({
      action:    'Pause new reading until you have applied at least one concept from your current book.',
      rationale: 'You are collecting knowledge faster than you are developing it.',
      priority:  'medium',
    });
  }

  const hasIsolatedLearnings = patterns?.some(p => p.type === 'isolated_learnings');
  if (hasIsolatedLearnings) {
    recommendations.push({
      action:    'Review your learnings list and connect three related concepts.',
      rationale: 'Synthesis — connecting ideas — is currently weak.',
      priority:  'low',
    });
  }

  return recommendations;
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

function _lowCoverageProjection(period) {
  return {
    domain:               'knowledge',
    value:                0,
    confidence:           0,
    coverage:             0,
    period,
    components:           [],
    methodology:          { engine: ENGINE_ID, version: ENGINE_VERSION },
    supportingEvidenceIds: [],
    warnings:             ['low_coverage: no usable knowledge data in this period'],
  };
}

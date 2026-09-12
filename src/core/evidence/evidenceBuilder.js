/**
 * Evidence builder (§11 Evidence Model, §4 Evidence Substrate).
 *
 * Builds Evidence signals from raw Facts.
 * This is a pure function module — no DB calls, no React.
 *
 * The builder takes a collection of facts and produces Evidence records
 * that are ready to be written to the evidence store. Each Evidence record
 * carries the supportingFactIds of every fact that contributed to it,
 * making the derivation traceable (§76 UX Trust Requirements).
 *
 * Coverage is the fraction of the expected window that has known data.
 * Confidence reflects coverage. Low confidence is a real state — not an error.
 */

import { createEvidence } from '../../models/evidenceSchema.js';
import { FACT_TYPES } from '../facts/factTypes.js';

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Builds evidence signals from a set of facts for a given domain and time window.
 *
 * @param {string} domain  — 'body'|'knowledge'|'strategy'|'creativity'|'social'|'discipline'
 * @param {object[]} facts — flat array of Fact records (already filtered to the window)
 * @param {{ start: string, end: string }} timeWindow — ISO 8601
 * @param {string} engineId
 * @param {string} engineVersion
 * @returns {object[]}  — array of Evidence records (not yet persisted)
 */
export function buildEvidenceFromFacts(domain, facts, timeWindow, engineId, engineVersion) {
  const builders = DOMAIN_BUILDERS[domain];
  if (!builders) {
    // Unknown domain — return empty with a note. Never throw; let the caller handle.
    return [];
  }

  const results = [];
  for (const { signal, fn } of builders) {
    const relevant = facts.filter(f => FACT_TYPE_GROUPS[signal]?.includes(f.type));
    if (relevant.length === 0) continue;

    const { value, unit, confidence } = fn(relevant, timeWindow);

    results.push(createEvidence({
      domain,
      signal,
      value,
      unit,
      confidence,
      timeWindow,
      supportingFactIds: relevant.map(f => f.id),
      methodology: {
        engineId,
        engineVersion,
        formula: SIGNAL_FORMULAS[signal] ?? null,
      },
    }));
  }
  return results;
}

/**
 * Computes a coverage report: what fraction of expected signals have data.
 *
 * @param {object[]} facts
 * @param {{ start: string, end: string }} timeWindow
 * @param {string[]} expectedSignals  — list of signal names the engine requires
 * @returns {{ coverage: number, confidence: number, presentSignals: string[], missingSignals: string[] }}
 */
export function computeCoverageReport(facts, timeWindow, expectedSignals) {
  const presentSignals = [];
  const missingSignals = [];

  for (const signal of expectedSignals) {
    const types = FACT_TYPE_GROUPS[signal] ?? [];
    const hasData = facts.some(f => types.includes(f.type));
    if (hasData) {
      presentSignals.push(signal);
    } else {
      missingSignals.push(signal);
    }
  }

  const coverage = expectedSignals.length > 0
    ? presentSignals.length / expectedSignals.length
    : 0;

  return {
    coverage,
    confidence:     coverage,  // coverage directly drives initial confidence
    presentSignals,
    missingSignals,
  };
}

// ─── Internal signal → fact type mapping ───────────────────────────────────────

/**
 * Maps each signal name to the fact types that populate it.
 * This is the canonical mapping — domain engines use it to know
 * which facts to retrieve for which signals.
 */
const FACT_TYPE_GROUPS = {
  // Discipline
  habit_completion:     [FACT_TYPES.HABIT_COMPLETED, FACT_TYPES.HABIT_MISSED, FACT_TYPES.HABIT_EXCUSED],

  // Knowledge
  book_progress:        [FACT_TYPES.BOOK_PROGRESS, FACT_TYPES.BOOK_COMPLETED],
  learning_depth:       [FACT_TYPES.LEARNING_ADDED, FACT_TYPES.LEARNING_MASTERY],
  learning_application: [FACT_TYPES.LEARNING_APPLIED],

  // Body
  activity_steps:       [FACT_TYPES.BODY_STEPS],
  training_sessions:    [FACT_TYPES.BODY_WORKOUT],
  recovery_sleep:       [FACT_TYPES.BODY_SLEEP],
  body_composition:     [FACT_TYPES.BODY_COMPOSITION],

  // Strategy
  decisions_logged:     [FACT_TYPES.DECISION_LOGGED, FACT_TYPES.DECISION_RESOLVED],

  // Creativity
  creative_output:      [FACT_TYPES.CREATIVE_WORK, FACT_TYPES.CREATIVE_FEEDBACK],

  // Social
  experiments_run:      [FACT_TYPES.EXPERIMENT_LOGGED, FACT_TYPES.EXPERIMENT_RESULT],
};

/**
 * Human-readable formula descriptions for each signal.
 * These are stored in Evidence.methodology.formula for auditability.
 */
const SIGNAL_FORMULAS = {
  habit_completion:     'completed / (expected - excused - unknown)',
  book_progress:        'pages_read / total_pages where available',
  learning_depth:       'count(learnings) weighted by mastery levels',
  learning_application: 'count(learnings with personalApplication set)',
  activity_steps:       'sum(daily step facts) / window_days',
  training_sessions:    'count(workout facts) in window',
  recovery_sleep:       'avg(sleep_hours facts) in window',
  decisions_logged:     'count(decision facts) in window',
  creative_output:      'count(creative work facts) in window',
  experiments_run:      'count(experiment facts) in window',
};

// ─── Signal computation functions ─────────────────────────────────────────────
// Each returns { value, unit, confidence }.
// These are deliberately simple at this phase — engines refine them in Phase 5+.

function computeHabitCompletion(facts, _timeWindow) {
  const completed = facts.filter(f => f.type === FACT_TYPES.HABIT_COMPLETED).length;
  const missed    = facts.filter(f => f.type === FACT_TYPES.HABIT_MISSED).length;
  // excused are excluded from denominator
  const total = completed + missed;
  if (total === 0) return { value: 0, unit: 'ratio', confidence: 0 };
  return {
    value:      completed / total,
    unit:       'ratio',
    confidence: Math.min(1, total / 7),  // confidence rises with sample size
  };
}

function computeBookProgress(facts, _timeWindow) {
  const completions = facts.filter(f => f.type === FACT_TYPES.BOOK_COMPLETED).length;
  const progress    = facts.filter(f => f.type === FACT_TYPES.BOOK_PROGRESS).length;
  return {
    value:      completions + Math.min(progress * 0.1, 1),
    unit:       'books',
    confidence: facts.length > 0 ? 0.7 : 0,
  };
}

function computeLearningDepth(facts, _timeWindow) {
  const count = facts.filter(f => f.type === FACT_TYPES.LEARNING_ADDED).length;
  const masteryUpdates = facts.filter(f => f.type === FACT_TYPES.LEARNING_MASTERY).length;
  return {
    value:      count + masteryUpdates * 0.5,
    unit:       'learnings',
    confidence: count > 0 ? 0.8 : 0,
  };
}

function computeLearningApplication(facts, _timeWindow) {
  const count = facts.filter(f => f.type === FACT_TYPES.LEARNING_APPLIED).length;
  return {
    value:      count,
    unit:       'applications',
    confidence: count > 0 ? 0.9 : 0,
  };
}

function computeActivitySteps(facts, _timeWindow) {
  const stepFacts = facts.filter(f => f.type === FACT_TYPES.BODY_STEPS);
  if (stepFacts.length === 0) return { value: 0, unit: 'steps/day', confidence: 0 };
  const avg = stepFacts.reduce((sum, f) => sum + (Number(f.value) || 0), 0) / stepFacts.length;
  return { value: Math.round(avg), unit: 'steps/day', confidence: Math.min(1, stepFacts.length / 7) };
}

function computeTrainingSessions(facts, _timeWindow) {
  const count = facts.filter(f => f.type === FACT_TYPES.BODY_WORKOUT).length;
  return { value: count, unit: 'sessions', confidence: count > 0 ? 0.9 : 0 };
}

function computeRecoverySleep(facts, _timeWindow) {
  const sleepFacts = facts.filter(f => f.type === FACT_TYPES.BODY_SLEEP);
  if (sleepFacts.length === 0) return { value: 0, unit: 'hours/night', confidence: 0 };
  const avg = sleepFacts.reduce((sum, f) => sum + (Number(f.value) || 0), 0) / sleepFacts.length;
  return { value: Math.round(avg * 10) / 10, unit: 'hours/night', confidence: Math.min(1, sleepFacts.length / 7) };
}

function computeDecisions(facts, _timeWindow) {
  const count = facts.filter(f => f.type === FACT_TYPES.DECISION_LOGGED).length;
  return { value: count, unit: 'decisions', confidence: count > 0 ? 0.85 : 0 };
}

function computeCreativeOutput(facts, _timeWindow) {
  const count = facts.filter(f => f.type === FACT_TYPES.CREATIVE_WORK).length;
  return { value: count, unit: 'works', confidence: count > 0 ? 0.9 : 0 };
}

function computeExperiments(facts, _timeWindow) {
  const count = facts.filter(f => f.type === FACT_TYPES.EXPERIMENT_LOGGED).length;
  return { value: count, unit: 'experiments', confidence: count > 0 ? 0.9 : 0 };
}

// ─── Domain builder registry ──────────────────────────────────────────────────

const DOMAIN_BUILDERS = {
  discipline: [
    { signal: 'habit_completion',     fn: computeHabitCompletion },
  ],
  knowledge: [
    { signal: 'book_progress',        fn: computeBookProgress },
    { signal: 'learning_depth',       fn: computeLearningDepth },
    { signal: 'learning_application', fn: computeLearningApplication },
  ],
  body: [
    { signal: 'activity_steps',       fn: computeActivitySteps },
    { signal: 'training_sessions',    fn: computeTrainingSessions },
    { signal: 'recovery_sleep',       fn: computeRecoverySleep },
  ],
  strategy: [
    { signal: 'decisions_logged',     fn: computeDecisions },
  ],
  creativity: [
    { signal: 'creative_output',      fn: computeCreativeOutput },
  ],
  social: [
    { signal: 'experiments_run',      fn: computeExperiments },
  ],
};

/**
 * Returns the list of signal names expected by a domain's engine.
 * Used by computeCoverageReport to determine which signals have data.
 * @param {string} domain
 * @returns {string[]}
 */
export function getExpectedSignals(domain) {
  return (DOMAIN_BUILDERS[domain] ?? []).map(b => b.signal);
}

/**
 * Returns the fact types that matter for a given signal.
 * Used by repositories to construct targeted queries.
 * @param {string} signal
 * @returns {string[]}
 */
export function getFactTypesForSignal(signal) {
  return FACT_TYPE_GROUPS[signal] ?? [];
}

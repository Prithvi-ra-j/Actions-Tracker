/**
 * Canonical fact type string constants (§46 Application Command Layer).
 *
 * Single source of truth for all fact type strings used in the system.
 * No scattered string literals for fact types in components or repositories.
 *
 * Convention: '<domain>.<category>.<action>'
 *
 * When adding a new fact type:
 *   1. Add it here
 *   2. Add documentation for what value/meta fields it carries
 *   3. Update any evidence engines that should respond to it
 */

export const FACT_TYPES = Object.freeze({

  // ── Habit events ────────────────────────────────────────────────────────────
  // value: 1 for boolean habits; quantity for count/duration habits
  // meta: { habitId, occurrenceId }
  HABIT_COMPLETED:    'habit.completed',

  // meta: { habitId, occurrenceId, reason }
  HABIT_EXCUSED:      'habit.excused',

  // meta: { habitId, occurrenceId }
  // IMPORTANT: only written by explicit user/system intent, never by sync failure
  HABIT_MISSED:       'habit.missed',

  // ── Knowledge / Learning events ─────────────────────────────────────────────
  // meta: { learningId, concept, sourceId, sourceType }
  LEARNING_ADDED:     'knowledge.learning.added',

  // meta: { learningId, masteryField, newValue }
  LEARNING_MASTERY:   'knowledge.learning.mastery_updated',

  // meta: { learningId, application }
  LEARNING_APPLIED:   'knowledge.learning.applied',

  // meta: { bookId, previousPage, currentPage }
  BOOK_PROGRESS:      'knowledge.book.progress',

  // meta: { bookId, totalPages }
  BOOK_COMPLETED:     'knowledge.book.completed',

  // ── Strategy events ─────────────────────────────────────────────────────────
  // meta: { decisionId, situation, chosenOption }
  DECISION_LOGGED:    'strategy.decision.logged',

  // meta: { decisionId, actualOutcome, lesson }
  DECISION_RESOLVED:  'strategy.decision.resolved',

  // ── Creativity events ────────────────────────────────────────────────────────
  // meta: { workId, medium, practiceMinutes }
  CREATIVE_WORK:      'creativity.work.logged',

  // meta: { workId, qualityAssessment }
  CREATIVE_FEEDBACK:  'creativity.work.feedback',

  // ── Social / Experiment events ────────────────────────────────────────────
  // meta: { experimentId, hypothesis }
  EXPERIMENT_LOGGED:  'social.experiment.logged',

  // meta: { experimentId, observations, result }
  EXPERIMENT_RESULT:  'social.experiment.result',

  // ── Body events ──────────────────────────────────────────────────────────────
  // value: step count, meta: { source: 'health_connect' | 'manual' }
  BODY_STEPS:         'body.activity.steps',

  // meta: { sessionType, durationMinutes, muscleGroups }
  BODY_WORKOUT:       'body.training.session',

  // value: hours, meta: { quality }
  BODY_SLEEP:         'body.recovery.sleep',

  // value: weight in kg, meta: { bodyFatPercent? }
  BODY_COMPOSITION:   'body.composition.measurement',

  // ── System events ────────────────────────────────────────────────────────────
  // meta: { targetRef, axis, assessedValue }
  EVALUATION:         'system.evaluation',

  // meta: { correctionOf — original fact ID }
  CORRECTION:         'system.correction',

  // meta: { retractedId — original fact ID, reason }
  RETRACTION:         'system.retraction',
});

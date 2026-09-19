/**
 * Habit schema factories (§12 Habit Architecture — full spec).
 *
 * This file defines the FULL §12 Habit and HabitOccurrence interfaces.
 *
 * NOTE: A simpler 'habit' factory also exists in lifeObjectSchema.js (the legacy
 * Life Object version). That version is left untouched. New habits created
 * through the habit management UI should use createHabit() from this file.
 * The distinction is documented here so it can be unified in a future migration phase.
 */

const SCHEMA_VERSION = 1;

function now() {
  return new Date().toISOString();
}

function generateHabitId() {
  return `habit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateOccurrenceId() {
  return `occ_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Habit factory ─────────────────────────────────────────────────────────────

/**
 * Creates a full §12 Habit record.
 *
 * @param {{
 *   id?:              string,
 *   name:             string,
 *   description?:     string,
 *   domain?:          'body'|'knowledge'|'strategy'|'creativity'|'social'|'general',
 *   frequency:        FrequencyRule,
 *   target?:          { value: number, unit: string },
 *   trackingMethod?:  'boolean'|'count'|'duration'|'distance'|'pages'|'metric'|'automatic',
 *   completionMode?:  'manual'|'automatic'|'hybrid',
 *   source?:          { type: 'user'|'core'|'integration', integrationId?: string },
 *   scoring?:         { enabled: boolean, weight: number, evidenceType: string },
 *   exceptionPolicy?: { allowSkip: boolean, requireReason: boolean, affectsDiscipline: boolean },
 *   masteryRoadmap?:  { currentLevel: number, levels: any[] },
 *   implementationIntention?: { anchor: string, behavior: string, location: string, timeSlot: string },
 *   identityVote?:    string,
 *   tinyVersion?:     string,
 *   phase?:           'building'|'maintaining'|'advancing',
 * }} fields
 * @returns {object}
 */
export function createHabit(fields) {
  const ts = now();
  return {
    id:              fields.id ?? generateHabitId(),
    schemaVersion:   SCHEMA_VERSION,
    name:            fields.name,
    description:     fields.description     ?? null,
    domain:          fields.domain          ?? 'general',
    frequency:       fields.frequency,
    target:          fields.target          ?? null,
    trackingMethod:  fields.trackingMethod  ?? 'boolean',
    completionMode:  fields.completionMode  ?? 'manual',
    source:          fields.source          ?? { type: 'user' },
    scoring:         fields.scoring         ?? { enabled: false, weight: 1, evidenceType: '' },
    exceptionPolicy: fields.exceptionPolicy ?? {
      allowSkip:         true,
      requireReason:     false,
      affectsDiscipline: true,
    },
    masteryRoadmap:  fields.masteryRoadmap  ?? null,
    implementationIntention: fields.implementationIntention ?? null,
    identityVote:    fields.identityVote    ?? null,
    tinyVersion:     fields.tinyVersion     ?? null,
    phase:           fields.phase           ?? 'building',
    status:    'active',
    createdAt: ts,
    updatedAt: ts,
  };
}

// ─── HabitOccurrence factory ───────────────────────────────────────────────────

/**
 * Creates a §12 HabitOccurrence record.
 *
 * Status semantics:
 *   expected    — scheduled, not yet evaluated
 *   completed   — confirmed done
 *   missed      — confirmed NOT done (only with explicit intent)
 *   rescheduled — moved to another time
 *   excused     — legitimately skipped
 *   unknown     — truth cannot be determined (e.g. sync gap)
 *
 * INVARIANT: 'unknown' is never 'missed'.
 *
 * @param {{
 *   id?:               string,
 *   habitId:           string,
 *   scheduledFor:      string,     — ISO 8601
 *   status?:           'expected'|'completed'|'missed'|'rescheduled'|'excused'|'unknown',
 *   completedAt?:      string,
 *   value?:            number,
 *   unit?:             string,
 *   supportingFactIds?: string[],
 *   reason?:           string,
 * }} fields
 * @returns {object}
 */
export function createHabitOccurrence(fields) {
  return {
    id:                fields.id ?? generateOccurrenceId(),
    schemaVersion:     SCHEMA_VERSION,
    habitId:           fields.habitId,
    scheduledFor:      fields.scheduledFor,
    status:            fields.status            ?? 'expected',
    completedAt:       fields.completedAt       ?? null,
    value:             fields.value             ?? null,
    unit:              fields.unit              ?? null,
    supportingFactIds: fields.supportingFactIds ?? [],
    reason:            fields.reason            ?? null,
  };
}

// ─── FrequencyRule helpers ─────────────────────────────────────────────────────

/**
 * Creates a daily frequency rule.
 * @returns {object}
 */
export function dailyFrequency() {
  return { type: 'daily' };
}

/**
 * Creates a weekly frequency rule (specific days).
 * @param {number[]} days  — 0=Sun, 1=Mon, ..., 6=Sat
 * @returns {object}
 */
export function weeklyFrequency(days) {
  return { type: 'weekly', days };
}

/**
 * Creates a custom frequency rule.
 * @param {number[]} days  — 0=Sun..6=Sat
 * @returns {object}
 */
export function customFrequency(days) {
  return { type: 'custom', days };
}

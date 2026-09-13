/**
 * Life Object schema definitions (v1.2 / §26 Life Object Model).
 *
 * Each factory function returns a plain object with all required and optional
 * fields pre-populated with sensible defaults. No classes — just data shapes.
 *
 * v1.2 types: goal, habit, task, routine
 * Future types (v2+): project, experiment, aspiration, constraint, principle, commitment
 */

// ─── Type constants ─────────────────────────────────────────────────────────────

export const LIFE_OBJECT_TYPES = {
  GOAL:    'goal',
  HABIT:   'habit',
  TASK:    'task',
  ROUTINE: 'routine',
};

export const LIFE_OBJECT_STATUSES = {
  ACTIVE:    'active',
  PAUSED:    'paused',
  COMPLETED: 'completed',
  ARCHIVED:  'archived',
};

// ─── ID generation ─────────────────────────────────────────────────────────────

/**
 * Generates a stable, collision-resistant ID for a Life Object.
 * Format: "<type>_<timestamp>_<random>"
 * @param {string} type
 * @returns {string}
 */
export function generateLifeObjectId(type) {
  return `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Factories ──────────────────────────────────────────────────────────────────

/**
 * Creates a Goal Life Object.
 * Goals are high-level outcome intentions with multiple measurable targets.
 *
 * @param {{
 *   id?:       string,
 *   domain:    string,    — e.g. 'Body', 'Philosophy', 'Art'
 *   label:     string,    — e.g. 'Track I'
 *   color?:    string,
 *   icon?:     string,
 *   start?:    string,    — where you're starting from (narrative)
 *   end?:      string,    — where you want to be (narrative)
 *   targets?:  Array<{ text: string, metric: string }>,
 *   proof?:    string,    — how you'll know you made it
 *   fear?:     string,    — the obstacle to anticipate
 * }} fields
 * @returns {object}
 */
export function createGoal(fields) {
  return {
    id:      fields.id     ?? generateLifeObjectId('goal'),
    type:    LIFE_OBJECT_TYPES.GOAL,
    status:  LIFE_OBJECT_STATUSES.ACTIVE,
    domain:  fields.domain,
    label:   fields.label,
    color:   fields.color  ?? '#888888',
    icon:    fields.icon   ?? '◇',
    start:   fields.start  ?? '',
    end:     fields.end    ?? '',
    targets: fields.targets ?? [],
    proof:   fields.proof  ?? '',
    fear:    fields.fear   ?? '',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Creates a Habit Life Object.
 * Habits are recurring behaviours tracked daily/weekly.
 *
 * @param {{
 *   id?:          string,
 *   label:        string,
 *   domain?:      string,
 *   color?:       string,
 *   icon?:        string,
 *   frequency:    'daily' | 'weekdays' | 'weekly' | 'custom',
 *   scheduleDays?: number[],  — 0=Sun..6=Sat, used when frequency='custom'
 *   goalObjectId?: string,    — optional parent Goal ID
 * }} fields
 * @returns {object}
 */
export function createHabit(fields) {
  return {
    id:           fields.id           ?? generateLifeObjectId('habit'),
    type:         LIFE_OBJECT_TYPES.HABIT,
    status:       LIFE_OBJECT_STATUSES.ACTIVE,
    label:        fields.label,
    domain:       fields.domain       ?? '',
    color:        fields.color        ?? '#888888',
    icon:         fields.icon         ?? '○',
    frequency:    fields.frequency,
    scheduleDays: fields.scheduleDays ?? [],
    goalObjectId: fields.goalObjectId ?? null,
    schemaVersion: 1,
    createdAt:    new Date().toISOString(),
    updatedAt:    new Date().toISOString(),
  };
}

/**
 * Creates a Task Life Object.
 * Tasks are one-off items with an optional due date and parent.
 *
 * @param {{
 *   id?:          string,
 *   label:        string,
 *   parentId?:    string,   — parent Goal or Project ID
 *   dueDate?:     string,   — YYYY-MM-DD
 * }} fields
 * @returns {object}
 */
export function createTask(fields) {
  return {
    id:       fields.id       ?? generateLifeObjectId('task'),
    type:     LIFE_OBJECT_TYPES.TASK,
    status:   LIFE_OBJECT_STATUSES.ACTIVE,
    label:    fields.label,
    parentId: fields.parentId ?? null,
    dueDate:  fields.dueDate  ?? null,
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Creates a Routine Life Object.
 * Routines are ordered sequences of steps (morning routine, workout, etc.).
 *
 * @param {{
 *   id?:      string,
 *   label:    string,
 *   steps?:   string[],
 *   schedule?: string,   — 'daily' | 'weekdays' | 'weekends' | 'weekly'
 * }} fields
 * @returns {object}
 */
export function createRoutine(fields) {
  return {
    id:       fields.id       ?? generateLifeObjectId('routine'),
    type:     LIFE_OBJECT_TYPES.ROUTINE,
    status:   LIFE_OBJECT_STATUSES.ACTIVE,
    label:    fields.label,
    steps:    fields.steps    ?? [],
    schedule: fields.schedule ?? 'daily',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── v8 Additions — Architecture Phase 3 ───────────────────────────────────
// New entity types added additively. Existing factories above are unchanged.

export const LIFE_OBJECT_TYPES_V8 = {
  ...LIFE_OBJECT_TYPES,
  LEARNING:      'learning',
  EXPERIMENT:    'experiment',
  DECISION:      'decision',
  CREATIVE_WORK: 'creative_work',
  OBSERVATION:   'observation',
};

/**
 * Creates a Learning Life Object (§14 Learning Architecture).
 * Books are sources. Learnings are the intellectual assets extracted from them.
 *
 * @param {{
 *   concept:              string,
 *   sourceId?:            string,
 *   sourceType?:          'book'|'video'|'article'|'podcast'|'conversation'|'course'|'social'|'experience'|'other',
 *   explanation:          string,
 *   whyItMatters?:        string,
 *   personalApplication?: string,
 *   examples?:            string[],
 *   tags?:                string[],
 *   relatedLearningIds?:  string[],
 *   mastery?:             { exposure: number, understanding: number, retention: number, synthesis: number, application: number, impact: number },
 * }} fields
 */
export function createLearning(fields) {
  const ts = new Date().toISOString();
  return {
    id:                  generateLifeObjectId('learning'),
    type:                LIFE_OBJECT_TYPES_V8.LEARNING,
    status:              LIFE_OBJECT_STATUSES.ACTIVE,
    concept:             fields.concept,
    sourceId:            fields.sourceId            ?? null,
    sourceType:          fields.sourceType           ?? 'other',
    explanation:         fields.explanation,
    whyItMatters:        fields.whyItMatters         ?? null,
    personalApplication: fields.personalApplication  ?? null,
    examples:            fields.examples             ?? [],
    tags:                fields.tags                 ?? [],
    relatedLearningIds:  fields.relatedLearningIds   ?? [],
    mastery: fields.mastery ?? {
      exposure: 0, understanding: 0, retention: 0,
      synthesis: 0, application: 0, impact: 0,
    },
    schemaVersion: 1,
    createdAt: ts,
    updatedAt: ts,
  };
}

/**
 * Creates an Experiment Life Object (§18 Social/Interpersonal Architecture).
 *
 * @param {{
 *   hypothesis:    string,
 *   domain?:       'social'|'strategy'|'body'|'knowledge'|'creativity',
 *   protocol?:     string,
 *   targetCount?:  number,
 * }} fields
 */
export function createExperiment(fields) {
  const ts = new Date().toISOString();
  return {
    id:           generateLifeObjectId('experiment'),
    type:         LIFE_OBJECT_TYPES_V8.EXPERIMENT,
    status:       LIFE_OBJECT_STATUSES.ACTIVE,
    domain:       fields.domain       ?? 'social',
    hypothesis:   fields.hypothesis,
    protocol:     fields.protocol     ?? null,
    targetCount:  fields.targetCount  ?? null,
    observations: [],
    result:       null,
    conclusion:   null,
    nextExperiment: null,
    schemaVersion: 1,
    createdAt: ts,
    updatedAt: ts,
  };
}

/**
 * Creates a Decision Life Object (§16 Strategy Architecture).
 *
 * @param {{
 *   situation:       string,
 *   objective:       string,
 *   chosenOption:    string,
 *   knownFacts?:     string[],
 *   assumptions?:    string[],
 *   options?:        { label: string, expectedOutcome?: string, downside?: string }[],
 *   expectedOutcome?: string,
 * }} fields
 */
export function createDecision(fields) {
  const ts = new Date().toISOString();
  return {
    id:              generateLifeObjectId('decision'),
    type:            LIFE_OBJECT_TYPES_V8.DECISION,
    status:          LIFE_OBJECT_STATUSES.ACTIVE,
    situation:       fields.situation,
    objective:       fields.objective,
    knownFacts:      fields.knownFacts      ?? [],
    assumptions:     fields.assumptions     ?? [],
    options:         fields.options         ?? [],
    chosenOption:    fields.chosenOption,
    expectedOutcome: fields.expectedOutcome ?? null,
    actualOutcome:   null,
    review:          null,
    lesson:          null,
    schemaVersion:   1,
    createdAt:       ts,
    resolvedAt:      null,
  };
}

/**
 * Creates a CreativeWork Life Object (§17 Creativity Architecture).
 *
 * @param {{
 *   title:              string,
 *   medium:             string,
 *   intent?:            string,
 *   practiceMinutes?:   number,
 *   skillsPracticed?:   string[],
 *   outputUrl?:         string,
 *   qualityAssessment?: { self: number, external?: number },
 *   feedback?:          string[],
 *   milestoneId?:       string,
 * }} fields
 */
export function createCreativeWork(fields) {
  return {
    id:                fields.id ?? generateLifeObjectId('creative_work'),
    type:              LIFE_OBJECT_TYPES_V8.CREATIVE_WORK,
    status:            LIFE_OBJECT_STATUSES.ACTIVE,
    title:             fields.title,
    medium:            fields.medium,
    intent:            fields.intent            ?? null,
    practiceMinutes:   fields.practiceMinutes   ?? null,
    skillsPracticed:   fields.skillsPracticed   ?? [],
    outputUrl:         fields.outputUrl          ?? null,
    qualityAssessment: fields.qualityAssessment  ?? null,
    feedback:          fields.feedback           ?? [],
    milestoneId:       fields.milestoneId        ?? null,
    schemaVersion:     1,
    createdAt:         new Date().toISOString(),
  };
}

/**
 * Creates an Observation Life Object (§18 Social/Interpersonal Architecture).
 *
 * @param {{
 *   content: string,
 *   tags?: string[],
 *   context?: string,
 * }} fields
 */
export function createObservation(fields) {
  return {
    id:            fields.id ?? generateLifeObjectId('observation'),
    type:          LIFE_OBJECT_TYPES_V8.OBSERVATION,
    status:        LIFE_OBJECT_STATUSES.ACTIVE,
    content:       fields.content,
    tags:          fields.tags ?? [],
    context:       fields.context ?? null,
    schemaVersion: 1,
    createdAt:     new Date().toISOString(),
  };
}

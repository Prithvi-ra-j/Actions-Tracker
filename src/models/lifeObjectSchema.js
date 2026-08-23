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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

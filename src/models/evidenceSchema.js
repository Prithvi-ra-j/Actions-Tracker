/**
 * Evidence schema factory (§11 Evidence Model).
 *
 * Evidence is a reasoned signal derived from facts.
 * Every evidence record must carry supportingFactIds so conclusions
 * are traceable back to the raw fact ledger (§76 UX Trust Requirements).
 *
 * Confidence reflects how much of the expected data window had known values.
 * Low confidence is a real, displayable state — it is not an error.
 */

const SCHEMA_VERSION = 1;

/** Valid domain values. */
export const EVIDENCE_DOMAINS = Object.freeze([
  'body',
  'knowledge',
  'strategy',
  'creativity',
  'social',
  'discipline',
]);

function generateId() {
  return `evid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

/**
 * Builds a complete Evidence record.
 *
 * @param {{
 *   id?:              string,
 *   domain:           'body'|'knowledge'|'strategy'|'creativity'|'social'|'discipline',
 *   signal:           string,     — e.g. 'habit_completion_rate', 'book_learning_depth'
 *   value:            number,
 *   unit?:            string,
 *   confidence:       number,     — 0–1; reflects data coverage, not certainty
 *   timeWindow:       { start: string, end: string },   — ISO 8601
 *   supportingFactIds: string[],  — must not be empty for meaningful evidence
 *   methodology:      {
 *     engineId:      string,
 *     engineVersion: string,
 *     formula?:      string,  — human-readable formula description
 *   },
 * }} fields
 * @returns {object}
 */
export function createEvidence(fields) {
  if (!EVIDENCE_DOMAINS.includes(fields.domain)) {
    throw new Error(
      `[evidenceSchema] Unknown domain: "${fields.domain}". Valid: ${EVIDENCE_DOMAINS.join(', ')}`
    );
  }
  if (typeof fields.confidence !== 'number' || fields.confidence < 0 || fields.confidence > 1) {
    throw new Error('[evidenceSchema] confidence must be a number between 0 and 1');
  }

  return {
    id:                fields.id ?? generateId(),
    schemaVersion:     SCHEMA_VERSION,
    domain:            fields.domain,
    signal:            fields.signal,
    value:             fields.value,
    unit:              fields.unit              ?? null,
    confidence:        fields.confidence,
    timeWindow:        fields.timeWindow,
    supportingFactIds: fields.supportingFactIds ?? [],
    methodology:       fields.methodology,
    createdAt:         now(),
  };
}

/**
 * ScoreProjection schema factory (§22 Scoring Architecture).
 *
 * A score is a projection from evidence — not the source of truth.
 * Scores are cacheable and rebuildable from their underlying evidence.
 *
 * Every ScoreProjection must store enough context to explain itself:
 *   - which domain
 *   - which time period
 *   - which component signals contributed
 *   - which engine produced it
 *   - what the confidence and coverage were
 *   - which evidence records support it
 *
 * Never store only `body = 78`. Store why it is 78.
 *
 * A failed projection must NEVER overwrite a valid prior projection (§115).
 */

const SCHEMA_VERSION = 1;

function generateId() {
  return `score_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

/**
 * Builds a complete ScoreProjection record.
 *
 * @param {{
 *   id?:                    string,
 *   domain:                 string,
 *   value:                  number,     — 0–100 clamped
 *   confidence:             number,     — 0–1
 *   coverage?:              number,     — 0–1, fraction of window with known data
 *   period:                 { start: string, end: string },
 *   components:             { signal: string, value: number, weight: number, contribution: number }[],
 *   methodology:            { engine: string, version: string },
 *   supportingEvidenceIds:  string[],
 *   scoreSource?:           'evidence'|'canonical',
 *   fallbackReason?:        string,
 *   warnings?:              string[],   — e.g. 'low coverage', 'stale data'
 * }} fields
 * @returns {object}
 */
export function createScoreProjection(fields) {
  if (typeof fields.value !== 'number') {
    throw new Error('[scoreSchema] value must be a number');
  }
  const clampedValue = Math.min(100, Math.max(0, Math.round(fields.value)));

  return {
    id:                   fields.id ?? generateId(),
    schemaVersion:        SCHEMA_VERSION,
    domain:               fields.domain,
    value:                clampedValue,
    confidence:           fields.confidence,
    coverage:             fields.coverage            ?? null,
    period:               fields.period,
    components:           fields.components          ?? [],
    methodology:          fields.methodology,
    supportingEvidenceIds: fields.supportingEvidenceIds ?? [],
    scoreSource:          fields.scoreSource         ?? 'canonical',
    fallbackReason:       fields.fallbackReason      ?? null,
    warnings:             fields.warnings            ?? [],
    generatedAt:          now(),
  };
}

/**
 * Returns a low-confidence placeholder projection used when evidence is insufficient.
 * This is a real state — not an error.
 *
 * @param {string} domain
 * @param {{ start: string, end: string }} period
 * @param {string} engineId
 * @param {string} engineVersion
 * @param {string} [reason]  — why the coverage is low
 * @returns {object}
 */
export function createLowCoverageProjection(domain, period, engineId, engineVersion, reason = 'insufficient data') {
  return createScoreProjection({
    domain,
    value:                0,
    confidence:           0,
    coverage:             0,
    period,
    components:           [],
    methodology:          { engine: engineId, version: engineVersion },
    supportingEvidenceIds: [],
    warnings:             [`low_coverage: ${reason}`],
  });
}

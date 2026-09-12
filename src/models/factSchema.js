/**
 * Fact schema factory (§10 Fact Ledger).
 *
 * Facts are the durable event ledger. They must be:
 *   - append-only
 *   - immutable once written
 *   - timestamped with both UTC and local time
 *   - source-attributed
 *   - timezone-aware
 *
 * CORRECTION POLICY (§10):
 *   Never silently rewrite historical facts.
 *   Append a correction fact with correctionOf = <original id>.
 *   Use FACT_TYPES.CORRECTION for the type of the correction fact.
 *
 * This factory is used by factsRepository internally to ensure
 * every fact conforms to the full schema.
 */

import { localDateStr, getLocalTimezone } from '../helpers/dateHelpers.js';

const SCHEMA_VERSION = 1;

/**
 * Valid source types (§10).
 * @type {readonly string[]}
 */
export const FACT_SOURCE_TYPES = Object.freeze([
  'manual',
  'voice',
  'health_connect',
  'fitness',
  'finance',
  'chess',
  'book',
  'system',
]);

/**
 * Builds a complete, validated Fact record ready to be written to IndexedDB.
 *
 * @param {string} id                 — pre-generated unique ID
 * @param {{
 *   type:           string,          — fact type string, use FACT_TYPES constants
 *   objectId?:      string,          — ID of the Life Object this fact belongs to
 *   value?:         unknown,         — the primary payload (number, string, object)
 *   meta?:          object,          — supplementary structured payload
 *   context?: {                      — situational context at time of capture
 *     energy?:    number,            — 1–5
 *     mood?:      number,            — 1–5
 *     stress?:    number,            — 1–5
 *     location?:  string,
 *     sleep?:     number,            — hours
 *   },
 *   source: {
 *     type:             string,      — one of FACT_SOURCE_TYPES
 *     connectorId?:     string,
 *     externalId?:      string,
 *     externalVersion?: string,
 *   },
 *   occurredAt?:    string,          — ISO 8601 (defaults to now)
 *   correctionOf?:  string,          — ID of the fact this corrects
 *   supersedes?:    string,          — ID of the fact this supersedes
 * }} fields
 * @returns {object} A complete Fact record
 */
export function buildFact(id, fields) {
  const now = new Date();
  const tz = getLocalTimezone();

  if (!fields.source || !fields.source.type) {
    throw new Error('[factSchema] fact.source.type is required');
  }
  if (!FACT_SOURCE_TYPES.includes(fields.source.type)) {
    throw new Error(
      `[factSchema] Unknown source type: "${fields.source.type}". ` +
      `Valid: ${FACT_SOURCE_TYPES.join(', ')}`
    );
  }

  const occurredAtDate = fields.occurredAt ? new Date(fields.occurredAt) : now;

  return {
    id,
    schemaVersion:  SCHEMA_VERSION,
    type:           fields.type,
    objectId:       fields.objectId       ?? null,
    value:          fields.value          ?? null,
    meta:           fields.meta           ?? {},
    context:        fields.context        ?? {},
    source: {
      type:             fields.source.type,
      connectorId:      fields.source.connectorId     ?? null,
      externalId:       fields.source.externalId      ?? null,
      externalVersion:  fields.source.externalVersion ?? null,
    },
    occurredAt:     occurredAtDate.toISOString(),
    recordedAt:     now.toISOString(),
    localDate:      localDateStr(occurredAtDate),
    timezone:       tz,
    correctionOf:   fields.correctionOf   ?? null,
    supersedes:     fields.supersedes     ?? null,
  };
}

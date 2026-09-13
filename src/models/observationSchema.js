/**
 * Observation schema factory (§18 Social Architecture).
 */

import { SCHEMA_VERSION } from '../version.js';

export function buildObservation(fields) {
  return {
    id: fields.id,
    schemaVersion: SCHEMA_VERSION,
    context: fields.context ?? '',
    observation: fields.observation ?? '',
    tags: fields.tags ?? [],
    createdAt: fields.createdAt,
    updatedAt: fields.updatedAt,
  };
}

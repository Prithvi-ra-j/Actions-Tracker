/**
 * Experiment schema factory (§18 Social Architecture).
 */

import { SCHEMA_VERSION } from '../version.js';

export function buildExperiment(fields) {
  return {
    id: fields.id,
    schemaVersion: SCHEMA_VERSION,
    domain: fields.domain ?? 'social',
    hypothesis: fields.hypothesis ?? '',
    protocol: fields.protocol ?? '',
    result: fields.result ?? null,
    conclusion: fields.conclusion ?? null,
    createdAt: fields.createdAt,
    updatedAt: fields.updatedAt,
  };
}

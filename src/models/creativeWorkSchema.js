/**
 * CreativeWork schema factory (§17 Creativity Architecture).
 */

import { SCHEMA_VERSION } from '../version.js';

export function buildCreativeWork(fields) {
  return {
    id: fields.id,
    schemaVersion: SCHEMA_VERSION,
    title: fields.title ?? '',
    medium: fields.medium ?? 'other',
    description: fields.description ?? '',
    url: fields.url ?? null,
    createdAt: fields.createdAt,
    updatedAt: fields.updatedAt,
  };
}

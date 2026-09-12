/**
 * Relation repository (§58 Relation Model).
 *
 * Relations link any two entities without duplicating the underlying objects.
 * This allows a single fact or learning to contribute to multiple domains.
 *
 * Example: Reading Meditations → Learning → applied in social + strategy + discipline
 * without duplicating the underlying fact.
 */

import { dbGet, dbPut, dbGetAll, dbGetAllByIndex } from './db.js';

const STORE = 'relations';
const SCHEMA_VERSION = 1;

/** @type {readonly string[]} */
export const RELATION_TYPES = [
  'supports',
  'derived_from',
  'related_to',
  'caused_by',
  'contradicts',
  'applied_in',
  'contributes_to',
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateId() {
  return `rel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

// ─── Write ─────────────────────────────────────────────────────────────────────

/**
 * Creates a directional relation between two entities.
 *
 * @param {string} fromId
 * @param {string} toId
 * @param {'supports'|'derived_from'|'related_to'|'caused_by'|'contradicts'|'applied_in'|'contributes_to'} type
 * @param {number} [confidence]  — 0–1, optional
 * @returns {Promise<string>} The generated relation ID
 */
export async function addRelation(fromId, toId, type, confidence = null) {
  if (!RELATION_TYPES.includes(type)) {
    throw new Error(`[relationRepository] Unknown relation type: "${type}". Valid: ${RELATION_TYPES.join(', ')}`);
  }
  const record = {
    id:            generateId(),
    schemaVersion: SCHEMA_VERSION,
    fromId,
    toId,
    type,
    confidence:    confidence ?? null,
    createdAt:     now(),
  };
  await dbPut(STORE, record);
  return record.id;
}

// ─── Read ──────────────────────────────────────────────────────────────────────

/**
 * Returns a single relation by ID, or null.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getRelation(id) {
  return dbGet(STORE, id);
}

/**
 * Returns all relations originating from a given entity.
 * @param {string} fromId
 * @returns {Promise<object[]>}
 */
export async function getRelationsFrom(fromId) {
  return dbGetAllByIndex(STORE, 'fromId', fromId);
}

/**
 * Returns all relations pointing to a given entity.
 * @param {string} toId
 * @returns {Promise<object[]>}
 */
export async function getRelationsTo(toId) {
  return dbGetAllByIndex(STORE, 'toId', toId);
}

/**
 * Returns all relations between two specific entities (both directions).
 * @param {string} idA
 * @param {string} idB
 * @returns {Promise<object[]>}
 */
export async function getRelationsBetween(idA, idB) {
  const all = await dbGetAll(STORE);
  return all.filter(r =>
    (r.fromId === idA && r.toId === idB) ||
    (r.fromId === idB && r.toId === idA)
  );
}

/**
 * Returns all relations of a given type.
 * @param {string} type
 * @returns {Promise<object[]>}
 */
export async function getRelationsByType(type) {
  const all = await dbGetAll(STORE);
  return all.filter(r => r.type === type);
}

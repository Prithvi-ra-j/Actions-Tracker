/**
 * Learning repository (§14 Learning Architecture).
 *
 * Learning is a first-class entity — distinct from books.
 * Books are sources. Learnings are the intellectual assets extracted from them.
 * Application of a learning is stronger evidence than the learning itself.
 *
 * Mastery levels track progression from exposure → impact.
 */

import { dbGet, dbPut, dbGetAll, dbGetAllByIndex } from './db.js';

const STORE = 'learnings';
const SCHEMA_VERSION = 1;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateId() {
  return `learning_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

// ─── Write ─────────────────────────────────────────────────────────────────────

/**
 * Creates and persists a new Learning record.
 *
 * @param {{
 *   concept:             string,    — the idea or principle captured
 *   sourceId?:           string,    — ID of the source (e.g. book ID)
 *   sourceType?:         'book'|'video'|'article'|'podcast'|'conversation'|'course'|'social'|'experience'|'other',
 *   explanation:         string,    — in your own words
 *   whyItMatters?:       string,
 *   personalApplication?: string,  — how you intend to or have applied this
 *   examples?:           string[],
 *   tags?:               string[],
 *   relatedLearningIds?: string[],
 *   mastery?:            { exposure: number, understanding: number, retention: number, synthesis: number, application: number, impact: number },
 * }} fields
 * @returns {Promise<string>} The generated learning ID
 */
export async function addLearning(fields) {
  const ts = now();
  const record = {
    id:                  fields.id ?? generateId(),
    schemaVersion:       SCHEMA_VERSION,
    concept:             fields.concept,
    sourceId:            fields.sourceId            ?? null,
    sourceType:          fields.sourceType           ?? 'other',
    explanation:         fields.explanation,
    whyItMatters:        fields.whyItMatters         ?? null,
    personalApplication: fields.personalApplication  ?? null,
    examples:            fields.examples             ?? [],
    tags:                fields.tags                 ?? [],
    relatedLearningIds:  fields.relatedLearningIds   ?? [],
    // Mastery: 0–1 scale. 0 = not started, 1 = fully demonstrated.
    mastery: fields.mastery ?? {
      exposure:      0,
      understanding: 0,
      retention:     0,
      synthesis:     0,
      application:   0,
      impact:        0,
    },
    createdAt: ts,
    updatedAt: ts,
  };
  await dbPut(STORE, record);
  return record.id;
}

/**
 * Updates specific fields on an existing learning.
 * @param {string} id
 * @param {Partial<object>} fields
 * @returns {Promise<void>}
 */
export async function updateLearning(id, fields) {
  const existing = await dbGet(STORE, id);
  if (!existing) throw new Error(`[learningRepository] Learning not found: ${id}`);
  await dbPut(STORE, { ...existing, ...fields, id, updatedAt: now() });
}

/**
 * Updates mastery levels for a learning. Merges into existing mastery object.
 * @param {string} id
 * @param {{ exposure?: number, understanding?: number, retention?: number, synthesis?: number, application?: number, impact?: number }} masteryFields
 * @returns {Promise<void>}
 */
export async function updateMastery(id, masteryFields) {
  const existing = await dbGet(STORE, id);
  if (!existing) throw new Error(`[learningRepository] Learning not found: ${id}`);
  await dbPut(STORE, {
    ...existing,
    id,
    mastery:   { ...existing.mastery, ...masteryFields },
    updatedAt: now(),
  });
}

// ─── Read ──────────────────────────────────────────────────────────────────────

/**
 * Returns a single learning by ID, or null.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getLearning(id) {
  return dbGet(STORE, id);
}

/**
 * Returns all learnings, sorted newest first.
 * @returns {Promise<object[]>}
 */
export async function getAllLearnings() {
  const all = await dbGetAll(STORE);
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Returns all learnings from a specific source (e.g. a book).
 * @param {string} sourceId
 * @returns {Promise<object[]>}
 */
export async function getLearningsBySource(sourceId) {
  const all = await dbGetAllByIndex(STORE, 'sourceId', sourceId);
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Returns all learnings of a given source type.
 * @param {string} sourceType
 * @returns {Promise<object[]>}
 */
export async function getLearningsBySourceType(sourceType) {
  return dbGetAllByIndex(STORE, 'sourceType', sourceType);
}

/**
 * Returns learnings that have application evidence (personalApplication is set).
 * These are stronger evidence than passive exposure learnings.
 * @returns {Promise<object[]>}
 */
export async function getAppliedLearnings() {
  const all = await dbGetAll(STORE);
  return all.filter(l => l.personalApplication && l.personalApplication.trim().length > 0);
}

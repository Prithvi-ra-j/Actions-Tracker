/**
 * Memory repository (§28 Memory Architecture).
 *
 * Three memory classes:
 *   working   — today, current goals, current habits, recent context, current conversation
 *   episodic  — decisions, experiments, failures, breakthroughs, major changes, audits
 *   semantic  — values, preferences, strengths, weaknesses, skills, recurring patterns, beliefs
 *
 * Semantic memories should reference supporting facts where possible.
 * The user is the final authority on semantic truth — they can confirm or reject any memory.
 * Rejected memories are retained (status='rejected') for auditability, never hard-deleted.
 *
 * AI-proposed memories enter with status='proposed'. They only become authoritative
 * when the user confirms them (status='confirmed').
 */

import { dbGet, dbPut, dbGetAll, dbGetAllByIndex } from './db.js';

const STORE = 'memories';
const SCHEMA_VERSION = 1;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateId() {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

// ─── Write ─────────────────────────────────────────────────────────────────────

/**
 * Creates a new Memory record.
 *
 * @param {{
 *   type:               'working'|'episodic'|'semantic',
 *   content:            string,    — the memory text
 *   confidence?:        number,    — 0–1
 *   status?:            'proposed'|'confirmed'|'rejected'|'resolved',
 *   supportingFactIds?: string[],
 *   source?:            'user'|'ai'|'system',
 *   tags?:              string[],
 *   lastReviewedAt?:    string,
 * }} fields
 * @returns {Promise<string>} The generated memory ID
 */
export async function addMemory(fields) {
  const ts = now();
  const record = {
    id:                fields.id ?? generateId(),
    schemaVersion:     SCHEMA_VERSION,
    type:              fields.type,
    content:           fields.content,
    confidence:        fields.confidence        ?? null,
    status:            fields.status            ?? 'proposed',
    supportingFactIds: fields.supportingFactIds ?? [],
    source:            fields.source            ?? 'user',
    tags:              fields.tags              ?? [],
    lastReviewedAt:    fields.lastReviewedAt    ?? null,
    createdAt:         ts,
    updatedAt:         ts,
  };
  await dbPut(STORE, record);
  return record.id;
}

/**
 * Confirms a memory. The user is accepting it as accurate.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function confirmMemory(id) {
  const existing = await dbGet(STORE, id);
  if (!existing) throw new Error(`[memoryRepository] Memory not found: ${id}`);
  await dbPut(STORE, {
    ...existing,
    status:         'confirmed',
    lastReviewedAt: now(),
    updatedAt:      now(),
  });
}

/**
 * Rejects a memory. The user is marking it as inaccurate.
 * The record is RETAINED with status='rejected' for auditability.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function rejectMemory(id) {
  const existing = await dbGet(STORE, id);
  if (!existing) throw new Error(`[memoryRepository] Memory not found: ${id}`);
  await dbPut(STORE, {
    ...existing,
    status:         'rejected',
    lastReviewedAt: now(),
    updatedAt:      now(),
  });
}

/**
 * Marks a memory as resolved (e.g. the situation it described has concluded).
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function resolveMemory(id) {
  const existing = await dbGet(STORE, id);
  if (!existing) throw new Error(`[memoryRepository] Memory not found: ${id}`);
  await dbPut(STORE, { ...existing, status: 'resolved', updatedAt: now() });
}

// ─── Read ──────────────────────────────────────────────────────────────────────

/**
 * Returns a single memory by ID, or null.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getMemory(id) {
  return dbGet(STORE, id);
}

/**
 * Returns all memories, sorted by createdAt ascending.
 * @returns {Promise<object[]>}
 */
export async function getAllMemories() {
  const all = await dbGetAll(STORE);
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Returns confirmed semantic memories — stable identity / pattern / belief records.
 * These are the primary context source for Jarvis (§27 AI Context Retrieval).
 * @returns {Promise<object[]>}
 */
export async function getSemanticMemories() {
  const all = await dbGetAll(STORE);
  return all.filter(m => m.type === 'semantic' && m.status === 'confirmed');
}

/**
 * Returns all episodic memories (decisions, experiments, breakthroughs, failures).
 * @returns {Promise<object[]>}
 */
export async function getEpisodicMemories() {
  const all = await dbGetAll(STORE);
  return all.filter(m => m.type === 'episodic');
}

/**
 * Returns memories pending user review (status='proposed').
 * @returns {Promise<object[]>}
 */
export async function getProposedMemories() {
  return dbGetAllByIndex(STORE, 'status', 'proposed');
}

/**
 * Decision Repository (§16 Strategy Architecture).
 */

import { dbGet, dbPut, dbGetAll, dbDelete } from './db.js';
import { buildDecision } from '../models/decisionSchema.js';

const STORE = 'decisions';

function generateId() {
  return `dec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

/**
 * Creates a new Decision.
 */
export async function addDecision(fields) {
  const ts = now();
  const decision = buildDecision({
    ...fields,
    id: fields.id ?? generateId(),
    createdAt: ts,
    updatedAt: ts,
  });
  await dbPut(STORE, decision);
  return decision.id;
}

/**
 * Retrieves a Decision by ID.
 */
export async function getDecision(id) {
  return await dbGet(STORE, id);
}

/**
 * Retrieves all Decisions.
 */
export async function getAllDecisions() {
  return await dbGetAll(STORE);
}

/**
 * Updates a Decision.
 */
export async function updateDecision(id, updates) {
  const existing = await dbGet(STORE, id);
  if (!existing) throw new Error(`Decision ${id} not found.`);
  
  const updated = {
    ...existing,
    ...updates,
    updatedAt: now()
  };
  
  await dbPut(STORE, updated);
}

/**
 * Deletes a Decision.
 */
export async function deleteDecision(id) {
  await dbDelete(STORE, id);
}

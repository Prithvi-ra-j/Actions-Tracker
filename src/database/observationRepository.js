/**
 * Observation Repository (§18 Social Architecture).
 */

import { dbGet, dbPut, dbGetAll, dbDelete } from './db.js';
import { buildObservation } from '../models/observationSchema.js';

const STORE = 'observations';

function generateId() {
  return `obs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

export async function addObservation(fields) {
  const ts = now();
  const record = buildObservation({
    ...fields,
    id: fields.id ?? generateId(),
    createdAt: ts,
    updatedAt: ts,
  });
  await dbPut(STORE, record);
  return record.id;
}

export async function getObservation(id) {
  return await dbGet(STORE, id);
}

export async function getAllObservations() {
  return await dbGetAll(STORE);
}

export async function updateObservation(id, updates) {
  const existing = await dbGet(STORE, id);
  if (!existing) throw new Error(`Observation ${id} not found.`);
  
  const updated = {
    ...existing,
    ...updates,
    updatedAt: now()
  };
  
  await dbPut(STORE, updated);
}

export async function deleteObservation(id) {
  await dbDelete(STORE, id);
}

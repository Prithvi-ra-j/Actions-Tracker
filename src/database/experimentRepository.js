/**
 * Experiment Repository (§18 Social Architecture).
 */

import { dbGet, dbPut, dbGetAll, dbDelete } from './db.js';
import { buildExperiment } from '../models/experimentSchema.js';

const STORE = 'experiments';

function generateId() {
  return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

export async function addExperiment(fields) {
  const ts = now();
  const record = buildExperiment({
    ...fields,
    id: fields.id ?? generateId(),
    createdAt: ts,
    updatedAt: ts,
  });
  await dbPut(STORE, record);
  return record.id;
}

export async function getExperiment(id) {
  return await dbGet(STORE, id);
}

export async function getAllExperiments() {
  return await dbGetAll(STORE);
}

export async function updateExperiment(id, updates) {
  const existing = await dbGet(STORE, id);
  if (!existing) throw new Error(`Experiment ${id} not found.`);
  
  const updated = {
    ...existing,
    ...updates,
    updatedAt: now()
  };
  
  await dbPut(STORE, updated);
}

export async function deleteExperiment(id) {
  await dbDelete(STORE, id);
}

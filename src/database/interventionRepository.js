import { dbGet, dbPut, dbGetAll, dbGetAllByIndex } from './db.js';
import { createIntervention, closeIntervention } from '../core/ai/interventionLearning.js';

const STORE = 'interventions';

export async function addIntervention(fields) {
  const record = createIntervention(fields);
  await dbPut(STORE, record);
  return record;
}

export async function getIntervention(id) {
  return dbGet(STORE, id);
}

export async function updateIntervention(id, fields) {
  const existing = await getIntervention(id);
  if (!existing) throw new Error('Intervention not found: ' + id);
  const updated = { ...existing, ...fields, updatedAt: new Date().toISOString() };
  await dbPut(STORE, updated);
  return updated;
}

export async function completeIntervention(id, evaluation) {
  const existing = await getIntervention(id);
  if (!existing) throw new Error('Intervention not found: ' + id);
  const closed = closeIntervention(existing, evaluation);
  await dbPut(STORE, closed);
  return closed;
}

export async function getAllInterventions() {
  return dbGetAll(STORE);
}

export async function getActiveInterventions() {
  return dbGetAllByIndex(STORE, 'status', 'active');
}

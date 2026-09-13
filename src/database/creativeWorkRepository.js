/**
 * CreativeWork Repository (§17 Creativity Architecture).
 */

import { dbGet, dbPut, dbGetAll, dbDelete } from './db.js';
import { buildCreativeWork } from '../models/creativeWorkSchema.js';

const STORE = 'creativeWorks';

function generateId() {
  return `cw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

export async function addCreativeWork(fields) {
  const ts = now();
  const record = buildCreativeWork({
    ...fields,
    id: fields.id ?? generateId(),
    createdAt: ts,
    updatedAt: ts,
  });
  await dbPut(STORE, record);
  return record.id;
}

export async function getCreativeWork(id) {
  return await dbGet(STORE, id);
}

export async function getAllCreativeWorks() {
  return await dbGetAll(STORE);
}

export async function updateCreativeWork(id, updates) {
  const existing = await dbGet(STORE, id);
  if (!existing) throw new Error(`CreativeWork ${id} not found.`);
  
  const updated = {
    ...existing,
    ...updates,
    updatedAt: now()
  };
  
  await dbPut(STORE, updated);
}

export async function deleteCreativeWork(id) {
  await dbDelete(STORE, id);
}

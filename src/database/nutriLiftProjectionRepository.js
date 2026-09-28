import { dbGet, dbGetAll, dbPut } from './db.js';

const STORE = 'nutriLiftProjections';

export async function getNutriLiftProjection(id) {
  return dbGet(STORE, id);
}

export async function getAllNutriLiftProjections() {
  return dbGetAll(STORE);
}

export async function upsertNutriLiftProjection(record) {
  return dbPut(STORE, {
    ...record,
    sourceApp: 'nutrilift',
    updatedAt: new Date().toISOString(),
  });
}

export async function markNutriLiftProjectionRetracted(id, metadata = {}) {
  const existing = await getNutriLiftProjection(id);
  return dbPut(STORE, {
    ...(existing || { id }),
    sourceApp: 'nutrilift',
    retracted: true,
    retractedAt: metadata.retractedAt || new Date().toISOString(),
    sourceUpdatedAt: metadata.sourceUpdatedAt || existing?.sourceUpdatedAt || null,
    externalId: existing?.externalId || metadata.externalId || null,
    recordType: existing?.recordType || metadata.recordType || null,
    updatedAt: new Date().toISOString(),
  });
}

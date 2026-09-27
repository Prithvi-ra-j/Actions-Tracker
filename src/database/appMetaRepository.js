/**
 * Application metadata repository.
 *
 * Persists installation-level and migration-level state in IndexedDB so the app
 * can remember facts like the last successful DB version, the active install
 * identity, and the latest migration timestamps without depending on session
 * memory or a backend.
 */

import { dbGet, dbPut, dbGetAll } from './db.js';

const STORE = 'appMeta';

function normalizeValue(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return JSON.stringify(value);
  }
  return JSON.stringify(value ?? null);
}

function deserializeValue(raw) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed;
    } catch {
      return raw;
    }
  }
  return raw;
}

export async function getAppMeta(key, defaultValue = null) {
  const record = await dbGet(STORE, key);
  if (!record) return defaultValue;
  return deserializeValue(record.value ?? defaultValue);
}

export async function setAppMeta(key, value) {
  await dbPut(STORE, {
    key,
    value: normalizeValue(value),
    updatedAt: new Date().toISOString(),
  });
  return value;
}

export async function getAllAppMeta() {
  const rows = await dbGetAll(STORE);
  const entries = {};
  for (const row of rows) {
    entries[row.key] = deserializeValue(row.value);
  }
  return entries;
}

export async function deleteAppMeta(key) {
  const record = await dbGet(STORE, key);
  if (!record) return false;
  await dbPut(STORE, { ...record, deleted: true });
  return true;
}

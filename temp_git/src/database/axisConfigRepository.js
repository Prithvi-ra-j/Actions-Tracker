import { dbGet, dbPut, dbGetAll } from './db.js';

const DEFAULT_CONFIGS = [
  { axis: 'strength', expectedPerWeek: 4, paused: false, hasConsistencyTerm: true },
  { axis: 'discipline', expectedPerWeek: 7, paused: false, hasConsistencyTerm: true }, // tied to body checkbox
  { axis: 'knowledge', expectedPerWeek: 7, paused: false, hasConsistencyTerm: true },
  { axis: 'wisdom', expectedPerWeek: null, paused: false, hasConsistencyTerm: false }, // no consistency term
  { axis: 'creativity', expectedPerWeek: 1, paused: false, hasConsistencyTerm: true },
  { axis: 'strategy', expectedPerWeek: 7, paused: true, hasConsistencyTerm: true }     // paused by default until a book is started
];

export async function initAxisConfigs() {
  const existing = await dbGetAll('axis_config');
  if (existing.length === 0) {
    for (const config of DEFAULT_CONFIGS) {
      await dbPut('axis_config', config);
    }
  }
}

export async function getAxisConfig(axis) {
  return await dbGet('axis_config', axis);
}

export async function getAllAxisConfigs() {
  return await dbGetAll('axis_config');
}

export async function updateAxisConfig(axis, updates) {
  const current = await getAxisConfig(axis);
  if (current) {
    await dbPut('axis_config', { ...current, ...updates });
  }
}

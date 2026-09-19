/**
 * One-time migration from the original localStorage structure to IndexedDB.
 *
 * The old app stored data under these localStorage keys:
 *   yearEndGoals.daily    — { "YYYY-MM-DD": { body, philosophy, art, history } }
 *   yearEndGoals.checked  — { "gi-ti": boolean }
 *   yearEndGoals.mChecked — { "m-mi-ti": boolean }
 *
 * Migration runs exactly once, on first launch of the new version.
 * A settings flag 'migrated_from_localStorage' is set to '1' when complete.
 *
 * If migration fails, it is retried on the next launch (the flag is only set
 * after all data has been successfully written).
 *
 * localStorage is NOT deleted after migration to preserve a safety backup.
 */

import { addLog } from './logsRepository.js';
import { dbPut, dbGetAll, dbDelete } from './db.js';
import { setMilestoneCheck } from './milestonesRepository.js';
import { getSetting, setSetting } from './settingsRepository.js';
import { GOALS } from '../constants.js';
import { upsertLifeObject } from './lifeObjectsRepository.js';

/**
 * Attempts to migrate existing localStorage data into IndexedDB.
 * Safe to call on every launch — exits immediately if already migrated.
 */
export async function migrateFromLocalStorage() {
  // Bail out early if already migrated
  const alreadyDone = await getSetting('migrated_from_localStorage');
  if (alreadyDone === '1') return;

  let migratedAny = false;

  try {
    // ── Daily records ──────────────────────────────────────────────────────────
    const dailyRaw = safeGet('yearEndGoals.daily');
    if (dailyRaw) {
      const daily = JSON.parse(dailyRaw);
      for (const [date, tasks] of Object.entries(daily)) {
        if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        const taskToAxis = {
          body: 'discipline',
          philosophy: 'knowledge',
          art: 'creativity',
          history: 'strategy'
        };
        for (const [key, done] of Object.entries(tasks)) {
           if (done && taskToAxis[key]) {
              await addLog({
                axis: taskToAxis[key],
                type: 'daily_checkbox',
                value: 1,
                date: date,
                meta: { task: key }
              });
           }
        }
        migratedAny = true;
      }
    }

    // ── Goal checks ────────────────────────────────────────────────────────────
    const checkedRaw = safeGet('yearEndGoals.checked');
    if (checkedRaw) {
      const checked = JSON.parse(checkedRaw);
      for (const [key, value] of Object.entries(checked)) {
        await dbPut('goals', { key, value: value ? 1 : 0 });
        migratedAny = true;
      }
    }

    // ── Milestone checks ───────────────────────────────────────────────────────
    const mCheckedRaw = safeGet('yearEndGoals.mChecked');
    if (mCheckedRaw) {
      const mChecked = JSON.parse(mCheckedRaw);
      for (const [key, value] of Object.entries(mChecked)) {
        await setMilestoneCheck(key, !!value);
        migratedAny = true;
      }
    }

    // ── Mark complete ──────────────────────────────────────────────────────────
    await setSetting('migrated_from_localStorage', '1');
    if (migratedAny) {
      console.log('[Migration] localStorage → IndexedDB migration complete.');
    }
  } catch (err) {
    // Don't mark complete — will retry next launch
    console.error('[Migration] Failed (will retry on next launch):', err);
  }
}


// ─── Helper ────────────────────────────────────────────────────────────────────

function safeGet(key) {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

// ─── v1.2: Seed hardcoded goals as Life Objects ────────────────────────────────

/**
 * One-time migration: writes the 4 hardcoded goal definitions from constants.js
 * into the `lifeObjects` store as real Goal records with stable, deterministic IDs.
 *
 * The IDs are derived from the domain name so they stay consistent across
 * re-runs — this migration is idempotent (upsert, not insert-only).
 *
 * Migration flag: 'migrated_hardcoded_goals_v1' — set after all 4 goals written.
 */
export async function migrateHardcodedGoalsToLifeObjects() {
  const alreadyDone = await getSetting('migrated_hardcoded_goals_v1');
  if (alreadyDone === '1') return;

  try {
    for (const g of GOALS) {
      // Stable ID derived from domain — consistent across re-runs
      const id = `goal_hardcoded_${g.domain.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      await upsertLifeObject({
        id,
        type:      'goal',
        status:    'active',
        domain:    g.domain,
        label:     g.label,
        color:     g.color,
        icon:      g.icon,
        start:     g.start,
        end:       g.end,
        targets:   g.targets,
        proof:     g.proof,
        fear:      g.fear,
        // Mark as seeded so UI can distinguish hardcoded vs user-created goals
        _seededFromConstants: true,
      });
    }
    await setSetting('migrated_hardcoded_goals_v1', '1');
    console.log('[Migration] Hardcoded goals → Life Objects migration complete.');
  } catch (err) {
    console.error('[Migration] migrateHardcodedGoalsToLifeObjects failed (will retry):', err);
  }
}

// ─── v2.0: Migrate Axis Vocabulary (strength->body, wisdom->strategy) ────────────

/**
 * One-time migration: updates existing logs, questBoard, and axis_config
 * records from the old vocabulary ('strength', 'wisdom') to the new
 * vocabulary ('body', 'strategy').
 *
 * Migration flag: 'migrated_axis_vocab_v2'
 */
export async function migrateAxisVocabulary() {
  const alreadyDone = await getSetting('migrated_axis_vocab_v2');
  if (alreadyDone === '1') return;

  try {
    let migratedAny = false;
    
    // 1. Logs store
    const allLogs = await dbGetAll('logs');
    for (const log of allLogs) {
      if (log.axis === 'strength') {
        await dbPut('logs', { ...log, axis: 'body' });
        migratedAny = true;
      } else if (log.axis === 'wisdom') {
        await dbPut('logs', { ...log, axis: 'strategy' });
        migratedAny = true;
      }
    }

    // 2. questBoard store
    const allQuests = await dbGetAll('questBoard');
    for (const quest of allQuests) {
      if (quest.axis === 'strength') {
        const newQuest = { ...quest, axis: 'body' };
        if (newQuest.id.includes('strength')) {
          newQuest.id = newQuest.id.replace('strength', 'body');
          await dbPut('questBoard', newQuest);
          await dbDelete('questBoard', quest.id);
        } else {
          await dbPut('questBoard', newQuest);
        }
        migratedAny = true;
      } else if (quest.axis === 'wisdom') {
        const newQuest = { ...quest, axis: 'strategy' };
        if (newQuest.id.includes('wisdom')) {
          newQuest.id = newQuest.id.replace('wisdom', 'strategy');
          await dbPut('questBoard', newQuest);
          await dbDelete('questBoard', quest.id);
        } else {
          await dbPut('questBoard', newQuest);
        }
        migratedAny = true;
      }
    }

    // 3. axis_config store
    const allConfigs = await dbGetAll('axis_config');
    for (const config of allConfigs) {
      if (config.axis === 'strength') {
        await dbPut('axis_config', { ...config, axis: 'body' });
        await dbDelete('axis_config', 'strength');
        migratedAny = true;
      } else if (config.axis === 'wisdom') {
        await dbPut('axis_config', { ...config, axis: 'strategy' });
        await dbDelete('axis_config', 'wisdom');
        migratedAny = true;
      }
    }

    await setSetting('migrated_axis_vocab_v2', '1');
    if (migratedAny) {
      console.log('[Migration] Axis vocabulary (strength->body, wisdom->strategy) complete.');
    }
  } catch (err) {
    console.error('[Migration] migrateAxisVocabulary failed (will retry on next launch):', err);
  }
}

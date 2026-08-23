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

import { saveDailyRecord } from './dailyRepository.js';
import { setGoalCheck } from './goalsRepository.js';
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
        await saveDailyRecord(date, {
          body:        !!tasks.body,
          philosophy:  !!tasks.philosophy,
          art:         !!tasks.art,
          history:     !!tasks.history,
        });
        migratedAny = true;
      }
    }

    // ── Goal checks ────────────────────────────────────────────────────────────
    const checkedRaw = safeGet('yearEndGoals.checked');
    if (checkedRaw) {
      const checked = JSON.parse(checkedRaw);
      for (const [key, value] of Object.entries(checked)) {
        await setGoalCheck(key, !!value);
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

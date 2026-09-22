/**
 * Single source of truth for the app version.
 *
 * Versioning scheme: Level.Phase.Patch.Hotfix.
 * See VERSIONING.md at the repo root for the full definition.
 *
 * Rules (short form):
 *   Level — bumps only on a schema-breaking change (new store keyPaths, removed stores,
 *            renamed fact types that break existing derived state)
 *   Phase — bumps when a feature is added within a Level (no schema break)
 *   Patch — bumps on a bugfix with no new capability
 *   Hotfix — bumps for a release-level correction within the same patch
 *
 * Git tags mirror the same number, applied AFTER the gate clears (round-trip
 * test verified), not at the point code merges.
 *
 * Current version: 1.5.1.1
 *   Level 1 complete: ledger (facts + lifeObjects), Self Model, Onboarding.
 *   NOT cleared: v2 gate (self-model not filled with real answers on real data),
 *   v3 gate (RPG/evidence spikes not run 3 weeks on real data).
 *
 * SCHEMA_VERSION tracks the shape of the exported JSON — bump when any store's
 * record shape changes in a way that would make old exports unreadable.
 */

export const APP_VERSION    = '1.5.1.1';
export const LEVEL          = 1;
export const PHASE          = '1.5';
export const PATCH          = 1;
export const HOTFIX         = 1;
export const SCHEMA_VERSION = 1;

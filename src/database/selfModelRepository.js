/**
 * Self Model repository (v2.1–v2.4 / §3–§6).
 *
 * The selfModel store is a singleton: one record per user, keyed 'primary'.
 * It holds all four v2 sub-models in one document to make reads cheap and
 * atomic — the whole model is loaded once at boot and written back on any change.
 *
 * Record shape:
 * {
 *   id: 'primary',
 *   schemaVersion: 1,
 *   updatedAt: ISO string,
 *
 *   // §3 Self Model — who you are
 *   identity: {
 *     name?: string,
 *     oneLiner?: string,         — one sentence: "I am …"
 *     roles: string[],           — e.g. ['builder', 'student', 'athlete']
 *     values: string[],          — e.g. ['discipline', 'honesty', 'craft']
 *     strengths: string[],
 *     constraints: string[],     — real limits (time, health, context)
 *     principles: string[],      — operating rules you've committed to
 *   },
 *
 *   // §4 Current State Model — where you are now, per dimension
 *   // Each dimension: { value: 0–100, confidence: 0–1, evidence: string, lastUpdated: ISO }
 *   currentState: {
 *     [dimension: string]: { value: number, confidence: number, evidence: string, lastUpdated: string }
 *   },
 *
 *   // §5 Desired Self Model — where you want to be
 *   desiredSelf: {
 *     vision?: string,           — narrative: "In 1–3 years, I am …"
 *     dimensions: {
 *       [dimension: string]: { targetValue: number, why: string, timeframe: string }
 *     }
 *   },
 *
 *   // §6 Gap Model — computed by gapEngine.js, stored for display
 *   gaps: {
 *     [dimension: string]: { delta: number, priority: 'high'|'medium'|'low', note: string }
 *   },
 *
 *   // §9 Baseline priors — initial estimates before real evidence accumulates
 *   priors: {
 *     [dimension: string]: { value: number, setAt: ISO, decayTarget: number }
 *   },
 *
 *   // Onboarding completion tracking
 *   onboardingCompletedAt?: string,  — ISO, null if not yet complete
 *   onboardingVersion: number,       — bump when onboarding flow changes shape
 * }
 */

import { dbGet, dbPut } from './db.js';

const STORE = 'selfModel';
const PRIMARY_KEY = 'primary';
const SCHEMA_VERSION = 1;

// ─── Default / empty model ─────────────────────────────────────────────────────

export function createEmptySelfModel() {
  return {
    id: PRIMARY_KEY,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    identity: {
      name: '',
      oneLiner: '',
      roles: [],
      values: [],
      strengths: [],
      constraints: [],
      principles: [],
    },
    currentState: {},
    desiredSelf: {
      vision: '',
      dimensions: {},
    },
    gaps: {},
    priors: {},
    onboardingCompletedAt: null,
    onboardingVersion: 1,
  };
}

// ─── Read ──────────────────────────────────────────────────────────────────────

/**
 * Returns the self model record, or a fresh empty model if none exists yet.
 * Never returns null — always returns a usable model.
 * @returns {Promise<object>}
 */
export async function getSelfModel() {
  const record = await dbGet(STORE, PRIMARY_KEY);
  return record ?? createEmptySelfModel();
}

// ─── Write ─────────────────────────────────────────────────────────────────────

/**
 * Saves the self model. Always merges over the existing record so partial
 * updates (e.g. only updating identity) don't wipe other sections.
 * @param {object} updates — partial or full model fields to merge in
 * @returns {Promise<object>} The saved record
 */
export async function updateSelfModel(updates) {
  const existing = await getSelfModel();
  const merged = {
    ...existing,
    ...updates,
    id: PRIMARY_KEY,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    // Deep-merge nested sections rather than replacing them
    identity:    { ...existing.identity,    ...(updates.identity    ?? {}) },
    currentState:{ ...existing.currentState,...(updates.currentState?? {}) },
    desiredSelf: {
      ...existing.desiredSelf,
      ...(updates.desiredSelf ?? {}),
      dimensions: {
        ...existing.desiredSelf.dimensions,
        ...(updates.desiredSelf?.dimensions ?? {}),
      },
    },
    gaps:   { ...existing.gaps,   ...(updates.gaps   ?? {}) },
    priors: { ...existing.priors, ...(updates.priors ?? {}) },
  };
  await dbPut(STORE, merged);
  return merged;
}

/**
 * Marks onboarding as complete at the current timestamp.
 * @returns {Promise<object>}
 */
export async function markOnboardingComplete() {
  return updateSelfModel({ onboardingCompletedAt: new Date().toISOString() });
}

/**
 * Returns true if the user has completed onboarding.
 * @returns {Promise<boolean>}
 */
export async function isOnboardingComplete() {
  const model = await getSelfModel();
  return !!model.onboardingCompletedAt;
}

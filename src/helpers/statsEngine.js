/**
 * statsEngine.js — pure stat computation functions (no DB calls, no React).
 *
 * The layered model (spec §2):
 *   Layer 1 (logs) → Layer 2 (Consistency, Volume, Momentum) → Layer 3 (Stat)
 *
 * All exported functions are pure: given the same inputs they always return
 * the same outputs. Wire them to DB data in App.jsx or a custom hook.
 *
 * Formula weights (spec §4):
 *   Standard:  Stat = (0.45 × C) + (0.40 × V) + (0.15 × M)
 *   Wisdom:    Stat = (0.55 × V) + (0.45 × M)  — no Consistency term (§4.4)
 *
 * Result is always clamped to [0, 99].
 */

// ── Utilities ──────────────────────────────────────────────────────────────────

/**
 * Returns a 'YYYY-MM-DD' date string for `n` days before `today`.
 * Uses string arithmetic to avoid timezone issues.
 * @param {string} today  'YYYY-MM-DD'
 * @param {number} n
 */
function subDays(today, n) {
  const d = new Date(today + 'T00:00:00');
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Counts logs in a date range [startDate, endDate] (inclusive).
 * Excludes 'onboarding_assessment' type — those are baseline-setters, not activity.
 */
function countInRange(logs, startDate, endDate) {
  return logs.filter(
    l => l.type !== 'onboarding_assessment' && l.date >= startDate && l.date <= endDate
  ).length;
}

/**
 * Reads the onboarding_assessment log value for an axis (0–100).
 * Returns null if no assessment was ever recorded.
 */
function getOnboardingValue(axisLogs) {
  const log = axisLogs.find(l => l.type === 'onboarding_assessment');
  return log != null ? Number(log.value) : null;
}

/**
 * How many real (non-onboarding) log entries are needed before the onboarding
 * baseline fades to zero influence. 30 ≈ one month of daily activity.
 */
const ONBOARDING_FADE_THRESHOLD = 30;

// ── Layer 2 Components ─────────────────────────────────────────────────────────

/**
 * Consistency (C) — rolling 30-day adherence (spec §4.1).
 *
 * Returns 0–100, or null if this axis has no Consistency term (Wisdom, §4.4).
 *
 * Strategy pause (§4.5): when paused=true, the Consistency window is frozen at
 * the date of the last 'book_finished' log rather than rolling to today, so
 * the stat doesn't decay during a normal between-books gap.
 *
 * @param {string}   axis
 * @param {Array}    axisLogs       — logs already filtered to this axis
 * @param {object}   axisConfig     — { expectedPerWeek, paused, hasConsistencyTerm }
 * @param {string}   today          — 'YYYY-MM-DD'
 * @returns {number|null}
 */
export function calcConsistency(axis, axisLogs, axisConfig, today) {
  if (!axisConfig.hasConsistencyTerm) return null;

  const expectedPerWeek = axisConfig.expectedPerWeek;
  if (!expectedPerWeek) return null;

  let windowEnd = today;

  // Strategy pause — freeze window at last book_finished date
  if (axis === 'strategy' && axisConfig.paused) {
    const finishedLogs = axisLogs
      .filter(l => l.type === 'book_finished')
      .sort((a, b) => b.date.localeCompare(a.date));

    if (finishedLogs.length === 0) return 0; // Never started a book, C = 0
    windowEnd = finishedLogs[0].date;
  }

  const windowStart = subDays(windowEnd, 29); // 30-day window (today inclusive = 30 days)
  const completed = countInRange(axisLogs, windowStart, windowEnd);
  const expected = (30 / 7) * expectedPerWeek;

  return clamp((completed / expected) * 100, 0, 100);
}

/**
 * Volume (V) — progress toward yearly quest targets (spec §4.2).
 *
 * Returns 0–100, computed as the simple average of (currentValue / targetValue)
 * across all non-done quests for the axis. Done quests are counted at 100%.
 *
 * questItems must already be filtered to the relevant axis by the caller.
 *
 * @param {Array} axisQuests  — questBoard items for this axis
 * @returns {number}
 */
export function calcVolume(axisQuests) {
  if (!axisQuests || axisQuests.length === 0) return 0;

  const total = axisQuests.reduce((sum, q) => {
    const progress = q.done
      ? 1.0
      : Math.min(q.currentValue / Math.max(q.targetValue, 1), 1.0);
    return sum + progress;
  }, 0);

  return clamp((total / axisQuests.length) * 100, 0, 100);
}

/**
 * Momentum (M) — rate of change over the last 14 days vs. the prior 14 (spec §4.3).
 *
 * Returns a value clamped to [-20, +20]. Can go negative so it nudges the stat
 * rather than swinging it.
 *
 * @param {Array}  axisLogs  — logs already filtered to this axis
 * @param {string} today     — 'YYYY-MM-DD'
 * @returns {number}
 */
export function calcMomentum(axisLogs, today) {
  const recent14Start = subDays(today, 13);  // last 14 days (today inclusive)
  const prior14End   = subDays(today, 14);   // the 14 days before that
  const prior14Start = subDays(today, 27);

  const recentRate = countInRange(axisLogs, recent14Start, today);
  const priorRate  = countInRange(axisLogs, prior14Start, prior14End);

  const raw = ((recentRate - priorRate) / Math.max(priorRate, 1)) * 100;
  return clamp(raw, -20, 20);
}

// ── Layer 3 — Combined Stat ────────────────────────────────────────────────────

/**
 * Computes the final stat for a single axis (0–99).
 *
 * Applies the Wisdom exception (§4.4): if hasConsistencyTerm is false,
 * reweights to 0.55V + 0.45M.
 *
 * @param {string}  axis
 * @param {Array}   axisLogs     — logs already filtered to this axis
 * @param {object}  axisConfig
 * @param {Array}   axisQuests   — questBoard items already filtered to this axis
 * @param {string}  today        — 'YYYY-MM-DD'
 * @returns {number}  0–99
 */
export function calcAxisStat(axis, axisLogs, axisConfig, axisQuests, today) {
  const V = calcVolume(axisQuests);
  const M = calcMomentum(axisLogs, today);

  let computed;
  if (!axisConfig.hasConsistencyTerm) {
    // Wisdom (§4.4) — drop Consistency entirely
    computed = clamp((0.55 * V) + (0.45 * M), 0, 99);
  } else {
    const C = calcConsistency(axis, axisLogs, axisConfig, today);
    computed = clamp((0.45 * C) + (0.40 * V) + (0.15 * M), 0, 99);
  }

  // ── Onboarding blend ────────────────────────────────────────────────────────
  // The onboarding_assessment log sets an honest non-zero starting value on day
  // one. It fades to zero influence linearly as real log entries accumulate.
  // Once ONBOARDING_FADE_THRESHOLD real logs exist, computed stat is used as-is.
  const onboardingVal = getOnboardingValue(axisLogs);
  if (onboardingVal !== null) {
    const realLogCount = axisLogs.filter(l => l.type !== 'onboarding_assessment').length;
    const w = Math.max(0, 1 - realLogCount / ONBOARDING_FADE_THRESHOLD);
    if (w > 0) {
      return clamp((1 - w) * computed + w * onboardingVal, 0, 99);
    }
  }

  return computed;
}

/**
 * Computes all 6 axis stats in one pass.
 *
 * @param {Array}   allLogs         — full logs table
 * @param {Array}   axisConfigs     — full axis_config table
 * @param {Array}   questBoardItems — full questBoard table
 * @param {string}  today           — 'YYYY-MM-DD'
 * @returns {{ strength, discipline, knowledge, wisdom, creativity, strategy }}
 */
export function computeAllStats(allLogs, axisConfigs, questBoardItems, today) {
  const AXES = ['strength', 'discipline', 'knowledge', 'wisdom', 'creativity', 'strategy'];

  const defaultConfig = { hasConsistencyTerm: true, expectedPerWeek: 7, paused: false };

  const stats = {};

  for (const axis of AXES) {
    const axisLogs    = allLogs.filter(l => l.axis === axis);
    const axisConfig  = axisConfigs.find(c => c.axis === axis) ?? defaultConfig;
    const axisQuests  = questBoardItems.filter(q => q.axis === axis);

    stats[axis] = calcAxisStat(axis, axisLogs, axisConfig, axisQuests, today);
  }

  return stats;
}

/**
 * Returns per-axis computation details for display in the Stats UI.
 * Each entry exposes the raw C/V/M values so the UI can render breakdowns.
 *
 * @returns {{ [axis]: { C: number|null, V: number, M: number, stat: number } }}
 */
export function computeAxisDetails(allLogs, axisConfigs, questBoardItems, today) {
  const AXES = ['strength', 'discipline', 'knowledge', 'wisdom', 'creativity', 'strategy'];
  const defaultConfig = { hasConsistencyTerm: true, expectedPerWeek: 7, paused: false };
  const details = {};

  for (const axis of AXES) {
    const axisLogs   = allLogs.filter(l => l.axis === axis);
    const axisConfig = axisConfigs.find(c => c.axis === axis) ?? defaultConfig;
    const axisQuests = questBoardItems.filter(q => q.axis === axis);

    const C = axisConfig.hasConsistencyTerm
      ? calcConsistency(axis, axisLogs, axisConfig, today)
      : null;
    const V = calcVolume(axisQuests);
    const M = calcMomentum(axisLogs, today);
    const stat = calcAxisStat(axis, axisLogs, axisConfig, axisQuests, today);

    details[axis] = { C, V, M, stat };
  }

  return details;
}

// ── Threshold title lookup (spec §9) ──────────────────────────────────────────
// Read-only static map — not a system, just a display label.

const THRESHOLDS = {
  strength: [
    { min: 0,  title: 'Conditioning'    },
    { min: 30, title: 'Athletic'        },
    { min: 60, title: 'Beast'           },
    { min: 80, title: 'Elite'           },
  ],
  discipline: [
    { min: 0,  title: 'Inconsistent'   },
    { min: 25, title: 'Forming Habits' },
    { min: 55, title: 'Disciplined'    },
    { min: 80, title: 'Iron Will'      },
  ],
  knowledge: [
    { min: 0,  title: 'Reader'         },
    { min: 25, title: 'Student'        },
    { min: 55, title: 'Scholar'        },
    { min: 80, title: 'Polymath'       },
  ],
  wisdom: [
    { min: 0,  title: 'Observant'      },
    { min: 25, title: 'Reflective'     },
    { min: 55, title: 'Discerning'     },
    { min: 80, title: 'Sage'           },
  ],
  creativity: [
    { min: 0,  title: 'Dormant'        },
    { min: 25, title: 'Exploring'      },
    { min: 55, title: 'Craftsman'      },
    { min: 80, title: 'Artist'         },
  ],
  strategy: [
    { min: 0,  title: 'Student'        },
    { min: 25, title: 'Tactician'      },
    { min: 55, title: 'Strategist'     },
    { min: 80, title: 'Grand Strategist' },
  ],
};

/**
 * Returns the threshold title for a given axis and stat value.
 * @param {string} axis
 * @param {number} value  0–99
 * @returns {string}
 */
export function getThresholdTitle(axis, value) {
  const tiers = THRESHOLDS[axis] ?? [];
  let title = '';
  for (const tier of tiers) {
    if (value >= tier.min) title = tier.title;
  }
  return title;
}

import { dbGet, dbPut, dbGetAll } from './db.js';

/**
 * questBoard store — sub-goals per axis that feed Volume (§6).
 *
 * Default quests are seeded from the GOALS targets defined in §3 and the
 * concrete goal targets in constants.js:
 *   Strength  → 90 training sessions (4×/week body)
 *   Discipline → 90 body checkbox days (the "show up" target)
 *   Knowledge  → 6 philosophy books + 40 commonplace pages
 *   Wisdom     → 10 personal Meditations entries
 *   Creativity → 52 sketch sessions (weekly Thursday practice)
 *   Strategy   → 2 books (biography + 48 Laws)
 *
 * currentValue for each quest is maintained by syncQuestProgress(),
 * which re-derives it from the logs array so it is never hand-set.
 */

const DEFAULT_QUESTS = [
  // ── Strength ────────────────────────────────────────────────────────────────
  {
    id: 'q-strength-sessions',
    axis: 'strength',
    title: 'Train 90 sessions (4×/week for the year)',
    targetValue: 90,
    currentValue: 0,
    unit: 'sessions',
    done: false,
  },
  {
    id: 'q-strength-benchmark',
    axis: 'strength',
    title: 'Complete benchmark — 50 push-ups or 10K run',
    targetValue: 1,
    currentValue: 0,
    unit: 'feats',
    done: false,
  },

  // ── Discipline ───────────────────────────────────────────────────────────────
  {
    id: 'q-discipline-days',
    axis: 'discipline',
    title: 'Check body task 90 consecutive days',
    targetValue: 90,
    currentValue: 0,
    unit: 'days',
    done: false,
  },

  // ── Knowledge ────────────────────────────────────────────────────────────────
  {
    id: 'q-knowledge-books',
    axis: 'knowledge',
    title: 'Finish 6 philosophy books cover to cover',
    targetValue: 6,
    currentValue: 0,
    unit: 'books',
    done: false,
  },
  {
    id: 'q-knowledge-commonplace',
    axis: 'knowledge',
    title: 'Fill 40 pages of the commonplace book',
    targetValue: 40,
    currentValue: 0,
    unit: 'pages',
    done: false,
  },

  // ── Wisdom ───────────────────────────────────────────────────────────────────
  {
    id: 'q-wisdom-meditations',
    axis: 'wisdom',
    title: 'Write 10-entry personal Meditations',
    targetValue: 10,
    currentValue: 0,
    unit: 'entries',
    done: false,
  },

  // ── Creativity ───────────────────────────────────────────────────────────────
  {
    id: 'q-creativity-sketchbook',
    axis: 'creativity',
    title: 'Fill one sketchbook (52+ sessions)',
    targetValue: 52,
    currentValue: 0,
    unit: 'sessions',
    done: false,
  },
  {
    id: 'q-creativity-masters',
    axis: 'creativity',
    title: 'Copy 4 masters by hand (one per month)',
    targetValue: 4,
    currentValue: 0,
    unit: 'masters',
    done: false,
  },
  {
    id: 'q-creativity-piece',
    axis: 'creativity',
    title: 'Produce one finished creative piece, shared publicly',
    targetValue: 1,
    currentValue: 0,
    unit: 'pieces',
    done: false,
  },

  // ── Strategy ─────────────────────────────────────────────────────────────────
  {
    id: 'q-strategy-biography',
    axis: 'strategy',
    title: 'Read one complete biography of a historical figure',
    targetValue: 1,
    currentValue: 0,
    unit: 'books',
    done: false,
  },
  {
    id: 'q-strategy-48laws',
    axis: 'strategy',
    title: 'Read The 48 Laws of Power',
    targetValue: 1,
    currentValue: 0,
    unit: 'books',
    done: false,
  },
];

// ── Repository ──────────────────────────────────────────────────────────────────

export async function initQuestBoard() {
  const existing = await dbGetAll('questBoard');
  if (existing.length === 0) {
    for (const quest of DEFAULT_QUESTS) {
      await dbPut('questBoard', quest);
    }
  }
}

export async function getAllQuests() {
  return await dbGetAll('questBoard');
}

export async function getQuestsByAxis(axis) {
  const all = await getAllQuests();
  return all.filter(q => q.axis === axis);
}

export async function updateQuest(id, updates) {
  const quest = await dbGet('questBoard', id);
  if (quest) await dbPut('questBoard', { ...quest, ...updates });
}

/**
 * Syncs currentValue for every quest from the canonical logs array.
 * This is called on app bootstrap and after any write that could change progress.
 * Volume in the stat engine always reads from these cached values.
 *
 * @param {Array} allLogs — the full logs array from logsRepository
 */
export async function syncQuestProgress(allLogs) {
  const quests = await getAllQuests();

  for (const quest of quests) {
    const newValue = deriveQuestValue(quest, allLogs);
    const done = newValue >= quest.targetValue;

    if (quest.currentValue !== newValue || quest.done !== done) {
      await dbPut('questBoard', { ...quest, currentValue: newValue, done });
    }
  }
}

/**
 * Pure derivation of currentValue for a quest from logs.
 * Kept as a separate function so it can be unit-tested without DB.
 */
export function deriveQuestValue(quest, allLogs) {
  switch (quest.id) {
    case 'q-strength-sessions':
      return allLogs.filter(l => l.axis === 'strength' && l.type === 'gym_session').length;

    case 'q-strength-benchmark':
      // A gym_session flagged as isBenchmarkAttempt counts — capped at 1 (quest target)
      return allLogs.some(l => l.axis === 'strength' && l.type === 'gym_session' && l.meta?.isBenchmarkAttempt) ? 1 : 0;

    case 'q-discipline-days':
      return allLogs.filter(l => l.axis === 'discipline' && l.type === 'daily_checkbox').length;

    case 'q-knowledge-books':
      // outside_goals books count at 0.5 weight (spec §4.2)
      return allLogs
        .filter(l => l.axis === 'knowledge' && l.type === 'book_finished')
        .reduce((sum, l) => sum + (l.meta?.weight ?? 1.0), 0);

    case 'q-knowledge-commonplace':
      // journal/reflection entries tagged to knowledge axis count as pages
      return allLogs.filter(l => l.axis === 'knowledge' && l.type === 'journal_entry').length;

    case 'q-wisdom-meditations':
      return allLogs.filter(l => l.axis === 'wisdom' && l.type === 'journal_entry').length;

    case 'q-creativity-sketchbook':
      return allLogs.filter(l => l.axis === 'creativity' && l.type === 'daily_checkbox').length;

    case 'q-creativity-masters':
      return allLogs.filter(l => l.axis === 'creativity' && l.type === 'master_copy').length;

    case 'q-creativity-piece':
      return allLogs.filter(l => l.axis === 'creativity' && l.type === 'finished_piece').length;

    case 'q-strategy-biography':
    case 'q-strategy-48laws':
      // Each finished strategy/history book counts toward the relevant quest
      return allLogs.filter(l => l.axis === 'strategy' && l.type === 'book_finished').length >= 1 ? 1 : 0;

    default:
      return 0;
  }
}

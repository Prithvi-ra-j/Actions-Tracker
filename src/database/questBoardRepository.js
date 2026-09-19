import { dbGet, dbPut, dbGetAll } from './db.js';

/**
 * questBoard store — sub-goals per axis that feed Volume (§6).
 *
 * Default quests are seeded from the GOALS targets defined in §3 and the
 * concrete goal targets in constants.js:
 *   Body       → 90 training sessions (4×/week body)
 *   Discipline → 90 body checkbox days (the "show up" target)
 *   Knowledge  → 6 philosophy books + 40 commonplace pages
 *   Social     → 10 personal Meditations entries
 *   Creativity → 52 sketch sessions (weekly Thursday practice)
 *   Strategy   → 2 books (biography + 48 Laws)
 *
 * currentValue for each quest is maintained by syncQuestProgress(),
 * which re-derives it from the logs array so it is never hand-set.
 */

const DEFAULT_QUESTS = [
  // ── Body ────────────────────────────────────────────────────────────────────
  {
    id: 'q-body-sessions',
    axis: 'body',
    title: 'Train 90 sessions (4×/week for the year)',
    targetValue: 90,
    currentValue: 0,
    unit: 'sessions',
    done: false,
  },
  {
    id: 'q-body-benchmark',
    axis: 'body',
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

  // ── Social ───────────────────────────────────────────────────────────────────
  {
    id: 'q-social-journal',
    axis: 'social',
    title: 'Accumulate 75 evidence points of Social',
    targetValue: 75,
    currentValue: 0,
    unit: 'pts',
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
    id: 'q-strategy-reading',
    axis: 'strategy',
    title: 'Read 4 strategic/historical books',
    targetValue: 4,
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

export async function addQuest(questData) {
  const id = `q-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const quest = { id, ...questData };
  await dbPut('questBoard', quest);
  return id;
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
    case 'q-body-sessions':
      return allLogs.filter(l => l.axis === 'body' && l.type === 'gym_session').length;

    case 'q-body-benchmark':
      // A gym_session flagged as isBenchmarkAttempt counts — capped at 1 (quest target)
      return allLogs.some(l => l.axis === 'body' && l.type === 'gym_session' && l.meta?.isBenchmarkAttempt) ? 1 : 0;

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

    case 'q-social-journal':
      return allLogs
        .filter(l => l.axis === 'social')
        .reduce((sum, l) => {
          if (l.type === 'journal_entry') return sum + 1;
          if (l.type === 'reflection') return sum + 3;
          if (l.type === 'behavior_change') return sum + 5;
          return sum;
        }, 0);

    case 'q-creativity-sketchbook':
      return allLogs.filter(l => l.axis === 'creativity' && l.type === 'daily_checkbox').length;

    case 'q-creativity-masters':
      return allLogs.filter(l => l.axis === 'creativity' && l.type === 'master_copy').length;

    case 'q-creativity-piece':
      return allLogs.filter(l => l.axis === 'creativity' && l.type === 'finished_piece').length;

    case 'q-strategy-reading':
      return allLogs
        .filter(l => l.axis === 'strategy' && l.type === 'book_finished')
        .reduce((sum, l) => sum + (l.meta?.weight ?? 1.0), 0);

    default:
      return 0;
  }
}

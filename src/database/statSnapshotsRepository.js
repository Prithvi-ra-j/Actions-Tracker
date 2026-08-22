import { dbPut, dbGetAll } from './db.js';

const SNAPSHOT_INTERVAL_DAYS = 7;

/** Returns all snapshots sorted newest-first. */
export async function getAllSnapshots() {
  const all = await dbGetAll('statSnapshots');
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

/** Returns the most recent snapshot, or null. */
export async function getLatestSnapshot() {
  const all = await getAllSnapshots();
  return all[0] ?? null;
}

/** Writes a new snapshot record. */
export async function writeSnapshot(stats, date) {
  await dbPut('statSnapshots', {
    id: crypto.randomUUID(),
    date,
    stats: { ...stats },
  });
}

/**
 * Writes a snapshot if 7+ days have passed since the last one (or if none exists).
 * Called on every app open — the check is cheap so it's safe to call every time.
 *
 * @param {{ strength, discipline, knowledge, wisdom, creativity, strategy }} currentStats
 * @param {string} today  'YYYY-MM-DD'
 */
export async function checkAndWriteWeeklySnapshot(currentStats, today) {
  const latest = await getLatestSnapshot();

  if (!latest) {
    await writeSnapshot(currentStats, today);
    return;
  }

  const latestDate = new Date(latest.date + 'T00:00:00');
  const todayDate  = new Date(today   + 'T00:00:00');
  const daysDiff   = Math.round((todayDate - latestDate) / (1000 * 60 * 60 * 24));

  if (daysDiff >= SNAPSHOT_INTERVAL_DAYS) {
    await writeSnapshot(currentStats, today);
  }
}

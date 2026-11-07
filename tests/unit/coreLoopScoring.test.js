import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { getDB, initDB } from '../../src/database/db.js';
import { addLog } from '../../src/database/logsRepository.js';
import { addHabit } from '../../src/database/habitRepository.js';
import { addOccurrence } from '../../src/database/habitOccurrenceRepository.js';
import { runScoreProjection } from '../../src/core/scoring/scoreEngine.js';
import { localDateStr } from '../../src/helpers/dateHelpers.js';
import { collectSignals } from '../../src/domains/discipline/disciplineEngine.js';

async function clearStores() {
  const db = getDB();
  const stores = ['logs', 'habits', 'habitOccurrences', 'facts', 'questBoard', 'axisConfigs', 'statSnapshots'];
  const existing = stores.filter(name => db.objectStoreNames.contains(name));
  const tx = db.transaction(existing, 'readwrite');
  for (const name of existing) tx.objectStore(name).clear();
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

describe('core loop scoring', () => {
  beforeEach(async () => {
    await initDB();
    await clearStores();
  });

  it.each([0, 23])('uses the local date of an ISO period at hour %i for a log-only score', async hour => {
    const end = new Date(2026, 8, 26, hour, 30);
    const date = localDateStr(end);
    await addLog({ axis: 'body', type: 'manual_evidence', date, value: 1 });
    const projection = await runScoreProjection('body', {
      start: new Date(2026, 7, 27, 12).toISOString(),
      end: end.toISOString(),
    });

    expect(projection.scoreSource).toBe('canonical');
    expect(projection.value).toBeGreaterThan(0);
    expect(projection.warnings.join(' ')).not.toContain('pipeline_error');
  });

  it('includes a completed date-only occurrence on the period end date', async () => {
    const end = new Date(2026, 8, 26, 23, 30);
    const date = localDateStr(end);
    const habitId = await addHabit({ name: 'Walk', domain: 'body', frequency: { type: 'daily' } });
    await addOccurrence({ habitId, scheduledFor: date, status: 'completed' });
    const projection = await runScoreProjection('discipline', {
      start: new Date(2026, 7, 27, 12).toISOString(),
      end: end.toISOString(),
    });

    expect(projection.scoreSource).toBe('evidence');
    expect(projection.value).toBe(99);
    expect(projection.components[0].signal).toBe('habit_completion_rate');
  });

  it('counts completed and missed occurrences only once in confidence', () => {
    const [signal] = collectSignals([
      { id: 'done', status: 'completed' },
      { id: 'missed', status: 'missed' },
      { id: 'excused', status: 'excused' },
      { id: 'unknown', status: 'unknown' },
      { id: 'pending', status: 'expected' },
    ]);
    expect(signal.value).toBe(0.5);
    expect(signal.confidence).toBe(3 / 5);
    expect(signal.breakdown.expected).toBe(5);
  });
});

import { dbPut, dbGetAll, dbGetAllByIndex } from './db.js';
import { getLatestSnapshot, getAllSnapshots } from './statSnapshotsRepository.js';

/**
 * Saves a telemetry event.
 * type: 'anomaly_detected' | 'review_submitted'
 */
export async function saveTelemetryEvent(type, date, payload) {
  const id = crypto.randomUUID();
  await dbPut('telemetry', {
    id,
    type,
    date,
    payload,
    timestamp: new Date().toISOString()
  });
}

export async function getAllTelemetry() {
  return await dbGetAll('telemetry');
}

export async function saveErrorLog(error, info) {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    await saveTelemetryEvent('crash', todayStr, {
      message: error?.message || String(error),
      stack: error?.stack,
      componentStack: info?.componentStack,
    });
  } catch (e) {
    console.error('Failed to save error log', e);
  }
}


/**
 * Detects if any stat jumped or dropped unusually fast.
 * Compares the latest snapshot with the one from a week prior.
 */
export async function runAnomalyDetection(todayDateStr) {
  const snaps = await getAllSnapshots();
  if (snaps.length < 2) return;

  // Snaps are sorted newest first. 
  const latest = snaps[0];
  const previous = snaps[1];

  // Only run if we haven't already logged an anomaly for this exact latest snapshot
  const existing = await dbGetAllByIndex('telemetry', 'type', 'anomaly_detected');
  if (existing.some(e => e.payload?.snapshotId === latest.id)) return;

  const anomalies = [];
  
  for (const axis of Object.keys(latest.stats)) {
    const cur = latest.stats[axis];
    const prev = previous.stats[axis] ?? 0;
    const diff = cur - prev;

    if (Math.abs(diff) > 15) {
      anomalies.push({ axis, diff, from: prev, to: cur });
    }
  }

  if (anomalies.length > 0) {
    await saveTelemetryEvent('anomaly_detected', todayDateStr, {
      snapshotId: latest.id,
      anomalies
    });
    console.warn('[Telemetry] Anomalies detected and logged:', anomalies);
  }
}

/**
 * Automated Evidence Capture — Health Connect Adapter (Prototype)
 * 
 * This module is a prototype for capturing background evidence from device health APIs.
 * It is intended to be invoked by a background fetch task (e.g. via @capacitor/background-task).
 * 
 * Future implementation will use a Capacitor Health Connect plugin to pull:
 * - Sleep sessions (to automatically log recovery facts)
 * - Workouts/Steps (to automatically log physical activity facts)
 */

import { addEvidence } from '../../database/evidenceRepository.js';
import { addFact } from '../../database/factsRepository.js';

/**
 * Checks for new health data since the last sync cursor.
 * If found, translates it into system Facts and Evidence.
 */
export async function syncHealthData(lastSyncCursor = new Date(Date.now() - 24*60*60*1000).toISOString()) {
  try {
    // Prototype: In a real implementation, this calls the native plugin
    // const result = await HealthConnect.readRecords({ ... })
    const mockHealthData = await fetchMockHealthData(lastSyncCursor);
    
    let factsCreated = 0;

    for (const record of mockHealthData) {
      if (record.type === 'sleep') {
        const fact = {
          type: 'health_metric',
          value: record.durationMinutes >= 420 ? 'sufficient_sleep' : 'insufficient_sleep',
          source: { type: 'integration', integrationId: 'health_connect' }
        };
        await addFact(fact);
        factsCreated++;
      }
      
      if (record.type === 'workout') {
        const fact = {
          type: 'activity',
          value: `Workout: ${record.activityType} for ${record.durationMinutes} min`,
          source: { type: 'integration', integrationId: 'health_connect' }
        };
        await addFact(fact);
        factsCreated++;
      }
    }
    
    return { success: true, factsCreated, newCursor: new Date().toISOString() };
  } catch (err) {
    console.error("[HealthConnectAdapter] Failed to sync health data:", err);
    return { success: false, error: err.message };
  }
}

async function fetchMockHealthData(since) {
  // Simulates pulling data from native health APIs
  return [];
}

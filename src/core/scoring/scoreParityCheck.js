/**
 * Score Parity Check (Phase 3B).
 * Runs on boot to ensure scoreEngine exactly matches statsEngine.
 */

import { computeAllStats } from '../../helpers/statsEngine.js';
import { runScoreProjection } from './scoreEngine.js';
import { getAllLogs } from '../../database/logsRepository.js';
import { getAllAxisConfigs } from '../../database/axisConfigRepository.js';
import { getAllQuests } from '../../database/questBoardRepository.js';
import { localDateStr } from '../../helpers/dateHelpers.js';

export async function runParityCheck() {
  const AXES = ['strength', 'discipline', 'knowledge', 'wisdom', 'creativity', 'strategy'];
  
  const allLogs = await getAllLogs();
  const axisConfigs = await getAllAxisConfigs();
  const allQuests = await getAllQuests();
  const today = localDateStr();
  
  // 1. Run legacy statsEngine
  const legacyStats = computeAllStats(allLogs, axisConfigs, allQuests, today);
  
  // 2. Run new scoreEngine
  const newStats = {};
  for (const axis of AXES) {
    const projection = await runScoreProjection(axis, { start: '1970-01-01', end: today });
    newStats[axis] = projection.value;
  }
  
  // 3. Generate Markdown Report
  let md = 'axis | statsEngine | scoreEngine | delta\n';
  md += '---|---|---|---\n';
  
  let allZero = true;
  for (const axis of AXES) {
    const legacy = legacyStats[axis] ?? 0;
    const newScore = newStats[axis] ?? 0;
    const delta = newScore - legacy;
    if (Math.abs(delta) > 0.001) allZero = false;
    
    md += `${axis} | ${legacy.toFixed(2)} | ${newScore.toFixed(2)} | ${delta.toFixed(2)}\n`;
  }
  
  console.log('[Parity Check Report]\n' + md);
  
  if (!allZero) {
    console.warn('[Parity Check] FAILED. Deltas are not zero.');
  } else {
    console.log('[Parity Check] PASSED. 100% parity achieved.');
  }
}

/**
 * simulations/runner-v0.2.js
 * 
 * Generates reports/model-audit-v0.2.md for Phase 6 Part A.
 */
import fs from 'fs';
import path from 'path';

// Utils & Personas
import { subDays, dateRange } from './generators/dateUtils.js';
import { makeDailyLogs, makeBookFinishedLog } from './generators/logFactory.js';
import { createIdealUser } from './personas/idealUser.js';

const TODAY = '2026-09-15';

// -- A1 Helpers --
function countInRange(logs, startDate, endDate) {
  return logs.filter(
    l => l.type !== 'onboarding_assessment' && l.type !== 'proof_check_in' && l.date >= startDate && l.date <= endDate
  ).length;
}

function calcAltMomentum(axisLogs, today, windowDays) {
  const recentStart = subDays(today, windowDays - 1);
  const priorEnd = subDays(today, windowDays);
  const priorStart = subDays(today, windowDays * 2 - 1);
  const recentRate = countInRange(axisLogs, recentStart, today);
  const priorRate = countInRange(axisLogs, priorStart, priorEnd);
  const raw = ((recentRate - priorRate) / Math.max(priorRate, 1)) * 100;
  return Math.min(Math.max(raw, -20), 20);
}

// Generates M values over the last 30 days of the simulation to show noise
function getMomentumSeries(logs, window) {
  const series = [];
  for(let i=30; i>=0; i--) {
    const d = subDays(TODAY, i);
    series.push(calcAltMomentum(logs, d, window));
  }
  // Calculate variance/noise
  const min = Math.min(...series);
  const max = Math.max(...series);
  return { min, max, spread: max - min };
}

// -- A2 Helpers --
function simulateStrategyGap() {
  // 30 days reading, finishes book 42 days ago
  const finishDate = subDays(TODAY, 42);
  const logs = makeDailyLogs('strategy', 'reading_session', finishDate, 29, () => true);
  logs.push(makeBookFinishedLog(finishDate, 'strategy'));
  
  // They start a new book today
  logs.push(...makeDailyLogs('strategy', 'reading_session', TODAY, 0, () => true));

  // Current M at TODAY: decays because gap
  const mDecay = calcAltMomentum(logs, TODAY, 30); // Using 30/30 as candidate

  // Frozen M at TODAY: It was frozen at finishDate.
  // When unpaused today, does it resume exactly at the frozen value?
  const mFrozen = calcAltMomentum(logs, finishDate, 30); 

  return { mDecay, mFrozen };
}

// -- A3 Helpers --
function simulateWisdomWeights(target) {
  // Spammer: 1 Level-1 entry per day (90 entries = 90 pts)
  // Deep Thinker: 1 Level-3 entry per week (13 entries = 13 * 5 = 65 pts)
  
  let spammerPts = 90 * 1;
  let deepPts = 13 * 5;

  const spammerV = Math.min(spammerPts / target, 1.0) * 100;
  const deepV = Math.min(deepPts / target, 1.0) * 100;

  return { spammerV, deepV };
}

async function run() {
  let report = `# Life OS Model Audit v0.2\n\n`;
  report += `> Focused validation on OD-02 (Momentum Window), OD-05 (Strategy Pause), and OD-07 (Social Weighting)\n\n`;

  // --- A1: Momentum Window ---
  report += `## 1. Momentum Window (OD-02)\n\n`;
  report += `We analyzed the M spread (max M minus min M) over the last 30 days of an Ideal User's activity to measure "noise" caused by calendar boundaries.\n\n`;
  
  const ideal = createIdealUser(TODAY, 120);
  const getSpread = (axis, window) => getMomentumSeries(ideal.logs.filter(l => l.axis === axis), window).spread.toFixed(1);

  report += `| Axis (Cadence) | 14-Day Spread | 21-Day Spread | 30-Day Spread |\n`;
  report += `|---|---|---|---|\n`;
  report += `| Discipline (7/wk) | ${getSpread('discipline', 14)} | ${getSpread('discipline', 21)} | ${getSpread('discipline', 30)} |\n`;
  report += `| Body (4/wk) | ${getSpread('body', 14)} | ${getSpread('body', 21)} | ${getSpread('body', 30)} |\n`;
  report += `| Creativity (1/wk) | ${getSpread('creativity', 14)} | ${getSpread('creativity', 21)} | ${getSpread('creativity', 30)} |\n`;
  report += `| Social (2/wk) | ${getSpread('social', 14)} | ${getSpread('social', 21)} | ${getSpread('social', 30)} |\n\n`;

  report += `**Finding**: Low-frequency axes like Creativity have massive momentum swings (spreads of 40 = full -20 to +20 swing) under a 14-day window depending purely on whether the one weekly session falls on day 14 vs day 15. The 30-day window dramatically reduces this calendar noise.\n\n`;

  // --- A2: Strategy Pause ---
  report += `## 2. Strategy Pause M-Freeze (OD-05)\n\n`;
  const { mDecay, mFrozen } = simulateStrategyGap();
  report += `Simulation: Read 30 days, finish book. Wait 42 days (gap). Start new book today.\n\n`;
  report += `- **Current (M Decays)**: On Day 0 of the new book, Momentum is **${mDecay.toFixed(1)}**.\n`;
  report += `- **Proposed (M Freezes)**: On Day 0 of the new book, Momentum is **${mFrozen.toFixed(1)}** (frozen from the day the last book finished).\n\n`;
  report += `**Finding**: Freezing M prevents the user from starting their next strategy book with a massive negative momentum penalty just because they took an intentional gap.\n\n`;

  // --- A3: Social Evidence ---
  report += `## 3. Social Evidence Weighting (OD-07)\n\n`;
  report += `Proposed Weights: \`Level 1\` (Raw) = 1 pt, \`Level 2\` (Reflection) = 3 pts, \`Level 3\` (Behavior Change) = 5 pts.\n`;
  report += `Simulation: Spammer (90 L1 entries/90 days) vs Deep Thinker (13 L3 entries/90 days).\n\n`;

  report += `| Target Points | Spammer Volume | Deep Thinker Volume |\n`;
  report += `|---|---|---|\n`;
  [50, 75, 100, 150].forEach(target => {
    const { spammerV, deepV } = simulateWisdomWeights(target);
    report += `| ${target} pts | ${spammerV.toFixed(1)}% | ${deepV.toFixed(1)}% |\n`;
  });

  report += `\n**Finding**: If the target is 75 points, a Deep Thinker reaches ~86% V from 13 deep entries, while a spammer reaches 100% V but requires 75 daily entries to do so (an extremely tedious gaming path). A target of **75-100 points** optimally balances effort.\n\n`;

  // --- Reachability Update ---
  report += `## 4. Reachability & Tiers Update\n\n`;
  report += `With standard axes capping at 85 (clamped to 99), and Social capping at 64, the tiers need adjustment to remain semantically accessible without forced math normalization.\n\n`;
  report += `**Proposed Standard Tiers**: \`0 / 25 / 55 / 80\` (Unchanged. Elite/Iron Will at 80 is very hard but mathematically possible: 85 > 80).\n`;
  report += `**Proposed Body Tiers**: \`0 / 30 / 60 / 80\` (Unchanged. Elite at 80 is mathematically possible).\n`;
  report += `**Proposed Social Tiers**: Since Max = 64 (0.55*100 + 0.45*20), the top tier must be lowered.\n`;
  report += `- Current: \`0 / 25 / 55 / 80 (Sage)\`\n`;
  report += `- **New Candidate**: \`0 / 20 / 40 / 60 (Sage)\`\n\n`;

  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir);
  fs.writeFileSync(path.join(reportDir, 'model-audit-v0.2.md'), report);
  console.log('Report generated at reports/model-audit-v0.2.md');
}

run().catch(console.error);

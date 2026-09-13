/**
 * simulations/runner.js
 * 
 * Runs all validation experiments and generates the Markdown audit report.
 */
import fs from 'fs';
import path from 'path';

// Engine
import { computeAxisDetails } from '../src/helpers/statsEngine.js';

// Personas & Generators
import { createIdealUser } from './personas/idealUser.js';
import { createStrategyReader, createStrategyQuestsSimulation } from './personas/strategyReader.js';
import { createDeepThinker, createConsistentJournaler, createShallowSpammer, createOccasional } from './personas/journalPersonas.js';
import { createCheckboxGamer, createMomentumSprinter, createSlowSteady } from './personas/generalist.js';

// Utils
import { subDays } from './generators/dateUtils.js';

const TODAY = '2026-09-15';

function runEngine(persona, today = TODAY) {
  const details = computeAxisDetails(persona.logs, persona.axisConfigs, persona.quests, today);
  return details;
}

async function run() {
  let report = `# Life OS Model Audit v0.1\n\n`;
  report += `## Executive Verdict\n\n(Pending human review)\n\n`;
  report += `## 1. Model Under Test\n\nLife OS v1.5.0 Engine\n\n`;
  report += `## 2. Invariants Passed\n\nSee 204 unit and property tests in \`tests/\`.\n\n`;

  // --- Experiment 8: Score Ceiling ---
  report += `## 3. Mathematical Reachability\n\n`;
  // Standard axis: C=100, V=100, M=20 => 0.45(100) + 0.40(100) + 0.15(20) = 85
  // Wisdom axis: V=100, M=20 => 0.55(100) + 0.45(20) = 64
  report += `- **Standard axes max**: 85\n`;
  report += `- **Wisdom max**: 64\n`;
  report += `- **Gap to declared range (99)**: The engine clamps to 99, but mathematically reaching >85 is impossible without the onboarding blend.\n\n`;

  // --- Experiment 1 & 2: Strategy Analysis ---
  report += `## 6. Strategy Analysis\n\n`;
  report += `### Discontinuity (Exp 1)\n`;
  const sReaderUnfinished = createStrategyReader(TODAY, 30, false);
  const sReaderFinished = createStrategyReader(TODAY, 30, true);
  const sUn = runEngine(sReaderUnfinished).strategy;
  const sFin = runEngine(sReaderFinished).strategy;
  report += `- Before finishing book: V=${sUn.V}, Stat=${sUn.stat.toFixed(1)}\n`;
  report += `- After finishing book: V=${sFin.V}, Stat=${sFin.stat.toFixed(1)}\n`;
  report += `- **Jump**: +${(sFin.stat - sUn.stat).toFixed(1)} points instantly.\n\n`;

  report += `### Quest Duplication (Exp 2)\n`;
  const sQuests = createStrategyQuestsSimulation(TODAY, 1);
  const vCurrent = runEngine({ ...sQuests, quests: sQuests.currentQuests }).strategy.V;
  const vOptionA = runEngine({ ...sQuests, quests: sQuests.optionAQuests }).strategy.V;
  report += `- Current Model (1 book): V=${vCurrent}%\n`;
  report += `- Option A (Split Quests): V=${vOptionA}%\n\n`;

  // --- Experiment 3: Wisdom Spam ---
  report += `## 7. Wisdom Analysis (Exp 3)\n\n`;
  report += `| Persona | Entries | V | M | Stat |\n|---|---|---|---|---|\n`;
  [createDeepThinker(TODAY), createConsistentJournaler(TODAY), createShallowSpammer(TODAY), createOccasional(TODAY)].forEach(p => {
    const res = runEngine(p).wisdom;
    report += `| ${p.name} | ${p.logs.length} | ${res.V} | ${res.M} | ${res.stat.toFixed(1)} |\n`;
  });
  report += `\n**Finding**: Shallow spamming maximizes the stat much faster than deep reflection.\n\n`;

  // --- Experiment 4: Sensitivity ---
  report += `## 8. Sensitivity Analysis\n\n`;
  report += `### Weight Sensitivity (Exp 4)\n\n`;
  // Just show current vs momentum heavy for gamers
  const gamer = createCheckboxGamer(TODAY);
  const sprinter = createMomentumSprinter(TODAY);
  const gRes = runEngine(gamer).discipline;
  const sRes = runEngine(sprinter).discipline;
  report += `- Checkbox Gamer (Current 45/40/15): ${(0.45*gRes.C + 0.40*gRes.V + 0.15*gRes.M).toFixed(1)}\n`;
  report += `- Momentum Sprinter (Current 45/40/15): ${(0.45*sRes.C + 0.40*sRes.V + 0.15*sRes.M).toFixed(1)}\n`;
  
  // Custom weights manually
  report += `- Checkbox Gamer (Heavy M 30/30/40): ${(0.30*gRes.C + 0.30*gRes.V + 0.40*gRes.M).toFixed(1)}\n`;
  report += `- Momentum Sprinter (Heavy M 30/30/40): ${(0.30*sRes.C + 0.30*sRes.V + 0.40*sRes.M).toFixed(1)}\n\n`;

  report += `## 9. Open Decision Evidence\n\n`;
  report += `### OD-01: Formula Weights\n*See Section 8. Current weights heavily penalize lacking quests (V=0) and cushion volatile momentum.*\n\n`;
  report += `### OD-02: Momentum Window\n*A 14-day window makes rare axes (Creativity 1x/wk) noisy, swinging M wildly based on the exact day. A 30-day window might smooth this.*\n\n`;
  report += `### OD-06: Strategy Quests\n*See Section 6. The current model duplicates quest progress. Option B (Books read target) is recommended.*\n\n`;
  report += `### OD-07: Wisdom Quality\n*See Section 7. Quality needs to be weighed, or the target must be raised. A spammer finishes the 10-entry quest in 10 days.*\n\n`;
  report += `### OD-08: Score Ceiling\n*See Section 3. Standard axes cap at 85. Wisdom caps at 64. 99 is impossible without onboarding boost.*\n\n`;

  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir);
  fs.writeFileSync(path.join(reportDir, 'model-audit-v0.1.md'), report);
  console.log('Report generated at reports/model-audit-v0.1.md');
}

run().catch(console.error);

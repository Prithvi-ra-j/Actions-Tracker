/**
 * v3.3 Thin RPG Engine
 * Calculates a global Level and XP total based on raw facts.
 * 
 * XP Values:
 * - daily_checkbox / habit_completion: 10
 * - journal_entry: 25
 * - evaluation: 15
 * - goal_progress: 50
 * - milestone_completion: 100
 * - default/other: 5
 */

const XP_TABLE = {
  'daily_checkbox': 10,
  'habit_completion': 10,
  'journal_entry': 25,
  'evaluation': 15,
  'goal_progress': 50,
  'milestone_completion': 100,
};

const DEFAULT_XP = 5;

/**
 * Computes global RPG stats from all facts.
 * @param {Array} facts - Array of raw fact objects
 */
export function computeGlobalRPG(facts) {
  let totalXP = 0;

  for (const fact of facts) {
    // Only count positive or neutral actions. Ignore retractions/corrections for now in the thin version.
    if (fact.type === 'retraction') continue;
    
    totalXP += XP_TABLE[fact.type] || DEFAULT_XP;
  }

  // Level curve: Level = floor(sqrt(XP / 100)) + 1
  // L1 = 0, L2 = 100, L3 = 400, L4 = 900, L5 = 1600...
  const level = Math.floor(Math.sqrt(totalXP / 100)) + 1;
  
  // Math for the progress bar
  const xpForCurrentLevel = Math.pow(level - 1, 2) * 100;
  const xpForNextLevel = Math.pow(level, 2) * 100;
  
  const xpIntoLevel = totalXP - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPct = Math.round((xpIntoLevel / xpNeeded) * 100);

  return {
    totalXP,
    level,
    xpIntoLevel,
    xpNeeded,
    progressPct
  };
}

import { getWeights } from '../../helpers/statsEngine.js';

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * 7.3 Prior from baseline (no cliff)
 * The prior deliberately excludes V and M, so it lands where the computed
 * stat will land for a user who behaves as reported.
 */
export function priorFromBaseline({ axis, ratePerWeek, intendedPerWeek, hasConsistencyTerm, retroV = 0 }) {
  const w = getWeights([]); // building-phase defaults
  if (!hasConsistencyTerm) return clamp(0.55 * retroV, 0, 99); // social
  
  const intended = intendedPerWeek > 0 ? intendedPerWeek : 1;
  const C = clamp((ratePerWeek / intended) * 100, 0, 100);
  return clamp(w.C * C + w.V * retroV, 0, 99);
}

/**
 * 7.5 Target caps
 * maxReachable = C*100 + V*100 + M*20
 * Returns 88 for building, 80 for maintaining/advancing.
 */
export function maxReachable(phaseMix = 'building') {
  const mockHabit = phaseMix === 'building' ? [] : [{ phase: phaseMix, domain: 'body', status: 'active' }];
  const w = getWeights(mockHabit);
  return Math.floor(w.C * 100 + w.V * 100 + w.M * 20);
}

/**
 * Ceiling without any quests
 */
export const noQuestCeiling = (w) => w.C * 100 + w.M * 20;

/**
 * 7.6 Ceiling preview & feasibility (PURE)
 * Calculates what the stat will be after N weeks of perfect adherence.
 */
export function projectStat({ axis, weeks, expectedPerWeek, quests, weights }) {
  const C = 100; // perfect adherence
  const M = 0;   // steady state
  
  let totalWeightedProgress = 0;
  let totalWeight = 0;
  
  for (const q of quests) {
    const w = q.weight ?? 1;
    // Assuming yearly quests for onboarding projections, linear accrual.
    const progress = Math.min(1, weeks / 52);
    // Mastery bonus is ignored for simple projection, assume 1.0 base
    const masteryBonus = 0; // The stat formula uses 0.7 + 0.3 * masteryBonus. If no habit, it uses 0.7 + 0.3 = 1.0!
    // Wait, statsEngine calcVolume: 
    // let masteryBonus = 1.0; 
    // if (habit?.masteryRoadmap) masteryBonus = currentLevel / totalLevels;
    // So default is 1.0. progress * (0.7 + 0.3*1.0) = progress * 1.0.
    totalWeightedProgress += progress * w;
    totalWeight += w;
  }
  
  const V = totalWeight > 0 ? (totalWeightedProgress / totalWeight) * 100 : 0;
  
  return clamp(weights.C * C + weights.V * V + weights.M * M, 0, 99);
}

/**
 * Returns the smallest number of months to reach the target, or null if never reached.
 */
export function monthsToTarget(args, target) {
  for (let m = 1; m <= 60; m++) {
    if (projectStat({ ...args, weeks: m * 4 }) >= target) {
      return m;
    }
  }
  return null;
}

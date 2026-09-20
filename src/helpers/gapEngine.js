/**
 * Gap engine — pure functions for §6 Gap Model and §9 Baseline Priors & Evidence Decay.
 *
 * All functions are pure: no DB calls, no side effects.
 * Inputs come from selfModelRepository; outputs are stored back via updateSelfModel.
 */

// ─── §6 Gap Model ─────────────────────────────────────────────────────────────

/**
 * Computes the gap between current state and desired self for all dimensions.
 *
 * Priority assignment:
 *   delta >= 40  → 'high'   (large gap, significant effort needed)
 *   delta >= 20  → 'medium'
 *   delta <  20  → 'low'    (close enough; maintenance territory)
 *
 * @param {object} currentState  — { [dim]: { value, confidence, ... } }
 * @param {object} desiredDims   — { [dim]: { targetValue, why, timeframe } }
 * @param {object} [historicalState] — State from 1 month ago, same format as currentState
 * @returns {{ [dim]: { delta: number, priority: string, currentValue: number, targetValue: number, trajectory: number, estimatedTargetDate: string|null } }}
 */
export function computeGaps(currentState, desiredDims, historicalState = null) {
  const gaps = {};

  for (const dim of Object.keys(desiredDims)) {
    // Adapter: handle both { value: ... } and just number directly.
    const rawVal = currentState[dim];
    const current = typeof rawVal === 'number' ? rawVal : rawVal?.value;

    const target  = desiredDims[dim]?.targetValue ?? 0;

    if (current === undefined || current === null) {
      gaps[dim] = {
        currentValue: null,
        targetValue: target,
        delta: null,
        priority: 'unknown',
        trajectory: 0,
        estimatedTargetDate: null,
      };
      continue;
    }

    const delta   = Math.max(0, target - current); // gaps are always positive

    const priority =
      delta >= 40 ? 'high'   :
      delta >= 20 ? 'medium' :
                    'low';

    let trajectory = 0;
    let estimatedTargetDate = null;

    if (historicalState && historicalState[dim] !== undefined) {
      const pastRaw = historicalState[dim];
      const past = typeof pastRaw === 'number' ? pastRaw : (pastRaw?.value ?? 0);
      trajectory = current - past;

      if (trajectory > 0 && delta > 0) {
        const monthsToTarget = delta / trajectory;
        const d = new Date();
        d.setMonth(d.getMonth() + Math.ceil(monthsToTarget));
        estimatedTargetDate = d.toISOString().split('T')[0];
      }
    }

    gaps[dim] = {
      currentValue: current,
      targetValue:  target,
      delta,
      priority,
      trajectory,
      estimatedTargetDate,
    };
  }

  return gaps;
}

/**
 * Returns gaps sorted by priority then delta descending.
 * Useful for rendering a prioritised action list.
 *
 * @param {object} gaps — output of computeGaps()
 * @returns {Array<{ dim: string, delta: number, priority: string, ... }>}
 */
export function sortedGaps(gaps) {
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2, unknown: 3 };
  return Object.entries(gaps)
    .map(([dim, g]) => ({ dim, ...g }))
    .sort((a, b) => {
      const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      return pDiff !== 0 ? pDiff : (b.delta || 0) - (a.delta || 0);
    });
}

// ─── §9 Baseline Priors & Evidence Decay ─────────────────────────────────────

/**
 * Number of real fact records needed for a prior to fully decay to zero influence.
 * 30 ≈ one month of consistent daily logging.
 * Formula: w = max(0, 1 - realFactCount / DECAY_THRESHOLD)
 */
export const PRIOR_DECAY_THRESHOLD = 30;

/**
 * Computes the blend weight of a prior for a given dimension.
 * w = 1.0  → prior dominates (no real facts yet)
 * w = 0.0  → prior has fully decayed (30+ real facts exist)
 *
 * @param {number} realFactCount  — number of non-onboarding facts for this dimension
 * @returns {number} weight in [0, 1]
 */
export function priorWeight(realFactCount) {
  return Math.max(0, 1 - realFactCount / PRIOR_DECAY_THRESHOLD);
}

/**
 * Blends a stored prior value with a computed value from real facts.
 * When w=1 (no facts), returns the prior. When w=0 (many facts), returns computed.
 *
 * @param {number} priorValue     — the stored prior estimate (0–100)
 * @param {number} computedValue  — value derived from real facts (0–100)
 * @param {number} realFactCount  — how many real facts exist for this dimension
 * @returns {number} blended value
 */
export function blendWithPrior(priorValue, computedValue, realFactCount) {
  const w = priorWeight(realFactCount);
  return (w * priorValue) + ((1 - w) * computedValue);
}

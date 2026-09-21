/**
 * Impact Engine for Jarvis Conversational Actions
 * Deterministically computes the impact of an AI proposal on the system state.
 */

import { calculateCapacity } from '../routineEngine.js';

const PHASE_WEIGHTS = Object.freeze({
  building: { consistency: 0.45, volume: 0.40, momentum: 0.15 },
  maintaining: { consistency: 0.25, volume: 0.50, momentum: 0.25 },
  advancing: { consistency: 0.15, volume: 0.60, momentum: 0.25 },
});

function durationFromPayload(payload) {
  if (Number.isFinite(Number(payload.durationMinutes))) return Number(payload.durationMinutes);
  const timeSlot = payload.routineSlot || payload.implementationIntention?.timeSlot || '';
  const match = String(timeSlot).match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  if (!match) return 20;
  const toMinutes = value => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  };
  return Math.max(0, toMinutes(match[2]) - toMinutes(match[1]));
}

function frequencyPerWeek(frequency) {
  if (frequency?.type === 'weekly' && Array.isArray(frequency.days)) return frequency.days.length;
  return frequency?.type === 'daily' ? 7 : 1;
}

/**
 * Projects the canonical C/V/M formula over 90 days using explicit scenarios.
 * This is not a promise of future performance: assumptions are returned with
 * the result so the UI can show exactly why the range exists.
 */
export function projectThreeMonthImpact(proposal, currentState = {}) {
  const domain = proposal.payload?.domain;
  const details = currentState.axisDetails?.[domain] || {};
  const before = Number(currentState.stats?.[domain] ?? currentState.scores?.[domain] ?? 0);
  const phase = proposal.payload?.phase || 'building';
  const weights = PHASE_WEIGHTS[phase] || PHASE_WEIGHTS.building;
  const currentConsistency = Number(details.C ?? 0);
  const currentVolume = Number(details.V ?? 0);
  const currentMomentum = Number(details.M ?? 0);
  const weeks = 13;
  const frequency = frequencyPerWeek(proposal.payload?.frequency);
  const roadmap = proposal.payload?.masteryRoadmap;
  const level = Number(roadmap?.currentLevel || 1);
  const totalLevels = Math.max(Number(roadmap?.levels?.length || 1), 1);
  const masteryFactor = 0.7 + 0.3 * Math.min(level / totalLevels, 1);
  const hasVolumePath = Boolean(proposal.payload?.linkedQuestId || proposal.actionType === 'add_quest');
  const scenarios = [0.6, 0.9].map(adherence => {
    const scheduledCompletions = frequency * weeks;
    const addedCompletions = scheduledCompletions * adherence;
    const projectedConsistency = Math.min(100, Math.max(currentConsistency, adherence * 100));
    const projectedVolume = hasVolumePath
      ? Math.min(100, currentVolume + (addedCompletions / Math.max(frequency * 52, 1)) * 100 * masteryFactor)
      : currentVolume;
    const projectedMomentum = Math.min(20, Math.max(-20, currentMomentum + (adherence - 0.5) * 20));
    const projected = Math.min(99, Math.max(0,
      weights.consistency * projectedConsistency +
      weights.volume * projectedVolume +
      weights.momentum * projectedMomentum
    ));
    return { adherence, score: Math.round(projected), addedCompletions: Math.round(addedCompletions) };
  });

  return {
    domain,
    horizonDays: 90,
    before,
    estimatedRange: {
      low: Math.min(...scenarios.map(scenario => scenario.score)),
      high: Math.max(...scenarios.map(scenario => scenario.score)),
    },
    scenarios,
    assumptions: [
      'Projection horizon is 90 days (13 weeks).',
      'Low and high adherence scenarios are 60% and 90%.',
      `Phase weights are ${phase}: C ${weights.consistency}, V ${weights.volume}, M ${weights.momentum}.`,
      `Mastery multiplier is ${masteryFactor.toFixed(2)}.`,
    ],
    warnings: hasVolumePath ? [] : ['No linked quest or evidence path was supplied; projected Volume remains unchanged.'],
  };
}

export function computeImpact(proposal, currentState) {
  const { actionType, payload } = proposal;
  const { habits = [], routine = {} } = currentState;
  const routineConfig = {
    weeklyBudget: routine.weeklyBudget || { total: routine.total ?? 14, unit: 'hours' },
    timeSlots: routine.timeSlots || [],
    constraints: routine.constraints || [],
  };
  const before = calculateCapacity(routineConfig, habits);
  
  const impact = {
    affectedDomains: [],
    scoringImpact: 'No direct scoring impact.',
    routineImpact: 'No routine impact.',
    identityAlignment: 'Neutral.',
    disciplineImpact: 'Neutral.',
    risks: [],
    dependencies: [],
    scoringProjections: {},
  };

  switch (actionType) {
    case 'add_habit': {
      if (payload.domain) impact.affectedDomains.push(payload.domain);
      impact.scoringImpact = 'Will initially decrease domain consistency score until habit is established.';
      const days = payload.frequency?.type === 'weekly' && Array.isArray(payload.frequency.days)
        ? payload.frequency.days
        : [0, 1, 2, 3, 4, 5, 6];
      const newHabit = { id: '__proposal__', ...payload, target: { durationMinutes: durationFromPayload(payload) } };
      const after = calculateCapacity({
        ...routineConfig,
        timeSlots: [...routineConfig.timeSlots, {
          ...(payload.routineSlot || {}),
          habitId: '__proposal__',
          day: payload.routineSlot?.day || days,
          duration: durationFromPayload(payload),
        }],
      }, [...habits, newHabit]);
      impact.routineImpact = `Routine: ${before.usedHours.toFixed(2)}h -> ${after.usedHours.toFixed(2)}h used (${after.freeHours.toFixed(2)}h free).`;
      if (after.overcommitted) impact.risks.push('Overcommitment: This habit exceeds your available weekly routine capacity.');
      if (after.conflicts.length > 0) impact.risks.push(`${after.conflicts.length} schedule conflict(s) detected.`);
      impact.dependencies = payload.dependencies || [];
      if (payload.identityVote) {
        impact.identityAlignment = `Directly supports: "${payload.identityVote}"`;
      }
      const projection = projectThreeMonthImpact(proposal, currentState);
      impact.scoringProjections[projection.domain] = projection;
      break;
    }
    
    case 'modify_habit':
      if (payload.domain) impact.affectedDomains.push(payload.domain);
      impact.scoringImpact = 'Consistency score may fluctuate during adjustment period.';
      break;
      
    case 'pause_habit':
      impact.scoringImpact = 'Habit will stop contributing to Consistency and Volume for its domain.';
      impact.routineImpact = 'Frees up routine capacity.';
      break;
      
    case 'archive_habit':
      impact.scoringImpact = 'Habit will be permanently removed from scoring metrics.';
      impact.risks.push('Destructive action: Habit history will be preserved, but it can no longer be tracked.');
      break;
      
    case 'add_quest':
      if (payload.domain) impact.affectedDomains.push(payload.domain);
      impact.scoringImpact = 'Increases potential Volume stat when completed.';
      break;

    case 'modify_roadmap':
    case 'update_mastery_level':
      impact.scoringImpact = 'Changes the evidence quality and mastery contribution for the linked habit.';
      break;

    case 'adjust_routine':
      impact.routineImpact = 'Routine schedule and capacity will be recalculated from the proposed slots and constraints.';
      break;

    case 'add_learning':
      impact.affectedDomains.push(payload.domain || 'knowledge');
      impact.scoringImpact = 'Adds a learning record; application evidence is required for strong Knowledge impact.';
      break;

    case 'suggest_experiment':
      impact.affectedDomains.push(payload.domain || 'social');
      impact.scoringImpact = 'Creates an experiment for later evidence; no immediate score increase.';
      break;

    case 'revise_target':
      impact.affectedDomains.push(payload.dimension);
      impact.scoringImpact = 'Changes the target gap, not the current evidence score.';
      break;

    case 'log_evidence':
      if (payload.domain) impact.affectedDomains.push(payload.domain);
      impact.scoringImpact = 'Adds a raw evidence event; downstream scores may change only when the scoring/evidence engine recognizes its type.';
      break;

    case 'propose_memory':
      impact.scoringImpact = 'Creates a reviewable AI memory proposal. It is not authoritative until the user confirms it.';
      break;

    case 'create_plan':
      impact.scoringImpact = `Executes ${Array.isArray(payload.steps) ? payload.steps.length : 0} ordered actions as one approved plan.`;
      impact.risks.push('Plan writes are executed sequentially; failed plans attempt to roll back completed steps.');
      break;

    case 'add_goal':
      impact.scoringImpact = 'Adds a new target structure; current evidence score is unchanged until evidence accumulates.';
      break;

    case 'modify_goal':
      impact.scoringImpact = 'Changes the goal definition or target structure; current evidence is preserved.';
      break;

    case 'update_experiment':
      impact.scoringImpact = 'Updates experiment state or results so Jarvis can evaluate the hypothesis against observed evidence.';
      break;
  }
  
  return impact;
}

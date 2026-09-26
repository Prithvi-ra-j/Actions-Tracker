/**
 * Action Executor for Jarvis Conversational Actions
 * Respects ADR-004 (AI Write Boundary). This is the only module that translates
 * an APPROVED ActionProposal into a database write.
 */

import { addHabit, updateHabit, getHabit, archiveHabit as dbArchiveHabit } from '../../database/habitRepository.js';
import { addQuest, deleteQuest } from '../../database/questBoardRepository.js';
import { addGoal, getGoal, updateGoal, deleteGoal } from '../../database/goalsRepository.js';
import { addLearning, updateLearning, deleteLearning } from '../../database/learningRepository.js';
import { addExperiment, getExperiment, updateExperiment, deleteExperiment } from '../../database/experimentRepository.js';
import { getSelfModel, updateSelfModel } from '../../database/selfModelRepository.js';
import { getAllAxisConfigs, updateAxisConfig } from '../../database/axisConfigRepository.js';
import { addMemory, rejectMemory } from '../../database/memoryRepository.js';
import { addFact, getFact, getAllFacts } from '../../database/factsRepository.js';
import { getRoutineConfig, updateRoutineConfig } from '../../database/routineRepository.js';
import { generateOccurrencesForDate } from '../occurrenceEngine.js';
import { localDateStr } from '../../helpers/dateHelpers.js';
import { ActionProposalSchema } from './actionSchemas.js';
import { addLog, deleteLog } from '../../database/logsRepository.js';
import { getSetting } from '../../database/settingsRepository.js';

function requireId(payload, actionType) {
  if (!payload.id || typeof payload.id !== 'string') {
    throw new Error(`${actionType} requires payload.id`);
  }
  return payload.id;
}

export async function validateActionPreconditions(proposal) {
  const validatedProposal = ActionProposalSchema.parse(proposal);
  const existingHabitActions = new Set([
    'modify_habit', 'pause_habit', 'archive_habit', 'modify_roadmap', 'update_mastery_level',
  ]);

  if (existingHabitActions.has(validatedProposal.actionType)) {
    const habitId = requireId(validatedProposal.payload, validatedProposal.actionType);
    const habit = await getHabit(habitId);
    if (!habit) throw new Error(`Habit ${habitId} no longer exists; proposal is stale`);
    if (validatedProposal.actionType === 'update_mastery_level' && !habit.masteryRoadmap) {
      throw new Error(`Habit ${habitId} has no mastery roadmap`);
    }
  }

  if (validatedProposal.actionType === 'modify_goal') {
    if (!(await getGoal(validatedProposal.payload.id))) throw new Error(`Goal ${validatedProposal.payload.id} no longer exists; proposal is stale`);
  }
  if (validatedProposal.actionType === 'update_experiment') {
    if (!(await getExperiment(validatedProposal.payload.id))) throw new Error(`Experiment ${validatedProposal.payload.id} no longer exists; proposal is stale`);
  }

  return validatedProposal;
}

async function recordActionFact(actionType, payload, result) {
  const { executionKey, before } = result;
  return addFact({
    type: `jarvis_action.${actionType}`,
    objectId: result?.id ?? payload.id ?? null,
    value: 1,
    meta: { payload, result, before, executionKey, source: 'jarvis_conversational' },
  });
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function createExecutionKey(proposal) {
  return `${proposal.actionType}:${stableStringify(proposal.payload)}`;
}

async function addRoutineSlot(payload, habitId) {
  if (!payload.routineSlot && !payload.implementationIntention?.timeSlot) return null;
  const routine = await getRoutineConfig();
  const slot = {
    ...(payload.routineSlot || {}),
    habitId,
    duration: Number(payload.routineSlot?.duration ?? payload.durationMinutes ?? 20),
  };
  const timeSlots = [...(routine.timeSlots || []), slot];
  return updateRoutineConfig({ timeSlots });
}

export async function executeAction(proposal) {
  const validatedProposal = await validateActionPreconditions(proposal);
  const { actionType, payload } = validatedProposal;
  const executionKey = createExecutionKey(validatedProposal);
  const priorAction = (await getAllFacts()).find(fact => fact.meta?.executionKey === executionKey);
  if (priorAction) return {
    ...(priorAction.meta?.result || {}),
    actionFactId: priorAction.id,
    idempotent: true,
  };

  const before = actionType === 'complete_onboarding'
    ? { selfModel: await getSelfModel(), axisConfigs: await getAllAxisConfigs() }
    : payload.id
    ? actionType === 'modify_goal'
      ? await getGoal(payload.id)
      : actionType === 'update_experiment'
        ? await getExperiment(payload.id)
        : await getHabit(payload.id)
    : actionType === 'adjust_routine'
      ? await getRoutineConfig()
      : actionType === 'revise_target'
        ? await getSelfModel()
        : null;
  let result = { actionType, executionKey, before };
  
  switch (actionType) {
    case 'add_habit': {
      const id = await addHabit({
        id: payload.id,
        name: payload.name,
        description: payload.description,
        domain: payload.domain,
        frequency: payload.frequency || { type: 'daily' },
        trackingMethod: payload.trackingMethod || 'boolean',
        identityVote: payload.identityVote,
        tinyVersion: payload.tinyVersion,
        phase: payload.phase || 'building',
        implementationIntention: payload.implementationIntention,
        masteryRoadmap: payload.masteryRoadmap,
        source: { type: 'integration', integrationId: 'jarvis_conversational' }
      });
      await addRoutineSlot(payload, id);
      await generateOccurrencesForDate(payload.firstOccurrenceDate || localDateStr());
      result = { ...result, id };
      break;
    }
    
    case 'modify_habit': {
      const id = requireId(payload, actionType);
      const { id: ignoredId, ...updates } = payload;
      await updateHabit(id, updates);
      result = { ...result, id };
      break;
    }
    
    case 'pause_habit': {
      const id = requireId(payload, actionType);
      await updateHabit(id, { status: 'paused' });
      result = { ...result, id };
      break;
    }
    
    case 'archive_habit': {
      const id = requireId(payload, actionType);
      await dbArchiveHabit(id);
      result = { ...result, id };
      break;
    }
    
    case 'add_goal': {
      const id = await addGoal({
        ...payload,
        label: payload.label || payload.title,
        title: payload.title || payload.label,
      });
      result = { ...result, id };
      break;
    }

    case 'modify_goal': {
      const id = requireId(payload, actionType);
      const { id: ignoredId, ...updates } = payload;
      await updateGoal(id, updates);
      result = { ...result, id };
      break;
    }

    case 'update_experiment': {
      const id = requireId(payload, actionType);
      const { id: ignoredId, ...updates } = payload;
      await updateExperiment(id, updates);
      result = { ...result, id };
      break;
    }

    case 'add_quest': {
      const id = await addQuest({
        title: payload.title,
        axis: payload.domain,
        targetValue: payload.targetValue || 1,
        unit: payload.unit || 'actions',
        currentValue: 0,
        metric: payload.metric,
        weight: payload.weight || 1,
        done: false,
      });
      result = { ...result, id };
      break;
    }
    
    case 'add_learning': {
      const id = await addLearning({
        concept: payload.concept || payload.content,
        explanation: payload.explanation || payload.content,
        sourceId: payload.sourceId,
        sourceType: payload.sourceType || 'other',
        personalApplication: payload.personalApplication,
        domain: payload.domain || 'knowledge',
      });
      result = { ...result, id };
      break;
    }

    case 'modify_roadmap': {
      const id = requireId(payload, actionType);
      await updateHabit(id, { masteryRoadmap: payload.masteryRoadmap });
      result = { ...result, id };
      break;
    }

    case 'adjust_routine': {
      const current = await getRoutineConfig();
      const next = await updateRoutineConfig({
        timeSlots: payload.timeSlots ?? current.timeSlots,
        constraints: payload.constraints ?? current.constraints,
        weeklyBudget: payload.weeklyBudget ?? current.weeklyBudget,
      });
      result = { ...result, id: next.id };
      break;
    }

    case 'update_mastery_level': {
      const id = requireId(payload, actionType);
      const habit = await getHabit(id);
      if (!habit?.masteryRoadmap) throw new Error(`Habit ${id} has no mastery roadmap`);
      const totalLevels = habit.masteryRoadmap.levels?.length || 1;
      if (!Number.isInteger(payload.currentLevel) || payload.currentLevel < 1 || payload.currentLevel > totalLevels) {
        throw new Error(`currentLevel must be an integer between 1 and ${totalLevels}`);
      }
      await updateHabit(id, {
        masteryRoadmap: { ...habit.masteryRoadmap, currentLevel: payload.currentLevel },
      });
      result = { ...result, id };
      break;
    }

    case 'suggest_experiment': {
      const id = await addExperiment({
        domain: payload.domain || 'social',
        hypothesis: payload.hypothesis,
        protocol: payload.protocol,
      });
      result = { ...result, id };
      break;
    }

    case 'log_evidence': {
      const evidenceFactId = await addFact({
        type: payload.evidenceType || 'manual_evidence',
        objectId: payload.objectId || null,
        value: payload.value ?? null,
        meta: {
          text: payload.text,
          domain: payload.domain || null,
          source: 'jarvis_conversational',
        },
        context: payload.context || {},
        occurredAt: payload.occurredAt || new Date().toISOString(),
      });
      result = { ...result, id: evidenceFactId, evidenceFactId };
      break;
    }

    case 'propose_memory': {
      if ((await getSetting('jarvisSaveMemories')) === 'false') {
        throw new Error('Memory saving is disabled in Settings.');
      }
      const id = await addMemory({
        type: payload.type || 'semantic',
        content: payload.content,
        confidence: typeof payload.confidence === 'number' ? payload.confidence : 0.6,
        status: 'proposed',
        supportingFactIds: payload.supportingFactIds || [],
        source: 'ai',
        tags: payload.tags || [],
      });
      result = { ...result, id, status: 'proposed' };
      break;
    }

    case 'complete_onboarding': {
      // Jarvis is allowed to establish direction, but the user still has the
      // final approval boundary: this action only runs after the proposal is
      // explicitly approved in the UI.
      const now = new Date().toISOString();
      const payloadBaseline = payload.baseline || {};
      const focusAxes = [...new Set(payload.focusAxes)].filter(Boolean);
      const desiredDimensions = payload.desiredSelf?.dimensions || {};

      const currentState = {};
      for (const axis of focusAxes) {
        const baseline = payloadBaseline[axis] || {};
        currentState[axis] = {
          value: Number.isFinite(baseline.value) ? Math.max(0, Math.min(99, baseline.value)) : 0,
          confidence: Number.isFinite(baseline.confidence) ? Math.max(0, Math.min(1, baseline.confidence)) : 0.25,
          evidence: baseline.evidence || JSON.stringify(baseline),
          lastUpdated: now,
        };
      }

      await updateSelfModel({
        identity: payload.identity || {},
        focusAxes,
        baseline: payloadBaseline,
        currentState,
        desiredSelf: {
          vision: payload.desiredSelf?.vision || '',
          dimensions: desiredDimensions,
        },
        setupState: 'jarvis_design_pending',
        onboardingCompletedAt: now,
        onboardingVersion: 5,
        provenance: payload.provenance || { source: 'jarvis_conversational' },
      });

      for (const axis of focusAxes) {
        const baseline = payloadBaseline[axis] || {};
        await updateAxisConfig(axis, {
          baselineRatePerWeek: Number.isFinite(baseline.ratePerWeek) ? baseline.ratePerWeek : 0,
          expectedPerWeek: null,
          paused: false,
          hasConsistencyTerm: false,
          scoringMode: 'awaiting_jarvis_design',
          source: 'jarvis_onboarding',
        });
      }

      // Seed the canonical onboarding baseline used by the scoring engine.
      // These logs are baseline evidence only: statsEngine excludes them from
      // activity counts but blends them into the starting score and fades that
      // influence as real activity accumulates.
      const onboardingLogIds = [];
      const baselineAxes = [...new Set([...focusAxes, 'discipline'])];
      for (const axis of baselineAxes) {
        const baseline = payloadBaseline[axis] || {};
        const rawValue = Number(baseline.value ?? baseline.score);
        if (!Number.isFinite(rawValue)) continue;
        const value = Math.max(0, Math.min(99, rawValue));
        const id = await addLog({
          axis,
          type: 'onboarding_assessment',
          value,
          date: localDateStr(),
          meta: {
            source: 'jarvis_onboarding',
            confidence: Number.isFinite(baseline.confidence) ? baseline.confidence : null,
            evidence: baseline.evidence || null,
          },
        });
        onboardingLogIds.push(id);
      }

      result = {
        ...result,
        id: 'onboarding',
        completedAt: now,
        setupState: 'jarvis_design_pending',
        onboardingLogIds,
      };
      break;
    }

    case 'create_plan': {
      const childActionFactIds = [];
      const childResults = [];
      try {
        for (const step of payload.steps) {
          const stepProposal = {
            actionType: step.actionType,
            payload: step.payload,
            impact: {
              affectedDomains: [],
              scoringImpact: 'Part of an approved Jarvis plan.',
              routineImpact: 'See plan-level impact.',
              identityAlignment: '',
              disciplineImpact: '',
              risks: [],
              dependencies: [],
            },
            reasoning: 'Approved as part of a Jarvis plan.',
            confidence: validatedProposal.confidence,
          };
          const stepResult = await executeAction(stepProposal);
          childResults.push(stepResult);
          if (stepResult.actionFactId) childActionFactIds.push(stepResult.actionFactId);
        }
      } catch (error) {
        for (const childFactId of [...childActionFactIds].reverse()) {
          try { await undoAction(childFactId); } catch (rollbackError) { console.error('[actionExecutor] Plan rollback failed:', rollbackError); }
        }
        throw new Error(`Plan failed and completed steps were rolled back: ${error.message}`);
      }
      result = { ...result, id: `plan_${Date.now()}`, childActionFactIds, childResults };
      break;
    }

    case 'revise_target': {
      if (!payload.dimension || typeof payload.targetValue !== 'number') {
        throw new Error('revise_target requires dimension and numeric targetValue');
      }
      const model = await updateSelfModel({
        desiredSelf: {
          dimensions: {
            [payload.dimension]: {
              ...(payload.currentTarget || {}),
              targetValue: payload.targetValue,
              why: payload.why || payload.currentTarget?.why || '',
              timeframe: payload.timeframe || payload.currentTarget?.timeframe || '',
            },
          },
        },
      });
      result = { ...result, id: model.id };
      break;
    }
    
    default:
      throw new Error(`[actionExecutor] Unsupported actionType: ${actionType}`);
  }

  const actionFactId = await recordActionFact(actionType, payload, result);
  return { ...result, actionFactId, idempotent: false };
}

export async function undoAction(actionFactId) {
  const actionFact = await getFact(actionFactId);
  if (!actionFact?.type?.startsWith('jarvis_action.')) throw new Error('Action fact not found');
  const actionType = actionFact.type.replace('jarvis_action.', '');
  const { before, result } = actionFact.meta || {};

  if (actionType === 'add_habit') {
    const habit = await getHabit(result?.id);
    if (habit) await dbArchiveHabit(result.id);
  } else if (['modify_habit', 'pause_habit', 'archive_habit', 'modify_roadmap', 'update_mastery_level'].includes(actionType) && before?.id) {
    await updateHabit(before.id, before);
  } else if (actionType === 'add_goal') {
    await deleteGoal(result.id);
  } else if (actionType === 'modify_goal' && before?.id) {
    await updateGoal(before.id, before);
  } else if (actionType === 'update_experiment' && before?.id) {
    await updateExperiment(before.id, before);
  } else if (actionType === 'add_quest') {
    await deleteQuest(result.id);
  } else if (actionType === 'add_learning') {
    await deleteLearning(result.id);
  } else if (actionType === 'suggest_experiment') {
    await deleteExperiment(result.id);
  } else if (actionType === 'adjust_routine') {
    await updateRoutineConfig(before);
  } else if (actionType === 'revise_target') {
    await updateSelfModel(before);
  } else if (actionType === 'complete_onboarding') {
    if (before?.selfModel) await updateSelfModel(before.selfModel);
    for (const config of before?.axisConfigs || []) {
      await updateAxisConfig(config.axis, config);
    }
    for (const logId of result?.onboardingLogIds || []) {
      await deleteLog(logId);
    }
  } else if (actionType === 'log_evidence') {
    const evidenceFactId = result?.evidenceFactId || result?.id;
    if (evidenceFactId) {
      await addFact({
        type: 'retraction',
        objectId: evidenceFactId,
        value: 1,
        meta: { retractedFactId: evidenceFactId, reason: 'user_undo', source: 'jarvis_conversational' },
      });
    }
  } else if (actionType === 'propose_memory') {
    if (result?.id) await rejectMemory(result.id);
  } else if (actionType === 'create_plan') {
    for (const childFactId of [...(result?.childActionFactIds || [])].reverse()) {
      try { await undoAction(childFactId); } catch (error) { console.error('[actionExecutor] Plan child undo failed:', error); }
    }
  } else {
    throw new Error(`Undo is not supported for ${actionType}`);
  }

  await addFact({
    type: 'jarvis_action.undo',
    objectId: actionFact.objectId,
    value: 1,
    meta: { undoneActionFactId: actionFactId, source: 'jarvis_conversational' },
  });
  return { undoneActionFactId: actionFactId };
}

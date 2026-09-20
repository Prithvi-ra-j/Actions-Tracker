/**
 * Action Executor for Jarvis Conversational Actions
 * Respects ADR-004 (AI Write Boundary). This is the only module that translates
 * an APPROVED ActionProposal into a database write.
 */

import { addHabit, updateHabit, getHabit, archiveHabit as dbArchiveHabit } from '../../database/habitRepository.js';
import { addQuest, deleteQuest } from '../../database/questBoardRepository.js';
import { addLearning, updateLearning, deleteLearning } from '../../database/learningRepository.js';
import { addExperiment, deleteExperiment } from '../../database/experimentRepository.js';
import { getSelfModel, updateSelfModel } from '../../database/selfModelRepository.js';
import { addFact, getFact, getAllFacts } from '../../database/factsRepository.js';
import { getRoutineConfig, updateRoutineConfig } from '../../database/routineRepository.js';
import { generateOccurrencesForDate } from '../occurrenceEngine.js';
import { localDateStr } from '../../helpers/dateHelpers.js';
import { ActionProposalSchema } from './actionSchemas.js';

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

  return validatedProposal;
}

async function recordActionFact(actionType, payload, result) {
  const { executionKey, before } = result;
  await addFact({
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
  if (priorAction) return { ...(priorAction.meta?.result || {}), idempotent: true };

  const before = payload.id
    ? await getHabit(payload.id)
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
    
    case 'add_quest': {
      const id = await addQuest({
        title: payload.title,
        axis: payload.domain,
        targetValue: payload.targetValue || 1,
        unit: payload.unit || 'actions',
        currentValue: 0,
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

  await recordActionFact(actionType, payload, result);
  return result;
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

/**
 * Action Executor for Jarvis Conversational Actions
 * Respects ADR-004 (AI Write Boundary). This is the only module that translates
 * an APPROVED ActionProposal into a database write.
 */

import { addHabit, updateHabit, getHabit, archiveHabit as dbArchiveHabit } from '../../database/habitRepository.js';
import { addQuest } from '../../database/questBoardRepository.js';
import { addLearning, updateLearning } from '../../database/learningRepository.js';
import { addExperiment } from '../../database/experimentRepository.js';
import { updateSelfModel } from '../../database/selfModelRepository.js';
import { addFact } from '../../database/factsRepository.js';
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

async function recordActionFact(actionType, payload, result) {
  await addFact({
    type: `jarvis_action.${actionType}`,
    objectId: result?.id ?? payload.id ?? null,
    value: 1,
    meta: { payload, result, source: 'jarvis_conversational' },
  });
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
  const validatedProposal = ActionProposalSchema.parse(proposal);
  const { actionType, payload } = validatedProposal;
  let result = { actionType };
  
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

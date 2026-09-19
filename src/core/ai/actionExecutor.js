/**
 * Action Executor for Jarvis Conversational Actions
 * Respects ADR-004 (AI Write Boundary). This is the only module that translates
 * an APPROVED ActionProposal into a database write.
 */

import { addHabit, updateHabit, getHabit, archiveHabit as dbArchiveHabit } from '../../database/habitRepository.js';
import { addQuest } from '../../database/questBoardRepository.js';
import { addLearning } from '../../database/learningRepository.js';

export async function executeAction(proposal) {
  const { actionType, payload } = proposal;
  
  switch (actionType) {
    case 'add_habit': {
      await addHabit({
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
      break;
    }
    
    case 'modify_habit': {
      const { id, ...updates } = payload;
      if (!id) throw new Error("modify_habit requires habit id in payload");
      await updateHabit(id, updates);
      break;
    }
    
    case 'pause_habit': {
      const { id } = payload;
      if (!id) throw new Error("pause_habit requires habit id in payload");
      await updateHabit(id, { status: 'paused' });
      break;
    }
    
    case 'archive_habit': {
      const { id } = payload;
      if (!id) throw new Error("archive_habit requires habit id in payload");
      await dbArchiveHabit(id);
      break;
    }
    
    case 'add_quest': {
      await addQuest({
        title: payload.title,
        axis: payload.domain,
        targetValue: payload.targetValue || 1,
        unit: payload.unit || 'actions',
        currentValue: 0,
        done: false,
      });
      break;
    }
    
    case 'add_learning': {
      await addLearning({
        source: payload.source,
        content: payload.content,
        domain: payload.domain || 'knowledge',
      });
      break;
    }
    
    default:
      console.warn(`[actionExecutor] Unhandled actionType: ${actionType}`);
      break;
  }
}

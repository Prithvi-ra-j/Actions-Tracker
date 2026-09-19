/**
 * Feedback Engine (§30 AI Write Boundary).
 *
 * Processes AI insights that have been explicitly approved by the user.
 * Translates actionable text recommendations into concrete Quests on the Quest Board.
 */

import { updateInsightStatus } from '../../database/insightsRepository.js';
import { getAllQuests } from '../../database/questBoardRepository.js';
import { getEvidence } from '../../database/evidenceRepository.js';
import { executeAction } from './actionExecutor.js';

/**
 * Approves an insight and generates quests from its recommendations.
 * 
 * @param {object} insight The insight object
 */
export async function approveAndApplyInsight(insight) {
  if (insight.status && insight.status !== 'proposed') {
    throw new Error(`Insight ${insight.id} is already ${insight.status}; refusing replay.`);
  }
  // 0. Validate supporting evidence IDs (§29, §30)
  if (insight.supportingEvidenceIds && Array.isArray(insight.supportingEvidenceIds)) {
    for (const evid of insight.supportingEvidenceIds) {
      const e = await getEvidence(evid);
      if (!e) {
        console.warn(`[FeedbackEngine] Insight ${insight.id} references missing evidence ID: ${evid}. Insight is still actionable but flagged.`);
      }
    }
  }

  // Business Rule Validation: Max 10 active quests total to prevent AI spam
  const allQuests = await getAllQuests();
  const activeQuests = allQuests.filter(q => !q.done);
  
  if (activeQuests.length + (insight.recommendedActions?.length || 0) > 10) {
    throw new Error("Business Rule Violation: Cannot apply insight, it would exceed the maximum limit of 10 active quests.");
  }

  // Generate Quests through the generalized approved-action path.
  if (insight.recommendedActions && insight.recommendedActions.length > 0) {
    for (const actionText of insight.recommendedActions) {
      const duplicate = allQuests.some(q => q.linkedInsightId === insight.id && q.title === `AI: ${actionText}`);
      if (duplicate) continue;
      await executeAction({
        actionType: 'add_quest',
        payload: {
          title: `AI: ${actionText}`,
          domain: mapInsightToAxis(insight.type),
          targetValue: 1,
          unit: 'actions',
          linkedInsightId: insight.id,
        },
        impact: {
          affectedDomains: [mapInsightToAxis(insight.type)],
          scoringImpact: 'Creates a quest that can increase Volume when completed.',
          routineImpact: 'No routine change until scheduled.',
          identityAlignment: 'Supports the approved recommendation.',
          disciplineImpact: 'Adds one explicitly approved action target.',
          risks: [],
          dependencies: [],
        },
        reasoning: `Approved from insight ${insight.id}`,
        confidence: insight.confidence ?? 0,
      });
    }
  }

  await updateInsightStatus(insight.id, 'confirmed');
}

function mapInsightToAxis(type) {
  switch(type) {
    case 'risk': return 'strategy';
    case 'pattern': return 'strategy';
    case 'contradiction': return 'discipline';
    case 'recommendation': return 'strategy';
    default: return 'strategy';
  }
}

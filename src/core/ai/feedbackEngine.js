/**
 * Feedback Engine (§30 AI Write Boundary).
 *
 * Processes AI insights that have been explicitly approved by the user.
 * Translates actionable text recommendations into concrete Quests on the Quest Board.
 */

import { updateInsightStatus } from '../../database/insightsRepository.js';
import { addQuest } from '../../database/questBoardRepository.js';
import { getEvidence } from '../../database/evidenceRepository.js';

/**
 * Approves an insight and generates quests from its recommendations.
 * 
 * @param {object} insight The insight object
 */
export async function approveAndApplyInsight(insight) {
  // 0. Validate supporting evidence IDs (§29, §30)
  if (insight.supportingEvidenceIds && Array.isArray(insight.supportingEvidenceIds)) {
    for (const evid of insight.supportingEvidenceIds) {
      const e = await getEvidence(evid);
      if (!e) {
        console.warn(`[FeedbackEngine] Insight ${insight.id} references missing evidence ID: ${evid}. Insight is still actionable but flagged.`);
      }
    }
  }

  // 1. Mark as confirmed
  await updateInsightStatus(insight.id, 'confirmed');

  // 2. Generate Quests for recommended actions
  if (insight.recommendedActions && insight.recommendedActions.length > 0) {
    for (const actionText of insight.recommendedActions) {
      const quest = {
        title: `AI: ${actionText}`,
        // Map the insight type to an axis or default to strategy
        axis: mapInsightToAxis(insight.type),
        targetValue: 1, // One-off task
        currentValue: 0,
        unit: 'actions',
        done: false,
        // Link the quest to the insight for traceability
        linkedInsightId: insight.id
      };
      
      await addQuest(quest);
    }
  }
}

function mapInsightToAxis(type) {
  switch(type) {
    case 'risk': return 'strategy';
    case 'pattern': return 'wisdom';
    case 'contradiction': return 'discipline';
    case 'recommendation': return 'strategy';
    default: return 'strategy';
  }
}

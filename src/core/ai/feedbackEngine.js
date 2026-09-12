/**
 * Feedback Engine (§30 AI Write Boundary).
 *
 * Processes AI insights that have been explicitly approved by the user.
 * Translates actionable text recommendations into concrete Quests on the Quest Board.
 */

import { updateInsightStatus } from '../../database/insightsRepository.js';
import { addQuest } from '../../database/questBoardRepository.js';

/**
 * Approves an insight and generates quests from its recommendations.
 * 
 * @param {object} insight The insight object
 */
export async function approveAndApplyInsight(insight) {
  // 1. Mark as confirmed
  await updateInsightStatus(insight.id, 'confirmed');

  // 2. Generate Quests for recommended actions
  if (insight.recommendedActions && insight.recommendedActions.length > 0) {
    for (const actionText of insight.recommendedActions) {
      const quest = {
        title: `AI: ${actionText}`,
        // Map the insight type to an axis or default to strategy
        axis: mapInsightToAxis(insight.type),
        maxProgress: 1, // One-off task
        progress: 0,
        status: 'active',
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

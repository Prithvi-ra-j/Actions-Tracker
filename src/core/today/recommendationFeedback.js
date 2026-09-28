import { saveTelemetryEvent } from '../../database/telemetryRepository.js';
import { addIntervention } from '../../database/interventionRepository.js';
import { localDateStr } from '../../helpers/dateHelpers.js';

export const TODAY_FEEDBACK_ACTIONS = Object.freeze(['done', 'defer', 'dismiss', 'not_relevant', 'snooze']);

export async function recordTodayRecommendationFeedback({
  recommendationId,
  action,
  date = localDateStr(),
  metadata = {},
} = {}) {
  if (!recommendationId) throw new Error('recommendationId is required');
  if (!TODAY_FEEDBACK_ACTIONS.includes(action)) throw new Error(`Unsupported recommendation feedback: ${action}`);
  await saveTelemetryEvent('today_recommendation_feedback', date, {
    recommendationId,
    action,
    ...metadata,
  });
  let intervention = null;
  if (action === 'done' || action === 'defer') {
    intervention = await addIntervention({
      recommendationId,
      hypothesis: metadata.hypothesis || `The recommended action "${metadata.title || recommendationId}" is feasible in the current context.`,
      context: {
        domain: metadata.domain || null,
        recommendationType: metadata.type || null,
        action,
      },
      expectedOutcome: metadata.expectedOutcome || null,
      measurement: metadata.measurement || null,
      outcomeWindowDays: metadata.outcomeWindowDays || 14,
    });
  }
  return { recommendationId, action, intervention, recordedAt: new Date().toISOString() };
}

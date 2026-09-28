import { saveTelemetryEvent } from '../../database/telemetryRepository.js';

export const TODAY_FEEDBACK_ACTIONS = Object.freeze(['done', 'defer', 'dismiss', 'not_relevant', 'snooze']);

export async function recordTodayRecommendationFeedback({
  recommendationId,
  action,
  date = new Date().toISOString().slice(0, 10),
  metadata = {},
} = {}) {
  if (!recommendationId) throw new Error('recommendationId is required');
  if (!TODAY_FEEDBACK_ACTIONS.includes(action)) throw new Error(`Unsupported recommendation feedback: ${action}`);
  await saveTelemetryEvent('today_recommendation_feedback', date, {
    recommendationId,
    action,
    ...metadata,
  });
  return { recommendationId, action, recordedAt: new Date().toISOString() };
}

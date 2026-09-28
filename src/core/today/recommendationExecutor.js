import { completeOccurrence, getOccurrence } from '../../database/habitOccurrenceRepository.js';
import { addFact } from '../../database/factsRepository.js';
import { recordTodayRecommendationFeedback } from './recommendationFeedback.js';

export const RECOMMENDATION_EXECUTION_RESULTS = Object.freeze([
  'completed',
  'deferred',
  'dismissed',
  'snoozed',
  'not_relevant',
  'informational',
]);

export async function executeTodayRecommendation({
  recommendation,
  action,
  value = null,
  supportingFactIds = [],
  feedbackMetadata = {},
} = {}) {
  if (!recommendation?.id) throw new Error('recommendation is required');
  if (!['done', 'defer', 'dismiss', 'snooze', 'not_relevant'].includes(action)) {
    throw new Error(`Unsupported recommendation action: ${action}`);
  }

  const result = {
    recommendationId: recommendation.id,
    action,
    execution: 'informational',
    executed: false,
  };

  if (action === 'done' && recommendation.type === 'action' && recommendation.actionId) {
    const occurrence = await getOccurrence(recommendation.actionId);
    if (!occurrence) throw new Error(`Recommendation target not found: ${recommendation.actionId}`);
    if (['completed', 'excused'].includes(occurrence.status)) {
      result.execution = 'completed';
      result.executed = true;
    } else {
      await completeOccurrence(recommendation.actionId, value, supportingFactIds);
      const factId = await addFact({
        type: 'habit_completion',
        objectId: occurrence.habitId || recommendation.actionId,
        value: value ?? 1,
        source: { type: 'manual' },
        meta: {
          recommendationId: recommendation.id,
          occurrenceId: recommendation.actionId,
          source: 'today_recommendation',
        },
      });
      result.factId = factId;
      result.execution = 'completed';
      result.executed = true;
    }
  } else if (action === 'done' && recommendation.type === 'action') {
    throw new Error(`Action recommendation ${recommendation.id} has no executable target`);
  }

  await recordTodayRecommendationFeedback({
    recommendationId: recommendation.id,
    action,
    metadata: {
      ...feedbackMetadata,
      domain: recommendation.domain,
      type: recommendation.type,
      title: recommendation.title,
      hypothesis: recommendation.reason,
      execution: result.execution,
      executed: result.executed,
    },
  });

  return result;
}

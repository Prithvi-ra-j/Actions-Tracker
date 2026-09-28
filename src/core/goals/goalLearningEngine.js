import { getAllFacts } from '../../database/factsRepository.js';

export async function learnGoal(goalId) {
  const facts = await getAllFacts();
  const relevant = facts.filter(f => f.objectId === goalId);
  const assessments = relevant.filter(f => f.type === 'goal.assessment');
  const adaptations = relevant.filter(f => f.type === 'goal.plan.adapted');
  const learning = relevant.filter(f => f.type === 'goal.learning');
  return {
    goalId,
    assessmentCount: assessments.length,
    adaptationCount: adaptations.length,
    learningCount: learning.length,
    latestAssessment: assessments.at(-1)?.meta || null,
    latestLearning: learning.at(-1)?.meta || null,
    planAdapted: adaptations.length > 0,
  };
}

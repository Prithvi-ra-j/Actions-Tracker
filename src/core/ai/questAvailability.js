export function containsQuestAction(proposal) {
  return proposal?.actionType === 'add_quest' ||
    (proposal?.actionType === 'create_plan' && Array.isArray(proposal.payload?.steps) &&
      proposal.payload.steps.some(containsQuestAction));
}

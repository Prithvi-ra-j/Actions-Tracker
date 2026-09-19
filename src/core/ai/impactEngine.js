/**
 * Impact Engine for Jarvis Conversational Actions
 * Deterministically computes the impact of an AI proposal on the system state.
 */

export function computeImpact(proposal, currentState) {
  const { actionType, payload } = proposal;
  const { habits = [], routine = { usedHours: 0, freeHours: 14 } } = currentState;
  
  const impact = {
    scoringImpact: 'No direct scoring impact.',
    routineImpact: 'No routine impact.',
    identityAlignment: 'Neutral.',
    disciplineImpact: 'Neutral.',
    risks: [],
    dependencies: [],
  };

  switch (actionType) {
    case 'add_habit': {
      impact.scoringImpact = 'Will initially decrease domain consistency score until habit is established.';
      
      let durationHours = 0;
      if (payload.implementationIntention?.timeSlot) {
        // e.g. "20:00-20:20" -> 20 mins -> 0.33 hours
        // For now, rough estimate based on a standard 30 min block if not parsable
        durationHours = 0.5; 
      }
      
      const newUsedHours = routine.usedHours + durationHours;
      const newFreeHours = Math.max(0, routine.freeHours - durationHours);
      impact.routineImpact = `Routine capacity used increases by ~${durationHours} hours/week (Free: ${newFreeHours}h).`;
      
      if (newUsedHours > (routine.total ?? 14)) {
        impact.risks.push('Overcommitment: This habit exceeds your available weekly routine capacity.');
      }
      
      if (payload.identityVote) {
        impact.identityAlignment = `Directly supports: "${payload.identityVote}"`;
      }
      break;
    }
    
    case 'modify_habit':
      impact.scoringImpact = 'Consistency score may fluctuate during adjustment period.';
      break;
      
    case 'pause_habit':
      impact.scoringImpact = 'Habit will stop contributing to Consistency and Volume for its domain.';
      impact.routineImpact = 'Frees up routine capacity.';
      break;
      
    case 'archive_habit':
      impact.scoringImpact = 'Habit will be permanently removed from scoring metrics.';
      impact.risks.push('Destructive action: Habit history will be preserved, but it can no longer be tracked.');
      break;
      
    case 'add_quest':
      impact.scoringImpact = 'Increases potential Volume stat when completed.';
      break;
  }
  
  return impact;
}

import { z } from 'zod';

export const ActionProposalSchema = z.object({
  actionType: z.enum([
    'add_habit', 'modify_habit', 'pause_habit', 'archive_habit',
    'add_quest', 'modify_roadmap', 'adjust_routine', 'update_mastery_level',
    'add_learning', 'suggest_experiment', 'revise_target',
  ]),
  payload: z.record(z.any()), 
  impact: z.object({
    affectedDomains: z.array(z.string()),
    scoringImpact: z.string(),           
    routineImpact: z.string(),           
    identityAlignment: z.string(),       
    disciplineImpact: z.string(),        
    risks: z.array(z.string()),          
    dependencies: z.array(z.string()),   
  }),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
});

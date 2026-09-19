import { z } from 'zod';

const ACTIONS_REQUIRING_ID = new Set([
  'modify_habit', 'pause_habit', 'archive_habit', 'modify_roadmap', 'update_mastery_level',
]);

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
}).superRefine((proposal, context) => {
  if (ACTIONS_REQUIRING_ID.has(proposal.actionType) && typeof proposal.payload.id !== 'string') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['payload', 'id'], message: 'This action requires payload.id' });
  }
  if (proposal.actionType === 'add_habit' && typeof proposal.payload.name !== 'string') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['payload', 'name'], message: 'add_habit requires payload.name' });
  }
  if (proposal.actionType === 'add_quest' && typeof proposal.payload.title !== 'string') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['payload', 'title'], message: 'add_quest requires payload.title' });
  }
  if (proposal.actionType === 'suggest_experiment' && typeof proposal.payload.hypothesis !== 'string') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['payload', 'hypothesis'], message: 'suggest_experiment requires payload.hypothesis' });
  }
});

import { z } from 'zod';

export const ACTION_TYPES = [
  'add_habit', 'modify_habit', 'pause_habit', 'archive_habit',
  'add_quest', 'modify_roadmap', 'adjust_routine', 'update_mastery_level',
  'add_learning', 'suggest_experiment', 'revise_target',
  'log_evidence', 'propose_memory', 'create_plan', 'complete_onboarding', 'add_goal', 'modify_goal', 'update_experiment',
];

const ACTIONS_REQUIRING_ID = new Set([
  'modify_habit', 'pause_habit', 'archive_habit', 'modify_roadmap', 'update_mastery_level', 'modify_goal', 'update_experiment',
]);

const PlanStepSchema = z.object({
  actionType: z.enum(ACTION_TYPES.filter(type => type !== 'create_plan')),
  payload: z.record(z.any()),
});

export const ActionProposalSchema = z.object({
  actionType: z.enum(ACTION_TYPES),
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
  if (proposal.actionType === 'add_goal' && typeof proposal.payload.label !== 'string' && typeof proposal.payload.title !== 'string') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['payload', 'label'], message: 'add_goal requires payload.label or payload.title' });
  }
  if (proposal.actionType === 'update_experiment' && typeof proposal.payload.id !== 'string') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['payload', 'id'], message: 'update_experiment requires payload.id' });
  }
  if (proposal.actionType === 'add_habit' && typeof proposal.payload.name !== 'string') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['payload', 'name'], message: 'add_habit requires payload.name' });
  }
  if (proposal.actionType === 'add_quest' && typeof proposal.payload.title !== 'string') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['payload', 'title'], message: 'add_quest requires payload.title' });
  }
  if (proposal.actionType === 'add_quest' && (!proposal.payload.metric || typeof proposal.payload.metric.type !== 'string')) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['payload', 'metric'], message: 'add_quest requires payload.metric object' });
  }
  if (proposal.actionType === 'suggest_experiment' && typeof proposal.payload.hypothesis !== 'string') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['payload', 'hypothesis'], message: 'suggest_experiment requires payload.hypothesis' });
  }
  if (proposal.actionType === 'log_evidence' && typeof proposal.payload.text !== 'string') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['payload', 'text'], message: 'log_evidence requires payload.text' });
  }
  if (proposal.actionType === 'propose_memory' && typeof proposal.payload.content !== 'string') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['payload', 'content'], message: 'propose_memory requires payload.content' });
  }
  if (proposal.actionType === 'complete_onboarding') {
    if (!proposal.payload.identity || typeof proposal.payload.identity !== 'object') {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['payload', 'identity'], message: 'complete_onboarding requires identity' });
    }
    if (!Array.isArray(proposal.payload.focusAxes) || proposal.payload.focusAxes.length < 1) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['payload', 'focusAxes'], message: 'complete_onboarding requires at least one focus axis' });
    }
    if (!proposal.payload.desiredSelf || typeof proposal.payload.desiredSelf !== 'object') {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['payload', 'desiredSelf'], message: 'complete_onboarding requires desiredSelf' });
    }
  }
  if (proposal.actionType === 'create_plan') {
    if (!Array.isArray(proposal.payload.steps) || proposal.payload.steps.length < 1 || proposal.payload.steps.length > 8) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['payload', 'steps'], message: 'create_plan requires 1-8 steps' });
    } else {
      const parsed = z.array(PlanStepSchema).safeParse(proposal.payload.steps);
      if (!parsed.success) context.addIssue({ code: z.ZodIssueCode.custom, path: ['payload', 'steps'], message: 'Plan contains an invalid step' });
    }
  }
});

import { z } from 'zod';

const Conf = z.number().min(0).max(1);
const Axis = z.enum(['body', 'knowledge', 'strategy', 'creativity', 'social', 'discipline']);
const Quote = z.string().max(200).nullable();
const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const Sug = z.object({ text: z.string().min(1).max(60), confidence: Conf, sourceQuote: Quote });

export const IntakeIdentitySchema = z.object({
  oneLiner: z.string().max(160).nullable(),
  roles: z.array(Sug).max(8), 
  values: z.array(Sug).max(8), 
  strengths: z.array(Sug).max(8),
  softConstraints: z.array(Sug).max(6), 
  principles: z.array(Sug).max(6)
});

export const ParseConstraintsSchema = z.object({
  constraints: z.array(z.object({
    label: z.string().max(40),
    kind: z.enum(['work', 'commute', 'sleep', 'fixed', 'other']),
    days: z.array(z.number().int().min(0).max(6)).min(1),
    startTime: HHMM, 
    endTime: HHMM, 
    confidence: Conf, 
    sourceQuote: Quote
  })).max(12),
  unparsed: z.array(z.string().max(200)).max(6)
});

export const ExtractBaselineSchema = z.object({
  axes: z.array(z.object({
    axis: Axis,
    ratePerWeek: z.number().min(0).max(21).nullable(),
    intendedPerWeek: z.number().min(1).max(21).nullable(),
    keptShare: z.number().min(0).max(1).nullable(),          // discipline only
    confidence: Conf, 
    ambiguous: z.boolean(),
    clarifyingQuestion: z.string().max(200).nullable(), 
    sourceQuote: Quote
  }))
});

export const MetricSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('log_count'), axis: Axis, logTypes: z.array(z.string()).min(1),
             filter: z.object({ metaKey: z.string(), equals: z.union([z.string(), z.number(), z.boolean()]) }).optional() }),
  z.object({ type: z.literal('log_weighted_sum'), axis: Axis, weights: z.record(z.string(), z.number()), metaWeightKey: z.string().optional() }),
  z.object({ type: z.literal('distinct_days'), axis: Axis, logTypes: z.array(z.string()).min(1) }),
  z.object({ type: z.literal('habit_completions'), habitId: z.string() }),
  z.object({ type: z.literal('fact_count'), factType: z.string() }),
  z.object({ type: z.literal('fact_sum'), factType: z.string(), valuePath: z.string().optional() }),
  z.object({ type: z.literal('manual') }),
]);

export const ProposeQuestsSchema = z.object({
  quests: z.array(z.object({
    axis: Axis.exclude(['discipline']), 
    title: z.string().max(80), 
    unit: z.string().max(20),
    targetValue: z.number().positive(), 
    importance: z.number().int().min(1).max(3),
    metric: MetricSchema, 
    rationale: z.string().max(240)
  })).max(9)
});

export const DesignHabitSchema = z.object({
  name: z.string().max(60), 
  domain: Axis.exclude(['discipline']),
  frequency: z.object({ type: z.enum(['daily', 'weekly']), days: z.array(z.number().int().min(0).max(6)).optional() }),
  trackingMethod: z.enum(['boolean', 'count', 'duration', 'distance', 'pages', 'metric']),
  tinyVersion: z.string().max(120),
  implementationIntention: z.object({ anchor: z.string().max(80), behavior: z.string().max(80),
                                      location: z.string().max(60), timeSlot: HHMM }),
  identityVote: z.string().max(120).nullable()
});

export const ReviewDraftSchema = z.object({
  findings: z.array(z.object({
    severity: z.enum(['info', 'warn', 'risk']),
    area: z.enum(['identity', 'constraints', 'baseline', 'targets', 'quests', 'habits', 'budget']),
    message: z.string().max(280),
    evidencePaths: z.array(z.string()).min(1),
    suggestedFix: z.object({ op: z.enum(['set', 'remove']), path: z.string(), value: z.any().optional() }).nullable()
  })).max(10)
});

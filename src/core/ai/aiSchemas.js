import { z } from 'zod';

export const AIInsightSchema = z.object({
  type: z.enum(['risk', 'pattern', 'contradiction', 'recommendation']),
  statement: z.string().min(1),
  recommendedActions: z.array(z.string()).optional()
}).strict();

export const AIAuditSchema = z.object({
  period: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional()
  }).optional(),
  domains: z.array(z.string()),
  scoreChanges: z.array(z.object({
    domain: z.string(),
    previous: z.number(),
    current: z.number(),
    delta: z.number()
  })),
  wins: z.array(z.string()),
  failures: z.array(z.string()),
  contradictions: z.array(z.string()),
  patterns: z.array(z.string()),
  risks: z.array(z.string()),
  recommendations: z.array(z.string()),
  nextPeriodFocus: z.array(z.string()),
  supportingEvidenceIds: z.array(z.string()).optional()
});

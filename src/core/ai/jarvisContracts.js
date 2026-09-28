import { z } from 'zod';

export const INTENT_TYPES = ['CREATE','UPDATE','DELETE','COMPLETE','LOG','SCHEDULE','RESCHEDULE','MOVE','QUERY','SEARCH','REVIEW','REFLECT','PLAN','SYNC','UNDO','CANCEL','CONFIRM','CLARIFY'];

export const JarvisInputSchema = z.object({
  id: z.string().min(1),
  source: z.enum(['voice','text','ui']),
  text: z.string().min(1),
  timestamp: z.string(),
  conversationId: z.string().optional(),
  context: z.record(z.any()).optional(),
});

export const ToolContractSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  inputSchema: z.any(),
  outputSchema: z.any(),
  riskLevel: z.enum(['low','medium','high']),
  requiresConfirmation: z.boolean(),
  permissions: z.array(z.string()).default([]),
  idempotencyStrategy: z.string(),
  undoStrategy: z.string(),
  affectedDomains: z.array(z.string()).default([]),
  affectedProjections: z.array(z.string()).default([]),
});

export const PlannedActionSchema = z.object({
  id: z.string().min(1),
  tool: z.string().min(1),
  arguments: z.record(z.any()).default({}),
  dependsOn: z.array(z.string()).default([]),
  condition: z.record(z.any()).nullable().default(null),
  riskLevel: z.enum(['low','medium','high']).default('low'),
  status: z.enum(['queued','running','completed','failed','blocked','cancelled']).default('queued'),
});

export const ExecutionPlanSchema = z.object({
  id: z.string().min(1),
  inputId: z.string().min(1),
  actions: z.array(PlannedActionSchema).min(1).max(32),
  requiresConfirmation: z.boolean(),
  status: z.enum(['draft','awaiting_confirmation','executing','partial','completed','failed','cancelled']).default('draft'),
});

export const JarvisTurnSchema = z.object({
  intent: z.enum(INTENT_TYPES),
  message: z.string(),
  clarification: z.string().nullable().default(null),
  actions: z.array(z.object({
    tool: z.string(),
    arguments: z.record(z.any()).default({}),
    dependsOn: z.array(z.string()).default([]),
    condition: z.record(z.any()).nullable().default(null),
  })).default([]),
});

export function createJarvisInput({ source = 'text', text, conversationId, context } = {}) {
  const id = globalThis.crypto?.randomUUID?.() || `input_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  return JarvisInputSchema.parse({ id, source, text: String(text || '').trim(), timestamp: new Date().toISOString(), conversationId, context });
}

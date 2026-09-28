import { z } from 'zod';

export const SystemProposalItemSchema = z.object({
  id: z.string(),
  kind: z.enum(['goal', 'habit', 'routine', 'measurement', 'constraint']),
  title: z.string().min(1),
  description: z.string().optional(),
  source: z.enum(['user', 'jarvis']).default('user'),
  status: z.enum(['proposed', 'approved', 'rejected', 'edited']).default('proposed'),
  payload: z.record(z.any()).default({}),
});

export const SystemProposalSchema = z.object({
  schemaVersion: z.number().int().positive().default(1),
  createdAt: z.string(),
  status: z.enum(['draft', 'ready', 'approved', 'rejected', 'applied']).default('draft'),
  summary: z.string().default(''),
  items: z.array(SystemProposalItemSchema).max(30).default([]),
});

export function createSystemProposal(input = {}) {
  const items = Array.isArray(input.items) ? input.items : [];
  return SystemProposalSchema.parse({
    schemaVersion: 1,
    createdAt: input.createdAt || new Date().toISOString(),
    status: input.status || 'draft',
    summary: input.summary || '',
    items: items.map((item, index) => ({
      id: item.id || `proposal_item_${index + 1}`,
      kind: item.kind || 'goal',
      title: String(item.title || item.label || '').trim(),
      description: item.description ? String(item.description) : undefined,
      source: item.source === 'jarvis' ? 'jarvis' : 'user',
      status: item.status || 'proposed',
      payload: item.payload && typeof item.payload === 'object' ? item.payload : {},
    })),
  });
}

export function validateSystemProposal(proposal) {
  const parsed = SystemProposalSchema.parse(proposal);
  const seen = new Set();
  for (const item of parsed.items) {
    if (seen.has(item.id)) throw new Error(`Duplicate proposal item id: ${item.id}`);
    seen.add(item.id);
  }
  return parsed;
}

export function decideSystemProposal(proposal, decisions = {}) {
  const current = validateSystemProposal(proposal);
  const items = current.items
    .map(item => {
      const decision = decisions[item.id];
      if (!decision) return item;
      if (decision === 'approve') return { ...item, status: 'approved' };
      if (decision === 'reject') return { ...item, status: 'rejected' };
      if (decision === 'edit' && decisions[`${item.id}:payload`]) {
        return { ...item, status: 'edited', payload: decisions[`${item.id}:payload`] };
      }
      return item;
    })
    .filter(item => item.status !== 'rejected');
  return {
    ...current,
    status: items.some(item => item.status === 'proposed') ? 'ready' : 'approved',
    items,
  };
}

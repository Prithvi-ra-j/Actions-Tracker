import { z } from 'zod';
import { ActionProposalSchema } from './actionSchemas.js';
import { ToolContractSchema } from './jarvisContracts.js';

const registry = new Map();

function register(contract, handler) {
  const normalized = ToolContractSchema.parse(contract);
  if (registry.has(normalized.name)) throw new Error(`Jarvis tool already registered: ${normalized.name}`);
  registry.set(normalized.name, { contract: normalized, handler });
}

const genericProposal = {
  inputSchema: ActionProposalSchema,
  outputSchema: z.record(z.any()),
  permissions: ['jarvis'],
  idempotencyStrategy: 'existing proposal execution ledger',
  undoStrategy: 'action fact reverse operation where supported',
  affectedProjections: ['evidence','stats','today'],
};

register({ ...genericProposal, name:'createHabit', description:'Create a habit', riskLevel:'low', requiresConfirmation:false, affectedDomains:['habit'] }, args => ({ actionType:'add_habit', payload:args }));
register({ ...genericProposal, name:'updateHabit', description:'Update a habit', riskLevel:'medium', requiresConfirmation:false, affectedDomains:['habit'] }, args => ({ actionType:'modify_habit', payload:args }));
register({ ...genericProposal, name:'archiveHabit', description:'Archive a habit', riskLevel:'high', requiresConfirmation:true, affectedDomains:['habit'] }, args => ({ actionType:'archive_habit', payload:args }));
register({ ...genericProposal, name:'createGoal', description:'Create a goal', riskLevel:'low', requiresConfirmation:false, affectedDomains:['goal'] }, args => ({ actionType:'add_goal', payload:args }));
register({ ...genericProposal, name:'updateGoal', description:'Update a goal', riskLevel:'medium', requiresConfirmation:false, affectedDomains:['goal'] }, args => ({ actionType:'modify_goal', payload:args }));
register({ ...genericProposal, name:'createQuest', description:'Create a quest', riskLevel:'low', requiresConfirmation:false, affectedDomains:['quest'] }, args => ({ actionType:'add_quest', payload:args }));
register({ ...genericProposal, name:'logEvidence', description:'Record evidence or reflection', riskLevel:'low', requiresConfirmation:false, affectedDomains:['evidence'] }, args => ({ actionType:'log_evidence', payload:args }));
register({ ...genericProposal, name:'saveMemory', description:'Save a durable memory', riskLevel:'medium', requiresConfirmation:false, affectedDomains:['memory'] }, args => ({ actionType:'propose_memory', payload:args }));
register({ ...genericProposal, name:'adjustRoutine', description:'Adjust routine configuration', riskLevel:'medium', requiresConfirmation:true, affectedDomains:['routine'] }, args => ({ actionType:'adjust_routine', payload:args }));
register({ ...genericProposal, name:'reviseTarget', description:'Revise a desired target', riskLevel:'medium', requiresConfirmation:true, affectedDomains:['selfModel'] }, args => ({ actionType:'revise_target', payload:args }));
register({ ...genericProposal, name:'createPlan', description:'Create a multi-action plan', riskLevel:'medium', requiresConfirmation:true, affectedDomains:['multi-domain'] }, args => ({ actionType:'create_plan', payload:args }));

export function getTool(name) { const entry=registry.get(name); if(!entry) throw new Error(`Unknown Jarvis tool: ${name}`); return entry; }
export function hasTool(name) { return registry.has(name); }
export function listTools() { return [...registry.values()].map(({contract})=>contract); }
export function compileProposal(toolName, args) {
  const entry=getTool(toolName);
  const proposal=entry.handler(args || {});
  return { ...proposal, tool: toolName, riskLevel: entry.contract.riskLevel, requiresConfirmation: entry.contract.requiresConfirmation };
}


/** Backward-compatible adapters for domain capabilities not yet represented as first-class Jarvis writes. */
register({ ...genericProposal, name:'queryToday', description:'Read current Today state', riskLevel:'low', requiresConfirmation:false, affectedDomains:['today'] }, args => ({ actionType:'log_evidence', payload:{ text: JSON.stringify({query:'today',...args}), evidenceType:'jarvis_query' } }));
register({ ...genericProposal, name:'queryGoals', description:'Read active goals', riskLevel:'low', requiresConfirmation:false, affectedDomains:['goal'] }, args => ({ actionType:'log_evidence', payload:{ text: JSON.stringify({query:'goals',...args}), evidenceType:'jarvis_query' } }));
register({ ...genericProposal, name:'syncNutriLift', description:'Request NutriLift synchronization', riskLevel:'medium', requiresConfirmation:false, affectedDomains:['nutrition','fitness'] }, args => ({ actionType:'log_evidence', payload:{ text: JSON.stringify({query:'syncNutriLift',...args}), evidenceType:'sync_request' } }));

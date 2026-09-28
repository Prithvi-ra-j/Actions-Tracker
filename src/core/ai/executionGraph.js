import { ExecutionPlanSchema, PlannedActionSchema } from './jarvisContracts.js';
import { getTool, compileProposal } from './toolRegistry.js';
import { executeAction } from './actionExecutor.js';

function makeId(prefix='node') { return globalThis.crypto?.randomUUID?.() || `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }

export function validatePlanDependencies(plan) {
  const ids = new Set(plan.actions.map(a => a.id));
  for (const action of plan.actions) {
    for (const dep of action.dependsOn) if (!ids.has(dep)) throw new Error(`Unknown dependency ${dep} for ${action.id}`);
    if (action.dependsOn.includes(action.id)) throw new Error(`Action ${action.id} cannot depend on itself`);
  }
  // Kahn cycle check.
  const remaining = new Map(plan.actions.map(a => [a.id, new Set(a.dependsOn)]));
  let progressed = true;
  let seen = 0;
  while (progressed) {
    progressed = false;
    for (const [id,deps] of remaining) {
      if (deps.size===0) {
        remaining.delete(id); seen++; progressed=true;
        for (const other of remaining.values()) other.delete(id);
      }
    }
  }
  if (seen !== plan.actions.length) throw new Error('Execution plan contains a dependency cycle.');
  return plan;
}



export function validatePlanDependencies(plan) {
  const ids = new Set(plan.actions.map(a => a.id));
  for (const action of plan.actions) {
    for (const dep of action.dependsOn) {
      if (!ids.has(dep)) throw new Error(`Unknown dependency ${dep} for ${action.id}`);
    }
    if (action.dependsOn.includes(action.id)) throw new Error(`Action ${action.id} cannot depend on itself`);
  }
  const remaining = new Map(plan.actions.map(a => [a.id, new Set(a.dependsOn)]));
  let removed = 0;
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id,deps] of [...remaining.entries()]) {
      if (deps.size === 0) {
        remaining.delete(id); removed++; changed = true;
        for (const other of remaining.values()) other.delete(id);
      }
    }
  }
  if (removed !== plan.actions.length) throw new Error('Execution plan contains a dependency cycle.');
  return plan;
}

export function buildExecutionPlan({ inputId, actions }) {
  const planned = actions.map((action,index)=> {
    const tool = getTool(action.tool);
    return PlannedActionSchema.parse({
      id: action.id || makeId(`action_${index}`),
      tool: action.tool,
      arguments: action.arguments || {},
      dependsOn: action.dependsOn || [],
      condition: action.condition || null,
      riskLevel: tool.contract.riskLevel,
      status: 'queued',
    });
  });
  const requiresConfirmation = planned.some(item => getTool(item.tool).contract.requiresConfirmation);
  return validatePlanDependencies(ExecutionPlanSchema.parse({ id:makeId('plan'), inputId, actions:planned, requiresConfirmation, status:requiresConfirmation?'awaiting_confirmation':'draft' }));
}

function topoReady(actions, completed, active) {
  return actions.filter(a => a.status==='queued' && !active.has(a.id) && a.dependsOn.every(dep=>completed.has(dep)));
}

export async function executeExecutionPlan(plan, { onUpdate, confirm=false } = {}) {
  let current = ExecutionPlanSchema.parse(plan);
  if (current.requiresConfirmation && !confirm) return { ...current, status:'awaiting_confirmation' };
  current = { ...current, status:'executing' };
  onUpdate?.(current);
  const completed=new Set(), results=new Map(), active=new Set();
  const failed=new Set();

  while (completed.size < current.actions.length) {
    const ready=topoReady(current.actions, completed, active);
    if (!ready.length) {
      const pending=current.actions.filter(a=>!completed.has(a.id));
      if (!pending.length) break;
      const cycle=pending.some(a=>a.dependsOn.some(d=>pending.some(p=>p.id===d)));
      if (cycle || failed.size) {
        current={...current,status:failed.size?'partial':'failed'};
        current.actions=current.actions.map(a=>a.status==='queued'?{...a,status:'blocked'}:a);
        onUpdate?.(current);
        return {plan:current,results:Object.fromEntries(results)};
      }
      break;
    }

    await Promise.all(ready.map(async action=>{
      active.add(action.id);
      current={...current,actions:current.actions.map(a=>a.id===action.id?{...a,status:'running'}:a)};
      onUpdate?.(current);
      try {
        if (action.condition && !evaluateCondition(action.condition, results)) {
          completed.add(action.id);
          current={...current,actions:current.actions.map(a=>a.id===action.id?{...a,status:'cancelled'}:a)};
          return;
        }
        const proposal=compileProposal(action.tool, action.arguments);
        const result=await executeAction(proposal);
        results.set(action.id,result);
        completed.add(action.id);
        current={...current,actions:current.actions.map(a=>a.id===action.id?{...a,status:'completed'}:a)};
      } catch(error) {
        failed.add(action.id);
        results.set(action.id,{error:error?.message||String(error)});
        current={...current,actions:current.actions.map(a=>a.id===action.id?{...a,status:'failed'}:a)};
      } finally { active.delete(action.id); onUpdate?.(current); }
    }));
  }
  const finalStatus=failed.size?'partial':'completed';
  current={...current,status:finalStatus};
  onUpdate?.(current);
  return {plan:current,results:Object.fromEntries(results),partial:failed.size>0};
}

export function evaluateCondition(condition, results) {
  if (!condition) return true;
  if (condition.type==='result_exists') return Boolean(results[condition.actionId]);
  if (condition.type==='result_field_equals') return results[condition.actionId]?.[condition.field] === condition.value;
  if (condition.type==='result_field_true') return results[condition.actionId]?.[condition.field] === true;
  throw new Error(`Unsupported execution condition: ${condition.type}`);
}

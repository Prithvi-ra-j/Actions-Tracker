export const ACTION_LIFECYCLES = Object.freeze([
  'proposed',
  'validated',
  'waiting_approval',
  'approved',
  'executing',
  'completed',
  'failed',
  'rolled_back',
]);

const SAFE_ACTIONS = new Set([
  'add_learning',
  'suggest_experiment',
  'log_evidence',
  'propose_memory',
]);

const DESTRUCTIVE_ACTIONS = new Set([
  'archive_habit',
]);

export function getActionRiskClass(actionType) {
  if (DESTRUCTIVE_ACTIONS.has(actionType)) return 'destructive';
  if (SAFE_ACTIONS.has(actionType)) return 'safe';
  return 'confirm';
}

export function getInitialActionLifecycle(actionType) {
  return {
    riskClass: getActionRiskClass(actionType),
    lifecycle: 'proposed',
  };
}

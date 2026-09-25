import { ACTION_TYPES } from './actionSchemas.js';

export const CAPABILITIES = [
  { id: 'ask', label: 'Ask', description: 'Understand the current system', prompt: '' },
  { id: 'review', label: 'Review my system', description: 'Find trends, gaps, and bottlenecks', prompt: 'Review my system' },
  { id: 'audit', label: 'Audit my system', description: 'Look for contradictions and risks', prompt: 'Audit my system' },
  { id: 'add_habit', label: 'Create habit', description: 'Add a recurring habit', prompt: 'Create a habit' },
  { id: 'add_quest', label: 'Create quest', description: 'Add a measurable quest', prompt: 'Create a quest' },
  { id: 'add_goal', label: 'Create goal', description: 'Define a goal', prompt: 'Create a goal' },
  { id: 'adjust_routine', label: 'Adjust routine', description: 'Change the routine', prompt: 'Adjust my routine' },
  { id: 'revise_target', label: 'Revise target', description: 'Change a target', prompt: 'Revise my target' },
  { id: 'add_learning', label: 'Add learning', description: 'Capture a learning item', prompt: 'Add learning' },
  { id: 'log_evidence', label: 'Log evidence', description: 'Record evidence', prompt: 'Log this evidence' },
  { id: 'propose_memory', label: 'Save memory', description: 'Propose durable context', prompt: 'Save this as a memory' },
  { id: 'suggest_experiment', label: 'Run experiment', description: 'Create an experiment', prompt: 'Create an experiment' },
  { id: 'create_plan', label: 'Build a plan', description: 'Create a multi-step plan', prompt: 'Build and apply this plan' },
  { id: 'complete_onboarding', label: 'Continue onboarding', description: 'Continue system setup', prompt: 'Continue my onboarding' },
];

export function getJarvisCapabilities(query = '') {
  const q = query.trim().toLowerCase();
  return CAPABILITIES.filter(item => !q || item.label.toLowerCase().includes(q) || item.id.includes(q));
}

export function isActionCapability(id) {
  return ACTION_TYPES.includes(id);
}

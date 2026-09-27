const MODE_PATTERNS = Object.freeze([
  { mode: 'review', patterns: [/review|what changed|how am i doing|progress|trend|stuck/i] },
  { mode: 'plan', patterns: [/plan|roadmap|schedule|how should i|help me prepare/i] },
  { mode: 'act', patterns: [/change|add|remove|pause|create|update|adjust|set up/i] },
  { mode: 'capture', patterns: [/log|record|remember|capture|i did|i learned|evidence/i] },
  { mode: 'audit', patterns: [/audit|contradiction|risk|bottleneck|overloaded|what is wrong/i] },
]);

export function inferAssistantMode(input = '') {
  const text = String(input).trim();
  for (const entry of MODE_PATTERNS) {
    if (entry.patterns.some(pattern => pattern.test(text))) return entry.mode;
  }
  return 'ask';
}

export function resolveAssistantMode(input, override = null) {
  if (override && ['ask', 'plan', 'review', 'act', 'capture', 'audit'].includes(override)) {
    return override;
  }
  return inferAssistantMode(input);
}

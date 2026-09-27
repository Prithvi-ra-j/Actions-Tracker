const REDACTION_PATTERNS = Object.freeze([
  { pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, replacement: '[redacted-email]' },
  { pattern: /\b(?:\+?\d[\d\s().-]{8,}\d)\b/g, replacement: '[redacted-phone]' },
  { pattern: /\b(?:sk|pk|api|key|token)[_-]?[A-Za-z0-9]{16,}\b/gi, replacement: '[redacted-secret]' },
]);

export function redactSensitiveText(value) {
  let text = String(value ?? '');
  for (const { pattern, replacement } of REDACTION_PATTERNS) {
    text = text.replace(pattern, replacement);
  }
  return text;
}

export function redactContextForLLM(context = {}) {
  const identity = context.user_identity || {};
  return {
    ...context,
    user_identity: {
      roles: Array.isArray(identity.roles) ? identity.roles : [],
      values: Array.isArray(identity.values) ? identity.values : [],
      strengths: Array.isArray(identity.strengths) ? identity.strengths : [],
      constraints: Array.isArray(identity.constraints) ? identity.constraints.map(redactSensitiveText) : [],
      principles: Array.isArray(identity.principles) ? identity.principles.map(redactSensitiveText) : [],
      oneLiner: redactSensitiveText(identity.oneLiner || ''),
    },
    semantic_memories: (context.semantic_memories || []).map(memory => ({
      ...memory,
      content: redactSensitiveText(memory.content),
    })),
    active_experiments: (context.active_experiments || []).map(experiment => ({
      ...experiment,
      hypothesis: redactSensitiveText(experiment.hypothesis),
      protocol: redactSensitiveText(experiment.protocol),
      result: redactSensitiveText(experiment.result),
      conclusion: redactSensitiveText(experiment.conclusion),
    })),
  };
}

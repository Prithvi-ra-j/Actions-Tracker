export const TRUTH_CLASSES = Object.freeze([
  'fact',
  'preference',
  'pattern',
  'hypothesis',
  'decision',
  'temporary_context',
]);

export function classifyMemoryTruth({ type, status = 'proposed', source = 'system' } = {}) {
  if (type === 'fact') return 'fact';
  if (type === 'preference') return 'preference';
  if (type === 'pattern') return status === 'confirmed' ? 'pattern' : 'hypothesis';
  if (type === 'decision') return 'decision';
  if (type === 'temporary_context') return 'temporary_context';
  if (source === 'user' && status === 'confirmed') return 'fact';
  return 'hypothesis';
}

export function trustLevel({ truthClass, confidence = 0, supportingEvidence = 0, contradicted = false } = {}) {
  if (contradicted) return 'conflicted';
  if (truthClass === 'fact' || truthClass === 'decision') return supportingEvidence > 0 ? 'authoritative' : 'user_asserted';
  if (truthClass === 'preference') return 'explicit_preference';
  if (truthClass === 'pattern') return confidence >= 0.7 && supportingEvidence >= 2 ? 'learned' : 'provisional';
  return confidence >= 0.7 ? 'likely' : 'uncertain';
}

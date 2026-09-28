export const CERTIFICATION_STATUSES = Object.freeze([
  'implemented',
  'integrated',
  'tested',
  'real_world_tested',
  'certified',
  'blocked',
]);

export function createCertificationEvidence({
  id = `cert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  gate,
  scenario,
  status = 'tested',
  environment = 'automated',
  commit = null,
  input = null,
  expected = null,
  observed = null,
  evidence = [],
  failureReason = null,
  timestamp = new Date().toISOString(),
} = {}) {
  if (!gate) throw new Error('Certification gate is required');
  if (!scenario) throw new Error('Certification scenario is required');
  if (!CERTIFICATION_STATUSES.includes(status)) {
    throw new Error(`Unsupported certification status: ${status}`);
  }

  return {
    id,
    schemaVersion: 1,
    gate,
    scenario,
    status,
    environment,
    commit,
    input,
    expected,
    observed,
    evidence: [...new Set((Array.isArray(evidence) ? evidence : [evidence]).filter(Boolean))],
    failureReason,
    timestamp,
  };
}

export function certifyScenario(record, observed, evidence = []) {
  return createCertificationEvidence({
    ...record,
    status: 'certified',
    observed,
    evidence,
    failureReason: null,
  });
}

export function failScenario(record, failureReason, observed = null) {
  return createCertificationEvidence({
    ...record,
    status: 'blocked',
    observed,
    failureReason: String(failureReason || 'unknown_failure'),
  });
}

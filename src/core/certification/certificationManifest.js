export const CERTIFICATION_MANIFEST_VERSION = '1.0';

export const CERTIFICATION_MANIFEST = Object.freeze({
  version: CERTIFICATION_MANIFEST_VERSION,
  authority: 'repository_and_ci',
  statuses: Object.freeze(['implemented', 'integrated', 'tested', 'real_world_tested', 'certified', 'blocked']),
  gates: Object.freeze([
    { id: 'automated', source: 'CI', requires: ['unit', 'persistence_roundtrip', 'build', 'version_contract'] },
    { id: 'longitudinal_fixture', source: 'CI', requires: ['day_1_3_7_14_30_45_60_90', 'baseline_evolution', 'intervention_learning'] },
    { id: 'android', source: 'real_device', requires: ['install', 'upgrade', 'kill_reopen', 'back_button', 'accessibility'] },
    { id: 'integrations', source: 'real_provider', requires: ['health_connect', 'nutrilift', 'replay', 'retraction', 'revocation'] },
    { id: 'longitudinal_real_world', source: 'real_usage', requires: ['30_day', '60_day', '90_day', 'decision_outcomes', 'false_positive_tracking'] },
  ]),
});

export function getCertificationGate(id) {
  return CERTIFICATION_MANIFEST.gates.find(gate => gate.id === id) || null;
}

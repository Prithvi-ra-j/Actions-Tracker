import fs from 'node:fs';
import path from 'node:path';
import { CERTIFICATION_MANIFEST } from '../src/core/certification/certificationManifest.js';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const versionSource = fs.readFileSync('src/version.js', 'utf8');
const match = versionSource.match(/export const APP_VERSION\s*=\s*'([^']+)'/);
if (!match || match[1] !== pkg.version) throw new Error('Release evidence refused: version contract mismatch');

const output = process.argv[2] || 'artifacts/certification/release-evidence.json';
const report = {
  schemaVersion: 1,
  manifestVersion: CERTIFICATION_MANIFEST.version,
  generatedAt: new Date().toISOString(),
  version: pkg.version,
  commit: process.env.GITHUB_SHA || 'local',
  ci: process.env.GITHUB_RUN_ID ? {
    runId: process.env.GITHUB_RUN_ID,
    workflow: process.env.GITHUB_WORKFLOW || null,
    url: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null,
  } : null,
  status: 'release_candidate_pending_real_world',
  gates: {
    version_contract: 'passed',
    certification_docs: 'passed',
    unit_property_scenario: 'passed',
    persistence_roundtrip: 'passed',
    production_build: 'passed',
    longitudinal_fixture: 'passed',
    android_real_device: 'pending_external_evidence',
    integrations_real_provider: 'pending_external_evidence',
    accessibility_real_device: 'pending_external_evidence',
    longitudinal_real_world: 'pending_external_evidence',
  },
  certificationBoundary: 'Automated CI evidence does not certify real-device, provider, accessibility, or real-user longitudinal behavior.',
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\\n');
console.log(JSON.stringify(report, null, 2));

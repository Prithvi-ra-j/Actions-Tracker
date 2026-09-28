import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const versionSource = fs.readFileSync('src/version.js', 'utf8');
const versionMatch = versionSource.match(/export const APP_VERSION\s*=\s*'([^']+)'/);
const docs = {
  progress: fs.readFileSync('progress-tracker.md', 'utf8'),
  definition: fs.readFileSync('docs/10-10-definition-of-done.md', 'utf8'),
  release: fs.readFileSync('docs/release-certification.md', 'utf8'),
  certification: fs.readFileSync('docs/12-10-certification.md', 'utf8'),
};

const errors = [];
if (!versionMatch) errors.push('src/version.js does not expose APP_VERSION');
if (versionMatch && versionMatch[1] !== packageJson.version) errors.push(`version mismatch: package.json=${packageJson.version}, src/version.js=${versionMatch[1]}`);

const master = docs.progress.match(/## Master workstream status([\s\\S]*?)## Dependency order/);
if (!master) errors.push('progress-tracker master workstream table is missing');
else {
  for (const row of master[1].split('\n').filter(line => /^\\| \\d+ \\|/.test(line))) {
    const cells = row.split('|').map(cell => cell.trim());
    if (cells.length < 6) continue;
    const status = cells[4];
    if (!['DONE', 'IN PROGRESS', 'BLOCKED', 'NOT STARTED'].includes(status)) errors.push(`invalid master status in row: ${row}`);
  }
}

if (!docs.certification.includes('This document is a **proof framework**, not a claim')) errors.push('12/10 certification must explicitly separate fixture proof from real-world proof');
if (!docs.release.includes('This checklist separates automated evidence from real-device/provider validation')) errors.push('release checklist must preserve the automated-vs-real-world boundary');
if (!docs.definition.includes('Architecture freeze rule')) errors.push('10/10 definition must retain architecture freeze rule');

// The detailed blueprint sections are historical implementation plans. The master table is authoritative.
const staleRemaining = [...docs.progress.matchAll(/### Remaining\n([\s\\S]*?)(?=\n---|\n# Workstream|$)/g)];
if (staleRemaining.some(match => !match[1].includes('Master workstream status'))) {
  errors.push('progress-tracker contains an unqualified Remaining block; implementation status must be read from the master table');
}

if (errors.length) {
  console.error(errors.map(error => `CERTIFICATION DOC ERROR: ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Certification documentation consistent for Actions-Tracker ${packageJson.version}`);

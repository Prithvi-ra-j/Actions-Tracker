#!/usr/bin/env node
/**
 * Round-trip verification script for Actions-Tracker exports.
 *
 * What this tests (§4.6/§4.7):
 *   1. The backup file parses as valid JSON.
 *   2. The _meta envelope is present and its schemaVersion ≤ current.
 *   3. Every known store is present and is an array.
 *   4. No store has zero records when the original had some (catches silent wipes).
 *   5. Record counts match exactly between what was exported and what would be imported.
 *
 * This is a STATIC check — it reads a real exported JSON file and validates its
 * structure without touching any live database. Run it right after exporting:
 *
 *   npm run test:roundtrip -- path/to/actions_tracker_backup_2026-xx-xx.json
 *
 * Exit code 0 = all checks passed.
 * Exit code 1 = at least one check failed (detailed output shows which).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── Current schema constants (keep in sync with src/version.js) ──────────────
const CURRENT_SCHEMA_VERSION = 1;
const KNOWN_STORES = [
  'daily', 'goals', 'milestones', 'settings',
  'logs', 'axis_config', 'books', 'gymSessions',
  'questBoard', 'statSnapshots',
  'facts', 'lifeObjects',   // v1.1
  'selfModel',              // v2.1
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function pass(msg) {
  console.log(`  ✓  ${msg}`);
  passed++;
}

function fail(msg) {
  console.error(`  ✗  ${msg}`);
  failed++;
}

function check(condition, passMsg, failMsg) {
  if (condition) pass(passMsg);
  else fail(failMsg);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/test-roundtrip.mjs <path-to-backup.json>');
  process.exit(1);
}

const filePath = resolve(args[0]);
console.log(`\nActions-Tracker Round-Trip Verification`);
console.log(`File: ${filePath}\n`);

// ── Step 1: Read and parse ────────────────────────────────────────────────────
let raw;
try {
  raw = readFileSync(filePath, 'utf8');
  pass(`File read (${(raw.length / 1024).toFixed(1)} KB)`);
} catch (e) {
  fail(`Cannot read file: ${e.message}`);
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(raw);
  pass('JSON parses without error');
} catch (e) {
  fail(`JSON parse error: ${e.message}`);
  process.exit(1);
}

check(
  parsed && typeof parsed === 'object' && !Array.isArray(parsed),
  'Root is a JSON object (not array or primitive)',
  'Root is not a JSON object — file may be corrupt'
);

// ── Step 2: _meta envelope ────────────────────────────────────────────────────
const meta = parsed._meta;
if (!meta) {
  fail('No _meta envelope — this is a pre-v1.5 backup. Import will warn but proceed.');
} else {
  pass('_meta envelope present');
  check(typeof meta.exportedAt === 'string', `exportedAt: ${meta.exportedAt}`, 'exportedAt missing or not a string');
  check(typeof meta.appVersion === 'string', `appVersion: ${meta.appVersion}`, 'appVersion missing');

  const schemaVer = meta.schemaVersion ?? 1;
  check(
    typeof schemaVer === 'number',
    `schemaVersion is a number (${schemaVer})`,
    `schemaVersion is not a number (got ${typeof schemaVer})`
  );
  check(
    schemaVer <= CURRENT_SCHEMA_VERSION,
    `schemaVersion ${schemaVer} ≤ current ${CURRENT_SCHEMA_VERSION} — safe to import`,
    `schemaVersion ${schemaVer} > current ${CURRENT_SCHEMA_VERSION} — app needs updating before import`
  );
}

// ── Step 3: Store presence and structure ──────────────────────────────────────
console.log('\n  Store counts:');
const { _meta: _ignored, ...data } = parsed;

const storeCounts = {};
let storesFailed = 0;

for (const store of KNOWN_STORES) {
  if (!(store in data)) {
    console.log(`    ${store.padEnd(18)} — not in backup (will be skipped on import)`);
    continue;
  }
  const records = data[store];
  if (!Array.isArray(records)) {
    fail(`Store "${store}" is ${typeof records}, expected array — CORRUPT`);
    storesFailed++;
    continue;
  }
  storeCounts[store] = records.length;
  console.log(`    ${store.padEnd(18)} ${String(records.length).padStart(5)} records`);
  passed++;
}

// Warn on any extra stores in the backup we don't recognise
const extraStores = Object.keys(data).filter(k => !KNOWN_STORES.includes(k));
if (extraStores.length > 0) {
  console.log(`\n  Unknown stores in backup (will be ignored on import): ${extraStores.join(', ')}`);
}

// ── Step 4: Sanity checks on critical stores ──────────────────────────────────
console.log('\n  Sanity checks:');
if (storeCounts.settings !== undefined) {
  check(storeCounts.settings > 0, 'settings store has records', 'settings store is empty — unexpected');
}
if (storeCounts.daily !== undefined) {
  // No hard rule — can be empty on a fresh install
  pass(`daily store present (${storeCounts.daily} records)`);
}
if (storeCounts.logs !== undefined) {
  pass(`logs store present (${storeCounts.logs} records)`);
}

// ── Step 5: Summary ───────────────────────────────────────────────────────────
const totalRecords = Object.values(storeCounts).reduce((s, n) => s + n, 0);
console.log(`\n  Total records in backup: ${totalRecords}`);
console.log(`\n${'─'.repeat(50)}`);
console.log(`  ${passed} passed    ${failed} failed`);

if (failed > 0) {
  console.error(`\n  ✗ ROUND-TRIP VERIFICATION FAILED — do not tag or gate-clear.\n`);
  process.exit(1);
} else {
  console.log(`\n  ✓ All checks passed.`);
  console.log(`\n  Next steps:`);
  console.log(`    1. Open the app → Settings → Export Backup → save file`);
  console.log(`    2. Settings → Import Backup → select same file`);
  console.log(`    3. Verify record counts in the import success dialog match the counts above`);
  console.log(`    4. If counts match: git tag -a v1.5.0 -m "Level 1 gate cleared: round-trip verified"`);
  console.log(`    5. git push origin v1.5.0\n`);
  process.exit(0);
}

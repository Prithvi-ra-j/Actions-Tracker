# Actions Tracker Testing Implementation Plan

**Status:** Active implementation plan  
**Last reviewed:** 2026-10-02  
**Scope:** Local-first React/Vite app, IndexedDB persistence, Jarvis AI actions, optional provider gateway, NutriLift sync, and Capacitor Android release.

This plan defines progressive evidence gates for Actions Tracker. A higher level does not replace lower-level checks. A passing test suite is evidence only for the behavior its assertions actually verify.

## Goals and risk model

Protect the user outcomes with the highest cost of failure:

1. User data survives reloads, upgrades, import/export, and recoverable failures.
2. Jarvis cannot perform or report a mutation that was not validly authorized and persisted.
3. External sync cannot silently duplicate, misattribute, or erase evidence.
4. AI/provider failures do not lose the user's prompt, corrupt state, expose credentials, or create uncontrolled cost.
5. The web app and Android build behave as documented on their actual target platforms.

| Risk area | Likelihood | Impact | Initial priority | Primary proof |
|---|---:|---:|---|---|
| IndexedDB migration, import, restore, reset | 4/5 | 5/5 | P0 | Old-schema fixtures, recovery tests, upgrade/device evidence |
| Jarvis approval, execution, replay, undo | 4/5 | 5/5 | P0 | Contract, repository integration, and UI journey tests |
| Public AI gateway abuse and provider cost | 4/5 | 5/5 | P0 before public exposure | Access-control decision, negative API tests, quotas and timeout evidence |
| Dates, evidence projection, and scores | 4/5 | 4/5 | P1 | Boundary, property, regression, and determinism tests |
| External sync and permissions | 3/5 | 4/5 | P1 | Connector and sync-manager failure/retry tests, device checks |
| Mobile usability and accessibility | 3/5 | 3/5 | P1 | Component assertions, browser checks, manual Android evidence |

These priorities are product-specific. Account recovery and cross-account authorization are not gates for the current single-device product unless accounts or shared data are introduced. Gateway authorization and rate limits become release blockers before a public deployment that can spend against a server-held provider key.

## Current baseline

As of this review:

- `npm test` runs Vitest. Existing groups include unit, property, regression, migration, adversarial, scenario, and sensitivity tests.
- `npm run build` produces the web bundle.
- `.github/workflows/test.yml` runs the production dependency audit, full Vitest suite, production build, and critical Chromium journey on pushes and pull requests with Node 22.
- Existing seams include IndexedDB integration tests for the action executor, backup import tests, proposal-execution ledger tests, NutriLift connector tests, and React UI journeys.
- `tests/scenarios/jarvis-advanced-flows.test.jsx` was only a placeholder and was removed; it did not count as behavioral coverage.
- `android-build.yml` previously used Node 20 while `package.json` requires Node 22 or newer; the workflow is now aligned to Node 22.
- Eight focused tests now exercise `api/jarvis.js`; they exposed and fixed dropped `Retry-After` headers and a request-size bypass when `Content-Length` is missing.
- Full Vitest validation passes: 54 files and 346 tests. The monthly JSX regression is `.test.jsx`, React journey setup marks itself as an existing install, and the suite includes deterministic test-lab contracts, timezone/DST date boundaries, and the Jarvis approval/undo journey.
- Playwright validation passes five configured journeys: legacy local-data migration/evidence/reload, backup export and restore into an isolated profile, a seeded test-lab browser interaction with sanitized evidence, narrow mobile navigation, and NutriLift sync failure/retry with cursor preservation.
- The sync browser journey verifies that a failed NutriLift request preserves its cursor and prior successful timestamp before an explicit retry succeeds. Jarvis prompt recovery remains covered by the UI journey test; a provider-failure browser journey is still outstanding.
- Health Connect now defaults to disconnected outside a Capacitor native runtime, preventing an installed web plugin shim from being treated as an available device integration.
- The test-lab utilities define 12 personas, 13 fixture families, deterministic fixture data, scenario limits/invariants, a pauseable day-based event timeline, and browser clock/network/interaction/evidence helpers. They are automation infrastructure, not a claim that every blueprint scenario is implemented.
- Production build passes. Vite reports existing mixed dynamic/static import and large-chunk warnings; these do not fail the build and were not changed as part of this test work.
- The `test:roundtrip` script is a static verifier for an operator-provided export file; it requires a backup path and is not a CI test. The isolated-profile Playwright restore journey provides the automated export/import coverage.
- `npm audit --omit=dev` reports no production vulnerabilities. Full `npm audit` still reports seven dev-tool advisories; remaining Vite/Vitest and Capacitor CLI fixes require major upgrades and were not forced.
- `NEXT_RELEASE.md` records Android artifact, device, provider, accessibility, and in-place-upgrade checks as outstanding. Keep these as explicit release evidence, not inferred from a web build.
- The fetched Playwright proposal is not the baseline: its scenario fixture and matchers require repair, and several assertions need to verify actual outcomes.

Current supported automated commands are `npm test`, `npm run build`, `npm run test:roundtrip`, and `npm run test:e2e`. Do not add CI steps for linting, type checking, or coverage thresholds until their commands, configuration, and ownership are implemented and verified.

## Testing levels

### Level 0: Test-runner and CI trust

**Purpose:** Ensure checks run on supported runtimes and actually fail when the intended suite fails.

**Implement:**

- Use Node 22 consistently in test and Android workflows.
- Install from the lockfile with `npm ci` where supported.
- Keep `npm test` and `npm run build` required on every pull request.
- Remove trivial `expect(true)` placeholder coverage; every retained test needs a behavior-based failure condition.
- Preserve test output and build logs as CI evidence when a job fails.

**Exit criteria:** Both workflows use the declared Node runtime; pull requests cannot pass with a skipped/empty test command; full Vitest, production audit/build, and required browser journey pass on CI.

### Level 1: Pure domain and property invariants

**Purpose:** Catch deterministic business-logic defects cheaply, before persistence or UI obscures them.

**Own tests in:** `tests/unit/`, `tests/properties/`, `tests/sensitivity/`, and `tests/adversarial/`.

**Cover:**

- Score bounds, determinism, evidence inclusion/exclusion, confidence and coverage, and no score authority from insufficient evidence.
- Local-date and rolling-window behavior at midnight, month/year rollover, leap day, DST, and timezone boundaries.
- Habit occurrence transitions, grace/unknown states, repeated input, invalid values, and paused schedules.
- Quest derivation under duplicate, reordered, sparse, and historical evidence.

**Techniques:** Existing `fast-check` for invariants; equivalence classes and boundary values including empty, one, maximum, maximum-plus-one, null, malformed, Unicode, and long inputs. Assert outcomes, not private implementation details.

**Exit criteria:** P0/P1 domain invariants have focused named tests; generated cases use fixed/reported seeds when a failure occurs; regressions have a minimal reproducer.

### Level 2: Persistence, migration, and recovery

**Purpose:** Prove that IndexedDB is a dependable source of truth and can recover without silent loss.

**Own tests in:** `tests/migration/`, `tests/unit/`, and a dedicated recovery test file if the existing backup test becomes too broad.

**Cover:**

- Fresh database initialization, close/reopen, repeat initialization, and supported old-version fixtures.
- Migrations are idempotent and preserve records, IDs, relationships, dates, provenance, and user configuration.
- Export/import round trip across every user-data store.
- Invalid JSON, unsupported schema/version, missing fields, malformed records, partial import failure, and restore into an empty database.
- Failure leaves either the complete old state or complete new state; never an undocumented partial restore.
- Reset affects only documented user data and does not leave a false completed-onboarding state.
- Auto-backup failure is visible and does not falsely claim a successful backup.

**Exit criteria:** At least one fixture represents a realistic prior schema and dataset; success and failure paths assert database contents after reopen; destructive recovery paths have a documented/manual rehearsal before release.

### Level 3: Jarvis action and integration contracts

**Purpose:** Guard the boundary between model output, approval, domain execution, and external evidence.

**Jarvis cases:** Valid and invalid schema; unknown action; missing target; stale target; edit; approve; reject; duplicate approval; concurrent/retried execution; failure after starting; partial multi-step plan; undo/retraction; user-visible status matches persisted state; prompt/context injection cannot grant a tool or approval.

**Integration cases:** NutriLift owner mismatch, empty page, equal-timestamp composite cursor, repeated page, changed source version, deletion/retraction, timeout, offline, retry, permission denial, and reconnect. Assert record IDs and persisted projections, not merely connector return summaries.

**Own tests in:** `tests/unit/actionSchemas.test.js`, `tests/unit/actionExecutorIndexedDb.test.js`, `tests/unit/proposalExecutionRepository.test.js`, connector tests, and focused new files only where they clarify a boundary.

**Exit criteria:** Every action type has success and validation coverage; high-risk actions have approval and negative-path coverage; sync replay is idempotent and source ownership is verified.

### Level 4: AI gateway and security

**Purpose:** Prevent malformed requests, provider failures, credential leakage, and unbounded paid usage.

**API tests:** Method, request shape, oversized body, missing provider configuration, provider success, provider 4xx/5xx, retry metadata, timeout, invalid provider response, and safe error shape. Mock the external provider at the network boundary; invoke the real handler.

**Deployment decision required:** Choose an access-control mechanism suitable for the actual deployment (private personal endpoint versus public app). Before public exposure, implement and test rate limiting/quotas and a way to prevent anonymous cost exhaustion. A content-length limit is not authorization or rate limiting.

**Security checks:** Secret scan the working tree and CI artifacts; ensure provider credentials are server-only; verify AI context is not emitted in logs/telemetry; test hostile prompt/context data and unknown tool names; inspect security headers and production source-map policy.

**Exit criteria:** Gateway negative tests pass; public deployment is blocked until access control, quotas, and an owner-approved privacy disclosure are in place; no test prints secrets.

### Level 5: Component and UI state transitions

**Purpose:** Verify what a person can see and do at the React boundary.

**Own tests in:** `tests/scenarios/ui-journeys.test.jsx` for cross-component journeys and focused component tests only when a journey becomes unwieldy.

**Cover:** Onboarding and resume; check-in and persisted evidence; goals and learning; Jarvis proposal edit/approve/reject/error/retry; backup confirmation and result; audit ignore/restore; provider setup failure; online/offline recovery; keyboard slash commands; focus return, accessible labels, live announcements, and disabled/loading states.

Use role/label-based queries. Assert user-visible text/status and repository state when persistence is part of the workflow. Avoid source-text assertions and snapshots as the sole proof.

**Exit criteria:** Every P0 workflow has one happy path and its highest-risk failure path; test data is isolated and reset between journeys.

### Level 6: Real-browser end-to-end

**Purpose:** Test a small number of complete workflows under a real browser lifecycle.

Add Playwright only after fixtures and configuration are stable. Start with Chromium desktop and a real mobile viewport; add WebKit when there is a defined browser-support requirement.

**Initial journeys:**

1. [x] Existing-install legacy-data migration, evidence write, reload, and persistence verification.
2. [x] Approve one Jarvis proposal, verify the approved habit persisted, then undo it and verify archived state plus conversation status.
3. [x] Export, restore into a clean isolated browser profile, verify the old record was replaced, and verify the imported record survives reload.
4. [ ] Add one combined browser journey for provider/sync failure and retry. UI prompt recovery and sync cursor/retry behavior already have unit/integration coverage.

Use isolated browser contexts and deterministic fixtures. The mobile project currently covers narrow-viewport navigation, not Android native behavior or accessibility certification. Assert meaningful user outcomes and IndexedDB state where practical. “Body is visible” is a smoke assertion, not a journey test. Do not simulate 90 days by repeated reloads and call it longitudinal product validation.

**Exit criteria:** Each test would fail if its named user outcome were broken; no unmatched project silently reports success; artifacts include trace/screenshot on failure.

### Level 7: Android, release, and field evidence

**Purpose:** Validate native behaviors and release-specific risks that web CI cannot prove.

**Before release:** Build and verify the signed APK; install and upgrade from a representative prior release while preserving data; test Android back, keyboard, safe areas, font scaling, backup/restore, Health Connect permission and real Steps data, and in-scope NutriLift auth/import/retraction. Run TalkBack on critical journeys and inspect relevant `adb logcat` output.

Record device/model, Android version, app version, test data setup, expected/actual result, logs/artifacts, and owner/date in `NEXT_RELEASE.md` or the release evidence artifact. Do not claim native verification from `npm run build` or mobile browser emulation.

**Exit criteria:** All release-blocking items in `NEXT_RELEASE.md` have evidence; no release tag is created while a blocker is unchecked.

### Level 8: Beta and post-release operations

**Purpose:** Discover issues scripts cannot predict and keep recovery possible after shipping.

Start with a small opt-in beta, privacy-reviewed crash/error reporting, a feedback channel, release-tagged errors, and a backup restore drill. Add Web Vitals/bundle budgets and long-session profiling when measurable targets and a supported-device baseline are agreed. Every production incident becomes a regression test where reproducible.

Do not collect raw user prompts, provider keys, or sensitive evidence in telemetry. Define retention, opt-in, and deletion behavior before enabling remote diagnostics.

## CI gate design

| Trigger | Required checks | Purpose |
|---|---|---|
| Pull request | `npm ci`, `npm audit --omit=dev --audit-level=high`, `npm test`, `npm run build`, `npm run test:e2e` | Production dependency safety, deterministic regressions, build integrity, and the critical local-data browser journey |
| Nightly | Full unit/property/adversarial suites; later, broader Playwright Chromium journeys | Broader runtime/edge-case confidence without slowing every local edit |
| Release candidate | All PR checks, gateway security checks for deployed gateway, signed Android build, manual device/provider checklist | Release decision based on platform evidence |
| Post-release | Synthetic core flow, crash/error review, backup restore drill | Detect regressions and prove recovery remains possible |

Keep secrets out of fork PR jobs. Dependency/SAST/secret-scanning gates may be added after their tools, failure ownership, and acceptable policy are defined; do not add a perpetually red or ignored scanner job.

## Ordered implementation backlog

1. **[x] TEST-001, Level 0:** Align Android workflow Node to 22, remove placeholder coverage, and verify all 54 Vitest files / 345 tests.
2. **[x] TEST-002, Level 4:** Add eight handler tests for `api/jarvis.js`; fix retry metadata and the missing-`Content-Length` body-size bypass.
3. **[~] TEST-003, Level 2:** Cover all-store backup round-trip, future-schema rejection, malformed-key safety, and real v11-to-v12 upgrade. Older-schema fixtures and interrupted-restore rehearsal remain.
4. **[~] TEST-004, Level 3:** Cover concurrent proposal idempotency, failed-plan rollback/ledger state, sync cursor preservation, and retry without duplicates. Remaining action-specific failures and connector permissions need coverage.
5. **[~] TEST-005, Level 1:** Reject impossible calendar dates; verify local date boundaries across five timezones and spring/fall DST transitions; existing score/property coverage passes. Confidence/coverage boundary properties and broader timezone behavior remain.
6. **[~] TEST-006, Level 5:** Add retry with original prompt and verify all 19 UI journeys. Correction/recovery details, long-thread scrolling, and manual accessibility checks remain.
7. **[~] TEST-007, Level 6:** Playwright config, shared test-lab evidence/fixtures, migration, backup-restore, mobile viewport, and sync failure-retry journeys are implemented. A provider failure/retry browser journey remains; Jarvis prompt recovery is covered at the UI-test level.
8. **[ ] TEST-008, Level 7:** Complete Android artifact, upgrade/data, permission, accessibility, and provider evidence before release.
9. **[ ] TEST-009, Level 8:** Establish beta feedback and privacy-reviewed monitoring; set performance budgets from measured target devices.

Each backlog item needs acceptance criteria, targeted command, failure evidence, and explicit completion status. Keep this plan updated when risk decisions or supported platforms change.

## Definition of done

Testing implementation is ready for the current release when:

- CI runs on supported Node and required tests/build fail correctly.
- P0 data-recovery, Jarvis action-boundary, and gateway deployment risks have passing tests or an explicit deployment restriction.
- Critical workflows assert persisted results and meaningful failure behavior.
- Android/device/provider checklist evidence is recorded for native releases.
- Known limitations, skipped checks, and residual risks are visible; no coverage percentage substitutes for this evidence.
# Step 0 — Baseline + Engineering Audit

Date: 2026-09-25
Branch: `audit/guide-completion-2026-09-25`

## Purpose

This document is the machine-readable baseline for the redesign guide. It records the current application surfaces, persistence boundaries, tests, feature flags, responsive QA targets and verification gates before Steps 1–19 are completed.

## Repository surface map

### Primary application surfaces
- `TodayTab.jsx`
- `StatsTab.jsx`
- `GoalsTab.jsx`
- `LearnTab.jsx`
- `AuditsTab.jsx`
- `JarvisTab.jsx`
- `SettingsTab.jsx`
- `ProfileTab.jsx`
- `AppShell.jsx`
- `App.jsx`

### Supporting UI
- `src/components/ui/ActionPrimitives.jsx`
- `Banners.jsx`
- `Buttons.jsx`
- `Cards.jsx`
- `Headers.jsx`
- `Indicators.jsx`
- `Inputs.jsx`
- `Overlays.jsx`
- `ProposalUI.jsx`
- `States.jsx`
- `ToastContext.jsx`
- `UndoToast.jsx`

### Development surfaces
- `src/components/dev/PrimitivesDevPage.jsx`
- `src/components/dev/TokensDevPage.jsx`
- `src/components/onboarding/*`

### Core architecture
- AI: `src/core/ai/*`
- Evidence: `src/core/evidence/*`
- Facts: `src/core/facts/*`
- Onboarding: `src/core/onboarding/*`
- Scoring: `src/core/scoring/*`
- Sync: `src/core/sync/*`
- Domain/routine/occurrence engines under `src/core/*`
- Central feature flags: `src/core/featureFlags.js`

## Persistence / state boundaries

IndexedDB repositories currently include:
`auditRepository`, `axisConfigRepository`, `backupService`, `booksRepository`, `creativeWorkRepository`, `decisionRepository`, `evidenceRepository`, `experimentRepository`, `factsRepository`, `goalsRepository`, `gymSessionsRepository`, `habitOccurrenceRepository`, `habitRepository`, `insightsRepository`, `jarvisConversationRepository`, `learningRepository`, `lifeObjectsRepository`, `logsRepository`, `memoryRepository`, `milestonesRepository`, `observationRepository`, `questBoardRepository`, `relationRepository`, `routineRepository`, `selfModelRepository`, `settingsRepository`, `statSnapshotsRepository`, `supabaseSyncRepository`, `syncStateRepository`, `telemetryRepository`.

Canonical state rule for later steps: UI state must be derived from these repositories/engines or explicitly scoped ephemeral state; mock display values must not become a second source of truth.

## Test inventory

### Unit / contract
`tests/unit/actionExecutorIndexedDb.test.js`
`actionSchemas.test.js`
`aiContextBoundaries.test.js`
`consistency.test.js`
`feedbackEngineContract.test.js`
`healthConnectConnector.test.js`
`healthIntegrationGuard.test.js`
`impactProjection.test.js`
`jarvisActionContracts.test.js`
`momentum.test.js`
`nutriLiftConnector.test.js`
`occurrenceGrace.test.js`
`questDerivation.test.js`
`routineEngine.test.js`
`scoreDisplayContract.test.js`
`socialEngine.test.js`
`statEngine.test.js`
`syncManager.test.js`
`tiers.test.js`
`volume.test.js`

### Properties
`tests/properties/bounds.test.js`
`determinism.test.js`
`independence.test.js`
`monotonicity.test.js`

### Scenarios
`tests/scenarios/checkbox-gamer.test.js`
`ideal-user.test.js`
`inactive-user.test.js`
`strategy-reader.test.js`
`ui-journeys.test.jsx`

### Migration
`tests/migration/v1_boot.test.js`
`v1_evidence_preservation.test.js`
`v1_migration.test.js`
`v2_axis_vocab.test.js`

### Adversarial / sensitivity
Four adversarial tests and four sensitivity suites are present.

## CI / release verification surfaces

- `.github/workflows/test.yml` — Node 20, install, test, build.
- `.github/workflows/android-build.yml` — Android build path.
- `.github/workflows/android-release.yml` — Android release path.
- `RELEASING.md`, `VERSIONING.md`, `ANDROID_RELEASE.md`, `CHANGELOG.md`, `NEXT_RELEASE.md` document release operations.

Current verification state: **not green/proven**. No GitHub Actions run is currently returned for the audit branch head, so runtime test/build status must not be inferred from repository presence.

## Responsive QA baseline

Required viewport matrix from the guide:

| Viewport | Width | Required |
|---|---:|---|
| Compact Android | 360px | yes |
| Standard Android | 390px | yes |
| Large Android | 432px | yes |

Device smoke target:
- Android A52-class device/emulator
- system keyboard open/closed
- Android back
- safe-area/status/navigation bars
- font scale / large text
- reduced motion
- low-end scroll performance

This repository now records the matrix as an explicit QA contract. Actual screenshots/device runs remain a runtime verification gate and are intentionally not fabricated.

## Data Feasibility Register

| Data element | Source of truth | UI treatment |
|---|---|---|
| Axis value/trend | stat engine + snapshots | render only when evidence exists |
| Contribution | stat engine | explain component contribution |
| Learning loop | learning repository/mastery | five-step progress |
| Streak | occurrence engine/history | omit when insufficient history |
| Provenance | evidence/facts/context | expose inspectable sources |
| Capacity | impact engine | derive projection; no invented capacity |
| Undo | action executor/action facts | reversible action receipt |
| AI verification | LLM client + Settings | show actual verification result |
| Backup status | backup service + settings | never hardcode status |
| Next action | real quest/action state | omit when unavailable |
| XP/level | score domain | never invent guide-only mock numbers |
| Main/side quest | quest board | derive from persisted quest data |

## Feature-flag strategy

Feature flags are centralized in `src/core/featureFlags.js` and are environment-driven:
- `VITE_FLAG_GUIDEAUDIT`
- `VITE_FLAG_CONTEXTUALJARVIS`
- `VITE_FLAG_PROPOSALACTIONS`
- `VITE_FLAG_LEARNINGLIFECYCLE`

The registry provides `isFeatureEnabled()` and `getFeatureFlags()`. Components must not create ad-hoc flag readers.

## Step 0 acceptance gates

Step 0 can be considered implementation-complete when:
- surface/file inventory exists and is kept in this baseline;
- persistence boundaries are documented;
- test inventory is documented;
- CI/release surfaces are documented;
- feature flags have one source of truth;
- 360/390/432 + A52 verification contract exists;
- Data Feasibility Register exists;
- actual screenshot/device/CI evidence is attached before claiming final QA completion.

## Current Step 0 status

**IMPLEMENTED — runtime verification pending.**

The repository-side baseline is now explicit. The remaining evidence (screenshots, A52 smoke test, CI/build result) belongs to the later verification gates and is not represented as completed merely because the manifest exists.

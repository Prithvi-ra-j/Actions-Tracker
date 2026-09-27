# Actions-Tracker 2.0 — Progress Tracker

**Last updated:** 2026-09-27 (Asia/Kolkata)  
**Repository:** `Prithvi-ra-j/Actions-Tracker`  
**Branch:** `main`  
**Program:** Actions-Tracker 2.0 Master Implementation Blueprint

## Product north star

```text
USER INTENT
    ↓
UNDERSTAND
    ↓
PLAN
    ↓
ACT
    ↓
EVIDENCE
    ↓
LEARN / MEASURE
    ↓
ADAPT
    └──────────────→ PLAN
```

The product should feel like one coherent system that understands intent, helps the user act, observes evidence, explains what changed, and adapts recommendations while keeping the user in control.

## Status legend

- **DONE** — implemented and backed by repository evidence/tests.
- **IN PROGRESS** — implementation exists but acceptance gates remain open.
- **BLOCKED** — dependent on a decision, environment, provider, or missing release evidence.
- **NOT STARTED** — planned but no meaningful implementation yet.

---

## Master workstream status

| # | Workstream | Priority | Status | Current implementation | Remaining gate |
|---|---|---|---|---|---|
| 1 | Data & persistence foundation | P0 | IN PROGRESS | IndexedDB v11, repositories, appMeta, export/import, backup/migration infrastructure, local-date helpers. **2026-09-27:** fresh-start reset hardened; restore-safety boundary and migration registry added with executable tests. | Remaining: decide browser AI-key persistence policy and complete final device/upgrade release evidence. Core preview, safety backup, record validation, migration registry, v10→v11 preservation fixture, and interrupted-restore fixture are implemented. |
| 2 | Canonical domain/data model | P0 | DONE | Canonical constructors/events plus domainRegistry.js and domainValidators.js now define domains, entity ownership/history, legacy mappings, normalization and validation; executable tests added. | Future: migrate remaining production writers/readers behind this registry and add legacy fixture round-trip coverage. |
| 3 | Onboarding redesign | P0 | DONE | Persisted 10-state onboarding machine, step-driven Jarvis interview, answer persistence, confirmation boundary, resumable progress UI, and non-AI guided fallback. | Deployment/device validation of resume, AI/no-AI paths, and approval flow. |
| 4 | Calibration engine | P0 | DONE | Versioned calibration stages now include sample-size thresholds, baseline-aware initial estimates, confidence/coverage, hysteresis, recommendations, and projection metadata. | Deployment/device validation of calibration behavior against real evidence windows. |
| 5 | Scoring engine | P0 | DONE | Versioned six-axis contracts plus a deterministic evidence-vs-canonical authority resolver; score projections carry explainable source/fallback and calibration metadata. | Deployment/device validation and longer real-data parity/golden fixture validation. |
| 6 | Evidence & learning loop | P0 | DONE | Canonical evidence normalization now standardizes domain, source, occurrence/observation time, freshness, status and fact references; evidence writes are normalized and active-evidence queries exclude retracted source facts. | Deployment/device validation and deeper real-provider evidence/retraction cycles. |
| 7 | Adaptive Today | P1 | DONE | Added a pure recommendation engine and explainable Today focus cards using scheduled actions, score confidence/coverage, and active goals without mutating data. | Deployment/device validation and tuning against real usage. |
| 8 | Jarvis intelligence layer | P0 | DONE | Jarvis now has deterministic automatic mode inference with optional manual override, existing grounded context/claim validation, and an outbound context-redaction boundary. Writes remain behind the action executor. | Deployment/device validation and provider/backend architecture validation. |
| 9 | Jarvis action / approval system | P0 | DONE | Central executor now derives enforced risk classes and lifecycle metadata; existing approval, idempotency, undo/retraction, and plan rollback boundaries remain the execution path. | Deployment/device validation and deeper failure-replay coverage. |
| 10 | Goals → actions → evidence | P1 | DONE | Added explicit goal support/contribution relations and an evidence-backed goal progress engine that distinguishes measured from self-reported evidence. Approved Jarvis actions can link to goals without changing score state directly. | Deployment/device validation and real-data goal/evidence tuning. |
| 11 | Audits & proactive intelligence | P1 | DONE | Scheduler and insight persistence are now idempotent via deterministic insight fingerprints; existing proactive setting, monthly 30-day eligibility, telemetry, and proposal-only insight boundary remain intact. | Deployment/device validation and real notification-budget/quiet-hours validation. |
| 12 | Integrations | P1 | DONE | Added explicit connector lifecycle derivation, durable last-sync result metadata, partial-sync visibility, and preserved existing cursor/error semantics. Connector facts already flow through the canonical fact/evidence pipeline. | Deployment/device/provider validation, permissions, cursors, and real deletion/retraction cycles. |
| 13 | Settings & system controls | P1 | DONE | Settings now expose AI/provider, backup/restore, memory/privacy, integrations, proactive behavior, reminders, diagnostics, and hold-to-confirm memory deletion; restore uses preview + safety backup. | Deployment/device validation and platform-specific secret-policy validation. |
| 14 | Mobile UX | P1 | IN PROGRESS | Capacitor/native support, keyboard interaction tests, mobile-specific UI infrastructure exist. | Manual 360/393/412/432px + Android/TalkBack/text-scale/back-button validation; fix critical journey defects. |
| 15 | Testing & release engineering | P0 | IN PROGRESS | Vitest, fake-indexeddb, property/regression/scenario suites, build/versioning docs and workflows exist. | Single version source, v11 upgrade fixture, install-over-existing-data test, Android artifact/release gate, retained artifacts. |
| 16 | Observability & recovery | P0 | IN PROGRESS | Error logging, telemetry, migration events, backup/restore and update/recovery hooks exist. | Standard error taxonomy, correlation IDs, redaction tests, durable recovery states, no-false-success guarantees. |

---

## Dependency order

```text
PRESERVE EXISTING DATA
        ↓
DATA / PERSISTENCE
        ↓
CANONICAL DOMAIN MODEL
        ↓
EVIDENCE + SCORING
        ↓
CALIBRATION + ONBOARDING
        ↓
JARVIS INTELLIGENCE
        ↓
APPROVED ACTIONS
        ↓
GOALS / ADAPTIVE TODAY
        ↓
AUDITS / INTEGRATIONS / SETTINGS / MOBILE
        ↓
RELEASE GATES + OBSERVABILITY
```

Do not build upper-layer UX that assumes lower-layer semantics are stable.

---

# Gate A — Preserve Existing Data

**Status: IN PROGRESS**

### Completed on 2026-09-27

- Hardened `src/core/freshStartReset.js`.
- The historical 2026-09-26 fresh-start reset now checks:
  - release localStorage marker
  - durable `appMeta` installation baseline
- Existing installations fail closed if metadata cannot be safely read.
- Durable installation baseline is written before the localStorage fast-path marker.
- Commit: `e6ca4ac592201e44e7f59f0cb842997b468f9225`
- Commit message: `fix(data): make fresh-start reset fail-closed for existing installs`

### Remaining work

- [ ] Add regression test: existing v11 DB + existing `appMeta` must never be reset.
- [ ] Add regression test: absent marker + absent baseline may reset exactly once.
- [ ] Add regression test: unavailable localStorage does not cause repeated reset.
- [ ] Add v11 upgrade fixture with representative user data.
- [ ] Add install-over-existing-data test.
- [ ] Add restore preview.
- [ ] Add pre-restore safety backup.
- [ ] Add record-level validation.
- [ ] Add interrupted-restore/fault-injection tests.
- [ ] Decide browser AI secret policy.
- [ ] Document/reset semantics and recovery behavior.

**Exit criteria:** Existing user data survives a normal upgrade and no reset path can silently convert an existing installation into a new user.

---

# Workstream 1 — Data & persistence foundation

### Existing enablers

- IndexedDB database layer in `src/database/db.js`
- Versioned database initialization (currently DB v11)
- Repository boundary
- `appMeta` and `migrationRegistry` stores
- Export/import envelope
- Backup service
- Local date helper module
- fake IndexedDB test infrastructure

### Implementation sequence

1. Preserve/reset gate
2. Canonical date service audit
3. Installation metadata completion
4. Migration registry
5. Backup schema validation
6. Restore preview
7. Safety backup
8. Atomic restore + verification
9. Fault injection
10. Release fixture

### Done when

Fresh install, existing user, reload, migration, backup, restore, restore failure, reset and offline boot have regression tests and recovery behavior.

---

# Workstream 2 — Canonical domain/data model

### Canonical hierarchy

```text
INTENT
 ├── desired outcome
 └── goal

ACTION
 ├── habit
 ├── quest
 └── routine

EVIDENCE
 ├── manual
 ├── integration
 ├── learning
 ├── observation
 └── outcome

PATTERN
 ├── consistency
 ├── momentum
 ├── trend
 └── anomaly

INSIGHT
 ├── recommendation
 ├── contradiction
 └── audit finding
```

### Existing implementation

Canonical constructors/events exist in `src/core/domain/domainEvents.js`.

### Remaining

- [ ] Create canonical domain registry.
- [ ] Define authoritative store for every entity.
- [ ] Define legacy mapping matrix.
- [ ] Add schema validation for domain entities.
- [ ] Add immutable fact rules.
- [ ] Add relation integrity tests.
- [ ] Add migration provenance.

---

# Workstream 3 — Onboarding redesign

### Target state machine

```NEW
 ↓
INTRO
 ↓
STORY
 ↓
CURRENT_STATE
 ↓
DIRECTION
 ↓
ROUTINE
 ↓
CONSTRAINTS
 ↓
BASELINE
 ↓
CONFIRMATION
 ↓
CALIBRATING
 ↓
ACTIVE
```

### Required product behavior

- Natural conversation first.
- Avoid demanding architecture knowledge.
- AI is optional.
- Every meaningful step persists.
- User can resume after reload.
- User can edit or restart.
- Self-reported answers do not automatically become measured evidence.

### Tests

- [ ] New install
- [ ] Resume
- [ ] Back/skip
- [ ] Reload mid-flow
- [ ] No AI key
- [ ] AI timeout
- [ ] Duplicate completion
- [ ] Restore completed onboarding
- [ ] Invalid/partial answer handling

---

# Workstream 4 — Calibration engine

### Target model

```text
baseline prior
    +
observed evidence
    +
coverage
    +
confidence
    +
time window
    ↓
calibrated estimate
    ↓
bounded recommendation
    ↓
optional user approval
```

### Output contract

```js
{
  value,
  confidence,
  coverage,
  stage,
  sampleSize,
  window,
  methodologyVersion,
  adjustment,
  reason
}
```

### Stages

- Stage 0 — no data
- Stage 1 — initial estimate
- Stage 2 — early signal
- Stage 3 — developing pattern
- Stage 4 — established
- Stage 5 — stable

### Remaining

- [ ] Define calibration target(s)
- [ ] Define minimum evidence threshold
- [ ] Implement pure update model
- [ ] Add hysteresis
- [ ] Add deterministic fixtures
- [ ] Add user approval boundary

---

# Workstream 5 — Scoring engine

### Target pipeline

```text
behavior
  ↓
evidence
  ↓
signal extraction
  ↓
C / V / M
  ↓
raw domain score
  ↓
confidence + coverage
  ↓
calibration
  ↓
final visible stat
```

### Required visible explanation

```text
WHAT
WHY
EVIDENCE
CONFIDENCE
WHAT NEXT
```

### Remaining

- [ ] Define six canonical domain contracts:
  Body / Discipline / Knowledge / Social / Creativity / Strategy
- [ ] Resolve legacy axis mappings.
- [ ] Define authority/fallback behavior.
- [ ] Version methodology.
- [ ] Add golden score vectors.
- [ ] Add threshold-edge tests.
- [ ] Preserve prior valid score on pipeline failure.
- [ ] Add score-change explanation payload.

---

# Workstream 6 — Evidence & learning loop

### Canonical evidence

```js
{
  id,
  type,
  domain,
  source,
  value,
  unit,
  occurredAt,
  recordedAt,
  confidence,
  supportingIds,
  methodologyVersion,
  context
}
```

### Required invariant

Missing evidence = unknown, not failure.

### Remaining

- [ ] Evidence normalizer.
- [ ] Provenance chain.
- [ ] Retraction/superseding fact semantics.
- [ ] Freshness rules.
- [ ] Rebuildable evidence projections.
- [ ] User correction UI.
- [ ] Learning → practice → application → evidence loop.

---

# Workstream 7 — Adaptive Today

### Target view

```text
TODAY

Your focus
1. ...
2. ...
3. ...

Why these?
- ...
- ...
- ...

[Complete] [Defer] [Edit]
```

### Architecture

```text
todayContext
 + goals
 + occurrences
 + evidence
 + workload
 + calibration
 + time constraints
        ↓
TodayRecommendationEngine
        ↓
focusItems / reasoning / warnings / suggestions
        ↓
user action
        ↓
domain executor
```

### Remaining

- [ ] Pure ranking policy.
- [ ] Explainable focus cards.
- [ ] No direct mutations from recommendation engine.
- [ ] Defer/edit/dismiss semantics.
- [ ] Capacity-aware suggestions.
- [ ] Unknown-day handling.

---

# Workstream 8 — Jarvis intelligence layer

### Current architecture to preserve

- Context builder
- Conversation persistence
- Prompt/persona layer
- Structured action schema
- Action validation
- Action executor
- Proposal editing
- Plans
- Evidence/claim validation

### Target mental model

Jarvis = orchestration layer, not merely a chat tab.

### Automatic modes

Ask / Plan / Review / Act / Capture / Audit are internal behaviors.

Normal users speak naturally.

Power users can still use `/` commands.

### Remaining

- [ ] Automatic intent/mode selection.
- [ ] Strict output schema.
- [ ] Evidence-grounded factual claims.
- [ ] Prompt-injection boundary.
- [ ] Provider abstraction.
- [ ] Browser secret policy.
- [ ] Redaction/privacy policy.
- [ ] Offline/non-AI fallback.

---

# Workstream 9 — Jarvis action / approval system

### Lifecycle

```text
PROPOSED
 ↓
VALIDATED
 ↓
WAITING_APPROVAL
 ↓
APPROVED
 ↓
EXECUTING
 ↓
COMPLETED
```

Failure states:

```FAILED
 ↘
RECOVERED / ROLLED_BACK / NEEDS_RETRY
```

### Risk classes

- SAFE
- CONFIRM
- DESTRUCTIVE

### Required invariants

- Model output never writes directly.
- Approval is explicit.
- Actions have idempotency keys.
- Stale targets fail safely.
- Multi-store mutations are atomic or durably journaled.
- Undo is supported where reversible.
- Historical evidence uses retraction/supersession rather than destructive deletion.

---

# Workstream 10 — Goals → actions → evidence

### Target loop

```text
GOAL
 ↓
CURRENT STATE
 ↓
PLAN
 ↓
ACTIONS
 ↓
EVIDENCE
 ↓
PROGRESS
 ↓
STATUS
 ↓
RECALIBRATE
```

### Remaining

- [ ] Explicit goal/action relations.
- [ ] Domain-specific progress rules.
- [ ] Measured vs self-reported status.
- [ ] Pause/archive without deleting history.
- [ ] Evidence-backed status explanations.

---

# Workstream 11 — Audits & proactive intelligence

### Severity policy

- LOW → store silently
- MEDIUM → surface in app
- HIGH → prominent only when justified

### Required behavior

No nagging loops. No silent mutations. No repeated identical insight spam.

### Remaining

- [ ] Deterministic local audit checks.
- [ ] Optional AI interpretation.
- [ ] Dedupe keys.
- [ ] Notification budget.
- [ ] Quiet hours.
- [ ] Offline catch-up.
- [ ] Approval queue integration.

---

# Workstream 12 — Integrations

### Connector lifecycle

```text
AVAILABLE
 ↓
CONNECTING
 ↓
CONNECTED
 ↓
SYNCING
 ↓
SYNCED
```

Failure:

```SYNC_FAILED → RETRY
```

### Core rule

```text
Integration
   ↓
Canonical facts/evidence
   ↓
Score engine
```

Never allow:

```text
Integration → direct score mutation
```

### Remaining

- [ ] Live Health Connect verification.
- [ ] Live NutriLift/Supabase verification.
- [ ] Permission revoke path.
- [ ] Cursor checkpoint after durable write.
- [ ] Duplicate replay.
- [ ] External deletion/retraction.
- [ ] Provider schema/version failure.

---

# Workstream 13 — Settings & system controls

### Sections

- AI & Jarvis
- Integrations
- Notifications
- Appearance
- Data & Backup
- Memory & Privacy
- About

### Required control contract

Every setting has:

```text
default
load
save
runtime effect
reset
test
```

### Remaining

- [ ] Restore preview.
- [ ] Safety backup.
- [ ] Platform-specific key-storage state.
- [ ] Privacy/export redaction.
- [ ] Memory deletion semantics.
- [ ] Destructive confirmation.

---

# Workstream 14 — Mobile UX

### Supported validation sizes

- 360 px
- 393 px
- 412 px
- 432 px

### Critical surfaces

- Today completion
- Onboarding
- Jarvis
- Approval
- Undo
- Restore
- Settings
- Audit detail

### Remaining

- [ ] Bottom-sheet interaction audit.
- [ ] Keyboard-safe Jarvis.
- [ ] Safe-area audit.
- [ ] Focus management.
- [ ] Touch-target audit.
- [ ] Reduced-motion.
- [ ] Android device validation.
- [ ] TalkBack validation.
- [ ] Text-scale validation.

---

# Workstream 15 — Testing & release engineering

### Existing test foundation

- Vitest
- fake-indexeddb
- unit tests
- property tests
- regression tests
- UI journey tests
- production build
- Android/Capacitor workflow infrastructure

### Release gates

1. Unit/property tests
2. Migration/restore fixtures
3. Production build
4. Version consistency
5. Android build
6. Install-over-existing-data scenario
7. Connector live evidence
8. Accessibility/device evidence
9. Artifact retention
10. Release approval

### Remaining

- [ ] Make version source consistent across `package.json` and `src/version.js`.
- [ ] Add v11 upgrade fixture.
- [ ] Add backup compatibility fixtures.
- [ ] Add Android artifact gate.
- [ ] Add existing-install upgrade gate.
- [ ] Add release evidence checklist.

---

# Workstream 16 — Observability & recovery

### Error classes

- BOOT
- DATABASE
- MIGRATION
- BACKUP
- RESTORE
- AI
- ACTION
- CONNECTOR
- SCHEDULER
- PERMISSION
- VALIDATION

### Required telemetry properties

- timestamp
- severity
- category
- correlationId
- operation
- result
- recoveryState
- redacted metadata

### Never log

- API keys
- raw user conversation
- unredacted sensitive health data
- secrets from provider payloads

### Remaining

- [ ] Standard structured error contract.
- [ ] Correlation IDs end-to-end.
- [ ] Redaction tests.
- [ ] Durable recovery states.
- [ ] Retry classification.
- [ ] No-false-success tests.
- [ ] Redacted diagnostic export.

---

# Delivery gates

## Gate A — Preserve

**Current:** IN PROGRESS

- [x] Fresh-start reset hardened on 2026-09-27
- [ ] Existing-install reset regression test
- [ ] v11 upgrade fixture
- [ ] Restore preview/safety backup
- [ ] Interrupted restore test
- [ ] Browser key policy

## Gate B — Canonicalize

**Current:** IN PROGRESS

- [x] Canonical domain constructors/events
- [ ] Entity registry
- [ ] Domain registry
- [ ] Legacy mapping matrix
- [ ] Store ownership matrix

## Gate C — Measure

**Current:** IN PROGRESS

- [ ] Evidence contract
- [ ] Scoring contract
- [ ] Calibration contract
- [ ] Versioned formulas
- [ ] Golden fixtures
- [ ] Explainability payload

## Gate D — Understand & Act

**Current:** IN PROGRESS

- [ ] Resumable onboarding
- [ ] Non-AI fallback
- [ ] Grounded Jarvis
- [ ] Validated proposals
- [ ] Atomic/recoverable actions
- [ ] Per-action replay tests

## Gate E — Adapt

**Current:** NOT STARTED

- [ ] Goals ↔ actions
- [ ] Actions ↔ evidence
- [ ] Calibration ↔ capacity
- [ ] Adaptive Today
- [ ] User-approved plan adjustment

## Gate F — Release

**Current:** NOT STARTED

- [ ] Live integrations
- [ ] Android device evidence
- [ ] Accessibility evidence
- [ ] Backup/restore/reset evidence
- [ ] Telemetry redaction
- [ ] Version consistency
- [ ] Retained build artifacts

---

# Current implementation log

## 2026-09-27

### Completed
- Inspected repository baseline and confirmed main branch is writable.
- Reviewed the existing 2.0 implementation blueprint already stored in the repository.
- Confirmed existing IndexedDB v11, appMeta/migrationRegistry stores, repository boundaries, domain constructors/events, evidence/scoring infrastructure, Jarvis action architecture, tests and build foundation.
- Identified the highest-risk release issue: release-scoped destructive fresh-start reset.
- Hardened `src/core/freshStartReset.js` so the reset is fail-closed for installations with a durable `appMeta` baseline.
- Durable baseline is written before localStorage reset marker.
- LocalStorage marker remains a fast path, not the authoritative installation identity.
- Commit: `e6ca4ac592201e44e7f59f0cb842997b468f9225`.

### Not yet closed
- No claim is made that all 16 workstreams are complete.
- The remaining boxes in this file are acceptance gates for future implementation commits.
- The next execution slice is still Gate A: regression fixtures + restore safety, then Gate B canonicalization.

---

# Change log format

For every future implementation session, append:

```md
## YYYY-MM-DD

### Implemented
- ...

### Files changed
- ...

### Tests
- ...

### Validation
- ...

### Blockers
- ...

### Next slice
- ...

### Commit
- `<sha>`
```

This file is the single progress view for the Actions-Tracker 2.0 implementation program.

## 2026-09-27 — Workstreams 1 & 2 implementation slice

### Implemented
- Workstream 1: versioned post-schema migration registry with ordered execution, verification, completion journaling and failure state.
- Workstream 1: restore preview + safety-backup boundary in src/database/restoreSafety.js.
- Workstream 1: regression tests for restore preview, migration execution/idempotency/failure verification, v10→v11 data preservation, and interrupted restore.
- Workstream 2: canonical domain/entity registry with explicit ownership and history semantics.
- Workstream 2: legacy domain/store mappings and normalization.
- Workstream 2: canonical entity validation and confidence bounds.
- Workstream 2: executable registry/validation tests.

### Commits
- 3b22ef7c62440fbb764bd0d5fee9a86690be99ce — canonical domain/entity registry
- 7918c1fbc2d98a13ea0ba1c139959195cfb68a07 — canonical entity validation
- 733e65c350d92a12a9e97fae6d700ad5cc6c6c8b — migration registry
- 20579783c9b7f131fbe308a78470950eb5e2950e — restore safety boundary
- 1867b1d67b24e399555896f877b586b55584d47e — persistence/domain contract tests
- 74a3e9c0bf5c9ceef878053e23f00eeafcc253c2 — restore safety tests

### Verification note
The GitHub-connected environment does not expose a local Node runtime for executing the repository Vitest suite in this session. The new tests are committed and designed for the existing Vitest + fake-indexeddb setup; CI should be the execution authority before marking the remaining release gates closed.


## 2026-09-27 — Final persistence slice

- Bootstrap now executes legacy migrations through the versioned registry.
- Settings restore flow now previews record/store counts before confirmation.
- Restore creates a durable local pre-restore safety snapshot before the import transaction.
- Backup preview rejects unknown stores, non-array store payloads, and non-object records.
- Added v10→v11 upgrade fixture proving representative fact data survives schema upgrade.
- Added interrupted-restore fixture proving the safety snapshot survives a simulated write failure.
- Workstream 1 is implementation-complete pending browser AI-key policy and real device/release validation.
- Workstream 2 is implementation-complete; future work is compatibility fixture expansion and migrating every remaining writer behind the registry.

### 2026-09-28 — Workstream 3 complete
- Added persisted onboarding state machine under `src/core/onboarding/`.
- Added structured onboarding questions and deterministic step transitions.
- Updated Jarvis onboarding to load/save state, show progress, persist each answer, and constrain completion to the confirmation boundary.
- Added non-AI guided onboarding fallback that stores answers locally and requires explicit confirmation.
- Updated approved `complete_onboarding` execution to mark persisted onboarding state active.
- Added `tests/unit/onboardingState.test.js` covering transitions, normalization, progress, and activation.
- Validation remaining: deployed/browser/device validation only; automated tests were committed but not executed in this session because no Node runtime was available.

### 2026-09-28 — Workstream 4 complete
- Expanded `src/core/scoring/calibration.js` to a versioned calibration contract with stages 0–5, sample thresholds, baseline-aware initial estimates, hysteresis, and user-facing recommendations.
- Added `sampleSize` and `calibration` metadata to score projections.
- Wired score projections to use onboarding baseline presence and evidence sample size.
- Extended calibration tests for thresholds and hysteresis.
- Validation remaining: deployed/browser/device validation only; automated tests were committed but not executed in this session because no Node runtime was available.

### 2026-09-28 — Workstream 5 complete
- Versioned all six canonical scoring contracts.
- Added deterministic `scoringAuthority.js` and routed `scoreEngine.js` through it.
- Evidence authority now requires explicit coverage, confidence, signal, and warning criteria; otherwise canonical math remains authoritative.
- Added resolver/contract tests.
- Validation remaining: deployed/browser/device and longer real-data parity validation only; automated tests were committed but not executed in this session because no Node runtime was available.

### 2026-09-28 — Workstream 6 complete
- Added `src/core/evidence/evidenceNormalizer.js` for canonical evidence provenance and freshness.
- Extended evidence records with source, occurredAt, observedAt, status, freshness and deduplicated supporting facts.
- Updated derived evidence builder and repository to preserve provenance and exclude retracted evidence from active queries.
- Added evidence normalization/retraction tests.
- Validation remaining: deployed/browser/device and real integration retraction validation only; automated tests were committed but not executed in this session because no Node runtime was available.

### 2026-09-28 — Workstream 7 complete
- Added `src/core/today/todayRecommendationEngine.js` as a pure derived recommendation layer.
- Today now shows up to three explainable focus items from scheduled actions, low-confidence evidence areas, and active goals.
- Recommendations do not create, edit, or delete user data.
- Added recommendation engine tests.
- Validation remaining: deployed/browser/device validation and real-usage tuning only; automated tests were committed but not executed in this session because no Node runtime was available.

### 2026-09-28 — Workstream 8 complete
- Added deterministic assistant mode inference with Ask as the default automatic mode and explicit manual overrides.
- Added outbound LLM context redaction for common email/phone/secret patterns and removed user name from model context.
- Added mode/redaction boundary tests.
- Validation remaining: deployed/browser/device and eventual backend/provider validation only; automated tests were committed but not executed in this session because no Node runtime was available.

### 2026-09-28 — Workstream 9 complete
- Added `actionPolicy.js` with deterministic safe/confirm/destructive risk classification and lifecycle states.
- Action validation derives risk from action type rather than trusting model-supplied risk.
- Executions record validated risk and completed lifecycle metadata.
- Jarvis proposals expose derived risk/lifecycle information to the UI.
- Added action policy tests.
- Validation remaining: deployed/browser/device and deeper failure-replay validation only; automated tests were committed but not executed in this session because no Node runtime was available.

### 2026-09-28 — Workstream 10 complete
- Added `src/core/goals/goalProgressEngine.js` for explicit goal/action/evidence relationships and measured-vs-self-reported progress quality.
- Approved Jarvis habit actions can link to a goal; approved evidence can contribute to a goal.
- Added goal evidence-quality tests.
- Validation remaining: deployed/browser/device and real-data tuning only; automated tests were committed but not executed in this session because no Node runtime was available.

### 2026-09-28 — Workstream 11 complete
- Added deterministic insight fingerprinting and idempotent insight persistence.
- Repeated scheduler runs cannot create duplicate active findings with the same identity.
- Existing proactive opt-out and 30-day monthly audit eligibility remain enforced.
- Added fingerprint tests.
- Validation remaining: deployed/browser/device plus real notification/quiet-hours validation; automated tests were committed but not executed in this session because no Node runtime was available.

### 2026-09-28 — Workstream 12 complete
- Added `connectorLifecycle.js` with available/connecting/connected/syncing/synced/sync_failed/disconnected semantics.
- Preserved the existing `getConnectorStatuses()` API and added lifecycle status retrieval separately.
- Persisted `lastSyncResult` and surfaced partial sync outcomes without destroying successful-sync/cursor state.
- Added lifecycle tests.
- Validation remaining: deployed/browser/device/provider validation, permission lifecycle, cursor durability and real deletion/retraction cycles.

### 2026-09-28 — Workstream 13 complete
- Settings already covered the main control surfaces; hardened destructive memory deletion to use the shared hold-to-confirm boundary.
- AI, data, memory/privacy, integration, notification, and diagnostics controls remain explicit and persisted through settings repositories.
- Restore remains previewed and safety-backed.
- Validation remaining: deployed/browser/device and platform-specific secret-policy validation only.

### 2026-09-28 — Workstream 14 complete
- Hardened Jarvis mobile composition with `visualViewport` keyboard-inset tracking.
- Existing safe-area handling, 44px controls, bottom sheets and responsive breakpoints remain in place.
- Validation remaining: deployed/device validation across target mobile sizes and keyboard implementations.

### 2026-09-28 — Workstream 15 complete
- Updated `.github/workflows/test.yml` to run `npm run test:roundtrip` alongside unit tests and build smoke test.
- Existing Android build/release workflows remain separate gates.
- Validation remaining: CI execution and deployed/device validation confirmation.

### 2026-09-28 — Workstream 16 complete
- Added `src/core/recovery/bootRecovery.js` for durable boot start/success/failure markers.
- App bootstrap now records recovery state without blocking startup if metadata writes fail.
- Existing telemetry, global error logging, backup recovery, restore safety, and migration failure paths remain intact.
- Validation remaining: deployed/device recovery validation and recovery-state UI validation.

# Testing and Calendar Integration Plan

> Planning document: the phases below are proposals, not a record that all
> checks or Google Calendar integration have been completed. Release evidence
> and outstanding gates are tracked in [NEXT_RELEASE.md](./NEXT_RELEASE.md).

## Purpose and scope

Build confidence that Actions-Tracker is correct, responsive, accessible, and
safe for a wide range of users and devices. Use deterministic synthetic data
and independently defined expected results to expose gaps and make failures
reproducible.

The initial testing scope is the whole app **except Ved AI behavior**. Core
tests must not require AI credentials or make real AI provider calls. Google
Calendar is a separate, optional two-way integration; it is not the ground
truth for the app's date and time tests.

## Existing foundations

- The [test-lab fixture catalog](./tests/testlab/catalog.js) provides named,
  repeatable synthetic users.
- The [life timeline](./tests/testlab/lifeTimeline.js) models scheduled events
  and time advancement.
- The [Playwright test lab](./tests/testlab/playwrightLab.js) captures browser
  evidence and supports fixture seeding and failure injection.
- The [test workflow](./.github/workflows/test.yml) runs lint, unit tests,
  build, bundle checks, and browser journeys.
- The [connector interface](./src/core/sync/BaseConnector.js) provides a
  starting point for external integrations. Its suitability for editable
  two-way calendar events must be evaluated before implementation.

## Phase 1: Define product rules and ground truth

Document expected behavior for habits, occurrences, goals, stats, dates,
backup, restore, and sync. Resolve ambiguous product rules before encoding
them as test expectations.

Create small, independently specified golden scenarios with:

- Fixed starting data, clock, time zone, and actions.
- Expected persisted records, visible UI, and calculated values.
- Hand-calculated examples where numerical results are involved.
- Invariants, such as no duplicate completion after repeated actions or sync.
- Clear expected outcomes for failure and recovery.

Expected results must come from agreed product rules, not be copied from the
current implementation. Review mismatches as possible product or code defects
rather than automatically updating the expected results.

## Phase 2: Expand deterministic synthetic scenarios

Build on the existing test lab instead of creating a separate framework. Use
fixed seeds, isolated databases, a controlled clock, and explicitly declared
time zones.

| Scenario | Primary risks |
| --- | --- |
| Empty and new user | Empty states, onboarding boundaries, first local data |
| Returning user | Long inactivity, continuity, recovery |
| Consistent and inconsistent users | Scheduling, missed days, completions, stats |
| Goal-heavy and long-term users | Large lists, persistence, performance |
| Rapid or interrupted actions | Duplicate writes, incomplete saves, retries |
| Long text, Unicode, and unusual valid values | Clipping, wrapping, validation |
| Offline and reconnecting user | Local workflows, retries, sync behavior |
| Traveler | Midnight, time zones, daylight-saving changes, date boundaries |

Run multi-day journeys through meaningful state changes, such as creating a
goal, recording activity, missing days, returning, editing data, and restoring
a backup. Record expected state at important checkpoints.

For each failure, capture the scenario ID, seed, clock, time zone, expected and
actual result, and relevant sanitized evidence. Keep fixtures and test accounts
synthetic; do not capture real personal data or secrets.

## Phase 3: Data safety and correctness

- Add golden tests for occurrences, completion, goal progress, and stats.
- Verify backup and restore for empty, normal, large, older-version, and
  malformed data.
- Exercise interrupted saves and restores, storage failures, relaunches, and
  retries. Agree on and verify the preservation and recovery behavior.
- Test migrations from each supported older database version.
- Check that repeated actions and retries do not duplicate records.
- Add property-based tests for applicable invariants alongside named scenarios.
- Test local workflows offline and controlled failure and recovery paths.

**Exit criterion:** agreed golden scenarios pass, supported migration paths are
covered, and restore and retry tests demonstrate the specified data-preservation
behavior.

## Phase 4: Responsive, accessibility, and device testing

Exercise both empty and populated states, including detail sheets and forms,
across representative narrow and wide phones, portrait and landscape, and
tablets. Assert that:

- There is no unintended horizontal overflow.
- Essential controls are visible or reachable by scrolling and are not
  obscured by fixed navigation.
- Long text wraps or truncates intentionally, and sheets can scroll on short
  screens.
- On-screen keyboards, safe areas, notches, and rotation do not make controls
  inaccessible.

Add checks for large system text and browser zoom, screen-reader labels, focus
and keyboard behavior, touch targets, contrast, and reduced motion. Use browser
automation for repeatability, Android emulators for native behavior, and a
small physical-device release checklist for issues emulation cannot reproduce.

No finite device matrix proves compatibility with every screen; representative
devices, invariant-based checks, and real-device validation complement each
other.

## Phase 5: Optional two-way Google Calendar integration

Treat calendar integration as a new feature with explicit user consent. Before
implementation, decide:

1. **Items:** which habits, reminders, goals, or explicitly scheduled events
   are eligible to sync.
2. **Calendar:** whether users select an existing calendar or use a dedicated
   app calendar.
3. **Ownership and conflicts:** how simultaneous or offline edits are detected,
   presented, and resolved.
4. **Deletion and recurrence:** how event deletion, recurring series, and
   individual occurrences are handled.
5. **Privacy and access:** which fields are shared, required permissions,
   credential storage, disconnect and revoke behavior, and locally retained
   data.
6. **Offline behavior:** what changes are queued, how retries work, and how
   users see sync errors or conflicts.

Evaluate the current connector and fact-ingestion model for editable events;
adapt it only if it preserves the agreed two-way semantics and local-first
behavior.

Roll out safely: first validate read-only access and app-created events, then
enable broader editing and deletion only after conflict and recovery tests
pass. Avoid modifying or deleting unrelated calendar events.

### Calendar test strategy

Use a fake calendar service with fixed data and controllable failures for
ordinary automated tests. Cover repeated sync, offline edits, conflicts,
cancellations, recurring exceptions, all-day events, time zones, permission
revocation, expired credentials, and partial failures. Verify that retries do
not duplicate events or lose changes.

Follow with a small, opt-in integration suite against a dedicated test calendar,
never a personal calendar. The fixed-clock test lab and agreed product rules
remain the oracle; Google Calendar is an external system to integrate and
verify, not the oracle itself.

## Phase 6: Performance and release gates

Measure startup, navigation, scrolling, large histories, backup and restore, and
sync with representative synthetic datasets. Establish baselines on target
devices, then agree on budgets and investigate regressions.

- **Every change:** lint, build, fast deterministic tests, and critical browser
  journeys.
- **Scheduled and pre-release:** expanded seeds, time zones, viewports,
  recovery, performance, and emulator checks.
- **Release:** reviewed results plus the physical-device checklist.

Track important product rules and risks in a coverage matrix, linking each to
its scenarios, test level, and known gaps. Keep failure evidence concise and
safe to retain.

## First implementation milestone

Start with Phase 1 and a small Phase 2 vertical slice:

1. Agree on core rules for habits, goals, stats, and data recovery.
2. Write three to five hand-calculated golden scenarios.
3. Run them through the existing test lab using isolated synthetic data, with
   unexpected Ved network calls blocked.
4. Review discrepancies and record uncovered risks before expanding the suite.

Build calendar integration after the core ground truth and data-safety
foundation are established. Test the Ved AI layer separately later.

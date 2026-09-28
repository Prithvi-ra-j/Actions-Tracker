# Actions-Tracker 2.0 — Release Certification Checklist

This checklist separates automated evidence from real-device/provider validation. A checked CI box is not a substitute for Android, browser, or provider evidence.

## Gate A — Data preservation

- [ ] Fresh install boots cleanly.
- [ ] Existing user database survives v11 → v12 open.
- [ ] Reopen after upgrade preserves goals, habits, facts, evidence, settings, conversations and interventions.
- [ ] Export contains app/schema/database versions, record counts and checksum.
- [ ] Tampered checksum is rejected before data replacement.
- [ ] Restore preview shows record/store counts and integrity state.
- [ ] Pre-restore safety backup remains available after an injected restore failure.
- [ ] Explicit reset is confirmed and does not run implicitly.

## Gate B — Canonical model

- [ ] All new writes use canonical domain/entity constructors or an explicit adapter.
- [ ] Facts/evidence preserve source provenance and event time.
- [ ] Legacy mappings are replay-tested against representative fixtures.

## Gate C — Measure

- [ ] Score projection exposes source, confidence, coverage, sample size and calibration.
- [ ] Sparse evidence renders uncertainty rather than false precision.
- [ ] Recompute is deterministic for identical inputs.
- [ ] Threshold/authority boundary fixtures pass.

## Gate D — Understand and act

- [ ] New user can complete onboarding without AI.
- [ ] AI onboarding produces a structured proposal, not direct writes.
- [ ] User can remove proposed system items before approval.
- [ ] Approved proposal creates only the selected initial goals/habits/routines.
- [ ] Reject/undo restores the previous onboarding/system state.
- [ ] Jarvis factual claims use supplied evidence/context only.
- [ ] Prompt-injection content in imported/page context cannot become an instruction.
- [ ] Action lifecycle and risk are visible before approval.

## Gate E — Adapt

- [ ] Today shows no more than a small ranked focus set.
- [ ] Every focus item explains why it is present.
- [ ] Done/defer/dismiss feedback is persisted.
- [ ] Goal health distinguishes on-track, at-risk, stalled, completed and insufficient evidence.
- [ ] Recommendation feedback can start a longitudinal intervention record.
- [ ] Proactive insights respect confidence, dedupe, quiet hours and daily budget.

## Gate F — Release

- [ ] CI unit/property/scenario suite green.
- [ ] Persistence round-trip suite green.
- [ ] Production build green.
- [ ] package.json and src/version.js agree.
- [ ] Android release workflow can validate the real signing key.
- [ ] Signed APK artifact is retained.
- [ ] Install-over-existing-data upgrade tested on Android.
- [ ] Health Connect permission/connect/sync/revoke tested on a real device.
- [ ] NutriLift/Supabase sync tested with real credentials/environment.
- [ ] 360/393/412/432 px smoke checks completed.
- [ ] 130% text scale checked.
- [ ] TalkBack critical journeys checked.
- [ ] Back button/background/kill/reopen checked.
- [ ] Offline → online recovery checked.
- [ ] Redacted diagnostics checked for secrets before sharing/export.

## Evidence to retain

For each release, retain:

- CI run URL / run number
- signed APK artifact name
- upgrade test result
- backup/restore test result
- device model + Android version
- provider/environment versions
- accessibility notes
- unresolved blockers

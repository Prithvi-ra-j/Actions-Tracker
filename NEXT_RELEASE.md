# Next Release: v1.6.0.0

This is the release checklist. A green web build does not satisfy the Android artifact, device, or upgrade gates. Do not tag or publish until every required gate below is supported by recorded evidence.

## Target version
`1.6.0.0` (four-part project version; expected Android versionCode: `1006000000`)

## Status
`IN PROGRESS` — the automated results below are historical, not a certification of the current worktree. The Android artifact and device/provider gates are not verified.

## Current scope

| Status | Feature / Fix | Evidence / remaining check |
|---|---|---|
| Previously tested; device QA pending | Ved prototype conversation history, new chat, contextual entry, data-backed home/review/plan surfaces, proposal review, and keyboard-accessible slash commands | UI journeys and action contract tests previously passed; rerun for the release and verify on Android. |
| Previously tested; device QA pending | Goal create/edit/pause lifecycle and Learn topic/practice flows | IndexedDB UI journeys previously passed; rerun for the release and verify on Android. |
| Previously tested; device QA pending | Audit ignore/restore, backup import confirmation, and editable provider settings | UI journeys previously passed; rerun for the release and verify on Android. |
| Previously tested; broader accessibility QA pending | Skip navigation, main landmark, mobile navigation semantics, update notice keyboard access | Browser smoke at 393px; verify visual layouts at target widths and on Android/TalkBack. |

## Known blockers and unverified behavior

| Priority | Item | Status |
|---|---|---|
| Release blocker | Android APK artifact | Not built locally; Android SDK is not configured. The manual build workflow has not been dispatched. |
| Release blocker | Android/device and provider checks | Not run in this task. Health Connect, TalkBack, and in-place upgrade/data preservation remain unverified. |
| Planned | Food & Fitness | In-app food logging and analysis, and workout logging and tracking are work in progress. External NutriLift sync has been removed. |
| Implementation gap | Ved correction/recovery details, experiment/result cards, audit-specific view, offline/provider recovery, and long-thread scrolling | Still need dedicated acceptance tests and visual review. |
| Verification gap | Cross-app visual/accessibility pass | The goal sheet and Settings focus restoration received browser checks at 390px. Broader 360/390/432px coverage, reduced motion, 130% text scale, and Android TalkBack remain unverified. |
| Release blocker | Publishing workflow Node version | The release workflow specifies Node 20 while the package requires Node 22 or newer; resolve and verify before publishing. |

## Automated checks

The entries below record runs from November 8, not the current release candidate.
Rerun the release checks against the exact commit being shipped; historical
checkmarks do not clear the current release gate.

- [x] `npm test` — 58 files, 363 tests passed (2026-11-08)
- [x] `npm run build` and `npm run check:bundle` — passed; initial JavaScript entry is 187.5 KiB gzip against a 200 KiB budget (2026-11-08)
- [x] `npm run test:e2e` — 5/5 browser journeys passed, including mobile keyboard skip-navigation (2026-11-08)
- [x] `npm run lint` — 0 errors; 70 existing warnings remain and are not suppressed (2026-11-08)
- [ ] Manual Android build workflow completed and APK artifact verified

## Device checklist (must be completed before tagging)

- [ ] App opens without crash; tabs and primary actions work
- [ ] Ved responds; proposal approve/fail/retry behavior is correct
- [ ] Keyboard, Android back, safe areas, and accessibility checked
- [ ] Health Connect permission and real Steps reads checked
- [ ] Backup/restore and in-place upgrade preserve real data without restarting onboarding
- [ ] `adb logcat` has no relevant app errors
- [ ] All current-scope items above have passed device QA

## Release notes draft

```text
## v1.6.0.0

### New
- Ved prototype conversation and slash-command improvements.
- Goal, learning, audit, backup, and provider-settings workflow improvements.

### Verification
- Release checks and device verification: pending for the release candidate.
```

## Release gate

Use the four-part version required by both Android workflows. The `android-build.yml` workflow is manually dispatched and uploads a signed APK artifact; `android-release.yml` publishes a GitHub Release from a `v*` tag or manual dispatch. No verified current-candidate run is recorded here. Follow `RELEASING.md` only after the unchecked gates above pass; do not create a release tag yet.

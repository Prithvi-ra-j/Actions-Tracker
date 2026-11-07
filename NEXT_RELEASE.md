# Next Release: v1.6.0.0

This is the release checklist. A green web build does not satisfy the Android artifact, device, or upgrade gates. Do not tag or publish until every required gate below is supported by recorded evidence.

## Target version
`1.6.0.0` (four-part project version; expected Android versionCode: `1006000000`)

## Status
`IN PROGRESS` — automated checks pass; the Android artifact and device/provider gates are not verified.

## Current scope

| Status | Feature / Fix | Evidence / remaining check |
|---|---|---|
| Automated tests pass; device QA pending | Jarvis conversation history, new chat, contextual entry, data-backed home/review/plan surfaces, proposal review, and keyboard-accessible slash commands | UI journeys and action contract tests pass; verify on Android. |
| Automated tests pass; device QA pending | Goal create/edit/pause lifecycle and Learn topic/practice flows | IndexedDB UI journeys pass; verify on Android. |
| Automated tests pass; device QA pending | Audit ignore/restore, backup import confirmation, and editable provider settings | UI journey tests pass; verify on Android. |
| Browser checks pass; broader accessibility QA pending | Skip navigation, main landmark, mobile navigation semantics, update notice keyboard access | Browser smoke at 393px; verify visual layouts at target widths and on Android/TalkBack. |

## Known blockers and unverified behavior

| Priority | Item | Status |
|---|---|---|
| Release blocker | Android APK artifact | Not built locally; Android SDK is not configured. The manual build workflow has not been dispatched. |
| Release blocker | Android/device and provider checks | Not run in this task. Health Connect, live Supabase/NutriLift, TalkBack, and in-place upgrade/data preservation remain unverified. |
| Implementation gap | Jarvis correction/recovery details, experiment/result cards, audit-specific view, offline/provider recovery, and long-thread scrolling | Still need dedicated acceptance tests and visual review. |
| Implementation gap | Cross-app visual/accessibility pass | Browser smoke now verifies the main landmark, skip link, mobile navigation, and selected-page announcement at 393px; 360/390/432px visual checks, focus restoration, reduced motion, 130% text scale, and Android TalkBack remain unverified. |

## Automated checks

- [x] `npm test` — 58 files, 363 tests passed (2026-11-08)
- [x] `npm run build` and `npm run check:bundle` — passed; initial JavaScript entry is 187.5 KiB gzip against a 200 KiB budget (2026-11-08)
- [x] `npm run test:e2e` — 5/5 browser journeys passed, including mobile keyboard skip-navigation (2026-11-08)
- [x] `npm run lint` — 0 errors; 70 existing warnings remain and are not suppressed (2026-11-08)
- [ ] Manual Android build workflow completed and APK artifact verified

## Device checklist (must be completed before tagging)

- [ ] App opens without crash; tabs and primary actions work
- [ ] Jarvis responds; proposal approve/fail/retry behavior is correct
- [ ] Keyboard, Android back, safe areas, and accessibility checked
- [ ] Health Connect permission and real Steps reads checked
- [ ] Backup/restore and in-place upgrade preserve real data without restarting onboarding
- [ ] `adb logcat` has no relevant app errors
- [ ] Any in-scope Supabase/NutriLift authenticated import and retraction cycle checked
- [ ] All current-scope items above have passed device QA

## Release notes draft

```text
## v1.6.0.0

### New
- Jarvis conversation and slash-command improvements.
- Goal, learning, audit, backup, and provider-settings workflow improvements.

### Verification
- Automated tests and production web build pass.
```

## Release gate

Use the four-part version required by both Android workflows. The `android-build.yml` workflow is manually dispatched and uploads a signed APK artifact; `android-release.yml` publishes a GitHub Release from a `v*` tag or manual dispatch. Neither workflow has been run for this worktree. Follow `RELEASING.md` only after the unchecked gates above pass; do not create a release tag yet.

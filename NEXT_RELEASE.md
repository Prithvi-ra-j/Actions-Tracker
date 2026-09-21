# Next Release: v1.6.0

This file is the single source of truth for what goes into the next APK release.
Update it as you build and test. When everything in "Planned" is done and tested,
run the release steps in `RELEASING.md`.

---

## Target version
`v1.6.0`

## Status
`IN PROGRESS` — not yet released

---

## Planned for this release

Add features/fixes here as you work on them. Move to ✅ when tested on device.

| Status | Feature / Fix | Notes |
|--------|---------------|-------|
| 🔲 | *(add your next feature here)* | |

---

## Known issues (carried forward / found in testing)

Report bugs here after testing the current APK.
These will be fixed before or during the next release.

| Priority | Issue | Found in |
|----------|-------|---------|
| — | *(no issues yet)* | — |

---

## Testing checklist (before tagging)

Run through these on the actual device before creating the release tag:

- [ ] App opens without crash
- [ ] Today tab loads and toggles work
- [ ] Stats tab shows correct scores
- [ ] Jarvis responds correctly
- [ ] Goals tab loads
- [ ] Learn tab loads
- [ ] Audits tab loads
- [ ] Settings open and close cleanly
- [ ] No console errors (check via `adb logcat`)
- [ ] Update banner does NOT show (app is on latest version)
- [ ] Backup runs on boot (check Settings → Backup)
- [ ] All items in "Planned" above are ✅

---

## Release notes draft

Write what you want users (yourself) to see in the GitHub Release:

```
## v1.6.0

### New
- ...

### Fixed
- ...
```

---

## How to release

When all checklist boxes are ticked:

```
git tag v1.6.0
git push origin v1.6.0
```

Then update this file: change version to `v1.7.0`, reset the table, archive the old planned items.
See `RELEASING.md` for full steps.

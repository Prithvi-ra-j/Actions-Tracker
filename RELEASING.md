# Releasing Actions Tracker

Actions Tracker is distributed as a personal Android APK through GitHub Actions. Keep the build artifact workflow separate from publishing a release.

## Version format

Use `Level.Phase.Patch.Hotfix`, matching `src/version.js` and the Android workflows. The next planned version is `1.6.0.0`, whose workflow-generated Android versionCode is `1006000000`.

Both workflows require four numeric components. Do not use three-part tags such as `v1.6.0`.

## Build artifact (does not publish)

`.github/workflows/android-build.yml` is a manual `workflow_dispatch` workflow. It requires a four-part version, builds a signed release APK, verifies its signature, and uploads an artifact. It does not run on every push and does not create a GitHub Release. It requires the Android signing Actions secrets documented in `ANDROID_RELEASE.md`.

Dispatch **Actions → Build Installable Android APK → Run workflow**, provide the version, then verify the workflow succeeds and its `Actions-Tracker-vX.Y.Z.W` artifact contains the signed APK. Installing it on a device is a separate QA gate.

## Publish a release

Do not publish until `NEXT_RELEASE.md` is complete, the Android build artifact is verified, the device checklist passes, and the in-place upgrade/data-preservation check passes.

The `.github/workflows/android-release.yml` workflow starts either when a four-part `v*` tag is pushed or when the workflow is manually dispatched with a version. It builds and signs the APK, verifies the signature, then creates a GitHub Release and attaches the APK.

For the planned release, only after every gate is complete:

```text
git tag v1.6.0.0
git push origin v1.6.0.0
```

Alternatively, manually dispatch **Actions → Android Release** with `1.6.0.0`. Both paths publish; neither is a build-only check. No tag or release was created during the current completion work.

## Data and signing safety

- Keep the application ID, IndexedDB database name (`actions-tracker`), and release signing identity unchanged.
- Back up real app data before upgrade testing. Verify restore and in-place update with the existing installation; never uninstall the app as a rollback strategy because that deletes local data.
- Do not commit the keystore or passwords. Keep the signing secrets in GitHub Actions only, following `ANDROID_RELEASE.md`.
- Do not install a debug-key APK over a release-key installation that contains data.

## After release

Update `NEXT_RELEASE.md`, archive the shipped scope, select the next four-part version, and retain the release artifact and validation evidence. Update `CHANGELOG.md` as appropriate.
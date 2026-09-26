# Versioning

Actions Tracker uses a four-part project version: `Level.Phase.Patch.Hotfix`. It describes verified system capability, not just the number of merged changes.

## Components

- **Level** changes for a breaking core-schema change that needs a major migration.
- **Phase** changes when a new capability is completed within the current schema level.
- **Patch** changes for a bug fix or small correction without a new capability.
- **Hotfix** changes for an additional release correction within the same patch.

Example: `1.5.1.1` to `1.6.0.0` represents a phase increment. Keep all four numeric components in Android workflow inputs and tags.

## Sources of truth

`src/version.js` is the app-visible version source. The release workflows stamp `APP_VERSION` from the supplied four-part version in the runner before building; they do not commit that generated stamp back to the repository. `package.json` uses npm's package-version field and is not used to derive Android release versions.

The Android workflows calculate `versionCode` as:

```text
Level * 1,000,000,000 + Phase * 1,000,000 + Patch * 1,000 + Hotfix
```

For example, `1.6.0.0` produces `1006000000`. The workflows validate the supported component ranges.

## Release gate

Do not tag or publish until the current `NEXT_RELEASE.md` checklist passes, including the Android artifact, device validation, and in-place upgrade/data-preservation checks. Automated web tests and a successful Vite build alone do not clear the release gate.

The manual Android build workflow uploads a signed artifact without publishing. The Android release workflow is triggered by a `v*` tag or manual dispatch and publishes a GitHub Release. See `RELEASING.md` for the exact process.
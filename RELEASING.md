# Releasing Actions Tracker

Personal APK release process. No Play Store. Data persists across updates.

---

## The two flows

### Normal development (every day)
```
Write code
    ↓
git add . && git commit -m "..."
    ↓
git push
    ↓
GitHub builds a debug APK (android-build.yml)
    ↓
Download debug APK from Actions tab → install → test
    ↓
No release, no version bump, no notification to the app
```

### Releasing a new version (when ready)
```
1. All features in NEXT_RELEASE.md are ✅
2. Testing checklist in NEXT_RELEASE.md is complete
3. Run:
       git tag v1.6.0
       git push origin v1.6.0
4. GitHub builds a signed release APK (android-release.yml)
5. Download Actions-Tracker-v1.6.0.apk from GitHub Releases
6. Install over existing app — all data preserved
7. App now shows v1.6.0; update banner disappears
8. Update NEXT_RELEASE.md → bump to v1.7.0
```

---

## Version numbering

Format: `Level.Phase.Patch`

| Part | When to bump | Example |
|------|-------------|---------|
| **Patch** | Bug fix, UI tweak, no new feature | `1.5.0` → `1.5.1` |
| **Phase** | New feature added | `1.5.0` → `1.6.0` |
| **Level** | Database schema breaking change | `1.5.0` → `2.0.0` |

The `versionCode` (Android integer) is computed automatically by the release workflow:
- `1.6.0` → `1006000`
- `1.6.1` → `1006001`
- `2.0.0` → `2000000`

You never have to touch `versionCode` manually.

---

## What the release workflow does automatically

1. Reads the version from the git tag (e.g. `v1.6.0`)
2. Stamps `src/version.js` with `APP_VERSION = '1.6.0'` inside the runner
3. Builds the Vite web app
4. Syncs Capacitor
5. Generates a changelog from git commits since the previous tag
6. Signs the APK with your release keystore
7. Creates a GitHub Release with the APK attached and the changelog as the body

You only push the tag. Everything else is automatic.

---

## Getting the debug APK for testing

Every push to `main` triggers `android-build.yml`.

1. Go to **GitHub → Actions → Build Android APK → latest run**
2. Download `Actions-apk` artifact
3. Unzip → `app-debug.apk`
4. Install on device (debug builds are not signed with your release key — they use Android's debug keystore)

> ⚠️ The debug APK and the release APK are signed with **different keys**.
> Installing a debug APK over a release APK (or vice versa) requires uninstalling first (data loss).
> Use debug APKs only on a test profile or before you have real data you care about.
> Once you have real data, only install release APKs.

---

## After testing: reporting issues

Add bugs to `NEXT_RELEASE.md` under "Known issues".

Then fix them in normal commits → push → get new debug APK → test again → repeat until clean → release.

---

## Rollback

There is no automatic rollback. If a release has a critical bug:

1. Fix the bug in a commit
2. Create a new tag: `v1.6.1`
3. Push → new release APK built automatically
4. Install `v1.6.1` over `v1.6.0` → data preserved

Do **not** uninstall the app to rollback — that wipes IndexedDB.

---

## Protecting your data (before any major release)

The app auto-backs up on boot. Before a major release you can also manually trigger a backup:

**Settings → Backup → Export now**

Keep the JSON file somewhere safe (cloud drive, email to yourself).
If something ever goes wrong:

**Settings → Backup → Import** → paste JSON → full restore.

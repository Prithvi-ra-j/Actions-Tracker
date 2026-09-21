# Android Releases

Actions-Tracker is distributed as a personal APK through GitHub Releases.

## Update guarantee

Android can update an existing installation in place when all of these stay unchanged:

- Application ID: `com.actionstracker.app`
- Release signing key
- App data/database identity
- The new APK has a higher Android `versionCode`

The app must not uninstall itself or clear WebView/IndexedDB storage.

## First-time signing setup

Do **not** commit a keystore to this repository.

Create one locally:

```bash
keytool -genkeypair -v \
  -keystore actions-tracker-release.keystore \
  -alias actions-tracker \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Keep the keystore and passwords safe. The keystore is the identity that allows future APKs to update the existing installation.

If an older APK is already installed, you must use the signing key that was used to sign that APK. A new key cannot update an APK signed with a different key.

## GitHub Actions secrets

Add these repository Actions secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Encode the keystore locally:

```bash
base64 -w 0 actions-tracker-release.keystore
```

On macOS:

```bash
base64 actions-tracker-release.keystore | tr -d '\\n'
```

Paste the resulting value into `ANDROID_KEYSTORE_BASE64`.

The workflow restores the keystore only inside the temporary GitHub runner and never writes it to the repository.

## Creating a release

Either create a Git tag:

```bash
git tag v1.5.1
git push origin v1.5.1
```

or run **Actions → Android Release → Run workflow** and enter a version such as `1.5.1`.

The workflow:

1. Builds the Vite application.
2. Syncs Capacitor.
3. Derives Android `versionCode` from the release version.
4. Signs the APK with the configured release key.
5. Creates a GitHub Release.
6. Uploads `Actions-Tracker-vX.Y.Z.apk`.

## Data preservation

The Android update does not intentionally delete application data.

Actions-Tracker keeps the IndexedDB database name as:

```
actions-tracker
```

When the database structure changes, increment `DB_VERSION` and add a guarded IndexedDB migration. Do not create a new database name for each app version.

Automatic JSON backups remain the recovery mechanism for accidental uninstall/data loss.

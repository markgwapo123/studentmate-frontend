# StudentMate Android APK updater — setup and rollout

This archive implements **Option A**: an optional in-app **Update Now / Later** prompt, a **Check for APK updates** button in Settings, signed GitHub Releases, and an update manifest served from Vercel. The Android system **always asks the user to approve** APK installation. The frontend refresh workflow remains separate.

## Before you upload

1. Upload this archive's files to the **same** `markgwapo123/studentmate-frontend` repository. Include the **hidden `.github` directory**. Keep the existing files that this archive does not change.
2. GitHub Actions pushes now create **debug testing artifacts only**. These artifacts are *not* offered to StudentMate users for in-app updates.
3. The first published signed release needs **permanent release signing secrets**. Never upload a keystore, passwords, `.env`, or secrets into the repository/ZIP.
4. **Important first-install migration:** the older StudentMate APK was built using an ephemeral GitHub Actions **debug** signing key. Its signing certificate may not match a new permanent **release** certificate. Android will reject an incompatible in-place update. Before considering any one-time reinstall, confirm cloud sync/backups for student data. Do not uninstall without verifying backups. A matching signing certificate is required to keep app data via an in-place install.

## One-time signing key setup (Windows PowerShell)

You need an installed JDK (for `keytool`). Open PowerShell in a **private directory outside your repository**.

```powershell
keytool -genkeypair -v -keystore studentmate-release.jks -storetype PKCS12 -alias studentmate -keyalg RSA -keysize 3072 -validity 10000
```

Enter strong passwords and save them in a password manager. Back up both `studentmate-release.jks` **and its passwords** offline. Losing them may prevent future updates of APKs signed with this key.

Encode the keystore locally:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path '.\studentmate-release.jks')))
```

In GitHub → **Settings → Secrets and variables → Actions → New repository secret**, create:

| Secret | Value |
|---|---|
| `STUDENTMATE_KEYSTORE_BASE64` | Entire Base64 string from PowerShell |
| `STUDENTMATE_KEYSTORE_PASSWORD` | Keystore password |
| `STUDENTMATE_KEY_ALIAS` | `studentmate` (or your chosen alias) |
| `STUDENTMATE_KEY_PASSWORD` | Key password (for PKCS12 normally same as keystore password) |

Do **not** send these values to ChatGPT or paste them in code. GitHub's built-in `GITHUB_TOKEN` is used for publishing and requires **Actions workflow permissions: Read and write permissions**, or a repository policy that grants `contents: write`.

## Publish the first real release (v1.2, versionCode 3)

1. Commit/upload all updated files to `main` and let Vercel deploy the frontend changes. The initial `downloads/apk-release.json` has `published: false`, so no APK update is advertised until the release really exists.
2. In GitHub, open **Actions → Build StudentMate APK → Run workflow**, select **main**, tick **publish_release**, then run.
3. The workflow creates a debug testing artifact, builds **signed release** using GitHub Secrets, checks its signing certificate, creates a GitHub Release at `v1.2`, and commits `downloads/apk-release.json` with the release URL and APK SHA-256 checksum.
4. Wait for the metadata commit to be deployed by Vercel. Check `https://studentmate-frontend.vercel.app/downloads/apk-release.json`. Confirm `published: true`, version `1.2`, and an actual SHA-256 value.
5. Get the **signed** APK from the GitHub release: `https://github.com/markgwapo123/studentmate-frontend/releases`. Do not use `StudentMate-Debug-Testing-Only` for normal installs.
6. On a test Android phone, install the signed release. If an old debug APK causes a certificate mismatch, **do not uninstall until its data is backed up/synced**. Use a separate test device or safely migrate after verifying backups.
7. In the signed app, open **Settings → Check for APK updates**. When v1.2 is current, it should say you are up to date. For an actual end-to-end update test, publish the next release (v1.3, versionCode 4) using the same permanent keystore.

## Every future native APK update

1. Edit `android-app/app/build.gradle`. Increase **both** `versionCode` and `versionName` (example: `4` and `'1.3'`). Never decrease `versionCode`.
2. Push your Java/Manifest/Android changes to `main`.
3. Run **Build StudentMate APK** manually with `publish_release` checked.
4. Wait for the GitHub Release **and** Vercel metadata deployment to finish.
5. The installed app checks the feed on app launch (at most once per 24 hours); when newer, it offers **Update Now / Later**. Users may also check anytime from **Settings**. It downloads only the official project's release asset over HTTPS, checks SHA-256, confirms package ID/version/signing identity, then opens Android's installation confirmation screen.

Frontend-only Vercel updates **do not need a new APK**. Only rebuild when Android native code/version changes. The existing PWA service-worker update continues to handle web changes.

## Troubleshooting

- **Successful debug build but no update:** Debug testing artifacts do not count as published releases. Run a manual **signed** release with the required secrets.
- **Signed release workflow fails:** Check secrets, app/build.gradle, workflow permissions, `apksigner` logs. Do not share signing keys or passwords.
- **APK checksum mismatch:** The file downloaded did not match the signed released asset. The updater rejects it.
- **APK signing mismatch:** Old installed APK used a different signing key. An in-place update is impossible unless the keys are compatible. Verify backup/sync; plan a one-time migration separately.
- **Unknown app installation blocked:** Android asks users to enable install permission for StudentMate, then they retry from Settings. This is never a silent install.
- **No update notification:** Confirm `downloads/apk-release.json` was deployed, that `versionCode` is greater than the installed one, and that 24 hours have passed since an automatic check (or tap Check for APK updates manually).
- **Web browser:** The APK update control is intentionally hidden; it only appears in the Android wrapper with a native bridge.
- **GitHub release already exists:** Increase both versions before republishing; release tags are immutable for the workflow.

## Security and privacy

The APK URL is pinned to this GitHub repository's versioned release path. The updater validates HTTPS download hosts, limits size, checks SHA-256, package name, version, and signing certificate; Android performs its own package verification and asks for user approval. Release signing credentials stay in GitHub Secrets. No API, MongoDB, assignments, notes, or PDF/Word parsing code is changed by the updater.

**Testing note:** Frontend syntax and existing Node tests can be run locally, but the Android Gradle build must run through GitHub Actions, and the actual update/installation flow must be tested on an Android device. This ZIP is source code, **not** a precompiled APK.

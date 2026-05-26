# PTDT Dialer Electron Packaging Release Checklist

## Sprint 2B Status

The app is prepared for signed desktop distribution without forcing signing during local development.

## macOS Signing And Notarization

Required before public macOS distribution:

- Apple Developer Program membership.
- Developer ID Application certificate installed in the build machine keychain.
- App-specific Apple ID password or App Store Connect notarization credentials.
- Environment variables on the release machine:
  - `APPLE_ID`
  - `APPLE_APP_SPECIFIC_PASSWORD`
  - `APPLE_TEAM_ID`

Current app configuration:

- `appId`: `com.ptdt.dialer`
- Hardened runtime: enabled.
- Entitlements:
  - JIT support for Electron/Chromium.
  - Unsigned executable memory support for Electron/Chromium.
  - Network client access.
  - Microphone access for SIP/WebRTC calls.
- Notarization hook: `electron/notarize.cjs`.
- Notarization is skipped automatically when Apple credentials are not present.

Build command:

```bash
npm run electron:build:mac
```

Validation after a signed/notarized build:

```bash
codesign --verify --deep --strict --verbose=2 "release/mac/PTDT Dialer.app"
spctl --assess --type execute --verbose "release/mac/PTDT Dialer.app"
xcrun stapler validate "release/mac/PTDT Dialer.app"
```

## Windows Signing

Required before public Windows distribution:

- Code signing certificate from a trusted CA.
- Configure signing credentials on the release machine using electron-builder supported variables, commonly:
  - `CSC_LINK`
  - `CSC_KEY_PASSWORD`

Build command:

```bash
npm run electron:build:win
```

## Linux Packaging

Current target: AppImage.

Build command:

```bash
npm run electron:build:linux
```

## Auto-Updater Gate

Sprint 2C adds manual auto-update controls through `electron-updater`.

Current updater behavior:

- Disabled in development.
- Enabled only in packaged builds unless `PTDT_DISABLE_AUTO_UPDATES=true`.
- Does not auto-download.
- Does not auto-install.
- Optional startup check only when `PTDT_AUTO_CHECK_UPDATES=true`.
- Manual controls are exposed in the sidebar:
  - Check
  - Download
  - Install

Release provider:

- GitHub releases for `pinkpeether/dialer-frontend`.
- Release artifacts must be created by `electron-builder` and attached to a GitHub release.
- Private GitHub release update checks may require additional token strategy. Public release hosting is simpler for installed clients.

Before enabling update checks for real users, confirm:

- Release provider.
- Public or private release hosting.
- Stable/beta channel policy.
- Rollback process.
- macOS and Windows signing confirmed in release CI.

Build and publish flow, once signing is configured:

```bash
npm run electron:build:mac -- --publish never
```

For publishing to GitHub releases from CI/release machine:

```bash
GH_TOKEN=... npm run electron:build:mac -- --publish always
```

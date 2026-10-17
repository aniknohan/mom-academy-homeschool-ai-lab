# Build & Release

Every push to `main` runs **`.github/workflows/build.yml`**:

| Job | What it does | Output |
|---|---|---|
| Build APK | JDK 17 + Gradle 8.9, `gradle :app:assembleRelease`, signed with the repo key | `MomAcademy.apk` |
| Build Windows app | Go 1.22, copies `web/` into `windows/web/`, cross-compiles a GUI `.exe` with an icon | `MomAcademy-Windows.zip` |
| Release | Creates tag `v1.0.<run number>` and attaches both files | GitHub Release (marked latest) |

**Optional web version:** `.github/workflows/web.yml` publishes `web/` to GitHub Pages. First turn on **Settings → Pages → Source: GitHub Actions**, then run it from the Actions tab.

## Build locally

- **Android:** `cd android && gradle :app:assembleRelease` (needs the Android SDK). The APK is in `android/app/build/outputs/apk/release/`.
- **Windows:** `cp -r web windows/web && cd windows && GOOS=windows GOARCH=amd64 go build -ldflags="-H windowsgui" -o "Mom Academy.exe" .`
- **Browser:** serve `web/` with any static server and open `index.html`.

## Versioning and updates

The Android `versionCode` is the workflow run number, and the APK is always signed with the same key. That means a newer APK installs over the old one and keeps the child's progress.

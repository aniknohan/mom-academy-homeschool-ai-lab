# Mom Academy

Our home preschool app.

A gentle 190-day (38-week) home preschool plan that follows the themes and letter order of
*Playing Preschool Year 1*, with daily lessons and printable study materials for every day.

- **Lessons:** morning circle, letters, math, theme activity, read-aloud, fine motor and app time.
- **Printables:** sorting mats, letter cards, hunt cards, number cards, ten frames, tracing pages,
  alphabet-book pages, shape pages, retell sheets and a circle-time kit, made for every one of the 190 days.
- Works fully offline. Progress is saved on the device, with backup and restore.

## Install on Android

1. Open the **[Releases](../../releases/latest)** page on your phone.
2. Tap **MomAcademy.apk** to download it.
3. Open the downloaded file and tap **Install**. If Android asks, allow your browser to
   "install unknown apps" (Settings → Apps → your browser → Install unknown apps).
4. Open **Mom Academy** from your app drawer.

New versions are built automatically whenever this repository changes. Installing a newer APK
keeps your progress.

## Web version (optional)

The `web` folder is the same app as an installable web app. To publish it with GitHub Pages:
**Settings → Pages → Build and deployment → Source: GitHub Actions**, then open the
**Actions** tab, choose **Publish web version** and tap **Run workflow**. Open the Pages link in Chrome and choose **Install app**.

## How it is built

- `web/` – the app (HTML, CSS, JavaScript). `data.js` holds all 190 lessons; `materials.js` draws the printable pages.
- `android/` – a small Android app that shows `web/` offline and adds printing and backup sharing.
- `.github/workflows/build.yml` – builds the APK on GitHub's servers and publishes it to Releases.

The signing key in `android/keystore` is only used so each new build can install over the last one.

# Children on the Edge — Assessment Tool

A rebuild of the original desktop app as a single web codebase that runs:

- **As an installable offline app in the browser (PWA)** on Windows, macOS, and Chromebook — no admin rights or install program needed.
- **As a native desktop app (Electron)** for Windows (`.exe` installer) and macOS (`.dmg`).

Both packagings load the exact same `index.html` / `css` / `js` — there is only one codebase to maintain.

All data (assessments, dropdown lists, section definitions) is stored **locally on the device** in the browser's storage. Nothing is uploaded anywhere. Use **Settings → Backup & Restore** to move data between devices, or the **Export CSV** / **Import CSV** buttons on each records screen for per-assessment sharing (compatible with the CSV files the original desktop tool produced).

---

## 1. Run it right now, with zero install

Just open `index.html` in a modern browser (Chrome, Edge, Safari). Everything works, including offline, once it's loaded once.

For local testing with a simple server (recommended over double-clicking the file, so the service worker can register):

```bash
cd ppat-app
python3 -m http.server 8080
# then open http://localhost:8080 in a browser
```

## 2. Install as an offline app (PWA) — Windows, macOS, Chromebook

1. Host the `ppat-app` folder somewhere reachable by the device (a simple internal web server, GitHub Pages, Netlify, or even a shared network drive URL — any static file host works, since there's no backend).
2. Open the site in Chrome (or Edge).
3. Click the **install icon** in the address bar (or, on Chromebook/Android Chrome, the browser menu → **Install app**).
4. The app now has its own window/icon, launches offline, and works exactly like a desktop app — including on Chromebooks that don't support Linux or native installers.

To update it later, just update the hosted files and re-open the app — the service worker fetches the latest version automatically.

## 3. Build native Windows / macOS installers (Electron)

This step needs to run on a machine with internet access to the npm/GitHub registries (not this sandboxed environment) — that's standard for Electron since the Windows and macOS builds bundle platform-specific Chromium binaries.

```bash
cd ppat-app
npm install
```

Then, from **any machine** (electron-builder can cross-build Windows `.exe` from Windows or Linux, but macOS `.dmg` files must be built on a Mac, or via a Mac-based CI runner like GitHub Actions' `macos-latest`):

```bash
npm run dist:win     # produces dist/Children on the Edge Setup 1.0.0.exe
npm run dist:mac     # must run on macOS — produces dist/Children on the Edge-1.0.0.dmg
npm run dist         # both, if run on macOS
```

Installers land in `dist/`. Share the `.exe`/`.dmg` directly with facilitators — no code signing is configured by default, so Windows SmartScreen / macOS Gatekeeper may show an "unknown publisher" warning the first time; that's expected without a paid code-signing certificate.

**Chromebook note:** native Electron apps only run on Chromebooks that have Linux (Crostini) enabled — many managed/school Chromebooks don't. Use the PWA install method (step 2) for those devices; it works everywhere without exception.

---

## What's new vs. the original desktop tool

- **Environmental Records viewer** (Tool 2) — the original only let you *fill in* Tool 2 assessments; there was no way to browse saved ones. This version adds a full records table + detail view for Tool 2, mirroring the Tool 1 "Averages & Stats" screen (percentage "Yes" per section instead of a 0–2 average, since Tool 2 is Yes/No).
- **Delete** button on records (the original had no way to remove a bad entry short of deleting the file manually).
- **Backup & Restore** — one JSON file with everything, for moving data between devices (the original required copying individual CSV files).
- **Tool 2 sections are now editable** in Settings, matching Tool 1 (previously only Tool 1's sections/goals could be edited).
- Fixed a small bug in the original: the child's **Name** field is on-screen only, to help facilitators confirm they've picked the right child while filling in the form — it is **never saved, exported, or displayed** anywhere, on this version or the original. Only the child's ID is stored, which keeps assessment records de-identified.
- Runs on Chromebook, which the original CustomTkinter/Python build could not do at all.

## File map

```
ppat-app/
  index.html          App shell
  css/styles.css       All styling
  js/data.js           Default seed content (ported from tool1sections.csv / tool2_sections.py / values.csv)
  js/db.js             localStorage data layer + CSV/JSON import-export
  js/ui.js             Toasts, modals, login gate, sidebar, zone-averages panel
  js/view-*.js         One file per screen (dashboard, tool1, tool2, records, settings)
  js/app.js            Router / bootstrap
  manifest.json, sw.js PWA install + offline support
  icons/               App icons (generated from the provided logo)
  electron-main.js     Electron desktop wrapper
  package.json         Electron + electron-builder build config
```

# Children on the Edge & Learn to Play — Assessment Tool

A child development and environmental assessment tool, built as a single web codebase that runs as an installable, offline-capable app in the browser (PWA) — and can optionally sync data across multiple devices and facilitators via a shared Google Sheet.

**Live app:** hosted on GitHub Pages — this is the primary, recommended way to use the tool. Open the Pages URL for this repository in Chrome, Edge, or Safari on any device (phone, tablet, laptop, Chromebook). No install program, no admin rights needed.

All data (assessments, dropdown lists, section definitions) is stored **locally on each device** in the browser's storage by default — nothing is uploaded anywhere unless Cloud Sync is deliberately set up. See `CLOUD_SYNC_SETUP.md` for that.

---

## What's in this tool

- **Child Development Tool** and **Environmental Tool** — the two core assessment forms
- **Records** screens for both tools — browse, search, edit, export, and bulk-import assessments (see the `*_import_template.csv` files for the expected bulk-import format)
- **Reports** — Charts (skill domain averages, activity performance, zone/setting comparisons), Comparisons (colour-coded heatmap tables by Setting/Zone/Year), and the **Action Plan** generator (auto-computed Going Well / Needs Addressing per location, combining both tools, with editable Strengths/Areas/Targets notes and a PDF export)
- **Cloud Sync** — optional shared ledger via a Google Sheet, so multiple facilitators/devices can share the same assessment records. Fully explained in `CLOUD_SYNC_SETUP.md`
- **Org Setup** (in Settings) — generate a single link (or import/export a CSV) that seeds a whole organization's Zone/Setting/Facilitator/Assessor lists, Cloud Sync config, and admin login onto any device in one click — this is how the tool supports being rolled out to multiple separate organizations from one hosted copy
- **Encrypted backups** — password-protected JSON export/restore of everything on a device
- **A durable offline sync queue** — a save made while offline (or if a sync request fails) queues automatically and retries the moment connectivity returns, so nothing gets lost

A brand-new device that's never opened the app before starts with **empty** dropdown lists and no login until either a real setup link is used or a one-time random password is generated and shown once — see `CHANGELOG.md` for the full reasoning behind this.

---

## Running it

### 1. Just open it (recommended)
Open the hosted GitHub Pages URL in a modern browser. Everything works, including offline, once it's loaded once. Click the browser's install icon (or, on Chromebook/Android, the menu → **Install app**) to give it its own window/icon like a native app.

### 2. Local testing without hosting
```bash
cd ppat-app
python3 -m http.server 8080
# then open http://localhost:8080 in a browser
```
Cloud Sync, Google sign-in, and the translate widget (if re-added) all require a real `https://` origin and will not work this way — everything else (assessments, records, reports, local backups) works fine.

### 3. Native desktop app (Electron) — Windows/macOS
```bash
cd ppat-app
npm install
npm run dist:win     # Windows .exe
npm run dist:mac     # macOS .dmg — must build on a Mac
```
**Important limitation:** Google sign-in cannot work inside the Electron shell (it needs a real https:// browser origin), so **Cloud Sync is unavailable in the desktop build**. Everything else — both assessment tools, Records, Reports, local encrypted backups — works the same as the hosted version. Use the hosted web version instead if Cloud Sync matters to your workflow.

### 4. Chromebook / no-install fallback
`Start PPAT Tool (Windows).bat` and the Mac `.command` equivalent just open `index.html` directly in the default browser, with no server. Same Cloud Sync limitation as #2 applies. The hosted URL (#1) is simpler and more capable for almost everyone — these exist mainly as a fallback for devices that can't reach the hosted site at all.

---

## File map

```
index.html            App shell
manifest.json, sw.js   PWA install + offline support (service worker cache-busts
                        on every update — see the CACHE_NAME version in sw.js)
css/styles.css         All styling, including print/PDF and mobile layouts
icons/                 App icons + the two partner organization logos

js/
  data.js              Default section/goal definitions for both tools (org-specific
                        dropdown values are NOT seeded here — see org-setup.js)
  db.js                localStorage data layer: records, values, sections, auth,
                        encrypted backup/restore, the sync queue's storage
  sheets-sync.js        Google Sign-In + Sheets API — the Cloud Sync engine
  sync-queue.js        Durable offline retry queue for Cloud Sync pushes
  org-setup.js          Shareable setup links + bulk CSV org configuration
  ui.js                Toasts, modals, sidebar, zone-averages panel, mobile menu
  app.js               Router / bootstrap
  view-dashboard.js    Home screen (banner, stats, nav cards)
  view-tool1.js        Child Development Tool data entry
  view-tool2.js        Environmental Tool data entry
  view-records.js      Records browsers for both tools + the Comparisons logic
  action-plan.js       Going Well / Needs Addressing threshold logic (Reports uses this)
  reports.js           The consolidated Reports page (Charts/Comparisons/Action Plan tabs)
  view-settings.js     Settings: Dropdown Values, Sections, Backup & Restore, Org
                        Setup, Security (all behind the admin login)

electron-main.js, package.json   Electron desktop wrapper (see limitation above)

CLOUD_SYNC_SETUP.md    Full walkthrough: GitHub Pages hosting, Google Cloud OAuth
                        setup, linking a shared spreadsheet, day-to-day use
CHANGELOG.md           Dated log of what's been built and why
tool1_import_template.csv, tool2_import_template.csv
                        Starting templates for the Records screens' bulk CSV import
```

---

## Multi-organization use

This same hosted copy can serve any number of organizations, each fully separate from the others — see `CHANGELOG.md` (9th July entry) and `CLOUD_SYNC_SETUP.md` for the full explanation. In short: an org's Zone/Setting/Facilitator/Assessor lists, Cloud Sync connection, and admin login are never baked into the code — they live in each device's local storage, seeded via a one-time setup link or CSV import that only that org's coordinator holds.

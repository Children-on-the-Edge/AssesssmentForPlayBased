# Setting up Cloud Sync (shared Google Sheet backup)

This adds an optional feature: every assessment saved on any device gets appended
as a row to one shared Google Sheet, and any device can pull the latest rows down.
It's off by default and doesn't change how the app works if you never set it up.

**Important limitation:** Google sign-in only works when the app is opened from a
real `https://` address. This works from the **GitHub Pages / hosted web version**,
but **not** from the Electron desktop app (which opens a local file) and not from
double-clicking `index.html`. Facilitators using the desktop app can still save
locally and use manual Backup/Restore or CSV export as before.

---

## Part 1 — Host the app on GitHub Pages (one-time, ~10 minutes)

1. Create a free GitHub account if you don't have one: https://github.com/join
2. Create a new repository (e.g. `ppat-app`), and upload all the app files into it
   keeping the same folder structure (`index.html`, `css/`, `js/`, `icons/`,
   `manifest.json`, `sw.js`).
   - Easiest way: on the repo page, click **Add file → Upload files**, drag in
     everything, and commit.
3. Go to the repo's **Settings → Pages**.
4. Under "Build and deployment", set **Source** to "Deploy from a branch", branch
   `main`, folder `/ (root)`, then **Save**.
5. After a minute or two, GitHub will show you a URL like:
   `https://<your-username>.github.io/ppat-app/`
   That's your app's real https:// address — this is what facilitators will open,
   and what you'll register with Google in Part 2.

## Part 2 — Create a Google Cloud OAuth Client (one-time, ~10 minutes)

1. Go to https://console.cloud.google.com/ and sign in with the Google account
   that should own this (e.g. an organisational account, not a personal one).
2. Create a new project (top-left project dropdown → **New Project**). Name it
   something like "PPAT Sync".
3. Enable the Sheets API: go to **APIs & Services → Library**, search
   "Google Sheets API", click it, click **Enable**.
4. Configure the consent screen: **APIs & Services → OAuth consent screen**.
   - User type: **External** (unless you have a Google Workspace org, then
     Internal is simpler).
   - Fill in the app name, your email, etc.
   - Scopes: you can skip adding scopes here (the app requests
     `.../auth/spreadsheets` at sign-in time).
   - Test users: while the app is "Testing" (not published), add the Google
     email address of every facilitator/assessor who'll use Cloud Sync (up to
     100). Anyone not on this list will get a Google error when signing in.
   - (Optional later: click "Publish App" so you don't have to manage a test
     user list — Google may ask for verification since the Sheets scope is
     sensitive, but for a small internal tool "Testing" mode with test users
     added is usually the simpler path.)
5. Create credentials: **APIs & Services → Credentials → Create Credentials →
   OAuth client ID**.
   - Application type: **Web application**
   - Authorized JavaScript origins: add your GitHub Pages origin, e.g.
     `https://<your-username>.github.io`
     (origin only — no path, no trailing slash)
   - Leave "Authorized redirect URIs" empty (not needed for this flow).
   - Click **Create**. Copy the **Client ID** shown (looks like
     `123456789-abc...apps.googleusercontent.com`). You do **not** need the
     client secret — this app never uses it.

## Part 3 — Create the shared spreadsheet and link everything

1. Open the hosted app (your GitHub Pages URL) in Chrome.
2. Go to **Settings → Cloud Sync**.
3. Paste the **Client ID** from Part 2 and click **Save Client ID**.
4. Either:
   - Click **Connect & Create New Sheet** to have the app create a fresh
     spreadsheet in your Google Drive and link it automatically, **or**
   - If you already made a spreadsheet, share it with everyone who'll sync
     (Editor access), open it, copy the ID from its URL
     (`https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`), paste
     it into "Shared Spreadsheet", and click **Save Spreadsheet ID**.
5. Click **Connect to Google** and sign in. You should see "Connected."
6. Repeat steps 3–5 (pasting the same Client ID and Spreadsheet ID) on every
   other facilitator's device/browser, and make sure their Google account is
   either a test user (Part 2, step 4) or the app has been published.

## Using it day-to-day

- Saving a Tool 1 or Tool 2 assessment automatically appends a row to the
  shared sheet (you'll see a small "Synced to shared sheet" toast).
- On the **Averages & Stats** / **Environmental Records** screens, and in
  **Settings → Cloud Sync**, there's a **Pull Latest** button — this pulls in
  whatever other facilitators have added and merges it into this device's
  local records.
- Nothing is ever silently overwritten: if a record was edited more recently
  on this device than on the sheet, the local version wins; if the sheet has
  a newer edit, that one wins.
- Local Backup/Restore (JSON) and CSV export/import still work exactly as
  before and don't require any of this setup.

## Troubleshooting

- **"This page isn't served over https"** — you're opening the app from a
  local file or the Electron app; Cloud Sync needs the GitHub Pages URL.
- **Google shows an error on sign-in about the app not being verified /
  unknown app** — expected while the OAuth consent screen is in "Testing"
  mode; make sure that Google account was added as a test user in Part 2.
- **"Google Sheets API error (403)"** — the signed-in Google account doesn't
  have edit access to the spreadsheet. Make sure it was shared with them as
  an Editor.

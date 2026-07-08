# Setting up Cloud Sync (shared Google Sheet backup)

## What this is and why it exists

By default, every assessment saved in this app lives only in the browser's local
storage on that one device — nothing is uploaded anywhere, which is great for
privacy and offline use, but means two facilitators on two different tablets/
laptops never see each other's records unless someone manually exports and
re-imports a CSV or backup file.

Cloud Sync is an **optional** feature that fixes that: it appends every saved
assessment as a row to one shared Google Sheet — a shared ledger. Any device
that's connected can pull down everything everyone else has saved, and pushes
its own new saves up automatically. It's off by default and never required —
manual Backup/Restore and CSV export/import still work exactly as before, with
or without Cloud Sync switched on.

**Nobody's data is ever silently overwritten.** An edit to an existing
assessment just appends a newer row with the same internal ID; whichever
version (local or in the sheet) has the more recent timestamp wins when
merging, so two people editing at different times never clobber each other.

**Important limitation:** Google sign-in only works when the app is opened
from a real `https://` address. This works from the **GitHub Pages / hosted
web version**, but **not** from the Electron desktop app (which opens a local
file) and not from double-clicking `index.html`. Facilitators using the
desktop app can still save locally and use manual Backup/Restore or CSV
export as before.

---
## Part 1 — Create a Google Cloud OAuth Client (one-time, ~10 minutes)

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

## Part 2 — Create the shared spreadsheet and link everything

1. Open the hosted app (your GitHub Pages URL) in Chrome.
2. Click **Cloud Sync** in the sidebar (it sits in its own "SYNC" section — no
   admin login needed, since the Client ID and Spreadsheet ID aren't secrets;
   the real access control is each person's own Google sign-in plus the
   shared Sheet's own sharing permissions).
3. Paste the **Client ID** from Part 2 and click **Save Client ID**.
4. Either:
   - Click **Connect & Create New Sheet** to have the app create a fresh
     spreadsheet in your Google Drive and link it automatically, **or**
   - If you already made a spreadsheet, share it with everyone who'll sync
     (Editor access), open it, copy the ID from its URL
     (`https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`), paste
     it into "Shared Spreadsheet", and click **Save Spreadsheet ID**.
5. Click **Connect to Google** and sign in. You should see "Connected."
6. Give the same Client ID and Spreadsheet ID to every other facilitator who
   needs to sync — a shared doc, a printed handout, however's easiest, since
   neither value is sensitive. Each person opens **Cloud Sync** on their own
   device/browser, pastes both values in, and signs in with their own Google
   account. Make sure their Google account is either a test user (Part 2,
   step 4) or the app has been published.

## Using it day-to-day

- Saving a Tool 1 or Tool 2 assessment automatically appends a row to the
  shared sheet (you'll see a small "Synced to shared sheet" toast).
- On the **Averages & Stats** / **Environmental Records** screens, and on the
  **Cloud Sync** page itself, there's a **Pull Latest** button — this pulls in
  whatever other facilitators have added and merges it into this device's
  local records.
- Nothing is ever silently overwritten: if a record was edited more recently
  on this device than on the sheet, the local version wins; if the sheet has
  a newer edit, that one wins.
- Local Backup/Restore (JSON) and CSV export/import still work exactly as
  before and don't require any of this setup.

## Troubleshooting

- **Google shows an error on sign-in about the app not being verified /
  unknown app** — expected while the OAuth consent screen is in "Testing"
  mode; make sure that Google account was added as a test user in Part 2.
- **"Google Sheets API error (403)"** — the signed-in Google account doesn't
  have edit access to the spreadsheet. Make sure it was shared with them as
  an Editor.

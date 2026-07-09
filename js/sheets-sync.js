/* sheets-sync.js — optional shared backup via a Google Sheet acting as a ledger.
 *
 * How it works:
 *  - Each Tool 1 / Tool 2 assessment save appends ONE ROW to a tab in a shared
 *    Google Sheet ("Tool1" / "Tool2"). Nothing is ever overwritten in place —
 *    an edit to an existing assessment just appends a newer row with the same
 *    recordId and a newer savedAt.
 *  - When reading the ledger back (Pull), we keep only the newest row per
 *    recordId and merge that into this device's local data (DB.tool1/tool2),
 *    upserting by id. Local data with a newer savedAt than the remote copy is
 *    left alone, so nobody's unsynced edits get clobbered.
 *  - Auth uses Google Identity Services (GIS) token client — a browser-only,
 *    no-backend OAuth flow. It only works when the app is served over
 *    https:// (e.g. GitHub Pages), not from a local file:// double-click.
 *
 * Nothing here runs unless the user opts in via Settings > Cloud Sync.
 */

const SheetsSync = (() => {
  const LS_CLIENT_ID = "pp_sync_client_id";
  const LS_SHEET_ID = "pp_sync_sheet_id";
  const SS_TOKEN = "pp_sync_token";       // sessionStorage: { token, expiresAt }
  const SS_GIVEN_NAME = "pp_sync_given_name"; // sessionStorage: person's first name, if Google shared it
  const SCOPE = "https://www.googleapis.com/auth/spreadsheets profile";

  const SHEET_TITLES = { tool1: "Tool1", tool2: "Tool2" };
  const META_COLS = {
    tool1: ["recordId", "savedAt", "id", "dob", "age", "gender", "zone", "setting", "date", "facilitator", "assessor"],
    tool2: ["recordId", "savedAt", "zone", "setting", "date", "facilitator", "assessor"]
  };

  let tokenClient = null;
  let headerCache = {}; // tool -> array of header strings currently on the sheet

  function getClientId() { return localStorage.getItem(LS_CLIENT_ID) || ""; }
  function getSheetId() { return localStorage.getItem(LS_SHEET_ID) || ""; }
  function setClientId(id) { localStorage.setItem(LS_CLIENT_ID, id.trim()); tokenClient = null; }
  function setSheetId(id) { localStorage.setItem(LS_SHEET_ID, id.trim()); headerCache = {}; }
  function clearConfig() {
    localStorage.removeItem(LS_CLIENT_ID);
    localStorage.removeItem(LS_SHEET_ID);
    sessionStorage.removeItem(SS_TOKEN);
    sessionStorage.removeItem(SS_GIVEN_NAME);
    tokenClient = null;
    headerCache = {};
  }

  function getStoredToken() {
    try {
      const raw = sessionStorage.getItem(SS_TOKEN);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed.token || Date.now() > parsed.expiresAt) return null;
      return parsed.token;
    } catch (e) { return null; }
  }

  function storeToken(token, expiresInSeconds) {
    sessionStorage.setItem(SS_TOKEN, JSON.stringify({
      token, expiresAt: Date.now() + (expiresInSeconds * 1000) - 30000
    }));
  }

  function isConfigured() { return !!getClientId() && !!getSheetId(); }
  function isConnected() { return isConfigured() && !!getStoredToken(); }

  function ensureTokenClient() {
    if (tokenClient) return tokenClient;
    if (!window.google || !google.accounts || !google.accounts.oauth2) {
      throw new Error("Google sign-in library hasn't loaded yet. Check your internet connection and reload.");
    }
    const clientId = getClientId();
    if (!clientId) throw new Error("No Google Client ID configured yet.");
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: () => {} // overridden per-call below
    });
    return tokenClient;
  }

  function connect(promptMode) {
    // promptMode: "" for silent/auto re-auth attempt, "consent" to force the picker
    return new Promise((resolve, reject) => {
      let client;
      try { client = ensureTokenClient(); } catch (e) { reject(e); return; }
      client.callback = (resp) => {
        if (resp.error) { reject(new Error(resp.error)); return; }
        storeToken(resp.access_token, resp.expires_in || 3500);
        fetchAndStoreGivenName(resp.access_token); // best-effort, never blocks the main sign-in
        resolve(resp.access_token);
      };
      client.requestAccessToken({ prompt: promptMode === undefined ? "" : promptMode });
    });
  }

  function disconnect() {
    const token = getStoredToken();
    sessionStorage.removeItem(SS_TOKEN);
    sessionStorage.removeItem(SS_GIVEN_NAME);
    if (token && window.google && google.accounts && google.accounts.oauth2) {
      try { google.accounts.oauth2.revoke(token, () => {}); } catch (e) { /* ignore */ }
    }
  }

  // Best-effort only — a missing first name just means the dashboard shows a
  // generic "Welcome back" instead of a personalized one. Never surfaces an
  // error, never blocks anything else in the app.
  async function fetchAndStoreGivenName(token) {
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const profile = await res.json();
      if (profile.given_name) sessionStorage.setItem(SS_GIVEN_NAME, profile.given_name);
    } catch (e) { /* ignore — purely a nice-to-have */ }
  }

  function getGivenName() {
    return sessionStorage.getItem(SS_GIVEN_NAME) || "";
  }

  async function ensureAccessToken() {
    let token = getStoredToken();
    if (token) return token;
    token = await connect("");     // try silent
    return token;
  }

  async function apiFetch(path, options = {}) {
    const token = await ensureAccessToken();
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${getSheetId()}${path}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Google Sheets API error (${res.status}): ${body.slice(0, 300)}`);
    }
    return res.status === 204 ? null : res.json();
  }

  function colLetter(index) {
    // 0-based index -> spreadsheet column letters (A, B, ..., Z, AA, ...)
    let n = index + 1, s = "";
    while (n > 0) {
      const rem = (n - 1) % 26;
      s = String.fromCharCode(65 + rem) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  function currentGoalAndCommentColumns(tool) {
    const sections = tool === "tool1" ? DB.tool1Sections.get() : DB.tool2Sections.get();
    const goals = [];
    const comments = [];
    for (const data of Object.values(sections)) {
      for (const g of data.goals) goals.push(g);
      if (data.comment_key && !comments.includes(data.comment_key)) comments.push(data.comment_key);
    }
    return { goals, comments };
  }

  async function listTabTitles() {
    const meta = await apiFetch("?fields=sheets.properties.title");
    return (meta.sheets || []).map(s => s.properties.title);
  }

  async function ensureTabExists(tool) {
    const title = SHEET_TITLES[tool];
    const titles = await listTabTitles();
    if (titles.includes(title)) return;
    await apiFetch(":batchUpdate", {
      method: "POST",
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] })
    });
  }

  async function ensureHeader(tool) {
    const title = SHEET_TITLES[tool];
    const { goals, comments } = currentGoalAndCommentColumns(tool);
    const desired = [...META_COLS[tool], ...goals, ...comments];

    const existing = await apiFetch(`/values/${encodeURIComponent(title)}!1:1`);
    let header = (existing.values && existing.values[0]) || [];

    if (header.length === 0) {
      header = desired;
      await apiFetch(`/values/${encodeURIComponent(title)}!A1?valueInputOption=RAW`, {
        method: "PUT",
        body: JSON.stringify({ values: [header] })
      });
    } else {
      const missing = desired.filter(c => !header.includes(c));
      if (missing.length) {
        const newHeader = [...header, ...missing];
        await apiFetch(`/values/${encodeURIComponent(title)}!A1?valueInputOption=RAW`, {
          method: "PUT",
          body: JSON.stringify({ values: [newHeader] })
        });
        header = newHeader;
      }
    }
    headerCache[tool] = header;
    return header;
  }

  async function getHeader(tool) {
    if (headerCache[tool]) return headerCache[tool];
    await ensureTabExists(tool);
    return ensureHeader(tool);
  }

  function rowFromRecord(tool, record, header) {
    const meta = record.meta || {};
    const scores = record.scores || {};
    const comments = record.comments || {};
    return header.map(col => {
      if (col === "recordId") return record.id || "";
      if (col === "savedAt") return record.savedAt || "";
      if (META_COLS[tool].includes(col)) return meta[col] ?? "";
      if (col in scores) return scores[col] ?? "";
      if (col in comments) return comments[col] ?? "";
      return "";
    });
  }

  function recordFromRow(tool, row, header) {
    const meta = {};
    const scores = {};
    const comments = {};
    const { goals, comments: commentKeys } = currentGoalAndCommentColumns(tool);
    let id = "", savedAt = "";
    header.forEach((col, i) => {
      const val = row[i] ?? "";
      if (col === "recordId") id = val;
      else if (col === "savedAt") savedAt = val;
      else if (META_COLS[tool].includes(col)) meta[col] = val;
      else if (goals.includes(col)) scores[col] = val;
      else if (commentKeys.includes(col)) comments[col] = val;
    });
    return { id, savedAt, meta, scores, comments };
  }

  async function pushRecord(tool, record) {
    if (!isConfigured()) return; // silently no-op if sync isn't set up
    const title = SHEET_TITLES[tool];
    const header = await getHeader(tool);
    const row = rowFromRecord(tool, record, header);
    await apiFetch(`/values/${encodeURIComponent(title)}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: "POST",
      body: JSON.stringify({ values: [row] })
    });
  }

  async function pullAll(tool) {
    const title = SHEET_TITLES[tool];
    const header = await getHeader(tool);
    const data = await apiFetch(`/values/${encodeURIComponent(title)}`);
    const rows = (data.values || []).slice(1); // drop header row
    const byId = new Map();
    for (const row of rows) {
      const rec = recordFromRow(tool, row, header);
      if (!rec.id) continue;
      const prev = byId.get(rec.id);
      if (!prev || (rec.savedAt || "") > (prev.savedAt || "")) byId.set(rec.id, rec);
    }
    return Array.from(byId.values());
  }

  function mergeIntoLocal(tool, remoteRecords) {
    const table = tool === "tool1" ? DB.tool1 : DB.tool2;
    let updated = 0;
    for (const remote of remoteRecords) {
      const local = table.get(remote.id);
      if (!local || (remote.savedAt || "") > (local.savedAt || "")) {
        table.save({ id: remote.id, meta: remote.meta, scores: remote.scores, comments: remote.comments, savedAt: remote.savedAt });
        updated++;
      }
    }
    return updated;
  }

  async function syncNow(tool) {
    const remote = await pullAll(tool);
    return mergeIntoLocal(tool, remote);
  }

  async function createNewSheet(title) {
    const token = await ensureAccessToken();
    const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { title: title || "PPAT Shared Data" } })
    });
    if (!res.ok) throw new Error("Could not create spreadsheet: " + (await res.text()).slice(0, 300));
    const json = await res.json();
    setSheetId(json.spreadsheetId);
    return json;
  }

  return {
    getClientId, getSheetId, setClientId, setSheetId, clearConfig,
    isConfigured, isConnected, connect, disconnect, getGivenName,
    pushRecord, pullAll, syncNow, createNewSheet
  };
})();

window.SheetsSync = SheetsSync;

/* org-setup.js — shareable "setup link" that seeds an org's dropdown Values
 * (Zone/Setting/Facilitator/Assessor) and Cloud Sync config into a fresh
 * device/browser in one click, instead of everyone typing lists by hand.
 *
 * Nothing in the payload is sensitive: the dropdown lists are just names, and
 * the Cloud Sync Client ID / Spreadsheet ID were already established as safe
 * to share openly (see CLOUD_SYNC_SETUP.md) — the real access control is each
 * person's own Google sign-in, not secrecy of these values.
 */

function b64EncodeUnicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
}

function b64DecodeUnicode(str) {
  return decodeURIComponent(atob(str).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
}

function buildOrgSetupPayloadFromCurrentDevice() {
  const payload = {
    values: DB.values.get(),
    sync: {
      clientId: (window.SheetsSync && SheetsSync.getClientId()) || "",
      sheetId: (window.SheetsSync && SheetsSync.getSheetId()) || ""
    }
  };
  // Already a one-way hash on this device (see db.js's auth object) — nothing to
  // hash here, and the plaintext password never exists in memory at this point.
  const currentAuth = DB.auth.get();
  if (currentAuth && currentAuth.username && currentAuth.passwordHash) {
    payload.auth = { username: currentAuth.username, passwordHash: currentAuth.passwordHash };
  }
  return payload;
}

function buildOrgSetupLink() {
  return encodeOrgSetupPayload(buildOrgSetupPayloadFromCurrentDevice());
}

function encodeOrgSetupPayload(payload) {
  const encoded = b64EncodeUnicode(JSON.stringify(payload));
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("setup", encoded);
  return url.toString();
}

// Parses a "Field,Value" CSV/Sheet export: repeat the field name on multiple rows
// for list-type fields (Zone/Setting/Facilitator/Assessor), one row for singular
// fields (ClientID/SheetID/AdminUsername/AdminPassword). Unrecognized field labels
// are silently ignored, so extra notes/columns in someone's working sheet are harmless.
function parseOrgSetupCSVRows(rows) {
  const values = { Zone: [], Setting: [], Facilitator: [], Assessor: [] };
  const single = {};
  for (const row of rows) {
    if (!row.length) continue;
    const rawField = (row[0] || "").trim();
    const value = (row[1] || "").trim();
    if (!rawField || !value) continue;
    const key = rawField.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (key === "zone" || key === "zones") values.Zone.push(value);
    else if (key === "setting" || key === "settings") values.Setting.push(value);
    else if (key === "facilitator" || key === "facilitators") values.Facilitator.push(value);
    else if (key === "assessor" || key === "assessors") values.Assessor.push(value);
    else if (key === "clientid") single.clientId = value;
    else if (key === "sheetid" || key === "spreadsheetid") single.sheetId = value;
    else if (key === "adminusername" || key === "username") single.adminUsername = value;
    else if (key === "adminpassword" || key === "password") single.adminPassword = value;
    else if (key === "adminpasswordhash" || key === "passwordhash") single.adminPasswordHash = value;
  }
  return { values, single };
}

// Hashes the CSV-supplied password before it ever becomes part of a shareable link —
// the link only ever carries the same one-way hash the login screen already uses,
// never the plaintext password itself.
async function buildOrgSetupPayloadFromCSVRows(rows) {
  const { values, single } = parseOrgSetupCSVRows(rows);
  const payload = { values };
  if (single.clientId || single.sheetId) {
    payload.sync = { clientId: single.clientId || "", sheetId: single.sheetId || "" };
  }
  if (single.adminUsername && single.adminPasswordHash) {
    // Already a one-way hash — e.g. from an exported-current-device CSV. Used as-is,
    // never re-hashed (hashing a hash would silently produce the wrong credentials).
    payload.auth = { username: single.adminUsername, passwordHash: single.adminPasswordHash };
  } else if (single.adminUsername && single.adminPassword) {
    payload.auth = { username: single.adminUsername, passwordHash: await DB.sha256(single.adminPassword) };
  }
  return payload;
}

function summarizeOrgSetupPayload(payload) {
  const v = payload.values || {};
  const parts = [
    `${(v.Zone || []).length} Zone(s)`,
    `${(v.Setting || []).length} Setting(s)`,
    `${(v.Facilitator || []).length} Facilitator(s)`,
    `${(v.Assessor || []).length} Assessor(s)`,
    (payload.sync && (payload.sync.clientId || payload.sync.sheetId)) ? "Cloud Sync: included" : "Cloud Sync: not included",
    payload.auth ? "Admin login: included" : "Admin login: not included"
  ];
  return parts.join(" \u00b7 ");
}

const ORG_SETUP_CSV_TEMPLATE = `Field,Value
Zone,Example Zone 1
Zone,Example Zone 2
Setting,Example Setting 1
Setting,Example Setting 2
Facilitator,Example Facilitator Name
Assessor,Example Assessor Name
ClientID,paste-your-google-oauth-client-id-here
SheetID,paste-your-google-sheet-id-here
AdminUsername,orgadmin
AdminPassword,ChooseAStrongPassword123
`;

// Exports this device's real current setup as the same Field,Value CSV format Option
// B imports — lets someone bulk-add more Zones/Settings/etc. in a spreadsheet rather
// than starting from the blank template. The password is exported as its existing
// hash (AdminPasswordHash), never a readable password, since the real password was
// never stored anywhere to begin with — only ever its one-way hash.
function buildOrgSetupCSVFromCurrentDevice() {
  const values = DB.values.get();
  const rows = [["Field", "Value"]];
  (values.Zone || []).forEach(v => rows.push(["Zone", v]));
  (values.Setting || []).forEach(v => rows.push(["Setting", v]));
  (values.Facilitator || []).forEach(v => rows.push(["Facilitator", v]));
  (values.Assessor || []).forEach(v => rows.push(["Assessor", v]));
  const clientId = (window.SheetsSync && SheetsSync.getClientId()) || "";
  const sheetId = (window.SheetsSync && SheetsSync.getSheetId()) || "";
  if (clientId) rows.push(["ClientID", clientId]);
  if (sheetId) rows.push(["SheetID", sheetId]);
  const currentAuth = DB.auth.get();
  if (currentAuth && currentAuth.username) rows.push(["AdminUsername", currentAuth.username]);
  if (currentAuth && currentAuth.passwordHash) rows.push(["AdminPasswordHash", currentAuth.passwordHash]);
  return DB.toCSVRows(rows);
}

// Returns true if a setup link was found and applied, so app.js can show a toast.
function applyOrgSetupLinkIfPresent() {
  const params = new URLSearchParams(location.search);
  const encoded = params.get("setup");
  if (!encoded) return false;
  try {
    const payload = JSON.parse(b64DecodeUnicode(encoded));
    if (payload.values) DB.values.set(payload.values);
    if (payload.sync && window.SheetsSync) {
      if (payload.sync.clientId) SheetsSync.setClientId(payload.sync.clientId);
      if (payload.sync.sheetId) SheetsSync.setSheetId(payload.sync.sheetId);
    }
    if (payload.auth && payload.auth.username && payload.auth.passwordHash) {
      DB.auth.setCredentialsHashed(payload.auth.username, payload.auth.passwordHash);
    }
    // Tidy the setup param out of the visible address bar afterward — the app
    // has already absorbed it into local storage, no need to keep showing it.
    params.delete("setup");
    const clean = location.pathname + (params.toString() ? "?" + params.toString() : "") + location.hash;
    history.replaceState({}, "", clean);
    return true;
  } catch (e) {
    console.error("Could not apply setup link", e);
    return false;
  }
}

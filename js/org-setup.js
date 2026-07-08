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

function buildOrgSetupLink() {
  const payload = {
    values: DB.values.get(),
    sync: {
      clientId: (window.SheetsSync && SheetsSync.getClientId()) || "",
      sheetId: (window.SheetsSync && SheetsSync.getSheetId()) || ""
    }
  };
  const encoded = b64EncodeUnicode(JSON.stringify(payload));
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("setup", encoded);
  return url.toString();
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

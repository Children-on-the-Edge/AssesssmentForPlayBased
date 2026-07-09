/* db.js — local storage layer.
 * All app data lives in the browser's localStorage on this device.
 * Use Settings > Backup to export everything as one JSON file (to move
 * data to another device), or use per-record CSV export/import for
 * compatibility with the original desktop tool's CSV files.
 */

const DB = (() => {
  const KEYS = {
    tool1: "pp_tool1_assessments",
    tool2: "pp_tool2_assessments",
    values: "pp_values",
    tool1sections: "pp_tool1_sections",
    tool2sections: "pp_tool2_sections",
    auth: "pp_auth",
    meta: "pp_meta"
  };

  function _get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.error("DB read error", key, e);
      return fallback;
    }
  }

  function _set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async function sha256(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // ── Backup encryption (PBKDF2 + AES-GCM) ────────────────────────────
  // Same scheme/field names as the original desktop tool's encrypted backups
  // (salt/iv/ciphertext, SHA-256, 150k iterations), so old backup files this
  // app has ever produced stay restorable.
  const PBKDF2_ITERATIONS = 150000;

  function bytesToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }
  function base64ToBytes(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  function randomBytes(n) {
    const a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return a;
  }
  async function deriveAesKey(password, saltBytes) {
    const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }
  async function encryptJSON(password, obj) {
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const key = await deriveAesKey(password, salt);
    const plaintext = new TextEncoder().encode(JSON.stringify(obj));
    const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
    return { salt: bytesToBase64(salt), iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(cipherBuf)) };
  }
  async function decryptJSON(password, encObj) {
    const salt = base64ToBytes(encObj.salt);
    const iv = base64ToBytes(encObj.iv);
    const ciphertext = base64ToBytes(encObj.ciphertext);
    const key = await deriveAesKey(password, salt);
    const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(plainBuf));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  async function init() {
    if (_get(KEYS.values, null) === null) _set(KEYS.values, DEFAULT_VALUES);
    if (_get(KEYS.tool1sections, null) === null) _set(KEYS.tool1sections, DEFAULT_TOOL1_SECTIONS);
    if (_get(KEYS.tool2sections, null) === null) _set(KEYS.tool2sections, DEFAULT_TOOL2_SECTIONS);
    if (_get(KEYS.tool1, null) === null) _set(KEYS.tool1, []);
    if (_get(KEYS.tool2, null) === null) _set(KEYS.tool2, []);
    if (_get(KEYS.auth, null) === null) {
      _set(KEYS.auth, {
        username: DEFAULT_ADMIN_USERNAME,
        passwordHash: await sha256(DEFAULT_ADMIN_PASSWORD)
      });
    }
  }

  // ── Generic getters/setters ────────────────────────────────────────
  const values = {
    get: () => _get(KEYS.values, DEFAULT_VALUES),
    set: (v) => _set(KEYS.values, v)
  };
  const tool1Sections = {
    get: () => _get(KEYS.tool1sections, DEFAULT_TOOL1_SECTIONS),
    set: (v) => _set(KEYS.tool1sections, v)
  };
  const tool2Sections = {
    get: () => _get(KEYS.tool2sections, DEFAULT_TOOL2_SECTIONS),
    set: (v) => _set(KEYS.tool2sections, v)
  };

  // ── Assessments ─────────────────────────────────────────────────────
  const tool1 = {
    all: () => _get(KEYS.tool1, []),
    save(record) {
      const list = tool1.all();
      record.id = record.id || uid();
      record.savedAt = record.savedAt || new Date().toISOString();
      const idx = list.findIndex(r => r.id === record.id);
      if (idx >= 0) list[idx] = record; else list.push(record);
      _set(KEYS.tool1, list);
      return record;
    },
    remove(id) {
      _set(KEYS.tool1, tool1.all().filter(r => r.id !== id));
    },
    get(id) {
      return tool1.all().find(r => r.id === id) || null;
    }
  };

  const tool2 = {
    all: () => _get(KEYS.tool2, []),
    save(record) {
      const list = tool2.all();
      record.id = record.id || uid();
      record.savedAt = record.savedAt || new Date().toISOString();
      const idx = list.findIndex(r => r.id === record.id);
      if (idx >= 0) list[idx] = record; else list.push(record);
      _set(KEYS.tool2, list);
      return record;
    },
    remove(id) {
      _set(KEYS.tool2, tool2.all().filter(r => r.id !== id));
    },
    get(id) {
      return tool2.all().find(r => r.id === id) || null;
    }
  };

  // ── Auth ──────────────────────────────────────────────────────────
  const auth = {
    get: () => _get(KEYS.auth, null),
    async check(username, password) {
      const a = auth.get();
      if (!a) return false;
      const hash = await sha256(password);
      return a.username === username.trim() && a.passwordHash === hash;
    },
    async checkPasswordOnly(password) {
      const a = auth.get();
      if (!a) return false;
      const hash = await sha256(password);
      return a.passwordHash === hash;
    },
    async setCredentials(username, password) {
      _set(KEYS.auth, { username: username.trim(), passwordHash: await sha256(password) });
    }
  };

  // ── CSV helpers (compatible with the original desktop CSV layout) ──
  function csvEscape(v) {
    v = String(v ?? "");
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  }

  function toCSVRows(rows) {
    return rows.map(r => r.map(csvEscape).join(",")).join("\r\n");
  }

  function parseCSV(text) {
    // Minimal RFC4180 parser (handles quoted fields, commas, newlines)
    const rows = [];
    let row = [], field = "", i = 0, inQuotes = false;
    text = text.replace(/^\uFEFF/, "");
    while (i < text.length) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += c; i++; continue;
      } else {
        if (c === '"') { inQuotes = true; i++; continue; }
        if (c === ',') { row.push(field); field = ""; i++; continue; }
        if (c === '\r') { i++; continue; }
        if (c === '\n') { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
        field += c; i++; continue;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => !(r.length === 1 && r[0] === ""));
  }

  function tool1ToCSVRows(rec) {
    const rows = [
      ["ID", rec.meta.id || ""],
      ["Date of Birth", rec.meta.dob || ""],
      ["Age", rec.meta.age || ""],
      ["Gender", rec.meta.gender || ""],
      ["Zone", rec.meta.zone || ""],
      ["Setting", rec.meta.setting || ""],
      ["Date of Assessment", rec.meta.date || ""],
      ["Facilitator", rec.meta.facilitator || ""],
      ["Assessor", rec.meta.assessor || ""],
      [],
      ["Goal", "Score"]
    ];
    for (const [goal, score] of Object.entries(rec.scores || {})) {
      rows.push([goal, score || "\u2014"]);
    }
    rows.push([]);
    rows.push(["Comments"]);
    for (const [key, text] of Object.entries(rec.comments || {})) {
      if (text) rows.push([key, text]);
    }
    return rows;
  }

  // Parses CSV rows where each data column after the label column is a separate
  // record (so a 1-column file behaves exactly like the old single-record parser,
  // and a many-column bulk-import file — e.g. one column per child — produces one
  // record per column instead of silently reading only the first).
  function parseMultiCSVRows(rows, metaMap) {
    let n = 0;
    for (const row of rows) if (row.length - 1 > n) n = row.length - 1;
    if (n < 1) n = 1;
    const records = Array.from({ length: n }, () => ({ meta: {}, scores: {}, comments: {} }));
    let section = "meta";
    for (const row of rows) {
      if (row.length === 0 || (row.length === 1 && row[0] === "")) continue;
      const first = (row[0] || "").trim();
      if (first === "Goal") { section = "goals"; continue; }
      if (first === "Comments") { section = "comments"; continue; }
      if (section === "meta" && metaMap[first]) {
        for (let c = 0; c < n; c++) records[c].meta[metaMap[first]] = row[c + 1] || "";
        continue;
      }
      if (section === "goals" && row.length >= 2) {
        for (let c = 0; c < n; c++) {
          const v = row[c + 1];
          records[c].scores[first] = (v === undefined || v === "\u2014") ? "" : v;
        }
        continue;
      }
      if (section === "comments" && row.length >= 2) {
        for (let c = 0; c < n; c++) records[c].comments[first] = row[c + 1] || "";
        continue;
      }
    }
    return records;
  }

  function tool1FromCSVRows(rows) {
    const metaMap = {
      ID: "id", "Date of Birth": "dob", Age: "age", Gender: "gender",
      Zone: "zone", Setting: "setting", "Date of Assessment": "date",
      Facilitator: "facilitator", Assessor: "assessor"
    };
    // Note: "Name" is deliberately not read from CSVs — child names are never stored.
    return parseMultiCSVRows(rows, metaMap); // always an array — 1 entry for a single-record file
  }

  function tool2ToCSVRows(rec) {
    const rows = [
      ["Zone", rec.meta.zone || ""],
      ["Setting", rec.meta.setting || ""],
      ["Date of Assessment", rec.meta.date || ""],
      ["Facilitator", rec.meta.facilitator || ""],
      ["Assessor", rec.meta.assessor || ""],
      [],
      ["Goal", "Score"]
    ];
    for (const [goal, score] of Object.entries(rec.scores || {})) {
      rows.push([goal, score || "\u2014"]);
    }
    rows.push([]);
    rows.push(["Comments"]);
    for (const [key, text] of Object.entries(rec.comments || {})) {
      if (text) rows.push([key, text]);
    }
    return rows;
  }

  function tool2FromCSVRows(rows) {
    const metaMap = { Zone: "zone", Setting: "setting", "Date of Assessment": "date", Facilitator: "facilitator", Assessor: "assessor" };
    return parseMultiCSVRows(rows, metaMap); // always an array — 1 entry for a single-record file
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  async function backupAll(password) {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: "PPAT",
      version: 1,
      tool1: tool1.all(),
      tool2: tool2.all(),
      values: values.get(),
      tool1sections: tool1Sections.get(),
      tool2sections: tool2Sections.get()
    };
    const encrypted = await encryptJSON(password, payload);
    const blob = new Blob([JSON.stringify(encrypted, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ppat_backup_${new Date().toISOString().slice(0, 10)}_encrypted.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function restoreAll(payload, mode) {
    // mode: "replace" or "merge"
    if (mode === "replace") {
      _set(KEYS.tool1, payload.tool1 || []);
      _set(KEYS.tool2, payload.tool2 || []);
    } else {
      const t1 = tool1.all(), t2 = tool2.all();
      const t1ids = new Set(t1.map(r => r.id));
      const t2ids = new Set(t2.map(r => r.id));
      for (const r of (payload.tool1 || [])) if (!t1ids.has(r.id)) t1.push(r);
      for (const r of (payload.tool2 || [])) if (!t2ids.has(r.id)) t2.push(r);
      _set(KEYS.tool1, t1);
      _set(KEYS.tool2, t2);
    }
    if (payload.values) values.set(payload.values);
    if (payload.tool1sections) tool1Sections.set(payload.tool1sections);
    if (payload.tool2sections) tool2Sections.set(payload.tool2sections);
  }

  // Reads a backup file's raw text, transparently decrypting it if it's the
  // encrypted {salt,iv,ciphertext} format, or treating it as a legacy plain
  // JSON backup (from before encryption was added) otherwise. Throws if the
  // password is wrong or the file is corrupted/unrecognized.
  async function restoreFromFile(text, mode, password) {
    const raw = JSON.parse(text);
    const payload = (raw && raw.salt && raw.iv && raw.ciphertext)
      ? await decryptJSON(password, raw)
      : raw;
    restoreAll(payload, mode);
    return payload;
  }

  return {
    init, values, tool1Sections, tool2Sections, tool1, tool2, auth,
    parseCSV, toCSVRows, tool1ToCSVRows, tool1FromCSVRows, tool2ToCSVRows, tool2FromCSVRows,
    downloadText, backupAll, restoreAll, restoreFromFile, uid
  };
})();

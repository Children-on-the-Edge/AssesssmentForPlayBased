/* view-settings.js */

function renderSettings() {
  const main = document.getElementById("main");
  const state = { tab: "values" };

  function draw() {
    main.innerHTML = `
      <div class="tool-header">
        <div class="left"><button class="back-btn" id="st-back">Back</button><h2>Settings</h2></div>
      </div>
      <div class="settings-tabs">
        <button class="settings-tab" data-tab="values">Dropdown Values</button>
        <button class="settings-tab" data-tab="tool1sections">Tool 1 Sections</button>
        <button class="settings-tab" data-tab="tool2sections">Tool 2 Sections</button>
        <button class="settings-tab" data-tab="backup">Backup &amp; Restore</button>
        <button class="settings-tab" data-tab="security">Security</button>
      </div>
      <div class="settings-body" id="st-body"></div>
    `;
    document.getElementById("st-back").onclick = () => window.App.navigate("dashboard");
    main.querySelectorAll(".settings-tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === state.tab);
      btn.addEventListener("click", () => { state.tab = btn.dataset.tab; draw(); });
    });
    const body = document.getElementById("st-body");
    if (state.tab === "values") drawValuesTab(body);
    else if (state.tab === "tool1sections") drawSectionsTab(body, "tool1");
    else if (state.tab === "tool2sections") drawSectionsTab(body, "tool2");
    else if (state.tab === "backup") drawBackupTab(body);
    else if (state.tab === "security") drawSecurityTab(body);
  }

  function drawValuesTab(body) {
    const data = DB.values.get();
    const cols = ["Setting", "Zone", "Facilitator", "Assessor"];
    body.innerHTML = `
      <div class="values-columns">
        ${cols.map(col => `
          <div class="value-col" data-col="${col}">
            <div class="vc-header">${col}</div>
            <div class="vc-rows">
              ${(data[col] || []).map(v => rowHtml(v)).join("")}
            </div>
            <button class="small-btn btn-outline" data-add="${col}" style="width:100%;margin-top:4px">+ Add</button>
          </div>
        `).join("")}
      </div>
      <button class="btn btn-green" id="values-save" style="margin-top:16px">Save</button>
    `;
    function rowHtml(v) {
      return `<div class="value-row"><input value="${esc(v)}" /><button class="icon-btn-del">X</button></div>`;
    }
    body.querySelectorAll("[data-add]").forEach(btn => {
      btn.addEventListener("click", () => {
        const colDiv = body.querySelector(`.value-col[data-col="${btn.dataset.add}"] .vc-rows`);
        colDiv.insertAdjacentHTML("beforeend", rowHtml(""));
        wireDelButtons();
      });
    });
    function wireDelButtons() {
      body.querySelectorAll(".value-row .icon-btn-del").forEach(b => {
        b.onclick = () => b.closest(".value-row").remove();
      });
    }
    wireDelButtons();
    document.getElementById("values-save").onclick = () => {
      const newData = {};
      cols.forEach(col => {
        newData[col] = Array.from(body.querySelectorAll(`.value-col[data-col="${col}"] .value-row input`))
          .map(i => i.value.trim()).filter(Boolean);
      });
      DB.values.set(newData);
      toast("Dropdown values saved.", "success");
    };

    body.insertAdjacentHTML("beforeend", `
      <div class="score-card" style="max-width:640px;margin-top:16px">
        <div class="sc-title">Share this setup with other devices</div>
        <div class="sc-body">Generates a link that pre-fills these dropdown lists (and this device's Cloud Sync Client ID / Spreadsheet ID, if connected) on any device that opens it \u2014 useful for rolling this app out to a whole organization without everyone typing lists by hand. Save your changes above first so the link reflects them.</div>
        <button class="btn btn-outline" id="gen-setup-link" style="margin-top:10px">Generate Setup Link</button>
        <div id="setup-link-wrap" style="display:none;margin-top:10px">
          <input id="setup-link-output" readonly style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:7px 9px;font-size:11px" />
          <button class="btn btn-outline" id="copy-setup-link" style="margin-top:8px">Copy Link</button>
        </div>
      </div>
    `);
    document.getElementById("gen-setup-link").onclick = () => {
      const link = buildOrgSetupLink();
      document.getElementById("setup-link-output").value = link;
      document.getElementById("setup-link-wrap").style.display = "block";
    };
    document.getElementById("copy-setup-link")?.addEventListener("click", async () => {
      const input = document.getElementById("setup-link-output");
      input.select();
      try {
        await navigator.clipboard.writeText(input.value);
        toast("Link copied.", "success");
      } catch (e) {
        toast("Couldn't copy automatically \u2014 the link is selected, copy it manually.", "error");
      }
    });
  }

  function drawSectionsTab(body, tool) {
    const getFn = tool === "tool1" ? DB.tool1Sections.get : DB.tool2Sections.get;
    const setFn = tool === "tool1" ? DB.tool1Sections.set : DB.tool2Sections.set;
    const sections = getFn();
    let list = Object.entries(sections).map(([title, d]) => ({ title, comment_key: d.comment_key, goals: [...d.goals] }));

    function renderList() {
      body.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:10px">
          <button class="small-btn btn-outline" id="sec-add">+ New Section</button>
          <button class="small-btn btn-green" id="sec-save">Save All</button>
        </div>
        <div id="sec-list"></div>
      `;
      const listEl = document.getElementById("sec-list");
      listEl.innerHTML = list.map((sec, si) => `
        <div class="section-editor" data-si="${si}">
          <div class="se-title-row">
            <input class="sec-title-input" value="${esc(sec.title)}" />
            <button class="small-btn icon-btn-del" data-del-sec="${si}">Delete</button>
          </div>
          <div style="font-size:11px;color:var(--text-mid);margin-bottom:6px">Comment label:
            <input class="sec-ckey-input" value="${esc(sec.comment_key)}" style="width:280px;border:1px solid #d1d5db;border-radius:6px;padding:3px 6px" />
          </div>
          ${sec.goals.map((g, gi) => `
            <div class="goal-editor-row">
              <input class="goal-input" data-gi="${gi}" value="${esc(g)}" />
              <button class="small-btn icon-btn-del" data-del-goal="${gi}">X</button>
            </div>
          `).join("")}
          <button class="small-btn btn-outline" data-add-goal>+ Add Goal</button>
        </div>
      `).join("");

      listEl.querySelectorAll(".section-editor").forEach(secEl => {
        const si = parseInt(secEl.dataset.si, 10);
        secEl.querySelector("[data-add-goal]").onclick = () => { list[si].goals.push(""); renderList(); };
        secEl.querySelectorAll("[data-del-goal]").forEach(b => {
          b.onclick = () => { list[si].goals.splice(parseInt(b.dataset.delGoal, 10), 1); renderList(); };
        });
        const delSecBtn = secEl.querySelector("[data-del-sec]");
        if (delSecBtn) delSecBtn.onclick = async () => {
          const ok = await confirmDialog(`Delete section "${list[si].title}" and all its goals?`, "Delete Section");
          if (ok) { list.splice(si, 1); renderList(); }
        };
      });

      document.getElementById("sec-add").onclick = () => { list.push({ title: "New Section", comment_key: "Additional Comments", goals: [] }); renderList(); };
      document.getElementById("sec-save").onclick = () => {
        listEl.querySelectorAll(".section-editor").forEach(secEl => {
          const si = parseInt(secEl.dataset.si, 10);
          list[si].title = secEl.querySelector(".sec-title-input").value.trim() || list[si].title;
          list[si].comment_key = secEl.querySelector(".sec-ckey-input").value.trim() || list[si].comment_key;
          secEl.querySelectorAll(".goal-input").forEach((inp, gi) => { list[si].goals[gi] = inp.value; });
        });
        const out = {};
        for (const sec of list) {
          out[sec.title] = { comment_key: sec.comment_key, goals: sec.goals.filter(g => g.trim()) };
        }
        setFn(out);
        toast((tool === "tool1" ? "Tool 1" : "Tool 2") + " sections saved.", "success");
      };
    }
    renderList();
  }

  function drawBackupTab(body) {
    body.innerHTML = `
      <div class="score-card" style="max-width:520px">
        <div class="sc-title">Backup all data</div>
        <div class="sc-body">Download every assessment, dropdown value, and section definition on this device as one JSON file.</div>
        <button class="btn btn-primary" id="backup-btn" style="margin-top:10px">Download Backup</button>
      </div>
      <div class="score-card" style="max-width:520px;margin-top:12px">
        <div class="sc-title">Restore from backup</div>
        <div class="sc-body">Load a previously exported JSON backup file into this device.</div>
        <div style="margin-top:10px;display:flex;gap:8px;align-items:center">
          <input type="file" id="restore-file" accept="application/json" />
        </div>
        <div style="margin-top:10px;display:flex;gap:8px">
          <button class="btn btn-outline" id="restore-merge">Merge into existing data</button>
          <button class="btn btn-grey" id="restore-replace">Replace all data</button>
        </div>
      </div>
    `;
    document.getElementById("backup-btn").onclick = () => { DB.backupAll(); toast("Backup downloaded.", "success"); };
    async function doRestore(mode) {
      const fileEl = document.getElementById("restore-file");
      const file = fileEl.files[0];
      if (!file) { toast("Choose a backup file first.", "error"); return; }
      if (mode === "replace") {
        const ok = await confirmDialog("This will replace ALL assessments on this device with the backup contents. Continue?", "Replace All Data");
        if (!ok) return;
      }
      try {
        const text = await file.text();
        const payload = JSON.parse(text);
        DB.restoreAll(payload, mode);
        toast("Backup restored.", "success");
        renderZonePanel();
      } catch (e) {
        toast("Could not read that backup file.", "error");
      }
    }
    document.getElementById("restore-merge").onclick = () => doRestore("merge");
    document.getElementById("restore-replace").onclick = () => doRestore("replace");
  }

  function drawSecurityTab(body) {
    const a = DB.auth.get();
    body.innerHTML = `
      <div class="score-card" style="max-width:420px">
        <div class="sc-title">Settings login</div>
        <div class="sc-body">Change the username and password required to open Settings.</div>
        <label style="font-size:12px;font-weight:700;color:var(--text-mid);display:block;margin:10px 0 3px">Username</label>
        <input id="sec-username" value="${esc(a ? a.username : "")}" style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:7px 9px" />
        <label style="font-size:12px;font-weight:700;color:var(--text-mid);display:block;margin:10px 0 3px">New Password</label>
        <input id="sec-password" type="password" placeholder="Leave blank to keep current password" style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:7px 9px" />
        <button class="btn btn-primary" id="sec-save" style="margin-top:12px">Save Credentials</button>
      </div>
    `;
    document.getElementById("sec-save").onclick = async () => {
      const username = document.getElementById("sec-username").value.trim();
      const password = document.getElementById("sec-password").value;
      if (!username) { toast("Username can't be empty.", "error"); return; }
      if (password) {
        await DB.auth.setCredentials(username, password);
      } else {
        const current = DB.auth.get();
        const raw = JSON.parse(localStorage.getItem("pp_auth"));
        raw.username = username;
        raw.passwordHash = current.passwordHash;
        localStorage.setItem("pp_auth", JSON.stringify(raw));
      }
      toast("Credentials updated.", "success");
    };
  }

  draw();
}

// ── Cloud Sync — standalone page, no admin login required ────────────
// Deliberately separate from renderSettings(): the Client ID and Spreadsheet ID
// aren't secrets (see CLOUD_SYNC_SETUP.md), and the real access control is each
// person's own Google sign-in plus the shared Sheet's own sharing permissions —
// not the app's admin password. Gating this behind Settings would just force
// every facilitator to know the admin credentials for no real security benefit.
function renderCloudSyncPage() {
  const main = document.getElementById("main");

  // Best-effort guess at "https://github.com/<org>/<repo>/blob/main/CLOUD_SYNC_SETUP.md"
  // from the current GitHub Pages URL, so this link works for any org/repo that
  // deploys this app, not just the one it was originally built for.
  function guessSetupGuideUrl() {
    try {
      const host = location.hostname; // e.g. "children-on-the-edge.github.io"
      const org = host.split(".github.io")[0];
      const repo = location.pathname.split("/").filter(Boolean)[0]; // first path segment
      if (host.endsWith(".github.io") && org && repo) {
        return `https://github.com/${org}/${repo}/blob/main/CLOUD_SYNC_SETUP.md`;
      }
    } catch (e) { /* fall through */ }
    return null;
  }

  function draw() {
    const clientId = SheetsSync.getClientId();
    const sheetId = SheetsSync.getSheetId();
    const connected = SheetsSync.isConnected();
    const isHttps = location.protocol === "https:";
    const guideUrl = guessSetupGuideUrl();

    main.innerHTML = `
      <div class="tool-header">
        <div class="left"><button class="back-btn" id="cs-back">Back</button><h2>Cloud Sync</h2></div>
        ${guideUrl ? `<a href="${esc(guideUrl)}" target="_blank" rel="noopener" style="color:#93c5fd;font-size:12px;text-decoration:underline">\uD83D\uDCD6 Full setup guide &amp; how this works</a>` : ""}
      </div>
      <div class="settings-body">
        <div class="score-card" style="max-width:600px;background:#f8fafc">
          <div class="sc-body">Cloud Sync lets multiple facilitators share assessments across devices via a Google Sheet acting as a shared ledger \u2014 fully optional, and local Backup/Restore and CSV export still work without it. ${guideUrl ? `See the <a href="${esc(guideUrl)}" target="_blank" rel="noopener">full setup guide</a> for the complete walkthrough and the reasoning behind it.` : ""}</div>
        </div>
        ${!isHttps ? `
          <div class="score-card" style="max-width:600px;border-color:#f59e0b">
            <div class="sc-title" style="color:#92400e">This page isn't served over https</div>
            <div class="sc-body">Google sign-in only works when this app is opened from a real https:// address (e.g. your GitHub Pages URL), not a local file. Cloud Sync won't be able to connect from here.</div>
          </div>
        ` : ""}
        <div class="score-card" style="max-width:600px">
          <div class="sc-title">1. Google Client ID</div>
          <div class="sc-body">The OAuth Client ID for this organization (ask whoever set up Cloud Sync if you don't have it). This is not secret and is safe to store here.</div>
          <input id="cs-client-id" value="${esc(clientId)}" placeholder="xxxxxxxxxx.apps.googleusercontent.com" style="width:100%;margin-top:8px;border:1px solid #d1d5db;border-radius:8px;padding:7px 9px" />
          <button class="btn btn-outline" id="cs-save-client" style="margin-top:8px">Save Client ID</button>
        </div>

        <div class="score-card" style="max-width:600px;margin-top:12px">
          <div class="sc-title">2. Shared Spreadsheet</div>
          <div class="sc-body">Paste the ID from the shared Google Sheet's URL (the long string between <code>/d/</code> and <code>/edit</code>), or connect and create a new one.</div>
          <input id="cs-sheet-id" value="${esc(sheetId)}" placeholder="Spreadsheet ID" style="width:100%;margin-top:8px;border:1px solid #d1d5db;border-radius:8px;padding:7px 9px" />
          <div style="display:flex;gap:8px;margin-top:8px">
            <button class="btn btn-outline" id="cs-save-sheet">Save Spreadsheet ID</button>
            <button class="btn btn-outline" id="cs-create-sheet" ${clientId ? "" : "disabled"}>Connect &amp; Create New Sheet</button>
          </div>
        </div>

        <div class="score-card" style="max-width:600px;margin-top:12px">
          <div class="sc-title">3. Connection</div>
          <div class="sc-body">Status: <strong style="color:${connected ? "var(--green)" : "var(--text-light)"}">${connected ? "Connected" : "Not connected"}</strong></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
            <button class="btn btn-primary" id="cs-connect" ${clientId && sheetId ? "" : "disabled"}>Connect to Google</button>
            <button class="btn btn-outline" id="cs-pull-t1" ${clientId && sheetId ? "" : "disabled"}>Pull Latest (Tool 1)</button>
            <button class="btn btn-outline" id="cs-pull-t2" ${clientId && sheetId ? "" : "disabled"}>Pull Latest (Tool 2)</button>
            <button class="btn btn-grey" id="cs-disconnect">Disconnect</button>
          </div>
          <div id="cs-status" style="margin-top:8px;font-size:12px;color:var(--text-mid)"></div>
        </div>
      </div>
    `;

    document.getElementById("cs-back").onclick = () => window.App.navigate("dashboard");

    document.getElementById("cs-save-client").onclick = () => {
      SheetsSync.setClientId(document.getElementById("cs-client-id").value);
      toast("Client ID saved.", "success");
      draw();
    };
    document.getElementById("cs-save-sheet").onclick = () => {
      SheetsSync.setSheetId(document.getElementById("cs-sheet-id").value);
      toast("Spreadsheet ID saved.", "success");
      draw();
    };
    document.getElementById("cs-create-sheet").onclick = async () => {
      const status = document.getElementById("cs-status");
      status.textContent = "Connecting to Google\u2026";
      try {
        await SheetsSync.createNewSheet("PPAT Shared Data");
        status.textContent = "New spreadsheet created and linked.";
        toast("New shared spreadsheet created.", "success");
        draw();
      } catch (e) {
        status.textContent = "Error: " + e.message;
      }
    };
    document.getElementById("cs-connect").onclick = async () => {
      const status = document.getElementById("cs-status");
      status.textContent = "Opening Google sign-in\u2026";
      try {
        await SheetsSync.connect("consent");
        status.textContent = "Connected.";
        toast("Connected to Google.", "success");
        draw();
      } catch (e) {
        status.textContent = "Error: " + e.message;
      }
    };
    document.getElementById("cs-disconnect").onclick = () => {
      SheetsSync.disconnect();
      toast("Disconnected.");
      draw();
    };
    async function pull(tool, label) {
      const status = document.getElementById("cs-status");
      status.textContent = `Pulling latest ${label} records\u2026`;
      try {
        const n = await SheetsSync.syncNow(tool);
        status.textContent = `Done. ${n} record(s) updated from the shared sheet.`;
        toast(`${label}: pulled ${n} updated record(s).`, "success");
        renderZonePanel();
      } catch (e) {
        status.textContent = "Error: " + e.message;
      }
    }
    document.getElementById("cs-pull-t1").onclick = () => pull("tool1", "Tool 1");
    document.getElementById("cs-pull-t2").onclick = () => pull("tool2", "Tool 2");
  }

  draw();
}

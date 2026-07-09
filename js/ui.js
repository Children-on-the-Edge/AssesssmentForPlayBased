/* ui.js — shared UI helpers: toasts, modals, sidebar, zone panel. */

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function toast(message, type = "") {
  const stack = document.getElementById("toast-stack");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 300); }, 3200);
}

function confirmDialog(message, title = "Please confirm") {
  return new Promise((resolve) => {
    const root = document.getElementById("modal-root");
    root.innerHTML = `
      <div class="overlay">
        <div class="confirm-card">
          <h3>${esc(title)}</h3>
          <p>${esc(message)}</p>
          <div class="modal-actions">
            <button class="btn btn-outline" id="cf-cancel">Cancel</button>
            <button class="btn btn-primary" id="cf-ok">OK</button>
          </div>
        </div>
      </div>`;
    root.querySelector("#cf-cancel").onclick = () => { root.innerHTML = ""; resolve(false); };
    root.querySelector("#cf-ok").onclick = () => { root.innerHTML = ""; resolve(true); };
  });
}

function promptPasswordModal(title, message) {
  return new Promise((resolve) => {
    const root = document.getElementById("modal-root");
    root.innerHTML = `
      <div class="overlay">
        <div class="modal-card">
          <h3>${esc(title)}</h3>
          <p style="font-size:13px;color:var(--text-mid);margin:0 0 6px">${esc(message)}</p>
          <label>Password</label>
          <input id="pp-pass" type="password" autocomplete="off" />
          <div class="modal-error" id="pp-err"></div>
          <div class="modal-actions">
            <button class="btn btn-outline" id="pp-cancel">Cancel</button>
            <button class="btn btn-primary" id="pp-ok">Continue</button>
          </div>
        </div>
      </div>`;
    const passEl = root.querySelector("#pp-pass");
    passEl.focus();
    function submit() {
      if (!passEl.value) { root.querySelector("#pp-err").textContent = "Password required."; return; }
      const val = passEl.value;
      root.innerHTML = "";
      resolve(val);
    }
    root.querySelector("#pp-ok").onclick = submit;
    root.querySelector("#pp-cancel").onclick = () => { root.innerHTML = ""; resolve(null); };
    root.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  });
}

function openLoginModal() {
  return new Promise((resolve) => {
    const root = document.getElementById("modal-root");
    root.innerHTML = `
      <div class="overlay">
        <div class="modal-card">
          <h3>Settings Login</h3>
          <label>Username</label>
          <input id="lg-user" autocomplete="username" />
          <label>Password</label>
          <input id="lg-pass" type="password" autocomplete="current-password" />
          <div class="modal-error" id="lg-err"></div>
          <div class="modal-actions">
            <button class="btn btn-outline" id="lg-cancel">Cancel</button>
            <button class="btn btn-primary" id="lg-submit">Login</button>
          </div>
        </div>
      </div>`;
    const userEl = root.querySelector("#lg-user");
    const passEl = root.querySelector("#lg-pass");
    const errEl = root.querySelector("#lg-err");
    userEl.focus();

    async function submit() {
      const ok = await DB.auth.check(userEl.value, passEl.value);
      if (ok) { root.innerHTML = ""; resolve(true); }
      else { errEl.textContent = "Incorrect username or password."; }
    }
    root.querySelector("#lg-submit").onclick = submit;
    root.querySelector("#lg-cancel").onclick = () => { root.innerHTML = ""; resolve(false); };
    root.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  });
}

// ── Zone averages (Tool 1) ──────────────────────────────────────────
function computeZoneAverages() {
  const records = DB.tool1.all();
  const byZone = {};
  for (const rec of records) {
    const zone = (rec.meta && rec.meta.zone || "").trim();
    if (!zone) continue;
    if (!byZone[zone]) {
      byZone[zone] = { count: 0, sections: {} };
      for (const k of Object.keys(SECTION_LABELS)) byZone[zone].sections[k] = [];
    }
    byZone[zone].count++;
    for (const [goal, score] of Object.entries(rec.scores || {})) {
      const prefix = goalPrefix(goal);
      const val = TOOL1_NUMERIC[score];
      if (prefix && val !== undefined) byZone[zone].sections[prefix].push(val);
    }
  }
  const result = {};
  for (const [zone, data] of Object.entries(byZone)) {
    const entry = { count: data.count };
    let all = [];
    for (const [prefix, scores] of Object.entries(data.sections)) {
      if (scores.length) {
        entry[prefix] = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
        all = all.concat(scores);
      } else entry[prefix] = null;
    }
    entry.overall = all.length ? Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 100) / 100 : null;
    result[zone] = entry;
  }
  return result;
}

function goalPrefix(goalText) {
  goalText = (goalText || "").trim();
  const idx = goalText.indexOf(":");
  if (idx < 0) return null;
  const prefix = goalText.slice(0, idx).trim();
  return SECTION_LABELS[prefix] ? prefix : null;
}

function scoreColour(v) {
  if (v === null || v === undefined) return "var(--text-light)";
  if (v >= 1.6) return "var(--green)";
  if (v >= 1.0) return "var(--amber)";
  return "var(--red)";
}

function renderZonePanel() {
  const panel = document.getElementById("zone-panel");
  const data = computeZoneAverages();
  const zones = Object.keys(data).sort();

  let cardsHtml = "";
  if (!zones.length) {
    cardsHtml = `<div class="zp-empty">No data found.<br/>Complete a Child Development Tool assessment to see zone averages.</div>`;
  } else {
    cardsHtml = zones.map(zone => {
      const info = data[zone];
      const ov = info.overall;
      const ovText = ov !== null ? ov.toFixed(2) : "\u2014";
      const rows = Object.entries(SECTION_LABELS).map(([prefix, label]) => {
        const val = info[prefix];
        const pct = val !== null ? Math.round((val / 2) * 100) : 0;
        const col = scoreColour(val);
        const txt = val !== null ? val.toFixed(2) : "\u2014";
        return `<div class="zc-row">
          <span class="zc-label">${esc(label)}</span>
          <span class="zc-bar-track"><span class="zc-bar-fill" style="width:${pct}%;background:${col}"></span></span>
          <span class="zc-val" style="color:${col}">${txt}</span>
        </div>`;
      }).join("");
      return `<div class="zone-card">
        <div class="zc-top"><span class="zc-name">${esc(zone)}</span><span class="zc-count">${info.count} file${info.count !== 1 ? "s" : ""}</span></div>
        <div class="zc-overall"><span class="zc-overall-label">Overall</span><span class="zc-overall-val" style="color:${scoreColour(ov)}">${ovText}</span></div>
        <div class="zc-divider"></div>
        ${rows}
      </div>`;
    }).join("");
  }

  panel.innerHTML = `
    <div class="zp-header">
      <h3>Zone Averages</h3>
      <p>Scores out of 2.00</p>
    </div>
    <div class="zp-scroll">${cardsHtml}</div>
    <button class="zp-refresh" id="zp-refresh-btn">&#8635; Refresh</button>
  `;
  document.getElementById("zp-refresh-btn").onclick = renderZonePanel;
}

// ── Sidebar ──────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "dashboard", label: "Home", icon: "\uD83C\uDFE0" },
  { key: "tool1", label: "Child Development Tool", icon: "\uD83D\uDCCB" },
  { key: "tool2", label: "Environmental Tool", icon: "\uD83D\uDCCB" },
  { key: "tool1records", label: "Child Development Records", icon: "\uD83D\uDCCA" },
  { key: "tool2records", label: "Environmental Records", icon: "\uD83D\uDCCA" }
];

function renderSidebar(activeKey) {
  const sidebar = document.getElementById("sidebar");
  const toolBtns = NAV_ITEMS.map(item => `
    <button class="nav-btn ${item.key === activeKey ? "active" : ""}" data-nav="${item.key}">
      <span class="ico">${item.icon}</span><span class="label">${esc(item.label)}</span>
    </button>`).join("");

  sidebar.innerHTML = `
    <div class="logo-wrap"><img src="icons/logo-original.png" alt="Logo" /></div>
    <div class="divider"></div>
    <div class="nav-label">TOOLS</div>
    ${toolBtns}
    <div class="nav-label">SYNC</div>
    <button class="nav-btn ${activeKey === "cloudsync" ? "active" : ""}" data-nav="cloudsync">
      <span class="ico">\u2601\uFE0F</span><span class="label">Cloud Sync</span>
    </button>
    <div class="nav-label">ADMIN</div>
    <button class="nav-btn ${activeKey === "settings" ? "active" : ""}" data-nav="settings">
      <span class="ico">\u2699\uFE0F</span><span class="label">Settings</span>
    </button>
    <div class="version">v1.0 &middot; Children on the Edge</div>
  `;
  sidebar.querySelectorAll("[data-nav]").forEach(btn => {
    btn.addEventListener("click", () => {
      window.App.navigate(btn.dataset.nav);
      if (window.closeMobileMenu) window.closeMobileMenu();
    });
  });
}

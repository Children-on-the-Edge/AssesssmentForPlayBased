/* view-dashboard.js */

const DASH_SKILL_COLORS = { SE: "#ec4899", FM: "#f59e0b", GM: "#22c55e", LL: "#3b82f6", CI: "#f97316", CD: "#8b5cf6" };

function sectionAvgForGoalsList(records, goalsList) {
  const vals = [];
  for (const rec of records) {
    for (const g of goalsList) {
      const v = TOOL1_NUMERIC[(rec.scores || {})[g]];
      if (v !== undefined) vals.push(v);
    }
  }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function renderDashboard() {
  const main = document.getElementById("main");
  const state = { zone: "All", setting: "All", facilitator: "All", assessor: "All", gender: "All" };

  function filteredTool1() {
    return DB.tool1.all().filter(rec => {
      const m = rec.meta || {};
      if (state.zone !== "All" && (m.zone || "") !== state.zone) return false;
      if (state.setting !== "All" && (m.setting || "") !== state.setting) return false;
      if (state.facilitator !== "All" && (m.facilitator || "") !== state.facilitator) return false;
      if (state.assessor !== "All" && (m.assessor || "") !== state.assessor) return false;
      if (state.gender !== "All" && (m.gender || "") !== state.gender) return false;
      return true;
    });
  }

  function filterSelect(id, label, options, current) {
    return `<div class="field-col"><label>${esc(label)}</label>
      <select id="${id}">
        <option value="All" ${current === "All" ? "selected" : ""}>All</option>
        ${options.map(o => `<option value="${esc(o)}" ${o === current ? "selected" : ""}>${esc(o)}</option>`).join("")}
      </select>
    </div>`;
  }

  function draw() {
    const t1 = filteredTool1();
    const zones = new Set(t1.map(r => (r.meta && r.meta.zone || "").trim()).filter(Boolean));
    let allScores = [];
    for (const rec of t1) for (const score of Object.values(rec.scores || {})) {
      const v = TOOL1_NUMERIC[score];
      if (v !== undefined) allScores.push(v);
    }
    const avg = allScores.length ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2) : "\u2014";

    const values = DB.values.get();

    const skillRows = Object.keys(SECTION_LABELS).map(prefix => {
      const val = tool1SectionAvgForGroup(t1, prefix);
      const pct = val !== null ? Math.round((val / 2) * 100) : 0;
      const color = DASH_SKILL_COLORS[prefix];
      const valText = val !== null ? val.toFixed(2) : "\u2014";
      return `
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
            <span style="font-size:13px;font-weight:700;color:var(--text-dark)">${esc(SECTION_LABELS[prefix])}</span>
            <span style="font-size:15px;font-weight:700;color:${color}">${valText}</span>
          </div>
          <div style="height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:4px"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-light);margin-top:2px">
            <span>Emerging (0)</span><span>Mastery (2)</span>
          </div>
        </div>`;
    }).join("");

    const sections = DB.tool1Sections.get();
    const activityCards = Object.entries(sections).map(([title, data]) => {
      const val = sectionAvgForGoalsList(t1, data.goals);
      const pct = val !== null ? Math.round((val / 2) * 100) : 0;
      const badge = val !== null ? `${val.toFixed(2)} avg` : "No data";
      return `
        <div style="background:#fff;border:1px solid var(--card-border);border-radius:10px;padding:10px 12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:8px">
            <span style="font-size:11px;font-weight:700;color:var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(title)}</span>
            <span style="font-size:10px;color:var(--text-mid);background:#eff6ff;border-radius:20px;padding:2px 8px;white-space:nowrap">${badge}</span>
          </div>
          <div style="height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:3px"></div>
          </div>
        </div>`;
    }).join("");

    main.innerHTML = `
      <div class="dash-pad">
        <div class="banner">
          <h1>Welcome back</h1>
          <p>Select a tool below to begin an assessment or view summaries.</p>
        </div>

        <div class="stats-row">
          <div class="stat-card"><div class="stat-val" style="color:var(--accent)">${t1.length}</div><div class="stat-label">Total Assessments</div></div>
          <div class="stat-card"><div class="stat-val" style="color:var(--accent2)">${zones.size}</div><div class="stat-label">Zones Active</div></div>
          <div class="stat-card"><div class="stat-val" style="color:var(--green)">${avg}</div><div class="stat-label">Overall Avg Score</div></div>
        </div>

        <div class="section-label">NAVIGATE TO</div>
        <div class="nav-cards">
          <div class="nav-card" style="--stripe:var(--accent)" data-go="tool1">
            <h4>Child Development Tool</h4>
            <p>Enter and save a child development assessment.</p>
            <button class="go-btn">Open &rarr;</button>
          </div>
          <div class="nav-card" style="--stripe:var(--accent2)" data-go="tool2">
            <h4>Environmental Tool</h4>
            <p>Enter and save an environmental observation checklist.</p>
            <button class="go-btn">Open &rarr;</button>
          </div>
          <div class="nav-card" style="--stripe:var(--green)" data-go="tool1records">
            <h4>Child Development Records</h4>
            <p>Browse child development records and view per-section averages.</p>
            <button class="go-btn">Open &rarr;</button>
          </div>
          <div class="nav-card" style="--stripe:#6366f1" data-go="tool2records">
            <h4>Environmental Records</h4>
            <p>Browse saved environmental assessments by setting and zone.</p>
            <button class="go-btn">Open &rarr;</button>
          </div>
        </div>

        <div class="section-label" style="margin-top:24px">CHILD DEVELOPMENT OVERVIEW</div>
        <div class="info-row" style="margin-bottom:16px">
          ${filterSelect("db-gender", "Gender", ["M", "F"], state.gender)}
          ${filterSelect("db-zone", "Zone", values.Zone || [], state.zone)}
          ${filterSelect("db-setting", "Setting", values.Setting || [], state.setting)}
          ${filterSelect("db-facilitator", "Facilitator", values.Facilitator || [], state.facilitator)}
          ${filterSelect("db-assessor", "Assessor", values.Assessor || [], state.assessor)}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:16px;align-items:start">
          <div class="score-card">
            <div class="sc-title">Skill Domain Averages</div>
            <div style="margin-top:12px">${skillRows}</div>
          </div>
          <div class="score-card">
            <div class="sc-title">Performance by Activity</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">${activityCards}</div>
          </div>
        </div>
      </div>
    `;

    main.querySelectorAll("[data-go]").forEach(card => {
      card.addEventListener("click", () => window.App.navigate(card.dataset.go));
    });

    ["gender", "zone", "setting", "facilitator", "assessor"].forEach(key => {
      const el = document.getElementById(`db-${key}`);
      el.addEventListener("change", () => { state[key] = el.value; draw(); });
    });
  }

  draw();
}

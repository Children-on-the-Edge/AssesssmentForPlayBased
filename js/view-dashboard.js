/* view-dashboard.js */

const DASH_SKILL_COLORS = { SE: "#ec4899", FM: "#f59e0b", GM: "#22c55e", LL: "#3b82f6", CI: "#f97316", CD: "#8b5cf6" };
const DASH_COMPARE_PALETTE = ["#3b82f6", "#f97316", "#22c55e", "#ec4899", "#8b5cf6", "#06b6d4", "#ef4444", "#a3a300"];

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

// Renders a grouped bar chart as inline SVG. categories: [{key,label}], series: [{name,color,values:{key:num|null}}]
function buildGroupedBarChartSVG(categories, series, maxVal) {
  const width = 760, height = 300;
  const marginLeft = 40, marginBottom = 34, marginTop = 16, marginRight = 10;
  const plotW = width - marginLeft - marginRight;
  const plotH = height - marginTop - marginBottom;
  const groupWidth = plotW / Math.max(1, categories.length);
  const groupPad = 8;
  const barWidth = Math.max(5, (groupWidth - groupPad * 2) / Math.max(1, series.length));

  let gridAndAxis = "";
  const ticks = [0, maxVal / 2, maxVal];
  ticks.forEach(v => {
    const y = marginTop + plotH - (v / maxVal) * plotH;
    gridAndAxis += `<line x1="${marginLeft}" y1="${y.toFixed(1)}" x2="${width - marginRight}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1" />`;
    gridAndAxis += `<text x="${marginLeft - 6}" y="${(y + 3).toFixed(1)}" font-size="9" text-anchor="end" fill="#94a3b8">${v.toFixed(maxVal <= 2 ? 1 : 0)}</text>`;
  });

  let bars = "";
  categories.forEach((cat, ci) => {
    const groupX = marginLeft + ci * groupWidth;
    series.forEach((s, si) => {
      const val = s.values[cat.key];
      const h = (val !== null && val !== undefined) ? (val / maxVal) * plotH : 0;
      const x = groupX + groupPad + si * barWidth;
      const y = marginTop + plotH - h;
      bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(1, barWidth - 2).toFixed(1)}" height="${h.toFixed(1)}" fill="${s.color}" rx="2"><title>${esc(s.name)} \u2014 ${esc(cat.label)}: ${val !== null && val !== undefined ? val.toFixed(2) : "No data"}</title></rect>`;
    });
    const labelX = groupX + groupWidth / 2;
    bars += `<text x="${labelX.toFixed(1)}" y="${(height - marginBottom + 16).toFixed(1)}" font-size="10" text-anchor="middle" fill="#475569">${esc(cat.label)}</text>`;
  });

  return `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;display:block">${gridAndAxis}${bars}</svg>`;
}

function renderDashboard() {
  const main = document.getElementById("main");
  const state = { zone: "All", setting: "All", facilitator: "All", assessor: "All", gender: "All", compareBy: "zone", compareSelected: null };

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

    // ── Compare Zones / Settings chart (uses the full unfiltered Tool 1 dataset,
    // independent of the filter row above, since the whole point here is to compare
    // across zones/settings rather than narrow down to one) ─────────────────────
    const allT1 = DB.tool1.all();
    const compareOptions = (values[state.compareBy === "zone" ? "Zone" : "Setting"] || [])
      .filter(name => allT1.some(r => (r.meta && r.meta[state.compareBy]) === name));

    if (!state.compareSelected || state.compareSelected.by !== state.compareBy) {
      state.compareSelected = { by: state.compareBy, names: new Set(compareOptions.slice(0, 3)) };
    }

    const compareCategories = Object.keys(SECTION_LABELS).map(k => ({ key: k, label: k }));
    const selectedNames = compareOptions.filter(n => state.compareSelected.names.has(n));
    const compareSeries = selectedNames.map((name, i) => {
      const recs = allT1.filter(r => (r.meta && r.meta[state.compareBy]) === name);
      const vals = {};
      compareCategories.forEach(c => { vals[c.key] = tool1SectionAvgForGroup(recs, c.key); });
      return { name, color: DASH_COMPARE_PALETTE[i % DASH_COMPARE_PALETTE.length], values: vals, count: recs.length };
    });

    const compareChip = (name, i) => {
      const checked = state.compareSelected.names.has(name);
      const color = checked ? DASH_COMPARE_PALETTE[selectedNames.indexOf(name) % DASH_COMPARE_PALETTE.length] : "#cbd5e1";
      return `<label style="display:flex;align-items:center;gap:6px;font-size:12px;padding:5px 10px;border:1px solid ${checked ? color : "var(--card-border)"};border-radius:20px;cursor:pointer;background:${checked ? color + "18" : "#fff"}">
        <input type="checkbox" data-compare-name="${esc(name)}" ${checked ? "checked" : ""} style="accent-color:${color}" />
        ${esc(name)}
      </label>`;
    };

    const compareLegend = compareSeries.map(s =>
      `<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--text-mid);margin-right:12px">
        <span style="width:10px;height:10px;border-radius:3px;background:${s.color};display:inline-block"></span>
        ${esc(s.name)} <span style="color:var(--text-light)">(${s.count})</span>
      </span>`
    ).join("");

    const compareChartHtml = compareSeries.length
      ? buildGroupedBarChartSVG(compareCategories, compareSeries, 2)
      : `<div class="empty-state" style="padding:30px 10px">Select one or more ${state.compareBy === "zone" ? "zones" : "settings"} above to compare.</div>`;


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
          <div class="nav-card" style="--stripe:var(--logo-brown)" data-go="tool2records">
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

        <div class="score-card" style="margin-top:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
            <div class="sc-title">Compare Zones / Settings</div>
            <div style="display:flex;gap:4px;background:#f1f5f9;border-radius:8px;padding:3px">
              <button data-compare-by="zone" class="small-btn" style="border:none;background:${state.compareBy === "zone" ? "#fff" : "transparent"};box-shadow:${state.compareBy === "zone" ? "0 1px 3px rgba(0,0,0,.15)" : "none"}">By Zone</button>
              <button data-compare-by="setting" class="small-btn" style="border:none;background:${state.compareBy === "setting" ? "#fff" : "transparent"};box-shadow:${state.compareBy === "setting" ? "0 1px 3px rgba(0,0,0,.15)" : "none"}">By Setting</button>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0">
            ${compareOptions.map((name, i) => compareChip(name, i)).join("") || `<span style="font-size:12px;color:var(--text-light)">No ${state.compareBy === "zone" ? "zones" : "settings"} with data yet.</span>`}
          </div>
          <div>${compareChartHtml}</div>
          <div style="margin-top:8px">${compareLegend}</div>
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

    main.querySelectorAll("[data-compare-by]").forEach(btn => {
      btn.addEventListener("click", () => { state.compareBy = btn.dataset.compareBy; state.compareSelected = null; draw(); });
    });
    main.querySelectorAll("[data-compare-name]").forEach(cb => {
      cb.addEventListener("change", () => {
        const name = cb.dataset.compareName;
        if (cb.checked) state.compareSelected.names.add(name);
        else state.compareSelected.names.delete(name);
        draw();
      });
    });
  }

  draw();
}

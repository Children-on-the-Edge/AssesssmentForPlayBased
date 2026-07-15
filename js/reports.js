/* reports.js — the consolidated Reports page: Charts, Comparisons, and Action Plan
 * as tabs in one place. These used to be scattered across Home and inside each
 * Records screen individually; this brings Tool 1 and Tool 2 reporting together.
 */

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

function renderReportsPage() {
  const main = document.getElementById("main");
  const state = {
    tab: "charts",
    charts: { zone: "All", setting: "All", facilitator: "All", assessor: "All", gender: "All", compareBy: "zone", compareSelected: null },
    comparisons: { tool: "tool1", year: "All", compareYears: null, compareLocation: { mode: "all", value: "" } },
    actionplan: { groupBy: "setting", selectedGroup: null, year: "All" }
  };

  function draw() {
    main.innerHTML = `
      <div class="tool-header">
        <div class="left"><button class="back-btn" id="rp-back">Back</button><h2>Reports</h2></div>
      </div>
      <div class="settings-tabs">
        <button class="settings-tab ${state.tab === "charts" ? "active" : ""}" data-tab="charts">Charts</button>
        <button class="settings-tab ${state.tab === "comparisons" ? "active" : ""}" data-tab="comparisons">Comparisons</button>
        <button class="settings-tab ${state.tab === "actionplan" ? "active" : ""}" data-tab="actionplan">Action Plan</button>
      </div>
      <div class="settings-body" id="rp-body"></div>
    `;
    document.getElementById("rp-back").onclick = () => window.App.navigate("dashboard");
    main.querySelectorAll(".settings-tab").forEach(btn => {
      btn.addEventListener("click", () => { state.tab = btn.dataset.tab; draw(); });
    });
    const body = document.getElementById("rp-body");
    if (state.tab === "charts") drawChartsTab(body);
    else if (state.tab === "comparisons") drawComparisonsTab(body);
    else if (state.tab === "actionplan") drawActionPlanTab(body);
  }

  // ── Charts tab (Skill Domains, Performance by Activity, Compare Zones/Settings) ──
  function drawChartsTab(body) {
    const s = state.charts;

    function filteredTool1() {
      return DB.tool1.all().filter(rec => {
        const m = rec.meta || {};
        if (s.zone !== "All" && (m.zone || "") !== s.zone) return false;
        if (s.setting !== "All" && (m.setting || "") !== s.setting) return false;
        if (s.facilitator !== "All" && (m.facilitator || "") !== s.facilitator) return false;
        if (s.assessor !== "All" && (m.assessor || "") !== s.assessor) return false;
        if (s.gender !== "All" && (m.gender || "") !== s.gender) return false;
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

    const t1 = filteredTool1();
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

    const allT1 = DB.tool1.all();
    const compareOptions = (values[s.compareBy === "zone" ? "Zone" : "Setting"] || [])
      .filter(name => allT1.some(r => (r.meta && r.meta[s.compareBy]) === name));

    if (!s.compareSelected || s.compareSelected.by !== s.compareBy) {
      s.compareSelected = { by: s.compareBy, names: new Set(compareOptions.slice(0, 3)) };
    }

    const compareCategories = Object.keys(SECTION_LABELS).map(k => ({ key: k, label: k }));
    const selectedNames = compareOptions.filter(n => s.compareSelected.names.has(n));
    const compareSeries = selectedNames.map((name, i) => {
      const recs = allT1.filter(r => (r.meta && r.meta[s.compareBy]) === name);
      const vals = {};
      compareCategories.forEach(c => { vals[c.key] = tool1SectionAvgForGroup(recs, c.key); });
      return { name, color: DASH_COMPARE_PALETTE[i % DASH_COMPARE_PALETTE.length], values: vals, count: recs.length };
    });

    const compareChip = (name) => {
      const checked = s.compareSelected.names.has(name);
      const color = checked ? DASH_COMPARE_PALETTE[selectedNames.indexOf(name) % DASH_COMPARE_PALETTE.length] : "#cbd5e1";
      return `<label style="display:flex;align-items:center;gap:6px;font-size:12px;padding:5px 10px;border:1px solid ${checked ? color : "var(--card-border)"};border-radius:20px;cursor:pointer;background:${checked ? color + "18" : "#fff"}">
        <input type="checkbox" data-compare-name="${esc(name)}" ${checked ? "checked" : ""} style="accent-color:${color}" />
        ${esc(name)}
      </label>`;
    };

    const compareLegend = compareSeries.map(sr =>
      `<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--text-mid);margin-right:12px">
        <span style="width:10px;height:10px;border-radius:3px;background:${sr.color};display:inline-block"></span>
        ${esc(sr.name)} <span style="color:var(--text-light)">(${sr.count})</span>
      </span>`
    ).join("");

    const compareChartHtml = compareSeries.length
      ? buildGroupedBarChartSVG(compareCategories, compareSeries, 2)
      : `<div class="empty-state" style="padding:30px 10px">Select one or more ${s.compareBy === "zone" ? "zones" : "settings"} above to compare.</div>`;

    body.innerHTML = `
      <div style="padding:16px 18px">
        <div class="info-row" style="margin-bottom:16px">
          ${filterSelect("rp-gender", "Gender", ["M", "F"], s.gender)}
          ${filterSelect("rp-zone", "Zone", values.Zone || [], s.zone)}
          ${filterSelect("rp-setting", "Setting", values.Setting || [], s.setting)}
          ${filterSelect("rp-facilitator", "Facilitator", values.Facilitator || [], s.facilitator)}
          ${filterSelect("rp-assessor", "Assessor", values.Assessor || [], s.assessor)}
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
              <button data-compare-by="zone" class="small-btn" style="border:none;background:${s.compareBy === "zone" ? "#fff" : "transparent"};box-shadow:${s.compareBy === "zone" ? "0 1px 3px rgba(0,0,0,.15)" : "none"}">By Zone</button>
              <button data-compare-by="setting" class="small-btn" style="border:none;background:${s.compareBy === "setting" ? "#fff" : "transparent"};box-shadow:${s.compareBy === "setting" ? "0 1px 3px rgba(0,0,0,.15)" : "none"}">By Setting</button>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0">
            ${compareOptions.map(name => compareChip(name)).join("") || `<span style="font-size:12px;color:var(--text-light)">No ${s.compareBy === "zone" ? "zones" : "settings"} with data yet.</span>`}
          </div>
          <div>${compareChartHtml}</div>
          <div style="margin-top:8px">${compareLegend}</div>
        </div>
      </div>
    `;

    ["gender", "zone", "setting", "facilitator", "assessor"].forEach(key => {
      const el = document.getElementById(`rp-${key}`);
      el.addEventListener("change", () => { s[key] = el.value; drawChartsTab(body); });
    });
    body.querySelectorAll("[data-compare-by]").forEach(btn => {
      btn.addEventListener("click", () => { s.compareBy = btn.dataset.compareBy; s.compareSelected = null; drawChartsTab(body); });
    });
    body.querySelectorAll("[data-compare-name]").forEach(cb => {
      cb.addEventListener("change", () => {
        const name = cb.dataset.compareName;
        if (cb.checked) s.compareSelected.names.add(name);
        else s.compareSelected.names.delete(name);
        drawChartsTab(body);
      });
    });
  }

  // ── Comparisons tab (heatmap tables, now with a Tool 1 / Tool 2 toggle) ──
  function drawComparisonsTab(body) {
    const s = state.comparisons;
    body.innerHTML = `
      <div style="padding:16px 18px 0">
        <div style="display:flex;gap:4px;background:#f1f5f9;border-radius:8px;padding:3px;width:fit-content;margin-bottom:12px">
          <button data-cmp-tool="tool1" class="small-btn" style="border:none;background:${s.tool === "tool1" ? "#fff" : "transparent"};box-shadow:${s.tool === "tool1" ? "0 1px 3px rgba(0,0,0,.15)" : "none"}">Child Development</button>
          <button data-cmp-tool="tool2" class="small-btn" style="border:none;background:${s.tool === "tool2" ? "#fff" : "transparent"};box-shadow:${s.tool === "tool2" ? "0 1px 3px rgba(0,0,0,.15)" : "none"}">Environmental</button>
        </div>
      </div>
      <div id="rp-cmp-content"></div>
    `;
    document.getElementById("rp-cmp-content").innerHTML = renderComparisonsTab(s.tool, s.year, s.compareYears, s.compareLocation); // defined in view-records.js
    const yearSel = document.getElementById("cmp-year");
    if (yearSel) yearSel.addEventListener("change", () => { s.year = yearSel.value; drawComparisonsTab(body); });
    body.querySelectorAll("[data-cmp-tool]").forEach(btn => {
      btn.addEventListener("click", () => { s.tool = btn.dataset.cmpTool; s.year = "All"; s.compareYears = null; s.compareLocation = { mode: "all", value: "" }; drawComparisonsTab(body); });
    });
    body.querySelectorAll("[data-cmp-year-multi]").forEach(cb => {
      cb.addEventListener("change", () => {
        const allChecked = Array.from(body.querySelectorAll("[data-cmp-year-multi]:checked")).map(el => el.dataset.cmpYearMulti);
        s.compareYears = allChecked;
        drawComparisonsTab(body);
      });
    });
    body.querySelectorAll("[data-cmp-loc-mode]").forEach(btn => {
      btn.addEventListener("click", () => {
        s.compareLocation = { mode: btn.dataset.cmpLocMode, value: "" };
        drawComparisonsTab(body);
      });
    });
    const locValueSel = document.getElementById("cmp-loc-value");
    if (locValueSel) {
      locValueSel.addEventListener("change", () => {
        s.compareLocation = { mode: s.compareLocation.mode, value: locValueSel.value };
        drawComparisonsTab(body);
      });
    }
  }

  // ── Action Plan tab (single-location report: score tables, Going Well /
  // Needs Addressing, and editable notes — matching the original per-zone
  // dashboard layout, filtered to one Setting or Zone at a time) ──
  function drawActionPlanTab(body) {
    const s = state.actionplan;

    function distinctGroupNames(t1, t2) {
      const field = s.groupBy;
      const names = new Set();
      for (const r of t1) { const v = ((r.meta && r.meta[field]) || "").trim(); if (v) names.add(v); }
      for (const r of t2) { const v = ((r.meta && r.meta[field]) || "").trim(); if (v) names.add(v); }
      return Array.from(names).sort();
    }

    const allYearsSeen = Array.from(new Set([...DB.tool1.all(), ...DB.tool2.all()].map(recordYear))).sort();
    const t1All = (s.year === "All" ? DB.tool1.all() : DB.tool1.all().filter(r => recordYear(r) === s.year));
    const t2All = (s.year === "All" ? DB.tool2.all() : DB.tool2.all().filter(r => recordYear(r) === s.year));
    const names = distinctGroupNames(t1All, t2All);
    if (!s.selectedGroup || !names.includes(s.selectedGroup)) s.selectedGroup = names[0] || null;

    const rowLabel = s.groupBy === "setting" ? "Setting" : "Zone";
    const t1ForLocation = s.selectedGroup ? t1All.filter(r => ((r.meta && r.meta[s.groupBy]) || "").trim() === s.selectedGroup) : [];
    const t2ForLocation = s.selectedGroup ? t2All.filter(r => ((r.meta && r.meta[s.groupBy]) || "").trim() === s.selectedGroup) : [];

    const t1gw = tool1GoingWellNeedsAddressing(t1ForLocation);
    const t2gw = tool2GoingWellNeedsAddressing(t2ForLocation);

    // Reuses the same score-table renderer as the Comparisons tab, just fixed to one location.
    const scoreTablesHtml = s.selectedGroup ? `
      ${renderHeatmapTable("tool1", "Child Development Tool", t1ForLocation, () => s.selectedGroup, rowLabel)}
      ${renderHeatmapTable("tool2", "Environmental Tool", t2ForLocation, () => s.selectedGroup, rowLabel)}
    ` : "";

    const goingWellHtml = s.selectedGroup ? `
      <div class="score-card" style="max-width:800px;margin-top:16px">
        <div class="sc-title">Strengths / Areas for Development</div>
        <table style="width:100%;border-collapse:collapse;margin-top:8px">
          <thead><tr><th style="text-align:left;font-size:10px;color:var(--text-mid);padding:6px 8px">Tool 1</th><th style="text-align:left;font-size:10px;color:var(--text-mid);padding:6px 8px">Tool 2</th><th></th></tr></thead>
          <tbody>
            <tr>
              <td style="background:#eafbea;white-space:normal;word-wrap:break-word;padding:6px 8px">${esc(joinOrNoMatches(t1gw.goingWell))}</td>
              <td style="background:#eafbea;white-space:normal;word-wrap:break-word;padding:6px 8px">${esc(joinOrNoMatches(t2gw.goingWell))}</td>
              <td style="font-weight:700;color:var(--green);white-space:nowrap;padding:6px 8px">Strengths</td>
            </tr>
            <tr>
              <td style="background:#fdeaea;white-space:normal;word-wrap:break-word;padding:6px 8px">${esc(joinOrNoMatches(t1gw.needsAddressing))}</td>
              <td style="background:#fdeaea;white-space:normal;word-wrap:break-word;padding:6px 8px">${esc(joinOrNoMatches(t2gw.needsAddressing))}</td>
              <td style="font-weight:700;color:var(--red);white-space:nowrap;padding:6px 8px">Areas for Development</td>
            </tr>
          </tbody>
        </table>
      </div>
    ` : "";

    const notesKey = `${s.groupBy}:${s.selectedGroup}`;
    const savedNotes = s.selectedGroup && DB.actionPlanNotes.getForGroup(notesKey);
    const notes = {
      targets: (savedNotes && savedNotes.targets) || [{ target: "", actions: "" }, { target: "", actions: "" }, { target: "", actions: "" }]
    };

    body.innerHTML = `
      <div style="padding:16px 18px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div style="display:flex;gap:4px;background:#f1f5f9;border-radius:8px;padding:3px">
              <button data-ap-groupby="setting" class="small-btn" style="border:none;background:${s.groupBy === "setting" ? "#fff" : "transparent"};box-shadow:${s.groupBy === "setting" ? "0 1px 3px rgba(0,0,0,.15)" : "none"}">By Setting</button>
              <button data-ap-groupby="zone" class="small-btn" style="border:none;background:${s.groupBy === "zone" ? "#fff" : "transparent"};box-shadow:${s.groupBy === "zone" ? "0 1px 3px rgba(0,0,0,.15)" : "none"}">By Zone</button>
            </div>
            <label style="font-size:12px;font-weight:700;color:var(--text-mid)">${esc(rowLabel)}:</label>
            <select id="ap-location-select">
              ${names.map(n => `<option value="${esc(n)}" ${n === s.selectedGroup ? "selected" : ""}>${esc(n)}</option>`).join("")}
            </select>
            <label style="font-size:12px;font-weight:700;color:var(--text-mid)">Year:</label>
            <select id="ap-year">
              <option value="All" ${s.year === "All" ? "selected" : ""}>All</option>
              ${allYearsSeen.map(y => `<option value="${esc(y)}" ${y === s.year ? "selected" : ""}>${esc(y)}</option>`).join("")}
            </select>
          </div>
          <button class="btn btn-outline" id="ap-download-pdf">\u2B07 Download PDF</button>
        </div>

        ${names.length ? `
          ${scoreTablesHtml}
          ${goingWellHtml}

          <div class="score-card" style="max-width:800px;margin-top:16px">
            <div class="sc-title">Notes for ${esc(s.selectedGroup)}</div>
            <div style="margin-top:14px">
              <label style="font-weight:700;font-size:12px;color:var(--text-mid)">Targets &amp; Actions</label>
              <table style="width:100%;margin-top:6px;border-collapse:collapse">
                <thead><tr><th style="text-align:left;font-size:11px;color:var(--text-light);padding:4px">Target (what you aim to develop or achieve)</th><th style="text-align:left;font-size:11px;color:var(--text-light);padding:4px">Actions (the specific steps you'll take)</th></tr></thead>
                <tbody>
                  ${notes.targets.map((t, i) => `
                    <tr>
                      <td style="padding:3px"><input class="ap-target" data-i="${i}" value="${esc(t.target || "")}" style="width:100%;border:1px solid #d1d5db;border-radius:6px;padding:6px 8px" /></td>
                      <td style="padding:3px"><input class="ap-action" data-i="${i}" value="${esc(t.actions || "")}" style="width:100%;border:1px solid #d1d5db;border-radius:6px;padding:6px 8px" /></td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
            <button class="btn btn-primary" id="ap-save-notes" style="margin-top:14px">Save Notes</button>
          </div>
        ` : `<div class="empty-state">No records yet \u2014 complete some assessments to see the Action Plan.</div>`}
      </div>
    `;

    document.getElementById("ap-download-pdf").onclick = () => window.print();
    document.getElementById("ap-year").addEventListener("change", (e) => {
      s.year = e.target.value;
      s.selectedGroup = null;
      drawActionPlanTab(body);
    });

    body.querySelectorAll("[data-ap-groupby]").forEach(btn => {
      btn.addEventListener("click", () => { s.groupBy = btn.dataset.apGroupby; s.selectedGroup = null; drawActionPlanTab(body); });
    });

    if (!names.length) return;

    document.getElementById("ap-location-select").addEventListener("change", (e) => {
      s.selectedGroup = e.target.value;
      drawActionPlanTab(body);
    });

    document.getElementById("ap-save-notes").onclick = () => {
      const actionInputs = body.querySelectorAll(".ap-action");
      const targets = Array.from(body.querySelectorAll(".ap-target")).map((el, i) => ({
        target: el.value,
        actions: actionInputs[i] ? actionInputs[i].value : ""
      }));
      DB.actionPlanNotes.setForGroup(notesKey, { targets });
      toast("Notes saved.", "success");
    };
  }

  draw();
}

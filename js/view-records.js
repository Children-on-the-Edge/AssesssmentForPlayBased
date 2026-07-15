/* view-records.js — Averages & Stats (Tool 1) and Environmental Records (Tool 2) browsers. */

// ── Tool 1 helpers ───────────────────────────────────────────────────
function tool1SectionScores(rec) {
  const out = {}; for (const k of Object.keys(SECTION_LABELS)) out[k] = [];
  for (const [goal, score] of Object.entries(rec.scores || {})) {
    const prefix = goalPrefix(goal);
    const val = TOOL1_NUMERIC[score];
    if (prefix && val !== undefined) out[prefix].push(val);
  }
  return out;
}
function tool1Averages(sectionScores) {
  const out = {};
  for (const [prefix, scores] of Object.entries(sectionScores)) {
    if (scores.length) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      out[prefix] = { average: Math.round(avg * 100) / 100, total: scores.reduce((a, b) => a + b, 0), count: scores.length };
    } else out[prefix] = { average: null, total: null, count: 0 };
  }
  return out;
}
function tool1SkillSummary(averages) {
  return Object.entries(averages).map(([prefix, d]) => {
    const label = SECTION_LABELS[prefix];
    return d.total === null ? `\u2022 ${label}: No data` : `\u2022 ${label}: Avg ${d.average.toFixed(2)}  (${d.count} items)`;
  }).join("\n");
}

// ── Tool 2 helpers ───────────────────────────────────────────────────
function tool2SectionSummary(rec, sectionDefs) {
  // returns {title: {yes,no,total}}
  const out = {};
  for (const [title, data] of Object.entries(sectionDefs)) {
    let yes = 0, no = 0, total = 0;
    for (const goal of data.goals) {
      const v = (rec.scores || {})[goal];
      if (v === "Yes") { yes++; total++; }
      else if (v === "No") { no++; total++; }
    }
    out[title] = { yes, no, total };
  }
  return out;
}

// ── Comparisons (Zone / Setting / Year) — heatmap-style breakdown tables ─
function recordYear(rec) {
  const d = (rec.meta && rec.meta.date) || "";
  const m = d.match(/(\d{4})/);
  return m ? m[1] : "Unspecified";
}

function tool1SectionAvgForGroup(records, prefix) {
  const vals = [];
  for (const rec of records) {
    for (const [goal, score] of Object.entries(rec.scores || {})) {
      if (goalPrefix(goal) === prefix) {
        const v = TOOL1_NUMERIC[score];
        if (v !== undefined) vals.push(v);
      }
    }
  }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function tool1OverallForGroup(records) {
  const vals = [];
  for (const rec of records) {
    for (const score of Object.values(rec.scores || {})) {
      const v = TOOL1_NUMERIC[score];
      if (v !== undefined) vals.push(v);
    }
  }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function tool2SectionPctForGroup(records, sectionGoals) {
  let yes = 0, total = 0;
  for (const rec of records) {
    for (const goal of sectionGoals) {
      const v = (rec.scores || {})[goal];
      if (v === "Yes") { yes++; total++; }
      else if (v === "No") { total++; }
    }
  }
  return total ? (yes / total) * 100 : null;
}

function tool2OverallPctForGroup(records) {
  let yes = 0, total = 0;
  for (const rec of records) {
    for (const v of Object.values(rec.scores || {})) {
      if (v === "Yes") { yes++; total++; }
      else if (v === "No") { total++; }
    }
  }
  return total ? (yes / total) * 100 : null;
}

function tool1CellStyle(v) {
  if (v === null) return { bg: "#f1f5f9", fg: "#94a3b8" };
  if (v >= 1.6) return { bg: "#bbf7d0", fg: "#14532d" };
  if (v >= 1.0) return { bg: "#fde68a", fg: "#78350f" };
  return { bg: "#fecaca", fg: "#7f1d1d" };
}

function tool2CellStyle(v) {
  if (v === null) return { bg: "#f1f5f9", fg: "#94a3b8" };
  if (v >= 51) return { bg: "#bbf7d0", fg: "#14532d" };
  if (v >= 25) return { bg: "#fde68a", fg: "#78350f" };
  return { bg: "#fecaca", fg: "#7f1d1d" };
}

function renderHeatmapTable(tool, title, records, groupKeyFn, rowLabel) {
  const groups = {};
  for (const rec of records) {
    const key = (groupKeyFn(rec) || "").toString().trim() || "Unspecified";
    (groups[key] = groups[key] || []).push(rec);
  }
  const groupNames = Object.keys(groups).sort();
  if (!groupNames.length) {
    return `<div class="score-card"><div class="sc-title">${esc(title)}</div><div class="sc-body">No scored data yet.</div></div>`;
  }

  const isT1 = tool === "tool1";
  let colKeys, colLabel, cellValue, overallValue, cellStyle, fmt;
  if (isT1) {
    colKeys = Object.keys(SECTION_LABELS);
    colLabel = (k) => k; // short code (SE, FM, ...) keeps columns narrow; full name is in the legend elsewhere
    cellValue = (recs, k) => tool1SectionAvgForGroup(recs, k);
    overallValue = tool1OverallForGroup;
    cellStyle = tool1CellStyle;
    fmt = (v) => v === null ? "\u2014" : v.toFixed(2);
  } else {
    const sections = DB.tool2Sections.get();
    colKeys = Object.keys(sections);
    colLabel = (k) => k;
    cellValue = (recs, k) => tool2SectionPctForGroup(recs, sections[k].goals);
    overallValue = tool2OverallPctForGroup;
    cellStyle = tool2CellStyle;
    fmt = (v) => v === null ? "\u2014" : Math.round(v) + "%";
  }

  const headerCells = colKeys.map(k =>
    `<th style="font-size:10px;font-weight:700;color:var(--text-mid);padding:6px 5px;white-space:normal;max-width:80px;border-bottom:1px solid var(--card-border)">${esc(colLabel(k))}</th>`
  ).join("");

  const bodyRows = groupNames.map(name => {
    const recs = groups[name];
    const cells = colKeys.map(k => {
      const v = cellValue(recs, k);
      const s = cellStyle(v);
      return `<td style="text-align:center;background:${s.bg};color:${s.fg};font-weight:700;padding:5px 4px;border-bottom:1px solid #fff">${fmt(v)}</td>`;
    }).join("");
    const ov = overallValue(recs);
    const ovStyle = cellStyle(ov);
    return `<tr>
      <td style="font-weight:700;font-size:12px;padding:5px 8px;border-bottom:1px solid #fff;white-space:nowrap">${esc(name)}</td>
      ${cells}
      <td style="text-align:center;background:${ovStyle.bg};color:${ovStyle.fg};font-weight:700;padding:5px 6px;border-bottom:1px solid #fff">${fmt(ov)}</td>
      <td style="text-align:right;color:var(--text-light);font-size:11px;padding:5px 8px;border-bottom:1px solid #fff">${recs.length}</td>
    </tr>`;
  }).join("");

  return `
    <div class="score-card" style="overflow-x:auto">
      <div class="sc-title">${esc(title)}</div>
      <table style="width:100%;border-collapse:collapse;margin-top:8px">
        <thead><tr>
          <th style="text-align:left;font-size:10px;color:var(--text-mid);padding:6px 8px;border-bottom:1px solid var(--card-border)">${esc(rowLabel)}</th>
          ${headerCells}
          <th style="font-size:10px;color:var(--text-mid);padding:6px 6px;border-bottom:1px solid var(--card-border)">Overall</th>
          <th style="font-size:10px;color:var(--text-mid);padding:6px 8px;border-bottom:1px solid var(--card-border)">Records</th>
        </tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

// Interactive multi-select year comparison: pick any years, see them side by side
// per skill/section, with a small +/- delta between each consecutive selected year
// showing exactly where results improved or slipped.
function renderYearComparisonSection(tool, allRecords, allYears, selectedYears, locationFilter) {
  locationFilter = locationFilter || { mode: "all", value: "" };
  const isT1 = tool === "tool1";
  let colKeys, colLabel, cellValue, overallValue, cellStyle, fmt, fmtDelta;
  if (isT1) {
    colKeys = Object.keys(SECTION_LABELS);
    colLabel = (k) => SECTION_LABELS[k];
    cellValue = (recs, k) => tool1SectionAvgForGroup(recs, k);
    overallValue = tool1OverallForGroup;
    cellStyle = tool1CellStyle;
    fmt = (v) => v === null ? "\u2014" : v.toFixed(2);
    fmtDelta = (d) => (d > 0 ? "+" : "") + d.toFixed(2);
  } else {
    const sections = DB.tool2Sections.get();
    colKeys = Object.keys(sections);
    colLabel = (k) => k;
    cellValue = (recs, k) => tool2SectionPctForGroup(recs, sections[k].goals);
    overallValue = tool2OverallPctForGroup;
    cellStyle = tool2CellStyle;
    fmt = (v) => v === null ? "\u2014" : Math.round(v) + "%";
    fmtDelta = (d) => (d > 0 ? "+" : "") + Math.round(d) + "%";
  }

  const years = selectedYears.slice().sort();
  const yearChips = allYears.map(y => {
    const checked = selectedYears.includes(y);
    return `<label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;padding:5px 10px;border:1px solid ${checked ? "var(--accent)" : "var(--card-border)"};border-radius:20px;cursor:pointer;background:${checked ? "#eaf3fb" : "#fff"};margin-right:6px;margin-bottom:6px">
      <input type="checkbox" data-cmp-year-multi="${esc(y)}" ${checked ? "checked" : ""} />
      ${esc(y)}
    </label>`;
  }).join("");

  function deltaHtml(val, prevVal) {
    if (val === null || prevVal === null) return "";
    const diff = val - prevVal;
    const color = diff > 0.0001 ? "var(--green)" : diff < -0.0001 ? "var(--red)" : "var(--text-light)";
    return `<div style="font-size:10px;color:${color};font-weight:700;margin-top:2px">${esc(fmtDelta(diff))}</div>`;
  }

  // Location filter: narrows which records feed the year comparison, so you can see
  // whether one specific Setting or Zone is improving, not just the overall aggregate.
  const settingNames = Array.from(new Set(allRecords.map(r => ((r.meta && r.meta.setting) || "").trim()).filter(Boolean))).sort();
  const zoneNames = Array.from(new Set(allRecords.map(r => ((r.meta && r.meta.zone) || "").trim()).filter(Boolean))).sort();

  let locationOptions = [];
  if (locationFilter.mode === "setting") locationOptions = settingNames;
  else if (locationFilter.mode === "zone") locationOptions = zoneNames;
  const locationValue = locationOptions.includes(locationFilter.value) ? locationFilter.value : (locationOptions[0] || "");

  const recordsForYears = locationFilter.mode === "all"
    ? allRecords
    : allRecords.filter(r => {
        const field = locationFilter.mode === "setting" ? "setting" : "zone";
        return ((r.meta && r.meta[field]) || "").trim() === locationValue;
      });

  const locationControlsHtml = `
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <div style="display:flex;gap:4px;background:#f1f5f9;border-radius:8px;padding:3px">
        <button data-cmp-loc-mode="all" class="small-btn" style="border:none;background:${locationFilter.mode === "all" ? "#fff" : "transparent"};box-shadow:${locationFilter.mode === "all" ? "0 1px 3px rgba(0,0,0,.15)" : "none"}">All Locations</button>
        <button data-cmp-loc-mode="setting" class="small-btn" style="border:none;background:${locationFilter.mode === "setting" ? "#fff" : "transparent"};box-shadow:${locationFilter.mode === "setting" ? "0 1px 3px rgba(0,0,0,.15)" : "none"}">By Setting</button>
        <button data-cmp-loc-mode="zone" class="small-btn" style="border:none;background:${locationFilter.mode === "zone" ? "#fff" : "transparent"};box-shadow:${locationFilter.mode === "zone" ? "0 1px 3px rgba(0,0,0,.15)" : "none"}">By Zone</button>
      </div>
      ${locationFilter.mode !== "all" ? `
        <select id="cmp-loc-value">
          ${locationOptions.map(n => `<option value="${esc(n)}" ${n === locationValue ? "selected" : ""}>${esc(n)}</option>`).join("") || `<option>No data yet</option>`}
        </select>
      ` : ""}
    </div>
  `;

  const body = years.length < 2
    ? `<div class="empty-state" style="padding:20px 10px">Select two or more years above to compare.</div>`
    : (() => {
        const perYearRecords = {};
        years.forEach(y => { perYearRecords[y] = recordsForYears.filter(r => recordYear(r) === y); });

        const rowsHtml = colKeys.map(k => {
          const cells = years.map((y, i) => {
            const val = cellValue(perYearRecords[y], k);
            const style = cellStyle(val);
            const delta = i > 0 ? deltaHtml(val, cellValue(perYearRecords[years[i - 1]], k)) : "";
            return `<td style="text-align:center;background:${style.bg};color:${style.fg};font-weight:700;padding:6px 8px;border-bottom:1px solid #fff">${fmt(val)}${delta}</td>`;
          }).join("");
          return `<tr><td style="font-weight:700;font-size:12px;padding:6px 8px;border-bottom:1px solid #fff;white-space:nowrap">${esc(colLabel(k))}</td>${cells}</tr>`;
        }).join("");

        const overallCells = years.map((y, i) => {
          const val = overallValue(perYearRecords[y]);
          const style = cellStyle(val);
          const delta = i > 0 ? deltaHtml(val, overallValue(perYearRecords[years[i - 1]])) : "";
          return `<td style="text-align:center;background:${style.bg};color:${style.fg};font-weight:700;padding:6px 8px">${fmt(val)}${delta}</td>`;
        }).join("");

        return `
          <table style="width:100%;border-collapse:collapse;margin-top:8px">
            <thead><tr>
              <th style="text-align:left;font-size:10px;color:var(--text-mid);padding:6px 8px;border-bottom:1px solid var(--card-border)"></th>
              ${years.map(y => `<th style="font-size:11px;color:var(--text-mid);padding:6px 8px;border-bottom:1px solid var(--card-border)">${esc(y)}</th>`).join("")}
            </tr></thead>
            <tbody>
              ${rowsHtml}
              <tr><td style="font-weight:700;font-size:12px;padding:6px 8px;border-top:2px solid var(--card-border)">Overall</td>${overallCells}</tr>
            </tbody>
          </table>
          <div style="font-size:10px;color:var(--text-light);margin-top:8px">Small numbers show the change from the previous selected year (in order) \u2014 green/+ for improvement, red/\u2013 for decline.</div>
        `;
      })();

  return `
    <div class="score-card" style="margin-top:16px;overflow-x:auto">
      <div class="sc-title">Compare Years</div>
      ${locationControlsHtml}
      <div style="margin:10px 0">${yearChips}</div>
      ${body}
    </div>
  `;
}

function renderComparisonsTab(tool, yearFilter, compareYears, locationFilter) {
  const allRecords = tool === "tool1" ? DB.tool1.all() : DB.tool2.all();
  const years = Array.from(new Set(allRecords.map(recordYear))).sort();
  const filtered = (!yearFilter || yearFilter === "All") ? allRecords : allRecords.filter(r => recordYear(r) === yearFilter);
  const isT1 = tool === "tool1";
  const scaleNote = isT1
    ? "Scores out of 2.00 \u2014 green \u2265 1.60, amber \u2265 1.00, red below"
    : "% of goals scored \u201cYes\u201d \u2014 green \u2265 51%, amber \u2265 25%, red below";

  const yearOptions = ["All", ...years].map(y => `<option value="${esc(y)}" ${y === (yearFilter || "All") ? "selected" : ""}>${esc(y)}</option>`).join("");
  const selectedYears = (compareYears && compareYears.length) ? compareYears.filter(y => years.includes(y)) : years.slice(-2);

  return `
    <div style="padding:16px 18px;display:flex;flex-direction:column;gap:14px;max-width:1100px">
      <div style="display:flex;align-items:center;gap:8px">
        <label style="font-size:12px;font-weight:700;color:var(--text-mid)">Year:</label>
        <select id="cmp-year">${yearOptions}</select>
        <span style="font-size:11px;color:var(--text-light);margin-left:8px">${esc(scaleNote)}</span>
      </div>
      ${renderHeatmapTable(tool, "By Setting", filtered, r => r.meta && r.meta.setting, "Setting")}
      ${renderHeatmapTable(tool, "By Zone", filtered, r => r.meta && r.meta.zone, "Zone")}
      ${renderYearComparisonSection(tool, allRecords, years, selectedYears, locationFilter)}
    </div>
  `;
}

// Generates an import template CSV from whatever this device's CURRENT Tool 1/Tool 2
// section definitions actually are — guaranteed to match, unlike a static file, since
// it's built from live data every time rather than a fixed snapshot that could drift
// out of sync if sections are ever customized via Settings.
function buildImportTemplateCSV(tool) {
  const isT1 = tool === "tool1";
  const sections = isT1 ? DB.tool1Sections.get() : DB.tool2Sections.get();
  const metaRows = isT1 ? [
    ["ID", "e.g. BUL001", "e.g. BUL002"],
    ["Date of Birth", "01/03/2020", "15/07/2019"],
    ["Age", "", ""],
    ["Gender", "M", "F"],
    ["Zone", "Example Zone", "Example Zone"],
    ["Setting", "Example Setting", "Example Setting"],
    ["Date of Assessment", "23/06/2026", "23/06/2026"],
    ["Facilitator", "Example Facilitator Name", "Example Facilitator Name"],
    ["Assessor", "Example Assessor Name", "Example Assessor Name"]
  ] : [
    ["Zone", "Example Zone", "Example Zone"],
    ["Setting", "Example Setting", "Example Setting 2"],
    ["Date of Assessment", "23/06/2026", "24/06/2026"],
    ["Facilitator", "Example Facilitator Name", "Example Facilitator Name"],
    ["Assessor", "Example Assessor Name", "Example Assessor Name"]
  ];
  const goalRows = [["Goal", "Score", "Score"]];
  const commentKeys = [];
  for (const data of Object.values(sections)) {
    for (const g of data.goals) goalRows.push([g, "", ""]);
    if (!commentKeys.includes(data.comment_key)) commentKeys.push(data.comment_key);
  }
  const commentRows = [["Comments"]];
  for (const key of commentKeys) commentRows.push([key, "", ""]);
  const rows = [...metaRows, [], ...goalRows, [], ...commentRows];
  return DB.toCSVRows(rows);
}

// ── Generic table rendering ─────────────────────────────────────────
function renderRecordsView(tool) {
  const isT1 = tool === "tool1";
  const main = document.getElementById("main");
  const state = { search: "", age: "All", setting: "All", facilitator: "All" };

  function buildRows() {
    const records = isT1 ? DB.tool1.all() : DB.tool2.all();
    return records.map((rec, i) => {
      const m = rec.meta || {};
      const scores = Object.values(rec.scores || {}).filter(v => v);
      let overall = "\u2014";
      if (isT1) {
        const sec = tool1SectionScores(rec);
        const all = Object.values(sec).flat();
        overall = all.length ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(2) : "\u2014";
      } else {
        const yes = Object.values(rec.scores || {}).filter(v => v === "Yes").length;
        overall = scores.length ? `${Math.round((yes / scores.length) * 100)}%` : "\u2014";
      }
      return {
        rec, idx: i,
        assessId: `A${String(i + 1).padStart(3, "0")}`,
        childId: isT1 ? (m.id || "") : "",
        date: m.date || "",
        age: isT1 ? (m.age || "") : "",
        gender: isT1 ? (m.gender || "") : "",
        lineItems: scores.length,
        setting: m.setting || "",
        assessor: m.assessor || "",
        facilitator: m.facilitator || "",
        zone: m.zone || "",
        overall
      };
    });
  }

  function applyFilters(rows) {
    return rows.filter(r => {
      if (state.age !== "All" && r.age !== state.age) return false;
      if (state.setting !== "All" && r.setting !== state.setting) return false;
      if (state.facilitator !== "All" && r.facilitator !== state.facilitator) return false;
      if (state.search) {
        const q = state.search.toLowerCase();
        const hay = [r.assessId, r.childId, r.date, r.setting, r.assessor, r.facilitator, r.zone].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function optionsFor(rows, key) {
    return ["All", ...Array.from(new Set(rows.map(r => r[key]).filter(Boolean))).sort()];
  }

  function draw() {
    const allRows = buildRows();
    const filtered = applyFilters(allRows);

    const headerCols = isT1
      ? `<th></th><th>Assessment</th><th>Child ID</th><th>Date</th><th>Status</th><th>Age</th><th>Gender</th><th>Line Items</th><th>Overall</th><th>Setting</th><th>Assessor</th><th>Facilitator</th><th>Zone</th><th></th>`
      : `<th></th><th>Assessment</th><th>Date</th><th>Status</th><th>Line Items</th><th>% Yes</th><th>Setting</th><th>Assessor</th><th>Facilitator</th><th>Zone</th><th></th>`;

    const bodyRows = filtered.map((r, i) => {
      const common = `<td>${i + 1}</td><td>${esc(r.assessId)}</td>`;
      const cells = isT1
        ? `${common}<td>${esc(r.childId)}</td><td>${esc(r.date)}</td><td><span class="status-dot">\u25CF</span> Completed</td><td>${esc(r.age)}</td><td>${esc(r.gender)}</td><td>${r.lineItems}</td><td>${esc(r.overall)}</td><td>${esc(r.setting)}</td><td>${esc(r.assessor)}</td><td>${esc(r.facilitator)}</td><td>${esc(r.zone)}</td>`
        : `${common}<td>${esc(r.date)}</td><td><span class="status-dot">\u25CF</span> Completed</td><td>${r.lineItems}</td><td>${esc(r.overall)}</td><td>${esc(r.setting)}</td><td>${esc(r.assessor)}</td><td>${esc(r.facilitator)}</td><td>${esc(r.zone)}</td>`;
      return `<tr data-id="${esc(r.rec.id)}">${cells}<td><button class="small-btn icon-btn-del" data-del="${esc(r.rec.id)}" title="Delete">\u2715</button></td></tr>`;
    }).join("");

    const syncAvailable = window.SheetsSync && SheetsSync.isConfigured();

    main.innerHTML = `
      <div class="tool-header">
        <div class="left">
          <button class="back-btn" id="rv-back">Back</button>
          <h2>${isT1 ? "Child Development Records" : "Environmental Records"}</h2>
        </div>
      </div>
      <div class="records-toolbar">
        <span class="count-label" id="rv-count"></span>
        <div style="display:flex;gap:8px">
          ${syncAvailable ? `<button class="btn btn-outline" id="rv-sync">\u2601 Pull Latest</button>` : ""}
          <button class="btn btn-outline" id="rv-download-template">Download Import Template</button>
          <button class="btn btn-primary" id="rv-import">+ Import CSV</button>
          <button class="btn btn-outline" id="rv-refresh">\u21BB Refresh</button>
        </div>
      </div>
      <div class="records-filterbar">
        <input id="rv-search" placeholder="\uD83D\uDD0D Search\u2026" style="width:180px" />
        ${isT1 ? `<label>Age:</label><select id="rv-age"></select>` : ""}
        <label>Setting:</label><select id="rv-setting"></select>
        <label>Facilitator:</label><select id="rv-facilitator"></select>
        <button class="btn btn-outline" id="rv-reset-filters" style="height:30px;padding:0 10px">Reset</button>
      </div>
      <div class="records-table-wrap">
        ${filtered.length ? `<table class="records-table"><thead><tr>${headerCols}</tr></thead><tbody>${bodyRows}</tbody></table>`
          : `<div class="empty-state">No records yet.<br/>Complete an assessment or import CSV files to see them here.</div>`}
      </div>
      <input type="file" id="rv-file-input" accept=".csv" multiple style="display:none" />
    `;

    document.getElementById("rv-back").onclick = () => window.App.navigate("dashboard");
    document.getElementById("rv-count").textContent = `${filtered.length} record${filtered.length !== 1 ? "s" : ""}` + (filtered.length !== allRows.length ? ` (of ${allRows.length})` : "");

    const searchEl = document.getElementById("rv-search");
    searchEl.value = state.search;
    searchEl.addEventListener("input", () => {
      state.search = searchEl.value;
      const cursorPos = searchEl.selectionStart;
      draw();
      // draw() rebuilds the whole page, including a brand-new search box that starts
      // unfocused — restore focus and cursor position so typing can continue without
      // needing to click back in after every character.
      const newSearchEl = document.getElementById("rv-search");
      if (newSearchEl) {
        newSearchEl.focus();
        newSearchEl.setSelectionRange(cursorPos, cursorPos);
      }
    });

    if (isT1) {
      const ageSel = document.getElementById("rv-age");
      ageSel.innerHTML = optionsFor(allRows, "age").map(o => `<option ${o === state.age ? "selected" : ""}>${esc(o)}</option>`).join("");
      ageSel.addEventListener("change", () => { state.age = ageSel.value; draw(); });
    }
    const settingSel = document.getElementById("rv-setting");
    settingSel.innerHTML = optionsFor(allRows, "setting").map(o => `<option ${o === state.setting ? "selected" : ""}>${esc(o)}</option>`).join("");
    settingSel.addEventListener("change", () => { state.setting = settingSel.value; draw(); });

    const facSel = document.getElementById("rv-facilitator");
    facSel.innerHTML = optionsFor(allRows, "facilitator").map(o => `<option ${o === state.facilitator ? "selected" : ""}>${esc(o)}</option>`).join("");
    facSel.addEventListener("change", () => { state.facilitator = facSel.value; draw(); });

    document.getElementById("rv-reset-filters").onclick = () => { state.search = ""; state.age = "All"; state.setting = "All"; state.facilitator = "All"; draw(); };
    document.getElementById("rv-refresh").onclick = () => draw();

    const syncBtn = document.getElementById("rv-sync");
    if (syncBtn) {
      syncBtn.onclick = async () => {
        syncBtn.disabled = true;
        syncBtn.textContent = "Pulling\u2026";
        try {
          const n = await SheetsSync.syncNow(tool);
          toast(`Pulled ${n} updated record(s) from the shared sheet.`, "success");
          if (isT1) renderZonePanel();
        } catch (e) {
          toast("Cloud sync failed: " + e.message, "error");
        }
        draw();
      };
    }

    document.getElementById("rv-download-template").onclick = () => {
      const csv = buildImportTemplateCSV(tool);
      DB.downloadText(`${tool}_import_template.csv`, csv);
      toast("Template downloaded, matching this device's current sections.", "success");
    };

    const fileInput = document.getElementById("rv-file-input");
    document.getElementById("rv-import").onclick = () => fileInput.click();
    fileInput.onchange = async () => {
      const files = Array.from(fileInput.files || []);
      let count = 0;
      const savedRecords = [];
      for (const file of files) {
        try {
          const text = await file.text();
          const rows = DB.parseCSV(text);
          const parsedRecords = isT1 ? DB.tool1FromCSVRows(rows) : DB.tool2FromCSVRows(rows);
          for (const rec of parsedRecords) {
            // Skip completely blank columns (e.g. a stray empty column in the source file)
            const hasMeta = Object.values(rec.meta || {}).some(v => v);
            const hasScores = Object.values(rec.scores || {}).some(v => v);
            if (!hasMeta && !hasScores) continue;
            const saved = isT1 ? DB.tool1.save(rec) : DB.tool2.save(rec);
            savedRecords.push(saved);
            count++;
          }
        } catch (e) { console.error(e); }
      }
      toast(`Imported ${count} record${count !== 1 ? "s" : ""}.`, "success");
      fileInput.value = "";
      if (isT1) renderZonePanel();
      draw();

      // Queues each imported record for the shared Google Sheet, if Cloud Sync is set
      // up. Anything that doesn't push successfully right now stays safely queued and
      // retries automatically once back online — never just reported as failed and left.
      if (window.SheetsSync && SheetsSync.isConfigured() && savedRecords.length) {
        savedRecords.forEach(rec => DB.syncQueue.add(tool, rec.id));
        await flushSyncQueue();
        const stillPending = savedRecords.filter(rec => DB.syncQueue.has(tool, rec.id)).length;
        const synced = savedRecords.length - stillPending;
        if (stillPending === 0) {
          toast(`Synced ${synced} imported record${synced !== 1 ? "s" : ""} to the shared sheet.`, "success");
        } else {
          toast(`Synced ${synced}, ${stillPending} queued to sync automatically once back online.`, "");
        }
      }
    };

    main.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const ok = await confirmDialog("Delete this assessment record? This cannot be undone.", "Delete Record");
        if (!ok) return;
        if (isT1) DB.tool1.remove(btn.dataset.del); else DB.tool2.remove(btn.dataset.del);
        toast("Record deleted.");
        if (isT1) renderZonePanel();
        draw();
      });
    });

    main.querySelectorAll("tr[data-id]").forEach(row => {
      row.addEventListener("click", () => renderRecordDetail(tool, row.dataset.id, draw));
    });
  }

  draw();
}

// ── Detail view ──────────────────────────────────────────────────────
function renderRecordDetail(tool, id, onBack) {
  const isT1 = tool === "tool1";
  const main = document.getElementById("main");
  const rec = isT1 ? DB.tool1.get(id) : DB.tool2.get(id);
  if (!rec) { onBack(); return; }
  const m = rec.meta || {};

  let leftHtml, rightExtra;
  if (isT1) {
    const sectionScores = tool1SectionScores(rec);
    const averages = tool1Averages(sectionScores);
    const cards = Object.entries(SECTION_LABELS).map(([prefix, label]) => {
      const d = averages[prefix];
      const body = d.total === null ? "No scored items" : `Average: ${d.average.toFixed(2)}   |   Scored items: ${d.count}`;
      return `<div class="score-card"><div class="sc-title">${prefix} \u2014 ${esc(label)}</div><div class="sc-body">${esc(body)}</div></div>`;
    }).join("");
    const all = Object.values(sectionScores).flat();
    const overall = all.length ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(2) : null;
    leftHtml = `${cards}<div class="score-card"><div class="sc-title">Overall Average</div><div class="sc-body" style="font-size:20px;font-weight:700;color:var(--accent)">${overall !== null ? overall : "No scored items"}</div></div>`;
    rightExtra = `<h4>Skill Summary</h4><pre>${esc(tool1SkillSummary(averages))}</pre>`;
  } else {
    const sections = DB.tool2Sections.get();
    const summary = tool2SectionSummary(rec, sections);
    leftHtml = Object.entries(summary).map(([title, s]) => {
      const pct = s.total ? Math.round((s.yes / s.total) * 100) : null;
      const body = s.total === 0 ? "No scored items" : `Yes: ${s.yes}   |   No: ${s.no}   |   ${pct}% Yes`;
      return `<div class="score-card"><div class="sc-title">${esc(title)}</div><div class="sc-body">${esc(body)}</div></div>`;
    }).join("");
    const totalYes = Object.values(rec.scores || {}).filter(v => v === "Yes").length;
    const totalScored = Object.values(rec.scores || {}).filter(v => v).length;
    const overallPct = totalScored ? Math.round((totalYes / totalScored) * 100) : null;
    leftHtml += `<div class="score-card"><div class="sc-title">Overall</div><div class="sc-body" style="font-size:20px;font-weight:700;color:var(--accent)">${overallPct !== null ? overallPct + "% Yes" : "No scored items"}</div></div>`;
    rightExtra = "";
  }

  const commentsHtml = Object.entries(rec.comments || {}).filter(([, v]) => v).map(([k, v]) =>
    `<div class="c-item"><div class="c-key">${esc(k)}</div><div>${esc(v)}</div></div>`).join("") || `<div style="color:var(--text-light)">No comments recorded.</div>`;

  main.innerHTML = `
    <div class="tool-header">
      <div class="left">
        <button class="back-btn" id="rd-back">\u2190 Back</button>
        <h2 style="font-size:16px">${isT1 ? `Child ${esc(m.id || "\u2014")}` : `Environmental \u2013 ${esc(m.setting || "Assessment")}`}</h2>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline" id="rd-export">Export CSV</button>
        <button class="btn btn-primary" id="rd-edit">Edit</button>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-left">${leftHtml}</div>
      <div>
        <div class="meta-grid">
          ${isT1 ? `
            <div class="meta-field"><div class="mf-label">ID</div><div class="mf-value">${esc(m.id || "\u2014")}</div></div>
            <div class="meta-field"><div class="mf-label">Age</div><div class="mf-value">${esc(m.age || "\u2014")}</div></div>
            <div class="meta-field"><div class="mf-label">Gender</div><div class="mf-value">${esc(m.gender || "\u2014")}</div></div>
            <div class="meta-field"><div class="mf-label">Date</div><div class="mf-value">${esc(m.date || "\u2014")}</div></div>
          ` : `
            <div class="meta-field"><div class="mf-label">Zone</div><div class="mf-value">${esc(m.zone || "\u2014")}</div></div>
            <div class="meta-field"><div class="mf-label">Date</div><div class="mf-value">${esc(m.date || "\u2014")}</div></div>
          `}
          <div class="meta-field"><div class="mf-label">Facilitator</div><div class="mf-value">${esc(m.facilitator || "\u2014")}</div></div>
          <div class="meta-field"><div class="mf-label">Setting</div><div class="mf-value">${esc(m.setting || "\u2014")}</div></div>
          <div class="meta-field"><div class="mf-label">Assessor</div><div class="mf-value">${esc(m.assessor || "\u2014")}</div></div>
          ${!isT1 ? `<div class="meta-field"><div class="mf-label">Zone</div><div class="mf-value">${esc(m.zone || "\u2014")}</div></div>` : ""}
        </div>
        <div class="summary-card">
          ${rightExtra}
          <h4 style="margin-top:${rightExtra ? "10px" : "0"}">Comments</h4>
          <div class="comments-list">${commentsHtml}</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("rd-back").onclick = onBack;
  document.getElementById("rd-edit").onclick = () => {
    if (isT1) renderTool1(rec.id); else renderTool2(rec.id);
    renderSidebar(isT1 ? "tool1" : "tool2");
  };
  document.getElementById("rd-export").onclick = () => {
    const csv = isT1 ? DB.toCSVRows(DB.tool1ToCSVRows(rec)) : DB.toCSVRows(DB.tool2ToCSVRows(rec));
    const name = isT1 ? `assessment_${(m.id || "student")}.csv` : `assessment_tool2_${rec.id}.csv`;
    DB.downloadText(name, csv);
  };
}

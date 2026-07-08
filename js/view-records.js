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
    searchEl.addEventListener("input", () => { state.search = searchEl.value; draw(); });

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

    const fileInput = document.getElementById("rv-file-input");
    document.getElementById("rv-import").onclick = () => fileInput.click();
    fileInput.onchange = async () => {
      const files = Array.from(fileInput.files || []);
      let count = 0;
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
            if (isT1) DB.tool1.save(rec); else DB.tool2.save(rec);
            count++;
          }
        } catch (e) { console.error(e); }
      }
      toast(`Imported ${count} record${count !== 1 ? "s" : ""}.`, "success");
      fileInput.value = "";
      if (isT1) renderZonePanel();
      draw();
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

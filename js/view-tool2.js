/* view-tool2.js — Environmental Tool data entry. */

function renderTool2(existingId) {
  const main = document.getElementById("main");
  const sections = DB.tool2Sections.get();
  const values = DB.values.get();
  const existing = existingId ? DB.tool2.get(existingId) : null;

  const meta = existing ? existing.meta : {
    zone: (values.Zone && values.Zone[0]) || "",
    setting: (values.Setting && values.Setting[0]) || "",
    date: new Date().toLocaleDateString("en-GB"),
    facilitator: (values.Facilitator && values.Facilitator[0]) || "",
    assessor: (values.Assessor && values.Assessor[0]) || ""
  };
  const scores = existing ? { ...existing.scores } : {};
  const comments = existing ? { ...existing.comments } : {};

  function dropdown(name, current, options, width) {
    return `<select data-field="${name}" style="min-width:${width || 110}px">
      ${options.map(o => `<option value="${esc(o)}" ${o === current ? "selected" : ""}>${esc(o)}</option>`).join("")}
    </select>`;
  }

  const sectionsHtml = Object.entries(sections).map(([title, data]) => {
    const goalRows = data.goals.map(goal => {
      const label = goal.includes(":") ? goal.split(":").slice(1).join(":").trim() : goal;
      const current = scores[goal] || "";
      const btns = TOOL2_SCORE_OPTIONS.map(opt => {
        const selected = current === opt;
        const c = TOOL2_SCORE_COLORS[opt];
        const style = selected ? `background:${c.bg};color:${c.fg}` : "";
        return `<button type="button" class="score-btn" data-goal="${esc(goal)}" data-val="${opt}" style="${style}">${opt}</button>`;
      }).join("");
      return `<div class="goal-row"><span class="goal-text">${esc(label)}</span><div class="score-btns">${btns}</div></div>`;
    }).join("");
    return `<div class="section-panel">
      <div class="sp-header"><h4>${esc(title)}</h4></div>
      ${goalRows}
      <div class="sp-divider"></div>
      <div class="sp-comments">
        <label>Additional Comments:</label>
        <textarea data-comment="${esc(data.comment_key)}">${esc(comments[data.comment_key] || "")}</textarea>
      </div>
    </div>`;
  }).join("");

  main.innerHTML = `
    <div class="tool-header">
      <div class="left">
        <button class="back-btn" id="t2-back">Back</button>
        <h2>Environmental Tool</h2>
      </div>
      <div class="legend">
        <span class="chip" style="background:#bbf7d0;color:#14532d">Yes</span>
        <span class="chip" style="background:#fecaca;color:#7f1d1d">No</span>
      </div>
    </div>
    <div class="info-bar">
      <div class="info-row">
        <div class="field-col"><label>Zone</label>${dropdown("zone", meta.zone, values.Zone || [], 150)}</div>
        <div class="field-col"><label>Setting</label>${dropdown("setting", meta.setting, values.Setting || [], 150)}</div>
        <div class="field-col"><label>Date of Assessment</label><input data-field="date" value="${esc(meta.date)}" style="width:120px" /></div>
        <div class="field-col"><label>Facilitator</label>${dropdown("facilitator", meta.facilitator, values.Facilitator || [], 220)}</div>
        <div class="field-col"><label>Assessor</label>${dropdown("assessor", meta.assessor, values.Assessor || [], 220)}</div>
      </div>
    </div>
    <div class="sections-scroll">${sectionsHtml}</div>
    <div class="tool-footer">
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" id="t2-save">Save as CSV</button>
        <button class="btn btn-outline" id="t2-export-csv">Export CSV</button>
      </div>
      <div class="progress-wrap">
        <div class="progress-track"><div class="progress-fill" id="t2-progress-fill" style="width:0%"></div></div>
        <span class="progress-label" id="t2-progress-label">0/0 scored</span>
      </div>
      <button class="btn btn-grey" id="t2-reset">Reset Form</button>
    </div>
  `;

  document.getElementById("t2-back").onclick = () => window.App.navigate("dashboard");

  main.querySelectorAll("[data-field]").forEach(el => {
    el.addEventListener("input", () => { meta[el.dataset.field] = el.value; });
    el.addEventListener("change", () => { meta[el.dataset.field] = el.value; });
  });
  main.querySelectorAll("[data-comment]").forEach(el => {
    el.addEventListener("input", () => { comments[el.dataset.comment] = el.value; });
  });

  function updateProgress() {
    const totalGoals = Object.values(sections).reduce((n, s) => n + s.goals.length, 0);
    const done = Object.values(scores).filter(v => v).length;
    document.getElementById("t2-progress-fill").style.width = totalGoals ? `${(done / totalGoals) * 100}%` : "0%";
    document.getElementById("t2-progress-label").textContent = `${done}/${totalGoals} scored`;
  }

  main.querySelectorAll(".score-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const goal = btn.dataset.goal, val = btn.dataset.val;
      scores[goal] = scores[goal] === val ? "" : val;
      main.querySelectorAll(`.score-btn[data-goal="${CSS.escape(goal)}"]`).forEach(b => {
        const selected = scores[goal] === b.dataset.val;
        const c = TOOL2_SCORE_COLORS[b.dataset.val];
        b.style.cssText = selected ? `background:${c.bg};color:${c.fg}` : "";
      });
      updateProgress();
    });
  });

  updateProgress();

  function collect() {
    return { id: existing ? existing.id : undefined, meta: { ...meta }, scores: { ...scores }, comments: { ...comments } };
  }

  document.getElementById("t2-save").onclick = () => {
    const rec = DB.tool2.save(collect());
    toast("Assessment saved.", "success");
    renderTool2(rec.id);

    if (window.SheetsSync && SheetsSync.isConfigured()) {
      SheetsSync.pushRecord("tool2", rec)
        .then(() => toast("Synced to shared sheet.", "success"))
        .catch(err => toast("Saved locally, but cloud sync failed: " + err.message, "error"));
    }
  };

  document.getElementById("t2-export-csv").onclick = () => {
    const rec = collect();
    if (!rec.id) rec.id = DB.uid();
    const csv = DB.toCSVRows(DB.tool2ToCSVRows(rec));
    const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
    DB.downloadText(`assessment_tool2_${stamp}.csv`, csv);
  };

  document.getElementById("t2-reset").onclick = async () => {
    const ok = await confirmDialog("Clear all scores and comments?", "Reset Form");
    if (ok) renderTool2();
  };
}

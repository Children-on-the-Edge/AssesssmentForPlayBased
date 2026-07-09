/* view-dashboard.js — the Home screen: banner, quick stats, and navigation cards.
 * Charts, comparisons, and the Action Plan all live on the Reports page now
 * (see reports.js) rather than here.
 */

function getQuickStats() {
  const t1 = DB.tool1.all();
  const zones = new Set();
  let allScores = [];
  for (const rec of t1) {
    const z = (rec.meta && rec.meta.zone || "").trim();
    if (z) zones.add(z);
    for (const score of Object.values(rec.scores || {})) {
      const v = TOOL1_NUMERIC[score];
      if (v !== undefined) allScores.push(v);
    }
  }
  const avg = allScores.length ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2) : "\u2014";
  return { total: t1.length, zones: zones.size, avg };
}

function renderDashboard() {
  const main = document.getElementById("main");
  const stats = getQuickStats();

  main.innerHTML = `
    <div class="dash-pad">
      <div class="banner">
        <h1>Welcome back</h1>
        <p>Select a tool below to begin an assessment, or view records and reports.</p>
      </div>

      <div class="stats-row">
        <div class="stat-card"><div class="stat-val" style="color:var(--accent)">${stats.total}</div><div class="stat-label">Total Assessments</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--accent2)">${stats.zones}</div><div class="stat-label">Zones Active</div></div>
        <div class="stat-card"><div class="stat-val" style="color:var(--green)">${stats.avg}</div><div class="stat-label">Overall Avg Score</div></div>
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
        <div class="nav-card" style="--stripe:var(--accent2)" data-go="reports">
          <h4>Reports</h4>
          <p>Charts, Zone/Setting comparisons, and the Action Plan generator.</p>
          <button class="go-btn">Open &rarr;</button>
        </div>
      </div>
    </div>
  `;
  main.querySelectorAll("[data-go]").forEach(card => {
    card.addEventListener("click", () => window.App.navigate(card.dataset.go));
  });
}

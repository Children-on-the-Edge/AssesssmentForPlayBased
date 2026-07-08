/* app.js — router and bootstrap. */

const App = (() => {
  let current = "dashboard";

  function navigate(key, arg) {
    current = key;
    renderSidebar(key);
    if (key === "dashboard") renderDashboard();
    else if (key === "tool1") renderTool1(arg);
    else if (key === "tool2") renderTool2(arg);
    else if (key === "tool1records") renderRecordsView("tool1");
    else if (key === "tool2records") renderRecordsView("tool2");
    else if (key === "cloudsync") renderCloudSyncPage();
    else if (key === "settings") gotoSettings();
  }

  async function gotoSettings() {
    const ok = await openLoginModal();
    if (ok) {
      renderSidebar("settings");
      renderSettings();
    } else {
      navigate("dashboard");
    }
  }

  async function boot() {
    await DB.init();
    if (applyOrgSetupLinkIfPresent()) {
      toast("Organization setup applied to this device.", "success");
    }
    renderZonePanel();
    navigate("dashboard");

    // Mobile hamburger menu: slides the sidebar in as an overlay with a dimmed backdrop.
    // Only relevant below the 760px breakpoint (see styles.css) — harmless no-op above it.
    const hamburgerBtn = document.getElementById("hamburger-btn");
    const backdrop = document.getElementById("sidebar-backdrop");
    const sidebar = document.getElementById("sidebar");
    function closeMobileMenu() {
      if (sidebar) sidebar.classList.remove("open");
      if (backdrop) backdrop.classList.remove("open");
    }
    function openMobileMenu() {
      if (sidebar) sidebar.classList.add("open");
      if (backdrop) backdrop.classList.add("open");
    }
    if (hamburgerBtn) {
      hamburgerBtn.addEventListener("click", () => {
        if (sidebar && sidebar.classList.contains("open")) closeMobileMenu();
        else openMobileMenu();
      });
    }
    if (backdrop) backdrop.addEventListener("click", closeMobileMenu);
    window.closeMobileMenu = closeMobileMenu; // so renderSidebar can close the drawer after navigating

    if ("serviceWorker" in navigator) {
      try { await navigator.serviceWorker.register("sw.js"); } catch (e) { console.warn("SW registration failed", e); }
    }
  }

  return { navigate, boot };
})();

window.App = App;
document.addEventListener("DOMContentLoaded", () => App.boot());

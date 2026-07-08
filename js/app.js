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
    renderZonePanel();
    navigate("dashboard");

    if ("serviceWorker" in navigator) {
      try { await navigator.serviceWorker.register("sw.js"); } catch (e) { console.warn("SW registration failed", e); }
    }
  }

  return { navigate, boot };
})();

window.App = App;
document.addEventListener("DOMContentLoaded", () => App.boot());

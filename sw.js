/* sw.js — offline cache for the PPAT app shell. */
const CACHE_NAME = "ppat-cache-v33";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/data.js",
  "./js/db.js",
  "./js/sheets-sync.js",
  "./js/sync-queue.js",
  "./js/org-setup.js",
  "./js/ui.js",
  "./js/view-dashboard.js",
  "./js/view-tool1.js",
  "./js/view-tool2.js",
  "./js/view-records.js",
  "./js/action-plan.js",
  "./js/reports.js",
  "./js/view-settings.js",
  "./js/app.js",
  "./icons/logo-original.png",
  "./icons/logo-cote.png",
  "./icons/logo-learntoplay.png",
  "./icons/icon-16.png",
  "./icons/icon-32.png",
  "./icons/icon-48.png",
  "./icons/icon-72.png",
  "./icons/icon-96.png",
  "./icons/icon-128.png",
  "./icons/icon-144.png",
  "./icons/icon-152.png",
  "./icons/icon-192.png",
  "./icons/icon-256.png",
  "./icons/icon-384.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Never cache calls to the Sheets API or Google sign-in — those need to always hit the
  // network. (Deliberately specific here, not a blanket "googleapis.com" check, so that
  // fonts.googleapis.com / fonts.gstatic.com still get cached normally for offline use.)
  if (event.request.url.includes("sheets.googleapis.com") || event.request.url.includes("www.googleapis.com") || event.request.url.includes("accounts.google.com")) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
    })
  );
});

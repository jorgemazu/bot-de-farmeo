/* Bot de farmeo 1.0.18-pwa — scope /bot-de-farmeo/ — cache de assets, nunca la API de keepalive */
const CACHE = "bf-pwa-1.0.18";
const PRECACHE = [
  "/bot-de-farmeo/",
  "/bot-de-farmeo/index.html",
  "/bot-de-farmeo/manifest.json",
  "/bot-de-farmeo/app.js",
  "/bot-de-farmeo/hc-ini.js",
  "/bot-de-farmeo/editor-secciones.js",
  "/bot-de-farmeo/editor-mapa.js",
  "/bot-de-farmeo/combos.js",
  "/bot-de-farmeo/i18n-ui.js",
  "/bot-de-farmeo/farm-formato.js",
  "/bot-de-farmeo/apple-touch-icon.png",
  "/bot-de-farmeo/icon-192.png",
  "/bot-de-farmeo/icon-512.png",
  "/bot-de-farmeo/icon-192-maskable.png",
  "/bot-de-farmeo/icon-512-maskable.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const dest = req.destination;
  const isMap = url.pathname.indexOf("/mapas") >= 0;
  const isShell = !isMap && (dest === "document" || dest === "script" || dest === "style" || url.pathname.endsWith(".json") || url.pathname.endsWith(".html") || url.pathname.endsWith("/"));

  if (isShell) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match("./index.html");
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});

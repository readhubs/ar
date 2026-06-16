/**
 * sw.js — Service Worker for Readhubs PWA
 * Caches static assets for offline shell rendering.
 * The courses-raw/*.txt files are NOT cached (always fresh from network).
 */

const CACHE_NAME = "readhubs-v1";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./article.html",
  "./course.html",
  "./deals.html",
  "./about.html",
  "./sitemap-builder.html",
  "./style.css",
  "./courses-data.js",
  "./article-engine.js",
  "./floating-button.js",
  "./manifest.json",
  "./niches/money.html",
  "./niches/communication.html",
  "./niches/mental-health.html",
  "./niches/productivity.html",
  "./niches/career.html",
  "./admin/upload.html"
];

/* ── Install: pre-cache static shell ── */
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* ── Activate: clean old caches ── */
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ── Fetch: network-first for txt files, cache-first for static ── */
self.addEventListener("fetch", function (event) {
  const url = event.request.url;

  // Always network-first for course txt files and courses-data.js
  if (url.includes("courses-raw/") || url.includes("courses-data.js")) {
    event.respondWith(
      fetch(event.request).catch(function () {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request).then(function (response) {
        // Cache successful GET responses for static files
        if (
          event.request.method === "GET" &&
          response.status === 200 &&
          !url.includes("chrome-extension")
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function () {
        // Offline fallback for HTML pages
        if (event.request.headers.get("accept") && event.request.headers.get("accept").includes("text/html")) {
          return caches.match("./index.html");
        }
      });
    })
  );
});

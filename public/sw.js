const CACHE_NAME = "baste-yab-v1";

const scopeUrl = (rel) => new URL(rel, self.registration.scope).toString();

self.addEventListener("install", (event) => {
  const coreAssets = [
    "./",
    "manifest.webmanifest",
    "icon.svg",
    "pwa-192x192.png",
    "apple-touch-icon.png",
  ].map(scopeUrl);

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.allSettled(coreAssets.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes("webpack-hmr") || url.pathname.includes("__nextjs")) return;

  // Navigation requests: network-first so daily data updates arrive immediately,
  // with offline fallback to cached app shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match(scopeUrl("./")) || Response.error();
        }),
    );
    return;
  }

  // Static assets (_next/static, fonts, icons, styles): stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((res) => {
          if (res && res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => cached || Response.error());

      return cached || networkFetch;
    }),
  );
});

// Service Worker der Community-Exchange-App.
// Bewusst schlank: macht die App installierbar, beschleunigt wiederholte
// Aufrufe (statische Assets aus dem Cache) und zeigt offline eine
// Auffang-Seite. Live-Daten (/api/*) laufen IMMER über das Netzwerk.

const CACHE = 'ce-shell-v1';
const PRECACHE = ['/', '/offline.html'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Live-Daten niemals cachen.
  if (url.pathname.startsWith('/api/')) return;

  // Seitenaufrufe: erst Netzwerk, offline → App-Shell bzw. Offline-Seite.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match(request)
          .then(r => r || caches.match('/'))
          .then(r => r || caches.match('/offline.html')),
      ),
    );
    return;
  }

  // Statische Assets: cache-first, sonst Netzwerk (und nachcachen).
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/lageplan/') ||
    url.pathname === '/icon' ||
    url.pathname === '/apple-icon' ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(
      caches.match(request).then(
        cached =>
          cached ||
          fetch(request).then(res => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then(c => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
  }
});

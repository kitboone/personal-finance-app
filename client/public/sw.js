// Service worker for the Ledger PWA. Deliberately small (no Workbox), matching
// the project's hand-rolled ethos. It caches the app shell + static assets so
// the installed app opens instantly and survives brief connectivity blips.
//
// Two rules it never breaks:
//   - /api requests are NEVER cached (user data behind Clerk auth — always live).
//   - cross-origin requests (e.g. Clerk's SDK) pass straight through.
//
// Bump CACHE when the shell handling changes to retire old caches on activate.
const CACHE = 'ledger-shell-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // let Clerk etc. pass through
  if (url.pathname.startsWith('/api')) return; // never cache user data

  // Page navigations: network-first (fresh app on deploy), fall back to the
  // cached shell when offline so deep links still open.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }

  // Static assets (hashed filenames): cache-first, filling the cache on miss.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});

/*
 * Service worker for NEXGram.
 *
 * The target user is a shopkeeper on a rural connection, so the goals are: the
 * app opens at all when the network is bad, and the last thing they read is
 * still there when it drops entirely.
 *
 * Two strategies, chosen per request:
 *
 *   App shell (HTML, JS, CSS, icons) - cache first, refreshed in the background.
 *     These change only on deploy, so serving the cached copy instantly is both
 *     correct and much faster on a weak link.
 *
 *   API reads (GET /api/...) - network first, falling back to the last good
 *     response. Stale intelligence clearly labelled beats a blank screen; the
 *     fallback is marked with a header the app reads to say so.
 *
 * Writes are never cached or queued. Placing an order or changing stock must
 * reach the server and be confirmed - silently "succeeding" offline and
 * replaying later could double-order against someone's working capital.
 */

const VERSION = 'nexgram-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const API_CACHE = `${VERSION}-api`;

const SHELL_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      // Individually, so one missing asset cannot fail the whole install.
      .then((cache) => Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

async function networkFirst(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (!cached) throw error;

    // Tell the app this is stale so it can say so rather than passing old
    // numbers off as current. A custom header would not survive: these are
    // cross-origin CORS responses, so the browser strips anything the server
    // did not list in Access-Control-Expose-Headers. Messaging the clients
    // directly avoids that entirely.
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => client.postMessage({ type: 'nexgram:stale', url: request.url }));

    return cached;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Refresh in the background; the next open gets the newer copy.
    fetch(request)
      .then((response) => {
        if (response.ok) caches.open(SHELL_CACHE).then((cache) => cache.put(request, response));
      })
      .catch(() => {});
    return cached;
  }

  const response = await fetch(request);
  if (response.ok && request.method === 'GET') {
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin && !isApiRequest(url)) return;

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // SPA navigation: network first, but keep the shell fresh on every success.
  // Without re-caching here the install-time index.html would be served forever
  // and keep pointing at asset hashes from an older deploy.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('/index.html').then((r) => r || Response.error())),
    );
    return;
  }

  event.respondWith(cacheFirst(request));
});

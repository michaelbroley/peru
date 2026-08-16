/*
 * Peru Field Guide — offline service worker.
 *
 * The guide is one static page with inlined CSS, so "works offline" means
 * caching that page plus the fonts and icons. Strategy:
 *   - navigations: network first, fall back to the cached page (so a fresh
 *     copy wins when there's signal, and the Andes get the cached one)
 *   - everything else same-origin: cache first, since fonts never change
 *     without a new build
 *
 * Bump CACHE when the content changes — old caches are dropped on activate.
 */

const CACHE = 'peru-guide-v18';

/**
 * Map tiles live in their own capped cache: they're third-party, there can be
 * a lot of them, and they should survive a content release rather than being
 * dropped with the page cache. A map you looked at on hotel wifi still draws
 * later with no signal.
 */
const TILE_CACHE = 'peru-tiles-v1';
const TILE_LIMIT = 400;
const TILE_HOSTS = ['basemaps.cartocdn.com', 'tile.openstreetmap.de', 'tile.openstreetmap.org'];

const PRECACHE = [
  '/',
  '/404',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/vendor/leaflet/leaflet.js',
  '/vendor/leaflet/leaflet.css',
  '/fonts/anton-latin.woff2',
  '/fonts/anton-latin-ext.woff2',
  '/fonts/worksans-latin.woff2',
  '/fonts/worksans-latin-ext.woff2',
  '/fonts/worksans-italic-latin.woff',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/icon-180.png',
  '/llama/chaska-4x.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll is all-or-nothing; add individually so one 404 can't
      // leave the whole guide uncached.
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE && key !== TILE_CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Oldest-first eviction; the cache keeps insertion order. */
async function trimCache(name, limit) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  await Promise.all(keys.slice(0, keys.length - limit).map((key) => cache.delete(key)));
}

async function tileFirst(request) {
  const cache = await caches.open(TILE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    // Tile CDNs answer cross-origin requests opaquely unless CORS is set;
    // either kind is worth keeping, we just can't inspect an opaque one.
    if (response.ok || response.type === 'opaque') {
      await cache.put(request, response.clone());
      trimCache(TILE_CACHE, TILE_LIMIT);
    }
    return response;
  } catch (error) {
    // No signal and no cached tile — let Leaflet's tileerror handler show
    // the "map tiles need a signal" note.
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (TILE_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
    event.respondWith(tileFirst(request));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});

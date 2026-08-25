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

const CACHE = 'peru-guide-v36';

/**
 * Map tiles live in their own capped cache: they're third-party, there can be
 * a lot of them, and they should survive a content release rather than being
 * dropped with the page cache. A map you looked at on hotel wifi still draws
 * later with no signal.
 */
const TILE_CACHE = 'peru-tiles-v1';
const TILE_LIMIT = 400;
const TILE_HOSTS = ['basemaps.cartocdn.com', 'tile.openstreetmap.de', 'tile.openstreetmap.org'];

/**
 * The tiles that ship with the build, under /tiles/ — about 300 of them,
 * enough for every map at its default view, two zooms in and three out.
 *
 * They get a cache of their own, uncapped: TILE_CACHE evicts oldest-first at
 * 400, and a wander around the Lima map would otherwise quietly throw away the
 * very tiles that make the guide work on a plane. Bump the version when the
 * tile set changes; nothing else drops it.
 */
const BAKED_TILES = 'peru-tiles-baked-v1';
const BAKED_MANIFEST = '/tiles/manifest.json';

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
  '/llama/pancho-4x.webp',
  '/habitat/backdrop1.webp',
  '/habitat/backdrop2.webp',
  '/habitat/backdrop3.webp',
  '/habitat/backdrop4.webp',
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

/**
 * Pull the baked tiles down in the background.
 *
 * Deliberately not part of install: it's a few megabytes, and holding up the
 * service worker — and with it the offline guarantee for the guide itself —
 * behind a pile of map tiles gets the priority backwards. The maps also cache
 * on view, so this is a head start rather than the only way they get there.
 *
 * A deploy with no tiles baked in just 404s on the manifest and does nothing,
 * which is the behaviour before any of this existed.
 */
async function warmBakedTiles() {
  try {
    const manifest = await fetch(BAKED_MANIFEST, { cache: 'no-cache' });
    if (!manifest.ok) return;
    const tiles = await manifest.json();
    if (!Array.isArray(tiles)) return;

    const cache = await caches.open(BAKED_TILES);
    for (const tile of tiles) {
      const url = `/tiles/${tile}.png`;
      if (await cache.match(url)) continue;
      try {
        const response = await fetch(url);
        if (response.ok) await cache.put(url, response);
      } catch {
        /* one missing tile is a hole in a map, not a reason to stop */
      }
    }
  } catch {
    /* no manifest, no signal, no problem */
  }
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE && key !== TILE_CACHE && key !== BAKED_TILES)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim())
      // Not awaited: activation shouldn't wait on megabytes of map.
      .then(() => {
        warmBakedTiles();
      }),
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

  // Baked tiles: cache first out of their own cache, then the file itself.
  if (url.origin === self.location.origin && url.pathname.startsWith('/tiles/')) {
    event.respondWith(
      caches.open(BAKED_TILES).then((cache) =>
        cache.match(request).then((hit) => {
          if (hit) return hit;
          return fetch(request)
            .then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
            // Not baked and no signal — Leaflet's handler falls back to the CDN.
            .catch(() => Response.error());
        }),
      ),
    );
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

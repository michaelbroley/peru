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

const CACHE = 'peru-guide-v1';

const PRECACHE = [
  '/',
  '/404',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/fonts/anton-latin.woff2',
  '/fonts/anton-latin-ext.woff2',
  '/fonts/worksans-latin.woff2',
  '/fonts/worksans-latin-ext.woff2',
  '/fonts/worksans-italic-latin.woff',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/icon-180.png',
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
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
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

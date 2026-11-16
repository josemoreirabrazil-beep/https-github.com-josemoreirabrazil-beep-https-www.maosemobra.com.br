// Service Worker for "Mãos em Obra" PWA
const CACHE_NAME = 'maos-em-obra-v4';
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache error:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // CRITICAL: NEVER cache API calls, Vite internals, node_modules, source code, JS/CSS bundles or hot reload queries
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/node_modules/') ||
    url.pathname.includes('/@') ||
    url.pathname.includes('.vite') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.jsx') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.searchParams.has('v') ||
    url.searchParams.has('t') ||
    url.hostname === 'localhost' ||
    url.hostname.includes('ais-dev-')
  ) {
    return;
  }

  // Always use Network-First for HTML navigation requests so updates deploy immediately
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    );
    return;
  }

  // Only cache same-origin static image/font assets
  if (url.origin === self.location.origin) {
    const isStaticAsset = url.pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|woff2?|ttf|eot)$/i);
    if (!isStaticAsset) {
      return;
    }
  } else {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});

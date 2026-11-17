// Service Worker for "Mãos em Obra" PWA
// - Stale-While-Revalidate para shell crítico (index.html, assets principais, ícones e manifest)
// - Network-First para dados de obra/plataforma (/api/* não administrativos)
// - Network-Only estrito para rotas Admin Master, Mercado Pago, Recebimentos, Fiscal e Auth

const SHELL_CACHE = 'maos-em-obra-shell-v9';
const PROJECT_DATA_CACHE = 'maos-em-obra-data-v2';
const ACTIVE_CACHES = new Set([SHELL_CACHE, PROJECT_DATA_CACHE]);

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
];

const SENSITIVE_RESTRICTED_API_PREFIXES = [
  '/api/admin/',
  '/api/mercadopago/',
  '/api/recebimentos',
  '/api/fiscal/',
  '/api/subscribers/real-status',
  '/api/ai/',
];

function isDevEnvironment(url) {
  return (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname.includes('ais-dev-') ||
    url.pathname.includes('/node_modules/') ||
    url.pathname.includes('/@') ||
    url.pathname.includes('.vite') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.jsx') ||
    url.searchParams.has('v') ||
    url.searchParams.has('t')
  );
}

function isRestrictedApiRequest(request, url) {
  if (request.headers.has('authorization') || request.headers.has('x-admin-token')) {
    return true;
  }
  return SENSITIVE_RESTRICTED_API_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

function isCriticalStaticAsset(url) {
  if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/manifest.json') {
    return true;
  }
  if (url.pathname.startsWith('/assets/')) {
    return true;
  }
  return Boolean(
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|ico|woff2?|ttf|eot|json)$/i)
  );
}

function staleWhileRevalidate(event, cacheName, options = {}) {
  const { fallbackUrls = [], bypassHttpCache = false } = options;

  return caches.open(cacheName).then(async (cache) => {
    let cachedResponse = await cache.match(event.request);
    if (!cachedResponse && fallbackUrls.length > 0) {
      for (const fallbackUrl of fallbackUrls) {
        cachedResponse = await cache.match(fallbackUrl);
        if (cachedResponse) break;
      }
    }

    const fetchPromise = fetch(event.request, bypassHttpCache ? { cache: 'no-cache' } : undefined)
      .then(async (networkResponse) => {
        if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
          await cache.put(event.request, networkResponse.clone());
          for (const fallbackUrl of fallbackUrls) {
            await cache.put(fallbackUrl, networkResponse.clone());
          }
        }
        return networkResponse;
      })
      .catch(() => null);

    if (cachedResponse) {
      event.waitUntil(fetchPromise);
      return cachedResponse;
    }

    const networkResponse = await fetchPromise;
    if (networkResponse) {
      return networkResponse;
    }

    return new Response('Offline — recurso estático indisponível sem cache prévio.', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  });
}

async function networkFirst(request, cacheName, isApiJson = true) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request, { cache: 'no-store' });
    if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    if (isApiJson) {
      return new Response(
        JSON.stringify({
          offline: true,
          cached: false,
          error: 'Sem conexão com a internet no momento. Dados salvos localmente permanecem acessíveis.',
        }),
        {
          status: 503,
          statusText: 'Service Unavailable (Offline)',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    return new Response('Offline — dados indisponíveis.', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.allSettled(
        PRECACHE_ASSETS.map((assetUrl) =>
          fetch(assetUrl, { cache: 'reload' })
            .then((response) => {
              if (response && response.ok) {
                return cache.put(assetUrl, response);
              }
            })
            .catch(() => null)
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'PURGE_DATA_CACHE') {
    event.waitUntil(caches.delete(PROJECT_DATA_CACHE));
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (!ACTIVE_CACHES.has(cacheName)) {
              return caches.delete(cacheName);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || isDevEnvironment(url)) {
    return;
  }

  // 1. Admin Master, pagamentos, fiscal e auth: estritamente Network-Only (nunca armazenado em CacheStorage)
  if (url.pathname.startsWith('/api/') && isRestrictedApiRequest(event.request, url)) {
    return;
  }

  // 2. Dados de obra e endpoints operacionais GET: Network-First com fallback offline em PROJECT_DATA_CACHE
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request, PROJECT_DATA_CACHE, true));
    return;
  }

  // 3. Navegações HTML (index.html / SPA routes): Stale-While-Revalidate em SHELL_CACHE
  if (event.request.mode === 'navigate') {
    event.respondWith(
      staleWhileRevalidate(event, SHELL_CACHE, {
        fallbackUrls: ['/index.html', '/'],
        bypassHttpCache: true,
      })
    );
    return;
  }

  // 4. Assets estáticos críticos (JS, CSS, manifest, ícones, fontes): Stale-While-Revalidate em SHELL_CACHE
  if (isCriticalStaticAsset(url)) {
    event.respondWith(
      staleWhileRevalidate(event, SHELL_CACHE, {
        bypassHttpCache: url.pathname === '/manifest.json' || url.pathname === '/index.html',
      })
    );
  }
});

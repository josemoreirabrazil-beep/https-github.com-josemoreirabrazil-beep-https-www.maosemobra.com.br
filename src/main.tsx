import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import './index.css';

// Nomes versionados de CacheStorage sincronizados com public/sw.js:
// - SHELL_CACHE: arquivos estáticos críticos (index.html, bundles, ícones) em Stale-While-Revalidate
// - DATA_CACHE: dados operacionais de obra em Network-First
const ACTIVE_SHELL_CACHE = 'maos-em-obra-shell-v9';
const ACTIVE_DATA_CACHE = 'maos-em-obra-data-v2';
const ACTIVE_CACHE_NAMES = new Set([ACTIVE_SHELL_CACHE, ACTIVE_DATA_CACHE]);
const CRITICAL_SHELL_PATHS = ['/', '/index.html', '/manifest.json'];

async function purgeAllCachesAndWorkers(): Promise<void> {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    // Ignore restricted Service Worker environments
  }

  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch {
      // Ignore CacheStorage cleanup errors
    }
  }
}

async function pruneGranularCacheStorage(preserveProjectData = true): Promise<void> {
  if (!('caches' in window)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => {
        if (!preserveProjectData && key === ACTIVE_DATA_CACHE) {
          return caches.delete(key);
        }
        if (!ACTIVE_CACHE_NAMES.has(key)) {
          return caches.delete(key);
        }
        return Promise.resolve(false);
      })
    );

    // Garante que nenhuma rota administrativa/financeira permaneça no cache de dados
    if (preserveProjectData && keys.includes(ACTIVE_DATA_CACHE)) {
      const dataCache = await caches.open(ACTIVE_DATA_CACHE);
      const cachedRequests = await dataCache.keys();
      const restrictedPrefixes = ['/api/admin/', '/api/mercadopago/', '/api/recebimentos', '/api/fiscal/'];
      await Promise.all(
        cachedRequests.map((req) => {
          try {
            const reqUrl = new URL(req.url);
            if (restrictedPrefixes.some((prefix) => reqUrl.pathname.startsWith(prefix))) {
              return dataCache.delete(req);
            }
          } catch {
            // Ignore malformed URL
          }
          return Promise.resolve(false);
        })
      );
    }
  } catch {
    // Ignore granular CacheStorage errors
  }
}

async function revalidateCriticalShellAssets(): Promise<void> {
  if (!('caches' in window) || !navigator.onLine) return;
  try {
    const shellCache = await caches.open(ACTIVE_SHELL_CACHE);
    await Promise.allSettled(
      CRITICAL_SHELL_PATHS.map(async (assetPath) => {
        const res = await fetch(assetPath, { cache: 'no-cache' });
        if (res && res.ok) {
          await shellCache.put(assetPath, res);
        }
      })
    );
  } catch {
    // Ignore background shell revalidation errors
  }
}

// PWA Service Worker & CacheStorage management
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    const isDev =
      Boolean((import.meta as any).env?.DEV) ||
      window.location.hostname.includes('ais-dev-') ||
      window.location.hostname === 'localhost';

    if (isDev) {
      void purgeAllCachesAndWorkers();
    } else {
      const registerGranularServiceWorker = () => {
        const hadController = Boolean(navigator.serviceWorker.controller);
        let isRefreshing = false;

        const activateWaitingWorker = (worker: ServiceWorker | null) => {
          if (!worker) return;
          try {
            worker.postMessage({ type: 'SKIP_WAITING' });
          } catch {
            // Ignore postMessage failures on terminating workers
          }
        };

        void pruneGranularCacheStorage(true);

        window.addEventListener('maos-em-obra:clear-data-cache', () => {
          void pruneGranularCacheStorage(false);
          try {
            navigator.serviceWorker.controller?.postMessage({ type: 'PURGE_DATA_CACHE' });
          } catch {
            // Ignore if no active controller
          }
        });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          void pruneGranularCacheStorage(true);
          if (!hadController || isRefreshing) return;
          isRefreshing = true;
          window.location.reload();
        });

        navigator.serviceWorker
          .register('/sw.js', { updateViaCache: 'none' })
          .then((registration) => {
            if (registration.waiting) {
              activateWaitingWorker(registration.waiting);
            }

            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (!newWorker) return;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  activateWaitingWorker(newWorker);
                }
              });
            });

            const syncUpdatesAndShell = () => {
              registration.update().catch(() => {});
              void revalidateCriticalShellAssets();
            };

            syncUpdatesAndShell();

            document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'visible') {
                syncUpdatesAndShell();
              }
            });
            window.addEventListener('online', syncUpdatesAndShell);
            window.setInterval(syncUpdatesAndShell, 5 * 60 * 1000);
          })
          .catch((err) => {
            console.warn('Service worker registration failed:', err);
          });
      };

      if (document.readyState === 'complete') {
        registerGranularServiceWorker();
      } else {
        window.addEventListener('load', registerGranularServiceWorker, { once: true });
      }
    }
  } catch {
    // Ignore restricted Service Worker environments
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

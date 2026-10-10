/**
 * EduSphere LMS Service Worker (v1.0.0)
 * Provides offline caching for app shell, static assets, and weak-network resilience.
 */

const CACHE_NAME = 'edusphere-shell-v1';
const STATIC_CACHE = 'edusphere-static-v1';
const DATA_CACHE = 'edusphere-data-v1';

const CORE_APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/EduSphere_Logo.png'
];

// Install Event: pre-cache the essential application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_APP_SHELL).catch((err) => {
        console.warn('[SW] Pre-caching non-fatal warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: clean up legacy caches and take control
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, STATIC_CACHE, DATA_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!currentCaches.includes(name)) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: handle navigation, static assets, and API requests
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests for cache manipulation
  if (request.method !== 'GET') {
    return;
  }

  // Handle SPA HTML Navigations (Network-First with App Shell Cache Fallback)
  if (request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback to cached page or /index.html app shell
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;
          const appShell = await caches.match('/index.html');
          if (appShell) return appShell;
          return caches.match('/');
        })
    );
    return;
  }

  // Handle API Requests (/api/)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Cache successful GET API responses for offline reading
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(DATA_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // If offline, check if we have a cached GET response
          const cachedData = await caches.match(request);
          if (cachedData) {
            return cachedData;
          }
          // Return structured offline JSON response
          return new Response(
            JSON.stringify({
              offline: true,
              detail: 'You are currently offline. This action will be available once connection is restored.'
            }),
            {
              status: 503,
              statusText: 'Service Unavailable (Offline)',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Handle Static Assets (JS, CSS, Fonts, Images) with Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failure is fine if cachedResponse is available
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

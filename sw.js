const CACHE_NAME = 'storytap-v1.0';
const ASSETS_TO_CACHE = [
  './index.html',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Caching core assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(err => {
      console.warn('SW: Cache install failed', err);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('SW: Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Navigation requests: Network first, fall back to cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .catch(() => {
          return caches.match('./index.html') || caches.match(e.request);
        })
    );
    return;
  }

  // Other assets: Stale-While-Revalidate Strategy
  // Serve from cache immediately, then update cache in background
  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(e.request);
      
      const networkFetch = fetch(e.request).then((networkResponse) => {
        // Only cache valid responses
        if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
          cache.put(e.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => {
        // Network failure
        return null; 
      });

      return cachedResponse || networkFetch;
    })
  );
});

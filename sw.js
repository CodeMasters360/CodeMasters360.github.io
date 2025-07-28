const CACHE_NAME = 'otp-generator-cache-v3'; // Increment version to trigger update
const urlsToCache = [
  '/', // Cache the root URL
  'app.html',
  'style.css',
  'script.js',
  'pwa-loader.js', // Don't forget to cache the new loader script
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// Install event: cache all essential app assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching app assets');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Force the waiting service worker to become the active service worker.
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all clients as soon as the SW is activated.
  );
});

// Fetch event: handle requests
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // --- Strategy 1: For cross-origin requests (like APIs), go network-only ---
  // If the request is not for a resource from our own origin,
  // let the browser handle it. Do not intercept.
  if (requestUrl.origin !== self.location.origin) {
    // We are not calling event.respondWith(), so the browser handles it normally.
    return;
  }

  // --- Strategy 2: For app assets, use Cache-First strategy ---
  // This will apply to all same-origin requests (our HTML, CSS, JS files).
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If the resource is in the cache, return it.
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // If the resource is not in the cache, fetch it from the network.
        return fetch(event.request).then(networkResponse => {
            // Optional: You could add the newly fetched resource to the cache here if needed.
            // But for core assets, caching during install is usually sufficient.
            return networkResponse;
        });
      })
  );
});
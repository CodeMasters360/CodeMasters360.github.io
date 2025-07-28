const CACHE_NAME = 'otp-generator-cache-v4'; // Version incremented to trigger update
const urlsToCache = [
  '/',
  'app.html',
  'style.css',
  'script.js',
  'pwa-loader.js',
  // ADDED: Caching the icon files for full offline support
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching app assets including icons');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

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
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // For cross-origin requests (like APIs), do not intercept.
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  // For app assets, use Cache-First strategy.
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return from cache if found, otherwise fetch from network.
        return cachedResponse || fetch(event.request);
      })
  );
});
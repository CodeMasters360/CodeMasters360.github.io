const CACHE_NAME = 'otp-generator-cache-v85117'; // Version incremented for update
const urlsToCache = [
  'app.html',
  'style.css',
  'script.js',
  'pwa-loader.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  // Caching our custom-named favicon is essential
  'faviconq.ico' 
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching all required assets.');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('All assets successfully cached.');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Failed to cache one or more assets during install:', error);
      })
  );
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

  // For cross-origin requests, do not intercept.
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  // --- SMART FAVICON HANDLING ---
  // If the browser makes its automatic, hardcoded request for '/favicon.ico'...
  if (requestUrl.pathname === '/favicon.ico') {
    // ...we intercept it and respond with our actual icon file from the cache.
    event.respondWith(caches.match('faviconq.ico'));
    return; // IMPORTANT: Stop processing further for this specific request.
  }

  // For all other same-origin requests, use a "Cache, falling back to network" strategy.
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If the request is for the root path, serve app.html from cache.
        if (requestUrl.pathname === '/' || requestUrl.pathname === '/index.html') {
            return caches.match('app.html');
        }
        // For any other request, return the cached response if it exists,
        // otherwise, fetch it from the network.
        return cachedResponse || fetch(event.request);
      })
  );
});
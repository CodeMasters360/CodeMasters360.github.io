// sw.js (نسخه اصلاح شده با آیکن‌ها)

const CACHE_NAME = 'persian-calendar-cache-v8';
const urlsToCache = [
  'calander2.html',
  'style2.css',
  'calendar-logic.js',
  'calendar-master-data.js',
  'events.js',
  'Vazirmatn-Regular.ttf',
  
  // === فایل‌های جدید اضافه شده به لیست کش ===
  'manifest.json', // خود مانیفست هم بهتره کش بشه
  'icon-192.png',
  'icon-512.png',
   'favicon.ico'
  // ==========================================
];

// بقیه کد sw.js بدون تغییر باقی می‌ماند...
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
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
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
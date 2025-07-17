// sw.js (سرویس ورکر برای کش و استفاده آفلاین)

const CACHE_NAME = 'persian-calendar-cache-v1';
// لیستی از تمام فایل‌هایی که باید کش شوند.
const urlsToCache = [
  '/', // این خط باعث می‌شود صفحه اصلی (index.html یا calander.html) کش شود
  'calander2.html',
  'style2.css',
  'calendar-logic.js',
  'calendar-master-data.js',
  'events.js',
  'Vazirmatn-Regular.ttf' // فایل فونت محلی هم کش می‌شود
];

// رویداد نصب: فایل‌های اصلی برنامه را کش می‌کند.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// رویداد فعال‌سازی: کش‌های قدیمی را پاک می‌کند.
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

// رویداد fetch: درخواست‌ها را رهگیری می‌کند.
// ابتدا سعی می‌کند از شبکه (اینترنت) فایل را بگیرد.
// اگر نشد (آفلاین بود)، از کش استفاده می‌کند.
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
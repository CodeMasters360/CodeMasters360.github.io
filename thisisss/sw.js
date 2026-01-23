const CACHE_NAME = 'chiiz-app-v3';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './app.js'
];

// نصب و ذخیره تمام فایل‌ها
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching all assets...');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('All assets cached successfully!');
                return self.skipWaiting();
            })
            .catch((err) => {
                console.error('Failed to cache:', err);
            })
    );
});

// استراتژی Cache First - اول از کش بخوان، بعد از شبکه
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // اگر در کش بود، بدون نیاز به اینترنت برگردان
                if (cachedResponse) {
                    console.log('Serving from cache:', event.request.url);
                    return cachedResponse;
                }
                
                // اگر در کش نبود، سعی کن از شبکه بگیر
                return fetch(event.request)
                    .then((networkResponse) => {
                        // اگر موفق شد، در کش ذخیره کن
                        return caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse.clone());
                            return networkResponse;
                        });
                    })
                    .catch(() => {
                        console.log('Offline and not in cache:', event.request.url);
                        // اگر آفلاین است و فایل HTML می‌خواهد
                        if (event.request.destination === 'document') {
                            return caches.match('./index.html');
                        }
                    });
            })
    );
});

// فعال‌سازی و پاک کردن کش‌های قدیمی
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker activated and ready!');
            return self.clients.claim();
        })
    );
});

// پیام‌رسانی با صفحه
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});

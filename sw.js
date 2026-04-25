const CACHE = 'aerialerp-v1';
const ASSETS = ['/', '/index.html', '/css/main.css', '/css/components.css',
  '/js/db.js', '/js/data-seed.js', '/js/app.js', '/js/charts.js', '/js/scanner.js',
  '/js/modules/dashboard.js', '/js/modules/assets.js', '/js/modules/inventory.js',
  '/js/modules/workorders.js', '/js/modules/scanner-hub.js', '/js/modules/brands.js',
  '/js/modules/reports.js'];

self.addEventListener('install', e => e.waitUntil(
  caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})
));
self.addEventListener('fetch', e => e.respondWith(
  caches.match(e.request).then(r => r || fetch(e.request))
));

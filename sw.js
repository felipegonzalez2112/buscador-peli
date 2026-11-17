const CACHE = 'cine-ar-shell-v9';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './app.js',
  './manifest.webmanifest',
  './icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/utils/formatters.js',
  './js/utils/clipboard.js',
  './js/services/theme.js',
  './js/services/providers.js',
  './js/services/storage.js',
  './js/services/backup.js',
  './js/api/tmdb.js',
  './js/ui/feedback.js',
  './js/ui/tabs.js',
  './js/ui/diary-dialog.js',
  './js/ui/diary-view.js',
  './js/ui/watchlist-view.js',
  './js/ui/search-view.js',
  './js/ui/detail-dialog.js'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
});

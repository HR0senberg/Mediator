/*
  Service Worker для офлайн‑кэша статических ресурсов.
  Важно: внешние ресурсы (face-api.js и модели) не кэшируются здесь намеренно.
*/

const CACHE_NAME = 'mediator-cache-v7';

const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './js/01-dom-theme.js',
  './js/02-state-feedback.js',
  './js/03-tracking-quality.js',
  './js/04-models-camera-detect.js',
  './js/05-practices.js',
  './js/06-quickhelp-test-nav.js',
  './calm.wav',
  './manifest.webmanifest',
  './assets/icons/icon-64.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Кэшируем только GET и только same-origin.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // кладём в кэш для последующих запросов
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
        return res;
      });
    })
  );
});

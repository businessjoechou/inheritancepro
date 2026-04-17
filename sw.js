/**
 * InheritancePro Service Worker
 * Cache-first for static assets, network-first for HTML pages.
 *
 * ⚠️ 每次 deploy 前必須 bump CACHE_NAME 尾綴（YYYYMMDDHHmm），
 *    否則 client 會繼續用舊版快取；未來 P2 改成 build-time 自動注入
 */
const CACHE_NAME = 'inheritancepro-v202604161800';
const STATIC_ASSETS = [
  '/css/tokens.css',
  '/css/reset.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/tool-page.css',
  '/css/utilities.css',
  '/js/core/inheritance.js',
  '/js/core/estate-tax.js',
  '/js/core/damages.js',
  '/js/core/interest.js',
  '/js/core/gift-tax.js',
  '/js/utils/format.js',
  '/js/utils/dates-tw.js',
  '/js/persona.js',
  '/js/animations.js',
  '/js/ga.js',
  '/favicon.svg',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // HTML pages: network-first
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

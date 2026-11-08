/* Only the standalone test UI is cached; Supabase requests are never intercepted. */
const CACHE = 'dobby-sync-v1-shell-20261108-01';
const SHELL = ['./', './index.html', './styles.css', './app.js', './core.mjs'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith('dobby-sync-v1-shell-') && k !== CACHE)
        .map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin ||
      !url.pathname.includes('/essai-sync-v1/')) return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response.ok) return response;
        const copy = response.clone();
        void caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      });
    })
  );
});

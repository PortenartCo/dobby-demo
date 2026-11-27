/* Offline shell for DOBBY V7 and the native iframe it uses. */
'use strict';
importScripts('./essai-stitch-v7/pwa-shell.js');

// Maintained by scripts/build-dobby-v7-pwa.cjs.
const VERSION = '8d803fabba2c3eebad31f616';
const ROOT = new URL(self.registration.scope);
const CACHE_PREFIX = `dobby-v7-static:${encodeURIComponent(ROOT.href)}:`;
const CACHE = `${CACHE_PREFIX}${VERSION}`;
const home = new URL('essai-stitch-v7/index.html', ROOT);
const directory = new URL('essai-stitch-v7/', ROOT);
const engine = new URL('essai-stitch-v5-famille/index.html', ROOT);
const engineFrame = new URL('#dobby-v7-engine', engine);
const entryPaths = new Set([
  directory.pathname, home.pathname,
  ...['famille.html', 'missions.html', 'traverse.html'].map(page => new URL(page, directory).pathname),
]);
const accessParameters = [
  'invite', 'invitation', 'code', 'dobby_flow', 'token', 'token_hash', 'access_token',
  'refresh_token', 'expires_in', 'expires_at', 'token_type', 'type', 'error', 'error_description', 'error_code',
];

const staticURLs = new Map();
for (const file of DOBBY_V7_SHELL) {
  const url = new URL(file, ROOT);
  const requestedURL = url.href;
  url.search = '';
  staticURLs.set(requestedURL, url.href);
  staticURLs.set(url.href, url.href);
}
const installURLs = new Set(staticURLs.values());

function isV7Page(address) {
  if (!address || address === 'about:client') return false;
  const url = new URL(address);
  return url.origin === ROOT.origin && entryPaths.has(url.pathname);
}

function hasAccessFragment(hash) {
  if (!hash) return false;
  const parameters = new URLSearchParams(hash.slice(hash.includes('?') ? hash.indexOf('?') + 1 : 1));
  return accessParameters.some(name => parameters.has(name));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const existing = new Set((await cache.keys()).map(request => request.url));
    const urls = [...installURLs];
    if (urls.every(url => existing.has(url))) return;
    try {
      await cache.addAll(urls.map(url => new Request(url, {
        cache: 'reload', credentials: 'omit', mode: 'same-origin',
        redirect: 'error', referrerPolicy: 'no-referrer',
      })));
    } catch (error) {
      if (!existing.size) await caches.delete(CACHE);
      throw error;
    }
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING' && event.source?.type === 'window' && isV7Page(event.source.url)) {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function fromShell(request, key) {
  const cached = await caches.match(key, { cacheName: CACHE }).catch(() => undefined);
  return cached || fetch(request);
}

async function fromApplication(event, key) {
  const client = await self.clients.get(event.clientId);
  const fromV7 = client?.type === 'window' && isV7Page(client.url);
  const fromEngine = client?.type === 'window' && client.url === engineFrame.href &&
    (!client.frameType || client.frameType === 'nested');
  return fromV7 || fromEngine ? fromShell(event.request, key) : fetch(event.request);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || request.headers.has('Authorization') || request.headers.has('Range')) return;
  const url = new URL(request.url);
  if (url.origin !== ROOT.origin) return;

  if (request.mode === 'navigate') {
    // Auth and invitation navigations go straight to the network.
    if (url.search || hasAccessFragment(url.hash)) return;
    if (request.destination === 'document' && entryPaths.has(url.pathname)) {
      url.hash = '';
      const key = url.pathname === directory.pathname ? home.href : url.href;
      event.respondWith(fromShell(request, key));
    } else if (request.destination === 'iframe' && url.pathname === engine.pathname &&
      (!url.hash || url.hash === engineFrame.hash) && isV7Page(request.referrer)) {
      event.respondWith(fromShell(request, engine.href));
    }
    return;
  }

  const key = staticURLs.get(url.href);
  if (key && key !== engine.href && event.clientId) event.respondWith(fromApplication(event, key));
});

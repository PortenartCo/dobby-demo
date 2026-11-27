const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repo = path.resolve(__dirname, '../..');
const workerPath = path.join(repo, 'pwa-sw.js');
const scope = 'https://example.test/dobby/';
const cachePrefix = `dobby-v7-static:${encodeURIComponent(scope)}:`;
const v7 = 'essai-stitch-v7/';
const engine = 'essai-stitch-v5-famille/';
const shell = `${v7}index.html`;
const css = `${v7}stitch-tailwind.css`;
const enginePage = `${engine}index.html`;
const engineFrame = `${enginePage}#dobby-v7-engine`;
const engineScript = `${engine}stitch-v5.js?v=20261110-e06-1`;

function loadWorker({ missing = [], stores = new Map() } = {}) {
  assert.ok(fs.existsSync(workerPath), 'Le service worker du shell DOBBY V7 doit exister.');
  const listeners = new Map();
  const calls = { network: [], prefetch: [], claim: 0, skipWaiting: 0 };
  const clients = {
    v7: { type: 'window', frameType: 'top-level', url: new URL(shell, scope).href },
    engine: { type: 'window', frameType: 'nested', url: new URL(engineFrame, scope).href },
    oldEngine: { type: 'window', frameType: 'nested', url: new URL(enginePage, scope).href },
    v5: { type: 'window', frameType: 'top-level', url: new URL(enginePage, scope).href },
    prototype: { type: 'window', frameType: 'top-level', url: new URL('essai-v7-preview/index.html', scope).href },
  };
  let sandbox;
  sandbox = vm.createContext({
    URL, URLSearchParams, Request, Response,
    importScripts: (...files) => {
      for (const file of files) vm.runInContext(fs.readFileSync(path.resolve(repo, file), 'utf8'), sandbox);
    },
    self: {
      registration: { scope },
      addEventListener: (event, listener) => listeners.set(event, listener),
      clients: {
        get: async id => clients[id],
        claim: async () => { calls.claim++; },
      },
      skipWaiting: async () => { calls.skipWaiting++; },
    },
    caches: {
      keys: async () => [...stores.keys()],
      delete: async name => stores.delete(name),
      match: async (url, { cacheName }) => {
        const cache = stores.get(cacheName);
        return cache?.has(url) ? new Response(cache.get(url)) : undefined;
      },
      open: async name => {
        if (!stores.has(name)) stores.set(name, new Map());
        const cache = stores.get(name);
        return {
          keys: async () => [...cache.keys()].map(url => new Request(url)),
          addAll: async requests => {
            calls.prefetch.push(...requests);
            if (requests.some(request => missing.includes(request.url))) throw Error('Précache incomplet');
            for (const request of requests) cache.set(request.url, `cached ${request.url}`);
          },
        };
      },
    },
    fetch: async request => {
      calls.network.push(request.url);
      return new Response(`network ${request.url}`);
    },
  });
  vm.runInContext(fs.readFileSync(workerPath, 'utf8'), sandbox, { filename: workerPath });

  function emit(type, properties = {}) {
    assert.ok(listeners.has(type), `Le worker doit écouter ${type}.`);
    let lifetime;
    listeners.get(type)({ ...properties, waitUntil: value => { lifetime = value; }, respondWith: value => { lifetime = value; } });
    return lifetime;
  }

  function request(target, { clientId = 'v7', ...options } = {}) {
    return emit('fetch', {
      clientId,
      request: { url: new URL(target, scope).href, method: 'GET', headers: new Headers(), ...options },
    });
  }
  return { calls, clients, emit, request, stores };
}

test('installe uniquement des ressources statiques publiques à partir du préfixe du site', async () => {
  const { calls, emit, stores } = loadWorker();
  await emit('install');
  const [name] = stores.keys();
  assert.ok(name.startsWith(cachePrefix));
  const downloaded = new Set(calls.prefetch.map(request => request.url));
  for (const asset of [shell, css, 'essai-stitch-v7/manifest.webmanifest', enginePage, engineScript.split('?')[0], 'essai-v6-preview/assets/v6/fonts.css']) {
    assert.ok(downloaded.has(new URL(asset, scope).href), asset);
  }
  for (const request of calls.prefetch) {
    assert.ok(request.url.startsWith(scope), request.url);
    assert.doesNotMatch(request.url, /\/catalogue\/|\/auth\/|\/storage\/|\/rest\/|\/functions\/|\/templates\/.*(?:health|medical|document)/i);
    assert.equal(request.credentials, 'omit');
    assert.equal(request.redirect, 'error');
    assert.equal(request.referrerPolicy, 'no-referrer');
  }
  assert.equal(calls.skipWaiting, 0);
});

test('abandonne un candidat incomplet en conservant le cache actif', async () => {
  const previous = `${cachePrefix}previous`;
  const priorContents = new Map([[new URL(shell, scope).href, 'previous shell']]);
  const stores = new Map([[previous, priorContents]]);
  const { emit, calls } = loadWorker({ missing: [new URL(css, scope).href], stores });
  await assert.rejects(emit('install'), /Précache incomplet/);
  assert.deepEqual([...stores], [[previous, priorContents]]);
  assert.equal(calls.skipWaiting, 0);
});

test('retente le précache après une interruption qui laisse un cache candidat vide', async () => {
  const initial = loadWorker();
  await initial.emit('install');
  const [name] = initial.stores.keys();
  initial.stores.set(name, new Map());

  const retry = loadWorker({ stores: initial.stores });
  await retry.emit('install');
  assert.ok(retry.stores.get(name).has(new URL(shell, scope).href));

  const reinstall = loadWorker({ stores: retry.stores });
  await reinstall.emit('install');
  assert.deepEqual(reinstall.calls.prefetch, []);
});

test('précache les dépendances locales des quatre pages V7', async () => {
  const { calls, emit } = loadWorker();
  await emit('install');
  const precached = new Set(calls.prefetch.map(request => request.url));
  for (const page of ['index.html', 'famille.html', 'missions.html', 'traverse.html']) {
    const source = fs.readFileSync(path.join(repo, v7, page), 'utf8');
    for (const [, file] of source.matchAll(/<(?:script|link|iframe)\b[^>]*\b(?:src|href)="([^"#]+)"/g)) {
      const url = new URL(file, new URL(v7, scope));
      if (url.origin !== new URL(scope).origin) continue;
      url.search = '';
      assert.ok(precached.has(url.href), `${page} → ${file}`);
    }
  }
});

test('conserve la cohérence du shell et reconnaît le moteur V5 imbriqué depuis une page V7', async () => {
  const { emit, request, calls } = loadWorker();
  await emit('install');
  for (const [target, asset, options] of [
    [v7, shell, { mode: 'navigate', destination: 'document' }],
    [shell, shell, { mode: 'navigate', destination: 'document', clientId: '' }],
    [`${v7}famille.html#access`, `${v7}famille.html`, { mode: 'navigate', destination: 'document', clientId: '' }],
    [css, css, {}],
    [engineFrame, enginePage, { mode: 'navigate', destination: 'iframe', clientId: '', referrer: new URL(shell, scope).href }],
    [engineScript, engineScript.split('?')[0], { clientId: 'engine' }],
    [`${engine}family-health-core.mjs?v=20261108-7`, `${engine}family-health-core.mjs`, { clientId: 'engine' }],
  ]) {
    const response = await request(target, options);
    assert.equal(await response.text(), `cached ${new URL(asset, scope).href}`);
  }
  assert.deepEqual(calls.network, []);
});

test('laisse passer Auth, RPC, Storage, données privées, catalogue et navigations des prototypes', async () => {
  const { emit, request, calls, stores } = loadWorker();
  await emit('install');
  const before = [...stores.values()][0].size;
  for (const [target, options] of [
    [`${shell}?code=fixture`, { mode: 'navigate', destination: 'document' }],
    [`${shell}?invite=fixture`, { mode: 'navigate', destination: 'document' }],
    [`${shell}#access_token=fixture`, { mode: 'navigate', destination: 'document' }],
    [`${shell}#access?invite=fixture`, { mode: 'navigate', destination: 'document' }],
    [`${css}?token=fixture`, {}],
    [css, { method: 'POST' }],
    [css, { headers: new Headers({ Authorization: 'Bearer fixture' }) }],
    [css, { headers: new Headers({ Range: 'bytes=0-1024' }) }],
    [new URL(css, 'https://elsewhere.test/dobby/').href, {}],
    ['auth/v1/token', {}],
    ['rest/v1/rpc/family_health', {}],
    ['storage/v1/object/sign/private/document.pdf', {}],
    [`${v7}templates/family/health.html`, {}],
    [`${v7}templates/remaining/documents.html`, {}],
    [`${engine}catalogue/recipes.js`, { clientId: 'engine' }],
    ['essai-v7-preview/index.html', { mode: 'navigate', destination: 'document' }],
    [enginePage, { mode: 'navigate', destination: 'document' }],
    [engineFrame, { mode: 'navigate', destination: 'iframe', referrer: new URL('essai-v7-preview/index.html', scope).href }],
  ]) assert.equal(request(target, options), undefined, target);
  assert.equal(await (await request(engineScript, { clientId: 'v5' })).text(), `network ${new URL(engineScript, scope).href}`);
  assert.equal(await (await request(engineScript, { clientId: 'oldEngine' })).text(), `network ${new URL(engineScript, scope).href}`);
  assert.equal(await (await request(css, { clientId: 'prototype' })).text(), `network ${new URL(css, scope).href}`);
  assert.equal([...stores.values()][0].size, before);
  assert.equal(calls.network.length, 3);
});

test('active sur confirmation V7 et retire uniquement les anciennes versions de ce déploiement', async () => {
  const previous = `${cachePrefix}previous`;
  const otherOriginPath = 'dobby-v7-static:https%3A%2F%2Fexample.test%2Fanother%2F:previous';
  const legacy = 'dobby-sync-v2-shell-20261108-01';
  const stores = new Map([[previous, new Map()], [otherOriginPath, new Map()], [legacy, new Map()]]);
  const { emit, calls, clients } = loadWorker({ stores });
  await emit('install');
  assert.equal(emit('message', { data: { type: 'SKIP_WAITING' }, source: clients.prototype }), undefined);
  assert.equal(calls.skipWaiting, 0);
  await emit('message', { data: { type: 'SKIP_WAITING' }, source: clients.v7 });
  assert.equal(calls.skipWaiting, 1);
  await emit('activate');
  assert.equal(stores.has(previous), false);
  assert.equal(stores.has(legacy), true);
  assert.equal(stores.has(otherOriginPath), true);
  assert.equal(stores.size, 3);
  assert.equal(calls.claim, 1);
});

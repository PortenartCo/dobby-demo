/* Same browser, two origins. The production analogue uses witnesses exclusively. */
'use strict';
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require('playwright');

const demo = new URL(process.env.DOBBY_GLOBAL_LAUNCH_BASE);
assert.equal(demo.hostname, '127.0.0.1');
assert.equal(demo.protocol, 'http:');
const witness = 'TEST_WITNESS_SEPARATE_PRODUCTION_ORIGIN';
const served = [];
const serviceWorker = `
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open('dobby-v7-static-production-test');
  await cache.put('/document-fictif', new Response('${witness} cache'));
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
`;
const site = createServer((request, response) => {
  served.push(request.url);
  if (request.url === '/' || request.url === '/favicon.ico') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return response.end('<!doctype html><html lang="fr"><title>Témoin fictif</title><p>Origine de production simulée</p></html>');
  }
  if (request.url === '/worker.js') {
    response.writeHead(200, { 'Content-Type': 'text/javascript' });
    return response.end(serviceWorker);
  }
  response.writeHead(404).end();
});

async function localWitness(page, install) {
  return page.evaluate(async ({ install, witness }) => {
    const dbName = 'dobby-v5-household-preview-v2';
    if (install) {
      await navigator.serviceWorker.register('/worker.js');
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise(resolve =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
      localStorage.setItem('dobby-v5-familial-preview-20261108', witness + ' register');
      sessionStorage.setItem('dobby-auth-session-v7', witness + ' session');
    }
    const values = await new Promise((resolve, reject) => {
      const open = indexedDB.open(dbName, 1);
      open.onupgradeneeded = () => open.result.createObjectStore('meta');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction('meta', install ? 'readwrite' : 'readonly');
        const records = tx.objectStore('meta');
        if (install) {
          records.put(witness + ' login', 'session');
          records.put(new Blob([witness + ' bytes'], { type: 'text/plain' }), 'attachment');
        }
        const token = records.get('session');
        const blob = records.get('attachment');
        tx.oncomplete = async () => { db.close(); resolve([token.result, await blob.result?.text()]); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
    const cache = await caches.open('dobby-v7-static-production-test');
    return {
      worker: navigator.serviceWorker.controller?.scriptURL,
      local: localStorage.getItem('dobby-v5-familial-preview-20261108'),
      session: sessionStorage.getItem('dobby-auth-session-v7'),
      values, payload: await (await cache.match('/document-fictif'))?.text(),
    };
  }, { install, witness });
}

async function run() {
  await new Promise(resolve => site.listen(0, '127.0.0.1', resolve));
  const production = `http://127.0.0.1:${site.address().port}`;
  assert.notEqual(production, demo.origin);
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
    const other = await context.newPage();
    await other.goto(production);
    const before = await localWitness(other, true);
    assert.ok(before.worker?.startsWith(production));
    assert.ok(before.values.every(value => value?.startsWith(witness)));
    assert.ok(before.payload?.startsWith(witness));
    const attempted = [];
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === demo.origin) return route.continue();
      attempted.push(url.origin + url.pathname);
      return route.abort();
    });
    const hits = [...served];
    const page = await context.newPage();
    const nativeReady = () => page.waitForFunction(() => window.DobbyFamilyStitchEngine?.win()?.DobbyFamilyUI?.getContext()?.identityVerified);
    await page.goto(demo.href);
    await nativeReady();
    const boundary = async production => {
      const registration = await navigator.serviceWorker.getRegistrations();
      const results = await Promise.all(['/auth/v1/token', '/rest/v1/rpc/witness', '/storage/v1/object/witness'].map(path =>
        fetch(production + path).then(() => false, () => true)));
      return { controller: Boolean(navigator.serviceWorker.controller), registrations: registration.length,
        local: localStorage.getItem('dobby-v5-familial-preview-20261108')?.includes('TEST_WITNESS') || false,
        popupDenied: window.open(production) === null, results };
    };
    const expected = { controller: false, registrations: 0, local: false, popupDenied: true, results: [true, true, true] };
    assert.deepEqual(await page.evaluate(boundary, production), expected);
    await Promise.all([page.waitForEvent('framenavigated', frame => frame === page.mainFrame()),
      page.evaluate(() => { void window.DobbyGlobalDemo.reset(); })]);
    await nativeReady();
    assert.deepEqual(await page.evaluate(boundary, production), expected);
    assert.deepEqual(await localWitness(other, false), before);
    assert.deepEqual(served, hits);
    assert.deepEqual(attempted, []);
    const report = { status: 'PASS', separateOrigins: true, productionWorkerAndCache: 'unchanged',
      productionSessionRegisterAndAttachment: 'unchanged', demoServiceWorkerRegistrations: 0,
      outsideRequests: attempted.length, productionRequestsDuringDemo: served.length - hits.length };
    if (process.env.DOBBY_GLOBAL_LAUNCH_EVIDENCE) {
      await writeFile(join(process.env.DOBBY_GLOBAL_LAUNCH_EVIDENCE, 'isolation-origines.json'), JSON.stringify(report, null, 2) + '\n');
    }
    console.log('GLOBAL_LAUNCH_ORIGIN_PASS', JSON.stringify(report));
  } finally {
    await browser.close();
    site.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; site.close(); });

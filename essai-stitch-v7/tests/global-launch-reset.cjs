/* Chromium proof of a same-origin, multi-tab reset in the launch demo only. */
'use strict';

const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const clients = ['A', 'B', 'C', 'D'];
const prodStateKey = 'dobby-v5-familial-preview-20261108';
const prodDatabase = 'dobby-v5-household-preview-v2';
const probeKey = 'launch-reset-probe';
const untouched = 'LAUNCH_RESET_KEEP';

function configuration(manifest) {
  const prefix = manifest.storageNamespace || manifest.storagePrefix?.replace(/client-\{[^}]+\}\|$/, '');
  assert.ok(prefix?.endsWith('|'), 'The review manifest defines a dedicated launch namespace');
  assert.equal(manifest.storagePrefix, `${prefix}client-{${clients.join('|')}}|`, 'The manifest declares all four persona namespaces');
  assert.ok(manifest.sharedFixtureKey?.startsWith(prefix));
  return { prefix, backend: manifest.sharedFixtureKey, marker: manifest.resetKey || prefix + 'reset-in-progress',
    lock: manifest.backendLock || manifest.sharedFixtureKey, channel: manifest.resetChannel || prefix + 'reset' };
}

function witnessNames(base, prefix) {
  const neighbor = prefix.slice(0, -1) + '-sibling|';
  return {
    local: [prodStateKey, 'dobby-review-v7-global-20261112|' + probeKey, neighbor + probeKey],
    databases: [prodDatabase, 'dobby-v5-familial-files-20261108', 'dobby-review-v7-global-20261112|fixture-db', neighbor + 'attachment-db'],
    caches: [`dobby-v7-static-${base.origin}/dobby-demo/-fixture`, 'dobby-review-v7-global-20261112|fixture-cache', neighbor + 'cache'],
  };
}

async function witnessSnapshot(page, names, prefix, seed = false) {
  return page.evaluate(async ({ names, prefix, seed, prodStateKey, untouched }) => {
    if (seed) {
      localStorage.setItem(prodStateKey, JSON.stringify({ demoInitialized: true,
        famContacts: [{ id: 'launch-reset-prod-placeholder', name: untouched }] }));
      for (const name of names.local.slice(1)) localStorage.setItem(name, untouched + ' ' + name);
      for (const name of names.caches) {
        const cache = await caches.open(name);
        await cache.put('/launch-reset-sentinel', new Response(untouched + ' ' + name));
      }
    }
    const existing = (await indexedDB.databases()).map(database => database.name);
    const databases = await Promise.all(names.databases.map(async name => {
      if (!seed && !existing.includes(name)) throw Error('Reset deleted unrelated IndexedDB: ' + name);
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(name, 1);
        request.onupgradeneeded = () => request.result.createObjectStore('proof');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('proof', seed ? 'readwrite' : 'readonly');
          const store = tx.objectStore('proof');
          if (seed) store.put(untouched + ' ' + name, 'probe');
          const read = store.get('probe');
          tx.oncomplete = () => { db.close(); resolve([name, read.result]); };
          tx.onabort = () => { db.close(); reject(tx.error); };
        };
      });
    }));
    const cacheNames = (await caches.keys()).sort();
    const cacheValues = await Promise.all(names.caches.map(async name => {
      if (!cacheNames.includes(name)) throw Error('Reset deleted unrelated CacheStorage: ' + name);
      const cache = await caches.open(name);
      return [name, (await cache.keys()).map(request => request.url).sort(), await (await cache.match('/launch-reset-sentinel'))?.text()];
    }));
    const localKeys = Object.keys(localStorage).filter(key => !key.startsWith(prefix)).sort();
    const databaseNames = (await indexedDB.databases()).map(database => database.name).filter(name => !name.startsWith(prefix)).sort();
    return { local: localKeys.map(name => [name, localStorage.getItem(name)]), databases, databaseNames, cacheNames, cacheValues };
  }, { names, prefix, seed, prodStateKey, untouched });
}

async function ready(page, client) {
  await page.waitForFunction(expected => window.DobbyGlobalDemo?.client === expected && window.DobbyStitchV7?.ready, client);
  await page.evaluate(() => DobbyGlobalDemo.ready);
  await page.waitForFunction(expected => {
    const api = document.getElementById('dv7-engine')?.contentWindow?.DobbyFamilyUI;
    const access = api?.access?.state();
    return access?.verified && access.profile?.memberCategory === expected;
  }, client === 'A' || client === 'B' ? 'parent' : 'child');
  return page.evaluate(async () => {
    const native = document.getElementById('dv7-engine').contentWindow;
    const api = native.DobbyFamilyUI;
    return { generation: (await DobbyGlobalDemo.state()).generation, identity: api.access.state().userId,
      projection: api.childAccessState(), namespace: DobbyReviewConfig.storagePrefix };
  });
}

async function checkSourceIsolation(page, base) {
  const outside = base.pathname === '/' ? null : new URL('/outside-launch-fixture/', base).href;
  const result = await page.evaluate(async ({ outside, prodStateKey, untouched }) => {
    const remote = 'https://launch-reset-test.invalid/rest/v1/dobby_v2_modules';
    const fetchFailures = await Promise.all([remote, ...(outside ? [outside] : [])].map(async url => {
      try { await fetch(url, { method: 'POST', body: 'fixture' }); return false; }
      catch { return true; }
    }));
    let xhrBlocked = false;
    try { new XMLHttpRequest().open('GET', remote); }
    catch { xhrBlocked = true; }
    const native = document.getElementById('dv7-engine').contentWindow;
    return { hiddenProductionState: !localStorage.getItem(prodStateKey)?.includes(untouched) &&
      !native.localStorage.getItem(prodStateKey)?.includes(untouched), fetchFailures, xhrBlocked,
      beaconBlocked: navigator.sendBeacon(remote, 'fixture') === false };
  }, { outside, prodStateKey, untouched });
  assert.deepEqual(result, { hiddenProductionState: true, fetchFailures: outside ? [true, true] : [true], xhrBlocked: true, beaconBlocked: true });
}

async function markClient(page, client) {
  await page.evaluate(async ({ client, probeKey }) => {
    const native = document.getElementById('dv7-engine').contentWindow;
    await native.houseStore(new native.Blob(['Attachment in ' + client], { type: 'text/plain' }), probeKey);
    if (await (await native.houseRead(probeKey))?.text() !== 'Attachment in ' + client) throw Error('Native attachment setup failed');
    localStorage.setItem(probeKey, 'LOCAL_' + client);
    sessionStorage.setItem(probeKey, 'SESSION_' + client);
    await new Promise((resolve, reject) => {
      const request = indexedDB.open(probeKey, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('proof');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { window.launchResetProbeConnection = request.result; resolve(); };
    });
  }, { client, probeKey });
}

async function readClientProbe(page) {
  return page.evaluate(async probeKey => {
    const native = document.getElementById('dv7-engine').contentWindow;
    const attachment = await native.houseRead(probeKey);
    return { local: localStorage.getItem(probeKey), session: sessionStorage.getItem(probeKey),
      unrelatedSession: Storage.prototype.__reviewRaw.getItem.call(sessionStorage, probeKey),
      attachment: attachment ? await attachment.text() : null,
      extraDB: (await indexedDB.databases()).some(db => db.name === DobbyReviewConfig.storagePrefix + probeKey) };
  }, probeKey);
}

async function assertReset(page, client, before, generation) {
  const after = await ready(page, client);
  assert.equal(after.generation, generation);
  assert.equal(after.identity, before.identity, 'Reset restores the same persona in its original tab');
  assert.equal(after.namespace, before.namespace);
  assert.equal(after.projection.restricted, client === 'C' || client === 'D');
  assert.deepEqual(await readClientProbe(page), { local: null, session: null, unrelatedSession: untouched + ' ' + client, attachment: null, extraDB: false });
}

async function sharedProbe(page, config, value) {
  return page.evaluate(({ backend, value }) => {
    const state = JSON.parse(localStorage.getItem(backend));
    if (value !== undefined) {
      state.launchResetProbe = value;
      localStorage.setItem(backend, JSON.stringify(state));
    }
    return { generation: state.generation, probe: state.launchResetProbe || null };
  }, { backend: config.backend, value });
}

const navigated = page => page.waitForEvent('framenavigated', frame => frame === page.mainFrame());

async function resetVisibly(page) {
  const reset = page.locator('[data-global-reset]');
  if (!await reset.isVisible()) await page.locator('button[data-global-panel]').click();
  await reset.click();
}

async function interruptReset(initiator, survivor, holder, config) {
  await holder.evaluate(lock => {
    void navigator.locks.request(lock, () => new Promise(resolve => { window.releaseFixtureLock = resolve; }));
  }, config.lock);
  await holder.waitForFunction(() => typeof window.releaseFixtureLock === 'function');
  await initiator.evaluate(() => { void DobbyGlobalDemo.reset(); });
  await holder.waitForFunction(({ marker, lock }) => localStorage.getItem(marker) &&
    navigator.locks.query().then(state => state.pending.some(entry => entry.name === lock)), config);
  const blockedWrites = await survivor.evaluate(key => {
    const actions = [() => localStorage.setItem(key, 'stale-write'), () => indexedDB.open(key)];
    return actions.map(action => {
      try { action(); return false; }
      catch { return true; }
    });
  }, probeKey);
  assert.deepEqual(blockedWrites, [true, true], 'An initialized tab cannot write while reset is pending');
  await survivor.evaluate(() => {
    document.getElementById('dv7-engine').contentWindow.DobbyFamilyUI.repaint();
  });
  await initiator.close();
  assert.ok(await holder.evaluate(marker => localStorage.getItem(marker), config.marker), 'The interrupted reset left a durable marker');
}

async function replayResetMessages(tabs, neutral, channel, messages) {
  const last = type => messages.findLast(message => message?.type === type);
  const stale = [last('prepare'), last('complete')];
  assert.ok(stale.every(Boolean), 'The reset published prepare and complete messages');
  const freshNavigations = [];
  for (const [client, page] of tabs) {
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) freshNavigations.push(client); });
    await page.evaluate(({ channel, probeKey, client }) => {
      sessionStorage.setItem(probeKey, 'FRESH_' + client);
      window.launchResetObserver = new BroadcastChannel(channel);
      window.launchResetObserved = [];
      window.launchResetObserver.onmessage = event => window.launchResetObserved.push(event.data);
    }, { channel, probeKey, client });
  }
  await neutral.evaluate(({ channel, stale }) => {
    const sender = new BroadcastChannel(channel);
    stale.forEach(message => sender.postMessage(message));
    sender.close();
  }, { channel, stale });
  for (const [client, page] of tabs) {
    await page.waitForFunction(stale => stale.every(message => window.launchResetObserved?.some(item =>
      JSON.stringify(item) === JSON.stringify(message))), stale);
    assert.equal(await page.evaluate(probeKey => sessionStorage.getItem(probeKey), probeKey), 'FRESH_' + client);
  }
  assert.deepEqual(freshNavigations, [], 'Delayed messages from an already applied reset do not reload fresh tabs');
}

async function verifyQueuedChildAccessAfterSignOut(parent, otherTab, neutral, config) {
  const readSuspension = () => neutral.evaluate(key => JSON.parse(localStorage.getItem(key)).suspended.C, config.backend);
  const outcomes = [];
  for (const suspend of [true, false]) {
    await Promise.all([ready(parent, 'A'), ready(otherTab, 'A')]);
    await parent.evaluate(value => DobbyGlobalDemo.setSuspended('C', value), !suspend);
    assert.equal(await readSuspension(), !suspend, 'The requested action would change the child’s access');

    await neutral.evaluate(lock => {
      void navigator.locks.request(lock, () => new Promise(resolve => { window.releaseSessionRaceLock = resolve; }));
    }, config.lock);
    try {
      await neutral.waitForFunction(() => typeof window.releaseSessionRaceLock === 'function');
      const waitForQueue = count => neutral.waitForFunction(async ({ lock, count }) =>
        (await navigator.locks.query()).pending.filter(item => item.name === lock).length >= count,
      { lock: config.lock, count });
      await parent.evaluate(() => { void DobbyGlobalDemo.endSession(); });
      await waitForQueue(1);
      await otherTab.evaluate(value => { void DobbyGlobalDemo.setSuspended('C', value).catch(() => {}); }, suspend);
      await waitForQueue(2);

      // A final request on the real lock waits for both commands, even if a
      // session-change notification reloads an initiating document first.
      await neutral.evaluate(lock => {
        const drained = navigator.locks.request(lock, () => {});
        window.releaseSessionRaceLock();
        delete window.releaseSessionRaceLock;
        return drained;
      }, config.lock);
      await Promise.all([parent, otherTab].map(tab => tab.locator('[data-review-banner]').getByText(/Session fermée/i).waitFor()));
      outcomes.push({ action: suspend ? 'suspend' : 'reactivate', suspended: await readSuspension() });
    } finally {
      await neutral.evaluate(() => {
        window.releaseSessionRaceLock?.();
        delete window.releaseSessionRaceLock;
      });
    }
    if (suspend) await parent.evaluate(() => { void DobbyGlobalDemo.startSession(); });
  }
  assert.deepEqual(outcomes, [{ action: 'suspend', suspended: false }, { action: 'reactivate', suspended: true }],
    'A queued child access change cannot take effect after the parent session closes');
}

async function run(base, browser) {
  const manifestURL = new URL('review-manifest.json', base);
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, locale: 'fr-BE',
    timezoneId: 'Europe/Brussels', reducedMotion: 'reduce', serviceWorkers: 'block' });
  const egress = [], errors = [], dialogs = [], resetMessages = [];
  let phase = 'prepare personas';
  await context.route('**/*', route => {
    const request = route.request(), target = new URL(request.url());
    if (target.origin === base.origin && target.pathname.startsWith(base.pathname) && ['GET', 'HEAD'].includes(request.method())) return route.continue();
    egress.push({ method: request.method(), origin: target.origin, path: target.pathname });
    return route.abort();
  });
  await context.routeWebSocket('**/*', websocket => {
    const target = new URL(websocket.url());
    egress.push({ origin: target.origin, path: target.pathname, method: 'WebSocket' });
    return websocket.close();
  });
  context.on('page', page => {
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push({ phase, url: page.url(), stack: error.stack || error.message }));
    page.on('dialog', dialog => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      void dialog.accept();
    });
  });
  try {
    const neutral = await context.newPage();
    const response = await neutral.goto(manifestURL.href);
    assert.ok(response?.ok());
    const manifest = await response.json();
    assert.equal(manifest.realBackend, false);
    const config = configuration(manifest);
    await context.exposeBinding('recordLaunchResetMessage', (_source, message) => { resetMessages.push(message); });
    await context.addInitScript(channel => {
      const original = BroadcastChannel.prototype.postMessage;
      BroadcastChannel.prototype.postMessage = function (message) {
        if (this.name === channel && window === top) void window.recordLaunchResetMessage(message);
        return original.call(this, message);
      };
    }, config.channel);
    const names = witnessNames(base, config.prefix);
    const initialSentinels = await witnessSnapshot(neutral, names, config.prefix, true);
    const entry = client => {
      const target = new URL(manifest.entry, base);
      assert.ok(target.href.startsWith(base.href));
      target.searchParams.set('client', client);
      return target.href;
    };

    const tabs = new Map(), snapshots = new Map();
    for (const client of clients) {
      const page = await context.newPage();
      await page.goto(manifestURL.href);
      await page.evaluate(({ probeKey, value }) => sessionStorage.setItem(probeKey, value), { probeKey, value: untouched + ' ' + client });
      await page.goto(entry(client));
      const snapshot = await ready(page, client);
      assert.equal(snapshot.namespace, `${config.prefix}client-${client}|`);
      assert.ok(snapshot.identity, `Persona ${client} is verified`);
      await markClient(page, client);
      tabs.set(client, page);
      snapshots.set(client, snapshot);
    }
    assert.equal(new Set([...snapshots.values()].map(snapshot => snapshot.identity)).size, clients.length);
    const generation = snapshots.get('A').generation;
    assert.ok(Number.isSafeInteger(generation));
    assert.ok([...snapshots.values()].every(snapshot => snapshot.generation === generation));
    for (const [client, page] of tabs) {
      assert.deepEqual(await readClientProbe(page), { local: 'LOCAL_' + client, session: 'SESSION_' + client,
        unrelatedSession: untouched + ' ' + client, attachment: 'Attachment in ' + client, extraDB: true });
    }
    await checkSourceIsolation(tabs.get('A'), base);
    await checkSourceIsolation(tabs.get('C'), base);
    assert.deepEqual(await witnessSnapshot(neutral, names, config.prefix), initialSentinels, 'Opening all four personas preserves the sibling and production storage');

    phase = 'stale shared mirror';
    const mirror = await neutral.evaluate(key => localStorage.getItem(key), config.backend);
    const title = 'TEST Article de reprise inter-onglets';
    const author = tabs.get('A'), receiver = tabs.get('B');
    await author.evaluate(title => DobbyFamilyStitchEngine.win().DobbyFamilyUI.grocery.add({ title, quantity: 1, unit: 'pièce' }), title);
    await author.evaluate(() => DobbyGlobalDemo.sync());
    await author.waitForFunction(async title => (await DobbyGlobalDemo.rows()).some(item => item.title === title), title);
    await neutral.evaluate(({ key, mirror }) => localStorage.setItem(key, mirror), { key: config.backend, mirror });
    const observed = await receiver.evaluate(async title => (await DobbyGlobalDemo.rows()).filter(item => item.title === title).length, title);
    assert.equal(observed, 1, 'A stale browser mirror cannot replace the endorsed shared state');
    await receiver.evaluate(() => DobbyGlobalDemo.sync());
    await receiver.waitForFunction(title => DobbyFamilyStitchEngine.win().DobbyFamilyUI.grocery.read().items.some(item => item.title === title), title);

    phase = 'visible reset';
    await sharedProbe(neutral, config, 'shared change before visible reset');
    const parentB = tabs.get('B'), childD = tabs.get('D');
    await parentB.evaluate(() => DobbyGlobalDemo.setOffline(true));
    await Promise.all([navigated(parentB), parentB.evaluate(() => { void DobbyGlobalDemo.endSession(); })]);
    await parentB.locator('[data-review-banner]').getByText(/Session fermée/i).waitFor();
    await Promise.all([navigated(childD), tabs.get('A').evaluate(() => DobbyGlobalDemo.setSuspended('D', true))]);
    await childD.locator('[data-review-banner]').getByText(/Profil suspendu/i).waitFor();
    await Promise.all([...tabs.values()].map(navigated).concat(resetVisibly(tabs.get('A'))));
    for (const [client, page] of tabs) await assertReset(page, client, snapshots.get(client), generation + 1);
    assert.equal(await tabs.get('B').evaluate(() => DobbyGlobalDemo.isOffline()), false);
    assert.deepEqual(await sharedProbe(neutral, config), { generation: generation + 1, probe: null });
    assert.deepEqual(await witnessSnapshot(neutral, names, config.prefix), initialSentinels);

    phase = 'interrupted reset';
    await sharedProbe(neutral, config, 'shared change before interrupted reset');
    for (const [client, page] of tabs) await markClient(page, client);
    await interruptReset(tabs.get('A'), tabs.get('B'), neutral, config);
    tabs.delete('A');
    const recoveredA = await context.newPage();
    await recoveredA.goto(manifestURL.href);
    await recoveredA.evaluate(({ probeKey, value }) => sessionStorage.setItem(probeKey, value), { probeKey, value: untouched + ' A' });
    const nativeRequests = [];
    recoveredA.on('request', request => {
      if (new URL(request.url()).pathname.endsWith('/essai-stitch-v5-famille/index.html')) nativeRequests.push(request.url());
    });
    await recoveredA.goto(entry('A'), { waitUntil: 'domcontentloaded' });
    assert.deepEqual(nativeRequests, [], 'A new tab does not start the native engine while recovery is waiting for the lock');
    await Promise.all([...tabs.values()].map(navigated).concat(neutral.evaluate(() => window.releaseFixtureLock())));
    tabs.set('A', recoveredA);
    for (const [client, page] of tabs) await assertReset(page, client, snapshots.get(client), generation + 2);
    assert.equal(nativeRequests.length, 1, 'Recovery boots one native document');
    assert.equal(await neutral.evaluate(marker => localStorage.getItem(marker), config.marker), null);
    assert.deepEqual(await sharedProbe(neutral, config), { generation: generation + 2, probe: null });
    phase = 'stale reset messages';
    await replayResetMessages(tabs, neutral, config.channel, resetMessages);
    phase = 'queued child access after sign-out';
    const otherParentTab = await context.newPage();
    try {
      await otherParentTab.goto(entry('A'));
      await verifyQueuedChildAccessAfterSignOut(tabs.get('A'), otherParentTab, neutral, config);
    } finally {
      await otherParentTab.close();
    }
    assert.deepEqual(await witnessSnapshot(neutral, names, config.prefix), initialSentinels);
    assert.deepEqual(egress, [], 'The browser only uses local demo resources');
    assert.deepEqual(errors, []);
    assert.equal(dialogs.filter(dialog => dialog.type === 'alert').length, 0);
    console.log('GLOBAL_LAUNCH_RESET_PASS A/B/C/D, native attachments and open IDB, interrupted reset recovery, production and sibling storage, zero egress');
  } finally {
    await context.close();
  }
}

(async () => {
  assert.ok(process.env.DOBBY_GLOBAL_LAUNCH_BASE, 'Set DOBBY_GLOBAL_LAUNCH_BASE to the local launch bundle URL');
  const base = new URL(process.env.DOBBY_GLOBAL_LAUNCH_BASE);
  assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname) && base.protocol === 'http:' &&
    base.pathname.endsWith('/') && !base.username && !base.password && !base.search && !base.hash,
    'Only a local launch bundle can be used for this recipe');
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost'] });
  try { await run(base, browser); }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

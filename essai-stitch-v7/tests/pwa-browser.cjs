/* Real Chromium service-worker, offline and update journeys for a nested Pages mount. */
'use strict';

const assert = require('node:assert/strict');
const { mkdtemp, rm, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { chromium, devices } = require('playwright');
const { startServer, writeEvidence, workerPath, shellProbe, privatePaths, privateBody } = require('./helpers/pwa-server.cjs');

const widths = (process.env.DOBBY_PWA_WIDTHS || '320,390,768,1440').split(',').map(Number);
const evidence = process.env.DOBBY_PWA_EVIDENCE;
const executablePath = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
const browserArgs = ['--no-sandbox', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1'];
const family = 'essai-stitch-v7/famille.html';
const appManifest = 'essai-stitch-v7/manifest.webmanifest';
const installButton = '#dobby-pwa-install';
const updateNotice = '#dobby-pwa-update';
const foreignCache = 'unrelated-fixture-cache';
const foreignPath = '/outside-pwa-fixture/';
const privacyToken = 'PWA_FIXTURE_PRIVATE_VALUE';
const legacyEngine = 'essai-stitch-v5-famille/index.html';

const url = (fixture, relative) => new URL(relative, fixture.base).href;
const browserContext = (browser, width, options = {}) => browser.newContext({ ...options,
  viewport: { width, height: 900 }, locale: 'fr-BE', reducedMotion: 'reduce' });

async function capture(page, width, state) {
  await writeEvidence(evidence, folder => page.screenshot({ path: join(folder, `${width}-${state}.png`),
    fullPage: true, animations: 'disabled', timeout: 10000 }));
}

async function protectContext(context, fixture) {
  await context.route(new RegExp(`^(?!${fixture.origin.replaceAll('.', '\\.')}/)`), route => route.abort());
}

async function ready(page, view) {
  await page.waitForFunction(() => window.DobbyStitchV7?.ready);
  if (view) await page.locator(`body[data-family-view="${view}"]`).waitFor({ state: 'attached' });
}

async function controlled(page) {
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  return page.evaluate(async () => ({
    script: navigator.serviceWorker.controller.scriptURL,
    scope: (await navigator.serviceWorker.getRegistration()).scope,
  }));
}

async function fits(page, width) {
  assert.deepEqual(await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth]),
    [width, width], `The ${width}px view fits the viewport`);
}

async function verifyManifest(page, session, fixture) {
  await page.goto(url(fixture, family));
  await ready(page);
  assert.deepEqual(await controlled(page), { script: new URL(workerPath, fixture.origin).href, scope: fixture.base.href });
  const result = await session.send('Page.getAppManifest');
  assert.equal(result.url, url(fixture, appManifest));
  assert.deepEqual(result.errors, []);
  const manifest = JSON.parse(result.data);
  assert.equal(new URL(manifest.id, result.url).href, fixture.base.href);
  assert.equal(new URL(manifest.scope, result.url).href, fixture.base.href);
  assert.equal(new URL(manifest.start_url, result.url).href, url(fixture, family + '#access'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.name, 'DOBBY');
  const iconSizes = await page.evaluate(async ({ icons, manifestURL }) => Promise.all(icons.map(async icon => {
    const url = new URL(icon.src, manifestURL);
    const response = await fetch(url);
    const image = await createImageBitmap(await response.blob());
    const dimensions = `${image.width}x${image.height}`;
    image.close();
    return { url: url.href, dimensions, purpose: icon.purpose || 'any', contentType: response.headers.get('content-type') };
  })), { icons: manifest.icons, manifestURL: result.url });
  for (const icon of iconSizes) {
    assert.ok(icon.url.startsWith(fixture.base.href));
    assert.equal(icon.contentType, 'image/png');
  }
  for (const size of ['192x192', '512x512']) {
    assert.ok(iconSizes.some(icon => icon.dimensions === size && icon.purpose.split(' ').includes('any')), size);
  }
  assert.ok(iconSizes.some(icon => icon.dimensions === '512x512' && icon.purpose.split(' ').includes('maskable')));
  return { manifestURL: result.url, startURL: url(fixture, family + '#access'), iconSizes };
}

async function verifyStandalone(fixture, width, startURL) {
  const profile = await mkdtemp(join(tmpdir(), 'dobby-pwa-app-'));
  let context;
  try {
    context = await chromium.launchPersistentContext(join(profile, 'browser'), {
      executablePath,
      ignoreDefaultArgs: ['about:blank'],
      args: [...browserArgs, '--app=' + startURL],
      env: { ...process.env, XDG_DATA_HOME: join(profile, 'data'), XDG_CONFIG_HOME: join(profile, 'config'),
        XDG_CACHE_HOME: join(profile, 'cache') },
      viewport: { width, height: 900 }, locale: 'fr-BE', reducedMotion: 'reduce',
    });
    await protectContext(context, fixture);
    assert.equal(context.pages().length, 1, 'Chromium opens one standalone app window');
    const [page] = context.pages();
    page.setDefaultTimeout(15000);
    await ready(page);
    await page.locator('main[data-access-view]').waitFor();
    await controlled(page);
    const cdp = await context.newCDPSession(page);
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
    assert.deepEqual(installabilityErrors, []);
    assert.equal(new URL(page.url()).pathname, new URL(startURL).pathname);
    assert.equal(await page.evaluate(() => matchMedia('(display-mode: standalone)').matches), true);
    assert.equal(await page.locator(installButton).count(), 0);
    await fits(page, width);
    await capture(page, width, 'lancement-autonome');
    await openMenu(page, fixture);
    assert.equal(await page.locator(installButton).count(), 0, 'An app window has no install action in its Menu');
    await capture(page, width, 'menu-autonome');
    return { startURL, installabilityErrors, displayMode: 'native Chromium app window', osInstallation: 'not exercised' };
  } finally {
    await context?.close();
    await rm(profile, { recursive: true, force: true });
  }
}

async function openMenu(page, fixture) {
  await page.goto(url(fixture, family + '#menu'));
  await ready(page, 'menu');
}

async function verifyInstallAction(page, fixture, width) {
  await openMenu(page, fixture);
  const install = page.locator(installButton);
  await page.evaluate(() => {
    window.pwaPromptCalls = 0;
    window.simulatePwaPrompt = outcome => {
      const prompt = new Event('beforeinstallprompt', { cancelable: true });
      prompt.prompt = async () => { window.pwaPromptCalls++; };
      prompt.userChoice = Promise.resolve({ outcome, platform: 'web' });
      return !window.dispatchEvent(prompt);
    };
  });
  assert.equal(await page.evaluate(() => window.simulatePwaPrompt('dismissed')), true, 'DOBBY defers the native prompt');
  await install.waitFor();
  assert.equal(await install.getAttribute('type'), 'button');
  assert.equal(await page.getByRole('button', { name: 'Installer DOBBY', exact: true }).count(), 1);
  assert.equal(await page.evaluate(() => window.pwaPromptCalls), 0, 'Showing the menu does not prompt automatically');
  await fits(page, width);
  await capture(page, width, 'menu-installer');
  await install.click();
  assert.equal(await page.evaluate(() => window.pwaPromptCalls), 1);
  await install.click();
  const help = page.getByRole('dialog', { name: 'Installer DOBBY' });
  await help.waitFor();
  assert.equal(await page.evaluate(() => window.pwaPromptCalls), 1, 'A dismissed browser prompt is consumed');
  await help.getByRole('button', { name: 'Fermer', exact: true }).click();
  await help.waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => window.simulatePwaPrompt('accepted')), true);
  await install.click();
  assert.equal(await page.evaluate(() => window.pwaPromptCalls), 2);
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await install.waitFor({ state: 'detached' });

  return { browserPrompt: 'synthetic beforeinstallprompt, userChoice and appinstalled events' };
}

async function verifySafariHelp(browser, fixture, width) {
  const context = await browserContext(browser, width, devices['iPhone 13']);
  try {
    await protectContext(context, fixture);
    await context.addInitScript(() => {
      // Chromium is the engine here. Only the iOS/Safari identity and prompt availability are simulated.
      window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
      }, { capture: true });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await openMenu(page, fixture);
    const action = page.locator(installButton);
    await action.click();
    const dialog = page.getByRole('dialog', { name: 'Installer DOBBY' });
    await dialog.waitFor();
    for (const text of [/Partager/i, /Sur l’écran d’accueil/i, /Ouvrir comme app web/i, /Ajouter/i]) {
      assert.match(await dialog.innerText(), text);
    }
    await fits(page, width);
    await capture(page, width, 'safari-aide');
    await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await action.evaluate(button => document.activeElement === button), true);
  } finally {
    await context.close();
  }
}

async function cacheSnapshot(page, fixture, tag) {
  const cache = await page.evaluate(async () => {
    const names = await caches.keys();
    const entries = await Promise.all(names.filter(name => name.startsWith('dobby-v7-static:')).sort().map(async name => ({
      name, resources: (await (await caches.open(name)).keys()).map(request => ({ url: request.url, method: request.method })).sort((a, b) => a.url.localeCompare(b.url)),
    })));
    return { names, entries };
  });
  assert.ok(cache.entries.length, `${tag}: static cache exists`);
  for (const entry of cache.entries) {
    assert.ok(entry.name.includes(encodeURIComponent(fixture.base.href)), `${tag}: cache name includes its deployment scope`);
    assert.ok(entry.resources.some(resource => resource.url === url(fixture, family)));
    for (const { url: key, method } of entry.resources) {
      const resource = new URL(key);
      assert.ok(key.startsWith(fixture.base.href), `${tag}: ${key} is in the deployment scope`);
      assert.equal(method, 'GET');
      assert.equal(resource.search + resource.hash, '', `${tag}: cache key excludes query and fragment`);
      assert.equal(privatePaths.some(relative => key === url(fixture, relative)), false, `${tag}: private URL ${key}`);
    }
  }
  return cache;
}

async function verifyPrivateTraffic(page, fixture) {
  const result = await page.evaluate(async ({ paths, checkedAsset, foreignPath, token }) => {
    const cases = [
      [paths[0], { method: 'POST', body: JSON.stringify({ password: token }) }],
      [paths[1], { headers: { Authorization: `Bearer ${token}` } }],
      [paths[2] + '?token=' + token],
      [paths[3]],
      [paths[4]],
      [checkedAsset + '?token=' + token],
      [checkedAsset, { headers: { Authorization: `Bearer ${token}` } }],
      [checkedAsset, { headers: { Range: 'bytes=0-10' } }],
      [foreignPath],
    ];
    const responses = await Promise.all(cases.map(async ([path, options]) => {
      const response = await fetch(path, options);
      return [response.status, await response.text()];
    }));
    return responses;
  }, { paths: privatePaths.map(path => url(fixture, path)), checkedAsset: url(fixture, shellProbe), foreignPath, token: privacyToken });
  assert.equal(result.length, 9);
  for (const response of result) assert.deepEqual(response, [200, privateBody]);
  const request = fixture.requests.find(row => row.path.endsWith('/auth/v1/token') && row.method === 'POST');
  assert.equal(request?.status, 200);

  const isolated = await page.context().newPage();
  try {
    const legacy = await isolated.goto(url(fixture, legacyEngine), { waitUntil: 'commit' });
    assert.equal(legacy.fromServiceWorker(), false, 'The legacy engine is not an offline top-level entry point');
    const callback = await isolated.goto(url(fixture, family + '?token=' + privacyToken + '#access'));
    assert.equal(callback.fromServiceWorker(), false, 'The callback navigation is network-only');
    await ready(isolated);
    assert.equal(new URL(isolated.url()).search, '', 'The entry parser removes the synthetic callback token');
  } finally {
    await isolated.close();
  }
}

async function verifyPrivateOffline(page, fixture) {
  const result = await page.evaluate(async ({ paths, foreignPath }) => Promise.all([...paths, foreignPath].map(async path => {
    try { return { url: path, status: (await fetch(path)).status }; }
    catch (error) { return { url: path, error: error.name }; }
  })), { paths: privatePaths.map(path => url(fixture, path)), foreignPath });
  for (const record of result) assert.equal(record.error, 'TypeError', `No offline read for ${record.url}`);
}

async function contactValue(page, name) {
  return page.evaluate(name => DobbyFamilyStitchEngine.read().contacts.find(contact => contact.name === name), name);
}

async function verifyOffline(page, context, fixture, width, name) {
  await page.goto(url(fixture, family + '#contacts'));
  await ready(page, 'contacts');
  await context.setOffline(true);
  const response = await page.reload();
  assert.equal(response.fromServiceWorker(), true, 'The offline document is served by the active worker');
  await ready(page, 'contacts');
  await verifyPrivateOffline(page, fixture);
  await fits(page, width);
  await page.getByRole('button', { name: '+ Inscrire un nouveau contact', exact: true }).click();
  await page.locator('#contact-name').fill(name);
  await page.locator('#contact-role').fill('Créé hors connexion');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await ready(page, 'contacts');
  const contact = await contactValue(page, name);
  assert.ok(contact?.id, 'The native writer assigned a persisted contact identifier');
  assert.equal(contact.role, 'Créé hors connexion');
  const card = page.locator('[data-fa-action="rg-contact-open"]').filter({ hasText: name });
  await card.click();
  await page.getByRole('button', { name: 'Modifier', exact: true }).click();
  await page.locator('#contact-role').fill('Modifié hors connexion');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await ready(page, 'contacts');
  await page.reload();
  await ready(page, 'contacts');
  const saved = await contactValue(page, name);
  assert.equal(saved.id, contact.id);
  assert.equal(saved.role, 'Modifié hors connexion');
  await card.waitFor();
  await capture(page, width, 'hors-ligne');
  return saved;
}

async function updateWorker(page, expectedState) {
  return page.evaluate(async expected => {
    const registration = await navigator.serviceWorker.getRegistration();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Worker did not reach ' + expected)), 15000);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        function check() {
          if (worker.state === 'installed' || worker.state === 'redundant') {
            clearTimeout(timer);
            resolve(worker.state);
          }
        }
        worker.addEventListener('statechange', check);
        check();
      }, { once: true });
      registration.update().catch(error => { clearTimeout(timer); reject(error); });
    });
  }, expectedState);
}

async function verifyShellVersion(page, fixture, expected) {
  const body = await page.evaluate(async url => (await fetch(url)).text(), url(fixture, shellProbe));
  assert.match(body, new RegExp(`PWA_BROWSER_FIXTURE_BUILD_${expected}\\b`));
  assert.doesNotMatch(body, new RegExp(privateBody));
}

async function verifyUpdate(page, context, fixture, width, before, contact) {
  const notice = page.locator(updateNotice);
  assert.equal(await notice.count(), 0);
  await context.setOffline(false);
  await page.evaluate(async ({ name, path }) => {
    const cache = await caches.open(name);
    await cache.put(path, new Response('Unrelated fixture data to preserve'));
  }, { name: foreignCache, path: foreignPath });
  const passive = await context.newPage();
  passive.setDefaultTimeout(15000);
  await passive.goto(url(fixture, family + '#contacts'));
  await ready(passive, 'contacts');
  await controlled(passive);
  await passive.evaluate(() => { window.pwaPassiveTabMarker = true; });
  if (width === 390) {
    fixture.setRelease('interrupted', { broken: true });
    assert.equal(await updateWorker(page, 'redundant'), 'redundant');
    assert.ok(fixture.requests.some(row => row.path.endsWith(shellProbe) && row.status === 503));
    assert.equal(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()).waiting), false);
    assert.equal(await notice.count(), 0);
    const interrupted = await cacheSnapshot(page, fixture, 'interrupted');
    assert.deepEqual(interrupted.entries, before.entries, 'An interrupted install leaves only the active cache');
    await context.setOffline(true);
    await verifyShellVersion(page, fixture, 1);
    await context.setOffline(false);
  }

  fixture.setRelease(2);
  assert.equal(await updateWorker(page, 'installed'), 'installed');
  await notice.waitFor();
  assert.match(await notice.innerText(), /mise à jour de DOBBY est disponible/i);
  const waiting = await cacheSnapshot(page, fixture, 'waiting');
  assert.equal(waiting.entries.length, 2);
  assert.deepEqual(waiting.entries[0], before.entries[0]);
  assert.deepEqual(waiting.entries[1].resources, before.entries[0].resources);
  await fits(page, width);
  await capture(page, width, 'mise-a-jour-attente');
  await notice.getByRole('button', { name: 'Plus tard', exact: true }).click();
  await notice.waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()).waiting), true);
  await context.setOffline(true);
  await verifyShellVersion(page, fixture, 1);
  await page.reload();
  await ready(page, 'contacts');
  assert.deepEqual(await contactValue(page, contact.name), contact);
  await notice.waitFor();
  await Promise.all([
    page.waitForEvent('framenavigated', frame => frame === page.mainFrame()),
    notice.getByRole('button', { name: 'Mettre à jour', exact: true }).click(),
  ]);
  await ready(page, 'contacts');
  await controlled(page);
  await verifyShellVersion(page, fixture, 2);
  assert.deepEqual(await contactValue(page, contact.name), contact);
  assert.equal(await page.evaluate(async ({ name, path }) => (await (await caches.open(name)).match(path))?.text(),
    { name: foreignCache, path: foreignPath }), 'Unrelated fixture data to preserve');
  const activated = await cacheSnapshot(page, fixture, 'activated');
  assert.deepEqual(activated.entries, [waiting.entries[1]], 'Activation removes the old DOBBY cache');
  await notice.waitFor({ state: 'hidden' });
  await capture(page, width, 'mise-a-jour-appliquee');

  const passiveNotice = passive.locator(updateNotice);
  await passiveNotice.getByRole('button', { name: 'Recharger DOBBY', exact: true }).waitFor();
  assert.match(await passiveNotice.innerText(), /mise à jour de DOBBY est prête/i);
  assert.equal(await passive.evaluate(() => window.pwaPassiveTabMarker), true, 'Another tab does not reload without consent');
  await capture(passive, width, 'mise-a-jour-autre-onglet');
  await Promise.all([
    passive.waitForEvent('framenavigated', frame => frame === passive.mainFrame()),
    passiveNotice.getByRole('button', { name: 'Recharger DOBBY', exact: true }).click(),
  ]);
  await ready(passive, 'contacts');
  assert.deepEqual(await contactValue(passive, contact.name), contact);
  await passive.close();
  return { interruptedInstallation: width === 390, passiveTabPreserved: true, cachedResources: activated.entries[0].resources.length };
}

async function run(browser, fixture, width) {
  fixture.setRelease(1);
  const context = await browserContext(browser, width);
  const report = { width, browser: browser.version(), checks: [], pageErrors: [] };
  const failedRequests = [];
  let page, phase;
  const step = async (label, scenario) => {
    phase = label;
    console.log('PWA_CHECK', width, label);
    const detail = await scenario();
    report.checks.push({ label, detail });
  };
  try {
    await protectContext(context, fixture);
    await context.addInitScript(() => {
      window.addEventListener('beforeinstallprompt', event => {
        if (!event.isTrusted) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      }, { capture: true });
    });
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => report.pageErrors.push(error.message));
    page.on('requestfailed', request => {
      const failed = new URL(request.url());
      if (failed.origin === fixture.origin) failedRequests.push({ path: failed.pathname, failure: request.failure()?.errorText });
    });
    const cdp = await context.newCDPSession(page);
    let manifest;
    await step('Chromium manifest and icons', async () => {
      manifest = await verifyManifest(page, cdp, fixture);
      return manifest;
    });
    await step('Chromium installability and manifest start_url in standalone window', () => verifyStandalone(fixture, width, manifest.startURL));
    await step('install action, browser prompt fixture and appinstalled', () => verifyInstallAction(page, fixture, width));
    await step('Safari iOS installation guidance', () => verifySafariHelp(browser, fixture, width));
    let baseline, contact;
    await step('network-only private traffic', async () => {
      baseline = await cacheSnapshot(page, fixture, 'initial');
      await verifyPrivateTraffic(page, fixture);
      assert.deepEqual(await cacheSnapshot(page, fixture, 'after private traffic'), baseline);
      return { privateProbes: 11, cachedResources: baseline.entries[0].resources.length };
    });
    await step('offline reload, native create and edit', async () => {
      contact = await verifyOffline(page, context, fixture, width, `TEST PWA — Contact fictif ${width}`);
    });
    await step('waiting worker, explicit update and durable local data', () => verifyUpdate(page, context, fixture, width, baseline, contact));
    assert.deepEqual(report.pageErrors, []);
    report.passed = true;
    console.log('PWA_BROWSER_PASS', width);
  } catch (error) {
    report.passed = false;
    report.failure = { phase, message: error.message };
    report.httpErrors = fixture.requests.filter(row => row.status >= 400).map(({ method, path, status }) => ({ method, path, status }));
    report.failedRequests = failedRequests;
    if (page) await capture(page, width, 'echec').catch(() => {});
    throw error;
  } finally {
    await context.close();
    await writeEvidence(evidence, folder => writeFile(join(folder, `${width}-resultat.json`), JSON.stringify(report, null, 2) + '\n'));
  }
}

(async () => {
  assert.ok(widths.length && widths.every(width => Number.isSafeInteger(width) && width > 0));
  const fixture = await startServer();
  let browser;
  try {
    browser = await chromium.launch({ executablePath, args: browserArgs });
    for (const width of widths) await run(browser, fixture, width);
  } finally {
    await browser?.close();
    await fixture.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

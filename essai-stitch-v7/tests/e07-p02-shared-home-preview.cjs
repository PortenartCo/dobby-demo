/* Exercise the isolated browser simulation through the existing native family
   client and visible V7 controls. No account or external backend is contacted. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = new URL(process.env.DOBBY_SHARED_HOME_PREVIEW_BASE ||
  'http://127.0.0.1:8766/essai-dobby-e07-p02-shared-home-review-20261112/');
const evidence = path.resolve(process.env.DOBBY_SHARED_HOME_EVIDENCE ||
  '/workspace/scratch/e07-p02-shared-home-preview-evidence');
fs.mkdirSync(evidence, { recursive: true });

const native = page => page.evaluate(() => DobbyCuisineEngine.win().DobbyFamilyUI.grocery.read());
const snapshot = page => page.evaluate(() => DobbyCuisineList.snapshot(DobbyCuisineEngine));
const sharedRows = page => page.evaluate(() => DobbySharedHomeDemo.rows());
const carrot = rows => rows.find(row => row.title === 'Carottes');
const listCarrot = state => state.items.find(row => row.name === 'Carottes');

async function ready(page) {
  await page.waitForFunction(() => {
    if (!window.DobbyCuisine?.ready || !window.DobbySharedHomeDemo) return false;
    const state = DobbyCuisineEngine.win().DobbyFamilyUI?.grocery.read();
    return state?.ready && state.homeSupported === true &&
      state.items.some(row => row.title === 'Carottes' && row.syncState === 'clean');
  });
  await page.evaluate(() => DobbyCuisine.open('shop'));
}

async function sync(page) {
  await page.evaluate(() => DobbySharedHomeDemo.sync());
  await page.waitForFunction(() => {
    const state = DobbyCuisineEngine.win().DobbyFamilyUI.grocery.read();
    return state.ready && state.items.every(row => row.syncState === 'clean') &&
      !/Synchronisation/.test(state.status);
  });
  await page.evaluate(() => DobbyCuisine.refresh());
}

async function amounts(page, atHome, toBuy) {
  const item = listCarrot(await snapshot(page));
  assert.ok(item, 'The native shared grocery row is visible');
  assert.equal(item.requiredQty, 500);
  assert.equal(item.atHomeQty, atHome);
  assert.equal(item.qty, toBuy);
  const row = page.locator('[data-e072-item]').filter({ hasText: 'Carottes' });
  assert.equal(await row.count(), 1);
  assert.match(await row.innerText(), new RegExp('\\b' + toBuy + ' g\\b'));
  return item;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox']
  });
  const external = [], networkWrites = [], errors = [], missing = [];
  const report = { base: base.href, realBackend: false, simulation: 'browser-only HTTP fixture', checks: [] };
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 900 }, locale: 'fr-BE', reducedMotion: 'reduce'
    });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== base.origin) {
        external.push(request.url());
        return route.abort();
      }
      if (!['GET', 'HEAD'].includes(request.method())) networkWrites.push(request.url());
      return route.continue();
    });
    await context.addInitScript(() => {
      // Runs before the preview envelope; this raw value must remain untouched.
      localStorage.setItem('__shared_home_unrelated_sentinel', 'PRESERVE_UNRELATED_DATA');
      localStorage.setItem('dobby-v5-familial-preview-20261108', JSON.stringify({
        demoInitialized: true, extras: ['NEVER_IMPORT_REAL_SENTINEL']
      }));
    });
    const A = await context.newPage(), B = await context.newPage();
    for (const page of [A, B]) {
      page.setDefaultTimeout(15000);
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {
        if (response.status() >= 400) missing.push({ url: response.url(), status: response.status() });
      });
      page.on('dialog', dialog => dialog.accept());
    }
    await A.goto(base.href);
    await ready(A);
    const appB = new URL('essai-stitch-v7/index.html?client=B#shop', base);
    await B.goto(appB.href);
    await ready(B);

    const manifest = await A.evaluate(async () =>
      (await fetch(new URL('review-manifest.json', DobbyReview.root))).json());
    assert.equal(manifest.version, 'E07-P02-SHARED-HOME');
    assert.equal(manifest.realBackend, false);
    assert.equal(manifest.schemaStatus, 'proposed-not-applied');
    assert.ok(manifest.base.startsWith('d3fa291'));
    const contexts = await Promise.all([A, B].map(page => page.evaluate(() =>
      DobbyCuisineEngine.win().DobbyFamilyUI.getContext())));
    assert.equal(contexts[0].householdId, contexts[1].householdId);
    assert.notEqual(contexts[0].userId, contexts[1].userId, 'A and B use separate native user contexts');
    assert.notEqual((await snapshot(A)).scope, (await snapshot(B)).scope);
    assert.equal(await A.evaluate(() => DobbySharedHomeDemo.client), 'A');
    assert.equal(await B.evaluate(() => DobbySharedHomeDemo.client), 'B');
    for (const page of [A, B]) {
      assert.equal(await page.locator('[data-review-banner]').count(), 1);
      assert.match(await page.locator('[data-review-banner]').innerText(), /simul/i);
      assert.ok(await page.locator('[data-review-banner] a[href*="client=A"]').count());
      assert.ok(await page.locator('[data-review-banner] a[href*="client=B"]').count());
      assert.doesNotMatch(await page.locator('main').innerText(), /NEVER_IMPORT_REAL_SENTINEL/);
      const banner = await page.locator('[data-review-banner]').boundingBox();
      const header = await page.locator('body>header').boundingBox();
      assert.ok(header.y >= banner.y + banner.height - 1, 'Preview banner does not hide navigation');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
    }
    await amounts(A, 0, 500);
    await amounts(B, 0, 500);
    const first = carrot(await sharedRows(A));
    assert.equal(first.at_home_quantity, 0);
    report.checks.push('Independent native A/B clients see one simulated household grocery list');

    const rowA = A.locator('[data-e072-item]').filter({ hasText: 'Carottes' });
    await rowA.locator('[data-cu-action=e072-home]').click();
    await A.locator('[data-cu-action=e072-home-partial]').click();await A.locator('#e072-home-qty').fill('300');
    await A.locator('[data-cu-action=e072-home-save]').click();
    await A.locator('[data-e072-dialog]').waitFor({ state: 'detached' });
    await sync(A);
    await sync(B);
    await amounts(A, 300, 200);
    await amounts(B, 300, 200);
    const afterA = carrot(await sharedRows(A));
    assert.equal(afterA.at_home_quantity, 300, 'The native HTTP writer persisted the shared quantity');
    assert.ok(afterA.revision > first.revision, 'The simulated backend advances CAS revision');
    assert.equal(carrot((await native(B)).items).at_home_quantity, 300);
    await A.screenshot({ path: path.join(evidence, '01-client-a-300g-home-390.png'), fullPage: true });
    await B.screenshot({ path: path.join(evidence, '02-client-b-200g-to-buy-390.png'), fullPage: true });
    report.checks.push('A declares 300 g available; B reads 200 g remaining through native sync');

    await B.reload();
    await ready(B);
    await sync(B);
    await amounts(B, 300, 200);
    assert.equal(await B.evaluate(() => DobbySharedHomeDemo.client), 'B');
    report.checks.push('Client B retains its isolated identity and shared availability after reload');

    await B.goto(new URL('essai-stitch-v7/index.html#shop', base).href);
    await ready(B);
    await sync(B);
    assert.equal(await B.evaluate(() => DobbySharedHomeDemo.client), 'B');
    assert.equal(await B.evaluate(() =>
      DobbyCuisineEngine.win().DobbyFamilyUI.getContext().userId), contexts[1].userId);
    assert.equal(new URL(B.url()).searchParams.get('client'), 'B');
    await amounts(B, 300, 200);
    report.checks.push('Navigation without a client query retains B and restores its explicit URL identity');

    await B.locator('[data-e072-item]').filter({ hasText: 'Carottes' })
      .locator('[data-cu-action=e072-home-clear]').click();
    await sync(B);
    await sync(A);
    await amounts(A, 0, 500);
    await amounts(B, 0, 500);
    const afterB = carrot(await sharedRows(B));
    assert.equal(afterB.at_home_quantity, 0);
    assert.ok(afterB.revision > afterA.revision);
    report.checks.push('B clears availability; A returns to 500 g to buy with a newer native revision');

    await A.evaluate(() => DobbyCuisineEngine.win().DobbyFamilyUI.grocery.add({
      title: 'DÉMO — Produit ajouté avant réinitialisation', quantity: 1, unit: 'pièce'
    }));
    await sync(A);
    await sync(B);
    const beforeReset = await sharedRows(A);
    assert.equal(beforeReset.length, 2, 'The shared fixture contains the added native row');
    for (const page of [A, B]) assert.equal((await native(page)).items.length, 2);
    await Promise.all([
      A.waitForEvent('framenavigated', frame => frame === A.mainFrame()),
      B.waitForEvent('framenavigated', frame => frame === B.mainFrame()),
      A.getByRole('button', { name: 'Repartir de zéro', exact: true }).click()
    ]);
    await ready(A);
    await ready(B);
    await sync(A);
    await sync(B);
    const afterReset = await sharedRows(A);
    assert.equal(afterReset.length, 1, 'Visible reset removes added fixture rows');
    assert.equal(afterReset[0].title, 'Carottes');
    assert.ok(afterReset[0].revision > Math.max(...beforeReset.map(row => row.revision)));
    for (const page of [A, B]) {
      assert.equal((await native(page)).items.length, 1, 'Reset clears each native client cache');
      await amounts(page, 0, 500);
    }
    report.checks.push('Visible reset reloads A/B, removes added shared rows and clears both native caches');

    for (const page of [A, B]) {
      assert.equal(await page.evaluate(() =>
        Storage.prototype.__reviewRaw.getItem.call(localStorage, '__shared_home_unrelated_sentinel')),
      'PRESERVE_UNRELATED_DATA');
      assert.match(await page.evaluate(() => Storage.prototype.__reviewRaw.getItem.call(localStorage,
        'dobby-v5-familial-preview-20261108')), /NEVER_IMPORT_REAL_SENTINEL/);
      assert.equal(await page.evaluate(async () => {
        try { await fetch('https://example.invalid/rest/v1/dobby_v2_grocery'); return false; }
        catch { return true; }
      }), true, 'Unrecognized external requests stay blocked');
    }
    assert.deepEqual(external, [], 'Fixture traffic never reaches the browser network');
    assert.deepEqual(networkWrites, [], 'The preview sends no mutation over the network');
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
    report.checks.push('Raw unrelated data stays intact; external traffic and browser network writes stay absent');
    await A.setViewportSize({ width: 1440, height: 960 });
    await A.screenshot({ path: path.join(evidence, '03-client-a-cleared-1440.png'), fullPage: true });
    Object.assign(report, { status: 'PASS', version: manifest.version, sourceSha: manifest.sourceSha,
      contexts, nativeInitial: first, nativeAfterA: afterA, nativeAfterB: afterB,
      nativeBeforeReset: beforeReset, nativeAfterReset: afterReset,
      externalRequests: external, networkWrites, errors, missing });
    fs.writeFileSync(path.join(evidence, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('E07_P02_SHARED_HOME_PREVIEW_PASS', base.href, evidence);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

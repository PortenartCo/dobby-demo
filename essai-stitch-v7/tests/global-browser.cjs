/* Real Chromium journeys through the global preview and its native writers.
 * The preview owns the simulated transport. This test never fulfills an app,
 * auth, RPC or database route, and blocks any actual external traffic.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = new URL(process.env.DOBBY_GLOBAL_BASE ||
  'http://127.0.0.1:8765/essai-dobby-v7-global-review-20261112/');
if (!base.pathname.endsWith('/')) base.pathname += '/';
const evidence = path.resolve(process.env.DOBBY_GLOBAL_EVIDENCE ||
  path.join(__dirname, '../../docs/dobby-v7/evidence/global-review-20261112/local'));
const widths = (process.env.DOBBY_GLOBAL_WIDTHS || '320,390,1440').split(',').map(Number);
fs.mkdirSync(evidence, { recursive: true });

const native = (page, code, values = {}) => page.evaluate(({ code, values }) =>
  DobbyFamilyStitchEngine.evaluate(code, values), { code, values });
const state = page => native(page, 'return JSON.parse(JSON.stringify(st));');
const grocery = page => page.evaluate(() => DobbyCuisineEngine.win().DobbyFamilyUI.grocery.read());
const basket = page => page.evaluate(() => DobbyCuisineList.snapshot(DobbyCuisineEngine));
const demo = (page, method, ...args) => page.evaluate(({ method, args }) =>
  DobbyGlobalDemo[method](...args), { method, args });
const grantRows = (s, missionId) => (s.runeCredits || []).filter(row =>
  row.missionId === missionId && (!row.kind || row.kind === 'grant'));

function appURL(file, client = 'A', hash = '') {
  const url = new URL('essai-stitch-v7/' + file, base);
  url.searchParams.set('client', client);
  url.hash = hash;
  return url.href;
}

async function ready(page, kind) {
  await page.waitForFunction(() => window.DobbyStitchV7?.ready && !!window.DobbyGlobalDemo?.ready);
  await page.evaluate(() => DobbyGlobalDemo.ready);
  if (kind === 'cuisine') await page.waitForFunction(() => window.DobbyCuisine?.ready);
  if (kind === 'family') await page.waitForFunction(() => window.DobbyFamilyStitch?.ready);
}

async function open(page, file, hash = '', client = 'A') {
  await page.goto(appURL(file, client, hash));
  await ready(page, file === 'index.html' ? 'cuisine' : file === 'famille.html' ? 'family' : null);
}

async function sync(page) {
  await demo(page, 'sync');
  await page.waitForFunction(() => {
    const w = DobbyFamilyStitchEngine.win();
    const grocery = w.DobbyFamilyUI.grocery.read();
    return !/Synchronisation/.test(grocery.status) &&
      grocery.items.every(row => row.syncState !== 'pending') &&
      !/Synchronisation/.test(w.DobbyFamilyUI.getModuleStatus('family')) &&
      !/Synchronisation/.test(w.DobbyFamilyUI.getModuleStatus('missions'));
  });
  if (await page.evaluate(() => !!window.DobbyCuisine?.ready)) {
    await page.evaluate(() => DobbyCuisine.refresh());
  }
}

async function shot(page, name, width, report, checkChrome = true) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.fonts.ready);
  const geometry = await page.evaluate(() => {
    const rect = element => {
      if (!element || getComputedStyle(element).display === 'none' || element.hidden) return null;
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height,
        position: getComputedStyle(element).position };
    };
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      header: rect(document.querySelector('body > header')),
      dock: rect(document.querySelector('[data-e01-destination]')?.closest('nav')),
      banner: rect(document.querySelector('[data-review-banner]')),
      scrollHeight: document.documentElement.scrollHeight };
  });
  assert.equal(geometry.scrollWidth, width, 'No horizontal overflow: ' + name);
  if (checkChrome) {
    assert.ok(geometry.header && geometry.header.width <= width + 1, 'Header visible: ' + name);
    assert.ok(geometry.dock && geometry.dock.width <= width + 1, 'Permanent dock visible: ' + name);
    assert.ok(geometry.header.y >= (geometry.banner?.height || 0) - 1,
      'Review banner does not cover the header: ' + name);
    assert.ok(geometry.dock.y + geometry.dock.height <= 901, 'Dock fits viewport: ' + name);
  }
  const filename = name + '-' + width + '.png';
  await page.screenshot({ path: path.join(evidence, filename), fullPage: true });
  report.screenshots.push({ file: filename, geometry });
}

async function seedSentinels(page) {
  const response = await page.goto(new URL('review-manifest.json', base).href);
  assert.ok(response?.ok(), 'The global preview must be built before its browser recipe');
  const manifest = await response.json();
  await page.evaluate(async () => {
    localStorage.setItem('__dobby_global_unrelated_sentinel', 'PRESERVE_UNRELATED_DATA');
    localStorage.setItem('dobby-v5-familial-preview-20261108', 'REAL_SENTINEL_NEVER_IMPORT');
    localStorage.setItem('dobby-review-e072|sentinel', 'PRESERVE_OLD_PREVIEW');
    for (const name of ['dobby-v5-household-preview-v2', 'dobby-review-e072|sentinel-db']) {
      await new Promise((resolve, reject) => {
        const r = indexedDB.open(name, 1);
        r.onupgradeneeded = () => {
          r.result.createObjectStore('items', { keyPath: 'storageKey' });
          r.result.createObjectStore('meta', { keyPath: 'id' });
        };
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const db = r.result, tx = db.transaction('meta', 'readwrite');
          tx.objectStore('meta').put({ id: 'sentinel', value: 'PRESERVE_UNRELATED_IDB' });
          tx.oncomplete = () => { db.close(); resolve(); };
        };
      });
    }
  });
  return manifest;
}

async function verifySentinels(page) {
  await page.goto(new URL('review-manifest.json', base).href);
  assert.deepEqual(await page.evaluate(() => [
    localStorage.getItem('__dobby_global_unrelated_sentinel'),
    localStorage.getItem('dobby-v5-familial-preview-20261108'),
    localStorage.getItem('dobby-review-e072|sentinel')
  ]), ['PRESERVE_UNRELATED_DATA', 'REAL_SENTINEL_NEVER_IMPORT', 'PRESERVE_OLD_PREVIEW']);
  for (const name of ['dobby-v5-household-preview-v2', 'dobby-review-e072|sentinel-db']) {
    assert.equal(await page.evaluate(name => new Promise((resolve, reject) => {
      const r = indexedDB.open(name);
      r.onerror = () => reject(r.error);
      r.onsuccess = () => {
        const db = r.result, tx = db.transaction('meta');
        const get = tx.objectStore('meta').get('sentinel');
        get.onsuccess = () => { db.close(); resolve(get.result?.value); };
      };
    }), name), 'PRESERVE_UNRELATED_IDB');
  }
}

async function newMemo(page, title, body) {
  await page.getByRole('button', { name: 'Ajouter un mémo', exact: true }).click();
  await page.locator('#memo-title').fill(title);
  await page.locator('#memo-body').fill(body);
  await page.locator('#tag-input').fill('démo, recette globale');
  await page.locator('[data-fa-action=rg-save]').first().click();
  await page.waitForFunction(() => document.body.dataset.familyView === 'memos');
}

async function homeAmount(page, name, amount) {
  const row = page.locator('[data-e072-item]').filter({ hasText: name });
  assert.equal(await row.count(), 1, 'One grocery row for ' + name);
  await row.locator('[data-cu-action=e072-home]').click();
  await page.locator('#e072-home-qty').fill(String(amount));
  await page.locator('[data-cu-action=e072-home-save]').click();
  await page.locator('[data-e072-dialog]').waitFor({ state: 'detached' });
}

async function runJourney(browser, width) {
  const report = { width, status: 'RUNNING', base: base.href, realBackend: false,
    checks: [], screenshots: [], externalRequests: [], networkMutations: [], errors: [], missing: [] };
  const context = await browser.newContext({ viewport: { width, height: 900 },
    locale: 'fr-BE', timezoneId: 'Europe/Brussels', reducedMotion: 'reduce' });
  let current = 'manifest', page;
  const step = async (label, callback) => {
    current = label;
    console.log('GLOBAL_CHECK', width, label);
    await callback();
    report.checks.push(label);
  };
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== base.origin) {
      report.externalRequests.push({ method: request.method(), url: request.url() });
      return route.abort();
    }
    if (!['GET', 'HEAD'].includes(request.method())) {
      report.networkMutations.push({ method: request.method(), url: request.url() });
      return route.abort();
    }
    return route.continue();
  });
  context.on('page', p => {
    p.setDefaultTimeout(15000);
    p.on('dialog', dialog => dialog.accept());
    p.on('pageerror', error => report.errors.push({ url: p.url(), message: error.message }));
    p.on('response', response => {
      if (response.status() >= 400) report.missing.push({ url: response.url(), status: response.status() });
    });
  });
  try {
    page = await context.newPage();
    report.manifest = await seedSentinels(page);
    let member, mission, recipe, plannedKey, ingredient, sharedMemo;
    await step('entry, explicit simulation and native clients', async () => {
      await page.goto(base.href);
      await ready(page);
      assert.equal(await page.locator('[data-review-banner]').count(), 1);
      assert.match(await page.locator('[data-review-banner]').innerText(), /ficti|simul|démo/i);
      assert.doesNotMatch(await page.locator('main').innerText(), /REAL_SENTINEL_NEVER_IMPORT/);
      assert.equal(await page.evaluate(() => DobbyGlobalDemo.client), 'A');
      assert.ok(await native(page, 'return DobbyFamilyUI.getContext();'), 'Native fictive context configured');
      assert.equal(await native(page, 'return DobbySharedRunesV2.available();'), true,
        'The global preview exercises the shared Runes V2 writer');
      await shot(page, '01-home', width, report);
    });
    await step('E09 create a fictive member through its visible form', async () => {
      await page.locator('[data-e01-destination="3"]').click();
      await ready(page, 'family');
      await page.getByRole('button', { name: 'Gérer les membres', exact: true }).click();
      await page.locator('#add-member-btn').click();
      await page.locator('#member-firstname').fill('DÉMO — Alex Recette ' + width);
      await page.locator('#fa-member-avatar').selectOption('🧒');
      await shot(page, '02-member-form', width, report);
      await page.locator('[data-fa-action=member-save]').first().click();
      await page.waitForFunction(() => document.body.dataset.familyView === 'health-person');
      member = (await state(page)).familyMembers.find(row => row.name === 'DÉMO — Alex Recette ' + width);
      assert.ok(member?.id, 'Native member was saved');
      await sync(page);
    });
    await step('E03/E04 create, assign and persist a native mission', async () => {
      await page.locator('[data-e01-destination="1"]').click();
      await ready(page);
      await page.locator('#btn-nouvelle-mission').click();
      await page.locator('#quest-title').fill('DÉMO — Mission globale ' + width);
      await page.locator('[name=assigneeId][value="' + member.id + '"]').check();
      await page.locator('[name=effort][value=light]').check();
      await shot(page, '03-mission-form', width, report);
      await page.locator('[data-fa-action=rg-save]').first().click();
      await page.waitForURL(/missions\.html/);
      await ready(page);
      await sync(page);
      mission = (await state(page)).manualMissions.find(row => row.title === 'DÉMO — Mission globale ' + width);
      assert.equal(mission?.assigneeId, member.id);
      assert.equal(mission.effort, 'light');
      await page.reload();
      await ready(page);
      assert.ok((await state(page)).manualMissions.some(row => row.id === mission.id));
    });
    await step('E01 completion confirms exactly one Runes V2 gain', async () => {
      await page.locator('[data-e01-destination="0"]').click();
      await ready(page);
      await page.locator('[data-e01-complete="' + mission.id + '"]').click();
      await page.waitForFunction(id => DobbyFamilyStitchEngine.read().state.manualMissions
        .find(row => row.id === id)?.status === 'done', mission.id);
      await sync(page);
      const confirmed = grantRows(await state(page), mission.id);
      assert.equal(confirmed.length, 1);
      assert.equal(confirmed[0].memberId, member.id);
      assert.equal(confirmed[0].amount, 10);
      const fixture = await demo(page, 'state');
      const rpc = fixture.requests.filter(request => request.path.endsWith('/dobby_missions_v2_write'));
      assert.equal(fixture.modules.missions.payload.runeLedgerVersion, 2);
      assert.ok(rpc.length, 'The native Runes V2 RPC accepted the confirmed gain');
      report.runesProtocol = { version: 2, revision: fixture.modules.missions.revision, requests: rpc };
      await page.reload();
      await ready(page);
      await sync(page);
      await sync(page);
      assert.deepEqual(grantRows(await state(page), mission.id), confirmed,
        'Reload and repeated synchronization do not grant twice');
      report.confirmedGain = confirmed[0];
      await shot(page, '04-completed-mission', width, report);
    });
    await step('E05 chosen member profile survives reload and browser history', async () => {
      await open(page, 'famille.html', 'members');
      await page.locator('[data-fa-member="' + member.id + '"] [data-fa-action=personal]').click();
      await page.locator('[data-profile-member="' + member.id + '"]').waitFor();
      assert.match(await page.locator('main').innerText(), new RegExp('Alex Recette ' + width));
      assert.equal(await native(page, 'return DobbyFamilyMissions.summary(p.id).total;', { id: member.id }), 10);
      const profileURL = page.url();
      await page.reload();
      await ready(page, 'family');
      await page.locator('[data-profile-member="' + member.id + '"]').waitFor();
      assert.equal(page.url(), profileURL);
      await page.locator('[data-fa-action=members]').first().click();
      await page.goBack();
      await page.locator('[data-profile-member="' + member.id + '"]').waitFor();
      await shot(page, '05-profile', width, report);
    });
    await step('E07 plan an existing recipe in the real Midi slot', async () => {
      await page.locator('[data-e01-destination="2"]').click();
      await ready(page, 'cuisine');
      const initial = await state(page), before = initial.planned;
      const dayButtons = page.locator('[data-e07-week-day]');
      const dates = await dayButtons.evaluateAll(nodes => nodes.map(node => node.dataset.e07WeekDay));
      const day = dates.find(date => date > initial.day && !before[date + '-midi']);
      assert.ok(day, 'An unplanned future Midi slot is available');
      await page.locator('[data-e07-week-day="' + day + '"]').click();
      await page.locator('[data-e073-week-detail] [data-cu-action=pick][data-slot=midi]').click();
      await page.waitForFunction(() => DobbyCuisine.view === 'pick');
      await page.locator('[data-p01-mode=library]').click();
      const first = page.locator('[data-p01-recipe="review-soup"]');
      const recipeId = await first.getAttribute('data-p01-recipe');
      recipe = await page.evaluate(id => DobbyCuisineEngine.read().recipes.find(row => row.id === id), recipeId);
      assert.ok(recipe?.ingredients?.length, 'Choose only an existing recipe');
      await first.locator('[data-p01-select]').click();
      await page.locator('[data-p01-save]').click();
      await page.waitForFunction(() => DobbyCuisine.view === 'taverne');
      const planned = (await state(page)).planned;
      plannedKey = Object.keys(planned).find(key => key.endsWith('-midi') && planned[key].id === recipe.id &&
        JSON.stringify(planned[key]) !== JSON.stringify(before[key]));
      assert.ok(plannedKey, 'The native meal writer saved Midi');
      report.planned = { key: plannedKey, recipeId: recipe.id, name: recipe.name };
      await shot(page, '06-tavern', width, report);
    });
    await step('E07 one shared Courses list imports ingredients without duplicates', async () => {
      await page.locator('[data-e07-basket] [data-cu-action=shop]').click();
      await page.locator('[data-cu-action=e072-preview]').click();
      await page.locator('[data-cu-action=e072-confirm]').click();
      await page.locator('[data-e072-dialog]').waitFor({ state: 'detached' });
      await sync(page);
      const list = await basket(page);
      assert.equal(list.shared, true);
      for (const row of recipe.ingredients) {
        const name = Array.isArray(row) ? row[0] : row.name;
        const quantity = Array.isArray(row) ? row[1] : row.qty;
        const unit = Array.isArray(row) ? row[2] : row.unit;
        const matches = list.items.filter(item => item.name.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr') &&
          item.unit === (unit || ''));
        assert.ok(matches.length > 0, 'Imported ingredient is present: ' + name);
        // Unknown quantities retain each meal's provenance for explicit review.
        if (quantity != null) assert.equal(matches.length, 1, 'One compatible quantified row: ' + name);
      }
      ingredient = list.items.find(item => item.requiredQty > 0 && item.qty > 0);
      assert.ok(ingredient, 'A quantified ingredient supports availability');
      const before = list.items.map(row => row.id).sort();
      await page.locator('[data-cu-action=e072-preview]').click();
      const confirm = page.locator('[data-cu-action=e072-confirm]');
      if (await confirm.count()) await confirm.click();
      else await page.locator('[data-cu-action=e072-cancel]').click();
      await page.locator('[data-e072-dialog]').waitFor({ state: 'detached' });
      await sync(page);
      assert.deepEqual((await basket(page)).items.map(row => row.id).sort(), before,
        'Repeated import reuses the unique grocery rows');
    });
    await step('E07 availability persists in the native shared grocery row', async () => {
      const amount = Math.min(ingredient.requiredQty, Math.max(1, Math.floor(ingredient.requiredQty / 2)));
      await homeAmount(page, ingredient.name, amount);
      await sync(page);
      const item = (await basket(page)).items.find(row => row.id === ingredient.id);
      assert.equal(item.atHomeQty, amount);
      assert.equal(item.qty, item.requiredQty - amount);
      ingredient = item;
      await page.reload();
      await ready(page, 'cuisine');
      await sync(page);
      assert.equal((await basket(page)).items.find(row => row.id === ingredient.id).atHomeQty, amount);
      await shot(page, '07-courses-availability', width, report);
    });
    await step('E09 create and retrieve an ordinary family event', async () => {
      await page.locator('[data-e01-destination="3"]').click();
      await ready(page, 'family');
      await page.getByRole('button', { name: 'Ajouter un événement', exact: true }).click();
      await page.locator('#fa-native-form [name=title]').fill('DÉMO — Événement global ' + width);
      await page.locator('#fa-native-form [name=date]').fill(plannedKey.slice(0, 10));
      await page.locator('#fa-native-form [name=person]').fill(member.name);
      await shot(page, '08-event-form', width, report);
      await page.locator('#fa-native-form button[type=submit]').click();
      await page.locator('#fa-dialog').waitFor({ state: 'detached' });
      await sync(page);
      assert.equal((await state(page)).familyEvents.filter(row => row.title === 'DÉMO — Événement global ' + width).length, 1);
      await page.reload();
      await ready(page, 'family');
      await page.locator('[data-fa-action=agenda-day][data-date="' + plannedKey.slice(0, 10) + '"]').click();
      assert.match(await page.locator('main').innerText(), new RegExp('Événement global ' + width));
    });
    await step('E09 create and retrieve a shared family memo', async () => {
      await page.locator('[data-e01-destination="3"]').click();
      await ready(page, 'family');
      await newMemo(page, 'DÉMO — Mémo global ' + width, 'Contenu fictif de la recette globale.');
      await sync(page);
      sharedMemo = (await state(page)).sharedFamilyNotes.find(row => row.title === 'DÉMO — Mémo global ' + width);
      assert.ok(sharedMemo?.id);
      await page.reload();
      await ready(page, 'family');
      await page.locator('[data-fa-action=rg-memo-edit][data-record="' + sharedMemo.id + '"]').click();
      assert.equal(await page.locator('#memo-body').inputValue(), sharedMemo.body);
      await shot(page, '09-shared-memo', width, report);
    });
    if (width === 390 || widths.length === 1) {
      await step('Two tabs A/B: native grocery, Runes V2 and memo synchronization', async () => {
        const B = await context.newPage();
        report.secondClient = true;
        await open(B, 'index.html', 'shop', 'B');
        await sync(B);
        assert.equal(await B.evaluate(() => DobbyGlobalDemo.client), 'B');
        const ctxA = await native(page, 'return DobbyFamilyUI.getContext();');
        const ctxB = await native(B, 'return DobbyFamilyUI.getContext();');
        assert.equal(ctxA.householdId, ctxB.householdId);
        assert.notEqual(ctxA.userId, ctxB.userId);
        assert.equal((await basket(B)).items.find(row => row.id === ingredient.id).atHomeQty, ingredient.atHomeQty);
        assert.equal(grantRows(await state(B), mission.id).length, 1);
        assert.ok((await state(B)).sharedFamilyNotes.some(row => row.id === sharedMemo.id));
        await shot(B, '10-client-b-shared', width, report);

        await open(page, 'famille.html', 'salon');
        await demo(page, 'setOffline', true);
        await newMemo(page, 'DÉMO — Mémo en attente', 'Fictif, créé hors ligne et conservé après rechargement.');
        const beforeReload = (await state(page)).sharedFamilyNotes.find(row => row.title === 'DÉMO — Mémo en attente');
        assert.ok(beforeReload);
        await page.reload();
        await ready(page, 'family');
        assert.ok((await state(page)).sharedFamilyNotes.some(row => row.id === beforeReload.id));
        await sync(B);
        assert.ok(!(await state(B)).sharedFamilyNotes.some(row => row.id === beforeReload.id));
        await shot(page, '11-offline-pending', width, report);
        await demo(page, 'setOffline', false);
        await sync(page);
        await sync(B);
        assert.ok((await state(B)).sharedFamilyNotes.some(row => row.id === beforeReload.id));
        report.checks.push('Offline memo remains pending through reload and reaches B only after reconnect');

        // Leave A stale deliberately: two native row edits must trigger CAS, never silently overwrite.
        await open(page, 'index.html', 'shop');
        await sync(page);
        await sync(B);
        await demo(page, 'setOffline', true);
        await homeAmount(page, ingredient.name, 0);
        await homeAmount(B, ingredient.name, ingredient.requiredQty);
        await sync(B);
        await demo(page, 'setOffline', false);
        await sync(page);
        await page.waitForFunction(id => DobbyCuisineList.snapshot(DobbyCuisineEngine).items
          .find(row => row.id === id)?.conflict, ingredient.id);
        await shot(page, '12-cas-conflict', width, report);
        const conflicts = (await grocery(page)).items.filter(row => row.syncState === 'conflict');
        assert.ok(conflicts.length, 'CAS exposes the stale native rows');
        report.cas = conflicts.map(row => ({ id: row.id, expectedRevision: row.baseRevision,
          remoteRevision: row.remoteShadow?.revision }));
        for (const row of report.cas) {
          assert.ok(row.remoteRevision > row.expectedRevision, 'Conflicting revision is genuinely newer');
          await page.locator('[data-e072-item="' + row.id + '"] [data-cu-action=e072-conflict-server]').click();
          await page.waitForFunction(id => DobbyCuisineEngine.win().DobbyFamilyUI.grocery.read().items
            .find(item => item.id === id)?.syncState === 'clean', row.id);
        }
        await sync(page);
        await sync(B);
        assert.equal((await basket(page)).items.find(row => row.id === ingredient.id).atHomeQty, ingredient.requiredQty);
        assert.equal((await basket(B)).items.find(row => row.id === ingredient.id).atHomeQty, ingredient.requiredQty);
        assert.equal((await basket(page)).items.find(row => row.id === ingredient.id).conflict, false);
        report.checks.push('Stale grocery CAS is explicit and visible native server resolution converges A/B');
        await B.reload();
        await ready(B, 'cuisine');
        assert.equal(await B.evaluate(() => DobbyGlobalDemo.client), 'B');
        await B.goto(new URL('essai-stitch-v7/index.html#shop', base).href);
        await ready(B, 'cuisine');
        assert.equal(await B.evaluate(() => DobbyGlobalDemo.client), 'B');
        assert.equal(new URL(B.url()).searchParams.get('client'), 'B');
        report.checks.push('B identity is retained across reload and queryless navigation');
        await B.close();
      });
    }
    await step('E02, E06 and E08 remain reachable, dock and browser navigation work', async () => {
      await open(page, 'famille.html', 'chat');
      await page.locator('#user-input').waitFor();
      await shot(page, '13-dobby', width, report);
      await open(page, 'famille.html', 'contracts');
      await page.locator('[data-e08-illustration]').waitFor();
      await shot(page, '14-contracts', width, report);
      await open(page, 'famille.html', 'onboarding-ritual');
      assert.match(await page.locator('main').innerText(), /Dobby|rituel|foyer/i);
      await shot(page, '15-ritual', width, report, false);
      await open(page, 'traverse.html');
      for (const destination of [1, 2, 3, 4, 0]) {
        await page.locator('[data-e01-destination="' + destination + '"]').click();
        await ready(page);
      }
      await page.goBack();
      await ready(page);
      await page.goForward();
      await ready(page);
      assert.ok(page.url().startsWith(base.href));
      assert.equal(grantRows(await state(page), mission.id).length, 1);
    });
    await step('Visible reset clears only this demo and refreshes other open tabs', async () => {
      report.fixtureRequests = await demo(page, 'requests');
      report.fixtureRowsBeforeReset = await demo(page, 'rows');
      const other = await context.newPage();
      await open(other, 'traverse.html', '', 'B');
      await Promise.all([
        page.waitForEvent('load'), other.waitForEvent('load'),
        page.locator('[data-global-reset]').click()
      ]);
      await ready(page);
      await ready(other);
      const reset = await state(page), resetB = await state(other);
      assert.ok(!reset.familyMembers.some(row => row.id === member.id));
      assert.ok(!resetB.familyMembers.some(row => row.id === member.id));
      assert.equal(grantRows(reset, mission.id).length, 0);
      assert.ok(!reset.sharedFamilyNotes.some(row => row.id === sharedMemo.id));
      await other.close();
      await verifySentinels(page);
    });
    assert.deepEqual(report.externalRequests, [], 'No external network requests');
    assert.deepEqual(report.networkMutations, [], 'No actual network mutation');
    assert.deepEqual(report.errors, [], 'No uncaught browser error');
    assert.deepEqual(report.missing, [], 'No missing preview resource');
    report.status = 'PASS';
    console.log('DOBBY_GLOBAL_BROWSER_PASS', width, base.href);
  } catch (error) {
    report.status = 'FAIL';
    report.failedCheck = current;
    report.error = error.stack;
    if (page) {
      report.failedURL = page.url();
      try {
        report.lifecycleAtFailure = await page.evaluate(() => {
          const frame = document.getElementById('dv7-engine'), native = frame?.contentWindow;
          const raw = Storage.prototype.__reviewRaw, key = 'dobby-review-v7-global-20261112|';
          const status = native?.DobbyFamilyUI?.grocery.read();
          return { top: location.href, stitchReady: window.DobbyStitchV7?.ready,
            familyReady: window.DobbyFamilyStitch?.ready, cuisineReady: window.DobbyCuisine?.ready,
            iframeSrc: frame?.getAttribute('src'), deferredSrc: frame?.dataset.globalEngineSrc,
            nativeURL: native?.location.href, nativeDocument: native?.document.readyState,
            nativeStatus: status && {ready:status.ready,status:status.status,error:status.error},
            resetPending: !!raw?.getItem.call(localStorage,key+'reset-in-progress'),
            generation: JSON.parse(raw?.getItem.call(localStorage,key+'backend-v1')||'{}').generation };
        });
        console.error('GLOBAL_FAILURE_LIFECYCLE', JSON.stringify({width,lifecycle:report.lifecycleAtFailure,errors:report.errors}));
      } catch (diagnosticError) { console.error('GLOBAL_FAILURE_LIFECYCLE_UNAVAILABLE', diagnosticError.message); }
      try { report.nativeAtFailure = await state(page); } catch {}
      try { report.basketAtFailure = await basket(page); } catch {}
      try { report.fixtureAtFailure = await demo(page, 'state'); } catch {}
      try { report.fixtureRequests = await demo(page, 'requests'); } catch {}
      try { await page.screenshot({ path: path.join(evidence, 'FAIL-' + width + '.png'), fullPage: true }); } catch {}
    }
    throw error;
  } finally {
    fs.writeFileSync(path.join(evidence, 'verification-' + width + '.json'), JSON.stringify(report, null, 2) + '\n');
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox'] });
  try {
    for (const width of widths) await runJourney(browser, width);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

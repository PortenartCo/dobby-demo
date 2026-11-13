/* Latest native E02/Courses, Runes V2 and E09 writers inside the new Family preview.
 * Only same-origin static GET/HEAD reaches the network. The preview owns all
 * fictional HTTP responses; this test never fulfills app/auth/database routes.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const base = new URL(process.env.DOBBY_FAM_INTEGRATION_BASE || process.env.DOBBY_FAMILY_BASE ||
  'http://127.0.0.1:8873/essai-dobby-v7-famille-review-20261112/');
if (!base.pathname.endsWith('/')) base.pathname += '/';
const evidence = path.resolve(process.env.DOBBY_FAM_INTEGRATION_EVIDENCE ||
  (process.env.DOBBY_FAM_EVIDENCE ? path.join(process.env.DOBBY_FAM_EVIDENCE, 'transverse/preview') :
    path.join(__dirname, '../../docs/dobby-v7/evidence/famille-integration-20261112/transverse/preview')));
fs.mkdirSync(evidence, { recursive: true });
const report = { status: 'RUNNING', base: base.href, realBackend: false, checks: [],
  externalRequests: [], networkMutations: [], errors: [], screenshots: [] };
let current = 'boot';
const native = (page, code, values = {}) => page.evaluate(({ code, values }) =>
  DobbyFamilyStitchEngine.evaluate(code, values), { code, values });
const state = page => native(page, 'return JSON.parse(JSON.stringify(st));');
const basket = page => page.evaluate(() => DobbyCuisineList.snapshot(DobbyFamilyStitchEngine));
const grocery = page => page.evaluate(() => DobbyFamilyStitchEngine.win().DobbyFamilyUI.grocery.read());
const demo = (page, method, ...args) => page.evaluate(({ method, args }) =>
  DobbyGlobalDemo[method](...args), { method, args });
const grants = (s, id) => (s.runeCredits || []).filter(row => row.missionId === id && (!row.kind || row.kind === 'grant'));
const step = async (label, run) => { current = label; console.log('FAM_TRANSVERSE_CHECK ' + label); await run(); report.checks.push(label); };
async function ready(page) {
  await page.waitForFunction(() => window.DobbyStitchV7?.ready && window.DobbyFamilyStitchEngine && window.DobbyGlobalDemo?.ready);
  await page.evaluate(() => DobbyGlobalDemo.ready);
  await page.waitForFunction(() => DobbyFamilyStitchEngine.win().DobbyFamilyUI?.grocery.read().ready);
  assert.equal(await page.evaluate(() => DobbyGlobalDemo.realBackend), false);
}
async function open(page, file, hash = '', client = 'A') {
  const url = new URL('essai-stitch-v7/' + file, base); url.searchParams.set('client', client); url.hash = hash;
  await page.goto(url.href); await ready(page);
  if (file === 'index.html') await page.waitForFunction(() => DobbyCuisine?.ready);
  if (file === 'famille.html') await page.waitForFunction(() => DobbyFamilyStitch?.ready);
}
async function sync(page) {
  await demo(page, 'sync');
  await page.waitForFunction(() => {
    const w = DobbyFamilyStitchEngine.win(), rows = w.DobbyFamilyUI.grocery.read();
    return !/Synchronisation/.test(rows.status) && rows.items.every(row => row.syncState !== 'pending') &&
      !/Synchronisation/.test(w.DobbyFamilyUI.getModuleStatus('family')) &&
      !/Synchronisation/.test(w.DobbyFamilyUI.getModuleStatus('missions'));
  });
  await page.evaluate(() => { window.DobbyCuisine?.refresh(); window.DobbyFamilyStitch?.refresh?.(); });
}
async function shot(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(evidence, name + '.png'), fullPage: true }); report.screenshots.push(name + '.png');
}
async function homeAmount(page, id, quantity) {
  await page.locator('[data-e072-item="' + id + '"] [data-cu-action=e072-home]').click();
  await page.locator('[data-cu-action=e072-home-partial]').click();await page.locator('#e072-home-qty').fill(String(quantity));
  await page.locator('[data-cu-action=e072-home-save]').click();
  await page.locator('[data-e072-dialog]').waitFor({ state: 'detached' });
}
async function chat(page, text) {
  await page.locator('#user-input').fill(text); await page.locator('[data-fa-action=rg-chat-send]').click();
  await page.waitForFunction(() => !DobbyChat.busy);
  return page.locator('[data-e02-message=dobby]').last().textContent();
}
async function newMemo(page, title, body) {
  await page.locator('[data-fa-action=rg-memo-new]').first().click();
  await page.locator('#memo-title').fill(title); await page.locator('#memo-body').fill(body);
  await page.locator('#tag-input').fill('test, intégration fictive');
  await page.locator('[data-fa-action=rg-save]').first().click();
  await page.waitForFunction(() => document.body.dataset.familyView === 'salon');
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, locale: 'fr-BE',
    timezoneId: 'Europe/Brussels', reducedMotion: 'reduce' });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== base.origin) { report.externalRequests.push({ method: request.method(), url: request.url() }); return route.abort(); }
    if (!['GET', 'HEAD'].includes(request.method())) { report.networkMutations.push({ method: request.method(), url: request.url() }); return route.abort(); }
    return route.continue();
  });
  context.on('page', page => {
    page.setDefaultTimeout(15000); page.on('dialog', dialog => dialog.accept());
    page.on('pageerror', error => report.errors.push({ url: page.url(), message: error.message }));
  });
  try {
    const A = await context.newPage(), B = await context.newPage();
    let ingredient, confirmed, memo;
    await step('new Family bundle preserves chat/transport bytes; shopping native behavior is verified below', async () => {
      const response = await A.goto(new URL('review-manifest.json', base).href);
      assert.ok(response?.ok(), 'Build the new Family preview before this recipe');
      const manifest = await response.json();
      assert.equal(manifest.version, 'V7-FAMILLE'); assert.equal(manifest.realBackend, false);
      assert.equal(manifest.base, '6a6fcd9bcee522da7342de391e5c3d7bfe1955b3');
      assert.equal(manifest.migrationsApplied, false);
      const expected = {
        'essai-stitch-v7/chat-engine.js': 'ba84ce331c50e308dd57fe00155dd0fdff881d247bc1bbacac8ff518d2bab2bd',
        'global-demo.js': '914fe8109f1505a27dc449b99dbc59c80d6e800b08f400c01aa38dbe7d783303'
      };
      for (const [file, hash] of Object.entries(expected)) {
        const record = manifest.files.find(row => row.path === file); assert.equal(record?.sourceSha256, hash);
        const text = await A.evaluate(url => fetch(url).then(response => response.text()), new URL(file, base).href);
        const normalized = file === 'global-demo.js' ? text.replaceAll('dobby-review-v7-famille-20261112|', 'dobby-review-v7-global-20261112|') : text;
        assert.equal(crypto.createHash('sha256').update(normalized).digest('hex'), hash, file + ' actual served bytes');
      }
      report.bundle = { version: manifest.version, base: manifest.base, sourceSha: manifest.sourceSha, sourceState: manifest.sourceState,
        storagePrefix: manifest.storagePrefix, fixtureSha256: manifest.fixtureSha256 };
    });
    await step('one shared native grocery row keeps its quantity and availability across A/B', async () => {
      await open(A, 'index.html', 'shop'); await sync(A);
      ingredient = (await basket(A)).items.find(row => row.name === 'Carottes' && row.requiredQty === 500);
      assert.ok(ingredient, 'Fictional quantified seed is present');
      await homeAmount(A, ingredient.id, 200); await sync(A);
      await open(B, 'index.html', 'shop', 'B'); await sync(B);
      const ctxA = await native(A, 'return DobbyFamilyUI.getContext();'), ctxB = await native(B, 'return DobbyFamilyUI.getContext();');
      assert.equal(ctxA.householdId, ctxB.householdId); assert.notEqual(ctxA.userId, ctxB.userId);
      for (const page of [A, B]) {
        const row = (await basket(page)).items.find(row => row.id === ingredient.id);
        assert.deepEqual([row.requiredQty, row.atHomeQty, row.qty], [500, 200, 300]);
      }
      report.clients = { A: ctxA.userId, B: ctxB.userId, household: ctxA.householdId };
    });
    await step('E02 reads and contributes to Courses without changing quantified rows or local archives', async () => {
      await open(A, 'famille.html', 'chat'); await sync(A);
      const list = await basket(A), localBefore = await native(A, 'return JSON.stringify({extras:st.extras,final:st.shopFinal,history:st.shopHistory});');
      const before = (await grocery(A)).items.find(row => row.id === ingredient.id);
      const answer = await chat(A, 'quelles sont les courses');
      assert.ok(answer.includes(list.items.length + ' article(s)') && answer.includes('Carottes'));
      const title = 'TEST — Épices FAM transverses';
      assert.match(await chat(A, 'acheter ' + title), /Dobby a ajouté/); await sync(A);
      const added = (await grocery(A)).items.filter(row => row.title === title); assert.equal(added.length, 1);
      assert.match(await chat(A, 'acheter ' + title), /déjà/); await sync(A);
      assert.deepEqual((await grocery(A)).items.filter(row => row.title === title).map(row => row.id), added.map(row => row.id));
      assert.deepEqual((await grocery(A)).items.find(row => row.id === ingredient.id), before, 'Chat never rewrites quantified availability');
      assert.equal(await native(A, 'return JSON.stringify({extras:st.extras,final:st.shopFinal,history:st.shopHistory});'), localBefore);
      await sync(B); assert.equal((await grocery(B)).items.filter(row => row.title === title).length, 1);
      await A.reload(); await ready(A); assert.match(await chat(A, 'quelles sont les courses'), /Épices FAM transverses/);
      await A.getByRole('link', { name: 'Voir les courses', exact: true }).last().click();
      await A.waitForURL(url => url.hash.startsWith('#shop')); await ready(A);
      assert.match(await A.locator('[data-e072-list]').innerText(), /Épices FAM transverses/);
      await shot(A, '01-e02-shared-courses'); report.e02GroceryId = added[0].id;
    });
    await step('stale native grocery CAS is visible and explicit server resolution converges A/B', async () => {
      await open(A, 'index.html', 'shop'); await sync(A); await sync(B);
      await demo(A, 'setOffline', true); await homeAmount(A, ingredient.id, 100);
      await homeAmount(B, ingredient.id, 400); await sync(B);
      await demo(A, 'setOffline', false); await sync(A);
      await A.waitForFunction(id => DobbyFamilyStitchEngine.win().DobbyFamilyUI.grocery.read().items.find(row => row.id === id)?.syncState === 'conflict', ingredient.id);
      const conflict = (await grocery(A)).items.find(row => row.id === ingredient.id);
      assert.ok(conflict.remoteShadow.revision > conflict.baseRevision);
      assert.equal((await demo(A, 'rows')).find(row => row.id === ingredient.id).at_home_quantity, 400);
      await shot(A, '02-native-cas-conflict');
      await A.locator('[data-e072-item="' + ingredient.id + '"] [data-cu-action=e072-conflict-server]').click();
      await sync(A); await sync(B);
      for (const page of [A, B]) {
        const row = (await basket(page)).items.find(row => row.id === ingredient.id);
        assert.deepEqual([row.requiredQty, row.atHomeQty, row.qty, row.conflict], [500, 400, 100, false]);
      }
      report.cas = { id: conflict.id, expectedRevision: conflict.baseRevision, remoteRevision: conflict.remoteShadow.revision };
    });
    await step('native mission completion confirms one immutable shared Runes V2 grant', async () => {
      await open(A, 'traverse.html'); await sync(A);
      assert.equal(await native(A, 'return DobbySharedRunesV2.available();'), true);
      const mission = (await state(A)).manualMissions.find(row => row.id === 'review-mission'); assert.ok(mission);
      assert.equal(grants(await state(A), mission.id).length, 0);
      await A.locator('[data-e01-complete="' + mission.id + '"]').click();
      await A.waitForFunction(id => DobbyFamilyStitchEngine.read().state.manualMissions.find(row => row.id === id)?.status === 'done', mission.id);
      await sync(A); confirmed = grants(await state(A), mission.id); assert.equal(confirmed.length, 1);
      assert.deepEqual([confirmed[0].memberId, confirmed[0].amount], [mission.assigneeId, 10]);
      const fixture = await demo(A, 'state'); assert.equal(fixture.modules.missions.payload.runeLedgerVersion, 2);
      assert.ok(fixture.requests.some(row => row.path.endsWith('/dobby_missions_v2_write')));
      await A.reload(); await ready(A); await sync(A); await sync(A); await sync(B);
      assert.deepEqual(grants(await state(A), mission.id), confirmed); assert.deepEqual(grants(await state(B), mission.id), confirmed);
      report.confirmedGain = confirmed[0]; await shot(A, '03-confirmed-runes');
    });
    await step('shared E09 memo uses FAM read-first route, survives reload and reaches B without local-note import', async () => {
      await open(A, 'famille.html', 'salon'); await sync(A);
      const legacy = (await state(A)).familyNotes, events = (await state(A)).familyEvents;
      await newMemo(A, 'TEST — Mémo transversal FAM', 'Contenu fictif préservé après intégration.'); await sync(A);
      memo = (await state(A)).sharedFamilyNotes.find(row => row.title === 'TEST — Mémo transversal FAM'); assert.ok(memo?.id);
      await A.locator('[data-fa-action=rg-memo-edit][data-record="' + memo.id + '"]').click();
      assert.equal(await A.locator('[data-fam-memo-read]').count(), 1); assert.equal(await A.locator('#rg-form').count(), 0);
      await A.locator('[data-fa-action=rg-memo-edit]').first().click();
      await A.locator('#memo-body').fill('Modifié via le writer E09 natif.'); await A.locator('[data-fa-action=rg-save]').first().click(); await sync(A);
      await A.reload(); await ready(A); await sync(A);
      assert.equal((await state(A)).sharedFamilyNotes.find(row => row.id === memo.id).body, 'Modifié via le writer E09 natif.');
      assert.deepEqual((await state(A)).familyNotes, legacy); assert.deepEqual((await state(A)).familyEvents, events);
      await open(B, 'famille.html', 'memos', 'B'); await sync(B);
      assert.equal((await state(B)).sharedFamilyNotes.filter(row => row.id === memo.id).length, 1);
      assert.equal((await state(B)).sharedFamilyNotes.find(row => row.id === memo.id).body, 'Modifié via le writer E09 natif.');
      const payload = (await demo(A, 'state')).modules.family.payload;
      assert.ok(!Object.hasOwn(payload, 'familyNotes'), 'Historical local notes remain outside the shared payload');
      assert.deepEqual(grants(await state(B), 'review-mission'), confirmed, 'Memo edits preserve the confirmed rune ledger');
      report.memo = { id: memo.id, legacyRetained: true, eventsRetained: true, readFirst: true }; await shot(B, '04-shared-memo-client-b');
    });
    assert.deepEqual(report.externalRequests, [], 'No external request reaches the network');
    assert.deepEqual(report.networkMutations, [], 'No HTTP mutation reaches the static server');
    assert.deepEqual(report.errors, [], 'No browser runtime errors');
    report.status = 'PASS'; console.log('FAM_INTEGRATION_TRANSVERSE_PASS E02/shared Courses quantity+availability+CAS, confirmed Runes V2 ledger, read-first E09 memo, A/B fictional transport only');
  } catch (error) { report.status = 'FAIL'; report.failure = { step: current, message: error.message, stack: error.stack }; throw error;
  } finally { fs.writeFileSync(path.join(evidence, 'result.json'), JSON.stringify(report, null, 2) + '\n'); await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

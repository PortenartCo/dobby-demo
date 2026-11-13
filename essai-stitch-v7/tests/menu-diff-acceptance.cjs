/* MENU-DIFF-01 functional acceptance only: Menu and its five existing modules.
 * Fresh TEST profiles, native UI/export/restore, no real backend or broad suite.
 * DOBBY_MENU_BASE is the application directory, including any review prefix.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');

const base = new URL(process.env.DOBBY_MENU_BASE || 'http://127.0.0.1:8765/essai-stitch-v7/');
assert.ok(base.pathname.endsWith('/'), 'DOBBY_MENU_BASE must be an application directory ending in /');
const runName = process.env.DOBBY_MENU_RUN || (base.origin === 'http://127.0.0.1:8765' && base.pathname === '/essai-stitch-v7/' ? 'source' : 'preview');
assert.match(runName, /^[a-zA-Z0-9_-]+$/, 'Safe evidence run name');
const evidence = path.resolve(__dirname, '../../docs/dobby-v7/evidence/menu-diff-01/functional', runName);
const labels = ['Maison & Équipements', 'Archives documentaires', 'Contrats & Assurances', 'Contacts', 'Paramètres'];
const destinations = ['house', 'documents', 'contracts', 'contacts', 'settings'];
const keys = ['familyMembers', 'famLists', 'famHealth', 'famContacts', 'houseItems', 'houseLogs', 'houseDocs', 'familyDocs'];
const pdf = Buffer.from('%PDF-1.4\nTEST — MENU-DIFF-01 native local attachment.\n%%EOF');
const isolationSentinel = {key: 'dobby-review-v7-famille-20261112|TEST-MENU-DIFF-SENTINEL', value: 'TEST — Previous Famille namespace must remain byte-identical', marker: 'TEST-MENU-DIFF-SENTINEL-SEEDED'};
const fixture = {
  familyMembers: [{id: 'menu-diff-member', name: 'TEST — Menu member', avatar: '👤', birthdate: ''}],
  famLists: [{id: 'menu-diff-list', name: 'TEST — Preserved list', items: [{name: 'TEST — Pending', done: false}, {name: 'TEST — Checked', done: true}]}],
  famHealth: [{id: 'menu-diff-health', personId: 'menu-diff-member', person: 'TEST — Menu member', name: 'TEST — Preserved visit', date: '2027-01-02', provider: 'TEST — Practitioner', reference: 'TEST-MENU-HEALTH', note: 'TEST — Local visit'}],
  famContacts: [{id: 'menu-diff-contact', name: 'TEST — Native contact', role: 'Artisan', phone: '+32000000000', email: 'menu@example.test', note: 'TEST — Native contact note'}],
  houseItems: [{id: 'menu-diff-equipment', name: 'TEST — Native equipment', category: 'Autre', place: 'TEST — Workshop', brand: 'TEST — Brand', model: 'TEST — Model', purchased: '2020-01-01', nextMaintenance: '2027-02-01', notes: 'TEST — Native equipment note'}],
  houseLogs: [{id: 'menu-diff-log', itemId: 'menu-diff-equipment', date: '2026-01-01', note: 'TEST — Native maintenance'}],
  houseDocs: [],
  familyDocs: [
    {id: 'menu-diff-document', title: 'TEST — Native document', category: 'Autres', provider: 'TEST — Archive provider', reference: 'TEST-MENU-DOCUMENT', date: '2026-01-01', deadline: '', tags: 'test', note: 'TEST — Native document note'},
    {id: 'menu-diff-contract', title: 'TEST — Native E08 contract', category: 'Contrats', provider: 'TEST — Contract provider', reference: 'TEST-MENU-CONTRACT', date: '2026-01-01', deadline: '2027-03-01', tags: 'test', note: 'TEST — Native contract note'},
  ],
};

async function view(page, expected) {
  await page.waitForFunction(expected => window.DobbyFamilyStitch?.ready && DobbyFamilyStitch.view === expected && document.body.dataset.familyView === expected && !document.documentElement.classList.contains('dv7-loading'), expected);
  assert.equal(await page.locator('#dv7-panel').isVisible(), false, expected + ' is a real source module');
}
async function native(page, code, values = {}) {
  return page.evaluate(({code, values}) => DobbyFamilyStitchEngine.evaluate(code, values), {code, values});
}
async function snapshot(page) {
  return page.evaluate(keys => {
    const state = DobbyFamilyStitchEngine.read().state;
    return Object.fromEntries(keys.map(key => [key, state[key]]));
  }, keys);
}
async function assertOldNamespace(page) {
  assert.equal(await page.evaluate(({key}) => {
    const raw = Storage.prototype.__reviewRaw || Storage.prototype;
    return raw.getItem.call(localStorage, key);
  }, isolationSentinel), isolationSentinel.value, 'Prior Famille namespace sentinel survives native Menu operations');
}
async function visibleLabels(page) {
  return page.locator('main a.module-item:visible').evaluateAll(cards => cards.map(card => {
    const copy = card.cloneNode(true);
    for (const icon of copy.querySelectorAll('.material-symbols-outlined,[aria-hidden=true]')) icon.remove();
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }));
}
async function menu(page) {
  await page.locator('body > nav [data-e01-destination="5"]').click();
  await view(page, 'menu');
  assert.deepEqual(await visibleLabels(page), labels, 'Existing dock returns to the complete Menu');
}
async function moduleFromMenu(page, index) {
  await page.locator('main a.module-item').nth(index).click();
  await view(page, destinations[index]);
}
async function chrome(page) {
  assert.equal(await page.locator('body > header').count(), 1, 'One global header');
  assert.equal(await page.locator('body > nav').count(), 1, 'One global dock');
  assert.equal(await page.locator('body > header[data-e01-chrome]').count(), 1);
  assert.equal(await page.locator('body > nav[data-e01-chrome]').count(), 1);
  for (const name of ['effects', 'sound']) assert.equal(await page.locator('[data-e01-toggle="' + name + '"]').count(), 1, 'One global ' + name + ' preference');
  assert.equal(await page.locator('main [data-e01-toggle]').count(), 0, 'No duplicated preferences');
  const geometry = await page.evaluate(() => {
    const header = document.querySelector('body > header');
    const dock = document.querySelector('body > nav');
    const banner = document.querySelector('[data-review-banner]');
    return {header: header.getBoundingClientRect().toJSON(), dock: dock.getBoundingClientRect().toJSON(), banner: banner?.getBoundingClientRect().toJSON() || null, headerPosition: getComputedStyle(header).position, dockPosition: getComputedStyle(dock).position, width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth};
  });
  assert.equal(geometry.headerPosition, 'fixed');
  assert.equal(geometry.dockPosition, 'fixed');
  assert.ok(Math.abs(geometry.header.top - (geometry.banner?.bottom || 0)) <= 1, 'Fixed header follows the actual optional review banner');
  assert.ok(Math.abs(geometry.dock.bottom - geometry.height) <= 1, 'Fixed dock follows viewport bottom');
  assert.ok(geometry.scrollWidth <= geometry.width + 1, 'No horizontal document overflow');
  return geometry;
}
async function downloaded(page, selector) {
  const promise = page.waitForEvent('download');
  await page.locator(selector).click();
  const download = await promise;
  assert.equal(await download.failure(), null, 'Native download succeeds');
  const bytes = fs.readFileSync(await download.path());
  return {bytes, filename: download.suggestedFilename(), sha256: crypto.createHash('sha256').update(bytes).digest('hex')};
}

(async () => {
  fs.mkdirSync(evidence, {recursive: true});
  const receipt = {suite: 'MENU-DIFF-01-B', base: base.href, startedAt: new Date().toISOString(), sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: path.resolve(__dirname, '../..'), encoding: 'utf8'}).trim(), scope: 'Targeted functional acceptance only; no broad suite or removed-route sweep', fixturePolicy: 'Fresh browser contexts; TEST data only; native state seeding and native attachment writer; no real account/backend', widths: [], status: 'running'};
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
  let active;
  try {
    for (const width of [320, 390, 1440]) {
      active = {width, height: 844, assertions: [], blockedExternalOrigins: [], status: 'running'};
      receipt.widths.push(active);
      const context = await browser.newContext({viewport: {width, height: 844}, locale: 'fr-BE', reducedMotion: 'reduce', acceptDownloads: true});
      // Seed raw old-namespace data before the review envelope is loaded. The
      // session marker prevents reseeding on reload from hiding an accidental wipe.
      await context.addInitScript(({key, value, marker}) => {
        if (window !== top) return;
        const raw = Storage.prototype.__reviewRaw || Storage.prototype;
        if (raw.getItem.call(sessionStorage, marker) !== '1') {
          raw.setItem.call(localStorage, key, value);
          raw.setItem.call(sessionStorage, marker, '1');
        }
      }, isolationSentinel);
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin === base.origin) return route.continue();
        active.blockedExternalOrigins.push(url.origin);
        return route.abort();
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      const errors = [], dialogs = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('dialog', async dialog => {
        dialogs.push({type: dialog.type(), message: dialog.message()});
        if (dialog.type() === 'confirm' && /^Remplacer toutes les données locales par cette sauvegarde/.test(dialog.message())) await dialog.accept();
        else await dialog.dismiss();
      });
      const stage = async (name, task) => {
        active.currentStage = name;
        await task();
        active.assertions.push(name);
        console.log('MENU_DIFF_ACCEPTANCE_PASS', runName, width, name);
      };
      try {
        await page.goto(new URL('famille.html#menu', base).href);
        await view(page, 'menu');
        await native(page, 'for(const [key,value]of Object.entries(p.fixture))st[key]=value;st.sharedHealthVisits=[];st.familyEvents=[];st.manualMissions=[];st.autoTasks=[];st.globalQuery="TEST — Transverse query remains unchanged";save();', {fixture});
        await page.evaluate(() => DobbyFamilyStitch.refresh());
        await view(page, 'menu');

        await stage('five-real-menu-cards-and-compact-layout', async () => {
          assert.equal((await page.locator('main h1').innerText()).trim(), 'Menu');
          assert.equal(await page.locator('main h1').count(), 1);
          assert.equal(await page.locator('main .module-item').count(), 5);
          assert.equal(await page.locator('main a.module-item').count(), 5);
          assert.deepEqual(await visibleLabels(page), labels);
          assert.equal(await page.locator('main img,main header,main [data-e01-context]').count(), 0, 'No decorative hero or duplicate contextual header');
          assert.equal(await page.locator('main input').count(), 1);
          assert.equal(await page.locator('main button:not(#clear-search-btn)').count(), 0);
          assert.doesNotMatch(await page.locator('main').innerText(), /Index & Clés|Grand Sommaire|Tous les Outils|Note d.intendant|Autres accès|OMNISCIENT|Entrer en Audience|Revenir à l.Accueil/);
          for (const [index, destination] of destinations.entries()) {
            const card = page.locator('main a.module-item').nth(index);
            assert.equal(new URL(await card.getAttribute('href'), page.url()).href, new URL('famille.html#' + destination, base).href);
            assert.equal(await card.getAttribute('data-fa-action'), destination);
            assert.equal(await card.getAttribute('role'), null);
            assert.ok((await card.boundingBox()).height >= 44);
          }
          active.layout = await chrome(page);
          const placement = await page.evaluate(() => Object.fromEntries([['title','main h1'],['search','#global-module-search'],['first','main a.module-item']].map(([key, selector]) => [key, document.querySelector(selector).getBoundingClientRect().toJSON()])));
          assert.ok(placement.title.top >= active.layout.header.bottom - 1 && placement.title.top - active.layout.header.bottom < 65);
          assert.ok(placement.search.top >= placement.title.bottom && placement.search.top - placement.title.bottom < 65);
          assert.ok(placement.first.top >= placement.search.bottom && placement.first.top - placement.search.bottom < 65);
        });

        await stage('immediate-search-clear-and-empty-result', async () => {
          const queryBefore = await native(page, 'return st.globalQuery;');
          const search = page.locator('#global-module-search');
          assert.equal(await search.getAttribute('placeholder'), 'Rechercher dans le menu…');
          const cases = [['mais',[labels[0]]],['ÉQUIPE',[labels[0]]],['eQuIpE',[labels[0]]],['  ARCHIVES  ',[labels[1]]],['ASSUR',[labels[2]]],['contact',[labels[3]]],['PARAMETRES',[labels[4]]],['paramètres',[labels[4]]],['   ',labels],['',labels],['zzzz-menu-absent',[]]];
          for (const [query, expected] of cases) {
            await search.fill(query);
            assert.deepEqual(await visibleLabels(page), expected, 'Search case ' + JSON.stringify(query));
            assert.equal(await page.locator('#no-module-found').isVisible(), expected.length === 0);
          }
          assert.ok((await page.locator('#no-module-found').innerText()).trim());
          await page.locator('#clear-search-btn').click();
          assert.equal(await search.inputValue(), '');
          assert.deepEqual(await visibleLabels(page), labels);
          assert.equal(await search.evaluate(input => document.activeElement === input), true);
          assert.equal(await page.locator('#clear-search-btn').isVisible(), false);
          assert.equal(await native(page, 'return st.globalQuery;'), queryBefore);
          active.searchCases = cases.length;
        });

        await stage('house-equipment-maintenance-and-native-data-export', async () => {
          await moduleFromMenu(page, 0);
          await page.locator('[data-fa-action="rg-equipment-open"][data-record="menu-diff-equipment"]').click();
          await view(page, 'equipment');
          assert.match(await page.locator('main').innerText(), /TEST — Native equipment/);
          await page.locator('main [data-fa-action="maintenance"]').first().click();
          await view(page, 'maintenance');
          assert.match(await page.locator('main').innerText(), /TEST — Native maintenance/);
          assert.equal(await page.locator('#rg-log-form').count(), 1, 'Existing native maintenance form remains accessible');
          await page.locator('main [data-fa-action="house-backup"]').click();
          await view(page, 'house-backup');
          const exportFile = await downloaded(page, '[data-fa-action="rg-house-export"]');
          const data = JSON.parse(exportFile.bytes);
          assert.equal(data.format, 'dobby-house');
          assert.equal(data.version, 1);
          assert.ok(data.items.some(item => item.id === 'menu-diff-equipment'));
          assert.ok(data.logs.some(item => item.id === 'menu-diff-log'));
          active.equipmentExport = {filename: exportFile.filename, sha256: exportFile.sha256, bytes: exportFile.bytes.length};
          await menu(page);
        });

        await stage('documents-detail-and-native-local-attachment', async () => {
          await moduleFromMenu(page, 1);
          await page.locator('[data-fa-action="rg-doc-open"][data-record="menu-diff-document"]').click();
          await view(page, 'document');
          assert.match(await page.locator('main').innerText(), /TEST — Native document/);
          await page.locator('#rg-doc-file').setInputFiles({name: 'test-menu-diff.pdf', mimeType: 'application/pdf', buffer: pdf});
          await page.waitForFunction(() => !DobbyRegister.busy && DobbyFamilyStitchEngine.read().state.familyDocs.find(d => d.id === 'menu-diff-document')?.attachmentName === 'test-menu-diff.pdf');
          await view(page, 'document');
          const local = await downloaded(page, '[data-fa-action="rg-doc-download"]');
          assert.deepEqual(local.bytes, pdf, 'Native document action downloads the original attachment bytes');
          active.attachment = {filename: local.filename, bytes: pdf.length, sha256: local.sha256};
          await menu(page);
        });

        await stage('contracts-native-E08-and-contract-detail', async () => {
          await moduleFromMenu(page, 2);
          assert.equal(await page.locator('[data-e08-illustration]').count(), 1, 'Existing canonical E08 contract module');
          assert.equal(await page.locator('main h1').innerText(), 'Contrats & Assurances du Logis');
          await page.locator('[data-document-rows] [data-fa-action="rg-doc-open"][data-record="menu-diff-contract"]').click();
          await view(page, 'contract');
          assert.match(await page.locator('main').innerText(), /TEST — Native E08 contract/);
          assert.equal(await page.locator('[data-fa-action="rg-doc-edit"]').count(), 1);
          assert.equal(await page.locator('#rg-doc-file').count(), 1);
          await menu(page);
        });

        await stage('contacts-native-edit-form-and-return-menu', async () => {
          await moduleFromMenu(page, 3);
          await page.locator('[data-fa-action="rg-contact-edit"][data-record="menu-diff-contact"]').click();
          await view(page, 'contact-edit');
          assert.equal(await page.locator('#contact-name').inputValue(), 'TEST — Native contact');
          assert.equal(await page.locator('#contact-notes').inputValue(), 'TEST — Native contact note');
          assert.equal(await page.locator('#contact-name').isEnabled(), true);
          assert.ok(await page.locator('[data-fa-action="rg-save"]:enabled').count());
          await menu(page);
        });

        await stage('settings-native-complete-export-and-genuine-restore-roundtrip', async () => {
          const before = await snapshot(page);
          await moduleFromMenu(page, 4);
          assert.equal(await page.locator('main h1').innerText(), 'Paramètres');
          assert.equal(await page.locator('body > nav [data-e01-destination="5"]').getAttribute('aria-current'), 'page');
          await chrome(page);
          assert.equal(await page.locator('main [data-e01-toggle]').count(), 0);
          await page.getByRole('link', {name: 'Retour au Menu', exact: true}).click();
          await view(page, 'menu');
          await moduleFromMenu(page, 4);
          await page.locator('main a[data-fa-action="backup"]').click();
          await view(page, 'backup');
          assert.equal(await page.locator('#rg-restore-file').count(), 1);
          const original = await downloaded(page, '[data-fa-action="rg-full-export"]');
          const archive = JSON.parse(original.bytes);
          assert.equal(archive.format, 'dobby-complete-backup');
          assert.equal(archive.version, 1);
          await page.evaluate(archive => DobbyFamilyStitchEngine.win().dobbyBackupValidation.validatePayload(archive), archive);
          for (const key of keys) assert.deepEqual(archive.state[key], before[key], 'Export includes original ' + key);
          const attachment = archive.attachments.find(a => a.id === 'family-menu-diff-document');
          assert.ok(attachment);
          assert.deepEqual(Buffer.from(attachment.base64, 'base64'), pdf);

          // Mutate only this throwaway profile, including bytes, so restore is observable.
          await native(page, 'st.famContacts=[];st.houseItems=[];st.houseLogs=[];st.familyDocs=[];st.famLists=[];st.famHealth=[];save();return houseStore(new Blob(["TEST — transient bytes"],{type:"application/pdf"}),"family-menu-diff-document");');
          const mutated = await snapshot(page);
          assert.notDeepEqual(mutated, before, 'Transient local data mutation really happened');
          assert.equal(await native(page, 'return houseRead("family-menu-diff-document").then(blob=>blob.text());'), 'TEST — transient bytes');
          await page.locator('#rg-restore-file').setInputFiles({name: original.filename, mimeType: 'application/json', buffer: original.bytes});
          await page.locator('[data-fa-action="rg-restore-confirm"]').waitFor({state: 'visible'});
          await page.waitForFunction(() => !document.querySelector('[data-fa-action="rg-restore-confirm"]').disabled);
          assert.match(await page.locator('#rg-import-preview').innerText(), /Validation native complète réussie/);
          assert.deepEqual(await snapshot(page), mutated, 'Preview validates without applying the archive');
          await page.locator('[data-fa-action="rg-restore-confirm"]').click();
          await page.waitForFunction(() => !DobbyRegister.busy && DobbyFamilyStitchEngine.read().state.famContacts.some(c => c.id === 'menu-diff-contact'));
          assert.ok(dialogs.some(d => d.type === 'confirm' && /^Remplacer toutes les données locales par cette sauvegarde/.test(d.message)), 'Existing native replacement confirmation was shown and accepted');
          assert.deepEqual(await snapshot(page), before, 'All original TEST records restored by native replacement');
          assert.equal(await native(page, 'return houseRead("family-menu-diff-document").then(blob=>blob.text());'), pdf.toString(), 'Original attachment bytes restored by native IndexedDB replacement');
          await assertOldNamespace(page);
          assert.match(await native(page, 'return window.parent.DobbyFamilyStitchEngine.lastError;'), /Sauvegarde restaurée/);
          active.backupRoundtrip = {filename: original.filename, format: archive.format, version: archive.version, bytes: original.bytes.length, sha256: original.sha256, attachmentCount: archive.attachments.length, nativeValidation: 'pass', previewNonMutating: true, nativeConfirmationAccepted: true, recordsRestored: keys, attachmentBytesRestored: true};
          await page.evaluate(() => DobbyRegister.back());
          await view(page, 'settings');
          await page.getByRole('link', {name: 'Retour au Menu', exact: true}).click();
          await view(page, 'menu');
          await page.reload();
          await view(page, 'menu');
          assert.deepEqual(await snapshot(page), before, 'Restored data and bytes persist after real reload');
          assert.equal(await native(page, 'return houseRead("family-menu-diff-document").then(blob=>blob.text());'), pdf.toString());
          await assertOldNamespace(page);
          active.oldFamilleNamespacePreserved = {key: isolationSentinel.key, seededBeforeEnvelope: true, checkedAfterNativeRestoreAndReload: true};
        });

        await stage('targeted-menu-screenshot-and-small-viewport-access', async () => {
          await page.evaluate(() => scrollTo(0, 0));
          await page.evaluate(() => document.fonts.ready);
          await page.locator('#global-module-search').blur();
          await chrome(page);
          const screenshot = path.join(evidence, 'menu-' + width + '.png');
          await page.screenshot({path: screenshot, fullPage: true, animations: 'disabled'});
          active.screenshot = path.relative(path.resolve(__dirname, '../..'), screenshot);
          await page.setViewportSize({width, height: 480});
          await page.locator('main a.module-item').last().scrollIntoViewIfNeeded();
          await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
          const geometry = await chrome(page);
          const last = await page.locator('main a.module-item').last().boundingBox();
          assert.ok(last.y + last.height <= geometry.dock.top + 1, 'Last Menu card is reachable above the fixed dock');
          assert.ok(last.y >= geometry.header.bottom - 1, 'Last card remains below the header and optional review banner');
          await page.locator('main a.module-item').last().click();
          await view(page, 'settings');
          assert.deepEqual(errors, [], 'No uncaught browser errors');
        });
        active.status = 'pass';
        active.blockedExternalOrigins = [...new Set(active.blockedExternalOrigins)].sort();
        delete active.currentStage;
      } finally {
        await context.close();
      }
    }
    receipt.status = 'pass';
  } catch (error) {
    receipt.status = 'fail';
    if (active) {active.status = 'fail'; active.error = error.stack;}
    console.error(error.stack);
    process.exitCode = 1;
  } finally {
    receipt.completedAt = new Date().toISOString();
    fs.writeFileSync(path.join(evidence, 'results.json'), JSON.stringify(receipt, null, 2) + '\n');
    await browser.close();
  }
  console.log('MENU_DIFF_ACCEPTANCE_' + receipt.status.toUpperCase(), runName, receipt.widths.map(w => w.width).join(','));
})();

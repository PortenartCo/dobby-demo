/* MENU-01–08: source Menu, native routes/data and backup in fresh offline profiles. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {chromium} = require('playwright');

const origin = process.env.DOBBY_TEST_ORIGIN || 'http://127.0.0.1:8765';
const evidence = path.resolve(__dirname, '../../docs/dobby-v7/evidence/menu-01-08');
const labels = ['Maison & Équipements', 'Archives documentaires', 'Contrats & Assurances', 'Contacts', 'Paramètres'];
const destinations = ['house', 'documents', 'contracts', 'contacts', 'settings'];
const fixtureBytes = '%PDF-1.4\nTEST — Menu attachment, ephemeral profile only.\n%%EOF';
const stateKeys = ['familyMembers', 'famLists', 'famHealth', 'famContacts', 'houseItems', 'houseLogs', 'familyDocs'];
const removedRoutes = [
  ['traverse.html', null], ['missions.html', null], ['index.html', null], ['famille.html#salon', 'salon'],
  ['index.html#recipes', null], ['index.html#shop', null], ['famille.html#lists', 'lists'],
  ['famille.html#health', 'health'], ['famille.html#search', 'search'], ['famille.html#import-file', 'import-file'],
  ['famille.html#chat', 'chat'], ['famille.html#memos', 'memos'], ['famille.html#agenda', 'agenda'],
  ['famille.html#members', 'members'], ['famille.html#personal', 'personal'],
];

async function ready(page) {
  await page.waitForFunction(() => window.DobbyStitchV7?.ready && !document.documentElement.classList.contains('dv7-loading'));
}
async function familyView(page, view) {
  await page.waitForFunction(expected => window.DobbyFamilyStitch?.ready && DobbyFamilyStitch.view === expected && document.body.dataset.familyView === expected && !document.documentElement.classList.contains('dv7-loading'), view);
}
async function open(page, view, options = {}) {
  await page.evaluate(({view, options}) => DobbyFamilyStitch.open(view, options), {view, options});
  await familyView(page, view);
}
async function snapshot(page) {
  return page.evaluate(keys => {
    const state = DobbyFamilyStitchEngine.read().state;
    return Object.fromEntries(keys.map(key => [key, state[key]]));
  }, stateKeys);
}
async function assertChrome(page, width, height = 844) {
  assert.equal(await page.locator('body > header').count(), 1, 'One global header');
  assert.equal(await page.locator('body > nav').count(), 1, 'One global dock');
  assert.equal(await page.locator('header[data-e01-chrome]').count(), 1);
  assert.equal(await page.locator('nav[data-e01-chrome]').count(), 1);
  assert.equal(await page.locator('[data-e01-toggle=effects]').count(), 1, 'One existing effects command');
  assert.equal(await page.locator('[data-e01-toggle=sound]').count(), 1, 'One existing sound command');
  assert.equal(await page.locator('main [data-e01-toggle]').count(), 0, 'No duplicated preferences in Menu/settings');
  const geometry = await page.evaluate(() => {
    const header = document.querySelector('body > header[data-e01-chrome]');
    const dock = document.querySelector('body > nav[data-e01-chrome]');
    return {
      header: header.getBoundingClientRect().toJSON(), dock: dock.getBoundingClientRect().toJSON(),
      headerPosition: getComputedStyle(header).position, dockPosition: getComputedStyle(dock).position,
      scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth,
    };
  });
  assert.equal(geometry.headerPosition, 'fixed');
  assert.equal(geometry.dockPosition, 'fixed');
  assert.ok(Math.abs(geometry.header.top) <= 1 && geometry.header.height > 0, 'Header stays at viewport top');
  assert.ok(Math.abs(geometry.dock.bottom - height) <= 1 && geometry.dock.height > 0, 'Dock stays at viewport bottom');
  assert.ok(geometry.scrollWidth <= width + 1, 'No horizontal document overflow');
  return geometry;
}
async function visibleLabels(page) {
  return page.locator('main a.module-item:visible').evaluateAll(cards => cards.map(card => {
    const copy = card.cloneNode(true);
    for (const icon of copy.querySelectorAll('.material-symbols-outlined,[aria-hidden=true]')) icon.remove();
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }));
}

(async () => {
  fs.mkdirSync(evidence, {recursive: true});
  const receipt = {suite: 'MENU-01–08', origin, offlineExternalRequests: true, freshContexts: true, widths: [], status: 'running'};
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    for (const width of [320, 390, 1440]) {
      const context = await browser.newContext({viewport: {width, height: 844}, locale: 'fr-BE', reducedMotion: 'reduce', acceptDownloads: true});
      const blockedExternal = [];
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin === new URL(origin).origin) return route.continue();
        blockedExternal.push(url.origin);
        return route.abort();
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('dialog', dialog => dialog.dismiss());
      try {
        await page.goto(origin + '/essai-stitch-v7/famille.html#menu');
        await familyView(page, 'menu');
        assert.equal((await page.locator('main h1').innerText()).trim(), 'Menu', 'Menu starts with its compact title');
        assert.equal(await page.locator('main h1').count(), 1);
        assert.equal(await page.locator('#global-module-search').getAttribute('placeholder'), 'Rechercher dans le menu…');
        assert.equal(await page.locator('main .module-item').count(), 5, 'Exactly five cards, with no hidden former entries');
        assert.equal(await page.locator('main a.module-item').count(), 5, 'Every card is a real link');
        assert.deepEqual(await visibleLabels(page), labels, 'Five final categories in order');
        assert.equal(await page.locator('main img').count(), 0, 'No decorative hero illustration');
        assert.equal(await page.locator('main input').count(), 1, 'Only the Menu filter');
        assert.equal(await page.locator('main button:not(#clear-search-btn)').count(), 0, 'No decorative or additional Menu buttons');
        assert.ok(!/Index & Clés|Grand Sommaire|Tous les Outils|Note d.intendant|Autres accès|OMNISCIENT|Entrer en Audience|Revenir à l.Accueil/.test(await page.locator('main').innerText()), 'Removed Menu ornaments stay absent');
        for (const [index, destination] of destinations.entries()) {
          const card = page.locator('main a.module-item').nth(index);
          assert.equal(new URL(await card.getAttribute('href'), page.url()).href, origin + '/essai-stitch-v7/famille.html#' + destination, 'Deep link for ' + labels[index]);
          assert.equal(await card.getAttribute('data-fa-action'), destination, 'Existing route binding for ' + labels[index]);
          assert.equal(await card.getAttribute('role'), null, 'Links retain link semantics');
          const box = await card.boundingBox();
          assert.ok(box.height >= 44, 'Full card meets touch target size');
        }
        const firstLayout = await assertChrome(page, width);
        const placement = await page.evaluate(() => {
          const title = document.querySelector('main h1').getBoundingClientRect();
          const query = document.querySelector('#global-module-search').getBoundingClientRect();
          const first = document.querySelector('main a.module-item').getBoundingClientRect();
          const header = document.querySelector('body > header').getBoundingClientRect();
          return {title: title.toJSON(), query: query.toJSON(), first: first.toJSON(), header: header.toJSON()};
        });
        assert.ok(placement.title.top >= placement.header.bottom - 1 && placement.title.top - placement.header.bottom < 65, 'Page begins directly with Menu below the fixed header');
        assert.ok(placement.query.top >= placement.title.bottom && placement.query.top - placement.title.bottom < 65, 'Search directly follows the title');
        assert.ok(placement.first.top >= placement.query.bottom && placement.first.top - placement.query.bottom < 65, 'Cards directly follow the search');

        // Seed only the fresh browser's native state; never touch a user profile or backend.
        await page.evaluate(() => DobbyFamilyStitchEngine.evaluate(`
          st.familyMembers=[{id:'menu-member',name:'TEST — Menu member',avatar:'👤',birthdate:''}];
          st.famLists=[{id:'menu-list',name:'TEST — Preserved family list',items:[{name:'TEST — Pending item',done:false},{name:'TEST — Checked item',done:true}],opaque:{keep:'menu-list'}}];
          st.famHealth=[{id:'menu-health',personId:'menu-member',person:'TEST — Menu member',name:'TEST — Preserved local visit',date:'2027-01-02',provider:'TEST — Local practitioner',reference:'TEST-MENU-HEALTH',note:'TEST — Identity-bound health note'}];
          st.famContacts=[{id:'menu-contact',name:'TEST — Preserved contact',role:'Artisan',phone:'+32000000000',email:'menu@example.test',note:'TEST — Contact note'}];
          st.houseItems=[{id:'menu-equipment',name:'TEST — Preserved equipment',category:'Autre',place:'TEST — Workshop',brand:'TEST — Brand',model:'TEST — Model',purchased:'2020-01-01',nextMaintenance:'2027-02-01',notes:'TEST — Equipment note'}];
          st.houseLogs=[{id:'menu-log',itemId:'menu-equipment',date:'2026-01-01',note:'TEST — Preserved maintenance'}];
          st.familyDocs=[{id:'menu-document',title:'TEST — Preserved contract document',category:'Contrats',provider:'TEST — Provider',reference:'TEST-MENU-CONTRACT',date:'2026-01-01',deadline:'2027-03-01',tags:'test',note:'TEST — Contract note',opaque:{keep:'menu-document'}}];
          st.houseDocs=[];st.sharedHealthVisits=[];st.familyEvents=[];st.manualMissions=[];st.autoTasks=[];
          st.globalQuery='TEST — Native search query unchanged';save();
        `));
        await open(page, 'document', {record: 'menu-document'});
        await page.locator('#rg-doc-file').setInputFiles({name: 'test-menu-preserved.pdf', mimeType: 'application/pdf', buffer: Buffer.from(fixtureBytes)});
        await page.waitForFunction(() => DobbyFamilyStitchEngine.read().state.familyDocs[0].attachmentName === 'test-menu-preserved.pdf');
        const before = await snapshot(page);
        const nativeQuery = await page.evaluate(() => DobbyFamilyStitchEngine.read().state.globalQuery);
        await open(page, 'menu');

        const search = page.locator('#global-module-search');
        const searchCases = [
          ['mais', [labels[0]]], ['ÉQUIPE', [labels[0]]], ['eQuIpE', [labels[0]]], ['  ARCHIVES  ', [labels[1]]],
          ['ASSUR', [labels[2]]], ['contact', [labels[3]]], ['PARAMETRES', [labels[4]]], ['paramètres', [labels[4]]],
          ['   ', labels], ['', labels], ['zzzz-menu-absent', []], ['santé', []],
        ];
        for (const [query, expected] of searchCases) {
          await search.fill(query);
          assert.deepEqual(await visibleLabels(page), expected, 'Immediate case/accent/whitespace filter: ' + JSON.stringify(query));
          assert.equal(await page.locator('#no-module-found').isVisible(), expected.length === 0, 'Explicit empty result');
          if (!expected.length) assert.ok((await page.locator('#no-module-found').innerText()).trim().length > 0, 'Empty result has explanatory text');
        }
        await page.locator('#clear-search-btn').click();
        assert.equal(await search.inputValue(), '');
        assert.deepEqual(await visibleLabels(page), labels);
        assert.equal(await page.locator('#no-module-found').isVisible(), false);
        assert.equal(await search.evaluate(input => document.activeElement === input), true, 'Clear returns keyboard focus to search');
        assert.equal(await page.locator('#clear-search-btn').isVisible(), false, 'Clear button hides for an empty filter');
        assert.equal(await page.evaluate(() => DobbyFamilyStitchEngine.read().state.globalQuery), nativeQuery, 'Menu search never changes the native transverse query');

        for (const [index, destination] of destinations.entries()) {
          await page.locator('main a.module-item').nth(index).click();
          await familyView(page, destination);
          assert.equal(await page.locator('#dv7-panel').isVisible(), false, labels[index] + ' opens the source module');
          if (destination === 'settings') {
            assert.equal((await page.locator('main h1').innerText()).trim(), 'Paramètres');
            assert.equal(await page.locator('body > nav [data-e01-destination="4"]').getAttribute('aria-current'), 'page', 'Settings belongs to the Menu dock destination');
            assert.equal(await page.locator('main [data-e01-toggle]').count(), 0);
            assert.equal(new URL(await page.getByRole('link', {name: 'Retour au Menu', exact: true}).getAttribute('href'), page.url()).hash, '#menu');
          } else {
            assert.ok((await page.locator('main h1').innerText()).trim().length > 0, 'Destination has a real heading');
          }
          await page.goBack();
          await familyView(page, 'menu');
          assert.deepEqual(await visibleLabels(page), labels, 'Browser Back restores Menu');
          await page.goForward();
          await familyView(page, destination);
          await page.reload();
          await familyView(page, destination);
          assert.deepEqual(await snapshot(page), before, 'Native records preserved after destination reload: ' + destination);
          await open(page, 'menu');
        }

        await page.locator('main a.module-item').nth(4).click();
        await familyView(page, 'settings');
        await page.getByRole('link', {name: 'Retour au Menu', exact: true}).click();
        await familyView(page, 'menu');
        await page.locator('main a.module-item').nth(4).click();
        await familyView(page, 'settings');
        const backup = page.locator('main a[data-fa-action=backup]');
        assert.equal(await backup.count(), 1, 'Settings provides the existing native backup entry');
        await backup.click();
        await familyView(page, 'backup');
        assert.equal(await page.locator('#rg-restore-file').count(), 1, 'Existing restore picker remains available');
        const downloadPromise = page.waitForEvent('download');
        await page.locator('[data-fa-action=rg-full-export]').click();
        const download = await downloadPromise;
        assert.equal(await download.failure(), null, 'Native backup download succeeds');
        const exportedBytes = fs.readFileSync(await download.path());
        const exported = JSON.parse(exportedBytes.toString('utf8'));
        assert.equal(exported.format, 'dobby-complete-backup');
        assert.equal(exported.version, 1);
        await page.evaluate(data => DobbyFamilyStitchEngine.win().dobbyBackupValidation.validatePayload(data), exported);
        for (const key of stateKeys) assert.deepEqual(exported.state[key], before[key], 'Native export preserves ' + key);
        assert.ok(exported.attachments.length > 0, 'Native archive contains the attached test document');
        const backupReceipt = {filename: download.suggestedFilename(), format: exported.format, version: exported.version, bytes: exportedBytes.length, sha256: crypto.createHash('sha256').update(exportedBytes).digest('hex'), attachments: exported.attachments.length, nativeValidation: 'pass'};
        await page.evaluate(() => DobbyRegister.back());
        await familyView(page, 'settings');
        await page.locator('main a[data-fa-action=backup]').click();
        await familyView(page, 'backup');
        await page.goBack();
        await familyView(page, 'settings');
        await page.reload();
        await familyView(page, 'settings');
        await assertChrome(page, width);

        // Removed Menu entries retain their independently addressable modules.
        for (const [route, view] of removedRoutes) {
          await page.goto(origin + '/essai-stitch-v7/' + route);
          await ready(page);
          if (view) await familyView(page, view);
          assert.equal(await page.locator('#dv7-panel').isVisible(), false, 'Preserved source route ' + route);
          assert.equal(await page.locator('body > main').count(), 1);
          assert.deepEqual(await snapshot(page), before, 'Removed Menu route preserves native data: ' + route);
        }
        await open(page, 'list-detail', {record: 'menu-list'});
        assert.match(await page.locator('main').innerText(), /TEST — Pending item/);
        assert.match(await page.locator('main').innerText(), /TEST — Checked item/);
        await page.reload();
        await familyView(page, 'list-detail');
        assert.deepEqual(await snapshot(page), before, 'List content and checked state survive direct-route reload');
        await open(page, 'health-person', {person: 'menu-member', scope: 'local'});
        assert.match(await page.locator('main').innerText(), /TEST — Preserved local visit/);
        await page.reload();
        await familyView(page, 'health-person');
        assert.deepEqual(await snapshot(page), before, 'Health record and its original member identity survive reload');
        assert.equal(await page.evaluate(() => DobbyFamilyStitchEngine.evaluate('return houseRead("family-menu-document").then(blob=>blob.text());')), fixtureBytes, 'Attachment bytes remain intact after all navigation');

        await open(page, 'menu');
        await page.reload();
        await familyView(page, 'menu');
        await page.locator('#global-module-search').fill('');
        await page.locator('#global-module-search').blur();
        assert.deepEqual(await visibleLabels(page), labels, 'Menu remains complete after reload');
        await page.evaluate(() => scrollTo(0, 0));
        await page.evaluate(() => document.fonts.ready);
        const screenshot = path.join(evidence, 'menu-' + width + '.png');
        await page.screenshot({path: screenshot, fullPage: true, animations: 'disabled'});
        await page.setViewportSize({width, height: 480});
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForFunction(() => scrollY > 0);
        const scrollLayout = await assertChrome(page, width, 480);
        const last = await page.locator('main a.module-item').last().boundingBox();
        assert.ok(last.y + last.height <= scrollLayout.dock.top + 1, 'Last card stays fully above the fixed dock after scrolling');
        assert.ok(last.y >= scrollLayout.header.bottom - 1, 'Last card stays below the fixed header');
        await page.setViewportSize({width, height: 844});
        await page.locator('main a.module-item').last().click();
        await familyView(page, 'settings');
        assert.deepEqual(errors, [], 'No uncaught browser errors');
        receipt.widths.push({width, height: 844, cards: labels, searchCases: searchCases.length, fiveDestinations: 'pass', backForwardReload: 'pass', nativeDataPreserved: stateKeys, removedRoutes: removedRoutes.map(([route]) => route), nativeQueryUnchanged: true, attachmentBytesPreserved: true, backup: backupReceipt, headerAndDock: 'unique, fixed and visible', horizontalOverflow: false, lastCardDockOverlap: false, shortViewportHeight: 480, settingsMenuDockActive: true, backupContextualBack: 'settings', screenshot: path.relative(path.resolve(__dirname, '../..'), screenshot), layout: {first: firstLayout, scrolled: scrollLayout}, blockedExternalOrigins: [...new Set(blockedExternal)], errors});
        console.log('MENU_PASS', width, 'five links, 12 filters, settings/native backup, back/forward/reload, 15 removed routes and native records/attachment preserved');
      } finally {
        await context.close();
      }
    }
    receipt.status = 'pass';
    fs.writeFileSync(path.join(evidence, 'checks.json'), JSON.stringify(receipt, null, 2) + '\n');
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});

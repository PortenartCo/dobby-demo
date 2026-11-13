/* Targeted PR #2 review. Synthetic browser-only fixtures; all external requests blocked. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const before = process.argv.includes('--before');
const origin = process.env.DOBBY_TEST_ORIGIN || 'http://127.0.0.1:8765';
const output = path.resolve(__dirname, '../../docs/dobby-v6/evidence/review-final', before ? 'before' : 'after');
const results = [], errors = [];
let completed = false;
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ locale: 'fr-BE', timezoneId: 'Europe/Paris', reducedMotion: 'reduce' });
    await context.route('**/*', async route => {
      const url = route.request().url();
      if (!url.startsWith(origin + '/')) return route.abort();
      // Simulate only the document renderer's connected UI; no auth, sync or storage requests.
      if (/\/family-files\.js\?/.test(url)) {
        const response = await route.fetch();
        const source = (await response.text()).replace('const api=window.DobbyFamilyUI;',
          'const api={...window.DobbyFamilyUI,getContext:()=>window.__reviewConnected?{householdId:"fixture"}:null,isModuleActive:()=>Boolean(window.__reviewConnected)};');
        return route.fulfill({ response, body: source });
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/essai-stitch-v5-famille/index.html');
    await page.waitForFunction(() => window.DobbyPresentation?.version === 6 && window.DobbyFamilyHealth);
    async function capture(name) {
      await page.evaluate(() => document.fonts.ready);
      const measure = await page.evaluate(() => ({
        width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        headings: [...document.querySelectorAll('#screen h2')].map(x => x.textContent),
        visiblePickers: [...document.querySelectorAll('#screen input[type="file"]')].filter(input => {
          const r = input.getBoundingClientRect(); return r.width > 0 && r.height > 0;
        }).length
      }));
      results.push({ name, ...measure });
      await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
      if (!before) assert.equal(measure.scrollWidth, measure.width, name + ': no horizontal overflow');
      return measure;
    }
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(() => {
        const date = todayISO();
        st.familyMembers = [{ id: 'review-person', name: 'TEST — Membre du foyer' }];
        st.famHealth = [{ id: 'review-local', name: 'TEST — Ancien rendez-vous local', person: 'TEST — Membre du foyer', date }];
        st.sharedHealthVisits = [{ id: 'review-shared', title: 'TEST — Rendez-vous partagé', date, person: 'TEST — Membre du foyer' }];
        st.familyEvents = [{ id: 'review-event', title: 'TEST — Événement familial', date, category: 'Famille' }];
        st.manualMissions = [{ id: 'review-manual', title: 'TEST — Mission créée par le foyer', status: 'open', category: 'Famille', due: date }];
        st.houseItems = [{ id: 'review-equipment', name: 'TEST — Entretien automatique', nextMaintenance: date }];
        st.autoTasks = [];
        go('family');
      });
      await capture('family-' + width);
      if (!before) {
        assert.equal(await page.locator('#fpAgenda').count(), 1);
        assert.equal(await page.locator('#fhVisits').count(), 1);
        assert.equal(await page.locator('.st5-legacy-extra, .st5-calendar-portal').count(), 0, 'Legacy family summaries consolidated');
        for (const route of ['contacts','lists','health']) assert.ok(await page.locator('#screen [data-extra="' + route + '"]').count(), route + ' access');
        for (const route of ['documents','house','missions']) assert.ok(await page.locator('#screen [data-go="' + route + '"]').count(), route + ' access');
        assert.equal(await page.locator('[data-extra="healthedit"][data-id="review-local"]').count(), 1, 'Local medical entry retained');
        assert.ok(await page.locator('[data-fh="edit"][data-id="review-shared"]').count(), 'Shared medical entry retained');
        await page.locator('[data-fp-action="new"]').click();
        assert.ok(await page.locator('#fpEventForm').isVisible());
        await page.locator('[data-fp-action="close"]').first().click();
        await page.locator('.dv6-local-records summary').click();
        await page.locator('[data-extra="healthedit"][data-id="review-local"]').click();
        assert.ok(await page.locator('#xHealthForm').isVisible(), 'Old local appointment remains editable');
        await page.locator('[data-dv6-back]').click();
      }
      await page.evaluate(() => go('missions'));
      await capture('missions-' + width);
      if (!before) {
        assert.equal(await page.locator('#fmsManual').count(), 1);
        assert.equal(await page.locator('.dv6-auto-missions').count(), 1);
        assert.equal(await page.locator('.st5-summary').count(), 0, 'No redundant automatic summary');
        assert.ok(await page.locator('[data-fms-action="toggle"][data-id="review-manual"]').count());
        assert.ok(await page.locator('[data-autotask^="equipment:review-equipment:"]').count());
        await page.locator('[data-fms-action="new"]').first().click();
        assert.ok(await page.locator('#fmsForm').isVisible());
        await page.locator('[data-fms-action="close"]').first().click();
        const sourceState = await page.evaluate(() => JSON.stringify([st.manualMissions, st.autoTasks]));
        await page.evaluate(() => render());
        assert.equal(await page.evaluate(() => JSON.stringify([st.manualMissions, st.autoTasks])), sourceState, 'Presentation does not merge or mutate task sources');
        await page.locator('[data-fms-action="toggle"][data-id="review-manual"]').click();
        assert.equal(await page.evaluate(() => st.manualMissions[0].status), 'done');
        assert.equal(await page.evaluate(() => st.autoTasks.find(t => t.originId === 'review-equipment').state), 'open', 'Manual completion leaves automatic source unchanged');
        await page.locator('[data-autotask^="equipment:review-equipment:"]').click();
        assert.equal(await page.evaluate(() => st.autoTasks.find(t => t.originId === 'review-equipment').state), 'done');
      }
      for (const scenario of [
        { name: 'offline', connected: false, shared: true },
        { name: 'offline-local', connected: false, shared: true, local: true },
        { name: 'online-shared', connected: true, shared: true },
        { name: 'online-backup', connected: true, shared: true, local: true },
        { name: 'online-uploaded', connected: true, shared: true, local: true, cloud: true },
        { name: 'online-private', connected: true, shared: false }
      ]) {
        await page.evaluate(s => {
          window.__reviewConnected = s.connected;
          st.familyDocs = [{ id: 'review-doc', title: 'TEST — Pièce jointe du foyer', category: s.shared ? 'Contrats' : 'Identité',
            attachmentName: s.local ? 'copie-locale.pdf' : '', cloudPath: s.cloud ? 'fixture/doc.pdf' : '', cloudName: s.cloud ? 'partage.pdf' : '' }];
          docEdit = null; docNoteEdit = null; docDetail = 'review-doc'; go('documents');
        }, scenario);
        const report = await capture('document-' + scenario.name + '-' + width);
        if (!before) {
          assert.ok(report.visiblePickers <= 1, scenario.name + ': one visible file chooser');
          assert.equal(await page.locator('.dv6-file-picker').count(), await page.locator('#screen input[type="file"]').count(), 'French file controls');
          if (!scenario.connected) {
            assert.ok(await page.locator('#familyDocFile').isVisible(), 'Local action available offline');
            assert.ok(await page.locator('[data-fds-file]').isDisabled(), 'Cloud remains disabled offline');
            assert.ok(!(await page.locator('[data-fds-file]').isVisible()), 'Unavailable cloud chooser hidden');
          }
          if (scenario.name === 'online-backup') {
            await page.locator('.fds-local-backup summary').click();
            assert.ok(!(await page.locator('#familyDocFile').isVisible()), 'Opening backup does not expose a second chooser');
            await page.locator('[data-dv6-file-target="local"]').click();
            assert.ok(await page.locator('#familyDocFile').isVisible());
            assert.ok(!(await page.locator('[data-fds-file]').isVisible()));
            await page.locator('[data-dv6-file-target="shared"]').click();
            assert.ok(await page.locator('[data-fds-file]').isVisible());
          }
        }
      }
      await page.evaluate(() => {
        st.familyMembers = []; st.famHealth = []; st.familyEvents = []; st.sharedHealthVisits = [];
        st.manualMissions = []; st.houseItems = []; st.familyDocs = []; st.autoTasks = [];
        docDetail = null; go('family');
      });
      await capture('family-empty-' + width);
      await page.evaluate(() => go('missions'));
      await capture('missions-empty-' + width);
    }
    if (!before) {
      // Use the unchanged local IndexedDB handler; never activate a real household.
      await page.evaluate(() => {
        window.__reviewConnected = false;
        st.familyDocs = [{ id: 'review-doc', title: 'TEST — Copie locale', category: 'Contrats' }];
        docDetail = 'review-doc'; go('documents');
      });
      await page.locator('#familyDocFile').setInputFiles({ name: 'preuve-locale.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nTEST LOCAL\n%%EOF') });
      await page.waitForFunction(() => st.familyDocs[0].attachmentName === 'preuve-locale.pdf');
      assert.equal(await page.evaluate(async () => (await houseRead('family-review-doc')).size), 25, 'Local binary preserved by original writer');
    }
    assert.deepEqual(errors, []);
    completed = true;
    console.log((before ? 'BASELINE' : 'PASS') + ' — ' + results.length + ' targeted view/state checks, ' + errors.length + ' browser errors');
    await context.close();
  } finally {
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ status: completed ? before ? 'BASELINE' : 'PASS' : 'FAIL', errors, results }, null, 2) + '\n');
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

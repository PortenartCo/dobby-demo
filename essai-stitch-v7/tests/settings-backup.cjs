/* Settings backup acceptance uses fresh browser profiles and fictional local
 * records only. All HTTP requests outside the local fixture are aborted. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');

const origin = process.env.DOBBY_TEST_ORIGIN || 'http://127.0.0.1:8765';
const evidence = process.env.DOBBY_SETTINGS_EVIDENCE;
const bytes = Buffer.from('%PDF-1.4\nDOBBY fictional backup acceptance attachment\n%%EOF\n');
const hash = data => createHash('sha256').update(data).digest('hex');
const upload = (name, data) => ({ name, mimeType: 'application/json', buffer: Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)) });

async function fixture(browser, width = 390) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'fr-BE', acceptDownloads: true });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [], dialogs = [];
  let acceptConfirmation = false;
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', async dialog => {
    dialogs.push({ type: dialog.type(), message: dialog.message() });
    await (dialog.type() === 'confirm' && !acceptConfirmation ? dialog.dismiss() : dialog.accept());
  });
  await page.goto(origin + '/essai-stitch-v7/famille.html#backup?origin=settings');
  await page.waitForFunction(() => window.DobbyFamilyStitch?.ready && window.DobbyHouseUI && DobbyFamilyStitchEngine.win().dobbyBackupValidation);
  const native = (code, payload) => page.evaluate(({ code, payload }) => DobbyFamilyStitchEngine.evaluate(code, payload), { code, payload });
  const open = view => page.evaluate(view => DobbyFamilyStitch.open(view, { origin: 'settings' }), view);
  await native('delete window.DobbyReview; st.familyMembers=[]; for(const name of ["houseItems","houseLogs","houseDocs","familyDocs","familyNotes","famContacts","famLists","famHealth","customRecipes","autoTasks","extras"])st[name]=[];custom=[];st.planned={};st.shopHistory={};st.shopChoice={};st.tmAdaptations={};st.shopFinal=null;st.houseItems=[{id:"fixture-equipment",name:"TEST — Équipement sauvegardé",opaque:{keep:true}}];st.houseDocs=[{id:"fixture-piece",itemId:"fixture-equipment",name:"fictional.pdf",type:"application/pdf"}];st.familyDocs=[{id:"fixture-legacy",title:"TEST — Ancien document autonome",category:"Autre"}];save();');
  await native('return houseStore(new File([new Uint8Array(p.bytes)],"fictional.pdf",{type:"application/pdf"}),"fixture-piece");', { bytes: [...bytes] });
  await open('backup');
  const attachment = () => native('return houseRead("fixture-piece").then(async blob=>blob?[...new Uint8Array(await blob.arrayBuffer())]:null);');
  const snapshot = () => native('return {items:st.houseItems,docs:st.houseDocs,legacy:st.familyDocs};');
  const choose = async data => {
    await page.locator('#rg-restore-file').setInputFiles(upload('fictional-backup.json', data));
    await page.waitForFunction(() => !document.querySelector('[data-fa-action=rg-restore-confirm]').disabled);
  };
  const archive = async () => {
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Créer une sauvegarde', exact: true }).click();
    const download = await downloadEvent;
    assert.equal(await download.failure(), null);
    const data = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    await page.waitForFunction(() => /créée|téléchargement.*lancé/i.test(document.querySelector('#rg-backup-result')?.textContent || ''));
    return data;
  };
  return { context, page, native, open, errors, dialogs, attachment, snapshot, choose, archive, accept(value) { acceptConfirmation = value; } };
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  let scenarios = 0;
  const run = async (name, work, width) => {
    if (process.env.DOBBY_SETTINGS_BACKUP_CASE && process.env.DOBBY_SETTINGS_BACKUP_CASE !== name) return;
    const f = await fixture(browser, width);
    try { await work(f); assert.deepEqual(f.errors, []); console.log('SETTINGS_BACKUP_PASS', name); scenarios++; }
    finally { await f.context.close(); }
  };
  try {
    for (const width of [320, 390, 768, 1440]) await run('presentation-documents-back-' + width, async ({ page, snapshot, attachment }) => {
      assert.equal(await page.getByRole('heading', { name: 'Données et sauvegardes', exact: true }).count(), 1, 'backup route has the simple settings presentation');
      assert.deepEqual(await page.locator('main .rg-settings-panel h2').allTextContents(), ['Sauvegarder les données', 'Restaurer une sauvegarde', 'Documents enregistrés']);
      const text = await page.locator('main').innerText();
      assert.match(text, /non chiffré/i); assert.match(text, /protégé|confidentiel/i); assert.match(text, /remplace.*locales/i);
      assert.equal(await page.locator('[data-fa-action=rg-restore-confirm]').isDisabled(), true);
      assert.equal(await page.locator('main').getByText(/AES.?256|inviolabilité|forteresse|dobbyarchive/i).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      if (evidence) { fs.mkdirSync(evidence, { recursive: true }); await page.screenshot({ path: path.join(evidence, 'backup-' + width + '.png'), fullPage: true }); }
      const before = await snapshot(), originalHash = hash(Buffer.from(await attachment()));
      await page.getByRole('button', { name: 'Ouvrir les documents enregistrés', exact: true }).click();
      await page.waitForFunction(() => DobbyFamilyStitch.view === 'document-library' && document.body.dataset.familyView === 'document-library' && !document.documentElement.classList.contains('dv7-loading') && document.querySelector('main')?.textContent.includes('TEST — Ancien document autonome'));
      assert.match(await page.locator('main').innerText(), /TEST — Ancien document autonome/);
      assert.deepEqual(await snapshot(), before); assert.equal(hash(Buffer.from(await attachment())), originalHash);
      await page.evaluate(() => DobbyFamilyStitch.open('backup', { origin: 'settings' }));
      await page.getByRole('button', { name: /Retour aux paramètres/i }).click();
      await page.waitForFunction(() => DobbyFamilyStitch.view === 'settings' && document.body.dataset.familyView === 'settings' && !document.documentElement.classList.contains('dv7-loading') && document.querySelector('main h1')?.textContent === 'Paramètres');
    }, width);

    await run('real-native-export-and-offline-download', async ({ page, archive, context }) => {
      await context.setOffline(true);
      const data = await archive();
      assert.equal(data.format, 'dobby-complete-backup'); assert.equal(data.version, 1);
      assert.equal(data.state.houseItems[0].name, 'TEST — Équipement sauvegardé');
      assert.deepEqual(data.state.houseItems[0].opaque, { keep: true });
      assert.equal(hash(Buffer.from(data.attachments.find(row => row.id === 'fixture-piece').base64, 'base64')), hash(bytes));
      assert.match(await page.locator('#rg-backup-result').innerText(), /téléchargement/i);
    });

    await run('native-export-failure-has-no-false-success', async ({ page, native }) => {
      await native('st.familyNotes=[{id:"fixture-invalid",title:"Invalid fixture",body:null}];save();');
      let downloads = 0; page.on('download', () => downloads++);
      await page.getByRole('button', { name: 'Créer une sauvegarde', exact: true }).click();
      await page.waitForFunction(() => /impossible|échec/i.test(document.querySelector('#rg-backup-result')?.textContent || ''));
      assert.equal(downloads, 0); assert.match(await page.locator('#rg-backup-result').innerText(), /Mémo invalide/);
      assert.equal(await page.getByRole('button', { name: 'Créer une sauvegarde', exact: true }).isDisabled(), false);
    });

    await run('account-change-during-export-blocks-download', async ({ page, native }) => {
      await native('const prior=FileReader.prototype.readAsDataURL;FileReader.prototype.readAsDataURL=function(blob){window.__exportReadStarted=true;window.__releaseExport=()=>{FileReader.prototype.readAsDataURL=prior;prior.call(this,blob);};};');
      let downloads = 0; page.on('download', () => downloads++);
      await page.getByRole('button', { name: 'Créer une sauvegarde', exact: true }).click();
      await page.waitForFunction(() => DobbyFamilyStitchEngine.win().__exportReadStarted);
      await native('window.DobbyFamilyUI={...window.DobbyFamilyUI,getContext:()=>({userId:"other-fixture-account",householdId:"other-fixture-house"})};window.__releaseExport();');
      await page.waitForFunction(() => !DobbyRegister.busy);
      assert.equal(downloads, 0, 'an account switch must cancel the actual native download');
      assert.match(await page.locator('#rg-backup-result').innerText(), /impossible|interrompue/i);
    });

    await run('restore-validation-cancellation-and-file-picker', async ({ page, archive, snapshot, attachment, dialogs }) => {
      const data = await archive(), before = await snapshot(), originalHash = hash(Buffer.from(await attachment()));
      const chooserEvent = page.waitForEvent('filechooser');
      await page.locator('label[for=rg-restore-file]').press('Enter');
      await (await chooserEvent).setFiles(upload('fictional-backup.json', data));
      await page.locator('[data-fa-action=rg-restore-confirm]:not([disabled])').waitFor();
      assert.match(await page.locator('#rg-import-preview').innerText(), /Validation native.*réussie/i);
      assert.deepEqual(await snapshot(), before, 'preview never replaces data');
      await page.locator('[data-fa-action=rg-restore-confirm]').click();
      await page.waitForFunction(() => /annulée/i.test(document.querySelector('#rg-backup-result')?.textContent || ''));
      assert.ok(dialogs.some(dialog => dialog.type === 'confirm' && /Remplacer toutes les données locales/.test(dialog.message)));
      assert.deepEqual(await snapshot(), before); assert.equal(hash(Buffer.from(await attachment())), originalHash);
    });

    await run('malformed-and-incomplete-archives-never-enable-restore', async ({ page, archive, snapshot }) => {
      const data = await archive(), before = await snapshot();
      for (const invalid of ['{broken', { ...data, version: 4 }, { ...data, attachments: [] }]) {
        await page.locator('#rg-restore-file').setInputFiles(upload('invalid-fictional.json', invalid));
        await page.waitForFunction(() => /refusé|invalide/i.test(document.querySelector('#rg-import-preview')?.textContent || ''));
        assert.equal(await page.locator('[data-fa-action=rg-restore-confirm]').isDisabled(), true);
        assert.deepEqual(await snapshot(), before);
      }
    });

    await run('native-restore-preserves-records-and-attachment-hash-after-reload', async f => {
      const { page, archive, choose, native, snapshot, attachment, accept } = f;
      const data = await archive(), before = await snapshot();
      await native('st.houseItems=[{id:"fixture-other",name:"TEST — Remplacement fictif"}];st.houseDocs=[];st.familyDocs=[];save();return houseStore(new File(["other bytes"],"other.pdf",{type:"application/pdf"}),"fixture-piece");');
      await choose(data); accept(true);
      await page.locator('[data-fa-action=rg-restore-confirm]').click();
      await page.waitForFunction(() => /restaurée/i.test(document.querySelector('#rg-backup-result')?.textContent || ''));
      assert.deepEqual(await snapshot(), before); assert.equal(hash(Buffer.from(await attachment())), hash(bytes));
      await page.reload(); await page.waitForFunction(() => window.DobbyFamilyStitch?.ready);
      assert.deepEqual(await snapshot(), before); assert.equal(hash(Buffer.from(await attachment())), hash(bytes));
    });

    await run('native-restore-write-failure-rolls-back-records-and-attachment-bytes', async ({ page, archive, choose, native, snapshot, attachment, accept }) => {
      const data = await archive(), before = await snapshot();
      data.state.houseItems[0].name = 'TEST — Incoming quota fixture';
      data.attachments.find(row => row.id === 'fixture-piece').base64 = Buffer.from('TEST — incoming attachment to roll back').toString('base64');
      await choose(data);
      await native('const prior=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(String(value).includes("TEST — Incoming quota fixture")){Storage.prototype.setItem=prior;throw Error("TEST — quota local simulé");}return prior.call(this,key,value);};');
      accept(true); await page.locator('[data-fa-action=rg-restore-confirm]').click();
      await page.waitForFunction(() => /quota local simulé/.test(document.querySelector('#rg-backup-result')?.textContent || ''));
      assert.match(await page.locator('#rg-backup-result').innerText(), /refusée|interrompue/i);
      assert.deepEqual(await snapshot(), before); assert.equal(hash(Buffer.from(await attachment())), hash(bytes));
      await page.reload(); await page.waitForFunction(() => window.DobbyFamilyStitch?.ready);
      assert.deepEqual(await snapshot(), before); assert.equal(hash(Buffer.from(await attachment())), hash(bytes));
    });

    await run('changed-registry-rejects-preview-confirmation', async ({ page, archive, choose, native }) => {
      const data = await archive(); await choose(data);
      await native('st.houseItems[0].name="TEST — Version concurrente";save();');
      await page.locator('[data-fa-action=rg-restore-confirm]').click();
      await page.waitForFunction(() => /modifié|changé/i.test(document.querySelector('#rg-backup-result')?.textContent || ''));
      assert.equal(await native('return st.houseItems[0].name;'), 'TEST — Version concurrente');
    });

    await run('changed-registry-during-transfer-read-rejects-restore', async ({ page, archive, choose, native, accept }) => {
      const data = await archive(); await choose(data); accept(true);
      await page.evaluate(() => { const prior = File.prototype.arrayBuffer; File.prototype.arrayBuffer = function () { const file = this; window.__transferReadStarted = true; return new Promise(resolve => { window.__releaseTransfer = () => { File.prototype.arrayBuffer = prior; prior.call(file).then(resolve); }; }); }; });
      await page.locator('[data-fa-action=rg-restore-confirm]').click();
      await page.waitForFunction(() => window.__transferReadStarted);
      await native('st.houseItems[0].name="TEST — Concurrent pendant transfert";save();');
      await page.evaluate(() => window.__releaseTransfer());
      await page.waitForFunction(() => !DobbyRegister.busy);
      assert.equal(await native('return st.houseItems[0].name;'), 'TEST — Concurrent pendant transfert', 'the final transfer read must not bypass the preview revision guard');
      assert.match(await page.locator('#rg-backup-result').innerText(), /refusée|interrompue/i);
    });

    await run('changed-registry-during-native-read-cancels-before-confirmation', async ({ page, archive, choose, native, accept, dialogs }) => {
      const data = await archive(); await choose(data); accept(true);
      await native('const prior=File.prototype.text;File.prototype.text=function(){const file=this;window.__nativeReadStarted=true;return new Promise(resolve=>{window.__releaseNativeRead=()=>{File.prototype.text=prior;prior.call(file).then(resolve);};});};');
      await page.locator('[data-fa-action=rg-restore-confirm]').click();
      await page.waitForFunction(() => DobbyFamilyStitchEngine.win().__nativeReadStarted);
      await native('st={...st,houseItems:[{id:"fixture-concurrent",name:"TEST — Native read concurrent state"}]};save();window.__releaseNativeRead();');
      await page.waitForFunction(() => !DobbyRegister.busy);
      assert.equal(await native('return st.houseItems[0].id;'), 'fixture-concurrent', 'a changed registry during native read must remain intact');
      assert.equal(dialogs.filter(dialog => dialog.type === 'confirm').length, 0, 'stale preview must be rejected before asking destructive confirmation');
      assert.match(await page.locator('#rg-backup-result').innerText(), /refusée|interrompue/i);
    });

    await run('changed-business-state-after-native-confirmation-is-preserved', async ({ page, archive, choose, native, accept, attachment }) => {
      const data = await archive(); await choose(data); accept(true);
      await native('const prior=IDBFactory.prototype.open,descriptor=Object.getOwnPropertyDescriptor(IDBRequest.prototype,"onsuccess");IDBFactory.prototype.open=function(...args){const request=prior.apply(this,args);Object.defineProperty(request,"onsuccess",{set(callback){descriptor.set.call(request,function(event){window.__postReadReady=true;window.__releasePostRead=()=>{IDBFactory.prototype.open=prior;callback.call(request,event);};});}});return request;};');
      await page.locator('[data-fa-action=rg-restore-confirm]').click();
      await page.waitForFunction(() => DobbyFamilyStitchEngine.win().__postReadReady);
      await native('st={...st,familyNotes:[{id:"fixture-post-confirm",title:"TEST — Concurrent note",body:"TEST — Must remain after restore refusal"}]};save();window.__releasePostRead();');
      await page.waitForFunction(() => !DobbyRegister.busy);
      assert.equal(await native('return st.familyNotes[0]?.id;'), 'fixture-post-confirm', 'a same-household business update after confirmation must survive refusal');
      assert.equal(hash(Buffer.from(await attachment())), hash(bytes));
      assert.match(await page.locator('#rg-backup-result').innerText(), /refusée|interrompue/i);
      await page.reload(); await page.waitForFunction(() => window.DobbyFamilyStitch?.ready);
      assert.equal(await native('return st.familyNotes[0]?.id;'), 'fixture-post-confirm', 'refusal must preserve the persisted concurrent state');
    });

    await run('readonly-profile-blocks-complete-export-and-restore', async ({ page, native, open }) => {
      await native('st.familyMembers=[{id:"fixture-child",name:"TEST — Enfant",memberCategory:"child"}];window.DobbyReview={demoMemberId:"fixture-child"};save();');
      await open('backup');
      assert.equal(await page.getByRole('button', { name: 'Créer une sauvegarde', exact: true }).isDisabled(), true);
      assert.equal(await page.locator('#rg-restore-file').isDisabled(), true);
      assert.match(await page.locator('main').innerText(), /lecture seule|parent/i);
    });
  } finally { await browser.close(); }
  console.log('SETTINGS_BACKUP_RESULT', scenarios, 'isolated scenarios passed; external requests blocked');
})().catch(error => { console.error(error); process.exitCode = 1; });

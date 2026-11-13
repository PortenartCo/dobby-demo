/* Independent contracts acceptance edges. Isolated native fixtures only; no
 * external requests or claims about live backend permissions/notifications. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const origin = process.env.DOBBY_TEST_ORIGIN || 'http://127.0.0.1:8765';
const evidence = path.resolve(__dirname, '../../docs/dobby-v7/contracts/evidence/screens');
const widths = [320, 390, 768, 1024, 1440];
const failures = [];

// A real, readable single-page PDF, including byte-correct xref offsets.
function pdf(text) {
  const stream = `BT /F1 16 Tf 36 760 Td (${text.replace(/[()\\]/g, '\\$&')}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let content = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(content));
    content += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(content);
  content += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  content += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  content += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(content);
}
const originalPdf = pdf('DOBBY isolated original contract - acceptance fixture');
const amendmentPdf = pdf('DOBBY isolated amendment - acceptance fixture');
const replacementPdf = pdf('DOBBY isolated revised original - acceptance fixture');
const upload = (name, buffer) => ({ name, mimeType: 'application/pdf', buffer });

function fixtures(count) {
  return Array.from({ length: count }, (_, i) => {
    const row = {
      id: `edge-${i}`, title: `Contrat foyer ${String(i + 1).padStart(2, '0')}`,
      category: i % 2 ? 'Assurances' : 'Contrats',
      provider: i === 1 ? 'Organisme Aiguille' : `Organisme ${i + 1}`,
      reference: `EDGE-REFERENCE-${i}`, futureMetadata: { keep: true, ordinal: i },
    };
    if (i % 4 === 1) return { ...row, deadline: '2028-03-31', contract: { version: 1, type: 'insurance', scope: 'equipment', equipmentIds: ['boiler', 'unavailable-equipment'], notice: { value: 1, unit: 'months' } } };
    if (i % 4 === 2) return { ...row, title: row.title + ' ' + 'LongueRéférence'.repeat(12), deadline: '2026-02-30', contract: { version: 1, type: 'maintenance', renonDate: 'à confirmer', notice: { value: 3, unit: 'months' } } };
    if (i % 4 === 3) return { ...row, deadline: '31/02/2025', date: 'ancienne date littérale', person: 'Ancienne personne conservée', tags: 'ancien tag', note: 'Ancienne fiche sans métadonnées structurées' };
    return row; // Legacy/partial record: dates and contract object are unknown.
  });
}

async function pageFixture(browser, width = 390) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'fr-BE', acceptDownloads: true });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Fixture operations must never accidentally authorize a destructive prompt.
  page.on('dialog', dialog => dialog.dismiss());
  await page.goto(origin + '/essai-stitch-v7/famille.html#contracts');
  await page.waitForFunction(() => window.DobbyFamilyStitch?.ready && window.DobbyContractsUI && DobbyFamilyStitchEngine.win().DobbyFamilyContracts);
  const native = (code, payload) => page.evaluate(({ code, payload }) => DobbyFamilyStitchEngine.evaluate(code, payload), { code, payload });
  const open = (view, record = null) => page.evaluate(({ view, record }) => DobbyFamilyStitch.open(view, { record }), { view, record });
  const seed = async rows => {
    await native('delete window.DobbyReview; st.familyMembers=[]; st.familyDocs=p.rows; st.houseItems=[{id:"boiler",name:"Chaudière"},{id:"lift",name:"Ascenseur"}]; save();', { rows });
    await open('contracts');
    await page.locator('#doc-search').fill('');
  };
  const stored = keys => native('return Promise.all(p.keys.map(async key=>{const blob=await houseRead(key); return blob?{key,type:blob.type,bytes:[...new Uint8Array(await blob.arrayBuffer())]}:null;}));', { keys });
  return { context, page, native, open, seed, stored, errors };
}

async function geometry(page, label) {
  const result = await page.evaluate(() => {
    const bad = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) bad.push(`document width ${document.documentElement.scrollWidth}/${innerWidth}`);
    for (const node of document.querySelectorAll('main .contracts-register,main .contracts-card,main fieldset,main input:not([type=hidden]),main textarea,main select,main iframe,main .contracts-actions button,main .contracts-actions a')) {
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height || getComputedStyle(node).visibility === 'hidden') continue;
      if (rect.left < -1 || rect.right > innerWidth + 1) bad.push(`${node.tagName} ${node.id || node.name || node.textContent.slice(0, 50)} [${rect.left},${rect.right}]`);
    }
    for (const actions of document.querySelectorAll('main .contracts-actions')) {
      const children = [...actions.children].filter(node => node.getBoundingClientRect().width);
      for (let i = 0; i < children.length; i++) for (let j = i + 1; j < children.length; j++) {
        const a = children[i].getBoundingClientRect(), b = children[j].getBoundingClientRect();
        if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) bad.push('overlapping action controls');
      }
    }
    return bad;
  });
  assert.deepEqual(result, [], label);
}

async function screenshot(page, name) {
  fs.mkdirSync(evidence, { recursive: true });
  await page.screenshot({ path: path.join(evidence, name + '.png'), fullPage: true });
}

async function confirmClick(page, locator, accept) {
  // Replace the fixture's default dismissal only for this one explicit action.
  page.removeAllListeners('dialog');
  const messages = [];
  page.on('dialog', async dialog => {
    messages.push(dialog.message());
    if (accept) await dialog.accept(); else await dialog.dismiss();
  });
  try {
    await locator.click();
    await page.waitForFunction(() => !DobbyRegister.busy);
    assert.equal(messages.length, 1, 'exactly one native confirmation is required');
  } finally {
    page.removeAllListeners('dialog');
    page.on('dialog', dialog => dialog.dismiss());
  }
  return messages[0];
}

async function run(name, task) {
  try { await task(); console.log('CONTRACTS_EDGE_PASS', name); }
  catch (error) { failures.push({ name, error }); console.error('CONTRACTS_EDGE_FAIL', name, error.stack || error); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const width of widths) await run(`list-geometry-keyboard-${width}`, async () => {
      const f = await pageFixture(browser, width), { page, native, open, seed } = f;
      try {
        for (const count of [0, 1, 10, 50]) {
          const rows = fixtures(count);
          await seed(rows);
          assert.equal(await page.locator('main h1').innerText(), 'Contrats & Assurances');
          assert.equal(await page.locator('main h1').count(), 1);
          assert.equal(await page.locator('.contracts-count').innerText(), `${count} éléments enregistrés`);
          assert.equal(await page.locator('.contracts-card').count(), count);
          assert.equal(await page.locator('main img,main [data-document-facets],main [data-e08-illustration],main [data-fa-action="rg-doc-category"]').count(), 0);
          const text = await page.locator('main').innerText();
          assert.match(text, /Retrouvez les contrats, assurances et échéances du foyer\./);
          assert.doesNotMatch(text, /Actes scellés|Tous les documents|DOBBY - TEST DE TRANSFERT|Note de vigilance|Initialisation du foyer|Catégories/);
          assert.equal(await page.getByRole('button', { name: 'Toutes', exact: true }).count(), 0);
          if (!count) assert.match(text, /Aucun contrat enregistré/);
          else {
            assert.match(text, /Prochaine échéance/); assert.match(text, /Date limite pour donner renon/); assert.match(text, /À renseigner/);
            assert.equal(await page.getByRole('button', { name: 'Consulter', exact: true }).count(), count);
          }
          if (count >= 10) {
            assert.match(text, /2026-02-30 · date à vérifier/);
            assert.match(text, /31\/02\/2025 · date à vérifier/);
            assert.doesNotMatch(text, /Invalid Date|NaN/);
            assert.equal((await native('return st.familyDocs;')).length, count, 'render never repairs/removes persisted records');
            await page.locator('#doc-search').fill('aiguille');
            assert.equal(await page.locator('.contracts-card').count(), 1, 'provider search');
            await page.locator('#doc-search').fill('EDGE-REFERENCE-8');
            assert.equal(await page.locator('.contracts-card').count(), 1, 'reference search');
            await page.locator('#doc-search').fill('aucun-résultat-synthétique');
            assert.equal(await page.locator('.contracts-card').count(), 0); assert.match(await page.locator('main').innerText(), /Aucun contrat ne correspond/);
            await page.locator('#doc-search').fill('');
          }
          await geometry(page, `list ${count} at ${width}`);
          if (count === 10 && [390, 1440].includes(width)) await screenshot(page, `edge-list-${width}`);
        }
        const search = page.locator('#doc-search'); await search.focus(); await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Consulter', 'list is usable by keyboard after search');
        await page.getByRole('button', { name: 'Ajouter un contrat manuellement', exact: true }).click();
        await page.waitForSelector('#contractName');
        await geometry(page, `form at ${width}`);
        const visibleText = await page.locator('main').innerText();
        assert.doesNotMatch(visibleText, /Catégorie native|Personne concernée|Mots-clés|Enregistrement et partage|Gérer le foyer|Synchroniser le foyer|Initialisation du foyer|Note de vigilance/);
        assert.equal(await page.locator('main img').count(), 0);
        await page.locator('#contractName').focus(); await page.keyboard.type('Contrat au clavier'); await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement?.name), 'type');
        await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement?.name), 'provider');
        await page.locator('[name=terminationConditions]').fill('Texte conservé après réduction simulant le clavier mobile.');
        await page.setViewportSize({ width, height: 480 });
        await page.locator('[name=terminationConditions]').focus(); await page.locator('[name=terminationConditions]').scrollIntoViewIfNeeded();
        assert.equal(await page.locator('[name=terminationConditions]').inputValue(), 'Texte conservé après réduction simulant le clavier mobile.');
        await geometry(page, `keyboard-height form at ${width}`);
        await page.getByRole('button', { name: 'Enregistrer', exact: true }).scrollIntoViewIfNeeded();
        assert.equal(await page.getByRole('button', { name: 'Enregistrer', exact: true }).isEnabled(), true);
        await page.setViewportSize({ width, height: 900 });
        if ([390, 1440].includes(width)) await screenshot(page, `edge-form-${width}`);
        await open('contract', 'edge-1'); await geometry(page, `detail at ${width}`);
        if ([390, 1440].includes(width)) {
          await screenshot(page, `edge-detail-${width}`);
          await open('contracts'); await page.getByRole('button', { name: 'Importer des contrats avec une IA', exact: true }).click();
          await page.waitForSelector('#contracts-ai-prompt', { state: 'attached' });
          await page.getByText('Lire ou sélectionner le prompt', { exact: true }).click();
          await geometry(page, `AI import at ${width}`);
          assert.match(await page.locator('#contracts-ai-prompt').inputValue(), /J.ai terminé/);
          await screenshot(page, `edge-import-${width}`);
        }
        assert.deepEqual(f.errors, []);
      } finally { await f.context.close(); }
    });

    await run('unknown-fields-historical-date-edit-reload', async () => {
      const f = await pageFixture(browser), { page, native, open, seed } = f;
      try {
        const before = { id: 'historical', title: 'Ancien contrat', category: 'Contrats', date: 'date documentaire historique', deadline: '31/02/2025', person: 'Texte historique', tags: 'ancien classement', futureMetadata: { deep: ['à conserver'] }, contract: { version: 1, type: 'legacy-type', effectiveDate: '01/04/ancien', renonDate: 'à confirmer', notice: { value: 'clause ambiguë', unit: 'historic-unit', extension: true }, amount: 'montant non normalisé', provenance: [{ page: 8, verbatim: 'clause source' }], future: { untouched: true } } };
        await seed([before]); await open('contract', before.id);
        await page.getByRole('button', { name: 'Modifier la fiche', exact: true }).click(); await page.waitForSelector('#rg-form');
        assert.equal(await page.locator('[name=deadline]').inputValue(), before.deadline);
        assert.equal(await page.locator('[name=deadline]').getAttribute('type'), 'text');
        assert.equal(await page.locator('[name=effectiveDate]').inputValue(), before.contract.effectiveDate);
        assert.equal(await page.locator('[name=renonDate]').inputValue(), before.contract.renonDate);
        await page.locator('[name=provider]').fill('Correction sans perte');
        await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
        await page.waitForFunction(() => DobbyFamilyStitch.view === 'contract');
        let saved = await native('return st.familyDocs[0];');
        assert.equal(saved.provider, 'Correction sans perte');
        for (const [key, value] of Object.entries(before)) {
          if (key === 'contract') for (const [field, raw] of Object.entries(value)) assert.deepEqual(saved.contract[field], raw, `historical clause ${field} is retained`);
          else assert.deepEqual(saved[key], value, `historical field ${key} is retained`);
        }
        const savedContract = saved.contract;
        await page.reload(); await page.waitForFunction(() => DobbyFamilyStitch?.ready); await open('contract', before.id);
        saved = await native('return st.familyDocs[0];');
        assert.equal(saved.deadline, before.deadline); assert.deepEqual(saved.contract, savedContract); assert.deepEqual(saved.futureMetadata, before.futureMetadata);
        assert.deepEqual(f.errors, []);
      } finally { await f.context.close(); }
    });

    await run('stale-form-rejects-overwrite-and-keeps-typing', async () => {
      const f = await pageFixture(browser), { page, native, open, seed } = f;
      try {
        await seed([{ id: 'stale', title: 'Titre avant', category: 'Contrats', provider: 'Avant', contract: { version: 1 }, futureMetadata: { retained: true } }]);
        await open('contract', 'stale'); await page.getByRole('button', { name: 'Modifier la fiche', exact: true }).click();
        await page.locator('#contractName').fill('Saisie à conserver'); await page.locator('[name=note]').fill('Mon texte en cours');
        await native('st.familyDocs[0].provider="Modification concurrente";save();');
        await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('#fa-notice')?.textContent.includes('modifi'));
        assert.equal(await page.locator('#contractName').inputValue(), 'Saisie à conserver');
        assert.equal(await page.locator('[name=note]').inputValue(), 'Mon texte en cours');
        assert.equal(await page.evaluate(() => DobbyFamilyStitch.view), 'contract-edit');
        assert.match(await page.locator('#fa-notice').innerText(), /saisie est conservée/);
        const saved = await native('return st.familyDocs[0];');
        assert.equal(saved.title, 'Titre avant'); assert.equal(saved.provider, 'Modification concurrente'); assert.equal(saved.note, undefined);
        await page.evaluate(() => DobbyFamilyStitch.refresh());
        assert.equal(await page.locator('#contractName').inputValue(), 'Saisie à conserver', 'native refresh retains the unsaved draft');
        assert.equal(await page.locator('[name=note]').inputValue(), 'Mon texte en cours');
        assert.deepEqual(f.errors, []);
      } finally { await f.context.close(); }
    });

    await run('real-pdf-amendment-replacement-legacy-blob-retention', async () => {
      const f = await pageFixture(browser), { page, native, open, seed, stored } = f;
      try {
        await seed([{ id: 'pdf', title: 'Contrat avec original historique', category: 'Contrats', attachmentName: 'original-historique.pdf', attachmentType: 'application/pdf', futureMetadata: { keep: true } }]);
        await native('return houseStore(new File([new Uint8Array(p.bytes)],"original-historique.pdf",{type:"application/pdf"}),"family-pdf");', { bytes: [...originalPdf] });
        await open('contract', 'pdf'); await page.locator('[data-fa-action=rg-contract-file-open][data-attachment=legacy]').click();
        await page.waitForSelector('iframe[data-contract-pdf]');
        const src = await page.locator('iframe[data-contract-pdf]').getAttribute('src'); assert.match(src, /^blob:/);
        const rendered = await page.evaluate(async url => [...new Uint8Array(await (await fetch(url)).arrayBuffer())], src);
        assert.deepEqual(rendered, [...originalPdf], 'PDF preview receives the readable original bytes');
        assert.match(Buffer.from(rendered).toString(), /\/Count 1/); assert.match(Buffer.from(rendered).toString(), /xref/);
        assert.equal(await page.getByRole('link', { name: 'Ouvrir dans un nouvel onglet', exact: true }).getAttribute('href'), src);
        assert.equal(await page.getByRole('link', { name: 'Ouvrir dans un nouvel onglet', exact: true }).getAttribute('target'), '_blank');
        assert.equal(await page.getByRole('link', { name: 'Télécharger', exact: true }).getAttribute('download'), 'original-historique.pdf');
        const downloadEvent = page.waitForEvent('download'); await page.getByRole('link', { name: 'Télécharger', exact: true }).click();
        const download = await downloadEvent; assert.equal(download.suggestedFilename(), 'original-historique.pdf');
        const stream = await download.createReadStream(); const chunks = []; for await (const chunk of stream) chunks.push(chunk);
        assert.deepEqual(Buffer.concat(chunks), originalPdf, 'download contains the original PDF');
        await page.locator('#contract-add-files').setInputFiles(upload('avenant.pdf', amendmentPdf));
        await page.waitForFunction(() => DobbyFamilyStitchEngine.read().state.familyDocs[0].attachments?.length === 1);
        await page.waitForFunction(() => !DobbyRegister.busy); await open('contract', 'pdf');
        let saved = await native('return st.familyDocs[0];');
        const amendment = saved.attachments[0]; assert.equal(amendment.kind, 'amendment');
        assert.deepEqual((await stored(['family-pdf', amendment.key])).map(item => item?.bytes), [[...originalPdf], [...amendmentPdf]]);
        assert.equal(saved.attachmentName, 'original-historique.pdf'); assert.equal(saved.cloudPath, undefined); assert.equal(amendment.cloudPath, undefined);
        const fileChooser = page.waitForEvent('filechooser'); await page.locator('[data-fa-action=rg-contract-file-replace][data-attachment=legacy]').click();
        page.removeAllListeners('dialog'); let confirmations = 0; page.on('dialog', async dialog => { confirmations++; await dialog.accept(); });
        await (await fileChooser).setFiles(upload('original-révisé.pdf', replacementPdf));
        await page.waitForFunction(() => DobbyFamilyStitchEngine.read().state.familyDocs[0].attachments?.length === 2);
        await page.waitForFunction(() => !DobbyRegister.busy); assert.equal(confirmations, 1);
        page.removeAllListeners('dialog'); page.on('dialog', dialog => dialog.dismiss());
        saved = await native('return st.familyDocs[0];'); const replacement = saved.attachments.find(item => item.supersedes === 'legacy'); assert.ok(replacement);
        assert.deepEqual((await stored(['family-pdf', amendment.key, replacement.key])).map(item => item?.bytes), [[...originalPdf], [...amendmentPdf], [...replacementPdf]], 'replacement retains the original and amendment blobs');
        await page.reload(); await page.waitForFunction(() => DobbyFamilyStitch?.ready); await open('contract', 'pdf');
        assert.equal(await page.locator('.contracts-piece').count(), 3); assert.match(await page.locator('main').innerText(), /Version antérieure conservée/);
        await page.locator(`[data-fa-action=rg-contract-file-open][data-attachment="${amendment.id}"]`).click(); await page.waitForSelector('iframe[data-contract-pdf]');
        const bytes = await page.locator('iframe[data-contract-pdf]').evaluate(async frame => [...new Uint8Array(await (await fetch(frame.src)).arrayBuffer())]);
        assert.deepEqual(bytes, [...amendmentPdf]); assert.deepEqual(f.errors, []);
      } finally { await f.context.close(); }
    });

    await run('native-delete-confirmation-and-all-attachment-cleanup', async () => {
      const f = await pageFixture(browser), { page, native, open, seed, stored } = f;
      try {
        await seed([{ id: 'delete', title: 'DOBBY - TEST DE TRANSFERT', category: 'Contrats', attachmentName: 'original.pdf', attachmentType: 'application/pdf' }, { id: 'unrelated', title: 'À conserver', category: 'Contrats', attachmentName: 'autre.pdf', attachmentType: 'application/pdf' }]);
        assert.equal(await page.getByRole('heading', { name: 'DOBBY - TEST DE TRANSFERT', exact: true }).count(), 1, 'a genuinely persisted fixture is retained until explicit deletion');
        const attachments = await native('return (async()=>{const file=new File([new Uint8Array(p.bytes)],"fixture.pdf",{type:"application/pdf"});await houseStore(file,"family-delete");await houseStore(file,"family-unrelated");return [await DobbyFamilyContracts.addAttachment("delete",file,"contract"),await DobbyFamilyContracts.addAttachment("delete",file,"amendment")];})();', { bytes: [...originalPdf] });
        const keys = ['family-delete', ...attachments.map(item => item.key)];
        await open('contract', 'delete');
        assert.match(await confirmClick(page, page.getByRole('button', { name: 'Supprimer cette fiche', exact: true }), false), /Supprimer/);
        assert.equal((await native('return st.familyDocs;')).length, 2); assert.equal((await stored(keys)).filter(Boolean).length, 3, 'cancel preserves all native binaries');
        await open('contract', 'delete');
        await confirmClick(page, page.getByRole('button', { name: 'Supprimer cette fiche', exact: true }), true);
        await page.waitForFunction(() => !DobbyFamilyStitchEngine.read().state.familyDocs.some(row => row.id === 'delete'));
        assert.deepEqual((await native('return st.familyDocs;')).map(row => row.id), ['unrelated']);
        assert.deepEqual(await stored(keys), [null, null, null], 'accept removes legacy and every newly added blob');
        assert.deepEqual((await stored(['family-unrelated']))[0].bytes, [...originalPdf], 'unrelated fiche binary stays intact');
        await page.reload(); await page.waitForFunction(() => DobbyFamilyStitch?.ready); assert.deepEqual((await native('return st.familyDocs;')).map(row => row.id), ['unrelated']);
        assert.deepEqual(f.errors, []);
      } finally { await f.context.close(); }
    });

    await run('explicit-child-ui-and-native-mutation-boundary', async () => {
      const f = await pageFixture(browser), { page, native, open, seed, stored } = f;
      try {
        await seed([{ id: 'child-contract', title: 'Contrat consultable', category: 'Contrats' }]);
        const attachment = await native('return DobbyFamilyContracts.addAttachment("child-contract",new File([new Uint8Array(p.bytes)],"original.pdf",{type:"application/pdf"}));', { bytes: [...originalPdf] });
        await native('st.familyMembers=[{id:"child-fixture",name:"Enfant fixture",memberCategory:"child"}];window.DobbyReview={demoMemberId:"child-fixture"};save();');
        await open('contracts'); assert.equal(await page.evaluate(() => DobbyFamilyStitch.sharedReadOnly()), true);
        for (const label of ['Ajouter un contrat manuellement', 'Importer des contrats avec une IA']) assert.equal(await page.getByRole('button', { name: label, exact: true }).isDisabled(), true);
        assert.match(await page.locator('main').innerText(), /lecture seule/);
        await page.getByRole('button', { name: 'Consulter', exact: true }).click(); await page.waitForFunction(() => DobbyFamilyStitch.view === 'contract');
        assert.equal(await page.locator('[data-fa-action=rg-doc-edit],[data-fa-action=rg-doc-delete],[data-fa-action=rg-contract-file-share],[data-fa-action=rg-contract-file-replace],[data-fa-action=rg-contract-file-remove],#contract-add-files').count(), 0);
        const before = await native('return st.familyDocs;');
        const results = await native('return (async()=>{const C=DobbyFamilyContracts,id="child-contract",piece=p.attachment;const file=new File([new Uint8Array(p.bytes)],"attempt.pdf",{type:"application/pdf"});const operations=[()=>C.save(id,{title:"Child overwrite"},C.snapshot(id)),()=>C.addAttachment(id,file),()=>C.shareAttachment(id,piece),()=>C.replaceAttachment(id,piece,file),()=>C.removeAttachment(id,piece),()=>C.delete(id,C.snapshot(id))];const results=[];for(const operation of operations){try{await operation();results.push("UNEXPECTED WRITE");}catch(error){results.push(error.message);}}return results;})();', { attachment: attachment.id, bytes: [...replacementPdf] });
        assert.equal(results.length, 6); for (const result of results) assert.match(result, /lecture seule|parent|enfant/i);
        assert.deepEqual(await native('return st.familyDocs;'), before); assert.deepEqual((await stored([attachment.key]))[0].bytes, [...originalPdf]);
        await page.locator('[data-fa-action=rg-contract-file-open]').click(); await page.waitForSelector('iframe[data-contract-pdf]');
        assert.deepEqual(f.errors, []);
      } finally { await f.context.close(); }
    });
  } finally { await browser.close(); }
  if (failures.length) {
    console.error(`CONTRACTS_EDGE_RESULT ${failures.length} failed scenario(s)`);
    process.exitCode = 1;
  } else console.log('CONTRACTS_EDGE_RESULT all acceptance edges passed');
})().catch(error => { console.error(error); process.exitCode = 1; });

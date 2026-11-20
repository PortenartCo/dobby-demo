/* Isolated component test. The localhost HTTP fixture contains fictional people only. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const origin = process.env.DOBBY_TEST_ORIGIN || 'http://127.0.0.1:8765';
const base = origin + '/essai-stitch-v7/';
const widths = [320, 390, 1440];
const household = '00000000-0000-4000-8000-000000000101';

const view = `<!doctype html><html lang="fr"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${base}family.css">
<link rel="stylesheet" href="${base}health-essential.css">
<style>body { background:#1e1310;color:#fadcd5;margin:0;font:16px Georgia,serif }
main { margin:auto; max-width:720px } h1 { margin:0;padding:16px }</style>
<main><h1>Santé</h1><div id="health"></div></main>
<script type="module">
import { createHealthClient } from '${base}health-essential.mjs';
import { mountHealthEssential } from '${base}health-essential-view.mjs';
let actor = new URL(location.href).searchParams.get('actor') || 'a';
let epoch = 0;
let change;
const rpc = async (method, query, body) => {
  const response = await fetch('/fixture/' + query,{
    method, headers: {'X-Fixture-Actor':actor,'Content-Type':'application/json'},
    body:JSON.stringify(body),cache:'no-store'
  });
  if (!response.ok) throw Object.assign(Error('Refus de la fixture'),{status:response.status});
  return response;
};
const client = createHealthClient({
  getContext: () => ({
    householdId:'${household}', memberId:actor, userId:actor, identityVerified:true
  }),
  connectionState: () => ({epoch}),
  authorized: async (...args) => (await rpc(...args)).json()
},{
  upload: async (path, file) => rpc('POST', 'storage/' + path, [...new Uint8Array(await file.arrayBuffer())]),
  download: async path => (await rpc('GET', 'storage/' + path)).blob()
});
window.health = mountHealthEssential(document.querySelector('#health'),{
  client, getRole: () => actor === 'child' ? 'child' : 'parent',
  subscribe(listener){change=listener; return () => {change=null;};},
  now: () => new Date('2026-10-25T12:00:00Z')
});
window.switchAccount = user => {actor=user;epoch++;change?.();};
</script></html>`;

async function fixture(context, initial, access = {}) {
  const rows = initial;
  const files = new Map();
  await context.route('**/*', async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === '/health-component-fixture') return route.fulfill({ contentType: 'text/html', body: view });
    if (!url.pathname.startsWith('/fixture/')) return route.continue();
    const actor = req.headers()['x-fixture-actor'];
    const canManage = person => actor !== 'child' &&
      (actor === person || (person === 'child' && access.caregiver !== false));
    const reply = (data, status = 200) => route.fulfill({ status, json: data });
    const read = url.searchParams.get('p_view');
    if (read === 'people') return reply([{ id: actor, name: 'TEST Parent ' + actor.toUpperCase(), category: 'parent' },
      ...(access.caregiver === false ? [] : [{ id: 'child', name: 'TEST Enfant', category: 'child' }])]);
    if (read === 'private') {
      const person = url.searchParams.get('p_member_id');
      return canManage(person) ? reply([...rows.values()].filter(row => row.person === person && !row.removed)) :
        reply({}, 403);
    }
    if (read === 'practical') return reply([...rows.values()].filter(row => row.person === actor &&
      row.fields.childVisible && !row.removed && !row.fields.cancelled).map(row => ({
      id: row.id, kind: row.kind, date: row.fields.date, time: row.fields.time,
      place: row.fields.childPlace, text: row.fields.childText
    })));
    if (read === 'reminders') return reply([...rows.values()].filter(row => row.kind === 'visit' && !row.removed &&
      !row.fields.cancelled && (canManage(row.person) || (row.person === actor && row.fields.childVisible))).flatMap(row => {
      const offset = row.fields.date === '2026-10-26' && row.fields.remindDayBefore ? 1 :
        row.fields.date === '2026-10-25' && row.fields.remindSameDay ? 0 : null;
      return offset === null ? [] : [{ id: row.id, date: row.fields.date, time: row.fields.time, offset }];
    }));
    if (url.pathname.includes('/storage/')) {
      const filePath = url.pathname.replace('/fixture/storage/', '');
      const row = [...rows.values()].find(entry => entry.path === filePath);
      if (!row || !canManage(row.person) || row.removed) return reply({}, 403);
      if (req.method() === 'POST') {
        if (files.has(filePath)) {
          access.duplicateUpload = true;
          return reply({}, 409);
        }
        files.set(filePath, Buffer.from(req.postDataJSON()));
        if (access.dropUploadResponse) {
          access.dropUploadResponse = false;
          return reply({}, 503);
        }
        return reply({});
      }
      if (!row.fields.ready || !files.has(filePath)) return reply({}, 403);
      return route.fulfill({ contentType: row.fields.mime, body: files.get(filePath) });
    }
    const data = req.postDataJSON();
    const { p_id: id, p_member_id: person, p_kind: kind, p_revision: revision,
      p_values: values, p_action: action, p_operation_id: operationId } = data;
    if (!canManage(person)) return reply({}, 403);
    const previous = rows.get(id);
    if (previous?.operationId === operationId && previous.revision === revision + 1) {
      return reply({ id, revision: previous.revision, path: previous.path });
    }
    if ((previous?.revision || 0) !== revision) return reply({}, 409);
    const saved = { id, person, kind, fields: { ...values }, revision: revision + 1, operationId };
    if (action !== 'save') saved.fields = { ...previous.fields };
    if (kind === 'document') {
      saved.path = previous?.path || household + '/' + id + '.pdf';
      saved.canUpload = true;
      saved.fields.ready = action === 'finalize';
    }
    if (action === 'remove') saved.removed = true;
    rows.set(id, saved);
    return reply({ id, revision: saved.revision, path: saved.path });
  });
}

async function visible(page, text) {
  await page.getByText(text, { exact: true }).first().waitFor();
}

async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
}

(async () => {
  const output = process.env.DOBBY_HEALTH_EVIDENCE || await fs.mkdtemp(path.join(os.tmpdir(), 'dobby-health-ui-'));
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox'] });
  try {
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: 840 }, timezoneId: 'America/New_York' });
      const rows = new Map();
      const access = {};
      await fixture(context, rows, access);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin + '/health-component-fixture');
      await page.evaluate(() => localStorage.setItem('fixture-legacy-health', '{"famHealth":[{"title":"TEST ANCIEN LOCAL"}]}'));
      await page.getByRole('button', { name: 'Renseigner le carnet' }).click();
      await page.getByLabel('Allergies').fill('TEST DÉTAIL ADULTE');
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
      await visible(page, 'TEST DÉTAIL ADULTE');

      await page.getByLabel('Personne').selectOption('child');
      await page.getByRole('button', { name: 'Ajouter un rendez-vous' }).click();
      await page.getByLabel('Intitulé privé').fill('TEST MOTIF PRIVÉ');
      await page.getByLabel('Date du rendez-vous').fill('2026-10-26');
      await page.getByLabel('Rappel le jour même (J0)').uncheck();
      assert.equal(await page.getByLabel('Rappel la veille (J-1)').isChecked(), true);
      await page.getByLabel('Partager la date et l’heure dans l’Agenda du foyer').check();
      await page.getByLabel('Publier dans la vue de cet enfant').check();
      await page.getByLabel('Lieu publié pour l’enfant').fill('TEST Entrée pratique');
      await page.getByLabel('Consigne publiée pour l’enfant').fill('TEST Apporter une gourde');
      await noOverflow(page);
      await page.screenshot({ path: path.join(output, `edition-${width}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
      await visible(page, 'TEST MOTIF PRIVÉ');
      assert.equal(await page.getByText('Rappels de rendez-vous', { exact: true }).count(), 1);

      await page.getByRole('button', { name: 'Ajouter un document' }).click();
      await page.getByLabel('Nom du document').fill('TEST PARCHEMIN PRIVÉ');
      const pdf = Buffer.from('%PDF-1.4\nTEST fictif');
      await page.getByLabel('PDF ou image (10 Mo maximum)').setInputFiles({
        name: 'test.pdf', mimeType: 'application/pdf', buffer: pdf
      });
      await page.getByRole('button', { name: 'Envoyer le fichier' }).click();
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Télécharger' }).click();
      assert.deepEqual(await fs.readFile(await (await download).path()), pdf);

      if (width === 390) {
        access.dropUploadResponse = true;
        await page.getByRole('button', { name: 'Ajouter un document' }).click();
        await page.getByLabel('Nom du document').fill('TEST fichier après interruption');
        const fileInput = page.getByLabel('PDF ou image (10 Mo maximum)');
        await fileInput.setInputFiles({ name: 'original.pdf', mimeType: 'application/pdf', buffer: pdf });
        const send = page.getByRole('button', { name: 'Envoyer le fichier' });
        await send.click();
        await visible(page, 'Enregistrement non confirmé. Vous pouvez réessayer.');
        // Different bytes of the same MIME must not silently confirm the immutable first upload.
        await fileInput.setInputFiles({
          name: 'different.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 TEST différent')
        });
        await send.click();
        await visible(page, 'Vérifiez la pièce existante avant de reprendre l’envoi.');
        assert.equal(access.duplicateUpload, true);
        assert.equal(await page.getByRole('button', { name: 'Télécharger' }).count(), 1);
        await page.getByRole('button', { name: 'Confirmer le fichier déjà envoyé' }).click();
        await visible(page, 'Fichier envoyé confirmé.');
        assert.equal(await page.getByRole('button', { name: 'Télécharger' }).count(), 2);
      }

      const second = await browser.newContext({ viewport: { width, height: 840 } });
      await fixture(second, rows);
      const otherPage = await second.newPage();
      await otherPage.goto(origin + '/health-component-fixture?actor=b');
      await otherPage.getByLabel('Personne').selectOption('child');
      await visible(otherPage, 'TEST MOTIF PRIVÉ');
      assert.equal(await otherPage.getByText('TEST DÉTAIL ADULTE').count(), 0);
      await second.close();

      await page.reload();
      await page.getByLabel('Personne').selectOption('child');
      await page.getByRole('button', { name: 'Modifier', exact: true }).click();
      assert.equal(await page.getByLabel('Rappel le jour même (J0)').isChecked(), false);
      access.caregiver = false;
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await visible(page, 'Carnet indisponible pour ce compte.');
      assert.equal(await page.getByLabel('Intitulé privé').count(), 0);
      access.caregiver = true;
      await page.evaluate(() => switchAccount('child'));
      await visible(page, 'TEST Apporter une gourde');
      await visible(page, 'TEST Entrée pratique');
      assert.equal(await page.getByRole('heading', { name: 'Rappels de rendez-vous' }).count(), 1);
      assert.equal(await page.locator('#health button, #health input').count(), 0);
      assert.doesNotMatch(await page.locator('#health').textContent(), /TEST MOTIF PRIVÉ|TEST DÉTAIL ADULTE|TEST PARCHEMIN PRIVÉ/);
      await noOverflow(page);
      await page.screenshot({ path: path.join(output, `enfant-${width}.png`) });
      const visit = [...rows.values()].find(row => row.kind === 'visit');
      visit.fields.childVisible = false;
      await page.evaluate(() => health.refresh());
      await visible(page, 'Aucun rendez-vous ni consigne publié pour vous.');
      assert.equal(await page.getByText('Rappels de rendez-vous').count(), 0);
      assert.deepEqual(await page.evaluate(() => ({
        localKeys: Object.keys(localStorage),
        historic: JSON.parse(localStorage.getItem('fixture-legacy-health')),
        sessionSize: sessionStorage.length,
      })), {
        localKeys: ['fixture-legacy-health'],
        historic: { famHealth: [{ title: 'TEST ANCIEN LOCAL' }] },
        sessionSize: 0
      });
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px · carnet, rendez-vous, PDF, projection enfant, reconnexion et révocation`);
      await context.close();
    }
    console.log(output);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

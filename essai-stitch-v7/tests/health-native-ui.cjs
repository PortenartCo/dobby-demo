/* Browser acceptance on the real V7 pages and the real V5 native iframe. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { canonicalGroceryFixture } = require('./helpers/canonical-grocery-fixture.cjs');

const origin = process.env.DOBBY_TEST_ORIGIN || 'http://127.0.0.1:8765';
const base = origin + '/essai-stitch-v7/';
const project = 'https://pqcdkrwljgvgagzwrcmg.supabase.co';
const out = process.env.DOBBY_HEALTH_EVIDENCE || path.join(os.tmpdir(), 'dobby-health-native-ui');
const uid = suffix => '00000000-0000-4000-8000-' + String(suffix).padStart(12, '0');
const household = uid(10);
const users = { A: uid(1), B: uid(2), C: uid(3) };
const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Brussels', year: 'numeric',
  month: '2-digit', day: '2-digit' }).format(new Date());
const localCanary = 'LEGACY_LOCAL_HEALTH_FIXTURE';
const sharedCanary = 'LEGACY_SHARED_HEALTH_FIXTURE';
const privateCanary = 'CARNET_PRIVE_ENFANT_FIXTURE';
const otherCanary = 'RENDEZ_VOUS_NON_PUBLIE_FIXTURE';
const practicalText = 'Se présenter à l’accueil fictif';
const practicalPlace = 'Hall des témoins fictifs';
const pdf = Buffer.from('%PDF-1.4\nSynthetic DOBBY Health acceptance document\n%%EOF\n');
const carnet = '[data-health-carnet]';
const agendaSlot = '[data-health-agenda-slot]';
const reminderTitle = 'Rappels de rendez-vous';

async function installFixture(context) {
  const canonical = canonicalGroceryFixture(household, users);
  canonical.profiles.C.memberCategory = 'child';
  canonical.profiles.C.name = 'TEST — Enfant C';
  const person = role => canonical.profiles[role].id;
  const legacy = { id:'legacy-shared-fixture', title:sharedCanary, date:day, time:'06:34', personId:person('C') };
  canonical.familyRow.payload.sharedHealthVisits = [legacy];
  const rows = new Map([
    [uid(31), { id:uid(31), person:person('C'), kind:'visit', revision:1, fields:{
      title:privateCanary, date:day, time:'10:42', note:'NOTE_CLINIQUE_FICTIVE', provider:'SECRET_PROFESSIONNEL_FICTIF',
      remindSameDay:true, agendaVisible:true, childVisible:true, childText:practicalText, childPlace:practicalPlace
    }}],
    [uid(32), { id:uid(32), person:person('C'), kind:'visit', revision:1,
      fields:{ title:otherCanary, date:day, time:'09:17', note:'JAMAIS_PUBLIE_FIXTURE' }}],
    [uid(33), { id:uid(33), person:person('B'), kind:'profile', revision:1,
      fields:{ information:'CARNET_PARENT_B_FIXTURE' }}]
  ]);
  const files = new Map();
  let enabled = false;
  const fixture = { person, rows, files, legacy, requests:[], clientReleased:true, legacyClosed:false,
    get enabled() { return enabled; },
    set enabled(value) {
      if (value && !this.legacyClosed) {
        // Live publication refuses historical rows. The fixture models controlled server cutover.
        canonical.familyRow.payload.sharedHealthVisits = [];
        canonical.familyRow.revision++;
        this.legacyClosed = true;
      }
      enabled = value;
    },
    caregiver:true, delay:null };
  const manage = (role, target) => role !== 'C' &&
    (target === person(role) || (target === person('C') && role === 'A' && fixture.caregiver));
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const endpoint = url.pathname;
    if (url.origin === origin) {
      if (endpoint === '/essai-stitch-v7/access-config.js') return route.fulfill({
        contentType:'text/javascript', body:`window.DobbyPublicConfig={publicKey:'sb_publishable_dobby_health_fixture_only',healthEssentialAvailable:${fixture.clientReleased}};`
      });
      return route.continue();
    }
    if (url.origin !== project) return route.abort();
    const method = request.method();
    const headers = request.headers();
    const json = (data, status = 200) => route.fulfill({ status, json:data });
    const deny = () => json({message:'Refus de la fixture Santé'}, 403);
    if (method === 'OPTIONS') return route.fulfill({ status:204, headers:{
      'Access-Control-Allow-Origin':origin, 'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers':headers['access-control-request-headers'] || '*'
    }});
    if (endpoint === '/auth/v1/token') {
      const body = request.postDataJSON();
      const role = body.email?.split('@')[0] || body.refresh_token?.replace('fixture-refresh-', '');
      if (!users[role]) return deny();
      return json({ access_token:'fixture-access-'+role, refresh_token:'fixture-refresh-'+role, expires_in:3600,
        user:{ id:users[role], email:role+'@example.test' } });
    }
    if (endpoint === '/auth/v1/logout') return json({});
    const role = /^Bearer fixture-access-([ABC])$/.exec(headers.authorization)?.[1];
    if (!users[role]) return deny();
    if (endpoint.endsWith('/dobby_v2_memberships')) return json([{ household_id:household, user_id:users[role], active:true }]);
    if (endpoint.endsWith('/dobby_v2_households')) return json([{ id:household }]);
    if (endpoint.endsWith('/dobby_v2_grocery')) return json([]);
    if (endpoint.endsWith('/dobby_v7_context')) return json(canonical.context(role));
    if (endpoint.endsWith('/dobby_v7_family_capabilities')) return json({protocol:2, installed:false});
    if (endpoint.endsWith('/dobby_v2_modules')) {
      const name = url.searchParams.get('module');
      if (method !== 'GET') return deny();
      return json(name === 'eq.family' ? [canonical.familyRow] : name ? [] : [{module:'family'}]);
    }
    if (endpoint.includes('missions') && endpoint.endsWith('_capabilities')) return json({});
    if (endpoint === '/rest/v1/rpc/dobby_health_capabilities') {
      fixture.requests.push({ role, method, endpoint:'capabilities' });
      assert.equal(method, 'GET');
      assert.equal(url.searchParams.get('p_household_id'), household);
      return json({enabled:fixture.enabled, ...(fixture.legacyClosed ? {legacyClosed:true} : {})});
    }
    if (endpoint === '/rest/v1/rpc/dobby_health_read') {
      const view = url.searchParams.get('p_view');
      const target = url.searchParams.get('p_member_id');
      fixture.requests.push({ role, method, endpoint:'read', view });
      assert.equal(method, 'GET');
      assert.equal(url.searchParams.get('p_household_id'), household);
      if (!fixture.enabled) return deny();
      const current = [...rows.values()];
      if (view === 'people') return role === 'C' ? deny() : json(Object.entries(canonical.profiles)
        .filter(([key, profile]) => manage(role, profile.id))
        .map(([key, profile]) => ({id:profile.id, name:profile.name, category:profile.memberCategory})));
      if (view === 'private') {
        if (!manage(role, target)) return deny();
        const response = structuredClone(current.filter(row => row.person === target));
        const delayed = fixture.delay;
        if (delayed?.role === role && delayed.target === target) {
          fixture.delay = null;
          delayed.started();
          await delayed.resume;
        }
        return json(response);
      }
      assert.equal(target, null);
      const active = current.filter(row => !row.fields.cancelled);
      if (view === 'practical') return role !== 'C' ? deny() : json(active
        .filter(row => row.person === person(role) && row.fields.childVisible)
        .map(({id, kind, fields}) => ({id, kind, date:fields.date, time:fields.time,
          place:fields.childPlace, text:fields.childText})));
      const visits = active.filter(row => row.kind === 'visit');
      const childCanSee = row => row.person === person(role) && row.fields.childVisible;
      if (view === 'agenda') return json(visits.filter(row => row.fields.agendaVisible && (role !== 'C' || childCanSee(row)))
        .map(({id, fields}) => ({id, date:fields.date, time:fields.time})));
      if (view === 'reminders') return json(visits.filter(row => row.fields.date === day && row.fields.remindSameDay &&
        (role === 'C' ? childCanSee(row) : manage(role, row.person)))
        .map(({id, fields}) => ({id, date:fields.date, time:fields.time, offset:0})));
      return deny();
    }
    if (endpoint === '/rest/v1/rpc/dobby_health_write') {
      const {p_id:id, p_member_id:target, p_kind:kind, p_action:action, p_revision:revision,
        p_household_id:requestedHousehold, p_operation_id:operation, p_values:fields} = request.postDataJSON();
      assert.equal(method, 'POST');
      assert.equal(requestedHousehold, household);
      assert.match(operation, /^[\da-f-]{36}$/);
      fixture.requests.push({ role, method, endpoint:'write', action, kind });
      if (!fixture.enabled || !manage(role, target)) return deny();
      if ((rows.get(id)?.revision || 0) !== revision) return json({}, 409);
      if (action === 'finalize') {
        const row = rows.get(id);
        if (!row || !files.has(row.path) || row.uploader !== role) return deny();
        row.fields.ready = true;
        row.revision++;
        return json({ id, path:row.path, revision:row.revision });
      }
      const row = { id, person:target, kind, revision:revision + 1, fields };
      if (kind === 'document') {
        assert.equal(fields.mime, 'application/pdf');
        Object.assign(row, {path:`${household}/${id}.pdf`, uploader:role, canUpload:true});
        row.fields.ready = false;
      }
      rows.set(id, row);
      return json({id, path:row.path ?? null, revision:row.revision});
    }
    if (endpoint.startsWith('/storage/v1/')) {
      const prefix = method === 'POST' ? '/storage/v1/object/dobby-health-files/' :
        '/storage/v1/object/authenticated/dobby-health-files/';
      assert.ok(endpoint.startsWith(prefix), endpoint);
      assert.equal(url.search, '');
      fixture.requests.push({ role, method, endpoint:'storage' });
      const filePath = endpoint.slice(prefix.length);
      const row = [...rows.values()].find(row => row.path === filePath);
      if (!fixture.enabled || !row || !manage(role, row.person)) return deny();
      if (method === 'POST') {
        if (row.uploader !== role || row.fields.ready || files.has(filePath)) return deny();
        assert.equal(headers['x-upsert'], 'false');
        assert.equal(headers['content-type'], 'application/pdf');
        assert.equal(headers['cache-control'], 'private, no-store');
        files.set(filePath, request.postDataBuffer());
        return json({}, 201);
      }
      assert.equal(method, 'GET');
      if (!row.fields.ready || !files.has(filePath)) return deny();
      return route.fulfill({ contentType:'application/pdf', body:files.get(filePath),
        headers:{'Cache-Control':'private, no-store'} });
    }
    return json([]);
  });
  return fixture;
}

async function waitNative(page) {
  try {
    await page.waitForFunction(() => document.querySelector('#dv7-engine')?.contentWindow
      .DobbyFamilyUI?.connectionState().ready);
  } catch (error) {
    console.error(await page.evaluate(() => {
      const engine = document.querySelector('#dv7-engine');
      return {page:location.pathname+location.hash, engine:engine?.src, engineDocument:engine?.contentDocument?.readyState,
        appReady:window.DobbyStitchV7?.ready, native:engine?.contentWindow.DobbyFamilyUI?.connectionState()};
    }));
    throw error;
  }
}

async function waitActor(page, role) {
  await page.waitForFunction(userId => {
    const api = document.querySelector('#dv7-engine')?.contentWindow.DobbyFamilyUI;
    return api?.getContext()?.userId === userId && api.getContext().identityVerified;
  }, users[role]);
}

async function signInViaForm(page, family, role) {
  const login = new URL(family);
  login.searchParams.set('fixture-login', role);
  login.hash = 'access-auth?mode=login';
  await page.goto(login.href);
  await page.getByLabel('Adresse e-mail', {exact:true}).fill(role+'@example.test');
  await page.getByLabel('Mot de passe', {exact:true}).fill('fictional-browser-test');
  await page.getByRole('button', {name:'Se connecter', exact:true}).click();
  try {
    await page.waitForURL(/#onboarding-ritual|\/traverse\.html/);
  } catch (error) {
    console.error(await page.evaluate(() => {
      const api = document.getElementById('dv7-engine')?.contentWindow.DobbyFamilyUI;
      const access = api?.access.state();
      return { route: location.pathname + location.hash, phase: access?.phase, verified: access?.verified,
        notice: document.querySelector('[role="alert"],#fa-notice')?.textContent.trim() };
    }));
    throw error;
  }
  await waitActor(page, role);
}

async function logout(page) {
  await page.evaluate(() => window.DobbyAccess.logout());
  await waitNative(page);
  await page.waitForFunction(() => !document.querySelector('#dv7-engine')?.contentWindow
    .DobbyFamilyUI?.connectionState().userId);
}

async function online(page) {
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
}

async function noHealthText(page, ...canaries) {
  const dom = await page.locator('main').textContent();
  for (const text of canaries) assert.ok(!dom.includes(text), `Private fixture text visible in ${page.url()}: ${text}`);
}

async function screenshot(page, name, width) {
  const overflow = await page.evaluate(() => {
    const root = document.querySelector('main');
    return Math.max(document.documentElement.scrollWidth - innerWidth, root.scrollWidth - root.clientWidth);
  });
  assert.ok(overflow <= 1, `${name}: ${overflow} px overflow at ${width} px`);
  await page.screenshot({path:path.join(out, `${name}-${width}.png`), fullPage:true});
}

async function testWidth(browser, width) {
  const context = await browser.newContext({ viewport:{width, height:900}, locale:'fr-BE',
    timezoneId:'Europe/Brussels', reducedMotion:'reduce', serviceWorkers:'block', acceptDownloads:true });
  try {
    const fixture = await installFixture(context);
    fixture.clientReleased = width !== 390;
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const family = base + 'famille.html';
    await page.goto(family+'#menu');
    await page.waitForFunction(() => window.DobbyFamilyStitch?.ready);
    await waitNative(page);
    await page.evaluate(({child, localCanary, day}) => DobbyFamilyStitchEngine.evaluate(
      'st.famHealth=[{id:"health-legacy-local",personId:p.child,name:p.localCanary,date:p.day}];save();',
      {child, localCanary, day}), { child:fixture.person('C'), localCanary, day });
    const menuHealth = page.locator('main [data-fa-action="health"]');
    await page.locator('#global-module-search').waitFor();
    assert.equal(await menuHealth.count(), 0);
    await page.goto(family+'#health');
    await page.waitForURL(/#health(?:\?|$)/);
    await page.locator(carnet).getByText(/Connectez un compte familial vérifié/).waitFor();
    assert.equal(fixture.requests.length, 0);
    await noHealthText(page, localCanary, sharedCanary);

    await signInViaForm(page, family, 'A');
    await page.goto(family+'#health');
    await page.locator(carnet).getByText(/actuellement indisponible/).waitFor();
    if (!fixture.clientReleased) {
      assert.deepEqual(fixture.requests, []);
      fixture.clientReleased = true;
      await page.reload();
      await page.locator(carnet).getByText(/actuellement indisponible/).waitFor();
    }
    assert.ok(fixture.requests.some(request => request.endpoint === 'capabilities'));
    assert.ok(fixture.requests.every(request => request.endpoint === 'capabilities'));
    await page.evaluate(legacy => DobbyFamilyStitchEngine.evaluate(
      'st.sharedHealthVisits=[p.legacy];save();', {legacy}), fixture.legacy);
    fixture.enabled = true;
    await page.goto(family+'#menu');
    await menuHealth.click();
    await page.waitForURL(/#health(?:\?|$)/);
    const select = page.locator(carnet + ' select');
    const child = fixture.person('C');
    await select.locator(`option[value="${child}"]`).waitFor({state:'attached'});
    await select.selectOption(child);
    await page.locator(carnet).getByText(privateCanary, {exact:true}).waitFor();
    await noHealthText(page, localCanary, sharedCanary);
    assert.equal(await page.evaluate(() => DobbyFamilyStitchEngine.evaluate(
      'return st.sharedHealthVisits.find(row => row.id === "legacy-shared-fixture")?.title;')), sharedCanary);
    assert.deepEqual(await page.evaluate(() => DobbyFamilyStitchEngine.read().shared), [],
      'Device-only Health history must stay out of the V7 projection before any account change');
    await screenshot(page, 'health-parent', width);

    await page.goto(family+'#member-detail?person='+encodeURIComponent(child));
    const memberLink = page.getByText('Consulter le carnet de santé', {exact:true});
    await memberLink.click();
    await page.waitForURL(/#health-person/);
    await page.locator(carnet).getByText(privateCanary, {exact:true}).waitFor();
    if (width === 390) {
      await page.goBack();
      await page.waitForURL(/#member-detail/);
      await memberLink.waitFor();
      await page.goForward();
      await page.waitForURL(/#health-person/);
      await page.locator(carnet).getByText(privateCanary, {exact:true}).waitFor();
    }

    if (width === 390) await writeAndDownload(page, fixture);

    await page.goto(family+'#agenda?day='+day);
    const slot = page.locator(agendaSlot);
    await slot.waitFor();
    assert.equal(await slot.count(), 1);
    assert.equal(await slot.locator('h3').textContent(), 'Rendez-vous');
    assert.equal(await slot.locator('p').textContent(), '10:42');
    await page.getByRole('heading', {name:reminderTitle, exact:true}).waitFor();
    await noHealthText(page, privateCanary, otherCanary, 'NOTE_CLINIQUE_FICTIVE', practicalText, localCanary, sharedCanary);
    await screenshot(page, 'health-agenda', width);

    await page.goto(base+'traverse.html');
    await waitActor(page, 'A');
    const today = page.locator('[data-health-today]');
    await today.getByRole('listitem').filter({hasText:/10:42/}).waitFor();
    await noHealthText(page, privateCanary, otherCanary, 'NOTE_CLINIQUE_FICTIVE', practicalText, localCanary, sharedCanary);
    await screenshot(page, 'health-today', width);

    if (width === 390) await caregiverAndAccount(page, fixture, family);
    else await logout(page);
    await signInViaForm(page, family, 'C');
    await page.goto(family+'#health');
    await page.locator(carnet).getByText(practicalText, {exact:true}).waitFor();
    await page.locator(carnet).getByText(practicalPlace, {exact:true}).waitFor();
    assert.equal(await select.count(), 0);
    assert.equal(await page.locator(carnet).getByRole('button', {name:/Ajouter|Modifier|Télécharger/}).count(), 0);
    await noHealthText(page, privateCanary, otherCanary, 'NOTE_CLINIQUE_FICTIVE', localCanary, sharedCanary);
    const childReads = fixture.requests.filter(request => request.role === 'C' && request.endpoint === 'read');
    assert.ok(childReads.some(request => request.view === 'practical'));
    assert.ok(childReads.every(request => !['private', 'people'].includes(request.view)));
    await screenshot(page, 'health-child', width);

    const original = await page.evaluate(() => ({...DobbyFamilyStitchEngine.read(), cuisine: DobbyCuisineEngine.read().state}));
    assert.equal(await page.evaluate(() => DobbyFamilyStitchEngine.evaluate(
      'return st.famHealth.find(row => row.id === "health-legacy-local")?.name;')), localCanary);
    assert.deepEqual(original.local, [], 'Device-only notes never enter the child projection');
    assert.equal(original.shared.some(row => row.id === 'legacy-shared-fixture'), false,
      'The previous account’s shared cache must not be reused by the child');
    assert.deepEqual(original.events, []);
    assert.doesNotMatch(JSON.stringify(original), new RegExp([localCanary, sharedCanary, privateCanary].join('|')));
    const browserState = await page.evaluate(() => JSON.stringify([Object.values(localStorage), Object.values(sessionStorage)]));
    for (const secret of [privateCanary, 'Nouvelle information privée fictive', 'Pièce synthétique locale']) {
      assert.ok(!browserState.includes(secret), 'Health data leaked into browser web storage');
    }
    assert.deepEqual(errors, []);
    return { width, requestCount:fixture.requests.length, writes:fixture.requests.filter(request => request.endpoint === 'write').length,
      storageRequests:fixture.requests.filter(request => request.endpoint === 'storage').length };
  } finally {
    await context.close();
  }
}

async function writeAndDownload(page, fixture) {
  const panel = page.locator(carnet);
  await panel.getByRole('button', {name:'Renseigner le carnet', exact:true}).click();
  await panel.getByLabel('Informations utiles').fill('Nouvelle information privée fictive');
  await panel.getByRole('button', {name:'Enregistrer', exact:true}).click();
  await panel.getByText('Nouvelle information privée fictive', {exact:true}).waitFor();

  await panel.getByRole('button', {name:'Ajouter un document', exact:true}).click();
  await panel.getByLabel('Nom du document').fill('Pièce synthétique locale');
  await panel.locator('input[type=file]').setInputFiles({name:'fixture.pdf', mimeType:'application/pdf', buffer:pdf});
  await panel.getByRole('button', {name:'Envoyer le fichier', exact:true}).click();
  const downloadable = panel.getByRole('button', {name:'Télécharger', exact:true});
  const [download] = await Promise.all([page.waitForEvent('download'), downloadable.click()]);
  assert.equal(download.suggestedFilename(), 'document-sante.pdf');
  assert.deepEqual(await fs.readFile(await download.path()), pdf);
  assert.deepEqual([...fixture.files.values()], [pdf]);
  assert.deepEqual(fixture.requests.filter(request => request.endpoint === 'storage').map(request => request.method), ['POST', 'GET']);
}

async function caregiverAndAccount(page, fixture, family) {
  const child = fixture.person('C');
  const childRoute = family+'#health-person?person='+encodeURIComponent(child);
  await page.goto(childRoute);
  await page.locator(carnet).getByText(privateCanary, {exact:true}).waitFor();
  fixture.caregiver = false;
  await online(page);
  await page.locator(carnet).getByText(/Carnet indisponible pour ce compte/).waitFor();
  await noHealthText(page, privateCanary, practicalText);
  fixture.caregiver = true;
  await online(page);
  await page.locator(carnet).getByText(privateCanary, {exact:true}).waitFor();

  let release;
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const resume = new Promise(resolve => { release = resolve; });
  fixture.delay = { role:'A', target:child, started, resume };
  await online(page);
  let timer;
  try {
    await Promise.race([ready, new Promise((_, reject) => {
      timer = setTimeout(() => reject(Error('Private Health fixture request did not start')), 12000);
    })]);
    await page.evaluate(() => document.querySelector('#dv7-engine').contentWindow.DobbyFamilyUI.access.logout());
    await page.waitForURL(family+'#access');
    await signInViaForm(page, family, 'B');
    await page.goto(childRoute);
    await page.locator(carnet).getByText(/Carnet indisponible pour ce compte/).waitFor();
  } finally {
    clearTimeout(timer);
    release();
  }
  const select = page.locator(carnet+' select');
  await select.selectOption(fixture.person('B'));
  await page.locator(carnet).getByText('CARNET_PARENT_B_FIXTURE', {exact:true}).waitFor();
  await noHealthText(page, privateCanary, practicalText, 'Nouvelle information privée fictive');
  await logout(page);
}

async function testCrossTabAndHistory(browser) {
  const context = await browser.newContext({ viewport:{width:390,height:900}, locale:'fr-BE',
    timezoneId:'Europe/Brussels', serviceWorkers:'block' });
  try {
    const fixture = await installFixture(context);
    fixture.enabled = true;
    const family = base + 'famille.html';
    const route = family+'#health-person?person='+encodeURIComponent(fixture.person('C'));
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    await page.addInitScript(secret => {
      if (window !== top) return;
      window.addEventListener('pageshow', event => {
        if (event.isTrusted && event.persisted) {
          const privateTextExposed = document.querySelector('[data-health-carnet]')?.textContent.includes(secret);
          sessionStorage.setItem('health-fixture-bfcache', privateTextExposed ? 'private-text' : 'restored');
        }
      });
    }, privateCanary);
    await signInViaForm(page, family, 'A');
    await page.goto(route);
    await page.locator(carnet).getByText(privateCanary, {exact:true}).waitFor();

    const second = await context.newPage();
    second.setDefaultTimeout(12000);
    await second.goto(family+'#menu');
    await waitActor(second, 'A');
    await logout(second);
    await page.locator(carnet).getByText(privateCanary, {exact:true}).waitFor({state:'detached'});
    const observed = fixture.requests.length;
    const refusal = await page.evaluate(async () => {
      const native = document.querySelector('#dv7-engine').contentWindow.DobbyFamilyUI;
      try {
        await native.authorized('GET', 'rpc/dobby_health_read?p_view=people');
        return null;
      } catch (error) { return error.message; }
    });
    assert.match(refusal, /session|compte/i);
    assert.equal(fixture.requests.length, observed, 'An old tab cannot dispatch its former bearer');
    await noHealthText(page, privateCanary, practicalText, otherCanary);

    await signInViaForm(page, family, 'A');
    await page.goto(route);
    await page.locator(carnet).getByText(privateCanary, {exact:true}).waitFor();
    await page.goto(base+'menu-layout.html');
    await signInViaForm(second, family, 'B');
    await page.goBack({waitUntil:'commit'});
    await waitActor(page, 'B');
    await page.locator(carnet).getByText(/Carnet indisponible pour ce compte/).waitFor();
    await noHealthText(page, privateCanary, practicalText, otherCanary);
    const historyMarker = await page.evaluate(() => sessionStorage.getItem('health-fixture-bfcache'));
    assert.notEqual(historyMarker, 'private-text', 'A restored document must already have dropped Health text');
    const restored = historyMarker === 'restored';
    if (!restored) {
      const originalDocument = await page.evaluate(() => performance.timeOrigin);
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
      await page.waitForFunction(previous => performance.timeOrigin !== previous, originalDocument);
      await waitActor(page, 'B');
      await page.locator(carnet).getByText(/Carnet indisponible pour ce compte/).waitFor();
      await noHealthText(page, privateCanary, practicalText, otherCanary);
    }
    return {crossTabSessionClosed:true, history:restored ? 'trusted Chromium BFCache restore' : 'history navigation and synthetic persisted pageshow'};
  } finally { await context.close(); }
}

(async () => {
  await fs.mkdir(out, { recursive:true });
  const browser = await chromium.launch({ executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args:['--no-sandbox'], ignoreDefaultArgs:['--disable-back-forward-cache'] });
  try {
    const results = [];
    for (const width of [320, 390, 1440]) {
      results.push(await testWidth(browser, width));
      console.log('HEALTH_NATIVE_UI_PASS', width);
    }
    const session = await testCrossTabAndHistory(browser);
    console.log('HEALTH_NATIVE_SESSION_PASS', session.history);
    await fs.writeFile(path.join(out, 'health-native-ui.json'), JSON.stringify({
      source:'native runtime with fictional HTTP responses', results, session
    }, null, 2)+'\n');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

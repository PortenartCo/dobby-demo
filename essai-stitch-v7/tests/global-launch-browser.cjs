/* Browser recipe for the isolated launch bundle. Native forms supply every business write. */
'use strict';

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require('playwright');

const base = new URL(process.env.DOBBY_GLOBAL_LAUNCH_BASE || 'http://127.0.0.1:8767/');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) && base.protocol === 'http:' &&
  !base.username && !base.password && !base.search && !base.hash, 'The demo fixture must be served on loopback');
if (!base.pathname.endsWith('/')) base.pathname += '/';
const widths = (process.env.DOBBY_GLOBAL_LAUNCH_WIDTHS || '320,390,768,1440').split(',').map(Number);
assert.ok(widths.every(width => Number.isSafeInteger(width) && width > 0));
const evidence = process.env.DOBBY_GLOBAL_LAUNCH_EVIDENCE;
const personas = ['A', 'B', 'C', 'D'];
const panel = '#dobby-global-panel';
const app = (file, hash = '') => new URL('essai-stitch-v7/' + file + hash, base).href;

const snapshot = page => page.evaluate(() => DobbyFamilyStitchEngine.read().state);
const fixture = (page, method, ...args) => page.evaluate(({ method, args }) => DobbyGlobalDemo[method](...args), { method, args });

async function ready(page, persona) {
  await page.waitForFunction(async persona => {
    if (!window.DobbyStitchV7?.ready || !window.DobbyGlobalDemo?.ready || (persona && DobbyGlobalDemo.client !== persona)) return false;
    await DobbyGlobalDemo.ready;
    return !document.documentElement.classList.contains('dv7-loading') && !document.body.classList.contains('dv7-loading');
  }, persona);
}

async function actor(page) {
  const result = await page.waitForFunction(() => {
    const native = window.DobbyFamilyStitchEngine?.win()?.DobbyFamilyUI;
    if (!native?.getContext || !native.access?.state || !window.DobbyStitchV7) return false;
    return { client: DobbyGlobalDemo.client, context: native.getContext(), access: native.access?.state(),
      child: DobbyStitchV7.childAccess() };
  });
  return result.jsonValue();
}

async function active(page) {
  await page.waitForFunction(() => {
    const native = window.DobbyFamilyStitchEngine?.win()?.DobbyFamilyUI;
    return native?.access?.state()?.phase === 'active' && native.getContext()?.identityVerified === true;
  });
}

async function open(page, file, hash, persona, view) {
  await page.goto(app(file, hash));
  await ready(page, persona);
  if (view) await page.waitForFunction(view => document.body.dataset.familyView === view ||
    document.body.dataset.cuisineView === view, view);
}

async function openPanel(page) {
  const dialog = page.locator(panel);
  if (!await dialog.isVisible()) await page.locator('[data-global-panel]').click();
  await dialog.waitFor();
  return dialog;
}

async function personaPage(context, persona) {
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(base.href);
  await ready(page);
  await page.locator('[data-review-banner]').getByText(/DOBBY V7.*Démonstration/i).waitFor();
  const dialog = await openPanel(page);
  for (const code of personas) await dialog.locator(`[data-global-select-client="${code}"]`).waitFor();
  const selection = dialog.locator(`[data-global-select-client="${persona}"]`);
  if (await selection.getAttribute('aria-current') !== 'true') {
    await Promise.all([page.waitForURL(url => url.searchParams.get('client') === persona), selection.click()]);
  }
  await ready(page, persona);
  if (await dialog.isVisible()) await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
  return page;
}

async function capture(page, width, name, report) {
  await page.bringToFront();
  await ready(page);
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
  const geometry = await page.evaluate(() => {
    const banner = document.querySelector('[data-review-banner]')?.getBoundingClientRect();
    const header = document.querySelector('body > header[data-e01-chrome]:not([hidden])')?.getBoundingClientRect();
    const dock = document.querySelector('body > nav[data-e01-chrome]:not([hidden])')?.getBoundingClientRect();
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, bannerBottom: banner?.bottom,
      headerTop: header?.top, headerWidth: header?.width, dockBottom: dock?.bottom };
  });
  report.geometry.push({ name, ...geometry });
  assert.equal(geometry.width, width, name);
  assert.equal(geometry.scrollWidth, width, `${name}: no horizontal overflow`);
  if (geometry.headerWidth > 0 && geometry.bannerBottom) {
    assert.ok(geometry.headerTop >= geometry.bannerBottom - 1, `${name}: demo banner keeps the app header clear`);
  }
  if (geometry.dockBottom) assert.ok(geometry.dockBottom <= 901, `${name}: dock fits the viewport`);
  const file = `${width}-${name}.png`;
  if (evidence) await page.screenshot({ path: join(evidence, file), animations: 'disabled', timeout: 30000 });
}

async function verifyPersonas(context, width, report, data) {
  const pages = {};
  const people = [];
  for (const profile of data.profiles) {
    const { code, role } = profile;
    const page = pages[code] = await personaPage(context, code);
    await open(page, 'traverse.html', '', code);
    await active(page);
    const identity = await actor(page);
    assert.equal(identity.client, code);
    assert.equal(identity.access.phase, 'active');
    assert.equal(identity.access.profile.memberCategory, role);
    assert.equal(identity.access.verified, true);
    assert.equal(identity.context.identityVerified, true);
    assert.equal(identity.context.memberId, identity.access.memberId);
    assert.equal(identity.child.restricted, role === 'child');
    assert.equal(identity.context.memberId, profile.memberId);
    assert.equal(identity.context.userId, profile.userId);
    assert.equal(identity.context.householdId, data.household.id);
    await page.locator('[data-review-banner]').getByText(profile.name, { exact: false }).waitFor();
    people.push({ code, role, name: profile.name });
    assert.deepEqual(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(row => row.scope)), []);
    await capture(page, width, `persona-${code}`, report);
    await page.reload();
    await ready(page, code);
    await active(page);
    assert.equal((await actor(page)).context.memberId, identity.context.memberId);
  }
  report.personas = people;
  return pages;
}

async function useOfflineControl(page, offline) {
  const dialog = await openPanel(page);
  const toggle = dialog.locator('[data-global-offline]');
  if (await toggle.getAttribute('aria-pressed') !== String(offline)) await toggle.click();
  await dialog.locator(`[data-global-offline][aria-pressed="${offline}"]`).waitFor();
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
}

async function waitForMemoDelivery(page, id) {
  await page.waitForFunction(async id => {
    const family = (await DobbyGlobalDemo.state()).modules?.family;
    return family?.payload?.sharedFamilyNotes?.some(row => row.id === id);
  }, id, { polling: 250 });
  for (let attempt = 0; attempt < 4; attempt++) {
    await fixture(page, 'sync');
    try {
      await page.waitForFunction(id => DobbyFamilyStitchEngine.read().state.sharedFamilyNotes?.some(row => row.id === id),
        id, { polling: 250, timeout: 3500 });
      await page.evaluate(() => DobbyFamilyStitch.refresh());
      return;
    } catch (error) {
      if (error.name !== 'TimeoutError') throw error;
    }
  }
  const diagnostic = await page.evaluate(async id => {
    const api = DobbyFamilyStitchEngine.win().DobbyFamilyUI;
    const family = (await DobbyGlobalDemo.state()).modules?.family;
    return { status: api.getModuleStatus('family'), identityRevision: api.access.state().familyRevision,
      fixtureRevision: family?.revision, presentInFixture: family?.payload?.sharedFamilyNotes?.some(row => row.id === id),
      presentInNativeState: DobbyFamilyStitchEngine.read().state.sharedFamilyNotes?.some(row => row.id === id) };
  }, id);
  assert.fail(`Parent B did not receive the memo through native synchronization: ${JSON.stringify(diagnostic)}`);
}

async function verifySharedMemo(pages, width, report) {
  const title = `DÉMO — Mémo de la recette ${width}`;
  await open(pages.A, 'famille.html', '#memos', 'A', 'memos');
  await useOfflineControl(pages.A, true);
  await pages.A.getByRole('button', { name: 'Ajouter un mémo', exact: true }).click();
  await pages.A.locator('#memo-title').fill(title);
  await pages.A.locator('#memo-body').fill('Texte fictif saisi dans le formulaire natif.');
  await pages.A.locator('[data-fa-action="rg-save"]').first().click();
  await pages.A.waitForFunction(() => document.body.dataset.familyView === 'memos');
  const saved = (await snapshot(pages.A)).sharedFamilyNotes.find(row => row.title === title);
  assert.ok(saved?.id, 'The native form persists a pending memo offline');
  await pages.A.reload();
  await ready(pages.A, 'A');
  await open(pages.B, 'famille.html', '#memos', 'B', 'memos');
  await active(pages.B);
  await fixture(pages.B, 'sync');
  assert.equal(await pages.B.getByRole('button', { name: 'Consulter ' + title, exact: true }).count(), 0);
  const beforeReconnect = await fixture(pages.B, 'state');
  assert.ok(!beforeReconnect.modules.family.payload.sharedFamilyNotes.some(row => row.id === saved.id));
  await useOfflineControl(pages.A, false);
  await open(pages.A, 'famille.html', '#memos', 'A', 'memos');
  await active(pages.A);
  await fixture(pages.A, 'sync');
  await pages.A.waitForFunction(async id => {
    const shared = (await DobbyGlobalDemo.state()).modules?.family?.payload?.sharedFamilyNotes;
    return shared?.some(row => row.id === id);
  }, saved.id, { polling: 250 });
  await waitForMemoDelivery(pages.B, saved.id);
  await pages.A.getByRole('button', { name: 'Consulter ' + title, exact: true }).waitFor();
  await pages.B.getByRole('button', { name: 'Consulter ' + title, exact: true }).waitFor();
  assert.ok((await snapshot(pages.B)).sharedFamilyNotes.some(row => row.id === saved.id));
  await capture(pages.B, width, 'memo-partage', report);
  return title;
}

async function verifyPermissions(pages, memoTitle, width, report, data) {
  for (const code of ['C', 'D']) {
    const child = pages[code];
    const profile = data.profiles.find(item => item.code === code);
    const own = data.missions.find(mission => mission.assigneeId === profile.memberId);
    const sibling = data.missions.find(mission => mission !== own);
    for (const route of ['chat', 'documents', 'contracts', 'memos', 'settings', 'medical-edit', 'mission-edit']) {
      await open(child, 'famille.html', '#' + route, code);
      await child.waitForFunction(() => !!document.body.dataset.familyView);
      assert.notEqual(await child.locator('body').getAttribute('data-family-view'), route, `${code}: ${route} stays restricted`);
      assert.equal(await child.getByText(memoTitle, { exact: true }).count(), 0);
    }
    await open(child, 'index.html', '#shop', code, 'shop');
    assert.equal(await child.locator('[data-cu-action="e072-add"], [data-cu-action="e072-finish"]').count(), 0);
    const exposed = await fixture(child, 'state');
    for (const key of ['modules', 'grocery', 'operations', 'requests']) assert.equal(Object.hasOwn(exposed, key), false);
    await open(child, 'missions.html', '', code);
    await child.locator(`[data-e03-card="${own.id}"]`).waitFor();
    assert.equal(await child.locator(`[data-e03-card="${sibling.id}"]`).count(), 0);
    assert.equal(await child.locator('#btn-nouvelle-mission').count(), 0);
    assert.equal((await actor(child)).child.active, true);
    await capture(child, width, `missions-${code}`, report);
    await open(child, 'famille.html', '#member-detail?person=' + sibling.assigneeId, code, 'member-detail');
    await child.locator(`[data-profile-member="${profile.memberId}"]`).waitFor();
    assert.equal(await child.locator(`[data-profile-member="${sibling.assigneeId}"]`).count(), 0);
    assert.equal(await child.getByRole('button', { name: 'Choisir ma Maison', exact: true }).isEnabled(), true);
    assert.equal(await child.getByRole('button', { name: 'Choisir mon Patronus', exact: true }).isEnabled(), true);
    const dialog = await openPanel(child);
    assert.equal(await dialog.locator('[data-global-suspend]:visible').count(), 0);
    await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
  }
}

async function verifyHealth(pages, width, report, data) {
  assert.equal(data.health.activation, 'unavailable');
  const example = data.health.examples[0];
  for (const code of personas) {
    const { role, memberId } = data.profiles.find(profile => profile.code === code);
    const page = pages[code];
    const dialog = await openPanel(page);
    await dialog.getByText(/Données synthétiques.*Santé essentiel reste désactivé/i).waitFor();
    const examples = dialog.locator('[data-global-health-example]');
    if (role === 'parent' || memberId === example.memberId) {
      await examples.filter({ hasText: example.title }).waitFor();
      assert.equal(await examples.filter({ hasText: example.note }).count(), 1);
      assert.equal(await examples.locator('button, input, select, textarea, [contenteditable]').count(), 0);
      if (code === 'C') await capture(page, width, 'sante-exemple-lecture', report);
    } else {
      assert.equal(await examples.count(), 0);
    }
    await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
    assert.equal(await page.evaluate(() => DobbyPublicConfig.healthEssentialAvailable), false);
  }
  await open(pages.A, 'famille.html', '#health', 'A', 'health');
  await pages.A.locator('[data-health-carnet]').getByText(/indisponible/i).waitFor();
  assert.equal(await pages.A.getByText(example.title, { exact: true }).count(), 0);
}

async function verifyRunes(pages, width, report, data) {
  const goal = data.goal;
  const childProfile = data.profiles.find(profile => profile.memberId === goal.memberId);
  const mission = data.missions.find(item => item.assigneeId === goal.memberId);
  const child = pages[childProfile.code];
  await open(child, 'missions.html', '', childProfile.code);
  await child.locator(`[data-dv7-complete="${mission.id}"]`).click();
  const completion = child.getByRole('dialog', { name: 'Confirmer ma réalisation' });
  await completion.getByRole('button', { name: 'Confirmer la mission', exact: true }).click();
  await completion.waitFor({ state: 'detached' });
  let payload = (await fixture(pages.A, 'state')).modules.missions.payload;
  const credits = payload.runeCredits.filter(row => row.missionId === mission.id && (!row.kind || row.kind === 'grant'));
  assert.equal(credits.length, 1);
  assert.deepEqual(credits[0].allocations, [{ memberId: goal.memberId, amount: goal.threshold }]);
  assert.equal(payload.runeGoals[goal.memberId].unlocked, true);

  const profileURL = '#personal?person=' + encodeURIComponent(goal.memberId);
  await open(child, 'famille.html', profileURL, childProfile.code, 'personal');
  await child.locator('[data-rune-profile]').getByText(/En attente de confirmation parentale/i).waitFor();
  assert.equal(await child.getByRole('button', { name: 'Confirmer la récompense', exact: true }).count(), 0);
  await capture(child, width, 'runes-palier-enfant', report);
  await open(pages.B, 'famille.html', profileURL, 'B', 'personal');
  await active(pages.B);
  await fixture(pages.B, 'sync');
  await pages.B.waitForFunction(memberId => DobbyFamilyStitchEngine.win()?.DobbySharedRunesV3?.readProgress()?.goals?.[memberId]?.unlocked === true,
    goal.memberId);
  await pages.B.evaluate(() => DobbyFamilyStitch.refresh());
  await pages.B.getByRole('button', { name: 'Confirmer la récompense', exact: true }).click();
  const reward = pages.B.getByRole('dialog', { name: 'Confirmer la récompense', exact: true });
  await reward.getByRole('button', { name: 'Confirmer', exact: true }).click();
  await reward.waitFor({ state: 'detached' });
  payload = (await fixture(pages.A, 'state')).modules.missions.payload;
  assert.ok(payload.runeRewards.some(row => row.memberId === goal.memberId && row.title === goal.title));
  await child.reload();
  await ready(child, childProfile.code);
  await child.getByText(/Récompenses accordées/i).waitFor();
  await child.locator('[data-rune-profile]').getByText(goal.title, { exact: false }).waitFor();
}

async function verifyMagic(pages, width, report, data) {
  const own = data.profiles.find(profile => profile.code === 'C');
  const sibling = data.profiles.find(profile => profile.code === 'D');
  const child = pages.C;
  await open(child, 'famille.html', '#personal?person=' + encodeURIComponent(own.memberId), 'C', 'personal');
  await active(child);
  const values = { magicHouseId: 'slytherin', magicPatronusId: 'cat' };
  const update = (page, memberId) => page.evaluate(({ memberId, values }) => {
    const access = DobbyFamilyStitchEngine.win().DobbyFamilyUI.access;
    return access.updateMagic({ memberId, expectedRevision: access.state().familyRevision, values });
  }, { memberId, values });
  await active(pages.D);
  await assert.rejects(update(pages.D, own.memberId), /non autorisée/i);
  await update(child, own.memberId);
  const parent = await fixture(pages.A, 'state');
  const members = parent.modules.family.payload.familyMembers;
  assert.equal(members.find(row => row.id === own.memberId).magicProfile.houseId, values.magicHouseId);
  assert.equal(members.find(row => row.id === own.memberId).magicProfile.patronusId, values.magicPatronusId);
  assert.equal(members.find(row => row.id === sibling.memberId).magicProfile.houseId, sibling.houseId);
  assert.equal(members.find(row => row.id === sibling.memberId).magicProfile.patronusId, sibling.patronusId);
  await child.reload();
  await ready(child, 'C');
  await active(child);
  const profile = (await actor(child)).access.profile.magicProfile;
  assert.equal(profile.houseId, values.magicHouseId);
  assert.equal(profile.patronusId, values.magicPatronusId);
  await child.locator(`[data-magic-theme="${values.magicHouseId}"]`).waitFor();
  await capture(child, width, 'maison-patronus', report);
}

async function verifySession(pages) {
  let dialog = await openPanel(pages.B);
  await dialog.locator('[data-global-session]').click();
  await pages.B.locator('[data-review-banner]').getByText(/Session fermée/i).waitFor();
  assert.equal((await actor(pages.A)).access.phase, 'active');
  await pages.B.reload();
  await ready(pages.B, 'B');
  await pages.B.locator('[data-review-banner]').getByText(/Session fermée/i).waitFor();
  await pages.B.waitForFunction(() => window.DobbyFamilyStitchEngine?.win()?.DobbyFamilyUI?.access?.state()?.phase === 'signed-out');
  const closed = await actor(pages.B);
  assert.equal(closed.access.verified, false);
  assert.notEqual(closed.access.authenticated, true);
  assert.notEqual(closed.context?.identityVerified, true);
  dialog = await openPanel(pages.B);
  assert.equal(await dialog.locator('[data-global-health-example]').count(), 0);
  await dialog.locator('[data-global-session]').click();
  await active(pages.B);
  assert.equal((await actor(pages.B)).context.identityVerified, true);
}

async function verifySuspension(pages, width, report) {
  const parent = pages.A;
  for (const code of ['C', 'D']) {
    const child = pages[code];
    const otherChild = pages[code === 'C' ? 'D' : 'C'];
    let dialog = await openPanel(parent);
    await dialog.locator(`[data-global-suspend="${code}"]`).click();
    await child.waitForFunction(() => window.DobbyStitchV7?.childAccess().active === false);
    await child.locator('[data-review-banner]').getByText(/Profil suspendu/i).waitFor();
    await child.reload();
    await ready(child, code);
    assert.equal((await actor(child)).child.active, false);
    assert.equal((await actor(otherChild)).child.active, true);
    const childPanel = await openPanel(child);
    assert.equal(await childPanel.locator('[data-global-health-example]').count(), 0);
    await childPanel.getByRole('button', { name: 'Fermer', exact: true }).click();
    await capture(child, width, `suspendu-${code}`, report);
    dialog = await openPanel(parent);
    await dialog.locator(`[data-global-suspend="${code}"]`).click();
    await child.waitForFunction(() => window.DobbyStitchV7?.childAccess().active === true);
    assert.equal((await actor(child)).access.phase, 'active');
  }
}

async function verifyModules(page, width, report) {
  for (const [file, hash, view, label] of [
    ['traverse.html', '', null, 'accueil'],
    ['missions.html', '', null, 'missions'],
    ['index.html', '#taverne', 'taverne', 'repas'],
    ['index.html', '#shop', 'shop', 'courses'],
    ['famille.html', '#salon', 'salon', 'famille'],
    ['famille.html', '#menu', 'menu', 'menu'],
  ]) {
    await open(page, file, hash, 'A', view);
    await page.locator('body > main').waitFor();
    await capture(page, width, label, report);
  }
  const optional = ['agenda', 'contacts', 'memos', 'house', 'documents', 'contracts'];
  for (const route of optional) {
    const handles = await page.evaluate(route => window.DobbyFamilyStitch.handles(route), route);
    if (handles) {
      await open(page, 'famille.html', '#' + route, 'A', route);
      await capture(page, width, route, report);
    }
    report.modules.push({ route, available: handles });
  }
}

async function verifyRecipes(page, width, report, data) {
  await open(page, 'index.html', '#recipes', 'A', 'recipes');
  const state = await page.evaluate(() => ({ recipes: DobbyCuisineEngine.read().recipes.map(row => ({
    id: row.id, catalogue: Boolean(row.catalogue), steps: row.steps?.length || 0,
  })), custom: DobbyCuisineEngine.read().state.customRecipes.map(row => row.id) }));
  assert.deepEqual(state.custom.sort(), [...data.inherited.recipeIds].sort());
  assert.equal(state.recipes.some(recipe => recipe.catalogue), false, 'Full catalogue is outside this launch bundle');
  for (const id of data.inherited.recipeIds) {
    const card = page.locator(`[data-cu-recipe="${id}"]`);
    await card.waitFor();
    assert.ok(state.recipes.find(recipe => recipe.id === id)?.steps > 0);
  }
  await capture(page, width, 'recettes-pilotes', report);
  const first = page.locator(`[data-cu-recipe="${data.inherited.recipeIds[0]}"]`);
  await first.locator('[data-cu-action="recipe"]').click();
  await page.waitForFunction(() => DobbyCuisine.view === 'recipe');
}

async function loadScenario() {
  const response = await fetch(new URL('review-manifest.json', base), { redirect: 'error' });
  assert.equal(response.status, 200);
  const manifest = await response.json();
  assert.equal(manifest.scenario, 'launch');
  assert.equal(manifest.realBackend, false);
  assert.equal(manifest.syntheticDataManifest.path, 'demo-data-manifest.json');
  const syntheticData = await fetch(new URL(manifest.syntheticDataManifest.path, base), { redirect: 'error' });
  assert.equal(syntheticData.status, 200);
  const body = await syntheticData.text();
  assert.equal(createHash('sha256').update(body).digest('hex'), manifest.syntheticDataManifest.sha256);
  const data = JSON.parse(body);
  assert.deepEqual(data.profiles.map(profile => [profile.code, profile.role]), personas.map((code, index) => [code, index < 2 ? 'parent' : 'child']));
  for (const key of ['userId', 'memberId', 'name']) assert.equal(new Set(data.profiles.map(profile => profile[key])).size, 4);
  return data;
}

async function run(browser, width, data) {
  const report = { width, status: 'RUNNING', checks: [], geometry: [], modules: [], network: [], errors: [] };
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'fr-BE', reducedMotion: 'reduce' });
  const step = async (name, execute) => {
    report.current = name;
    console.log('GLOBAL_LAUNCH_CHECK', width, name);
    const result = await execute();
    report.checks.push(name);
    return result;
  };
  try {
    await context.route('**/*', route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === base.origin && url.pathname.startsWith(base.pathname) && ['GET', 'HEAD'].includes(request.method()) &&
        !/\/(?:auth|rest|storage|functions)\/v1\//.test(url.pathname)) {
        return route.continue();
      }
      report.network.push({ method: request.method(), origin: url.origin, path: url.pathname });
      return route.abort();
    });
    context.on('page', page => {
      page.on('dialog', dialog => dialog.accept());
      page.on('pageerror', error => report.errors.push({ page: page.url(), phase: report.current,
        message: error.message, stack: error.stack }));
      page.on('response', response => {
        if (response.status() >= 400 && !new URL(response.url()).pathname.endsWith('/favicon.ico')) {
          report.errors.push(`HTTP ${response.status()} ${new URL(response.url()).pathname}`);
        }
      });
    });
    const pages = await step('four named personas, verified native scopes and reload', () => verifyPersonas(context, width, report, data));
    await step('native modules and responsive shell', () => verifyModules(pages.A, width, report));
    await step('pilot recipes through the native Grimoire', () => verifyRecipes(pages.A, width, report, data));
    await step('synthetic health examples remain read-only and scoped', () => verifyHealth(pages, width, report, data));
    const memo = await step('native offline edit survives reload and reaches Parent B on reconnect', () => verifySharedMemo(pages, width, report));
    await step('own child missions and restricted adult routes', () => verifyPermissions(pages, memo, width, report, data));
    if (width === 390) {
      await step('child mission unlocks the Rune reward confirmed by Parent B', () => verifyRunes(pages, width, report, data));
      await step('in-scope native House and Patronus choices persist across reload', () => verifyMagic(pages, width, report, data));
    }
    await step('one parent session closes and resumes without impacting the other', () => verifySession(pages));
    await step('parent suspends and restores either child independently', () => verifySuspension(pages, width, report));
    assert.deepEqual(report.network, [], 'All browser traffic stays within the loopback bundle and is read-only HTTP');
    assert.deepEqual(report.errors, [], 'No uncaught browser errors or missing resources');
    report.status = 'PASS';
    console.log('GLOBAL_LAUNCH_BROWSER_PASS', width);
  } catch (error) {
    report.status = 'FAIL';
    report.failure = error.message;
    if (evidence && context.pages().length) await context.pages().at(-1).screenshot({
      path: join(evidence, `${width}-echec.png`), fullPage: true, timeout: 8000,
    }).catch(() => {});
    throw error;
  } finally {
    await context.close();
    if (evidence) await writeFile(join(evidence, `${width}-resultat.json`), JSON.stringify(report, null, 2) + '\n');
  }
}

(async () => {
  if (evidence) await mkdir(evidence, { recursive: true });
  const data = await loadScenario();
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: [
    '--no-sandbox', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1, EXCLUDE [::1]',
  ] });
  try {
    for (const width of widths) await run(browser, width, data);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

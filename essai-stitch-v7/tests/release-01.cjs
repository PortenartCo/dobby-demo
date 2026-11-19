/* Real published entry and native writers, with isolated synthetic HTTP responses. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { canonicalGroceryFixture } = require('./helpers/canonical-grocery-fixture.cjs');

const origin = process.env.DOBBY_TEST_ORIGIN || 'http://127.0.0.1:8899';
assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
const household = '00000000-0000-4000-8000-000000000010';
const other = '00000000-0000-4000-8000-000000000020';
const users = {
  A: '00000000-0000-4000-8000-000000000001',
  B: '00000000-0000-4000-8000-000000000002',
  C: '00000000-0000-4000-8000-000000000003'
};
const family = canonicalGroceryFixture(household, { A: users.A, B: users.B });
const foreign = canonicalGroceryFixture(other, { C: users.C });
const fixture = label => label === 'C' ? foreign : family;
const email = label => label.toLowerCase() + '@release.example.invalid';
const missionTitle = 'TEST RELEASE — Mission familiale';
const timestamp = '2026-11-19T10:00:00Z';
const calls = [];
const receipts = new Map();
let missions = null;
let dropCompletionReceipt = false;

async function attach(context) {
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (url.origin === origin) return route.continue();
    if (!/^\/(auth|rest)\/v1\//.test(url.pathname)) return route.abort();

    const reply = (body, status = 200) => route.fulfill({ status, json: body });
    const path = url.pathname.split('/').at(-1);
    const body = request.postDataJSON();
    const label = (request.headers().authorization || '').match(/^Bearer release-([ABC])$/)?.[1];
    calls.push({ path, method, label });
    if (path === 'token') {
      const actor = Object.keys(users).find(key => email(key) === body?.email || 'refresh-' + key === body?.refresh_token);
      if (!actor) return reply({ code: 'invalid_credentials' }, 400);
      return reply({ access_token: 'release-' + actor, refresh_token: 'refresh-' + actor, expires_in: 3600, user: { id: users[actor], email: email(actor) } });
    }
    if (!label) return reply({ code: '42501' }, 403);
    const canonical = fixture(label).context(label);
    if (path === 'user') return reply({ id: users[label], email: email(label) });
    if (path === 'logout') return reply({});
    if (path === 'dobby_v2_memberships') return reply([{ household_id: canonical.householdId, active: true, user_id: users[label], role: 'owner' }]);
    if (path === 'dobby_v2_households') {
      return reply([{ id: canonical.householdId }]);
    }
    if (path === 'dobby_v7_context') return reply(canonical);
    if (path === 'dobby_v2_grocery') return reply([]);
    if (path === 'dobby_missions_v2_capabilities') {
      assert.equal(url.searchParams.get('p_household_id'), canonical.householdId);
      return reply({ protocol: 2, directWritesBlocked: true, maxPayloadBytes: 262144 });
    }
    if (path === 'dobby_v2_modules') {
      assert.equal(method, 'GET', 'Pilot must use the existing Missions RPC');
      const target = url.searchParams.get('household_id');
      if (target && target !== 'eq.' + canonical.householdId) return reply([]);
      const module = url.searchParams.get('module');
      if (module === 'eq.family') return reply([fixture(label).familyRow]);
      if (module === 'eq.missions') return reply(label !== 'C' && missions ? [missions] : []);
      return reply([{ module: 'family' }, ...(label !== 'C' && missions ? [{ module: 'missions' }] : [])]);
    }
    if (path === 'dobby_missions_v2_write') {
      const { p_household_id, p_expected_revision, p_operation_id, p_payload } = body;
      if (label === 'C' || p_household_id !== canonical.householdId) return reply({ code: '42501' }, 403);
      const prior = receipts.get(p_operation_id);
      if (prior) {
        assert.deepEqual(body, prior.body, 'Retry uses the exact operation, revision and payload');
        prior.replays++;
        return reply({ protocol: 2, operation: prior.operation, module: missions });
      }
      if (p_expected_revision !== (missions?.revision || 0)) return reply({ code: '40001' }, 500);
      const revision = p_expected_revision + 1;
      const old = missions?.payload.runeCredits || [];
      assert.deepEqual(p_payload.runeCredits, old);
      assert.ok(p_payload.runeRequests.every(row => !Object.hasOwn(row, 'allocations')), 'V3 allocations must stay closed');
      missions = {
        household_id: household, module: 'missions', revision, updated_at: timestamp,
        payload: {
          ...p_payload,
          runeCredits: [...old, ...p_payload.runeRequests.map(row => ({ ...row, revision }))],
          runeRequests: [], runeLedgerVersion: 2
        }
      };
      const operation = { id: p_operation_id, revision, digest: 'a'.repeat(64) };
      receipts.set(p_operation_id, { operation, body, replays: 0 });
      if (dropCompletionReceipt && p_payload.runeRequests.length) {
        dropCompletionReceipt = false;
        return route.abort();
      }
      return reply({ protocol: 2, operation, module: missions });
    }
    return reply({ code: 'PGRST205' }, 404);
  });
}

const native = (page, code) => page.evaluate(code => DobbyFamilyStitchEngine.evaluate(code), code);
const wait = (page, fn, arg) => page.waitForFunction(fn, arg);
async function signIn(page, label) {
  await page.getByRole('heading', { name: 'Entrer dans DOBBY', exact: true }).waitFor();
  await page.getByLabel('Adresse e-mail', { exact: true }).fill(email(label));
  await page.getByLabel('Mot de passe', { exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
}
async function assertBound(page, label) {
  await wait(page, expected => {
    const api = window.DobbyFamilyStitchEngine?.win()?.DobbyFamilyUI;
    const binding = api?.getContext();
    return api?.access.state().verified === true && binding?.identityVerified === true &&
      ['userId', 'memberId', 'householdId'].every(field => binding[field] === expected[field]);
  }, fixture(label).context(label));
}
async function openPage(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
  await attach(context);
  const page = await context.newPage();
  page.on('dialog', dialog => dialog.accept());
  page.setDefaultTimeout(18000);
  return page;
}
const sync = page => native(page, 'return DobbyFamilyUI.grocery.sync();');
async function activateMissions(page) {
  await sync(page);
  await wait(page, () => DobbyFamilyStitchEngine.win().DobbySharedRunesV2?.available());
  await page.evaluate(() => DobbyStitchV7.open('account'));
  await page.frameLocator('#dv7-engine').locator('[data-fm-action="activate"][data-module="missions"]').click();
  await wait(page, () => DobbyFamilyStitchEngine.win().DobbyFamilyUI.isModuleActive('missions'));
  await page.locator('#dv7-close').click();
}
async function until(check, message) {
  const deadline = Date.now() + 12000;
  while (!check() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
  assert.ok(check(), message);
}
const report = message => console.log('RELEASE_01_OK ' + message);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const A = await openPage(browser, 390);
    const B = await openPage(browser, 1440);
    await A.goto(origin + '/');
    await A.getByRole('button', { name: 'Continuer', exact: true }).click();
    for (const name of ['Inscription', 'Invitation']) {
      assert.equal(await A.getByRole('tab', { name, exact: true }).count(), 0, name + ' stays closed in the served candidate');
    }
    await A.goto(origin + '/essai-stitch-v7/famille.html#access-auth?mode=signup');
    await A.getByRole('button', { name: 'Se connecter', exact: true }).waitFor();
    await A.goto(origin + '/?invite=TEST-RELEASE-INVITATION');
    await A.getByRole('button', { name: 'Continuer', exact: true }).click();
    assert.ok(!A.url().includes('TEST-RELEASE-INVITATION'));
    await signIn(A, 'A');
    await assertBound(A, 'A');
    await B.goto(origin + '/');
    await B.getByRole('button', { name: 'Continuer', exact: true }).click();
    await signIn(B, 'B');
    await assertBound(B, 'B');
    report('A/B distinct verified members, same household, real root login and native binding');

    await A.goto(origin + '/essai-stitch-v7/famille.html#members');
    await A.getByRole('heading', { name: 'Membres de la Maisonnée' }).waitFor();
    assert.equal(await A.locator('#invite-member-btn').count(), 0);
    await assert.rejects(A.evaluate(() => DobbyAccess.invite()), /pilote/i);
    for (const target of ['access-create', 'access-join']) {
      await A.goto(origin + '/essai-stitch-v7/famille.html#' + target);
      await A.getByRole('heading', { name: 'Le foyer n’est pas encore accessible', exact: true }).waitFor();
    }
    assert.ok(!calls.some(({ path }) => /signup|invitation|create_household/.test(path)));
    report('No signup, household creation or invitation request from the pilot UI');

    await A.goto(origin + '/essai-stitch-v7/famille.html#salon');
    await assertBound(A, 'A');
    await activateMissions(A);
    await A.evaluate(() => DobbyFamilyStitch.open('mission-edit', { record: null }));
    await A.locator('#quest-title').fill(missionTitle);
    await A.getByRole('button', { name: 'Suivant', exact: true }).click();
    await A.getByRole('checkbox', { name: 'TEST — Parent A', exact: true }).check();
    await A.getByRole('button', { name: 'Suivant', exact: true }).click();
    await A.locator('[data-fa-action=rg-save]').click();
    await A.waitForURL(/missions\.html/);
    await wait(A, () => window.DobbyFamilyStitchEngine?.win()?.DobbySharedRunesV2?.available());
    await sync(A);
    await until(() => missions?.payload.manualMissions.some(row => row.title === missionTitle), 'Native V2 creation reaches the fixture');
    const task = missions.payload.manualMissions.find(row => row.title === missionTitle);

    await A.bringToFront();
    await wait(A, () => {
      const engine = DobbyFamilyStitchEngine.win();
      return engine.DobbySharedRunesV2?.available() && /à jour/.test(engine.DobbyFamilyUI.grocery.read().status);
    });
    await A.locator('[data-dv7-complete="' + task.id + '"]').click();
    const complete = A.getByRole('button', { name: 'Confirmer la mission', exact: true });
    await A.locator('.dv7-participant-dialog button[type="submit"]:enabled').waitFor();
    assert.equal(await native(A, 'return DobbySharedRunesV3.available();'), false);
    await complete.click();
    await A.getByRole('alert').filter({ hasText: 'Confirmez le responsable' }).waitFor();
    assert.equal(missions.payload.manualMissions[0].status, 'open');
    await A.getByRole('checkbox', { name: 'TEST — Parent A', exact: true }).check();
    dropCompletionReceipt = true;
    await complete.click();
    await A.locator('.dv7-participant-dialog').waitFor({ state: 'hidden' });
    await sync(A);
    await sync(A);
    assert.equal(missions.payload.manualMissions[0].status, 'done');
    assert.equal(missions.payload.runeCredits.length, 1, 'Only one server-confirmed credit after an ambiguous response');
    assert.ok([...receipts.values()].some(row => row.replays > 0));
    const grant = missions.payload.runeCredits[0];
    assert.equal(grant.memberId, family.profiles.A.id);

    await B.goto(origin + '/essai-stitch-v7/famille.html#salon');
    await assertBound(B, 'B');
    await activateMissions(B);
    await B.goto(origin + '/essai-stitch-v7/missions.html');
    await assertBound(B, 'B');
    await sync(B);
    await B.locator('[data-e03-status="done"]').click();
    await B.getByText(missionTitle, { exact: true }).waitFor();
    assert.equal(await native(B, 'return DobbyFamilyMissions.summary(' + JSON.stringify(grant.memberId) + ').total;'), grant.amount);
    report('Missions V2 single assignee, confirmed Runes, replay receipt and second client');

    await B.reload();
    await assertBound(B, 'B');
    await B.goto(origin + '/essai-stitch-v7/famille.html#salon');
    await assertBound(B, 'B');
    await B.evaluate(() => DobbyAccess.logout());
    await B.getByRole('button', { name: 'Continuer', exact: true }).click();
    await signIn(B, 'B');
    await assertBound(B, 'B');
    await B.evaluate(() => DobbyAccess.logout());
    await B.getByRole('button', { name: 'Continuer', exact: true }).click();
    await signIn(B, 'C');
    await B.getByRole('status').filter({ hasText: 'FOYER-LOCAL-AUTRE' }).waitFor();
    assert.notEqual(await native(B, 'return DobbyFamilyUI.getContext()?.identityVerified;'), true);
    assert.ok(!calls.some(({ path, label }) => path === 'dobby_v2_modules' && label === 'C'));
    report('Reload, logout, same-account relogin and foreign-household cache refusal');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

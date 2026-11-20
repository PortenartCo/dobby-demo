/* V7 and its native iframe against local GoTrue, PostgREST and PostgreSQL. */
'use strict';
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

function localOrigin(value) {
  const url = new URL(value);
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.protocol, 'http:');
  assert.equal(url.href, url.origin + '/');
  return url.origin;
}
const origin = localOrigin(process.env.DOBBY_TEST_ORIGIN || 'http://127.0.0.1:8765');
const auth = localOrigin(process.env.DOBBY_LOCAL_AUTH || 'http://127.0.0.1:8801');
const rest = localOrigin(process.env.DOBBY_LOCAL_REST || 'http://127.0.0.1:8803');
const mail = localOrigin(process.env.DOBBY_LOCAL_MAIL || 'http://127.0.0.1:8802');
const project = 'https://pqcdkrwljgvgagzwrcmg.supabase.co';
const familyPage = origin + '/essai-stitch-v7/famille.html';
const out = process.env.DOBBY_ONBOARDING_EVIDENCE;
const password = 'Fictional-parent-030!';
const resetPassword = 'Fictional-new-password-031!';
const attempt = randomUUID().slice(0, 8);
const heading = (page, name) => page.getByRole('heading', { name, exact: true }).waitFor();
const button = (page, name) => page.getByRole('button', { name, exact: true });
const field = (page, name) => page.getByLabel(name, { exact: true });
const pause = () => new Promise(resolve => setTimeout(resolve, 100));

async function browserAccount(browser, width) {
  const context = await browser.newContext({
    viewport: { width, height: 900 }, locale: 'fr-BE',
    hasTouch: width < 768, isMobile: width < 768, serviceWorkers: 'block'
  });
  const invitationWrites = [];
  let dropInvitationReceipt = false;
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === origin) {
      if (url.pathname === '/essai-stitch-v7/access-config.js') {
        return route.fulfill({ contentType: 'text/javascript',
          body: "window.DobbyPublicConfig={publicKey:'sb_publishable_dobby_local_fixture_only',healthEssentialAvailable:false};" });
      }
      return route.continue();
    }
    if (url.origin === auth && url.pathname === '/verify') return route.continue();
    if (url.origin !== project) return route.abort();
    const prefix = url.pathname.startsWith('/auth/v1/') ? '/auth/v1' : '/rest/v1';
    if (!url.pathname.startsWith(prefix + '/')) return route.abort();
    const target = localOrigin(prefix === '/auth/v1' ? auth : rest) + url.pathname.slice(prefix.length) + url.search;
    const headers = request.headers();
    const response = await fetch(target, {
      method: request.method(), redirect: 'error',
      headers: Object.fromEntries(Object.entries(headers).filter(([key]) => ['authorization', 'content-type', 'prefer'].includes(key))),
      body: request.postData() ?? undefined
    });
    const body = await response.text();
    if (url.pathname === '/rest/v1/rpc/dobby_v7_create_invitation' && response.ok) {
      invitationWrites.push({ id: request.postDataJSON().p_operation_id, replayed: JSON.parse(body).replayed });
      if (dropInvitationReceipt) {
        dropInvitationReceipt = false;
        return route.abort();
      }
    }
    if (process.env.DOBBY_ONBOARDING_DEBUG && !response.ok) {
      const { code, error_code: authCode } = JSON.parse(body);
      console.error(request.method(), url.pathname, response.status, code || authCode);
    }
    return route.fulfill({
      status: response.status,
      contentType: response.headers.get('content-type') || 'application/json',
      body
    });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return { context, page, errors, invitationWrites, loseInvitationReceipt: () => { dropInvitationReceipt = true; } };
}

async function mailLink(email, type) {
  for (let count = 0; count < 100; count++) {
    const list = await (await fetch(mail + '/api/v1/messages')).json();
    for (const message of list.messages.filter(item => item.To.some(to => to.Address === email))) {
      const full = await (await fetch(mail + '/api/v1/message/' + message.ID)).json();
      for (const href of full.HTML.matchAll(/href="([^"]+)"/g)) {
        const link = new URL(href[1].replaceAll('&amp;', '&'));
        if (link.origin === auth && link.pathname === '/verify' && link.searchParams.get('type') === type) return link.href;
      }
    }
    await pause();
  }
  throw Error('Expected confirmation or recovery email was not delivered to Mailpit.');
}

async function capture(page, width, step, mask = []) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(overflow <= 1, step + ' has ' + overflow + 'px horizontal overflow at ' + width);
  assert.equal(new URL(page.url()).search, '', 'Private links are stripped from the visible URL');
  if (out) await page.screenshot({ path: path.join(out, width + '-' + step + '.png'), fullPage: true, mask });
}

async function signup(page, email, width, invited = false) {
  if (invited) {
    await button(page, 'Créer mon compte pour rejoindre').click();
  } else {
    await page.goto(origin + '/');
    await button(page, 'Continuer').click();
    await page.getByRole('tab', { name: 'Inscription' }).click();
  }
  await field(page, 'Adresse e-mail').fill(email);
  await field(page, 'Mot de passe').fill(password);
  await field(page, 'Confirmer le mot de passe').fill(password);
  await button(page, 'Créer mon compte').click();
  await heading(page, 'Consultez votre messagerie');
  const login = await fetch(auth + '/token?grant_type=password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
  });
  assert.equal(login.status, 400);
  assert.equal((await login.json()).error_code, 'email_not_confirmed');
  await page.goto(await mailLink(email, 'signup'));
  await heading(page, 'Mon profil');
  await field(page, 'Prénom').fill(invited ? 'TEST Parent B' : 'TEST Parent A');
  await page.locator('[data-access-avatar="portrait-9"]').check();
  await capture(page, width, invited ? 'profil-invite' : 'profil');
  await button(page, 'Enregistrer mon profil').click();
}

async function verified(page) {
  const handle = await page.waitForFunction(() => {
    const api = window.DobbyFamilyStitchEngine?.win()?.DobbyFamilyUI || window.DobbyCuisineEngine?.win()?.DobbyFamilyUI;
    const access = api?.access.state();
    return access?.verified && api.getContext()?.identityVerified && access;
  });
  try { return await handle.jsonValue(); } finally { await handle.dispose(); }
}

async function token(page) {
  return page.evaluate(async () => (await DobbyFamilyStitchEngine.win().DobbyFamilyUI.meta('session')).access_token);
}

async function request(endpoint, { bearer, body, expected = 200 } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (bearer) headers.Authorization = 'Bearer ' + bearer;
  const response = await fetch(rest + '/' + endpoint, { method: body ? 'POST' : 'GET', headers, body: JSON.stringify(body) });
  assert.equal(response.status, expected, endpoint.split('?')[0] + ' response status');
  return response.json();
}

const rpc = (name, bearer, body, expected) => request('rpc/dobby_v7_' + name, { bearer, body, expected });
const inviteBody = () => ({ p_expires_in_hours: 24, p_operation_id: randomUUID() });
const acceptBody = token => ({ p_token: token, p_operation_id: randomUUID() });

async function createHousehold(page, name) {
  await heading(page, 'Créer mon foyer');
  await field(page, 'Nom du foyer').fill(name);
  await button(page, 'Créer mon foyer').click();
  await page.waitForURL('**/traverse.html');
  await page.goto(familyPage + '#members');
  await heading(page, 'Membres de la Maisonnée');
  return verified(page);
}

async function logout(page) {
  await page.evaluate(() => DobbyAccess.logout());
  await heading(page, 'Bienvenue dans DOBBY');
}

async function login(page, email, secret, refusal) {
  await button(page, 'Continuer').click();
  await field(page, 'Adresse e-mail').fill(email);
  await field(page, 'Mot de passe').fill(secret);
  await button(page, 'Se connecter').click();
  if (refusal) await page.getByRole('status').filter({ hasText: refusal }).waitFor();
  else await page.waitForURL('**/traverse.html');
}

async function scenario(browser, width) {
  const [A, B, C] = await Promise.all([browserAccount(browser, width), browserAccount(browser, width), browserAccount(browser, width)]);
  const a = A.page, b = B.page, c = C.page;
  const email = label => 'dobby-' + attempt + '-' + width + '-' + label + '@example.test';
  const householdName = 'TEST Foyer ' + width;
  try {
    await signup(a, email('a'), width);
    const owner = await createHousehold(a, householdName);
    const ownerToken = await token(a);
    const householdOperation = await a.evaluate(userId =>
      DobbyFamilyStitchEngine.win().DobbyFamilyUI.meta('v7-operation:' + userId + ':create-household'), owner.userId);
    const createdAgain = await rpc('create_household', ownerToken, { p_name: householdName, p_operation_id: householdOperation });
    assert.equal(createdAgain.replayed, true);
    assert.equal(createdAgain.householdId, owner.householdId);
    await capture(a, width, 'foyer');
    await a.locator('#invite-member-btn').click();
    A.loseInvitationReceipt();
    await button(a, 'Créer un lien d’invitation').click();
    await a.getByRole('dialog').getByRole('status').filter({ hasText: 'connexion est interrompue' }).waitFor();
    await a.reload();
    await verified(a);
    await a.locator('#invite-member-btn').click();
    await button(a, 'Créer un lien d’invitation').click();
    const output = field(a, 'Lien personnel d’invitation');
    await output.waitFor({ state: 'visible' });
    assert.equal(A.invitationWrites.length, 2);
    assert.equal(A.invitationWrites[0].id, A.invitationWrites[1].id, 'Retry after reload keeps the same operation');
    assert.equal(A.invitationWrites[1].replayed, true);
    const link = new URL(await output.inputValue());
    assert.equal(link.origin, origin);
    await a.getByRole('dialog').getByRole('button', { name: 'Fermer', exact: true }).click();

    const expireOperation = inviteBody();
    const expired = await rpc('create_invitation', ownerToken, expireOperation);
    const expiredReplay = await rpc('create_invitation', ownerToken, expireOperation);
    assert.equal(expiredReplay.replayed, true);
    assert.equal(expiredReplay.token === expired.token, true);
    const container = process.env.DOBBY_LOCAL_PG_CONTAINER || 'dobby-onboarding-db';
    assert.match(container, /^dobby-onboarding-[a-z0-9-]+$/);
    execFileSync('docker', ['exec', '-i', container, 'psql', '-Xq', '-v', 'ON_ERROR_STOP=1',
      '-U', 'postgres', '-d', 'dobby_onboarding', '-v', 'invitation=' + expired.invitationId], {
      input: "UPDATE dobby_v7_private.invitations SET expires_at = clock_timestamp() - interval '1 sec' WHERE id = :'invitation';"
    });
    const expiredLink = new URL(origin);
    expiredLink.searchParams.set('invite', expired.token);
    await b.goto(expiredLink.href);
    await b.locator('[data-invitation-state=expired]').waitFor();
    assert.equal(await button(b, 'Rejoindre ce foyer').count(), 0);
    await capture(b, width, 'invitation-expiree', [field(b, 'Code ou lien d’invitation')]);

    await b.goto(link.href);
    await heading(b, householdName);
    await capture(b, width, 'invitation', [field(b, 'Code ou lien d’invitation')]);
    const invitation = link.searchParams.get('invite');
    await rpc('accept_invitation', undefined, acceptBody(invitation), 401);
    await signup(b, email('b'), width, true);
    await heading(b, householdName);
    await button(b, 'Rejoindre ce foyer').click();
    await b.waitForURL('**/traverse.html');
    await b.goto(familyPage + '#members');
    await heading(b, 'Membres de la Maisonnée');
    const member = await verified(b);
    assert.equal(member.householdId, owner.householdId);
    assert.notEqual(member.memberId, owner.memberId);
    assert.notEqual(member.userId, owner.userId);
    const memberToken = await token(b);
    const replayBody = acceptBody(invitation);
    for (let i = 0; i < 2; i++) {
      assert.equal((await rpc('accept_invitation', memberToken, replayBody)).replayed, true);
    }
    assert.equal((await rpc('preview_invitation', undefined, { p_token: invitation })).status, 'invalid');
    assert.equal((await rpc('accept_invitation', memberToken, acceptBody(expired.token), 400)).code, '22023');
    const rows = await request('dobby_v2_modules?module=eq.family&household_id=eq.' + owner.householdId, { bearer: memberToken });
    assert.deepEqual(rows[0].payload.familyMembers.map(m => m.id).sort(), [owner.memberId, member.memberId].sort());
    assert.ok(rows[0].payload.familyMembers.every(m => m.memberCategory === 'parent'));
    await capture(b, width, 'deux-parents');

    await signup(c, email('c'), width);
    const outsider = await createHousehold(c, 'TEST Autre foyer ' + width);
    const outsiderToken = await token(c);
    const unused = await rpc('create_invitation', ownerToken, inviteBody());
    const foreignLink = new URL(origin);
    foreignLink.searchParams.set('invite', unused.token);
    await c.goto(foreignLink.href);
    await heading(c, householdName);
    await button(c, 'Rejoindre ce foyer').click();
    await c.getByRole('status').filter({ hasText: 'l’accès au foyer n’a pas été confirmé' }).waitFor();
    assert.equal((await rpc('accept_invitation', outsiderToken, acceptBody(unused.token), 403)).code, '42501');
    assert.equal((await rpc('preview_invitation', undefined, { p_token: unused.token })).status, 'valid');
    assert.deepEqual(await request('dobby_v2_modules?household_id=eq.' + owner.householdId, { bearer: outsiderToken }), []);
    assert.equal((await rpc('context', outsiderToken, {})).householdId, outsider.householdId);
    assert.equal((await rpc('accept_invitation', outsiderToken, acceptBody(invitation), 400)).code, '22023');

    await logout(b);
    await button(b, 'Continuer').click();
    await button(b, 'Mot de passe oublié').click();
    await field(b, 'Adresse e-mail').fill(email('b'));
    await button(b, 'Envoyer le lien de récupération').click();
    await heading(b, 'Consultez votre messagerie');
    await b.goto(await mailLink(email('b'), 'recovery'));
    await heading(b, 'Choisir un nouveau mot de passe');
    await capture(b, width, 'recuperation');
    await field(b, 'Nouveau mot de passe').fill(resetPassword);
    await field(b, 'Confirmer le mot de passe').fill(resetPassword);
    await button(b, 'Enregistrer mon mot de passe').click();
    await b.waitForURL('**/traverse.html');
    await b.goto(familyPage + '#members');
    assert.equal((await verified(b)).memberId, member.memberId);
    await logout(b);
    await login(b, email('b'), password, 'IDENTIFIANTS');
    await field(b, 'Mot de passe').fill(resetPassword);
    await button(b, 'Se connecter').click();
    await b.waitForURL('**/traverse.html');
    await b.goto(familyPage + '#members');
    assert.equal((await verified(b)).memberId, member.memberId);

    await logout(b);
    await login(b, email('a'), password);
    await b.goto(familyPage + '#members');
    assert.equal((await verified(b)).memberId, owner.memberId);
    const oldTab = await B.context.newPage();
    oldTab.setDefaultTimeout(15000);
    await oldTab.goto(familyPage + '#members');
    assert.equal((await verified(oldTab)).memberId, owner.memberId);
    await oldTab.locator('#invite-member-btn').click();
    await button(oldTab, 'Créer un lien d’invitation').waitFor();
    let staleWrites = 0;
    oldTab.on('request', request => {
      if (new URL(request.url()).pathname.endsWith('/dobby_v7_create_invitation')) staleWrites++;
    });
    await logout(b);
    await login(b, email('b'), resetPassword);
    await b.goto(familyPage + '#members');
    assert.equal((await verified(b)).memberId, member.memberId);
    await button(oldTab, 'Créer un lien d’invitation').click();
    await oldTab.getByRole('dialog').getByRole('status').filter({ hasText: 'session a changé dans un autre onglet' }).waitFor();
    assert.equal(staleWrites, 0);
    await oldTab.evaluate(() => DobbyAccess.logout(document.querySelector('dialog[open]')));
    await b.reload();
    assert.equal((await verified(b)).memberId, member.memberId);
    await oldTab.close();
    await logout(b);
    await login(b, email('c'), password, 'FOYER-LOCAL-AUTRE');
    assert.equal(await b.evaluate(() => DobbyFamilyStitchEngine.win().DobbyFamilyUI.access.state().verified), false);
    assert.deepEqual([...A.errors, ...B.errors, ...C.errors], []);
    console.log('FAMILY_ONBOARDING_PASS', width, 'PKCE signup, mail, profiles, household, invitation, expiry, replay, RLS, recovery, session replacement');
  } finally {
    await Promise.all([A.context.close(), B.context.close(), C.context.close()]);
  }
}

(async () => {
  if (out) await mkdir(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    console.log('CHROMIUM', browser.version());
    for (const width of (process.env.DOBBY_ONBOARDING_WIDTHS || '320,390,1440').split(',').map(Number)) {
      await scenario(browser, width);
    }
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

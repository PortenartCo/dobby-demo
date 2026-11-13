import test from 'node:test';
import assert from 'node:assert/strict';
import { destination, authReturnURL, canonicalAuthCallback } from '../access-flow.mjs';
import entry from '../access-entry.js';

const active = {
  phase: 'active', verified: true, userId: 'TEST-account',
  householdId: 'TEST-household', memberId: 'local-TEST-person', pendingCeremony: false
};

test('an existing bound account enters the fireplace, never a finished ceremony', () => {
  assert.equal(destination(active), 'ritual');
  assert.equal(destination({ ...active, pendingCeremony: true }), 'traverse');
});
test('an invitation keeps its confirmation even for an existing account', () => {
  assert.equal(destination(active, { invitationPending: true }), 'access-join');
  assert.equal(destination({ phase: 'household', authenticated: true, userId: 'TEST-account' }, { invitationPending: true }), 'access-join');
});
test('profile and household stages require the authenticated account', () => {
  assert.equal(destination({ phase: 'profile', authenticated: true, userId: 'TEST-account' }), 'access-profile');
  assert.equal(destination({ phase: 'household', authenticated: true, userId: 'TEST-account' }), 'access-create');
  assert.equal(destination({ phase: 'profile' }), 'access-welcome');
  assert.equal(destination({ phase: 'profile', userId: 'TEST-account' }), 'access-welcome');
});
test('unverified or incomplete bindings cannot unlock the family', () => {
  for (const missing of ['userId', 'householdId', 'memberId']) {
    assert.equal(destination({ ...active, [missing]: null }), 'access-unavailable');
  }
  assert.equal(destination({ ...active, verified: false }), 'access-unavailable');
  assert.equal(destination({ phase: 'rejected', userId: 'TEST-account' }), 'access-unavailable');
});
test('email confirmation never masquerades as an effective household', () => {
  assert.equal(destination({ phase: 'email-confirmation' }), 'access-confirmation');
  assert.equal(destination({ phase: 'signed-out' }), 'access-welcome');
});
test('invitation and callback credentials leave the visible URL immediately', () => {
  const incoming = entry.capture('https://example.test/dobby/?invite=TEST-OPAQUE&code=TEST-ONE-USE&type=recovery#access');
  assert.equal(incoming.invitation, 'TEST-OPAQUE');
  assert.equal(incoming.recovery, true);
  assert.match(incoming.callbackURL, /TEST-ONE-USE/);
  assert.equal(incoming.cleanURL, 'https://example.test/dobby/#access');
});
test('implicit callback tokens are private inputs, not routes or screenshot URLs', () => {
  const incoming = entry.capture('https://example.test/dobby/#access_token=TEST-ACCESS&refresh_token=TEST-REFRESH&type=recovery');
  assert.equal(incoming.cleanURL, 'https://example.test/dobby/#access');
  assert.equal(incoming.recovery, true);
  assert.ok(incoming.callbackURL);
});
test('ordinary deep links retain their native context and cannot redirect to another origin', () => {
  const incoming = entry.capture('https://example.test/dobby/famille.html?client=A#agenda?day=2026-11-12');
  assert.equal(incoming.cleanURL, 'https://example.test/dobby/famille.html?client=A#agenda?day=2026-11-12');
  assert.equal(incoming.callbackURL, null);
  assert.equal(incoming.invitation, null);
});
test('PKCE flow ids and provider errors do not stay in the public URL', () => {
  const incoming = entry.capture('https://example.test/dobby/?code=TEST&dobby_flow=TEST-FLOW&error_description=TEST-DETAIL#access');
  assert.equal(incoming.cleanURL, 'https://example.test/dobby/#access');
});
test('an error-only provider callback is sanitized and is not treated as a successful login', () => {
  for (const suffix of ['?error=access_denied&error_description=TEST-DETAIL#access', '#error=access_denied&error_description=TEST-DETAIL']) {
    const incoming = entry.capture('https://example.test/dobby/' + suffix);
    assert.equal(incoming.cleanURL, 'https://example.test/dobby/#access');
    assert.equal(incoming.providerError, true);
    assert.equal(incoming.callbackURL, null);
  }
});

test('all native Auth forms return to the exact public root',()=>{
 assert.equal(authReturnURL('https://portenartco.github.io/dobby-demo/essai-stitch-v7/famille.html#access-auth'),'https://portenartco.github.io/dobby-demo/');
 assert.equal(authReturnURL('http://127.0.0.1:8819/essai-stitch-v7/famille.html#access'),'http://127.0.0.1:8819/');
 assert.equal(canonicalAuthCallback('https://portenartco.github.io/dobby-demo/essai-stitch-v7/famille.html?code=TEST#access','https://portenartco.github.io/dobby-demo/essai-stitch-v7/famille.html'),'https://portenartco.github.io/dobby-demo/?code=TEST#access');
 assert.throws(()=>canonicalAuthCallback('https://untrusted.test/?code=TEST','https://portenartco.github.io/dobby-demo/essai-stitch-v7/famille.html'),/origine/i);
});

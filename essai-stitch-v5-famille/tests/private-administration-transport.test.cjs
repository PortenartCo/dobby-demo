'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const native = fs.readFileSync(path.join(__dirname, '../family-v2.js'), 'utf8');
const boundary = native.slice(native.indexOf('const PRIVATE_ADMIN_COMMANDS'), native.indexOf('const accessFacade='));
assert.match(boundary, /async function privateAdminCommand/);
assert.match(native, /admin:privateAdminCommand/);

function fixture({ enabled = true, child = false, review = false, userId = 'fictitious-owner', reject = false } = {}) {
  let current = { userId, epoch: 1 };
  let pending;
  const requests = [];
  let reply = () => ({ ok: true, result: { protocol: 1, items: [] } });
  const sandbox = {
    window: { DobbyReview: review },
    f: { membershipRejected: reject },
    publicConfiguration: () => ({ privateAdministrationAvailable: enabled }),
    childAccessState: () => ({ restricted: child }),
    requestActor: () => current,
    assertCurrentOnboardingSession: async expected => {
      if (expected !== current) throw Error('Session changée.');
    },
    token: async () => 'test-bearer',
    raw: async (...args) => { requests.push(args); return reply(); },
  };
  vm.runInNewContext(boundary + '\nwindow.command=privateAdminCommand;', sandbox);
  return {
    command: sandbox.window.command,
    requests,
    deny() { reply = () => { throw Object.assign(Error('message privé du serveur'), {status: 403}); }; },
    postpone() { reply = () => new Promise(resolve => { pending = resolve; }); },
    replace() { current = { userId: 'other-fixture-user', epoch: 2 }; },
    release() { pending({ok:true,result:{protocol:1,items:['résultat ancien']}}); },
  };
}

test('the native session sends only fixed commands to the owner Edge endpoint', async () => {
  const f = fixture();
  const value = await f.command('listAccess', {limit: 25});
  assert.equal(value.protocol, 1);
  assert.equal(f.requests.length, 1);
  const [endpoint, method, body, , bearer] = f.requests[0];
  assert.equal(endpoint, '/functions/v1/dobby-access-admin');
  assert.equal(method, 'POST');
  assert.equal(body.command, 'listAccess');
  assert.equal(body.payload.limit, 25);
  assert.equal(bearer, 'test-bearer');
  await assert.rejects(f.command('/rest/v1/auth/users'), /invalide/);
  assert.equal(f.requests.length, 1);
});

test('disabled, signed-out, child, rejected and demonstration sessions send no owner request', async () => {
  for (const state of [{enabled:false}, {userId:null}, {child:true}, {reject:true}, {review:true}]) {
    const f = fixture(state);
    await assert.rejects(f.command('listAccess'), error => error.status === 403);
    assert.deepEqual(f.requests, []);
  }
});

test('a denied decision has one attempt and exposes neither the server message nor its payload', async () => {
  const f = fixture();
  f.deny();
  await assert.rejects(f.command('setStatus', {status:'suspended'}), error =>
    error.status === 403 && error.message === 'L’administration n’a pas confirmé cette opération.');
  assert.equal(f.requests.length, 1);
});

test('a response from a replaced native session cannot reach the new owner view', async () => {
  const f = fixture();
  f.postpone();
  const operation = f.command('listAccess');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.requests.length, 1);
  f.replace();
  f.release();
  await assert.rejects(operation, /Session changée/);
});

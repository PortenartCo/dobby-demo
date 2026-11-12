import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash, webcrypto} from 'node:crypto';
import * as runes from '../family-runes-core.mjs';
import {makeBackend, makeClient, HH} from './helpers/modules-harness.mjs';

// All users, households, rows and RPCs in this suite are in-memory fixtures.
const nativeUrl = new URL('../family-modules.js', import.meta.url);
const source = fs.readFileSync(nativeUrl, 'utf8');
const implementation = source;
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const date = '2026-11-12T12:00:00.000Z';
const backupPrefix = 'v2-missions-legacy-backup:';
const capability = {protocol:2, directWritesBlocked:true, maxPayloadBytes:262144, ledgerVersions:[1, 2]};
const members = [{id:'fixture-member-a'}, {id:'fixture-member-b'}];
const mission = (id = 'fixture-local-mission', extra = {}) => ({
  id, title:'TEST — ' + id, category:'Famille', due:'', note:'', status:'open',
  assigneeId:members[0].id, effort:'light', rewardVersion:1, ...extra
});
const auto = (key, extra = {}) => ({key, title:'TEST — ' + key, state:'open', due:'2026-11-12', ...extra});
const legacyRow = extra => ({module:'missions', revision:2, payload:{manualMissions:[], runeCredits:[], ...extra}, updated_at:date});
const v2Payload = extra => ({autoTasks:[], manualMissions:[], runeCredits:[], runeRequests:[], runeLedgerVersion:2, ...extra});
const metadataKey = uid => 'v2-module-state:' + uid + '|' + HH;
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const digest = value => JSON.stringify(canonical(value));
const fields = value => ({autoTasks:clone(value.autoTasks || []), manualMissions:clone(value.manualMissions || [])});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {resolve = yes; reject = no;});
  return {promise, resolve, reject};
}

function backendFor(row = legacyRow()) {
  const backend = makeBackend(), original = backend.authorized, operations = new Map();
  backend.calls = [];
  backend.operations = operations;
  backend.capability = clone(capability);
  if (row) backend.rows.set('missions', clone(row));
  backend.authorized = async (user, method, path, body) => {
    backend.calls.push({user, method, path, ...(body === undefined ? {} : {body:clone(body)})});
    if (path.startsWith('rpc/dobby_missions_v2_capabilities')) {
      if (backend.capabilityError) throw backend.capabilityError;
      return clone(backend.capability);
    }
    if (path === 'rpc/dobby_missions_v2_write') {
      body = clone(body);
      assert.equal(method, 'POST');
      await backend.beforeWrite?.(clone(body), user);
      const existing = backend.rows.get('missions'), prior = operations.get(body.p_operation_id);
      const signature = JSON.stringify(body.p_payload);
      if (prior) {
        assert.equal(prior.user, user, 'an operation cannot change actor');
        assert.equal(prior.signature, signature, 'a replay must retain its exact payload');
        assert.equal(prior.expectedRevision, body.p_expected_revision, 'a replay must retain its CAS revision');
        return {protocol:2, replayed:true, operation:clone(prior.receipt), module:clone(existing)};
      }
      if (backend.reject) throw backend.reject;
      if (body.p_expected_revision !== (existing?.revision || 0)) {
        throw Object.assign(Error('TEST atomic CAS refusal'), {code:'40001', status:500});
      }
      assert.equal(body.p_payload.runeLedgerVersion, 2);
      assert.deepEqual(body.p_payload.runeCredits, existing?.payload.runeCredits || [], 'existing confirmed history cannot be imported or rewritten');
      const revision = body.p_expected_revision + 1;
      const known = new Set(body.p_payload.runeCredits.map(runes.eventKey));
      const accepted = runes.acceptRequests(body.p_payload.runeCredits, body.p_payload.runeRequests, revision);
      const confirmed = {...clone(body.p_payload), runeCredits:[...clone(body.p_payload.runeCredits), ...accepted.filter(credit => !known.has(runes.eventKey(credit)))], runeRequests:[], runeLedgerVersion:2};
      const next = {module:'missions', revision, payload:confirmed, updated_at:date};
      const receipt = {id:body.p_operation_id, revision, digest:createHash('sha256').update(signature).digest('hex')};
      backend.rows.set('missions', clone(next));
      operations.set(receipt.id, {user, signature, expectedRevision:body.p_expected_revision, receipt:clone(receipt)});
      if (backend.loseNextResponse) {
        backend.loseNextResponse = false;
        throw Error('TEST response lost after COMMIT');
      }
      const response = {protocol:2, replayed:false, operation:receipt, module:clone(next)};
      return backend.afterWrite ? backend.afterWrite(response, user) : response;
    }
    if ((method === 'PATCH' && path.includes('module=eq.missions')) ||
        (method === 'POST' && body?.module === 'missions') || method === 'DELETE') {
      assert.fail('Missions recovery must never use a direct table writer');
    }
    const result = await original(user, method, path, body);
    return backend.afterRead && method === 'GET' ? backend.afterRead(result, user, path) : result;
  };
  return backend;
}

function client(t, backend, options = {}) {
  const uid = options.uid || 'fixture-user-a';
  const controls = options.controls || {};
  const events = [], messages = [];
  let c;
  const api = {
    getContext:() => ({userId:uid, householdId:HH}),
    meta:async key => {
      await controls.beforeMeta?.(key);
      events.push({type:'get', key});
      const value = clone(c.metadata.get(key) ?? null);
      return controls.afterMeta ? controls.afterMeta(key, value) : value;
    },
    putMeta:async (key, value) => {
      const snapshot = clone(value);
      await controls.beforePutMeta?.(key, snapshot);
      c.metadata.set(key, snapshot);
      events.push({type:'put', key, value:snapshot});
    },
    showMessage:message => messages.push(message),
    ...options.api
  };
  c = makeClient(uid, backend, false, options.accept !== false, {
    crypto:webcrypto, implementation,
    metadata:options.metadata || [],
    state:{autoTasks:[], manualMissions:[mission()], familyMembers:members, runeCredits:[], runeRequests:[], ...options.state},
    window:{DobbyRunesPilot:Object.freeze({requireMissionsV2:true}), ...options.window},
    api
  });
  Object.assign(c, {uid, controls, events, messages});
  t.after(() => c.provider.reset());
  return c;
}

const stateOf = c => c.metadata.get(metadataKey(c.uid))?.missions;
const localOf = c => clone({autoTasks:c.st.autoTasks, manualMissions:c.st.manualMissions, runeCredits:c.st.runeCredits, runeRequests:c.st.runeRequests});
const writes = backend => backend.calls.filter(call => !['GET', 'HEAD'].includes(call.method));
const rpcWrites = backend => writes(backend).filter(call => call.path === 'rpc/dobby_missions_v2_write');
const backups = c => [...c.metadata.entries()].filter(([key]) => key.startsWith(backupPrefix));
const moduleState = (uid, row, extra = {}) => [[metadataKey(uid), {missions:{active:true, revision:row.revision, synced:JSON.stringify(row.payload), conflict:false, ...extra}}]];

function containsDeep(root, expected) {
  if (digest(root) === digest(expected)) return true;
  return Boolean(root && typeof root === 'object' && Object.values(root).some(value => containsDeep(value, expected)));
}

function assertBackup(c, before, remote, operation) {
  const records = backups(c);
  assert.ok(records.length >= 1, 'an IndexedDB backup must exist before a preview or write');
  const linked = stateOf(c)?.legacyBackupId;
  assert.ok(linked, 'Missions metadata must identify its durable backup');
  const record = records.find(([key]) => key === linked || key === backupPrefix + linked);
  assert.ok(record, 'legacyBackupId must resolve to the backup record');
  const serialized = JSON.stringify(record[1]);
  assert.ok(containsDeep(record[1], before.autoTasks), 'backup retains exact local automatic rows');
  assert.ok(containsDeep(record[1], before.manualMissions), 'backup retains exact local manual rows');
  assert.ok(containsDeep(record[1], before.runeCredits), 'backup retains exact local confirmed credits');
  assert.ok(containsDeep(record[1], before.runeRequests), 'backup retains exact local requests');
  assert.ok(containsDeep(record[1], remote), 'backup retains the raw remote row, including absent protocol fields');
  if (operation) assert.ok(containsDeep(record[1], operation), 'backup retains the exact outbox operation');
  assert.ok(serialized.includes(c.uid), 'backup identifies its actor context');
  assert.ok(serialized.includes(HH), 'backup identifies its household context');
  const putIndex = c.events.findIndex(event => event.type === 'put' && event.key === record[0]);
  assert.ok(c.events.slice(putIndex + 1).some(event => event.type === 'get' && event.key === record[0]), 'backup persistence must be read back and verified');
  return record[1];
}

async function review(c) {
  await c.provider.start();
  await c.action('legacy-review', 'missions');
  return stateOf(c);
}

test('legacy review is read-only, freshly reads revision 2, and verifies a complete durable backup before exposing choices', async t => {
  const remote = legacyRow({autoTasks:[auto('remote-only')]}), backend = backendFor(remote);
  const row = mission('pending', {status:'done', completedAt:date});
  const request = runes.completionRequest({...row, status:'open'}, members, [], [], date);
  const c = client(t, backend, {state:{autoTasks:[auto('local-only')], manualMissions:[row], runeRequests:[request]}});
  const before = localOf(c);
  await review(c);
  assert.deepEqual(localOf(c), before);
  assert.deepEqual(writes(backend), []);
  assert.deepEqual(backend.rows.get('missions'), remote);
  assertBackup(c, before, remote);
  assert.ok(stateOf(c).legacyReview, 'review fingerprints must be persisted');
  assert.match(c.provider.html(), /legacy-(?:merge|local|server)/);
  assert.ok(backend.calls.some(call => call.method === 'GET' && call.path.includes('module=eq.missions')));
});

test('review backup retains previous conflict details, synchronization metadata and archived operations', async t => {
  const remote = legacyRow(), backend = backendFor(remote), uid = 'fixture-user-a';
  const previousConflict = {runes:true, operation:'TEST-prior-conflict', reason:'TEST preserve review context'};
  const archived = {id:webcrypto.randomUUID(), expectedRevision:1, payload:v2Payload(), rejection:{code:'23514', message:'TEST old refusal'}};
  const known = {autoTasks:[], manualMissions:[], runeCredits:[], runeLedgerVersion:1};
  const c = client(t, backend, {metadata:moduleState(uid, {revision:1, payload:known}, {active:false, runeProtocol:1, conflict:previousConflict, abandonedOperations:[archived]}), state:{runeSyncRequired:true}});
  const before = localOf(c);
  await review(c);
  const backup = assertBackup(c, before, remote);
  assert.ok(containsDeep(backup, archived));
  assert.ok(containsDeep(backup, previousConflict));
  assert.ok(containsDeep(backup, JSON.stringify(known)), 'the remembered synchronization baseline remains recoverable');
  assert.deepEqual(stateOf(c).legacyPreviousConflict, previousConflict);
  assert.deepEqual(stateOf(c).abandonedOperations, [archived]);
  assert.equal(c.st.runeSyncRequired, true);
  assert.deepEqual(writes(backend), []);
});

for (const remoteAutos of [undefined, [], [auto('remote-only')]]) {
  test('explicit legacy merge preserves all unique local missions and remote automatic rows: ' + (remoteAutos === undefined ? 'absent autos' : remoteAutos.length + ' autos'), async t => {
    const remote = legacyRow(remoteAutos === undefined ? {} : {autoTasks:remoteAutos});
    const backend = backendFor(remote), c = client(t, backend, {state:{autoTasks:[auto('local-only')], manualMissions:[mission('keep-manual')]}});
    await review(c);
    const before = localOf(c);
    backend.beforeWrite = body => {
      assert.deepEqual(localOf(c), before, 'local data must remain intact until a valid receipt');
      assertBackup(c, before, remote);
      assert.deepEqual(stateOf(c).pendingOperation.payload, body.p_payload, 'the exact outbox precedes the RPC');
      assert.equal(stateOf(c).pendingOperation.id, body.p_operation_id);
    };
    await c.action('legacy-merge', 'missions');
    assert.equal(rpcWrites(backend).length, 1);
    const sent = rpcWrites(backend)[0].body;
    assert.equal(sent.p_expected_revision, 2);
    assert.equal(sent.p_payload.runeLedgerVersion, 2);
    assert.deepEqual(sent.p_payload.manualMissions, before.manualMissions);
    assert.deepEqual(new Set(sent.p_payload.autoTasks.map(row => row.key)), new Set(['local-only', ...(remoteAutos || []).map(row => row.key)]));
    for (const row of remoteAutos || []) assert.ok(containsDeep(sent.p_payload.autoTasks, row));
    assert.equal(backend.rows.get('missions').revision, 3);
    assert.equal(stateOf(c).revision, 3);
    assert.equal(stateOf(c).pendingOperation, undefined);
    assert.deepEqual(clone(c.st.runeCredits), []);
  });
}

test('local completion requests become confirmed only through the V2 receipt', async t => {
  const remote = legacyRow(), backend = backendFor(remote), done = mission('pending', {status:'done', completedAt:date});
  const request = runes.completionRequest({...done, status:'open'}, members, [], [], date);
  const c = client(t, backend, {state:{manualMissions:[done], runeRequests:[request]}});
  await review(c);
  backend.beforeWrite = () => {
    assert.deepEqual(c.st.runeRequests, [request]);
    assert.deepEqual(c.st.runeCredits, []);
  };
  await c.action('legacy-merge', 'missions');
  assert.equal(rpcWrites(backend).length, 1);
  assert.deepEqual(rpcWrites(backend)[0].body.p_payload.runeRequests, [request]);
  assert.equal(c.st.runeRequests.length, 0);
  assert.equal(c.st.runeCredits.length, 1);
  assert.equal(c.st.runeCredits[0].revision, 3);
  assert.equal(runes.memberSummary(members[0].id, c.st.runeCredits, c.st.runeRequests).total, 10);
});

for (const choice of ['local', 'server']) {
  test('explicit ' + choice + ' choice resolves only automatic-row collisions and retains every unique row', async t => {
    const localCollision = auto('same', {note:'TEST local collision'}), remoteCollision = auto('same', {note:'TEST remote collision'});
    const remote = legacyRow({autoTasks:[remoteCollision, auto('remote-only')]}), backend = backendFor(remote);
    const c = client(t, backend, {state:{autoTasks:[localCollision, auto('local-only')], manualMissions:[mission('keep-manual')]}});
    await review(c);
    assert.match(c.provider.html(), /Voir les différences/);
    assert.ok(c.provider.html().includes(localCollision.note), 'the local differing field must be visible before choosing');
    assert.ok(c.provider.html().includes(remoteCollision.note), 'the remote differing field must be visible before choosing');
    const before = localOf(c);
    await c.action('legacy-merge', 'missions');
    assert.deepEqual(writes(backend), [], 'a merge cannot silently choose a colliding row');
    assert.deepEqual(localOf(c), before);
    await c.action('legacy-' + choice, 'missions');
    assert.equal(rpcWrites(backend).length, 1);
    const sent = rpcWrites(backend)[0].body.p_payload;
    assert.deepEqual(new Set(sent.autoTasks.map(row => row.key)), new Set(['same', 'local-only', 'remote-only']));
    assert.deepEqual(sent.autoTasks.find(row => row.key === 'same'), choice === 'local' ? localCollision : remoteCollision);
    assert.deepEqual(sent.manualMissions, before.manualMissions, 'choosing server never discards unique manual missions');
  });
}

test('a cancelled explicit choice preserves local data, requests, remote revision and outbox', async t => {
  const remote = legacyRow(), backend = backendFor(remote), c = client(t, backend, {accept:false});
  await review(c);
  const before = localOf(c), previousOperation = clone(stateOf(c)?.pendingOperation);
  await c.action('legacy-merge', 'missions');
  assert.deepEqual(localOf(c), before);
  assert.deepEqual(writes(backend), []);
  assert.deepEqual(backend.rows.get('missions'), remote);
  assert.deepEqual(stateOf(c)?.pendingOperation, previousOperation);
});

for (const action of ['activate', 'refresh', 'sync', 'server', 'local']) {
  test('generic ' + action + ' cannot turn an unversioned row into permission to overwrite local Missions', async t => {
    const remote = legacyRow({autoTasks:[auto('remote-only')]}), backend = backendFor(remote), uid = 'fixture-user-a';
    const c = client(t, backend, {metadata:moduleState(uid, remote, {conflict:['server', 'local'].includes(action) ? {remote} : false}), state:{autoTasks:[auto('local-only')], runeSyncRequired:true}});
    await c.provider.start();
    const before = localOf(c);
    if (action === 'sync') await c.provider.sync();
    else await c.action(action, 'missions');
    assert.deepEqual(localOf(c), before);
    assert.deepEqual(writes(backend), []);
    assert.deepEqual(backend.rows.get('missions'), remote);
  });
}

for (const [name, changed] of [
  ['unknown root key', {unexpected:'TEST unsupported data'}],
  ['nonempty manual missions', {manualMissions:[mission('remote-unversioned')]}],
  ['nonempty credits', {runeCredits:[{missionId:'unsupported'}]}],
  ['nonempty requests', {runeRequests:[{missionId:'unsupported'}]}],
  ['malformed automatic registry', {autoTasks:{unexpected:true}}],
  ['null automatic registry', {autoTasks:null}],
  ['malformed manual registry', {manualMissions:null}],
  ['malformed credit registry', {runeCredits:{}}],
  ['malformed request registry', {runeRequests:null}],
  ['missing automatic key', {autoTasks:[{title:'TEST no key'}]}],
  ['nonstring automatic key', {autoTasks:[{key:7}]}],
  ['duplicate automatic keys', {autoTasks:[auto('duplicate'), auto('duplicate', {note:'TEST different'})]}]
]) {
  test('unsupported legacy ' + name + ' remains blocked with its raw backup preserved', async t => {
    const remote = legacyRow(changed), backend = backendFor(remote), c = client(t, backend);
    const before = localOf(c);
    await review(c);
    for (const action of ['legacy-merge', 'legacy-local', 'legacy-server']) await c.action(action, 'missions');
    assert.deepEqual(localOf(c), before);
    assert.deepEqual(writes(backend), []);
    assert.deepEqual(backend.rows.get('missions'), remote);
    assertBackup(c, before, remote);
  });
}

for (const protocol of [null, 7]) {
  test('an explicit unsupported protocol ' + protocol + ' stays outside unversioned recovery and is preserved', async t => {
    const remote = legacyRow({runeLedgerVersion:protocol}), backend = backendFor(remote), c = client(t, backend);
    const before = localOf(c);
    await review(c);
    for (const action of ['legacy-merge', 'legacy-local', 'legacy-server', 'legacy-replay']) await c.action(action, 'missions');
    assert.deepEqual(localOf(c), before);
    assert.deepEqual(writes(backend), []);
    assert.deepEqual(backend.rows.get('missions'), remote);
    assert.equal(stateOf(c)?.legacyReview, undefined, 'an own version field cannot enter the legacy path');
  });
}

for (const statePatch of [
  {autoTasks:[auto('duplicate'), auto('duplicate', {note:'TEST conflicting local key'})]},
  {autoTasks:[{title:'TEST missing local key'}]},
  {manualMissions:[mission('duplicate'), mission('duplicate', {note:'TEST duplicate local id'})]}
]) {
  test('ambiguous local identities cannot be merged or normalized away: ' + JSON.stringify(statePatch), async t => {
    const remote = legacyRow(), backend = backendFor(remote), c = client(t, backend, {state:statePatch});
    const before = localOf(c);
    await review(c);
    await c.action('legacy-local', 'missions');
    assert.deepEqual(localOf(c), before);
    assert.deepEqual(writes(backend), []);
    assertBackup(c, before, remote);
  });
}

test('local confirmed credits cannot be reset, imported or transformed into requests to join an empty legacy ledger', async t => {
  const remote = legacyRow(), backend = backendFor(remote), done = mission('historical', {status:'done'});
  const credit = {...runes.completionRequest({...done, status:'open'}, members, [], [], date), revision:0, date:'2026-11-12T12:00:00Z'};
  const c = client(t, backend, {state:{manualMissions:[done], runeCredits:[credit]}}), before = localOf(c);
  await review(c);
  for (const action of ['legacy-merge', 'legacy-local', 'legacy-server']) await c.action(action, 'missions');
  assert.deepEqual(localOf(c), before);
  assert.deepEqual(writes(backend), []);
  assertBackup(c, before, remote);
});

for (const kind of ['known-v2-empty', 'known-v1-credit']) {
  test('remembered ' + kind + ' history blocks a versionless regression even when the current local ledger is empty', async t => {
    const remote = legacyRow(), backend = backendFor(remote), uid = 'fixture-user-a';
    const old = mission('remembered', {status:'done'});
    const credit = {...runes.completionRequest({...old, status:'open'}, members, [], [], date), revision:1};
    const known = kind === 'known-v2-empty' ? v2Payload() : {...v2Payload({manualMissions:[old], runeCredits:[credit]}), runeLedgerVersion:1};
    const c = client(t, backend, {metadata:moduleState(uid, {revision:1, payload:known}, {runeProtocol:kind === 'known-v2-empty' ? 2 : 1})});
    await c.provider.start();
    const before = localOf(c);
    await c.action('legacy-review', 'missions');
    await c.action('legacy-merge', 'missions');
    assert.deepEqual(localOf(c), before);
    assert.deepEqual(writes(backend), []);
    assertBackup(c, before, remote);
  });
}

for (const failure of ['backup-put', 'backup-readback', 'module-state-put']) {
  test('storage failure at ' + failure + ' cannot expose an executable review or send any RPC', async t => {
    const remote = legacyRow(), backend = backendFor(remote);
    let armed = true;
    const controls = {
      beforePutMeta:(key, value) => {
        if (armed && ((failure === 'backup-put' && key.startsWith(backupPrefix)) ||
            (failure === 'module-state-put' && value?.missions?.legacyReview))) throw Error('TEST storage unavailable');
      },
      afterMeta:(key, value) => armed && failure === 'backup-readback' && key.startsWith(backupPrefix) ? null : value
    };
    const c = client(t, backend, {controls}), before = localOf(c);
    await review(c);
    await c.action('legacy-merge', 'missions');
    assert.deepEqual(localOf(c), before);
    assert.deepEqual(writes(backend), []);
    assert.deepEqual(backend.rows.get('missions'), remote);
    assert.equal(stateOf(c)?.pendingOperation, undefined);
    armed = false;
  });
}

test('backup completion is awaited before the review becomes writable', {timeout:5000}, async t => {
  const remote = legacyRow(), backend = backendFor(remote), entered = deferred(), release = deferred();
  const c = client(t, backend, {controls:{beforePutMeta:async key => {
    if (key.startsWith(backupPrefix)) {entered.resolve(); await release.promise;}
  }}});
  await c.provider.start();
  const reviewing = c.action('legacy-review', 'missions');
  await entered.promise;
  const before = localOf(c);
  await c.action('legacy-merge', 'missions');
  assert.deepEqual(writes(backend), []);
  assert.deepEqual(localOf(c), before);
  release.resolve();
  await reviewing;
  assertBackup(c, before, remote);
});

test('local Missions edited while the backup is being persisted require another reviewed snapshot', async t => {
  const remote = legacyRow(), backend = backendFor(remote);
  let c, edited = false;
  c = client(t, backend, {controls:{beforePutMeta:key => {
    if (!edited && key.startsWith(backupPrefix)) {
      edited = true;
      c.st.manualMissions[0].note = 'TEST local edit while backup awaited';
    }
  }}});
  await review(c);
  const before = localOf(c);
  await c.action('legacy-merge', 'missions');
  assert.deepEqual(writes(backend), [], 'the approved snapshot cannot include an edit absent from its durable backup');
  assert.deepEqual(localOf(c), before);
  assert.deepEqual(backend.rows.get('missions'), remote);
});

for (const change of ['revision', 'remote-content', 'local-content']) {
  test('a reviewed snapshot changed through ' + change + ' needs a fresh explicit review before writing', async t => {
    const remote = legacyRow({autoTasks:[auto('remote-only')]}), backend = backendFor(remote), c = client(t, backend);
    await review(c);
    if (change === 'revision') backend.rows.get('missions').revision++;
    if (change === 'remote-content') backend.rows.get('missions').payload.autoTasks[0].note = 'TEST changed without assuming an honest revision';
    if (change === 'local-content') c.st.manualMissions[0].note = 'TEST edited after review';
    const before = localOf(c), remoteBefore = clone(backend.rows.get('missions'));
    if (change === 'local-content') {
      assert.doesNotMatch(c.provider.html(), /data-fm-action="legacy-(?:merge|local|server|replay)"/, 'stale local consent must not expose a writable action');
      assert.match(c.provider.html(), /data-fm-action="legacy-review"/);
    }
    await c.action('legacy-merge', 'missions');
    assert.deepEqual(localOf(c), before);
    assert.deepEqual(writes(backend), []);
    assert.deepEqual(backend.rows.get('missions'), remoteBefore);
  });
}

for (const phase of ['backup', 'fresh-read']) {
  test('an auth-context switch during ' + phase + ' cannot publish or apply a legacy review', async t => {
    const remote = legacyRow(), backend = backendFor(remote);
    let uid = 'fixture-user-a', epoch = 1, armed = false;
    const controls = {beforePutMeta:key => {if (armed && phase === 'backup' && key.startsWith(backupPrefix)) {uid = 'fixture-user-b'; epoch++;}}};
    const c = client(t, backend, {controls, api:{getContext:() => ({userId:uid, householdId:HH}), connectionState:() => ({epoch, access:'verified'})}});
    await c.provider.start();
    armed = true;
    backend.afterRead = (result, user, path) => {
      if (phase === 'fresh-read' && path.includes('module=eq.missions')) {uid = 'fixture-user-b'; epoch++;}
      return result;
    };
    const before = localOf(c);
    await c.action('legacy-review', 'missions');
    await c.action('legacy-merge', 'missions');
    assert.deepEqual(localOf(c), before);
    assert.deepEqual(writes(backend), []);
    assert.deepEqual(backend.rows.get('missions'), remote);
  });
}

test('parallel recovery clicks share the native durable flight and never issue a second operation', {timeout:5000}, async t => {
  const remote = legacyRow(), backend = backendFor(remote), c = client(t, backend), entered = deferred(), release = deferred();
  await review(c);
  backend.beforeWrite = async () => {entered.resolve(); await release.promise;};
  const first = c.action('legacy-merge', 'missions');
  await entered.promise;
  const pending = clone(stateOf(c).pendingOperation), before = localOf(c);
  const second = c.action('legacy-merge', 'missions');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(rpcWrites(backend).length, 1);
  assert.deepEqual(stateOf(c).pendingOperation, pending);
  assert.deepEqual(localOf(c), before);
  release.resolve();
  await Promise.all([first, second]);
  assert.equal(rpcWrites(backend).length, 1);
  assert.equal(backend.rows.get('missions').revision, 3);
});

test('a lost response survives reload and a fresh converted-household review replays its exact operation', async t => {
  const remote = legacyRow({autoTasks:[auto('remote-only')]}), backend = backendFor(remote), c = client(t, backend);
  await review(c);
  const before = localOf(c);
  backend.loseNextResponse = true;
  await c.action('legacy-merge', 'missions');
  const operation = clone(stateOf(c).pendingOperation);
  assert.ok(operation);
  assert.deepEqual(localOf(c), before);
  assert.equal(backend.rows.get('missions').revision, 3);
  const next = client(t, backend, {state:clone(c.st), metadata:[...c.metadata.entries()]});
  await next.provider.start();
  assert.doesNotMatch(next.provider.html(), /data-fm-action="legacy-(?:merge|local|server|replay)"/, 'a reload requires fresh review before exposing an executable choice');
  assert.match(next.provider.html(), /data-fm-action="legacy-review"/);
  await next.action('legacy-review', 'missions');
  assert.equal(stateOf(next).legacyReview?.converted, true, 'a fresh review recognizes the committed V2 row');
  assertBackup(next, before, backend.rows.get('missions'), operation);
  assert.doesNotMatch(next.provider.html(), /data-fm-action="(?:local|server)" data-module="missions"/);
  await next.action('legacy-replay', 'missions');
  const sent = rpcWrites(backend);
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[1].body, sent[0].body);
  assert.equal(sent[1].body.p_operation_id, operation.id);
  assert.equal(stateOf(next).pendingOperation, undefined);
  assert.equal(stateOf(next).revision, 3);
  assert.equal(backend.rows.get('missions').revision, 3);
});

for (const preservesRemoteAutos of [true, false]) {
  test('unknown pending operation ' + (preservesRemoteAutos ? 'replays exactly when it preserves' : 'is blocked when it omits') + ' legacy remote automatic rows', async t => {
    const remote = legacyRow({autoTasks:[auto('remote-only')]}), backend = backendFor(remote), uid = 'fixture-user-a';
    const local = {autoTasks:[auto('local-only')], manualMissions:[mission()]};
    const payload = v2Payload({...local, autoTasks:[...local.autoTasks, ...(preservesRemoteAutos ? remote.payload.autoTasks : [])]});
    const operation = {id:webcrypto.randomUUID(), expectedRevision:2, payload, localEditable:digest(local), localFields:clone(local)};
    const c = client(t, backend, {metadata:moduleState(uid, remote, {pendingOperation:operation}), state:{...local, runeSyncRequired:true}});
    await review(c);
    const before = localOf(c);
    await c.action('legacy-merge', 'missions');
    assert.deepEqual(writes(backend), [], 'merge cannot replace an unknown pending operation');
    assert.deepEqual(stateOf(c).pendingOperation, operation);
    await c.action('legacy-replay', 'missions');
    if (preservesRemoteAutos) {
      assert.equal(rpcWrites(backend).length, 1);
      assert.deepEqual(rpcWrites(backend)[0].body.p_payload, operation.payload);
      assert.equal(rpcWrites(backend)[0].body.p_operation_id, operation.id);
      assert.equal(rpcWrites(backend)[0].body.p_expected_revision, operation.expectedRevision);
    } else {
      assert.deepEqual(writes(backend), []);
      assert.deepEqual(stateOf(c).pendingOperation, operation);
      assert.deepEqual(localOf(c), before);
    }
    assertBackup(c, before, remote, operation);
  });
}

for (const code of ['40003', '08007']) {
  test('unknown transaction result ' + code + ' never archives, rebases or credits a pending legacy operation', async t => {
    const remote = legacyRow(), backend = backendFor(remote), c = client(t, backend);
    await review(c);
    backend.reject = Object.assign(Error('TEST unknown transaction result'), {code, status:500});
    await c.action('legacy-merge', 'missions');
    const operation = clone(stateOf(c).pendingOperation), before = localOf(c);
    assert.ok(operation);
    assert.equal(operation.rejection, undefined);
    await c.action('legacy-local', 'missions');
    assert.deepEqual(stateOf(c).pendingOperation, operation);
    assert.equal(stateOf(c).abandonedOperations, undefined);
    await c.action('legacy-replay', 'missions');
    assert.deepEqual(stateOf(c).pendingOperation, operation);
    assert.deepEqual(localOf(c), before);
    assert.ok(rpcWrites(backend).every(call => call.body.p_operation_id === operation.id));
  });
}

test('an explicit new choice after a known atomic rejection archives the immutable old operation and uses a new UUID', async t => {
  const remote = legacyRow(), backend = backendFor(remote), c = client(t, backend);
  await review(c);
  backend.reject = Object.assign(Error('TEST known SQL rollback'), {code:'23514', status:400});
  await c.action('legacy-merge', 'missions');
  const operation = clone(stateOf(c).pendingOperation);
  assert.equal(operation.rejection.code, '23514');
  backend.reject = null;
  c.st.manualMissions[0].note = 'TEST corrected after rollback';
  await c.action('legacy-review', 'missions');
  await c.action('legacy-local', 'missions');
  assert.ok(stateOf(c).abandonedOperations.some(row => digest(row) === digest(operation)));
  assert.notEqual(rpcWrites(backend).at(-1).body.p_operation_id, operation.id);
  assert.equal(stateOf(c).pendingOperation, undefined);
  assert.equal(backend.rows.get('missions').revision, 3);
});

test('local Missions edited while a rejected operation is being archived are never overwritten by the earlier choice', async t => {
  const remote = legacyRow(), backend = backendFor(remote), c = client(t, backend);
  await review(c);
  backend.reject = Object.assign(Error('TEST known SQL rollback'), {code:'23514', status:400});
  await c.action('legacy-merge', 'missions');
  const operation = clone(stateOf(c).pendingOperation);
  backend.reject = null;
  c.st.manualMissions[0].note = 'TEST correction reviewed before archival';
  await c.action('legacy-review', 'missions');
  let edited = false;
  c.controls.beforePutMeta = (key, value) => {
    if (!edited && key === metadataKey(c.uid) && !value.missions?.pendingOperation && value.missions?.abandonedOperations?.some(row => row.id === operation.id)) {
      edited = true;
      c.st.manualMissions[0].note = 'TEST newer edit during archive await';
    }
  };
  const count = rpcWrites(backend).length;
  await c.action('legacy-local', 'missions');
  assert.equal(c.st.manualMissions[0].note, 'TEST newer edit during archive await');
  assert.equal(rpcWrites(backend).length, count, 'an edit during archival invalidates the reviewed fields before a new operation');
  assert.deepEqual(backend.rows.get('missions'), remote);
  assert.ok(stateOf(c).abandonedOperations.some(row => digest(row) === digest(operation)));
});

test('a second fixture account converting the row forces a fresh review before preserving both accounts unique missions', async t => {
  const remote = legacyRow(), backend = backendFor(remote);
  const a = client(t, backend, {uid:'fixture-user-a', state:{manualMissions:[mission('from-a')]}});
  const b = client(t, backend, {uid:'fixture-user-b', state:{manualMissions:[mission('from-b')]}});
  await review(a);
  await review(b);
  await b.action('legacy-merge', 'missions');
  assert.equal(backend.rows.get('missions').revision, 3);
  const count = rpcWrites(backend).length, before = localOf(a);
  await a.action('legacy-merge', 'missions');
  assert.equal(rpcWrites(backend).length, count);
  assert.deepEqual(localOf(a), before);
  await a.action('legacy-review', 'missions');
  assert.equal(stateOf(a).legacyReview?.converted, true);
  assertBackup(a, before, backend.rows.get('missions'));
  assert.doesNotMatch(a.provider.html(), /data-fm-action="(?:local|server)" data-module="missions"/);
  await a.action('legacy-merge', 'missions');
  assert.equal(backend.rows.get('missions').revision, 4);
  assert.deepEqual(new Set(backend.rows.get('missions').payload.manualMissions.map(row => row.id)), new Set(['from-a', 'from-b']));
});

for (const choice of ['merge', 'local', 'server']) {
  test('converted-household ' + choice + ' review preserves a remembered remote automatic row and unchanged local manual row', async t => {
    const remoteAutomatic = auto('remembered-remote-R'), extraAutomatic = auto('new-remote-B'), localManual = mission('unchanged-local-L');
    const remote = legacyRow({autoTasks:[remoteAutomatic]}), backend = backendFor(remote), uid = 'fixture-user-a';
    const baseline = {autoTasks:[remoteAutomatic], manualMissions:[localManual], runeCredits:[], runeLedgerVersion:1};
    const a = client(t, backend, {uid, metadata:moduleState(uid, {revision:1, payload:baseline}, {runeProtocol:1}), state:{autoTasks:[], manualMissions:[localManual]}});
    const b = client(t, backend, {uid:'fixture-user-b', state:{autoTasks:[extraAutomatic], manualMissions:[]}});
    await review(a);
    await review(b);
    await b.action('legacy-merge', 'missions');
    assert.equal(backend.rows.get('missions').revision, 3);
    const converted = clone(backend.rows.get('missions')), before = localOf(a), count = rpcWrites(backend).length, backupCount = backups(a).length;
    await a.action('legacy-review', 'missions');
    assert.equal(backups(a).length, backupCount + 1, 'the new V2 remote snapshot must have its own complete IDB backup');
    assert.equal(stateOf(a).legacyReview?.converted, true);
    assertBackup(a, before, converted);
    assert.equal(rpcWrites(backend).length, count, 'review itself cannot publish');
    assert.doesNotMatch(a.provider.html(), /data-fm-action="(?:local|server)" data-module="missions"/, 'the native three-way replacement buttons cannot handle a converted legacy review');
    await a.action('legacy-' + choice, 'missions');
    assert.equal(rpcWrites(backend).length, count + 1);
    const final = backend.rows.get('missions');
    assert.equal(final.revision, 4);
    assert.deepEqual(new Set(final.payload.autoTasks.map(row => row.key)), new Set([remoteAutomatic.key, extraAutomatic.key]));
    assert.deepEqual(final.payload.manualMissions, [localManual]);
    assert.deepEqual(clone(a.st.manualMissions), [localManual]);
  });
}

test('a converted review preserves remote manual missions and exact confirmed credits while adding local unique missions', async t => {
  const remote = legacyRow({autoTasks:[auto('remote-only')]}), backend = backendFor(remote), c = client(t, backend);
  await review(c);
  const done = mission('remote-confirmed', {status:'done', completedAt:date});
  const credit = {...runes.completionRequest({...done, status:'open'}, members, [], [], date), revision:3, date:'2026-11-12T12:00:00Z'};
  const converted = {module:'missions', revision:3, payload:v2Payload({autoTasks:remote.payload.autoTasks, manualMissions:[done], runeCredits:[credit]}), updated_at:date};
  backend.rows.set('missions', clone(converted));
  const before = localOf(c);
  await c.action('legacy-review', 'missions');
  assert.equal(stateOf(c).legacyReview?.converted, true);
  assert.equal(stateOf(c).legacyReview.remoteCounts.manualMissions, 1);
  assertBackup(c, before, converted);
  await c.action('legacy-merge', 'missions');
  assert.equal(rpcWrites(backend).length, 1);
  assert.equal(rpcWrites(backend)[0].body.p_expected_revision, 3);
  assert.deepEqual(rpcWrites(backend)[0].body.p_payload.runeCredits, [credit]);
  assert.deepEqual(backend.rows.get('missions').payload.runeCredits, [credit]);
  assert.deepEqual(new Set(backend.rows.get('missions').payload.manualMissions.map(row => row.id)), new Set([done.id, before.manualMissions[0].id]));
  assert.equal(backend.rows.get('missions').revision, 4);
});

for (const omittedCollection of [null, 'autoTasks', 'manualMissions']) {
  test('pending replay at the current converted revision ' + (omittedCollection ? 'cannot omit remote ' + omittedCollection : 'preserves every remote row'), async t => {
    const old = legacyRow(), remoteAuto = auto('current-remote-auto'), remoteManual = mission('current-remote-manual');
    const converted = {module:'missions', revision:3, payload:v2Payload({autoTasks:[remoteAuto], manualMissions:[remoteManual]}), updated_at:date};
    const backend = backendFor(converted), uid = 'fixture-user-a';
    const local = {autoTasks:[], manualMissions:[mission('local-pending')]};
    const op = {
      id:webcrypto.randomUUID(), expectedRevision:3,
      payload:v2Payload({autoTasks:omittedCollection === 'autoTasks' ? [] : [remoteAuto], manualMissions:[...local.manualMissions, ...(omittedCollection === 'manualMissions' ? [] : [remoteManual])]}),
      localEditable:digest(local), localFields:clone(local)
    };
    const c = client(t, backend, {metadata:moduleState(uid, old, {pendingOperation:op, conflict:{legacyUnversioned:true, remote:old}}), state:local});
    await review(c);
    assert.equal(stateOf(c).legacyReview?.converted, true);
    const before = localOf(c);
    await c.action('legacy-replay', 'missions');
    if (!omittedCollection) {
      assert.equal(rpcWrites(backend).length, 1);
      assert.deepEqual(rpcWrites(backend)[0].body.p_payload, op.payload);
      assert.equal(rpcWrites(backend)[0].body.p_operation_id, op.id);
      assert.equal(backend.rows.get('missions').revision, 4);
    } else {
      assert.deepEqual(writes(backend), []);
      assert.deepEqual(stateOf(c).pendingOperation, op);
      assert.deepEqual(localOf(c), before);
      assert.deepEqual(backend.rows.get('missions'), converted);
    }
    assertBackup(c, before, converted, op);
  });
}

test('an older lost-response operation replays its receipt after another fixture account has added remote rows', async t => {
  const remote = legacyRow({autoTasks:[auto('remote-original')]}), backend = backendFor(remote), a = client(t, backend);
  await review(a);
  backend.loseNextResponse = true;
  await a.action('legacy-merge', 'missions');
  const operation = clone(stateOf(a).pendingOperation);
  assert.equal(backend.rows.get('missions').revision, 3);
  const b = client(t, backend, {uid:'fixture-user-b', state:{manualMissions:[]}});
  await b.provider.start();
  await b.action('activate', 'missions');
  b.st.autoTasks = [...b.st.autoTasks, auto('added-after-original-operation')];
  b.st.manualMissions = [...b.st.manualMissions, mission('manual-added-after-original-operation')];
  await b.provider.sync();
  assert.equal(backend.rows.get('missions').revision, 4);
  const newer = clone(backend.rows.get('missions'));
  const reloaded = client(t, backend, {state:clone(a.st), metadata:[...a.metadata.entries()]});
  await review(reloaded);
  assert.equal(stateOf(reloaded).legacyReview?.converted, true);
  await reloaded.action('legacy-replay', 'missions');
  assert.equal(rpcWrites(backend).length, 3);
  assert.deepEqual(rpcWrites(backend).at(-1).body.p_payload, operation.payload, 'new remote rows must not rewrite an older pending request');
  assert.equal(rpcWrites(backend).at(-1).body.p_expected_revision, operation.expectedRevision);
  assert.equal(rpcWrites(backend).at(-1).body.p_operation_id, operation.id);
  assert.equal(stateOf(reloaded).pendingOperation, undefined);
  assert.equal(stateOf(reloaded).revision, 4);
  assert.deepEqual(backend.rows.get('missions'), newer);
  assert.deepEqual(new Set(reloaded.st.autoTasks.map(row => row.key)), new Set(newer.payload.autoTasks.map(row => row.key)));
  assert.deepEqual(new Set(reloaded.st.manualMissions.map(row => row.id)), new Set(newer.payload.manualMissions.map(row => row.id)));
});

test('receipt replay after a full local restore cannot turn an absent cached automatic row into a later remote deletion', async t => {
  const remoteAuto = auto('restore-must-keep-remote-R');
  const remote = legacyRow({autoTasks:[remoteAuto]}), backend = backendFor(remote);
  const a = client(t, backend, {state:{autoTasks:[remoteAuto], manualMissions:[mission('restore-keeps-local-L')]}});
  await review(a);
  backend.loseNextResponse = true;
  await a.action('legacy-merge', 'missions');
  const operation = clone(stateOf(a).pendingOperation), committed = clone(backend.rows.get('missions'));
  assert.ok(operation.localFields.autoTasks.some(row => row.key === remoteAuto.key));
  assert.equal(committed.revision, 3);
  // Native complete restore replaces `st` and its localStorage snapshot while
  // keeping the separate familial IndexedDB metadata/outbox (index.html restore).
  const restoredState = {...clone(a.st), autoTasks:[]};
  const reloaded = client(t, backend, {state:restoredState, metadata:[...a.metadata.entries()]});
  await review(reloaded);
  assert.equal(stateOf(reloaded).legacyReview?.converted, true);
  await reloaded.action('legacy-replay', 'missions');
  assert.equal(stateOf(reloaded).pendingOperation, undefined);
  assert.deepEqual(rpcWrites(backend).at(-1).body.p_payload, operation.payload);
  assert.equal(rpcWrites(backend).at(-1).body.p_operation_id, operation.id);
  const afterReplay = localOf(reloaded);
  await reloaded.provider.sync();
  assert.deepEqual(backend.rows.get('missions'), committed, 'acknowledging a receipt cannot publish a deletion inferred from the restored local cache');
  assert.deepEqual(afterReplay.autoTasks, committed.payload.autoTasks, 'the explicit recovery retains the confirmed remote row locally');
});

test('a receipt newer than its operation keeps a unique current local mission deleted by another fixture account for explicit conflict resolution', async t => {
  const remote = legacyRow(), backend = backendFor(remote), localManual = mission('local-history-L');
  const a = client(t, backend, {state:{manualMissions:[localManual]}});
  await review(a);
  backend.loseNextResponse = true;
  await a.action('legacy-merge', 'missions');
  const operation = clone(stateOf(a).pendingOperation);
  assert.equal(backend.rows.get('missions').revision, 3);
  const b = client(t, backend, {uid:'fixture-user-b', state:{manualMissions:[]}});
  await b.provider.start();
  await b.action('activate', 'missions');
  b.st.manualMissions = [];
  await b.provider.sync();
  assert.equal(backend.rows.get('missions').revision, 4);
  assert.deepEqual(backend.rows.get('missions').payload.manualMissions, []);
  const currentRemote = clone(backend.rows.get('missions'));
  const reloaded = client(t, backend, {state:clone(a.st), metadata:[...a.metadata.entries()]});
  await review(reloaded);
  assert.equal(stateOf(reloaded).legacyReview?.converted, true);
  await reloaded.action('legacy-replay', 'missions');
  assert.deepEqual(rpcWrites(backend).at(-1).body.p_payload, operation.payload);
  assert.equal(rpcWrites(backend).at(-1).body.p_operation_id, operation.id);
  assert.equal(stateOf(reloaded).pendingOperation, undefined);
  assert.deepEqual(clone(reloaded.st.manualMissions), [localManual], 'the recovery cannot silently discard unique local history');
  assert.equal(stateOf(reloaded).conflict?.inFlight, true, 'preservation needs an explicit conflict choice before publication');
  const count = rpcWrites(backend).length;
  await reloaded.provider.sync();
  assert.equal(rpcWrites(backend).length, count);
  assert.deepEqual(backend.rows.get('missions'), currentRemote, 'preserving local history cannot silently resurrect a remote deletion');
});

test('blocked legacy Missions do not mutate other modules or interrupt their existing direct writers', async t => {
  const remote = legacyRow(), backend = backendFor(remote), uid = 'fixture-user-a';
  const menus = {module:'menus', revision:2, payload:{planned:{}, shopHistory:{}, shopFinal:null, shopChoice:{}}};
  const house = {module:'house', revision:3, payload:{houseItems:[], houseLogs:[]}};
  const metadata = moduleState(uid, remote);
  for (const row of [menus, house]) {
    backend.rows.set(row.module, clone(row));
    metadata[0][1][row.module] = {active:true, revision:row.revision, synced:JSON.stringify(row.payload), conflict:false};
  }
  const c = client(t, backend, {metadata});
  await review(c);
  const originalMenus = clone(c.metadata.get(metadataKey(uid)).menus), originalHouse = clone(c.metadata.get(metadataKey(uid)).house);
  await c.action('legacy-merge', 'missions');
  assert.deepEqual(c.metadata.get(metadataKey(uid)).menus, originalMenus);
  assert.deepEqual(c.metadata.get(metadataKey(uid)).house, originalHouse);
  c.st.planned['2026-11-12-soir'] = {id:'fixture-meal', people:2, status:'prévu'};
  c.st.houseItems.push({id:'fixture-equipment', name:'TEST fixture equipment'});
  await c.provider.sync();
  assert.equal(backend.rows.get('menus').revision, 3);
  assert.equal(backend.rows.get('house').revision, 4);
  assert.equal(writes(backend).filter(call => call.method === 'PATCH').length, 2);
});

for (const failure of ['missing', 'malformed']) {
  test('legacy recovery retains the pilot V2 capability guard when the capability is ' + failure, async t => {
    const remote = legacyRow(), backend = backendFor(remote), c = client(t, backend);
    if (failure === 'missing') backend.capabilityError = Object.assign(Error('TEST RPC unavailable'), {status:404, code:'PGRST202'});
    else backend.capability.directWritesBlocked = false;
    await c.provider.start();
    const before = localOf(c);
    for (const action of ['legacy-review', 'legacy-merge', 'legacy-local', 'legacy-server', 'legacy-replay']) await c.action(action, 'missions');
    assert.deepEqual(localOf(c), before);
    assert.deepEqual(writes(backend), []);
    assert.deepEqual(backend.rows.get('missions'), remote);
  });
}

test('native recovery requires explicit review before any legacy write', async t => {
  assert.equal(fs.readFileSync(nativeUrl, 'utf8'), source);
  const baseline = source, backend = backendFor(legacyRow());
  const c = makeClient('fixture-baseline', backend, false, true, {crypto:webcrypto, implementation:baseline, state:{manualMissions:[mission()], runeCredits:[], runeRequests:[]}});
  t.after(() => c.provider.reset());
  await c.provider.start();
  const before = localOf(c);
  await c.action('activate', 'missions');
  assert.deepEqual(localOf(c), before);
  assert.deepEqual(writes(backend), []);
});

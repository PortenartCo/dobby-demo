import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash, webcrypto} from 'node:crypto';
import builder from '../build-dobby-runes-pilot.cjs';
import * as runes from '../../essai-stitch-v5-famille/family-runes-core.mjs';
import {makeBackend, makeClient, HH} from '../../essai-stitch-v5-famille/tests/helpers/modules-harness.mjs';

const source = fs.readFileSync(new URL('../../essai-stitch-v5-famille/family-modules.js', import.meta.url), 'utf8');
const implementation = builder.transformMissions(source);
const clone = value => JSON.parse(JSON.stringify(value));
const date = '2026-11-11T12:00:00.000Z';
const uid = 'pilot-fixture-user';
const metadataKey = 'v2-module-state:' + uid + '|' + HH;
const members = [{id:'pilot-member'}];
const mission = (id = 'pilot-mission', fields = {}) => ({
  id, title:'TEST — ' + id, category:'Famille', due:'', note:'', status:'open',
  assigneeId:members[0].id, effort:'light', rewardVersion:1, ...fields
});
const payload = fields => ({autoTasks:[], manualMissions:[mission()], runeCredits:[], runeLedgerVersion:1, ...fields});
const capability = {protocol:2, directWritesBlocked:true, maxPayloadBytes:262144, ledgerVersions:[1, 2]};

// Keep the native modules fixture; only its two RPC endpoints need an adapter.
function backendFor(mode = 'valid') {
  const backend = makeBackend(), legacy = backend.authorized;
  backend.calls = [];
  backend.mode = mode;
  backend.authorized = async (user, method, path, body) => {
    backend.calls.push({method, path, ...(body === undefined ? {} : {body:clone(body)})});
    if (path.startsWith('rpc/dobby_missions_v2_capabilities')) {
      if (['404', '401', '403'].includes(backend.mode)) {
        throw Object.assign(Error('TEST capability unavailable'), {status:Number(backend.mode), code:'PGRST202'});
      }
      return backend.mode === 'malformed' ? {...capability, directWritesBlocked:false} : clone(capability);
    }
    if (path === 'rpc/dobby_missions_v2_write') {
      assert.equal(method, 'POST');
      if (backend.writerMissing) throw Object.assign(Error('TEST writer RPC missing'), {status:404, code:'PGRST202'});
      await backend.beforeWrite?.(clone(body));
      const existing = backend.rows.get('missions');
      assert.equal(body.p_expected_revision, existing?.revision || 0);
      const revision = body.p_expected_revision + 1, known = new Set(body.p_payload.runeCredits.map(runes.eventKey));
      const accepted = runes.acceptRequests(body.p_payload.runeCredits, body.p_payload.runeRequests, revision);
      const confirmed = {...clone(body.p_payload), runeCredits:[...clone(body.p_payload.runeCredits), ...accepted.filter(row => !known.has(runes.eventKey(row)))], runeRequests:[], runeLedgerVersion:2};
      const row = {module:'missions', payload:confirmed, revision, updated_at:date};
      backend.rows.set('missions', row);
      return {protocol:2, replayed:false, operation:{id:body.p_operation_id, revision, digest:createHash('sha256').update(JSON.stringify(body.p_payload)).digest('hex')}, module:clone(row)};
    }
    return legacy(user, method, path, body);
  };
  return backend;
}

function client(t, backend, options = {}) {
  const messages = [];
  const c = makeClient(uid, backend, false, true, {
    crypto:webcrypto, implementation,
    ...options,
    state:{manualMissions:[mission()], familyMembers:members, runeCredits:[], runeRequests:[], ...options.state},
    window:{DobbyRunesPilot:Object.freeze({requireMissionsV2:true}), ...options.window},
    api:{...options.api, showMessage:message => messages.push(message)}
  });
  c.messages = messages;
  t.after(() => c.provider.reset());
  return c;
}

function mutations(backend) { return backend.calls.filter(row => !['GET', 'HEAD'].includes(row.method)); }
function snapshot(c) { return clone({state:c.st, metadata:[...c.metadata.entries()]}); }
function stateFor(remote, fields = {}) {
  return [[metadataKey, {missions:{active:true, revision:remote.revision, synced:JSON.stringify(remote.payload), conflict:false, runeProtocol:1, ...fields}}]];
}
function toggle(c) {
  const current = c.st.manualMissions[0];
  const request = current.status === 'done'
    ? runes.reopeningRequest(current, c.st.runeCredits, c.st.runeRequests, date)
    : runes.completionRequest(current, members, c.st.runeCredits, c.st.runeRequests, date);
  c.st.manualMissions = [{...current, status:current.status === 'done' ? 'open' : 'done', completedAt:current.status === 'done' ? '' : date}];
  if (request) c.st.runeRequests = runes.normalizeRequests([...c.st.runeRequests, request]);
}

for (const mode of ['404', '401', '403', 'malformed']) {
  test('pilot ' + mode + ': fresh individual and grouped activation never create a V1 Missions row', async t => {
    for (const action of ['activate', 'activate-all']) {
      const backend = backendFor(mode), c = client(t, backend);
      await c.provider.start();
      const before = snapshot(c);
      assert.equal(c.window.DobbySharedRunesV2.available(), false);
      await c.action(action, 'missions');
      assert.deepEqual(snapshot(c), before);
      assert.deepEqual(mutations(backend), []);
      assert.equal(backend.rows.size, 0);
      assert.equal(c.localBackups, 0);
      assert.match(c.messages.at(-1), /V2|RPC/i);
    }
  });

  test('pilot ' + mode + ': existing V1 retrieval, sync, conflict choices and group paths preserve local intent', async t => {
    for (const action of ['activate', 'join-family', 'activate-all', 'refresh', 'sync', 'server', 'local']) {
      const backend = backendFor(mode), remote = {module:'missions', revision:4, payload:payload()};
      backend.rows.set('missions', clone(remote));
      const active = ['refresh', 'sync', 'server', 'local'].includes(action);
      const c = client(t, backend, {
        metadata:stateFor(remote, {active, conflict:['server', 'local'].includes(action) ? {remote} : false}),
        state:{runeSyncRequired:true, manualMissions:[mission('pilot-mission', {note:'TEST local edit'})]}
      });
      await c.provider.start();
      const before = snapshot(c);
      if (action === 'sync') await c.provider.sync();
      else await c.action(action, 'missions');
      assert.deepEqual(snapshot(c), before, action + ' must not replace local state or metadata');
      assert.deepEqual(mutations(backend), [], action + ' must not reach any writer');
      assert.deepEqual(backend.rows.get('missions'), remote);
      assert.equal(c.localBackups, 0);
    }
  });

  test('pilot ' + mode + ': native menus POST and PATCH remain available', async t => {
    const backend = backendFor(mode), c = client(t, backend);
    await c.provider.start();
    await c.action('activate', 'menus');
    c.st.planned['2026-11-11-soir'] = {id:'fixture-menu', people:2, status:'prévu'};
    await c.provider.sync();
    assert.deepEqual(mutations(backend).map(row => row.method), ['POST', 'PATCH']);
    assert.equal(mutations(backend)[0].body.module, 'menus');
    assert.match(mutations(backend)[1].path, /module=eq\.menus/);
    assert.equal(backend.rows.get('menus').revision, 2);
    assert.deepEqual(clone(backend.rows.get('menus').payload.planned), clone(c.st.planned));
  });

  test('pilot ' + mode + ': blocked active Missions do not interrupt writers before or after them', async t => {
    const backend = backendFor(mode), remote = {module:'missions', revision:4, payload:payload()};
    const metadata = stateFor(remote);
    for (const row of [remote, {module:'menus', revision:2, payload:{planned:{}, shopHistory:{}, shopFinal:null, shopChoice:{}}}, {module:'house', revision:3, payload:{houseItems:[], houseLogs:[]}}]) {
      backend.rows.set(row.module, clone(row));
      if (row.module !== 'missions') metadata[0][1][row.module] = {active:true, revision:row.revision, synced:JSON.stringify(row.payload), conflict:false};
    }
    const c = client(t, backend, {metadata, state:{runeSyncRequired:true}});
    await c.provider.start();
    const missionsBefore = clone(c.metadata.get(metadataKey).missions), localBefore = clone(c.st.manualMissions);
    c.st.planned['2026-11-11-soir'] = {id:'fixture-menu', people:2, status:'prévu'};
    c.st.houseItems.push({id:'fixture-equipment', name:'TEST equipment'});
    await c.provider.sync();
    assert.deepEqual(mutations(backend).map(row => new URLSearchParams(row.path.split('?')[1]).get('module')), ['eq.menus', 'eq.house']);
    assert.ok(mutations(backend).every(row => row.method === 'PATCH'));
    assert.equal(backend.rows.get('menus').revision, 3);
    assert.equal(backend.rows.get('house').revision, 4);
    assert.deepEqual(clone(c.metadata.get(metadataKey).missions), missionsBefore);
    assert.deepEqual(clone(c.st.manualMissions), localBefore);
    assert.deepEqual(backend.rows.get('missions'), remote);
  });
}

test('unavailable V2 preserves the exact durable operation, pending requests, confirmed credits and sticky protection across reload', async t => {
  const backend = backendFor('404');
  const old = mission('old', {status:'done'}), pending = mission('pilot-mission', {status:'done'});
  const credit = {...runes.completionRequest({...old, status:'open'}, members, [], [], date), revision:0};
  const request = runes.completionRequest({...pending, status:'open'}, members, [credit], [], date);
  const remote = {module:'missions', revision:4, payload:payload({manualMissions:[old, mission()], runeCredits:[credit]})};
  backend.rows.set('missions', clone(remote));
  const operation = {id:webcrypto.randomUUID(), expectedRevision:4, payload:{...clone(remote.payload), manualMissions:[old, pending], runeRequests:[request]}, localEditable:'TEST persisted digest'};
  const c = client(t, backend, {
    metadata:stateFor(remote, {runeProtocol:2, pendingOperation:operation}),
    state:{manualMissions:[old, pending], runeCredits:[credit], runeRequests:[request], runeSyncRequired:true}
  });
  await c.provider.start();
  const before = snapshot(c);
  await c.provider.sync();
  assert.deepEqual(snapshot(c), before);
  c.provider.reset();
  await c.provider.start();
  await c.action('disable', 'missions');
  const persisted = snapshot(c);
  const reloaded = client(t, backend, {state:persisted.state, metadata:persisted.metadata});
  await reloaded.provider.start();
  await reloaded.action('activate', 'missions');
  assert.deepEqual(snapshot(reloaded), persisted);
  assert.deepEqual(clone(reloaded.metadata.get(metadataKey).missions.pendingOperation), operation);
  assert.equal(reloaded.st.runeSyncRequired, true);
  assert.deepEqual(mutations(backend), []);
});

test('valid V2 still uses the existing RPC and durable operation before +10 / 0 / 10 confirmation', async t => {
  const backend = backendFor(), c = client(t, backend);
  backend.beforeWrite = body => {
    const pending = c.metadata.get(metadataKey).missions.pendingOperation;
    assert.equal(body.p_operation_id, pending.id);
    assert.equal(body.p_expected_revision, pending.expectedRevision);
    assert.deepEqual(body.p_payload, pending.payload);
  };
  await c.provider.start();
  assert.equal(c.window.DobbySharedRunesV2.available(), true);
  await c.action('activate', 'missions');
  for (const total of [10, 0, 10]) {
    toggle(c);
    await c.provider.sync();
    assert.equal(runes.memberSummary(members[0].id, c.st.runeCredits, c.st.runeRequests).total, total);
    assert.equal(c.st.runeRequests.length, 0);
  }
  assert.equal(c.st.runeCredits.length, 3);
  assert.equal(c.st.runeSyncRequired, true);
  assert.ok(mutations(backend).every(row => row.path === 'rpc/dobby_missions_v2_write'));
});

test('a missing writer after successful capability keeps its exact outbox and never falls back to direct writes', async t => {
  const backend = backendFor(), c = client(t, backend, {state:{runeSyncRequired:true}});
  backend.writerMissing = true;
  await c.provider.start();
  await c.action('activate', 'missions');
  const pending = clone(c.metadata.get(metadataKey).missions.pendingOperation);
  assert.ok(pending.id);
  const before = snapshot(c);
  await c.action('activate', 'missions');
  assert.deepEqual(snapshot(c), before);
  assert.deepEqual(clone(c.metadata.get(metadataKey).missions.pendingOperation), pending);
  assert.equal(backend.rows.has('missions'), false);
  const writes = mutations(backend);
  assert.equal(writes.length, 2);
  assert.ok(writes.every(row => row.path === 'rpc/dobby_missions_v2_write'));
  assert.deepEqual(writes[0].body, writes[1].body);
});

test('an auth epoch changing during grouped activation cannot open the direct V1 Missions writer', async t => {
  const backend = backendFor(), original = backend.authorized;
  let epoch = 1;
  backend.authorized = async (...args) => {
    const result = await original(...args);
    if (args[1] === 'POST' && args[3]?.module === 'menus') epoch++;
    return result;
  };
  const c = client(t, backend, {api:{connectionState:() => ({epoch, access:'verified'})}});
  await c.provider.start();
  assert.equal(c.window.DobbySharedRunesV2.available(), true);
  const localBefore = clone(c.st.manualMissions);
  await c.action('activate-all');
  assert.equal(c.window.DobbySharedRunesV2.available(), false);
  assert.equal(mutations(backend).some(row => row.body?.module === 'missions'), false);
  assert.equal(backend.rows.has('missions'), false);
  assert.deepEqual(clone(c.st.manualMissions), localBefore);
});

test('individual activation and conflict choices keep local state when their Missions read crosses an auth epoch', async t => {
  for (const action of ['activate', 'server', 'local']) {
    const backend = backendFor(), original = backend.authorized;
    let epoch = 1;
    const remote = {module:'missions', revision:4, payload:payload()};
    backend.rows.set('missions', clone(remote));
    backend.authorized = async (...args) => {
      const result = await original(...args);
      if (args[1] === 'GET' && args[2].includes('module=eq.missions')) epoch++;
      return result;
    };
    const c = client(t, backend, {
      metadata:stateFor(remote, {conflict:{remote}}),
      state:{runeSyncRequired:true, manualMissions:[mission('pilot-mission', {note:'TEST local edit'})]},
      api:{connectionState:() => ({epoch, access:'verified'})}
    });
    await c.provider.start();
    const before = snapshot(c);
    await c.action(action, 'missions');
    assert.deepEqual(snapshot(c), before, action);
    assert.deepEqual(mutations(backend), []);
    assert.equal(c.window.DobbySharedRunesV2.available(), false);
  }
});

test('group retrieval cannot replace Missions when auth changes after the Missions read but before another module returns', async t => {
  const backend = backendFor(), original = backend.authorized;
  let epoch = 1;
  const remote = {module:'missions', revision:4, payload:payload()};
  backend.rows.set('missions', clone(remote));
  backend.rows.set('contracts', {module:'contracts', revision:2, payload:{contracts:[]}});
  backend.authorized = async (...args) => {
    const result = await original(...args);
    if (args[1] === 'GET' && args[2].includes('module=eq.contracts')) {
      await new Promise(resolve => setImmediate(resolve));
      epoch++;
    }
    return result;
  };
  const c = client(t, backend, {
    metadata:[[metadataKey, {}]],
    state:{runeSyncRequired:true, manualMissions:[mission('pilot-mission', {note:'TEST local edit'})]},
    api:{connectionState:() => ({epoch, access:'verified'})}
  });
  await c.provider.start();
  const before = snapshot(c);
  await c.action('join-family');
  assert.equal(c.window.DobbySharedRunesV2.available(), false);
  assert.deepEqual(snapshot(c), before);
  assert.deepEqual(mutations(backend), []);
  assert.deepEqual(backend.rows.get('missions'), remote);
});

test('the optional pilot flag leaves native V1 compatibility available outside the pilot', async t => {
  const backend = backendFor('404'), c = client(t, backend, {window:{DobbyRunesPilot:undefined}});
  await c.provider.start();
  await c.action('activate', 'missions');
  c.st.autoTasks.push({key:'fixture-native', title:'TEST native compatibility'});
  await c.provider.sync();
  assert.deepEqual(mutations(backend).map(row => row.method), ['POST', 'PATCH']);
  assert.equal(backend.rows.get('missions').revision, 2);
});

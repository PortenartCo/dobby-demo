const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../chat-engine.js'), 'utf8');
const exchange = { id: 'fixture-exchange', input: 'Repas du soir', answer: 'Ratatouille' };

function deferred() {
  let resolve;
  const promise = new Promise(callback => { resolve = callback; });
  return { promise, resolve };
}

function fixture(restricted = false) {
  const access = { restricted, active: restricted, memberId: 'fixture-member' };
  const context = {
    userId: 'fixture-user', householdId: 'fixture-household', memberId: access.memberId, identityVerified: true
  };
  const bound = {
    ...context, verified: true, profile: { id: access.memberId, memberCategory: 'parent' }, permissions: { canEdit: true }
  };
  const state = {
    familyMembers: [{ id: access.memberId, memberCategory: 'parent' }],
    manualMissions: [{ id: 'fixture-mission', title: 'Rangement', status: 'open' }],
    shopFinal: { e072: true, items: [] }
  };
  let stored = { version: 1, owner: context.userId, rows: [exchange] };
  const calls = { meta: 0, read: 0, store: 0, actions: 0 };
  const api = {
    childAccessState: () => access,
    getContext: () => context,
    access: { state: () => bound },
    async meta() { calls.meta++; return structuredClone(stored); },
    async putMeta(_, value) { calls.store++; stored = structuredClone(value); },
    async updateMeta(_, change) { await api.beforeWrite?.promise; await api.putMeta(_, change(stored)); }
  };
  const engine = {
    win: () => ({ DobbyFamilyUI: api }),
    read: () => { calls.read++; return { state }; },
    action: () => { calls.actions++; },
    evaluate: () => ({ ids: [], titles: [] })
  };
  const window = {
    DobbyFamilyStitchEngine: engine,
    DobbyCuisineList: { snapshot: () => ({ items: [] }) }
  };
  vm.runInNewContext(source, { window });
  return { chat: window.DobbyChatEngine, api, access, calls, stored: () => stored };
}

test('child and pending access deny E02 reads and writes before touching local data', async () => {
  for (const active of [true, false]) {
    const { chat, access, calls } = fixture(true);
    access.active = active;
    const reply = await chat.reply('Quelles missions sont à faire ?');
    assert.match(reply.text, /chat|parent/i);
    assert.doesNotMatch(reply.text, /Rangement/);
    assert.equal(reply.links.length, 0);
    assert.equal((await chat.reply('acheter du pain')).pending, undefined);
    assert.throws(() => chat.current(), /chat|parent/i);
    assert.throws(() => chat.visibleHistory(), /chat|parent/i);
    await assert.rejects(chat.load(), /chat|parent/i);
    await assert.rejects(chat.append(exchange), /chat|parent/i);
    assert.deepEqual(calls, { meta: 0, read: 0, store: 0, actions: 0 });
  }
});

test('when the member becomes restricted, cached history and a prepared confirmation are unavailable', async () => {
  const { chat, access, calls } = fixture();
  assert.equal((await chat.load())[0].answer, 'Ratatouille');
  const { pending } = await chat.reply('Supprime la mission Rangement');
  assert.ok(pending);
  access.restricted = true;
  assert.throws(() => chat.visibleHistory(), /chat|parent/i);
  assert.throws(() => chat.execute(pending), /chat|parent/i);
  await assert.rejects(chat.update(exchange.id, 'Autre réponse'), /chat|parent/i);
  await assert.rejects(chat.remove(exchange.id), /chat|parent/i);
  access.restricted = false;
  assert.equal((await chat.load())[0].answer, 'Ratatouille');
  assert.throws(() => chat.execute(pending), /changé/i);
  assert.equal(calls.meta, 2);
  assert.equal(calls.actions, 0);
  assert.equal(calls.store, 0);
});

test('a late metadata read cannot populate history after role restriction', async () => {
  const { chat, api, access } = fixture();
  const pending = deferred();
  api.meta = () => pending.promise;
  const loading = chat.load();
  access.restricted = true;
  pending.resolve({ version: 1, owner: 'fixture-user', rows: [exchange] });
  await assert.rejects(loading, /chat|parent/i);
  assert.throws(() => chat.current(), /chat|parent/i);
});

test('an edit awaiting the history transaction checks access again before storing', async () => {
  const { chat, api, access, calls, stored } = fixture();
  await chat.load();
  api.beforeWrite = deferred();
  const writing = chat.update(exchange.id, 'Nouvelle réponse');
  access.restricted = true;
  api.beforeWrite.resolve();
  await assert.rejects(writing, /chat|parent/i);
  assert.equal(calls.store, 0);
  assert.equal(stored().rows[0].answer, 'Ratatouille');
});

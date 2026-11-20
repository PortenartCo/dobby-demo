import test from 'node:test';
import assert from 'node:assert/strict';
import { createHealthClient, civilDay, activeReminders } from '../health-essential.mjs';

const visit = (id, date, offset) => ({ id, date, offset, time: '', note: 'SECRET' });

test('Brussels civil day changes at midnight during both daylight-saving transitions', () => {
  assert.equal(civilDay(new Date('2026-03-28T23:00:00Z')), '2026-03-29');
  assert.equal(civilDay(new Date('2026-03-29T22:00:00Z')), '2026-03-30');
  assert.equal(civilDay(new Date('2026-10-24T22:00:00Z')), '2026-10-25');
  assert.equal(civilDay(new Date('2026-10-25T23:00:00Z')), '2026-10-26');
});

test('reminders show only the active day and one text-free card per visit and window', () => {
  const rows = [visit('a', '2026-10-26', 1), visit('a', '2026-10-26', 1),
    visit('a', '2026-10-26', 0), visit('b', '2026-10-25', 0), visit('old', '2026-10-24', 0)];
  assert.deepEqual(activeReminders(rows, new Date('2026-10-25T12:00:00Z')), [
    { id: 'a', date: '2026-10-26', offset: 1, time: '' },
    { id: 'b', date: '2026-10-25', offset: 0, time: '' }
  ]);
});

test('responses from a replaced session are rejected', async () => {
  let identity = { householdId: 'old-home', userId: 'adult', memberId: 'parent', identityVerified: true };
  let finish;
  const client = createHealthClient({
    getContext: () => identity,
    authorized: () => new Promise(resolve => { finish = resolve; }),
  });
  const old = client.read('private', 'parent');
  identity = { householdId: 'new-home', userId: 'child', memberId: 'child', identityVerified: true };
  finish([{ fields: { note: 'SECRET' } }]);
  await assert.rejects(old, /compte ou le foyer/);
});

test('child and agenda requests use the native GET transport and never name a carnet', async () => {
  const requests = [];
  const client = createHealthClient({
    getContext: () => ({ householdId: 'home', userId: 'child', memberId: 'child', identityVerified: true }),
    authorized: async (...request) => { requests.push(request); return []; },
  });
  await client.read('practical');
  await client.read('agenda');
  assert.deepEqual(requests, [
    ['GET', 'rpc/dobby_health_read?p_household_id=home&p_view=practical'],
    ['GET', 'rpc/dobby_health_read?p_household_id=home&p_view=agenda']
  ]);
  await assert.rejects(client.read('practical', 'another-child'), /Carnet/);
});

test('a conflict on upload does not confirm bytes from a previous file', async () => {
  const home = '00000000-0000-4000-8000-000000000101';
  const id = '00000000-0000-4000-8000-000000000503';
  const path = home + '/' + id + '.pdf';
  const file = new Blob(['%PDF-1.4 TEST'], { type: 'application/pdf' });
  const actions = [];
  const client = createHealthClient({
    getContext: () => ({ householdId: home, userId: 'parent', memberId: 'parent-a', identityVerified: true }),
    authorized: async (method, query, data) => {
      assert.equal(method, 'POST');
      assert.equal(query, 'rpc/dobby_health_write');
      actions.push([data.p_action, data.p_revision]);
      return { id, path, revision: data.p_revision + 1 };
    }
  }, {
    upload: async (key, data) => {
      assert.equal(key, path);
      assert.equal(data, file);
      actions.push(['upload']);
      throw Object.assign(Error('Duplicate'), { status: 409 });
    },
    download: async key => { assert.equal(key, path); return file; }
  });
  await assert.rejects(client.upload('parent-a', file, null, 'TEST document', { id }), { status: 409 });
  assert.deepEqual(actions, [['save', 0], ['upload']]);
  const result = await client.finalize('parent-a', { id, revision: 1 });
  assert.equal(result.revision, 2);
  assert.deepEqual(actions, [['save', 0], ['upload'], ['finalize', 1]]);
  assert.equal(await client.download({ path, fields: { ready: true, mime: file.type } }), file);
  await assert.rejects(client.download({ path, fields: { ready: false, mime: file.type } }), /indisponible/);
});

test('a session replacement prevents a file response from reaching the view', async () => {
  const home = '00000000-0000-4000-8000-000000000101';
  const id = '00000000-0000-4000-8000-000000000503';
  let resolve;
  let epoch = 1;
  const client = createHealthClient({
    getContext: () => ({ householdId: home, userId: 'parent', memberId: 'parent-a', identityVerified: true }),
    connectionState: () => ({ epoch })
  }, {
    upload: () => {},
    download: () => new Promise(done => { resolve = done; })
  });
  const row = { path: home + '/' + id + '.pdf', fields: { ready: true, mime: 'application/pdf' } };
  const old = client.download(row);
  epoch++;
  resolve(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
  await assert.rejects(old, /compte ou le foyer/);
});

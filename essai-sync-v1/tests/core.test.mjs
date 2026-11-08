import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newLocal, editLocal, mergeRemote, sameFields, afterPush,
  resolveConflict, toServerPayload
} from '../core.mjs';

const T0 = '2026-11-08T13:00:00.000Z';
const T1 = '2026-11-08T13:01:00.000Z';
const remote = (opts = {}) => ({
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Lait', quantity: 1, unit: 'L', checked: false,
  created_at: T0, updated_at: T0, deleted_at: null,
  revision: 1, ...opts
});

test('new entry is pending and preserves a stable UUID', () => {
  const x = newLocal(remote().id, 'Lait', 1, 'L', T0);
  assert.equal(x.baseRevision, 0);
  assert.equal(x.syncState, 'pending');
  assert.equal(x.id, remote().id);
});

test('equivalent server echo resolves an uncertain successful POST', () => {
  const x = newLocal(remote().id, 'Lait', 1, 'L', T0);
  const updated = mergeRemote(x, remote());
  assert.equal(updated.syncState, 'clean');
  assert.equal(updated.baseRevision, 1);
});

test('editing an unchanged server revision remains pending', () => {
  const clean = mergeRemote(null, remote());
  const updated = editLocal(clean, {checked: true}, T1);
  const merged = mergeRemote(updated, remote());
  assert.equal(merged.checked, true);
  assert.equal(merged.syncState, 'pending');
});

test('simultaneous edits require a decision, never auto overwrite', () => {
  const base = mergeRemote(null, remote());
  const local = editLocal(base, {checked: true}, T1);
  const newer = remote({ title: 'Lait entier', revision: 2 });
  const merged = mergeRemote(local, newer);
  assert.equal(merged.syncState, 'conflict');
  assert.equal(merged.checked, true);
  assert.equal(merged.remoteShadow.revision, 2);
});

test('resolve conflict with server version', () => {
  const base = mergeRemote(null, remote());
  const conflict = mergeRemote(editLocal(base, {checked: true}, T1), remote({revision: 2, title:'Lait entier'}));
  const chosen = resolveConflict(conflict, 'server');
  assert.equal(chosen.title, 'Lait entier');
  assert.equal(chosen.checked, false);
  assert.equal(chosen.syncState, 'clean');
});

test('resolve conflict with local version creates pending update against new revision', () => {
  const base = mergeRemote(null, remote());
  const conflict = mergeRemote(editLocal(base, {checked: true}, T1), remote({revision: 2, title:'Lait entier'}));
  const chosen = resolveConflict(conflict, 'local');
  assert.equal(chosen.baseRevision, 2);
  assert.equal(chosen.checked, true);
  assert.equal(chosen.syncState, 'pending');
});

test('new edit during an in-flight update remains pending with new server revision', () => {
  const base = mergeRemote(null, remote());
  const firstEdit = editLocal(base, {checked: true}, T1);
  const secondEdit = editLocal(firstEdit, {quantity: 3}, T1);
  const committed = afterPush(secondEdit, firstEdit, remote({checked:true, revision: 2}));
  assert.equal(committed.quantity, 3);
  assert.equal(committed.baseRevision, 2);
  assert.equal(committed.syncState, 'pending');
});

test('soft deletion is part of the synchronized state', () => {
  const base = mergeRemote(null, remote());
  const deleted = editLocal(base, {deleted_at: T1}, T1);
  assert.equal(toServerPayload(deleted).deleted_at, T1);
  assert.equal(sameFields(deleted, remote({...toServerPayload(deleted), revision: 2})), true);
});

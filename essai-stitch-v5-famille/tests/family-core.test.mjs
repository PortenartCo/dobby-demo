import test from 'node:test';
import assert from 'node:assert/strict';
import { newLocal, cleanFromRemote, toServerPayload, comparable, sameFields, mergeRemote, editLocal, resolveConflict, afterPush } from '../family-core.mjs';
const stamp = '2026-11-08T12:00:00Z';
const row = { id:'00000000-0000-4000-8000-000000000001', title:'Lait',quantity:1,unit:'L',checked:false,created_at:stamp,updated_at:stamp,deleted_at:null,revision:1 };

test('create and CAS transition', () => {
 const x=newLocal(row.id,'Lait',1,'L',stamp);
 assert.equal(x.baseRevision,0);
 assert.equal(x.syncState,'pending');
 const done=mergeRemote(x,row);
 assert.equal(done.syncState,'clean');
});
test('offline edit is pending until remote acknowledges', () => {
 const base=cleanFromRemote(row);
 const changed=editLocal(base,{checked:true},stamp);
 assert.equal(mergeRemote(changed,row).syncState,'pending');
 const result=afterPush(changed,changed,{...row,checked:true,revision:2});
 assert.equal(result.syncState,'clean');
});
test('independent updates never silently overwrite', () => {
 const base=cleanFromRemote(row);
 const conflict=mergeRemote(editLocal(base,{title:'Lait demi-écrémé'},stamp),{...row,revision:2,title:'Lait entier'});
 assert.equal(conflict.syncState,'conflict');
 assert.equal(resolveConflict(conflict,'server').title,'Lait entier');
 assert.equal(resolveConflict(conflict,'local').syncState,'pending');
});
test('unknown quantity is not silently converted into 0 or 1', () => {
 const x=newLocal(row.id,'Sel',null,'',stamp);
 assert.equal(x.quantity,null);
 assert.equal(toServerPayload(x).quantity,null);
 const server=cleanFromRemote({...row,quantity:null});
 assert.equal(server.quantity,null);
 assert.equal(comparable(server).quantity,null);
 assert.ok(sameFields(server,{...server}));
});
test('logical deletion preserved', () => {
 const x=editLocal(cleanFromRemote(row),{deleted_at:stamp},stamp);
 assert.equal(toServerPayload(x).deleted_at,stamp);
});

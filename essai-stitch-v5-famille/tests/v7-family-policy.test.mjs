import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const realm={window:{}};
for(const file of ['family-profile.js','family-member-policy.js'])vm.runInNewContext(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),realm);
const P=realm.window.DobbyFamilyMemberPolicy,M=realm.window.DobbyMagicIdentity;
const members=[{id:'p',memberCategory:'parent'},{id:'q',memberCategory:'parent'},{id:'c',name:'TEST Child',memberCategory:'child'},{id:'pet',memberCategory:'pet'}];
const demo={demo:true,actorId:'p',members};
test('F07 pets have no magical capability even when a parent accompanies them',()=>{
 assert.equal(P.permissions(members[3],demo).canMagic,false);
 assert.throws(()=>P.assertWrite(members[3],{magicHouseId:'ravenclaw'},demo,{magicResult:true}),/animal|gardien/i);
});
test('F09 demo parent manages all members of the current registry',()=>{
 assert.equal(P.permissions(members[1],demo).canEdit,true);
 assert.equal(P.permissions({id:'foreign',memberCategory:'child'},demo).canEdit,false);
});
test('F09 verified child cannot obtain identity writes from permissive client grants',()=>{
 const c={verified:true,userId:'test-user',householdId:'test-home',actorId:'c',memberCategory:'child',members,permissions:{canEdit:true,canCreate:true,canManageDependents:true,canMagic:true}};
 const own=P.permissions(members[2],c);assert.equal(own.canEdit,false);assert.equal(own.canCreate,false);assert.equal(own.canMagic,true);
 assert.equal(P.permissions(members[0],c).canMagic,false);
});
test('F07 breed persists without replacing existing profile data',()=>{
 const row=P.prepare({id:'pet',name:'TEST Cat',memberCategory:'pet',opaque:{keep:true}},{breed:' Européen ',species:'Chat'},M.patch);
 assert.equal(row.breed,'Européen');assert.equal(row.opaque.keep,true);
 assert.throws(()=>P.prepare(row,{breed:'x'.repeat(81)},M.patch),/breed/);
});

test('reserves: verified member form rights use canonical category, never a promoted or stale actor snapshot',()=>{
 const grants={canEdit:true,canCreate:true,canManageDependents:true,canMagic:true},base={verified:true,userId:'TEST-U',householdId:'TEST-H',actorId:'c',permissions:grants};
 const promoted=members.map(m=>m.id==='c'?{...m,memberCategory:'parent'}:m),own=promoted.find(m=>m.id==='c');
 const child=P.permissions(own,{...base,memberCategory:'child',members:promoted});assert.equal(child.canEdit,false);assert.equal(child.canCreate,false);assert.equal(child.canMagic,true);
 const parent=P.permissions(members[2],{...base,memberCategory:'parent',members});assert.equal(parent.canEdit,true);assert.equal(parent.canCreate,true);
 for(const memberCategory of [undefined,'unknown']){const missing=P.permissions(own,{...base,memberCategory,members:promoted});assert.equal(missing.canEdit,false);assert.equal(missing.canCreate,false);assert.equal(missing.canMagic,false);}
});

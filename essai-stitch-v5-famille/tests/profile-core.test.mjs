import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as R from '../family-runes-core.mjs';
const file=new URL('../family-profile.js',import.meta.url);
const load=()=>{const c={window:{}};if(fs.existsSync(file))vm.runInNewContext(fs.readFileSync(file,'utf8'),c);return c.window.DobbyMagicIdentity;};
test('E05 catalogues have stable French identities without inferring a house or a member',()=>{
 const P=load();assert.ok(P,'Shared identity catalogue is available');
 assert.deepEqual(Array.from(P.houses,x=>x.id),['gryffindor','slytherin','ravenclaw','hufflepuff']);
 assert.deepEqual(Array.from(P.patronuses,x=>x.name),['Cerf','Loutre','Renard','Loup','Chat','Hibou','Cheval','Lièvre','Cygne','Lynx','Blaireau','Dauphin']);
 assert.equal(new Set(P.avatars.map(a=>a.id)).size,8);assert.equal(P.linkedMember([{id:'a'}],{userId:'u'}),null);
});
test('partial native profile patch preserves unknown fields, emoji, identity, and unrelated rewards',()=>{
 const P=load();assert.ok(P,'Shared profile patch exists');
 const prior={id:'a',name:'TEST',avatar:'🌿',futureField:{x:1},magicProfile:{version:1,houseId:'slytherin',patronusId:'otter',extra:'future'}};
 const result=P.patch(prior,{magicPatronusId:'lynx'});assert.equal(result.id,'a');assert.equal(result.avatar,'🌿');assert.equal(result.magicProfile.houseId,'slytherin');assert.equal(result.magicProfile.patronusId,'lynx');assert.equal(result.magicProfile.extra,'future');assert.equal(prior.magicProfile.patronusId,'otter');
 assert.deepEqual(JSON.parse(JSON.stringify(P.patch(prior,{}))),prior);
 assert.throws(()=>P.patch(prior,{magicHouseId:'wrong'}),/Maison/);assert.throws(()=>P.patch(prior,{magicAvatarId:'https://example.test/private.jpg'}),/avatar/i);
 assert.throws(()=>P.patch({...prior,magicProfile:{version:2}},{magicHouseId:'gryffindor'}),/version/i);
 assert.equal(P.patch(prior,{magicHouseId:''}).magicProfile.houseId,'');
});
test('E05 approves the exact E04 thresholds without changing reward values',()=>{
 assert.equal(R.GRADE_CONFIG.provisional,false);assert.deepEqual(R.GRADE_CONFIG.levels.map(l=>l.threshold),[0,50,100,200,350,550,800,1100,1500,2000,2600,3300]);assert.deepEqual(R.EFFORTS.map(e=>e.amount),[10,25,50]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBackend,makeClient} from './helpers/modules-harness.mjs';
const member={id:'test-member',name:'TEST — Membre',avatar:'🌿',magicProfile:{version:1,houseId:'slytherin',patronusId:'otter',avatarId:'portrait-1',future:'kept'}};
async function setup(t){const backend=makeBackend(),a=makeClient('a',backend),b=makeClient('b',backend);t.after(()=>{a.provider.reset();b.provider.reset();});a.st.familyMembers=[structuredClone(member)];await a.provider.start();await a.action('activate','family');await b.provider.start();await b.action('activate','family');return{backend,a,b};}
for(const choice of ['server','local'])test('family profile revision conflict retains the explicitly chosen version: '+choice,async t=>{
 const {backend,a,b}=await setup(t);a.st.familyMembers[0].magicProfile.houseId='ravenclaw';b.st.familyMembers[0].magicProfile.patronusId='lynx';await a.provider.sync();await b.provider.sync();assert.match(b.provider.html(),/Conflit/);await b.action(choice,'family');await a.provider.sync();
 const expected={...member.magicProfile,...(choice==='server'?{houseId:'ravenclaw'}:{patronusId:'lynx'})};assert.deepEqual(backend.rows.get('family').payload.familyMembers[0].magicProfile,expected);assert.equal(JSON.stringify(a.st.familyMembers),JSON.stringify(b.st.familyMembers));assert.equal(a.st.familyMembers[0].id,member.id);
});
test('native family sync preserves fields through reload and does not include medical records or rewards',async t=>{
 const {backend,a}=await setup(t);const reloaded=makeClient('a',backend,false,true,{state:structuredClone(a.st),metadata:[...a.metadata.entries()]});t.after(()=>reloaded.provider.reset());await reloaded.provider.start();await reloaded.provider.sync();assert.deepEqual(reloaded.st.familyMembers[0],member);const json=JSON.stringify(backend.rows.get('family').payload);assert.doesNotMatch(json,/medical-1|runeCredits|runeRequests/);
});
test('LIMIT demonstrated: an old member writer can erase identity extensions server-side',async t=>{
 const {backend,a}=await setup(t);const row=backend.rows.get('family');row.payload.familyMembers=row.payload.familyMembers.map(({id,name,avatar})=>({id,name,avatar}));row.revision++;await a.provider.sync();assert.equal(a.st.familyMembers[0].magicProfile,undefined,'Existing sync cannot restore unknown fields erased by an old writer. Compatibility is NOT delivered.');
});

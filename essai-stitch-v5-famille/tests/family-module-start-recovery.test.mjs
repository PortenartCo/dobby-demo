import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBackend,makeClient,HH} from './helpers/modules-harness.mjs';

const USER='parent-a',MEMBER='canonical-parent';
// An acknowledged, extensible snapshot as stored by the native module adapter.
const acknowledged='{"famContacts":[],"famLists":[],"familyEventPreparations":[],"familyEvents":[],"familyMembers":[{"id":"canonical-parent","memberCategory":"parent","name":"TEST Parent"}],"familyNotesVersion":1,"familyPreparationTemplates":[],"familyPreparationsVersion":1,"sharedFamilyNotes":[],"sharedHealthVisits":[]}';
const payload=JSON.parse(acknowledged);
const remembered={family:{active:true,revision:4,synced:acknowledged,conflict:false,familyProtocol:true,preparationsProtocol:true},missions:{active:false,pendingOperation:{id:'persisted-operation',opaque:{retain:true}}}};

test('a module start interrupted before hydration restores acknowledged state and pending operations on retry',async t=>{
 for(const interruption of ['membership-check','canonical-member'])await t.test(interruption,async t=>{
  const backend=makeBackend();backend.rows.set('family',{household_id:HH,module:'family',revision:4,payload:structuredClone(payload)});
  let verifying=false,canonicalMember=null,release,entered,reads=0;
  const gate=new Promise(resolve=>{release=resolve;}),reading=new Promise(resolve=>{entered=resolve;});
  const metadataKey='v2-module-state:'+USER+'|'+HH;
  const client=makeClient(USER,backend,false,true,{state:structuredClone(payload),metadata:[[metadataKey,structuredClone(remembered)]],api:{
   getContext:()=>({userId:USER,householdId:HH,...(canonicalMember?{memberId:canonicalMember}:{})}),
   connectionState:()=>({verified:true,verifying,epoch:1}),
   meta:async key=>{assert.equal(key,metadataKey);reads++;if(reads===1){entered();await gate;}return structuredClone(remembered);}
  }});t.after(()=>client.provider.reset());
  const initial=client.provider.start();await reading;
  if(interruption==='membership-check')verifying=true;else canonicalMember=MEMBER;
  release();await initial;
  assert.equal(backend.journal.length,0,'An invalidated restoration does not query or adopt the household');
  assert.equal(client.provider.isConfigured('family'),false);
  verifying=false;await client.provider.start();
  assert.equal(client.provider.isConfigured('family'),true,'Retry restores the acknowledged shared family');
  assert.equal(reads,2,'Retry must restore the metadata whose first read was invalidated');
  await client.provider.adoptVerifiedFamily({userId:USER,householdId:HH,memberId:MEMBER,identityVerified:true});
  assert.deepEqual(JSON.parse(JSON.stringify(client.metadata.get(metadataKey).missions)),remembered.missions,'Family adoption cannot discard a persisted mission operation');
  assert.equal(backend.journal.some(entry=>entry.method!=='GET'),false);
  assert.equal(backend.rows.get('family').revision,4);
  assert.deepEqual(JSON.parse(JSON.stringify(client.st.familyMembers)),payload.familyMembers);
 });
});

test('an old module-state read cannot replace the next actor restoration',async t=>{
 const backend=makeBackend();let user=USER,epoch=1,release,entered;
 const gate=new Promise(resolve=>{release=resolve;}),reading=new Promise(resolve=>{entered=resolve;});
 const client=makeClient(USER,backend,false,true,{api:{
  getContext:()=>({userId:user,householdId:HH}),connectionState:()=>({verified:true,verifying:false,epoch}),
  meta:async key=>{if(key==='v2-module-state:'+USER+'|'+HH){entered();await gate;return structuredClone(remembered);}assert.equal(key,'v2-module-state:parent-b|'+HH);return{family:{active:false}};}
 }});t.after(()=>client.provider.reset());
 const old=client.provider.start();await reading;user='parent-b';epoch++;
 await client.provider.start();release();await old;
 assert.equal(client.provider.isConfigured('family'),false);
 assert.equal(client.changes,0);assert.equal(client.metadata.size,0);
});

test('a late same-actor module-state read cannot replace a completed restoration or adoption',async t=>{
 const backend=makeBackend();backend.rows.set('family',{household_id:HH,module:'family',revision:4,payload:structuredClone(payload)});
 let reads=0,release,entered;
 const gate=new Promise(resolve=>{release=resolve;}),reading=new Promise(resolve=>{entered=resolve;});
 const client=makeClient(USER,backend,false,true,{state:structuredClone(payload),api:{
  connectionState:()=>({verified:true,verifying:false,epoch:1}),
  meta:async()=>{reads++;if(reads===1){entered();await gate;return{missions:{active:false,pendingOperation:{id:'old-operation'}}};}return structuredClone(remembered);}
 }});t.after(()=>client.provider.reset());
 const old=client.provider.start();await reading;await client.provider.start();
 await client.provider.adoptVerifiedFamily({userId:USER,householdId:HH,memberId:MEMBER,identityVerified:true});
 release();await old;
 assert.equal(client.provider.isConfigured('family'),true,'The completed adoption survives the earlier metadata response');
 await client.provider.adoptVerifiedFamily({userId:USER,householdId:HH,memberId:MEMBER,identityVerified:true});
 assert.deepEqual(JSON.parse(JSON.stringify(client.metadata.get('v2-module-state:'+USER+'|'+HH).missions)),remembered.missions);
 assert.equal(backend.journal.some(entry=>entry.method!=='GET'),false);
});

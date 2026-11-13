import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import * as intents from '../family-mission-intents.mjs';
import * as R from '../family-runes-core.mjs';
import {makeBackend,makeClient,HH} from './helpers/modules-harness.mjs';
const clone=value=>structuredClone(value);
const capability={protocol:3,intentVersion:1,participantVersion:1,ledgerVersions:[1,2,3],maxPayloadBytes:262144,directWritesBlocked:true,atomicAllocations:true,canonicalAuthorization:true,contract:'dobby-missions-intents-v3-1'};
const members=[{id:'a',memberCategory:'parent'},{id:'b',memberCategory:'child'}];
const mission={id:'v3-test',title:'TEST — Native intent',category:'Famille',status:'open',effort:'regular',rewardVersion:1,participantVersion:1,assigneeIds:['a','b'],allFamily:false,due:''};
function setup({verifiedRelease=true,sendHook}={}){
 const backend=makeBackend(),normal=backend.authorized,receipts=new Map(),writes=[];
 backend.rows.set('missions',{module:'missions',revision:4,payload:{autoTasks:[],manualMissions:[clone(mission)],runeCredits:[],runeRequests:[],runeLedgerVersion:2,extension:{keep:'TEST-extension'}}});
 let client,context={userId:'account-a',householdId:HH,memberId:'a',identityVerified:true,permissions:{canEdit:true}};
 backend.authorized=async(user,method,path,body)=>{
  if(path.startsWith('rpc/dobby_missions_v3_capabilities'))return capability;
  if(path.startsWith('rpc/dobby_missions_v2_capabilities'))return{protocol:2,maxPayloadBytes:262144,directWritesBlocked:true};
  if(path==='rpc/dobby_missions_v3_write'){
   writes.push(clone(body));assert.ok([...client.metadata.values()].some(value=>value?.id===body.p_operation_id),'durable queue before native HTTP');
   const old=backend.rows.get('missions');let receipt=receipts.get(body.p_operation_id);
   if(!receipt){
    if(body.p_expected_revision!==old.revision)throw Object.assign(Error('TEST — displayed revision is stale'),{code:'40001'});const next=clone(old);next.revision++;
    if(body.p_intent.kind==='complete'){
     const current=next.payload.manualMissions.find(row=>row.id===body.p_intent.missionId),events=R.completionRequests(current,members,body.p_intent.participantIds,next.payload.runeCredits,[],'2026-11-13T12:00:00Z');
     next.payload.runeCredits.push(...events.map(row=>({...row,revision:next.revision})));current.status='done';current.participants=clone(body.p_intent.participantIds);
    }else if(body.p_intent.kind==='snapshot'){next.payload={...next.payload,...clone(body.p_intent.payload)};}
    next.payload.runeLedgerVersion=3;backend.rows.set('missions',next);receipt={id:body.p_operation_id,revision:next.revision,changed:true,digest:'a'.repeat(64)};receipts.set(body.p_operation_id,receipt);
   }
   const response={protocol:3,replayed:writes.filter(row=>row.p_operation_id===body.p_operation_id).length>1,operation:receipt,module:clone(backend.rows.get('missions'))};
   return sendHook?sendHook(response,body):response;
  }
  return normal(user,method,path,body);
 };
 client=makeClient('account-a',backend,false,true,{crypto:webcrypto,state:{familyMembers:clone(members)},window:{DobbyMissionIntentsReady:Promise.resolve({...intents,MISSION_V3_RELEASE_VERIFIED:verifiedRelease})},api:{
  getContext:()=>clone(context),
  updateMeta:async(key,update)=>{const value=update(client.metadata.get(key)||null);client.metadata.set(key,clone(value));return clone(value);}
 }});
 return{client,backend,writes,setContext:value=>{context={...context,...value};}};
}
test('native provider keeps shipped V3 gate closed despite an advertised compatible backend',async t=>{
 const h=setup({verifiedRelease:false});t.after(()=>h.client.provider.reset());await h.client.provider.start();assert.equal(h.client.window.DobbySharedRunesV3.available(),false);await assert.rejects(()=>h.client.window.DobbySharedRunesV3.complete('v3-test',['a','b']),/validation serveur/i);assert.equal(h.writes.length,0);
});
test('native provider uses only the V3 intent endpoint and preserves extension plus atomic allocation',async t=>{
 const h=setup();t.after(()=>h.client.provider.reset());await h.client.provider.start();await h.client.action('activate','missions');assert.equal(h.client.window.DobbySharedRunesV3.available(),true);
 await h.client.window.DobbySharedRunesV3.complete('v3-test',['b','a']);assert.equal(h.writes.length,1);assert.deepEqual(h.writes[0].p_intent,{kind:'complete',missionId:'v3-test',participantIds:['a','b']});
 assert.equal(h.client.st.manualMissions[0].status,'done');assert.deepEqual(clone(h.client.st.runeCredits[0].allocations),[{memberId:'a',amount:13},{memberId:'b',amount:12}]);assert.equal(h.backend.rows.get('missions').payload.extension.keep,'TEST-extension');assert.equal(h.client.window.DobbySharedRunesV2.available(),false);
});
test('native V3 retries exact lost response and ignores a receipt after provider reset',async t=>{
 let lost=true;const h=setup({sendHook:response=>{if(lost){lost=false;throw Error('network response lost');}return response;}});t.after(()=>h.client.provider.reset());await h.client.provider.start();await h.client.action('activate','missions');
 await assert.rejects(()=>h.client.window.DobbySharedRunesV3.complete('v3-test',['a','b']),/network/);const before=clone(h.writes[0]);await h.client.provider.sync();assert.deepEqual(h.writes[1],before);assert.equal(h.client.st.runeCredits.length,1);
 const stale=setup({sendHook:response=>{stale.client.provider.reset();return response;}});t.after(()=>stale.client.provider.reset());await stale.client.provider.start();await stale.client.action('activate','missions');const initial=clone(stale.client.st);
 await assert.rejects(()=>stale.client.window.DobbySharedRunesV3.complete('v3-test',['a','b']),/validation serveur|contexte/i);assert.deepEqual(clone(stale.client.st),initial);
});
test('native completion uses the displayed reward revision and never rebases to a peer change',async t=>{
 const h=setup();t.after(()=>h.client.provider.reset());await h.client.provider.start();await h.client.action('activate','missions');
 const server=h.backend.rows.get('missions');server.revision=5;server.payload.manualMissions[0].effort='major';
 await assert.rejects(()=>h.client.window.DobbySharedRunesV3.complete('v3-test',['a','b']),/revision is stale/);
 assert.equal(h.writes[0].p_expected_revision,4);assert.equal(h.backend.rows.get('missions').payload.runeCredits.length,0);assert.equal(h.client.st.manualMissions[0].effort,'regular');assert.equal(h.client.st.manualMissions[0].status,'open');
 const pending=[...h.client.metadata.values()].find(value=>value?.protocol===3&&value?.intent);assert.equal(pending.rejection.code,'40001');assert.equal(pending.expectedRevision,4);
});
test('a new credit extension remains raw and does not falsely mark V3 history incompatible',async t=>{
 const h=setup({sendHook:response=>{response.module.payload.runeCredits[0].extension={keep:true};return response;}});t.after(()=>h.client.provider.reset());await h.client.provider.start();await h.client.action('activate','missions');
 await h.client.window.DobbySharedRunesV3.complete('v3-test',['a','b']);assert.deepEqual(clone(h.client.st.runeCredits[0].extension),{keep:true});assert.doesNotMatch(h.client.provider.statusFor('missions'),/Historique.*vérifier|bloqué/);assert.equal(h.client.window.DobbySharedRunesV3.summary('a').total,13);assert.deepEqual(clone(h.client.st.runeCredits[0].extension),{keep:true});
});

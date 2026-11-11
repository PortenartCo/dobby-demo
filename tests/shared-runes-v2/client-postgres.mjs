/* Run: node --test tests/shared-runes-v2/client-postgres.mjs
 * Native family-modules.js in independent VMs -> actual isolated PostgreSQL.
 * Auth UUID claims are fixture inputs, not a Supabase Auth integration test. */
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import * as R from '../../essai-stitch-v5-famille/family-runes-core.mjs';
import * as M from '../../essai-stitch-v5-famille/family-missions-core.mjs';
import {makeClient} from '../../essai-stitch-v5-famille/tests/helpers/modules-harness.mjs';
import {setup,freshHousehold,snapshot,transport,users,database} from './client-postgres-harness.mjs';

const repo=resolve(import.meta.dirname,'../..'),date='2026-11-11T12:00:00.000Z';
const sourceFiles=['essai-stitch-v5-famille/family-modules.js','essai-stitch-v5-famille/family-runes-core.mjs','essai-stitch-v5-famille/family-missions-core.mjs','sql-proposals/dobby-shared-runes-v2.sql'];
const sourceSha256=Object.fromEntries(sourceFiles.map(file=>[file,createHash('sha256').update(readFileSync(resolve(repo,file))).digest('hex')]));
const members=[{id:'member-a'},{id:'member-b'}],clone=value=>JSON.parse(JSON.stringify(value));
const records=[];let environment;
const mission=(id,changes={})=>({id,title:'TEST ONLY — '+id,status:'open',assigneeId:'member-a',effort:'regular',rewardVersion:1,category:'Famille',due:'',note:'',...changes});
function complete(client,id,at=date){
  const row=client.st.manualMissions.find(m=>m.id===id);
  assert.ok(row,'Native mission exists');
  const request=R.completionRequest(row,members,client.st.runeCredits||[],client.st.runeRequests||[],at);
  client.st.manualMissions=client.st.manualMissions.map(m=>m.id===id?{...m,status:'done',completedAt:at}:m);
  if(request)client.st.runeRequests=[...(client.st.runeRequests||[]),request];
  return request;
}
function reopen(client,id,at=date){
  const row=client.st.manualMissions.find(m=>m.id===id);
  const request=R.reopeningRequest(row,client.st.runeCredits||[],client.st.runeRequests||[],at);
  assert.ok(request,'Native reversal exists');
  client.st.manualMissions=client.st.manualMissions.map(m=>m.id===id?{...m,status:'open',completedAt:''}:m);
  client.st.runeRequests=[...(client.st.runeRequests||[]),request];return request;
}
const grants=state=>state.module.payload.runeCredits;
const total=(client,id='member-a')=>R.memberSummary(id,client.st.runeCredits||[],client.st.runeRequests||[]).total;
function nativeClient(uid,backend,household,{state={},metadata=[],rejectMeta=()=>false}={}){
  const store=new Map(metadata),messages=[];let writes=0;
  const client=makeClient(uid,backend,false,true,{crypto:webcrypto,state:{runeCredits:[],runeRequests:[],familyMembers:members,...clone(state)},api:{
    getContext:()=>({userId:uid,householdId:household}),
    meta:async key=>clone(store.get(key)||{}),
    putMeta:async(key,value)=>{writes++;if(rejectMeta(value,writes))throw Error('TEST metadata store refused');store.set(key,clone(value));},
    showMessage:message=>messages.push(message)
  }});
  return Object.assign(client,{persisted:store,messages,key:'v2-module-state:'+uid+'|'+household});
}
const meta=client=>client.persisted.get(client.key)?.missions;
async function household(t,rows){
  const id=await freshHousehold(),backend=transport(id),a=nativeClient(users.a,backend,id,{state:{manualMissions:rows}}),b=nativeClient(users.b,backend,id);
  t.after(()=>{a.provider.reset();b.provider.reset();});
  await a.provider.start();assert.equal(a.window.DobbySharedRunesV2.available(),true);
  await a.action('activate','missions');assert.equal(a.provider.isActive('missions'),true,a.messages.join('\n'));
  await b.provider.start();await b.action('activate','missions');assert.equal(b.provider.isActive('missions'),true,b.messages.join('\n'));
  return{id,backend,a,b};
}
function scenario(name,fn){test(name,{concurrency:false},async t=>{
  const record={name,status:'running'};records.push(record);
  try{await fn(t,record);record.status='passed';}catch(error){record.status='failed';record.error=error.stack;throw error;}
});}
before(()=>{environment=setup();});
after(()=>{
  const output=resolve(repo,'docs/dobby-v7/evidence/shared-runes-v2/client-postgres');mkdirSync(output,{recursive:true});
  const sourceUnchanged=sourceFiles.every(file=>createHash('sha256').update(readFileSync(resolve(repo,file))).digest('hex')===sourceSha256[file]);
  writeFileSync(resolve(output,'results.json'),JSON.stringify({generatedAt:new Date().toISOString(),command:'node --test tests/shared-runes-v2/client-postgres.mjs',environment:environment||{database},sourceSha256,sourceUnchanged,scope:'Actual PostgreSQL SQL, locks, constraints and transactions; two independent native client VMs. REST transport and UUID auth claims are local fixtures, not PostgREST/JWT or real-account validation.',passed:records.filter(r=>r.status==='passed').length,failed:records.filter(r=>r.status==='failed').length,scenarios:records},null,2)+'\n');
  assert.equal(sourceUnchanged,true,'Source files changed during the evidence run; rerun on a stable patch');
});

scenario('native grant/reversal/custom reward edits keep the confirmed historical beneficiary and zero is active',async(t,record)=>{
  const {id,a,b,backend}=await household(t,[mission('normal'),mission('custom',{customRunes:37}),mission('zero',{customRunes:0})]);
  complete(a,'normal');complete(a,'custom');complete(a,'zero');
  assert.equal(total(a),0,'No local confirmation before SQL');await a.provider.sync();await b.provider.sync();
  let state=await snapshot(id);assert.equal(grants(state).length,3);assert.equal(total(a),62);assert.equal(total(b),62);
  const historic=clone(grants(state));assert.equal(R.activeCredits(grants(state)).find(x=>x.missionId==='zero').amount,0);
  a.st.manualMissions=a.st.manualMissions.map(m=>m.id==='custom'?{...m,assigneeId:'member-b',effort:'light',customRunes:11}:m);
  await a.provider.sync();assert.equal(total(a),62);assert.equal(total(a,'member-b'),0,'Confirmed award is not reassigned');
  const reverse=reopen(a,'custom');assert.equal(reverse.memberId,'member-a');assert.equal(reverse.amount,37);
  reopen(a,'zero');await a.provider.sync();assert.equal(total(a),25);
  complete(a,'custom');complete(a,'zero');await a.provider.sync();await b.provider.sync();
  state=await snapshot(id);assert.equal(total(a,'member-b'),11);assert.equal(total(b,'member-b'),11);assert.equal(total(a),25);
  for(const credit of historic)assert.deepEqual(grants(state).find(x=>R.eventKey(x)===R.eventKey(credit)),credit);
  assert.equal(R.activeCredits(grants(state)).filter(x=>x.missionId==='zero').length,1);
  assert.equal(backend.journal.some(x=>['PATCH','POST'].includes(x.method)&&!x.path.startsWith('rpc/')),false,'Native client exclusively uses RPC for Missions writes');
  record.evidence={revision:state.module.revision,credits:grants(state).length,receipts:state.receipts.length,totals:{a:total(a),b:total(a,'member-b')},zeroActive:true};
});

scenario('two native clients completing distinct missions rebase per mission without restoring an already completed row',async(t,record)=>{
  const {id,a,b}=await household(t,[mission('distinct-a',{effort:'light'}),mission('distinct-b',{assigneeId:'member-b',effort:'major'})]);
  complete(a,'distinct-a');complete(b,'distinct-b');await a.provider.sync();await b.provider.sync();await a.provider.sync();
  const state=await snapshot(id);assert.equal(grants(state).length,2);assert.equal(total(a),10);assert.equal(total(b,'member-b'),50);
  assert.ok(state.module.payload.manualMissions.every(m=>m.status==='done'));assert.equal(a.st.runeRequests.length,0);assert.equal(b.st.runeRequests.length,0);
  assert.equal(a.provider.statusFor('missions'),'Partagé · à jour');assert.equal(b.provider.statusFor('missions'),'Partagé · à jour');
  record.evidence={revision:state.module.revision,credits:2,missionStatuses:state.module.payload.manualMissions.map(m=>[m.id,m.status])};
});

scenario('actual concurrent SQL CAS loss is retained and explicit native resolution converges without a duplicate grant',async(t,record)=>{
  const {id,a,b,backend}=await household(t,[mission('concurrent')]);
  complete(a,'concurrent');complete(b,'concurrent','2026-11-11T12:00:01.000Z');
  let arrivals=0,release;const bothRead=new Promise(resolve=>release=resolve);
  backend.setInterceptor(async call=>{
    const result=await call.next();
    if(call.method==='GET'&&call.path.includes('module=eq.missions')){arrivals++;if(arrivals===2)release();await bothRead;}
    return result;
  });
  await Promise.all([a.provider.sync(),b.provider.sync()]);backend.setInterceptor(null);
  const loser=meta(a)?.pendingOperation?a:b;
  assert.ok(meta(loser).pendingOperation);assert.equal(meta(loser).pendingOperation.rejection.code,'40001');
  assert.equal(loser.st.runeRequests.length,1);assert.equal(total(loser),0);
  await loser.action('local','missions');await a.provider.sync();await b.provider.sync();
  const state=await snapshot(id);assert.equal(grants(state).length,1);assert.equal(total(a),25);assert.equal(total(b),25);assert.equal(loser.st.runeRequests.length,0);
  assert.equal(meta(loser).abandonedOperations.length,1);assert.equal(state.receipts.length,2);
  const rollback=backend.journal.find(x=>x.error?.code==='40001');assert.equal(rollback.error.status,500,'Actual PostgREST rollback HTTP mapping is represented');
  record.evidence={actualSQLState:rollback.error.code,mappedHTTPStatus:rollback.error.status,credits:1,receipts:2,revision:state.module.revision,archivedRejectedOperations:1};
});

scenario('lost response after a real commit replays the original durable operation and applies the current reopened module after reload',async(t,record)=>{
  const {id,a,b,backend}=await household(t,[mission('lost-response')]);
  let lose=true;
  backend.setInterceptor(async call=>{const result=await call.next();if(call.method==='POST'&&call.path==='rpc/dobby_missions_v2_write'&&lose){lose=false;throw new TypeError('TEST response lost after actual COMMIT');}return result;});
  complete(a,'lost-response');await a.provider.sync();backend.setInterceptor(null);
  const pending=clone(meta(a).pendingOperation);assert.equal(total(a),0);assert.equal(a.st.runeRequests.length,1);
  assert.equal(grants(await snapshot(id)).length,1,'Server already committed the lost response');
  await b.provider.sync();reopen(b,'lost-response');await b.provider.sync();assert.equal(total(b),0);
  const reloaded=nativeClient(users.a,backend,id,{state:clone(a.st),metadata:[...a.persisted.entries()]});t.after(()=>reloaded.provider.reset());a.provider.reset();
  await reloaded.provider.start();await reloaded.provider.sync();
  const state=await snapshot(id),attempts=backend.journal.filter(x=>x.operation===pending.id);
  assert.equal(attempts.length,2);assert.equal(attempts[1].replayed,true);assert.equal(grants(state).length,2);assert.equal(total(reloaded),0);
  assert.equal(reloaded.st.manualMissions[0].status,'open');assert.equal(reloaded.st.runeRequests.length,0);assert.equal(meta(reloaded).pendingOperation,undefined);
  assert.equal(state.receipts.length,3,'Replay has no new receipt or ledger transaction');
  record.evidence={operation:pending.id,attempts:attempts.length,replayed:true,receiptCount:state.receipts.length,currentRevision:state.module.revision,currentMissionStatus:'open',total:0};
});

scenario('offline transport keeps unconfirmed intent and disable does not clear runeSyncRequired before recovery',async(t,record)=>{
  const {id,a,backend}=await household(t,[mission('offline')]);
  backend.setInterceptor(async call=>{if(call.method==='POST')throw new TypeError('TEST offline before request');return call.next();});
  complete(a,'offline');await a.provider.sync();
  const operation=clone(meta(a).pendingOperation);assert.ok(operation);assert.equal(a.st.runeRequests.length,1);assert.equal(total(a),0);assert.equal(grants(await snapshot(id)).length,0);
  await a.action('disable','missions');assert.equal(a.st.runeSyncRequired,true);assert.equal(a.provider.isConfigured('missions'),false);assert.equal(meta(a).pendingOperation.id,operation.id);
  backend.setInterceptor(null);await a.action('activate','missions');assert.equal(total(a),25);assert.equal(a.st.runeRequests.length,0);assert.equal(a.st.runeSyncRequired,true);
  const state=await snapshot(id);assert.equal(grants(state).length,1);
  record.evidence={sameOperation:backend.journal.find(x=>x.operation===operation.id)?.operation===operation.id,runeSyncRequired:a.st.runeSyncRequired,revision:state.module.revision,confirmedAfterRecovery:1};
});

scenario('metadata refusal before RPC sends no business write and preserves the native pending request',async(t,record)=>{
  const {id,a,backend}=await household(t,[mission('persist-refused')]);
  const store=a.persisted;let reject=true;
  const client=nativeClient(users.a,backend,id,{state:clone(a.st),metadata:[...store.entries()],rejectMeta:value=>reject&&Boolean(value.missions?.pendingOperation)});t.after(()=>client.provider.reset());a.provider.reset();
  await client.provider.start();complete(client,'persist-refused');const before=await snapshot(id);await client.provider.sync();
  const after=await snapshot(id);assert.deepEqual(after,before);assert.equal(client.st.runeRequests.length,1);assert.equal(total(client),0);assert.equal(client.st.runeSyncRequired,true);
  assert.match(client.provider.html(),/metadata store refused/);reject=false;await client.provider.sync();
  assert.equal(total(client),25);assert.equal(client.st.runeRequests.length,0);
  record.evidence={writeRefusedBeforeRPC:true,pendingPreserved:1,runeSyncRequired:true,confirmedAfterRetry:1};
});

scenario('metadata refusal after SQL confirmation retains the durable operation for safe replay after reload',async(t,record)=>{
  const {id,a,backend}=await household(t,[mission('persist-after')]);
  let rejectAck=true;
  const client=nativeClient(users.a,backend,id,{state:clone(a.st),metadata:[...a.persisted.entries()],rejectMeta:value=>rejectAck&&!value.missions?.pendingOperation&&Number(value.missions?.revision)>1});t.after(()=>client.provider.reset());a.provider.reset();
  await client.provider.start();complete(client,'persist-after');await client.provider.sync();
  const durable=clone(meta(client).pendingOperation);assert.ok(durable);assert.equal(total(client),25);assert.equal(grants(await snapshot(id)).length,1);
  rejectAck=false;client.provider.reset();
  const reloaded=nativeClient(users.a,backend,id,{state:clone(client.st),metadata:[...client.persisted.entries()]});t.after(()=>reloaded.provider.reset());
  await reloaded.provider.start();await reloaded.provider.sync();
  const state=await snapshot(id);assert.equal(total(reloaded),25);assert.equal(state.receipts.length,2);assert.equal(grants(state).length,1);assert.equal(meta(reloaded).pendingOperation,undefined);
  assert.equal(backend.journal.filter(x=>x.operation===durable.id).at(-1).replayed,true);
  record.evidence={durableOperation:durable.id,replayed:true,credits:1,receipts:state.receipts.length};
});

scenario('native projected recurring occurrence synchronizes once and historical identity cannot silently disappear',async(t,record)=>{
  const template=mission('template',{customRunes:7});delete template.id;delete template.status;delete template.due;
  const root=mission('series',{due:'2026-11-09',customRunes:7,recurrence:{version:1,seriesId:'series',rules:[{from:'2026-11-09',start:'2026-11-09',frequency:'daily',state:'active',shortMonth:'last-day',weekdays:[],monthDay:9,template}]}});
  const projected=M.projectRecurringMissions([root],'2026-11-11');
  const {id,a,b}=await household(t,projected);const occurrence=M.occurrenceId('series','2026-11-11');
  assert.equal(complete(a,occurrence).missionId,occurrence);await a.provider.sync();await b.provider.sync();assert.equal(total(b),7);
  const confirmed=await snapshot(id);assert.equal(grants(confirmed).length,1);
  b.st.manualMissions=b.st.manualMissions.filter(m=>m.id!==occurrence);await b.provider.sync();
  assert.equal(b.st.runeCredits.length,1);assert.deepEqual(await snapshot(id),confirmed);assert.match(b.provider.html(),/récurrence absent|Conflit/);
  record.evidence={occurrence,projectedRows:projected.length,confirmedOnce:true,historicalDeletionBlocked:true,revision:confirmed.module.revision};
});

scenario('server refuses grant for an absent mission atomically while native request and durable rejected operation remain recoverable',async(t,record)=>{
  const {id,a}=await household(t,[mission('existing')]);
  const request=R.completionRequest(mission('absent'),members,[],[],date);a.st.runeRequests=[request];await a.provider.sync();
  const state=await snapshot(id);assert.equal(grants(state).length,0);assert.equal(state.receipts.length,1);assert.equal(a.st.runeRequests.length,1);assert.equal(total(a),0);assert.equal(a.st.runeSyncRequired,true);
  assert.equal(meta(a).pendingOperation.rejection.code,'23514');
  a.st.manualMissions.push({...mission('absent'),status:'done',completedAt:date});await a.action('local','missions');
  assert.equal(total(a),25);assert.equal(a.st.runeRequests.length,0);assert.equal(meta(a).abandonedOperations.length,1);
  record.evidence={initialSQLState:'23514',atomicRefusal:true,pendingPreserved:1,recoveredByExplicitNativeResolution:true,total:25};
});

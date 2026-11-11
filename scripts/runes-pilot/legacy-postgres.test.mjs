/* Generated pilot client VMs -> real, strictly isolated PostgreSQL 17 SQL. */
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,createHash,randomUUID} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import * as R from '../../essai-stitch-v5-famille/family-runes-core.mjs';
import {makeClient} from '../../essai-stitch-v5-famille/tests/helpers/modules-harness.mjs';
import {repo,users,setup,fixture,snapshot,transport,query,rpcSQL,quote,sqlJSON} from './legacy-pg-harness.mjs';

const require=createRequire(import.meta.url);
const {transformMissions}=require('../build-dobby-runes-pilot.cjs');
const nativePath='essai-stitch-v5-famille/family-modules.js';
const nativeSource=readFileSync(resolve(repo,nativePath),'utf8');
const implementation=transformMissions(nativeSource,{legacyRecovery:true});
const names=['roundtrip','cas','lost','receipt','credits','unknown','safe-pending','rejected','direct','cancel','collision-local','collision-server','converted'];
const clone=value=>JSON.parse(JSON.stringify(value));
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const digest=value=>JSON.stringify(canonical(value));
const date='2026-11-12T12:00:00.000Z',members=[{id:'member-a'},{id:'member-b'}];
const mission=(id='local-mission',extra={})=>({id,title:'Local native mission '+id,status:'open',category:'Famille',due:'',note:'keep-local-note',assigneeId:'member-a',effort:'light',rewardVersion:1,...extra});
const localAuto={key:'auto-local',title:'Local automatic task',done:false,opaque:{source:'local'}};
const writes=backend=>backend.journal.filter(x=>x.method==='POST'||x.method==='PATCH');
const rpcWrites=backend=>writes(backend).filter(x=>x.path==='rpc/dobby_missions_v2_write');
const total=client=>R.memberSummary('member-a',client.st.runeCredits||[]).total;
const records=[];let environment;
const sourceSha=createHash('sha256').update(nativeSource).digest('hex');
function client(user,backend,household,{state={},metadata=[],accept=true}={}){
  const store=new Map(metadata),messages=[];
  const instance=makeClient(user,backend,false,accept,{implementation,crypto:webcrypto,state:{runeCredits:[],runeRequests:[],familyMembers:members,manualMissions:[mission()],autoTasks:[clone(localAuto)],retainedNativeExtra:{keep:'keep-local-extras'},...clone(state)},api:{
    getContext:()=>({userId:user,householdId:household}),
    meta:async key=>clone(store.get(key)||{}),
    putMeta:async(key,value)=>store.set(key,clone(value)),
    showMessage:message=>messages.push(message)
  }});
  return Object.assign(instance,{persisted:store,messages,key:'v2-module-state:'+user+'|'+household});
}
const meta=instance=>instance.persisted.get(instance.key)?.missions;
const backups=instance=>[...instance.persisted].filter(([key])=>key.startsWith('v2-missions-legacy-backup:'));
async function fresh(t,name,options={}){
  const row=fixture(name),backend=transport(row.id),a=client(users.a,backend,row.id,options);
  t.after(()=>a.provider.reset());await a.provider.start();
  assert.equal(a.window.DobbySharedRunesV2.available(),true,a.messages.join('\n'));
  const initial=await snapshot(row.id);assert.equal(initial.module.revision,2);assert.equal(initial.module.payload.runeLedgerVersion,undefined);assert.deepEqual(initial.receipts,[]);
  return {...row,a,backend,initial};
}
async function review(a){await a.action('legacy-review','missions');assert.ok(backups(a).length,'Review must durably back up before any write');}
async function migrate(a,backend,choice='legacy-merge'){
  await review(a);assert.equal(rpcWrites(backend).length,0,'Review is read-only');
  await a.action(choice,'missions');assert.equal(a.provider.isActive('missions'),true,a.messages.join('\n'));
}
function complete(a,id='local-mission',at=date){
  const row=a.st.manualMissions.find(x=>x.id===id);assert.ok(row);
  const request=R.completionRequest(row,members,a.st.runeCredits||[],a.st.runeRequests||[],at);assert.ok(request);
  a.st.manualMissions=a.st.manualMissions.map(x=>x.id===id?{...x,status:'done',completedAt:at}:x);a.st.runeRequests=[...(a.st.runeRequests||[]),request];return request;
}
function reopen(a,id='local-mission'){
  const row=a.st.manualMissions.find(x=>x.id===id),request=R.reopeningRequest(row,a.st.runeCredits||[],a.st.runeRequests||[],date);assert.ok(request);
  a.st.manualMissions=a.st.manualMissions.map(x=>x.id===id?{...x,status:'open',completedAt:''}:x);a.st.runeRequests=[...(a.st.runeRequests||[]),request];
}
function scenario(name,fn){test(name,{concurrency:false},async t=>{const record={name,status:'running'};records.push(record);try{await fn(t,record);record.status='passed';}catch(error){record.status='failed';record.error=error.stack;throw error;}});}
before(()=>{environment=setup(names);});
after(()=>{
  const output=resolve(repo,'docs/dobby-v7/evidence/legacy-missions/postgres');mkdirSync(output,{recursive:true});
  writeFileSync(resolve(output,'results.json'),JSON.stringify({generatedAt:new Date().toISOString(),command:'node --test scripts/runes-pilot/legacy-postgres.test.mjs',environment,nativeSourceSha256:sourceSha,generatedClientSha256:createHash('sha256').update(implementation).digest('hex'),scope:'Two invented users in independent native client VMs; real PostgreSQL SQL, constraints, CAS, receipts and transactions. HTTP transport translation and response-loss/corruption injection only; no deployed Supabase or JWT issuance.',passed:records.filter(x=>x.status==='passed').length,failed:records.filter(x=>x.status==='failed').length,scenarios:records},null,2)+'\n');
  assert.equal(createHash('sha256').update(readFileSync(resolve(repo,nativePath))).digest('hex'),sourceSha,'Canonical client source must remain byte-identical');
});

scenario('explicit legacy review backs up, preserves both auto-task sets, and two native actors converge through grant/reversal/regrant',async(t,record)=>{
  const {id,auto,a,backend,initial}=await fresh(t,'roundtrip');const localBefore=clone(a.st);
  await a.provider.sync();assert.deepEqual(a.st,localBefore);assert.deepEqual(await snapshot(id),initial);assert.equal(writes(backend).length,0,'No write before explicit recovery');
  await migrate(a,backend);
  let current=await snapshot(id);assert.equal(current.module.revision,3);assert.equal(current.module.payload.runeLedgerVersion,2);assert.equal(current.receipts.length,1);
  assert.deepEqual(current.module.payload.autoTasks.find(x=>x.key===auto.key),auto);assert.deepEqual(current.module.payload.autoTasks.find(x=>x.key===localAuto.key),localAuto);
  assert.deepEqual(current.module.payload.manualMissions,[mission()]);assert.deepEqual(current.module.payload.runeCredits,[]);assert.deepEqual(current.module.payload.runeRequests,[]);
  const backup=backups(a)[0][1];
  for(const key of ['autoTasks','manualMissions','runeCredits','runeRequests'])assert.deepEqual(backup.local[key],clone(localBefore[key]),'Complete Missions backup missing '+key);
  assert.ok(backup.moduleState&&typeof backup.moduleState==='object');assert.deepEqual(backup.remote.payload,initial.module.payload);assert.equal(backup.remote.revision,2);
  assert.equal(a.st.retainedNativeExtra.keep,'keep-local-extras','Other native data stays untouched');
  const first=clone(rpcWrites(backend)[0].body);assert.equal(first.p_expected_revision,2);
  const b=client(users.b,backend,id,{state:{manualMissions:[],autoTasks:[]}});t.after(()=>b.provider.reset());await b.provider.start();await b.action('activate','missions');
  assert.equal(b.provider.isActive('missions'),true,b.messages.join('\n'));assert.deepEqual(clone(b.st.autoTasks),current.module.payload.autoTasks);
  complete(b);assert.equal(total(b),0);await b.provider.sync();assert.equal(total(b),10);
  current=await snapshot(id);assert.equal(current.module.revision,4);
  const replay=await backend.authorized(users.a,'POST','rpc/dobby_missions_v2_write',first);
  assert.equal(replay.replayed,true);assert.equal(replay.operation.revision,3);assert.equal(replay.module.revision,4);assert.equal((await snapshot(id)).receipts.length,2);
  reopen(b);await b.provider.sync();assert.equal(total(b),0);complete(b,'local-mission','2026-11-12T12:01:00.000Z');await b.provider.sync();assert.equal(total(b),10);
  await a.provider.sync();assert.equal(total(a),10);assert.deepEqual(clone(a.st.autoTasks),clone(b.st.autoTasks));
  assert.equal(writes(backend).some(x=>x.path!=='rpc/dobby_missions_v2_write'),false);
  current=await snapshot(id);record.evidence={initialRevision:2,migratedRevision:3,replayOperationRevision:3,replayCurrentRevision:4,finalRevision:current.module.revision,receipts:current.receipts.length,credits:current.module.payload.runeCredits.length,finalTotal:10};
});

scenario('a competing native CAS writer produces 40001 without erasing local mission data or the durable recovery operation',async(t,record)=>{
  const {id,a,backend}=await fresh(t,'cas');await review(a);const localBefore=clone(a.st);
  let inject=true;backend.setInterceptor(async call=>{
    if(inject&&call.method==='POST'&&call.path==='rpc/dobby_missions_v2_write'){
      inject=false;const p=clone(call.body.p_payload);p.autoTasks.push({key:'auto-concurrent',title:'Concurrent writer'});
      await query(rpcSQL(id,2,randomUUID(),p),{user:users.b});
    }
    return call.next();
  });
  await a.action('legacy-merge','missions');backend.setInterceptor(null);
  const durable=clone(meta(a)?.pendingOperation);assert.ok(durable);assert.equal(durable.rejection?.code,'40001');assert.equal(durable.expectedRevision,2);
  assert.deepEqual(a.st.manualMissions,localBefore.manualMissions);assert.deepEqual(a.st.runeRequests,localBefore.runeRequests);assert.deepEqual(a.st.runeCredits,localBefore.runeCredits);
  const current=await snapshot(id);assert.equal(current.module.revision,3);assert.equal(current.receipts.length,1);assert.ok(current.module.payload.autoTasks.some(x=>x.key==='auto-concurrent'));
  assert.equal(rpcWrites(backend).length,1);assert.equal(rpcWrites(backend)[0].error?.code,'40001');
  record.evidence={sqlstate:'40001',mappedHTTPStatus:500,durableOperation:durable.id,serverRevision:3,receipts:1,localIntentPreserved:true};
});

scenario('a lost response after migration commits is recovered by the original durable operation after reload',async(t,record)=>{
  const {id,a,backend}=await fresh(t,'lost');await review(a);const localBefore=clone(a.st);
  let lose=true;backend.setInterceptor(async call=>{const result=await call.next();if(lose&&call.method==='POST'&&call.path==='rpc/dobby_missions_v2_write'){lose=false;throw new TypeError('TEST response lost after actual COMMIT');}return result;});
  await a.action('legacy-merge','missions');backend.setInterceptor(null);
  const pending=clone(meta(a)?.pendingOperation);assert.ok(pending);assert.equal(pending.rejection,undefined);assert.deepEqual(a.st.manualMissions,localBefore.manualMissions);assert.deepEqual(a.st.runeRequests,localBefore.runeRequests);
  const committed=await snapshot(id);assert.equal(committed.module.revision,3);assert.equal(committed.receipts.length,1);
  const reloaded=client(users.a,backend,id,{state:clone(a.st),metadata:[...a.persisted]});t.after(()=>reloaded.provider.reset());a.provider.reset();
  await reloaded.provider.start();await reloaded.provider.sync();
  await reloaded.action('activate','missions');assert.equal(rpcWrites(backend).filter(x=>x.operation===pending.id).length,1,'Reload and activation cannot bypass the explicit recovery review');
  const backupCount=backups(reloaded).length;await review(reloaded);assert.equal(meta(reloaded).legacyReview.converted,true);assert.equal(backups(reloaded).length,backupCount+1);
  await reloaded.action('legacy-replay','missions');
  const attempts=rpcWrites(backend).filter(x=>x.operation===pending.id);assert.equal(attempts.length,2);assert.deepEqual(attempts[1].body,attempts[0].body);assert.equal(attempts[1].replayed,true);
  assert.equal(meta(reloaded)?.pendingOperation,undefined);assert.equal((await snapshot(id)).receipts.length,1);assert.equal(reloaded.provider.isActive('missions'),true,reloaded.messages.join('\n'));
  record.evidence={operation:pending.id,attempts:2,replayed:true,serverRevision:3,receipts:1};
});

scenario('a corrupt response receipt retains the exact outbox and pending rune request until a valid SQL receipt replay',async(t,record)=>{
  const {id,a,backend}=await fresh(t,'receipt',{state:{manualMissions:[mission('local-mission',{status:'done',completedAt:date})]}});
  const request=R.completionRequest(mission(),members,[],[],date);a.st.runeRequests=[request];await review(a);const before=clone(a.st);
  let corrupt=true;backend.setInterceptor(async call=>{const result=await call.next();if(corrupt&&call.method==='POST'&&call.path==='rpc/dobby_missions_v2_write'){corrupt=false;return {...result,operation:{...result.operation,id:randomUUID()}};}return result;});
  await a.action('legacy-merge','missions');backend.setInterceptor(null);
  const pending=clone(meta(a)?.pendingOperation);assert.ok(pending);assert.equal(pending.rejection,undefined);assert.deepEqual(a.st.manualMissions,before.manualMissions);assert.deepEqual(a.st.runeRequests,before.runeRequests);assert.deepEqual(a.st.runeCredits,[]);
  let current=await snapshot(id);assert.equal(current.module.revision,3);assert.equal(current.receipts.length,1);assert.equal(current.module.payload.runeCredits.length,1);
  await a.provider.sync();await a.action('activate','missions');assert.equal(rpcWrites(backend).filter(x=>x.operation===pending.id).length,1,'An invalid acknowledgement needs a fresh explicit review');
  await review(a);assert.equal(meta(a).legacyReview.converted,true);await a.action('legacy-replay','missions');
  assert.equal(meta(a)?.pendingOperation,undefined);assert.equal(total(a),10);assert.deepEqual(clone(a.st.runeRequests),[]);current=await snapshot(id);assert.equal(current.receipts.length,1);
  record.evidence={operation:pending.id,invalidReceiptPreservedOutbox:true,replayConfirmedTotal:10,receipts:1};
});

scenario('local confirmed history blocks client-only adoption without an RPC or any local data loss',async(t,record)=>{
  const legacy={missionId:'historical',memberId:'member-a',effort:'light',amount:10,date,title:'Local historical credit',revision:0};
  const {id,a,backend,initial}=await fresh(t,'credits',{state:{runeCredits:[legacy]}});const before=clone(a.st);
  await a.action('legacy-review','missions');await a.action('legacy-merge','missions');await a.provider.sync();
  assert.deepEqual(a.st,before);assert.deepEqual(await snapshot(id),initial);assert.equal(writes(backend).length,0);assert.equal(a.provider.isActive('missions'),false);
  assert.ok(a.messages.join('\n').length>0);record.evidence={localConfirmedCreditsPreserved:1,serverRevision:2,rpcWrites:0};
});

scenario('an unknown existing operation is neither mutated nor archived during recovery review and choices',async(t,record)=>{
  const {id,a,backend,initial}=await fresh(t,'unknown');a.provider.reset();
  const pending={id:randomUUID(),expectedRevision:2,payload:{autoTasks:[clone(localAuto)],manualMissions:[mission()],runeCredits:[],runeRequests:[],runeLedgerVersion:2},localFields:{autoTasks:[clone(localAuto)],manualMissions:[mission()]},localEditable:'unknown-fixture'};
  const metadata=[[a.key,{missions:{active:false,pendingOperation:pending}}]],reloaded=client(users.a,backend,id,{metadata});t.after(()=>reloaded.provider.reset());await reloaded.provider.start();const before=clone(reloaded.st);
  await reloaded.action('legacy-review','missions');await reloaded.action('legacy-merge','missions');await reloaded.action('legacy-replay','missions');
  assert.deepEqual(meta(reloaded)?.pendingOperation,pending);assert.equal(meta(reloaded)?.abandonedOperations,undefined);assert.deepEqual(reloaded.st,before);assert.deepEqual(await snapshot(id),initial);assert.equal(writes(backend).length,0);
  record.evidence={unknownOperation:pending.id,rpcWrites:0,serverRevision:2,operationUnchanged:true};
});

scenario('a safe existing operation is replayed from the legacy review with exactly its original identity, revision and payload',async(t,record)=>{
  const row=fixture('safe-pending'),backend=transport(row.id),localFields={autoTasks:[clone(localAuto)],manualMissions:[mission()]};
  const pending={id:randomUUID(),expectedRevision:2,payload:{autoTasks:[clone(row.auto),clone(localAuto)],manualMissions:[mission()],runeCredits:[],runeRequests:[],runeLedgerVersion:2},localFields,localEditable:digest(localFields)};
  const key='v2-module-state:'+users.a+'|'+row.id,a=client(users.a,backend,row.id,{metadata:[[key,{missions:{active:false,pendingOperation:pending}}]]});t.after(()=>a.provider.reset());await a.provider.start();
  assert.equal(writes(backend).length,0);await review(a);assert.deepEqual(backups(a)[0][1].moduleState.pendingOperation,pending);await a.action('legacy-replay','missions');
  const calls=rpcWrites(backend);assert.equal(calls.length,1);assert.deepEqual(calls[0].body,{p_household_id:row.id,p_expected_revision:pending.expectedRevision,p_operation_id:pending.id,p_payload:pending.payload});
  const current=await snapshot(row.id);assert.equal(current.module.revision,3);assert.equal(current.receipts.length,1);assert.equal(current.receipts[0].operation_id,pending.id);assert.equal(meta(a).pendingOperation,undefined);assert.equal(meta(a).abandonedOperations,undefined);
  assert.deepEqual(current.module.payload.autoTasks,pending.payload.autoTasks);record.evidence={operation:pending.id,expectedRevision:2,revision:3,receipts:1,exactPayload:true};
});

scenario('a definitively rejected operation is backed up and archived before a distinct recovery operation is submitted',async(t,record)=>{
  const row=fixture('rejected'),backend=transport(row.id),localFields={autoTasks:[clone(localAuto)],manualMissions:[mission()]};
  const pending={id:randomUUID(),expectedRevision:2,payload:{...clone(localFields),runeCredits:[],runeRequests:[],runeLedgerVersion:2},localFields,localEditable:digest(localFields),rejection:{code:'23514',message:'TEST known atomic rejection'}};
  const key='v2-module-state:'+users.a+'|'+row.id,a=client(users.a,backend,row.id,{metadata:[[key,{missions:{active:false,pendingOperation:pending}}]]});t.after(()=>a.provider.reset());await a.provider.start();
  await review(a);assert.deepEqual(backups(a)[0][1].moduleState.pendingOperation,pending);await a.action('legacy-merge','missions');
  const calls=rpcWrites(backend);assert.equal(calls.length,1);assert.notEqual(calls[0].operation,pending.id);assert.equal(calls[0].expectedRevision,2);assert.ok(a.prompts.some(text=>text.includes('refusée')));
  assert.deepEqual(meta(a).abandonedOperations,[pending]);assert.equal(meta(a).pendingOperation,undefined);
  const current=await snapshot(row.id);assert.equal(current.module.revision,3);assert.equal(current.receipts.length,1);assert.deepEqual(current.module.payload.autoTasks,[row.auto,localAuto]);
  record.evidence={archivedOperation:pending.id,replacementOperation:calls[0].operation,archivedIntact:true,revision:3,receipts:1};
});

scenario('old V1 direct writes remain forbidden by the real SQL guard after the auth patch',async(t,record)=>{
  const {id,payload}=fixture('direct'),before=await snapshot(id);
  await assert.rejects(query(`UPDATE public.dobby_v2_modules SET payload=${sqlJSON({...payload,runeLedgerVersion:1})} WHERE household_id=${quote(id)} AND module='missions';`,{user:users.a}),error=>error.code==='42501');
  assert.deepEqual(await snapshot(id),before);record.evidence={sqlstate:'42501',revision:2,receipts:0};
});

scenario('declining recovery leaves SQL and every local field untouched',async(t,record)=>{
  const {id,a,backend,initial}=await fresh(t,'cancel',{accept:false});const before=clone(a.st);
  await a.action('legacy-review','missions');await a.action('legacy-merge','missions');await a.provider.sync();
  assert.deepEqual(a.st,before);assert.deepEqual(await snapshot(id),initial);assert.equal(writes(backend).length,0);record.evidence={rpcWrites:0,revision:2};
});

for(const preference of ['local','server'])scenario('automatic-task collision choice '+preference+' preserves unique tasks on both sides',async(t,record)=>{
  const row=fixture('collision-'+preference),localCollision={...clone(row.auto),title:'Local edited automatic task'};
  const {id,a,backend}=await fresh(t,'collision-'+preference,{state:{autoTasks:[localCollision,clone(localAuto)]}});await review(a);await a.action('legacy-'+preference,'missions');
  const current=await snapshot(id);assert.equal(current.module.revision,3);assert.deepEqual(current.module.payload.autoTasks.find(x=>x.key==='auto-remote'),preference==='local'?localCollision:row.auto);assert.deepEqual(current.module.payload.autoTasks.find(x=>x.key==='auto-local'),localAuto);assert.equal(current.module.payload.autoTasks.length,2);assert.equal(current.receipts.length,1);
  assert.equal(rpcWrites(backend).length,1);record.evidence={preference,revision:3,automaticTasks:2,receipts:1};
});

scenario('a fresh converted-household review preserves a remembered remote task, an unchanged local mission, and the other actor additional task',async(t,record)=>{
  const row=fixture('converted'),backend=transport(row.id),localManual=mission('remembered-local-manual');
  const baseline={autoTasks:[clone(row.auto)],manualMissions:[localManual],runeCredits:[],runeLedgerVersion:1};
  const key='v2-module-state:'+users.a+'|'+row.id;
  const a=client(users.a,backend,row.id,{metadata:[[key,{missions:{active:true,revision:1,synced:JSON.stringify(baseline),conflict:false,runeProtocol:1}}]],state:{autoTasks:[],manualMissions:[localManual]}});
  const added={key:'auto-added-by-b',title:'New remote automatic task',opaque:{source:'actor-b'}};
  const b=client(users.b,backend,row.id,{state:{autoTasks:[added],manualMissions:[]}});
  t.after(()=>{a.provider.reset();b.provider.reset();});await a.provider.start();await b.provider.start();
  await review(a);await review(b);await b.action('legacy-merge','missions');
  const converted=await snapshot(row.id);assert.equal(converted.module.revision,3);assert.equal(converted.receipts.length,1);
  const before=clone(a.st),backupCount=backups(a).length,count=rpcWrites(backend).length;
  await a.action('legacy-review','missions');
  assert.equal(meta(a).legacyReview.converted,true);assert.equal(backups(a).length,backupCount+1);assert.equal(rpcWrites(backend).length,count,'Converted review cannot publish');
  const backup=backups(a).at(-1)[1];assert.deepEqual(backup.local.manualMissions,before.manualMissions);assert.deepEqual(backup.remote.payload,converted.module.payload);assert.equal(backup.remote.revision,3);
  assert.doesNotMatch(a.provider.html(),/data-fm-action="(?:local|server)" data-module="missions"/);
  await a.action('legacy-merge','missions');
  const current=await snapshot(row.id);assert.equal(current.module.revision,4);assert.equal(current.receipts.length,2);assert.equal(rpcWrites(backend).length,count+1);
  assert.deepEqual(current.module.payload.autoTasks,[row.auto,added]);assert.deepEqual(current.module.payload.manualMissions,[localManual]);assert.deepEqual(clone(a.st.manualMissions),[localManual]);
  await b.provider.sync();assert.deepEqual(clone(b.st.autoTasks),[row.auto,added]);assert.deepEqual(clone(b.st.manualMissions),[localManual]);
  record.evidence={convertedRevision:3,finalRevision:4,receipts:2,automaticTasks:2,localManualPreserved:true,newConvertedBackup:true};
});

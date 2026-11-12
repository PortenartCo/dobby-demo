import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,createHash} from 'node:crypto';
import * as R from '../family-runes-core.mjs';
import {makeBackend,makeClient,HH} from './helpers/modules-harness.mjs';
const clone=x=>structuredClone(x),date='2026-11-11T12:00:00.000Z',members=[{id:'member-a'},{id:'member-b'}];
const mission=(id='shared-one',extra={})=>({id,title:'TEST — '+id,category:'Famille',due:'',note:'',status:'open',assigneeId:'member-a',effort:'light',rewardVersion:1,...extra});
function state(c){return c.metadata.get('v2-module-state:'+c.uid+'|'+HH)?.missions;}
function backendV2(){
 const backend=makeBackend(),legacy=backend.authorized,operations=new Map();backend.writes=[];backend.capability={protocol:2,directWritesBlocked:true,maxPayloadBytes:262144};
 backend.authorized=async(user,method,path,body)=>{
  if(path.startsWith('rpc/dobby_missions_v2_capabilities'))return clone(backend.capability);
  if(path==='rpc/dobby_missions_v2_write'){
   body=clone(body);assert.equal(method,'POST');backend.writes.push(clone(body));await backend.beforeWrite?.(body,user);
   const existing=backend.rows.get('missions'),prior=operations.get(body.p_operation_id),signature=JSON.stringify(body.p_payload);
   if(prior){assert.equal(prior.user,user);assert.equal(prior.signature,signature);return{protocol:2,replayed:true,operation:prior.receipt,module:clone(existing)};}
   if(body.p_expected_revision!==(existing?.revision||0))throw Object.assign(Error('TEST revision conflict'),{code:'40001',status:500});
   if(backend.reject?.(body))throw Object.assign(Error('TEST atomic refusal'),{code:'22023',status:400});
   if(existing)assert.deepEqual(body.p_payload.runeCredits,existing.payload.runeCredits,'confirmed fields remain byte-for-byte native objects');
   const revision=(existing?.revision||0)+1,known=new Set(body.p_payload.runeCredits.map(R.eventKey)),accepted=R.acceptRequests(body.p_payload.runeCredits,body.p_payload.runeRequests,revision),payload={...clone(body.p_payload),runeCredits:[...clone(body.p_payload.runeCredits),...accepted.filter(row=>!known.has(R.eventKey(row)))],runeRequests:[],runeLedgerVersion:2};
   const row={module:'missions',payload,revision,updated_at:date};backend.rows.set('missions',row);
   const receipt={id:body.p_operation_id,revision,digest:createHash('sha256').update(signature).digest('hex')};operations.set(receipt.id,{user,signature,receipt});
   if(backend.loseNext){backend.loseNext=false;throw Error('TEST response lost after COMMIT');}
   const result={protocol:2,replayed:false,operation:receipt,module:clone(row)};return backend.afterWrite?backend.afterWrite(result,user):result;
  }
  if((method==='PATCH'&&path.includes('module=eq.missions'))||(method==='POST'&&body?.module==='missions'))throw Error('UNSAFE direct Missions writer');
  return legacy(user,method,path,body);
 };
 return backend;
}
function client(t,uid,backend,options={}){const c=makeClient(uid,backend,false,true,{crypto:webcrypto,...options});c.uid=uid;t.after(()=>c.provider.reset());return c;}
async function household(t,rows=[mission()]){const backend=backendV2(),a=client(t,'a',backend,{state:{manualMissions:rows,familyMembers:members}});await a.provider.start();await a.action('activate','missions');const b=client(t,'b',backend,{state:{familyMembers:members}});await b.provider.start();await b.action('activate','missions');return{backend,a,b};}
function toggle(c,id='shared-one'){
 const row=c.st.manualMissions.find(row=>row.id===id),request=row.status==='done'?R.reopeningRequest(row,c.st.runeCredits||[],c.st.runeRequests||[],date):R.completionRequest(row,members,c.st.runeCredits||[],c.st.runeRequests||[],date);
 c.st.manualMissions=c.st.manualMissions.map(m=>m.id===id?{...m,status:row.status==='done'?'open':'done',completedAt:row.status==='done'?'':date}:m);
 if(request)c.st.runeRequests=R.normalizeRequests([...(c.st.runeRequests||[]),request]);
}
const total=c=>R.memberSummary('member-a',c.st.runeCredits||[],c.st.runeRequests||[]).total;

test('V2 capability gates sharing, persistent operation precedes POST, native +10/0/10 and duplicates stay exact',async t=>{
 const backend=backendV2(),a=client(t,'a',backend,{state:{manualMissions:[mission()],familyMembers:members}});
 backend.beforeWrite=body=>{const pending=state(a).pendingOperation;assert.equal(pending.id,body.p_operation_id);assert.equal(pending.expectedRevision,body.p_expected_revision);assert.deepEqual(pending.payload,body.p_payload);};
 await a.provider.start();assert.equal(a.window.DobbySharedRunesV2.available(),true);await a.action('activate','missions');assert.equal(state(a).runeProtocol,2);
 for(const expected of [10,0,10]){toggle(a);assert.notEqual(a.st.runeRequests.length,0);const before=total(a);await a.provider.sync();assert.equal(total(a),expected);assert.equal(a.st.runeRequests.length,0);assert.notEqual(before,expected);const count=backend.writes.length;await a.provider.sync();assert.equal(backend.writes.length,count);}
 assert.equal(a.st.runeCredits.length,3);assert.match(a.provider.html(),/Partagé · à jour/);assert.equal(backend.journal.some(x=>x.method==='PATCH'),false);assert.equal(a.st.runeSyncRequired,true);
});

test('custom zero and MAX_SAFE rewards use native V2 event identities, not invented balances',async t=>{
 for(const customRunes of [0,Number.MAX_SAFE_INTEGER]){const {a,backend}=await household(t,[mission('custom',{customRunes})]);toggle(a,'custom');await a.provider.sync();assert.equal(total(a),customRunes);assert.equal(a.st.runeCredits[0].eventId,'custom~0~grant');toggle(a,'custom');await a.provider.sync();assert.equal(total(a),0);assert.equal(backend.rows.get('missions').payload.runeLedgerVersion,2);}
});

test('offline full cycle queue keeps grant/reversal/regrant even though net mission status is unchanged',async t=>{
 const {a}=await household(t);toggle(a);toggle(a);toggle(a);assert.equal(a.st.runeRequests.length,3);assert.equal(total(a),0);await a.provider.sync();assert.equal(total(a),10);assert.equal(a.st.runeCredits.length,3);assert.equal(a.st.runeRequests.length,0);
});

test('lost response survives reload with the same UUID, revision and payload',async t=>{
 const {backend,a}=await household(t);toggle(a);backend.loseNext=true;await a.provider.sync();assert.equal(total(a),0);assert.equal(a.st.runeRequests.length,1);const frozen=clone(state(a).pendingOperation),next=client(t,'a',backend,{state:clone(a.st),metadata:[...a.metadata.entries()]});
 await next.provider.start();await next.provider.sync();assert.equal(total(next),10);assert.equal(next.st.runeRequests.length,0);const sent=backend.writes.at(-1);assert.equal(sent.p_operation_id,frozen.id);assert.deepEqual(sent.p_payload,frozen.payload);assert.equal(backend.rows.get('missions').payload.runeCredits.length,1);
});

test('a replay receipt with a newer module never re-completes a remotely reopened mission',async t=>{
 const {backend,a,b}=await household(t);toggle(a);backend.loseNext=true;await a.provider.sync();const frozen=clone(state(a).pendingOperation);await b.provider.sync();toggle(b);await b.provider.sync();assert.equal(total(b),0);await a.provider.sync();assert.equal(a.st.manualMissions[0].status,'open');assert.equal(total(a),0);assert.equal(a.st.runeRequests.length,0);assert.equal(backend.writes.at(-1).p_operation_id,frozen.id);assert.equal(state(a).revision,3);
});

test('different-device completions merge independent missions without erasing either confirmed gain',async t=>{
 const {backend,a,b}=await household(t,[mission('one'),mission('two')]);toggle(a,'one');toggle(b,'two');await a.provider.sync();await b.provider.sync();await a.provider.sync();assert.equal(total(a),20);assert.equal(total(b),20);assert.deepEqual(clone(a.st.manualMissions.map(row=>row.status)),['done','done']);assert.equal(backend.rows.get('missions').payload.runeCredits.length,2);assert.doesNotMatch(b.provider.html(),/Conflit à résoudre/);
});

test('a new edit while a merged RPC is in flight retains only the new delta, not stale remote rows',async t=>{
 const {backend,a,b}=await household(t,[mission('one'),mission('two')]);toggle(a,'one');toggle(b,'two');await a.provider.sync();backend.beforeWrite=()=>{b.st.manualMissions=b.st.manualMissions.map(row=>row.id==='two'?{...row,note:'TEST newer local note'}:row);};await b.provider.sync();assert.equal(b.st.manualMissions.find(row=>row.id==='one').status,'done');assert.equal(b.st.manualMissions.find(row=>row.id==='two').note,'TEST newer local note');assert.equal(total(b),20);backend.beforeWrite=null;await b.provider.sync();assert.equal(backend.rows.get('missions').payload.manualMissions.find(row=>row.id==='two').note,'TEST newer local note');
});

test('CAS conflict retains operation and requests; explicit local rebase preserves independent remote work',async t=>{
 const {backend,a,b}=await household(t,[mission('one'),mission('two')]);toggle(a,'one');toggle(b,'two');const original=backend.beforeWrite;let raced=false;backend.beforeWrite=async(body,user)=>{if(user==='b'&&!raced){raced=true;await a.provider.sync();}await original?.(body,user);};await b.provider.sync();assert.match(b.provider.html(),/Conflit/);assert.equal(b.st.runeRequests.length,1);assert.ok(state(b).pendingOperation);backend.beforeWrite=null;await b.action('local','missions');assert.equal(total(b),20);assert.equal(state(b).abandonedOperations.length,1);assert.equal(b.st.runeRequests.length,0);assert.deepEqual(clone(b.st.manualMissions.map(row=>row.status)),['done','done']);
});

test('an explicit SQL rollback can be corrected and rebased while unknown network results keep their original operation',async t=>{
 const {backend,a}=await household(t);a.st.manualMissions[0].note='TEST rejected';toggle(a);backend.reject=body=>body.p_payload.manualMissions[0].note==='TEST rejected';await a.provider.sync();const first=clone(state(a).pendingOperation);assert.equal(first.rejection.code,'22023');assert.equal(total(a),0);assert.equal(a.st.runeRequests.length,1);a.st.manualMissions[0].note='TEST corrected';await a.action('local','missions');assert.equal(total(a),10);assert.notEqual(backend.writes.at(-1).p_operation_id,first.id);assert.equal(state(a).abandonedOperations[0].id,first.id);
});

test('malformed confirmation never credits requests and preserves a retryable exact operation',async t=>{
 const {backend,a}=await household(t);toggle(a);backend.afterWrite=result=>({...result,operation:{...result.operation,id:webcrypto.randomUUID()}});await a.provider.sync();assert.equal(total(a),0);assert.equal(a.st.runeRequests.length,1);assert.ok(state(a).pendingOperation);backend.afterWrite=null;await a.provider.sync();assert.equal(total(a),10);
});

test('contradictory same event key remains pending, never acknowledged by ID alone',async t=>{
 const {a,b}=await household(t);toggle(a);await a.provider.sync();b.st.manualMissions[0].assigneeId='member-b';b.st.manualMissions[0].effort='major';toggle(b);await b.provider.sync();assert.equal(b.st.runeRequests.length,1);assert.equal(R.memberSummary('member-b',b.st.runeCredits||[],b.st.runeRequests).total,0);assert.doesNotMatch(b.provider.html(),/Partagé · à jour/);
});

test('capability is bound to auth epoch and reprobed; late RPC response cannot write into another context',async t=>{
 let uid='a',epoch=1;const api={getContext:()=>({userId:uid,householdId:HH}),connectionState:()=>({epoch,access:'verified'})},backend=backendV2(),a=client(t,'a',backend,{api,state:{manualMissions:[mission()],familyMembers:members}});
 await a.provider.start();await a.action('activate','missions');epoch++;assert.equal(a.window.DobbySharedRunesV2.available(),false);await a.provider.start();assert.equal(a.window.DobbySharedRunesV2.available(),true);toggle(a);backend.afterWrite=result=>{uid='b';epoch++;return result;};await a.provider.sync();assert.equal(total(a),0);assert.equal(a.st.runeRequests.length,1);assert.equal(a.window.DobbySharedRunesV2.available(),false);assert.ok(state(a).pendingOperation);
});

test('known V2 cannot fall back to direct writes if capability becomes unavailable',async t=>{
 const {backend,a}=await household(t);await a.action('disable','missions');backend.capability=null;a.provider.reset();await a.provider.start();await a.action('activate','missions');assert.equal(a.provider.isConfigured('missions'),false);assert.equal(a.st.runeSyncRequired,true);assert.doesNotMatch(a.provider.html(),/Partagé · à jour/);assert.equal(backend.journal.some(x=>x.method==='PATCH'),false);
});


test('a V1 server snapshot keeps raw confirmed dates and revision zero during monotone V2 adoption',async t=>{
 const backend=backendV2(),row=mission('old',{status:'done'}),credit={...R.completionRequest({...row,status:'open'},members,[],[],date),date:'2026-11-11T12:00:00Z',revision:0};backend.rows.set('missions',{module:'missions',revision:7,payload:{autoTasks:[],manualMissions:[row],runeCredits:[credit],runeLedgerVersion:1}});
 const a=client(t,'a',backend);await a.provider.start();await a.action('activate','missions');await a.provider.sync();assert.equal(a.st.runeCredits[0].date,credit.date);assert.equal(a.st.runeCredits[0].revision,0);assert.equal(backend.writes.at(-1).p_payload.runeCredits[0].date,credit.date);assert.equal(backend.rows.get('missions').payload.runeLedgerVersion,2);assert.equal(state(a).revision,8);
});

test('parallel refresh clicks share one durable operation instead of racing before metadata persistence',async t=>{
 let block=false,release,persisted;const barrier=new Promise(resolve=>{release=resolve;}),backend=backendV2(),metadata=new Map(),api={meta:async key=>metadata.get(key)||null,putMeta:async(key,value)=>{if(block){persisted=clone(value);await barrier;}metadata.set(key,clone(value));}};
 const a=client(t,'a',backend,{api,state:{manualMissions:[mission()],familyMembers:members}});await a.provider.start();await a.action('activate','missions');toggle(a);const count=backend.writes.length;block=true;const one=a.action('refresh','missions');await new Promise(resolve=>setImmediate(resolve));assert.ok(persisted.missions.pendingOperation);const two=a.action('refresh','missions');await new Promise(resolve=>setImmediate(resolve));assert.equal(backend.writes.length,count,'no RPC before durable metadata');block=false;release();await Promise.all([one,two]);assert.equal(backend.writes.length,count+1);assert.equal(total(a),10);
});

test('a Missions GET returning after auth context changes cannot apply or create an operation',async t=>{
 let uid='a',epoch=1;const backend=backendV2(),api={getContext:()=>({userId:uid,householdId:HH}),connectionState:()=>({epoch,access:'verified'})},a=client(t,'a',backend,{api,state:{manualMissions:[mission()],familyMembers:members}});await a.provider.start();await a.action('activate','missions');toggle(a);const original=backend.authorized;backend.authorized=async(...args)=>{const result=await original(...args);if(args[1]==='GET'&&args[2].includes('module=eq.missions')){uid='b';epoch++;}return result;};const count=backend.writes.length;await a.provider.sync();assert.equal(backend.writes.length,count);assert.equal(total(a),0);assert.equal(a.st.runeRequests.length,1);assert.equal(state(a).pendingOperation,undefined);
});


for(const code of ['40003','08007'])test('unknown transaction outcome '+code+' never archives or re-identifies pending intent',async t=>{
 const {backend,a}=await household(t);toggle(a);backend.beforeWrite=()=>{throw Object.assign(Error('TEST unknown transaction outcome'),{code,status:500});};await a.provider.sync();const pending=clone(state(a).pendingOperation);assert.equal(pending.rejection,undefined);await a.action('local','missions');assert.equal(state(a).pendingOperation.id,pending.id);assert.deepEqual(state(a).pendingOperation.payload,pending.payload);assert.equal(state(a).abandonedOperations,undefined);assert.equal(a.st.runeRequests.length,1);assert.equal(total(a),0);assert.equal(backend.writes.at(-1).p_operation_id,pending.id);
});

for(const failure of ['later-module','metadata'])test('join-family '+failure+' rollback restores exact pending requests, credits and module configuration',async t=>{
 const backend=backendV2(),done=mission('join-pending',{status:'done',completedAt:date}),request=R.completionRequest({...done,status:'open'},members,[],[],date),credit={...request,revision:2};backend.rows.set('missions',{module:'missions',revision:2,payload:{autoTasks:[],manualMissions:[done],runeCredits:[credit],runeRequests:[],runeLedgerVersion:2}});
 if(failure==='later-module')backend.rows.set('contracts',{module:'contracts',revision:1,payload:{invalid:true}});
 const metadata=new Map();let rejectMeta=failure==='metadata';const api={meta:async key=>metadata.get(key)||null,putMeta:async(key,value)=>{if(rejectMeta){rejectMeta=false;throw Error('TEST metadata failure');}metadata.set(key,clone(value));}};
 const a=client(t,'joiner',backend,{api,state:{manualMissions:[done],runeCredits:[],runeRequests:[request],familyMembers:members}});await a.provider.start();const before=clone(a.st);await a.action('join-family');assert.deepEqual(clone(a.st),before);assert.equal(a.provider.isConfigured('missions'),false);assert.equal(a.st.runeRequests.length,1);assert.deepEqual([...metadata.values()],[{}]);assert.equal(backend.writes.length,0);
});

test('activate-all and join-family use RPC V2 for Missions while other module writers keep their existing paths',async t=>{
 const backend=backendV2(),a=client(t,'all-a',backend,{state:{manualMissions:[mission()],familyMembers:members}});await a.provider.start();await a.action('activate-all');assert.equal(backend.rows.size,6);assert.equal(backend.writes.length,1);assert.equal(state(a).runeProtocol,2);const b=client(t,'all-b',backend);await b.provider.start();await b.action('join-family');assert.equal(b.provider.isConfigured('missions'),true);assert.equal(state(b).runeProtocol,2);assert.equal(b.st.manualMissions[0].id,'shared-one');assert.equal(backend.writes.length,1);assert.equal(backend.journal.filter(row=>row.method==='POST').length,5);
});

test('unknown Missions payload fields block conversion without replacing either copy',async t=>{
 const backend=backendV2(),payload={autoTasks:[],manualMissions:[mission('remote')],runeCredits:[],runeLedgerVersion:2,extension:{opaque:'retained'}};
 backend.rows.set('missions',{module:'missions',revision:3,payload:clone(payload)});
 const a=client(t,'opaque',backend,{state:{manualMissions:[mission('local')],familyMembers:members}});await a.provider.start();const before=clone(a.st);
 await a.action('activate','missions');
 assert.deepEqual(clone(a.st),before);assert.equal(backend.writes.length,0);assert.deepEqual(backend.rows.get('missions').payload,payload);
});

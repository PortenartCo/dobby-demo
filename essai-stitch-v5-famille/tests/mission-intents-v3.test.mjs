import test from 'node:test';
import assert from 'node:assert/strict';
import {createMissionIntentTransport, MISSION_V3_RELEASE_VERIFIED} from '../family-mission-intents.mjs';
import * as R from '../family-runes-core.mjs';
import {normalizeMission} from '../family-missions-core.mjs';
import {assertSharedWrite,isCanonicalChildMissionCompletion} from '../family-core.mjs';

const copy=value=>structuredClone(value);
const capability={protocol:3,intentVersion:1,participantVersion:1,ledgerVersions:[1,2,3],maxPayloadBytes:262144,directWritesBlocked:true,atomicAllocations:true,canonicalAuthorization:true,clientVerified:true,contract:'dobby-missions-intents-v3-1'};
const mission={id:'test-mission',title:'TEST — Mission',status:'open',effort:'regular',rewardVersion:1,participantVersion:1,assigneeIds:['a','b'],allFamily:false};
const initial={module:'missions',revision:4,payload:{autoTasks:[],manualMissions:[mission],runeCredits:[],runeRequests:[],runeLedgerVersion:2,extension:{keep:true}}};
const intent={kind:'complete',missionId:mission.id,participantIds:['b','a']};
function harness(options={}){
 let actor={userId:'account-a',householdId:'home-a',memberId:'a',identityVerified:true,category:'parent',permissions:{canCompleteMissionsV3:true},token:'a|home-a|epoch-1'},pending=null,remote=copy(initial),calls=[],confirmed=[];
 const settings={releaseVerified:true,context:()=>copy(actor),capability:()=>({value:capability,token:actor.token}),members:()=>[{id:'a',memberCategory:'parent'},{id:'b',memberCategory:'child'},{id:'pet',memberCategory:'pet'}],
  readPending:async()=>copy(pending),writePending:async value=>{pending=copy(value);},uuid:()=> '00000000-0000-4000-8000-000000000001',
  send:async body=>{calls.push(copy(body));const grants=R.completionRequests(mission,settings.members(),body.p_intent.participantIds,[],[],'2026-11-13T12:00:00Z');remote={...remote,revision:5,payload:{...remote.payload,manualMissions:[{...mission,status:'done',participants:['a','b']}],runeCredits:grants.map(g=>({...g,revision:5})),runeLedgerVersion:3}};return{protocol:3,replayed:false,operation:{id:body.p_operation_id,revision:5,changed:true,digest:'a'.repeat(64)},module:copy(remote)};},
  confirm:async value=>{confirmed.push(copy(value));},...options};
 const transport=createMissionIntentTransport(settings);
 return{transport,settings,calls,confirmed,get pending(){return copy(pending);},set pending(value){pending=copy(value);},set actor(value){actor={...actor,...value};},get actor(){return copy(actor);},get remote(){return copy(remote);}};
}
test('release stays closed even when a server announces V3',async()=>{
 assert.equal(MISSION_V3_RELEASE_VERIFIED,false);
 const h=harness({releaseVerified:false});assert.equal(h.transport.available(),false);
 await assert.rejects(()=>h.transport.submit(intent,initial),/validation serveur/i);assert.equal(h.calls.length,0);assert.equal(h.pending,null);
});
test('server client verification must be explicitly true before any intent is persisted or sent',async()=>{
 for(const clientVerified of [false,undefined,'true',1]){
  const value={...capability,clientVerified};if(clientVerified===undefined)delete value.clientVerified;
  let persisted=0;const h=harness({capability:()=>({value,token:h.actor.token}),writePending:async()=>{persisted++;}});
  assert.equal(h.transport.available(),false);await assert.rejects(()=>h.transport.submit(intent,initial),/validation serveur/);
  assert.equal(persisted,0);assert.equal(h.calls.length,0);assert.equal(h.pending,null);
 }
});
test('complete sends only explicit participant IDs; persist precedes HTTP and receipt preserves allocations',async()=>{
 const h=harness();const send=h.settings.send;h.settings.send=async body=>{assert.ok(h.pending);assert.deepEqual(body.p_intent,{kind:'complete',missionId:'test-mission',participantIds:['a','b']});return send(body);};
 const result=await h.transport.submit(intent,initial);assert.equal(result.payload.runeCredits[0].amount,25);assert.deepEqual(result.payload.runeCredits[0].allocations,[{memberId:'a',amount:13},{memberId:'b',amount:12}]);assert.deepEqual(result.payload.extension,{keep:true});assert.equal(h.pending,null);assert.equal(h.confirmed.length,1);
});
test('lost response keeps exact operation, revision and intent across a fresh transport',async()=>{
 const h=harness();const send=h.settings.send;h.settings.send=async body=>{await send(body);throw Error('network lost');};
 await assert.rejects(()=>h.transport.submit(intent,initial),/network/);const saved=h.pending;assert.ok(saved);
 h.settings.send=async body=>{h.calls.push(copy(body));return{protocol:3,replayed:true,operation:{id:body.p_operation_id,revision:5,digest:'b'.repeat(64)},module:{...h.remote,revision:8}};};
 const resumed=createMissionIntentTransport(h.settings);await resumed.resume();assert.deepEqual(h.calls[0],h.calls[1]);assert.equal(h.confirmed[0].revision,8);assert.equal(h.pending,null);
});
test('a changed actor after HTTP cannot adopt a receipt or clear the saved operation',async()=>{
 const h=harness();const send=h.settings.send;h.settings.send=async body=>{const result=await send(body);h.actor={userId:'account-b',memberId:'b',token:'b|home-a|epoch-2'};return result;};
 await assert.rejects(()=>h.transport.submit(intent,initial),/contexte.*changé/i);assert.equal(h.confirmed.length,0);assert.ok(h.pending);
});
test('contradictory allocation receipt leaves durable operation and local state untouched',async()=>{
 const h=harness();const send=h.settings.send;h.settings.send=async body=>{const result=await send(body);result.module.payload.runeCredits[0].allocations[0].amount=14;return result;};
 await assert.rejects(()=>h.transport.submit(intent,initial),/répartition|récompense|confirmation/i);assert.equal(h.confirmed.length,0);assert.ok(h.pending);
});
test('CAS rejection is retained and never silently rebuilt with another operation',async()=>{
 const h=harness({send:async()=>{throw Object.assign(Error('stale revision'),{code:'40001'});}});
 await assert.rejects(()=>h.transport.submit(intent,initial),/stale/);assert.equal(h.pending.rejection.code,'40001');await assert.rejects(()=>h.transport.resume(),/conflit|relire/i);assert.ok(h.pending);
});
test('children cannot send snapshot/reopen and cannot complete an unassigned mission',async()=>{
 const h=harness();h.actor={category:'child',memberId:'b'};
 for(const bad of [{kind:'snapshot',payload:initial.payload},{kind:'reopen',missionId:'test-mission'}])await assert.rejects(()=>h.transport.submit(bad,initial),/parent/i);
 const unassigned=copy(initial);unassigned.payload.manualMissions[0].assigneeIds=[];
 await assert.rejects(()=>h.transport.submit(intent,unassigned),/attribuée|éligible/i);assert.equal(h.calls.length,0);
});
test('arbitrary credit fields, unknown participants and a pending different intent never reach the writer',async()=>{
 const h=harness();await assert.rejects(()=>h.transport.submit({...intent,amount:999},initial),/champ|intention/i);
 await assert.rejects(()=>h.transport.submit({...intent,participantIds:['pet']},initial),/participant|animal/i);
 h.settings.send=async()=>{throw Error('network');};await assert.rejects(()=>h.transport.submit(intent,initial));const saved=h.pending;
 await assert.rejects(()=>h.transport.submit({kind:'reopen',missionId:'test-mission'},initial),/opération|attente/i);assert.deepEqual(h.pending,saved);
});
test('a repeated click shares one durable operation, while another intent waits',async()=>{
 let done;const gate=new Promise(resolve=>{done=resolve;}),h=harness();const send=h.settings.send;h.settings.send=async body=>{await gate;return send(body);};
 const first=h.transport.submit(intent,initial),second=h.transport.submit(intent,initial);assert.equal(first,second);
 await assert.rejects(()=>h.transport.submit({kind:'reopen',missionId:'test-mission'},initial),/en cours/);done();await first;assert.equal(h.calls.length,1);
});
test('only a definitive rejected operation can be archived after explicit resolution',async()=>{
 const h=harness({send:async()=>{throw Object.assign(Error('stale'),{code:'40001'});}});await assert.rejects(()=>h.transport.submit(intent,initial));
 const archived=[];await h.transport.resolveRejected(async value=>archived.push(value));assert.equal(archived[0].rejection.code,'40001');assert.equal(h.pending,null);
 const ambiguous=harness({send:async()=>{throw Error('network');}});await assert.rejects(()=>ambiguous.transport.submit(intent,initial));await assert.rejects(()=>ambiguous.transport.resolveRejected(async()=>{}),/refus atomique/);assert.ok(ambiguous.pending);
});
test('V3 IDs preserve 120 PostgreSQL characters and exact JavaScript UTF-16 lexical order',()=>{
 const a='😀'.repeat(120),b='\uE000'.repeat(120),ids=[b,a],row=normalizeMission({...mission,assigneeId:a,assigneeIds:ids});
 assert.equal(row.assigneeId,a);assert.deepEqual(row.assigneeIds,[a,b]);assert.deepEqual(R.allocateReward(25,ids),[{memberId:a,amount:13},{memberId:b,amount:12}]);
 const events=R.completionRequests(row,ids.map(id=>({id,memberCategory:'child'})),ids,[],[],'2026-11-13T12:00:00Z');assert.equal(R.normalizeCredits(events.map(event=>({...event,revision:1})))[0].memberId,a);
 assert.throws(()=>normalizeMission({...row,assigneeIds:['x'.repeat(121)]}),/Attribution/);assert.throws(()=>R.allocateReward(25,['😀'.repeat(121)]),/participants/);
 for(const invalid of ['test\u0000id','test\uD800','test\uDC00'])assert.throws(()=>R.allocateReward(25,[invalid]),/participants/);
 // The historical unallocated event bound is unchanged.
 assert.throws(()=>R.normalizeCredits([{missionId:'old',memberId:'x'.repeat(101),title:'TEST',effort:'regular',amount:25,date:'2026-11-13T12:00:00Z',revision:0}]),/Bénéficiaire/);
});
test('child completion exception requires exact canonical body and stays closed in this release',()=>{
 const access={verified:true,phase:'active',memberId:'b',householdId:'home-a',profile:{memberCategory:'child'},permissions:{canCompleteMissionsV3:true}};
 const request={query:'rpc/dobby_missions_v3_write',body:{p_household_id:'home-a',p_expected_revision:4,p_operation_id:'00000000-0000-4000-8000-000000000001',p_intent:{kind:'complete',missionId:'test-mission',participantIds:['b']}},access};
 assert.equal(isCanonicalChildMissionCompletion(request),true);
 for(const bad of [{...request,access:{...access,verified:false}},{...request,body:{...request.body,p_household_id:'foreign'}},{...request,body:{...request.body,p_intent:{kind:'reopen',missionId:'test-mission'}}},{...request,body:{...request.body,p_intent:{...request.body.p_intent,amount:999}}}])assert.equal(isCanonicalChildMissionCompletion(bad),false);
 assert.throws(()=>assertSharedWrite({...request,method:'POST'}),/lecture seule/);
});
test('historical credit extensions and exact date representation survive a receipt unchanged',async()=>{
 const old={missionId:'old-history',memberId:'a',title:'TEST — History',effort:'regular',amount:25,date:'2020-02-03T12:00:00+02:00',revision:0,extension:{keep:true}},baseline=copy(initial);baseline.payload.runeCredits=[old];
 const h=harness();const send=h.settings.send;h.settings.send=async body=>{const result=await send(body);result.module.payload.runeCredits.unshift(copy(old));return result;};
 const result=await h.transport.submit(intent,baseline);assert.deepEqual(result.payload.runeCredits[0],old);
 const bad=harness();const sendBad=bad.settings.send;bad.settings.send=async body=>{const result=await sendBad(body);result.module.payload.runeCredits.unshift({...old,date:'2020-02-03T10:00:00.000Z'});return result;};
 await assert.rejects(()=>bad.transport.submit(intent,baseline),/Historique confirmé.*réécrit/);assert.ok(bad.pending);assert.equal(bad.confirmed.length,0);
});
test('a parent snapshot queued before a role change cannot resume under a child context',async()=>{
 const h=harness({send:async()=>{throw Error('network');}});await assert.rejects(()=>h.transport.submit({kind:'snapshot',payload:initial.payload},initial));h.actor={category:'child'};
 await assert.rejects(()=>h.transport.resume(),/parent/);assert.ok(h.pending);
 const empty=harness();assert.equal(await empty.transport.resume(),null);assert.equal(empty.calls.length,0);
});
test('a plausible receipt that ignored completion or snapshot edits is never adopted',async()=>{
 const h=harness();const send=h.settings.send;h.settings.send=async body=>{const result=await send(body);result.module.payload.manualMissions[0].status='open';return result;};
 await assert.rejects(()=>h.transport.submit(intent,initial),/Confirmation de validation/);assert.equal(h.confirmed.length,0);assert.ok(h.pending);
 const snapshot=harness({send:async body=>({protocol:3,replayed:false,operation:{id:body.p_operation_id,revision:5,changed:true,digest:'a'.repeat(64)},module:{...copy(initial),revision:5,payload:{...copy(initial.payload),runeLedgerVersion:3}}})});
 await assert.rejects(()=>snapshot.transport.submit({kind:'snapshot',payload:{...copy(initial.payload),manualMissions:[{...mission,title:'TEST — edited'}]}},initial),/Confirmation des modifications/);assert.ok(snapshot.pending);
});
test('an already confirmed V3 completion accepts a genuine no-op without another revision or credit',async()=>{
 const completed=copy(initial),events=R.completionRequests(mission,[{id:'a'},{id:'b'}],['a','b'],[],[],'2026-11-13T12:00:00Z');
 completed.payload.manualMissions[0].status='done';completed.payload.runeCredits=events.map(event=>({...event,revision:4}));completed.payload.runeLedgerVersion=3;
 const h=harness({send:async body=>({protocol:3,replayed:false,operation:{id:body.p_operation_id,revision:4,changed:false,digest:'a'.repeat(64)},module:copy(completed)})});
 const result=await h.transport.submit(intent,completed);assert.equal(result.revision,4);assert.equal(result.payload.runeCredits.length,1);assert.equal(h.pending,null);
 const invalid=harness({send:async body=>({protocol:3,replayed:false,operation:{id:body.p_operation_id,revision:4,changed:false,digest:'a'.repeat(64)},module:copy(completed)})});
 await assert.rejects(()=>invalid.transport.submit(intent,initial),/Confirmation V3 incohérente/);assert.ok(invalid.pending);
 const mutated=harness({send:async body=>{const module=copy(completed);module.payload.runeCredits.push({...copy(events[0]),missionId:'unexpected',eventId:'unexpected~0~grant',revision:4});return{protocol:3,replayed:false,operation:{id:body.p_operation_id,revision:4,changed:false,digest:'a'.repeat(64)},module};}});
 await assert.rejects(()=>mutated.transport.submit(intent,completed),/sans changement.*modifier/);assert.ok(mutated.pending);assert.equal(mutated.confirmed.length,0);
 const dropped=harness();const send=dropped.settings.send;dropped.settings.send=async body=>{const response=await send(body);delete response.module.payload.extension;return response;};
 await assert.rejects(()=>dropped.transport.submit(intent,initial),/Extension Missions.*supprimée/);assert.ok(dropped.pending);
});

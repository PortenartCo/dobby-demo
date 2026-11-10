import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../family-runes-core.mjs';
import {makeBackend,makeClient} from './helpers/modules-harness.mjs';
const date='2026-11-10T12:00:00.000Z',members=[{id:'member-a'},{id:'member-b'}];
const mission=(id,memberId='member-a',effort='regular')=>({id,title:'TEST — '+id,status:'open',assigneeId:memberId,effort,rewardVersion:1,category:'Famille',due:'',note:''});
function complete(client,id,changes={}){const old=client.st.manualMissions.find(m=>m.id===id),row={...old,...changes};const request=R.completionRequest(row,members,client.st.runeCredits||[],client.st.runeRequests||[],date);client.st.manualMissions=client.st.manualMissions.map(m=>m.id===id?{...row,status:'done',completedAt:date}:m);if(request)client.st.runeRequests=[...(client.st.runeRequests||[]),request];}
async function household(rows){const backend=makeBackend(),a=makeClient('a',backend),b=makeClient('b',backend);a.st.manualMissions=rows;await a.provider.start();await a.action('activate','missions');await b.provider.start();await b.action('activate','missions');return{backend,a,b};}
for(const preference of ['server','local'])test('concurrent distinct credits survive '+preference+' conflict resolution and mission deletion',async()=>{
 const {backend,a,b}=await household([mission('fm-a','member-a','light'),mission('fm-b','member-b','major')]);complete(a,'fm-a');complete(b,'fm-b');await a.provider.sync();assert.equal(a.st.runeCredits?.length,1);await b.provider.sync();assert.match(b.provider.html(),/Conflit/);await b.action(preference,'missions');await a.provider.sync();
 assert.equal(backend.rows.get('missions').payload.runeCredits.length,2);assert.equal(R.memberSummary('member-a',a.st.runeCredits,[]).total,10);assert.equal(R.memberSummary('member-b',b.st.runeCredits,[]).total,50);
 b.st.manualMissions=[];await b.provider.sync();await a.provider.sync();assert.equal(a.st.runeCredits.length,2,'ledger survives removing every mission row');
});
test('same mission, divergent offline assignment/effort: first confirmed CAS wins, loser never counted',async()=>{
 const {backend,a,b}=await household([mission('fm-same','member-a','light')]);complete(a,'fm-same');complete(b,'fm-same',{assigneeId:'member-b',effort:'major'});await a.provider.sync();await b.provider.sync();assert.equal(R.memberSummary('member-b',b.st.runeCredits,b.st.runeRequests).total,0);await b.action('local','missions');await a.provider.sync();
 const credits=backend.rows.get('missions').payload.runeCredits;assert.equal(credits.length,1);assert.equal(credits[0].memberId,'member-a');assert.equal(credits[0].amount,10);assert.equal(R.memberSummary('member-b',b.st.runeCredits,b.st.runeRequests).settledElsewhere,1);
 await b.provider.sync();assert.equal(backend.rows.get('missions').payload.runeCredits.length,1);
});
test('accepted PATCH with lost response and reload confirms the same request without replay credit',async()=>{
 const {backend,a}=await household([mission('fm-lost')]);const original=backend.authorized;let lost=true;backend.authorized=async(...args)=>{const result=await original(...args);if(args[1]==='PATCH'&&lost){lost=false;throw Error('TEST lost response');}return result;};complete(a,'fm-lost');await a.provider.sync();assert.equal(a.st.runeCredits?.length||0,0,'no premature local confirmation');assert.equal(backend.rows.get('missions').payload.runeCredits.length,1);
 const reloaded=makeClient('a',backend,false,true,{state:structuredClone(a.st),metadata:[...a.metadata.entries()]});await reloaded.provider.start();await reloaded.provider.sync();assert.equal(reloaded.st.runeCredits.length,1);assert.equal(R.memberSummary('member-a',reloaded.st.runeCredits,reloaded.st.runeRequests).total,25);assert.doesNotMatch(reloaded.provider.html(),/Conflit à résoudre/);
});
test('CAS loss between GET/PATCH retains pending intent, then existing resolver converges',async()=>{
 const {backend,a,b}=await household([mission('fm-race-a'),mission('fm-race-b','member-b')]);complete(a,'fm-race-a');complete(b,'fm-race-b');await Promise.all([a.provider.sync(),b.provider.sync()]);const loser=/Conflit à résoudre/.test(a.provider.html())?a:b;assert.match(loser.provider.html(),/Conflit/);assert.ok(loser.st.runeRequests.length);await loser.action('local','missions');await a.provider.sync();await b.provider.sync();assert.equal(backend.rows.get('missions').payload.runeCredits.length,2);
});
test('activation/retrieval preserves local pending requests and never credits legacy done rows',async()=>{
 const {backend,a}=await household([{...mission('fm-old'),rewardVersion:undefined,status:'done',completedAt:date},mission('fm-new')]);assert.equal(a.st.runeCredits?.length||0,0);const b=makeClient('b',backend);const req=R.completionRequest(mission('fm-offline','member-b','major'),members,[],[],date);b.st.runeRequests=[req];await b.provider.start();await b.action('join-family');assert.equal(b.st.runeRequests.length,1);await b.provider.sync();assert.equal(backend.rows.get('missions').payload.runeCredits.length,1);assert.equal(backend.rows.get('missions').payload.runeCredits[0].missionId,'fm-offline');
});
test('a legacy writer dropping the known ledger protocol is detected and blocked, not called synchronized',async()=>{
 const {backend,a}=await household([mission('fm-protocol')]);complete(a,'fm-protocol');await a.provider.sync();const row=backend.rows.get('missions');row.payload={manualMissions:row.payload.manualMissions,autoTasks:row.payload.autoTasks};row.revision++;await a.provider.sync();assert.equal(a.st.runeCredits.length,1);assert.match(a.provider.html(),/Conflit|incompatible/);assert.equal(backend.rows.get('missions').payload.runeCredits,undefined,'demonstrates actual architecture limit: old writer can erase server field');
});
test('JSON object key order from jsonb cannot trigger a repeated reward PATCH',async t=>{
 const backend=makeBackend(),original=backend.authorized;const sorted=value=>Array.isArray(value)?value.map(sorted):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,sorted(value[k])])):value;backend.authorized=async(...args)=>sorted(await original(...args));
 const a=makeClient('a',backend);t.after(()=>a.provider.reset());a.st.manualMissions=[mission('fm-jsonb')];await a.provider.start();await a.action('activate','missions');complete(a,'fm-jsonb');await a.provider.sync();const count=backend.journal.filter(x=>x.method==='PATCH').length;await a.provider.sync();assert.equal(backend.journal.filter(x=>x.method==='PATCH').length,count,'stable payload must not write twice when jsonb reorders nested keys');assert.match(a.provider.html(),/Partagé · à jour/);
});
test('a second native completion during PATCH keeps newer local data and its unconfirmed request',async t=>{
 const {backend,a}=await household([mission('fm-during-a'),mission('fm-during-b')]);t.after(()=>a.provider.reset());complete(a,'fm-during-a');const original=backend.authorized;let changed=false;backend.authorized=async(...args)=>{if(args[1]==='PATCH'&&!changed){changed=true;complete(a,'fm-during-b');}return original(...args);};await a.provider.sync();assert.equal(a.st.manualMissions.find(m=>m.id==='fm-during-b').status,'done');assert.equal(a.st.runeCredits.length,1);assert.equal(R.memberSummary('member-a',a.st.runeCredits,a.st.runeRequests).pending,25);await a.provider.sync();assert.equal(a.st.runeCredits.length,2);assert.equal(R.memberSummary('member-a',a.st.runeCredits,a.st.runeRequests).total,50);
});
test('a malformed confirmation or server refusal never fabricates a confirmed gain',async()=>{
 const {backend,a}=await household([mission('fm-refused')]);complete(a,'fm-refused');const original=backend.authorized;backend.authorized=async(...args)=>{if(args[1]==='PATCH')throw Error('TEST 413 payload refused');return original(...args);};await a.provider.sync();assert.equal(a.st.runeCredits.length,0);assert.equal(a.st.runeRequests.length,1);assert.equal(R.memberSummary('member-a',a.st.runeCredits,a.st.runeRequests).pending,25);
});

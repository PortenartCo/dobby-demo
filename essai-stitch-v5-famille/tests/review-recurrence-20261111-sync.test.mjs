import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../family-runes-core.mjs';
import {makeBackend,makeClient} from './helpers/modules-harness.mjs';

const date='2026-11-11T12:00:00.000Z';
const members=[{id:'member-a'},{id:'member-b'}];
const root=()=>({id:'fm-review-series',title:'TEST — série quotidienne',due:'2026-11-11',category:'Famille',status:'open',assigneeId:'member-a',effort:'regular',rewardVersion:1,note:'',recurrence:{version:1,seriesId:'fm-review-series',rules:[{from:'2026-11-11',start:'2026-11-11',frequency:'daily',weekdays:[],monthDay:11,shortMonth:'last-day',state:'active',template:{title:'TEST — série quotidienne',category:'Famille',assigneeId:'member-a',note:'',effort:'regular',rewardVersion:1}}]}});
const occurrence=(day='2026-11-12')=>{const {recurrence,...row}=root();return{...row,id:'fm-review-series-r'+day.replaceAll('-',''),due:day,seriesId:'fm-review-series',occurrenceDate:day};};
async function household(t,rows=[root(),occurrence()]){
 const backend=makeBackend(),a=makeClient('a',backend),b=makeClient('b',backend);
 t.after(()=>{a.provider.reset();b.provider.reset();});
 a.st.manualMissions=structuredClone(rows);await a.provider.start();await a.action('activate','missions');await b.provider.start();await b.action('activate','missions');return{backend,a,b};
}
function complete(client,id){
 const row=client.st.manualMissions.find(m=>m.id===id),request=R.completionRequest(row,members,client.st.runeCredits||[],client.st.runeRequests||[],date);
 client.st.manualMissions=client.st.manualMissions.map(m=>m.id===id?{...m,status:'done',completedAt:date}:m);
 if(request)client.st.runeRequests=[...(client.st.runeRequests||[]),request];
}
for(const corruption of ['root-metadata','child-metadata','root-deleted','child-deleted','child-identity'])test('acknowledged recurrence survives incompatible legacy write: '+corruption,async t=>{
 const {backend,a}=await household(t);const before=structuredClone(a.st.manualMissions),remote=backend.rows.get('missions');
 if(corruption==='root-metadata')delete remote.payload.manualMissions[0].recurrence;
 if(corruption==='child-metadata'){delete remote.payload.manualMissions[1].seriesId;delete remote.payload.manualMissions[1].occurrenceDate;}
 if(corruption==='root-deleted')remote.payload.manualMissions.shift();
 if(corruption==='child-deleted')remote.payload.manualMissions.pop();
 if(corruption==='child-identity')remote.payload.manualMissions[1].occurrenceDate='2026-11-13';
 remote.revision++;await a.provider.sync();
 assert.deepEqual(a.st.manualMissions,before,'the acknowledged local series and occurrence history must survive');
 assert.match(a.provider.html(),/incompatible|Conflit/);
 assert.doesNotMatch(a.provider.html(),/Partagé · à jour/);
 assert.equal(backend.journal.filter(x=>x.method==='PATCH').length,0,'incompatible remote data must not be silently rewritten');
 assert.equal(remote.payload.runeLedgerVersion,1,'a rune-capable old writer can still lose recurrence metadata');
 for(const preference of ['server','local']){await a.action(preference,'missions');assert.deepEqual(a.st.manualMissions,before,'the conflict chooser cannot bypass the compatibility guard');}
});
test('legacy local edit cannot publish missing acknowledged recurrence metadata',async t=>{
 const {backend,a}=await household(t);delete a.st.manualMissions[0].recurrence;await a.provider.sync();
 assert.ok(backend.rows.get('missions').payload.manualMissions[0].recurrence);
 assert.equal(backend.journal.filter(x=>x.method==='PATCH').length,0);assert.match(a.provider.html(),/incompatible|Conflit/);
});
test('fresh client refuses an unsupported recurrence version without replacing its local data',async t=>{
 const {backend}=await household(t);backend.rows.get('missions').payload.manualMissions[0].recurrence.version=2;
 const fresh=makeClient('fresh',backend);t.after(()=>fresh.provider.reset());fresh.st.manualMissions=[{id:'fm-private-test',title:'TEST local',category:'Famille',status:'open',due:''}];
 await fresh.provider.start();await fresh.action('activate','missions');assert.equal(fresh.st.manualMissions[0].id,'fm-private-test');assert.equal(fresh.provider.isConfigured('missions'),false);assert.doesNotMatch(fresh.provider.html(),/Partagé · à jour/);
});
test('supported series edits and new offline occurrences use the unchanged native sync payload',async t=>{
 const first=root();first.extension={preserve:'TEST unknown field'};first.recurrence.rules[0].template.extension={preserve:'TEST template field'};
 const {backend,a,b}=await household(t,[first,occurrence()]);a.st.manualMissions[0].recurrence.rules.push({...structuredClone(root().recurrence.rules[0]),from:'2026-11-13',state:'paused'});
 a.st.manualMissions.push(occurrence('2026-11-13'));await a.provider.sync();await b.provider.sync();
 assert.deepEqual(structuredClone(b.st.manualMissions),structuredClone(a.st.manualMissions));assert.equal(b.st.manualMissions[0].recurrence.rules[1].state,'paused');
 const payload=backend.rows.get('missions').payload;assert.deepEqual(Object.keys(payload).sort(),['autoTasks','manualMissions','runeCredits','runeLedgerVersion']);
 assert.equal(payload.manualMissions.length,3);assert.match(b.provider.html(),/Partagé · à jour/);
 assert.equal(b.st.manualMissions[0].extension.preserve,'TEST unknown field');assert.equal(b.st.manualMissions[0].recurrence.rules[0].template.extension.preserve,'TEST template field');
});
test('distinct occurrences earn independently; replay and lost-response reload remain idempotent',async t=>{
 const {backend,a,b}=await household(t);complete(a,'fm-review-series');complete(b,'fm-review-series-r20261112');await a.provider.sync();await b.provider.sync();await b.action('local','missions');await a.provider.sync();
 assert.equal(backend.rows.get('missions').payload.runeCredits.length,2);assert.equal(R.memberSummary('member-a',a.st.runeCredits,a.st.runeRequests).total,50);
 a.st.manualMissions=a.st.manualMissions.map(m=>({...m,status:'open',completedAt:''}));complete(a,'fm-review-series');complete(a,'fm-review-series-r20261112');await a.provider.sync();assert.equal(backend.rows.get('missions').payload.runeCredits.length,2);
 a.st.manualMissions.push(occurrence('2026-11-13'));complete(a,'fm-review-series-r20261113');const original=backend.authorized;let lost=true;
 backend.authorized=async(...args)=>{const result=await original(...args);if(args[1]==='PATCH'&&lost){lost=false;throw Error('TEST response lost');}return result;};
 await a.provider.sync();assert.equal(backend.rows.get('missions').payload.runeCredits.length,3);assert.equal(a.st.runeCredits.length,2);
 const reloaded=makeClient('a',backend,false,true,{state:structuredClone(a.st),metadata:[...a.metadata.entries()]});t.after(()=>reloaded.provider.reset());await reloaded.provider.start();await reloaded.provider.sync();
 assert.equal(reloaded.st.runeCredits.length,3);assert.equal(R.memberSummary('member-a',reloaded.st.runeCredits,reloaded.st.runeRequests).total,75);assert.ok(reloaded.st.manualMissions[0].recurrence);assert.equal(backend.rows.get('missions').payload.runeCredits.length,3);
});

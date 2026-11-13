import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import * as R from '../family-runes-core.mjs';
import {makeBackend,makeClient} from './helpers/modules-harness.mjs';
const mission={id:'gate-review',title:'TEST — V3 gate',status:'open',category:'Famille',due:'',effort:'regular',rewardVersion:1,assigneeIds:['a','b'],participantVersion:1};
const humans=[{id:'a'},{id:'b'}],requests=R.completionRequests(mission,humans,['a','b'],[],[],'2026-11-13T12:00:00Z'),credits=R.acceptRequests([],requests,0);
for(const v2 of [false,true])test('M08 V3 local allocation cannot activate V1/V2 sharing or serialize a downgraded ledger '+v2,async t=>{
 const backend=makeBackend(),authorized=backend.authorized;backend.authorized=async(...args)=>args[2].startsWith('rpc/dobby_missions_v2_capabilities')?{protocol:2,directWritesBlocked:true,maxPayloadBytes:262144}:authorized(...args);
 if(!v2)backend.authorized=authorized;
 const c=makeClient('test',backend,false,true,{crypto:webcrypto,state:{manualMissions:[mission],runeCredits:credits,runeRequests:requests}});t.after(()=>c.provider.reset());const before=structuredClone(c.st);await c.provider.start();await c.action('activate','missions');assert.equal(backend.rows.has('missions'),false);assert.deepEqual(c.st,before);assert.match(c.provider.html(),/participants.*validation serveur|validation serveur.*participants/i);
});
test('M08 V3 remote payload cannot replace local V1/V2 state on pull',async t=>{
 const backend=makeBackend(),c=makeClient('test',backend);t.after(()=>c.provider.reset());await c.provider.start();await c.action('activate','missions');const before=structuredClone(c.st),remote=backend.rows.get('missions');remote.payload={autoTasks:[],manualMissions:[mission],runeCredits:credits,runeLedgerVersion:3};remote.revision++;await c.provider.sync();assert.deepEqual(c.st,before);assert.match(c.provider.html(),/participants.*validation serveur|validation serveur.*participants/i);
});
test('M06 an uncompleted multi-assignee mission also cannot enter the legacy shared payload',async t=>{
 const backend=makeBackend(),c=makeClient('test',backend,false,true,{state:{manualMissions:[mission],runeCredits:[],runeRequests:[]}});t.after(()=>c.provider.reset());await c.provider.start();await c.action('activate','missions');assert.equal(backend.rows.has('missions'),false);assert.match(c.provider.html(),/participants.*validation serveur/i);assert.equal(c.st.manualMissions.length,1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createMissionIntentTransport,validateMissionV3Module} from '../family-mission-intents.mjs';
import {participationStatus} from '../family-mission-progress.mjs';

const op='00000000-0000-4000-8000-000000000001';
const goal='00000000-0000-4000-8000-000000000002';
const capability={protocol:3,intentVersion:1,participantVersion:1,contract:'dobby-missions-intents-v3-1',
 maxPayloadBytes:262144,directWritesBlocked:true,atomicAllocations:true,canonicalAuthorization:true,clientVerified:true,
 ledgerVersions:[1,2,3],runesLot1:1,runesLot2:1};
const date='2026-11-20';
const mission={id:'m',due:date,individualRunes:true,assigneeIds:['child','sibling']};
const model={module:'missions',revision:1,payload:{manualMissions:[mission],autoTasks:[],runeCredits:[],runeLedgerVersion:3}};
const pendingRow={id:op,action:'submit',revision:2,status:'pending',missionId:'m',memberId:'child',amount:25};
const result={module:'missions',revision:2,payload:{...model.payload,missionParticipation:[pendingRow]}};
const submission={kind:'submit',missionId:'m',memberId:'child'};

test('individual date distinguishes missed, pending approval and credited history',()=>{
 assert.equal(participationStatus(mission,null,'2026-11-21'),'missed');
 assert.equal(participationStatus(mission,pendingRow,'2026-12-01'),'pending');
 assert.equal(participationStatus(mission,{status:'credited'},'2026-12-01'),'credited');
 assert.equal(participationStatus({...mission,due:'',occurrenceDate:'2026-11-28'},null,date),'future');
});

test('an unconfirmed, privately prepared surprise has no title and history stays append-only',()=>{
 const plan={...result,payload:{...result.payload,runeGoals:{child:{id:goal,threshold:40,mode:'surprise',unlocked:false}}}};
 validateMissionV3Module(plan,result);
 assert.throws(()=>validateMissionV3Module({...plan,payload:{...plan.payload,runeGoals:{child:{...plan.payload.runeGoals.child,title:'confidentiel'}}}},result),/surprise exposée/);
 assert.throws(()=>validateMissionV3Module({...result,payload:{...result.payload,missionParticipation:[]}},result),/écrit/);
 assert.throws(()=>validateMissionV3Module({...result,payload:{...result.payload,missionParticipation:[{...pendingRow,status:'credited'}]}},result),/Crédit/);
});

test('a child resumes the exact durable submission after a lost receipt, and cannot submit for someone else',async()=>{
 let queued=null,confirmed=null;
 const calls=[];
 const transport=createMissionIntentTransport({
  releaseVerified:false,context:()=>({identityVerified:true,category:'child',userId:'u',householdId:'h',memberId:'child',token:'t',
   permissions:{canCompleteMissionsV3:true}}),
  capability:()=>({token:'t',value:capability}),members:()=>[],uuid:()=>op,
  readPending:async()=>queued,
  writePending:async(value,expected)=>{assert.equal(queued?.id||null,expected);queued=structuredClone(value);return true;},
  send:async body=>{
   assert.ok(queued);calls.push(body);
   if(calls.length===1)throw Error('transport interrompu');
   return {protocol:3,replayed:true,operation:{id:op,revision:2,digest:'a'.repeat(64)},module:result};
  },
  confirm:async module=>{confirmed=module;}
 });
 await assert.rejects(()=>transport.submit({...submission,memberId:'sibling'},model),/assigné/);
 await assert.rejects(()=>transport.submit({kind:'approve',missionId:'m',memberId:'child'},model),/réservée/);
 await assert.rejects(()=>transport.submit(submission,model),/interrompu/);
 assert.equal(queued.id,op);assert.equal(confirmed,null);
 await transport.resume();
 assert.deepEqual(calls[0],calls[1]);assert.deepEqual(confirmed,result);assert.equal(queued,null);
});

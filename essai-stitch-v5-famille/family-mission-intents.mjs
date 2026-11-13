/* Shared Missions V3 transport. Server owns credits, dates, cycles and totals.
 * This module does not authorize a user or certify a deployed backend.
 */
import * as runes from './family-runes-core.mjs';

// Change only after the real installation and security recipe are recorded.
// A capability response, browser flag or saved metadata cannot open this gate.
export const MISSION_V3_RELEASE_VERIFIED = false;
export const MISSION_V3_CONTRACT = 'dobby-missions-intents-v3-1';
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const object=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const canonical=value=>Array.isArray(value)?value.map(canonical):object(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const id=runes.validV3MemberId;
const missionId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(value);
const tuple=actor=>({userId:actor.userId,householdId:actor.householdId,memberId:actor.memberId});
const atomicRejections=new Set(['40001','40P01','23514','23503','23505','42501','22023']);
const creditKeys=['missionId','memberId','effort','amount','date','title','revision','customRunes','eventId','kind','cycle','reverses','allocations'];
const knownCredit=row=>Object.fromEntries(creditKeys.filter(key=>Object.hasOwn(row,key)).map(key=>[key,row[key]]));
export const missionV3Summary=(memberId,credits=[],requests=[])=>runes.memberSummary(memberId,credits.map(knownCredit),requests.map(knownCredit));
const award=row=>Object.fromEntries(['missionId','memberId','effort','amount','customRunes','eventId','kind','cycle','reverses','allocations'].filter(key=>Object.hasOwn(row,key)).map(key=>[key,row[key]]));

export function missionV3Capability(value){
 return object(value)&&value.protocol===3&&value.intentVersion===1&&value.participantVersion===1&&
  value.contract===MISSION_V3_CONTRACT&&value.maxPayloadBytes===262144&&value.directWritesBlocked===true&&
  value.atomicAllocations===true&&value.canonicalAuthorization===true&&Array.isArray(value.ledgerVersions)&&
  [1,2,3].every(version=>value.ledgerVersions.includes(version));
}
export function normalizeMissionIntent(value){
 if(!object(value))throw Error('Intention Missions invalide');
 const allowed=value.kind==='snapshot'?['kind','payload']:value.kind==='complete'?['kind','missionId','participantIds']:value.kind==='reopen'?['kind','missionId']:[];
 if(!allowed.length||Object.keys(value).some(key=>!allowed.includes(key)))throw Error('Champ d’intention Missions interdit');
 if(value.kind==='snapshot'){
  if(!object(value.payload)||!Array.isArray(value.payload.autoTasks)||!Array.isArray(value.payload.manualMissions)||value.payload.runeRequests!==undefined&&(!Array.isArray(value.payload.runeRequests)||value.payload.runeRequests.length))throw Error('Snapshot Missions invalide ou attributions locales en attente');
  return copy(value);
 }
 if(!missionId(value.missionId))throw Error('Identifiant de mission invalide');
 if(value.kind==='reopen')return{kind:'reopen',missionId:value.missionId};
 if(!Array.isArray(value.participantIds)||value.participantIds.some(member=>!id(member))||new Set(value.participantIds).size!==value.participantIds.length)throw Error('Choisissez des participants distincts');
 return{kind:'complete',missionId:value.missionId,participantIds:[...value.participantIds].sort((a,b)=>a<b?-1:a>b?1:0)};
}
export function validateMissionV3Module(module,previous=null){
 if(!object(module)||module.module!=='missions'||!Number.isSafeInteger(Number(module.revision))||Number(module.revision)<1||!object(module.payload))throw Error('Confirmation du module Missions invalide');
 const p=module.payload;
 if(![1,2,3].includes(p.runeLedgerVersion)||!Array.isArray(p.manualMissions)||!Array.isArray(p.autoTasks)||!Array.isArray(p.runeCredits)||p.runeRequests!==undefined&&(!Array.isArray(p.runeRequests)||p.runeRequests.length))throw Error('Confirmation du registre Missions invalide');
 const eventIds=p.runeCredits.map(runes.eventKey);
 if(new Set(eventIds).size!==eventIds.length)throw Error('Événement confirmé dupliqué');
 // Validate known business fields using the existing domain engine, retaining
 // the exact raw JSON (including unknown extension fields and old date forms).
 runes.normalizeCredits(p.runeCredits.map(knownCredit));
 for(const row of p.runeCredits)if(row.allocations!==undefined&&!equal(row.allocations,runes.allocateReward(row.amount,row.allocations.map(part=>part.memberId))))throw Error('Répartition confirmée non canonique');
 if(previous){
  const incoming=new Map(p.runeCredits.map(row=>[runes.eventKey(row),row]));
  for(const row of previous.payload?.runeCredits||[])if(!equal(incoming.get(runes.eventKey(row)),row))throw Error('Historique confirmé supprimé ou réécrit ; opération conservée');
  for(const key of Object.keys(previous.payload||{}))if(!['autoTasks','manualMissions','runeCredits','runeRequests','runeLedgerVersion'].includes(key)&&!equal(p[key],previous.payload[key]))throw Error('Extension Missions confirmée supprimée ou réécrite ; données conservées');
  if((previous.payload?.runeLedgerVersion||1)>p.runeLedgerVersion)throw Error('Version du registre régressive');
 }
 return module;
}

export function createMissionIntentTransport(options){
 let flight=null;
 function actor(){
  const current=options.context();
  if(!current?.identityVerified||!id(current.userId)||!id(current.householdId)||!id(current.memberId)||!['parent','child'].includes(current.category)||!current.token)throw Error('Contexte familial canonique à vérifier');
  return current;
 }
 function available(){
  if(options.releaseVerified!==true)return false;
  try{const current=actor(),capability=options.capability();return(current.category!=='child'||current.permissions?.canCompleteMissionsV3===true)&&capability?.token===current.token&&missionV3Capability(capability.value);}catch{return false;}
 }
 function guard(expected){
  if(!available())throw Error('Participation et partage de Runes en attente de validation serveur. Mission et soldes conservés.');
  const current=actor();if(expected&&(!equal(tuple(current),tuple(expected))||current.token!==expected.token||current.category!==expected.category))throw Error('Le contexte familial a changé ; opération conservée');
  return current;
 }
 function expectations(intent,remote,current){
  if(intent.kind!=='complete'&&current.category!=='parent')throw Error('Seul un parent peut gérer ou rouvrir les Missions');
  if(remote)validateMissionV3Module(remote);
  if(intent.kind==='snapshot'){
   if(intent.payload.runeCredits!==undefined&&!equal(intent.payload.runeCredits,remote?.payload.runeCredits||[]))throw Error('Un snapshot ne peut pas ajouter ou réécrire de crédit confirmé');
   if((intent.payload.runeLedgerVersion||1)<(remote?.payload.runeLedgerVersion||1))throw Error('Version du registre régressive');
   return[];
  }
  const mission=remote?.payload.manualMissions.find(row=>row.id===intent.missionId);
  if(!mission)throw Error('Mission introuvable : relire le foyer');
  if(current.category==='child'){
   const assigned=mission.assigneeIds?.length?mission.assigneeIds:mission.assigneeId?[mission.assigneeId]:[];
   if(mission.allFamily!==true&&!assigned.includes(current.memberId))throw Error('Cette mission n’est pas attribuée à cet enfant');
  }
  const credits=(remote.payload.runeCredits||[]).map(knownCredit);
  return intent.kind==='complete'?runes.completionRequests(mission,options.members(),intent.participantIds,credits,[],'2000-01-01T00:00:00Z'):runes.reopeningRequests(mission,credits,[],'2000-01-01T00:00:00Z');
 }
 async function execute(input,remote,resume=false){
  const current=guard();
  let pending=await options.readPending();guard(current);
  if(pending){
   if(pending.protocol!==3||!equal(pending.actor,tuple(current)))throw Error('Une opération d’un autre compte ou foyer est conservée');
   if(!equal(normalizeMissionIntent(pending.intent),pending.intent)||!Number.isSafeInteger(pending.expectedRevision)||pending.expectedRevision<0||typeof pending.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pending.id))throw Error('Opération Missions locale invalide ; données conservées');
   if(current.category!=='parent'&&pending.intent.kind!=='complete')throw Error('Seul un parent peut reprendre cette opération Missions');
   if(input&&!equal(normalizeMissionIntent(input),pending.intent))throw Error('Une autre opération Missions attend sa confirmation');
   if(pending.rejection)throw Error('Conflit Missions confirmé : relire le foyer et examiner l’intention conservée');
  }else{
   if(resume)return null;
   const intent=normalizeMissionIntent(input),expectedAwards=expectations(intent,remote,current);
   const expectedRevision=remote?Number(remote.revision):0;
   if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0||expectedRevision>=Number.MAX_SAFE_INTEGER)throw Error('Révision Missions invalide');
   if(new TextEncoder().encode(JSON.stringify(intent)).byteLength>262144)throw Error('Intention Missions trop volumineuse ; données conservées');
   pending={protocol:3,actor:tuple(current),id:options.uuid(),expectedRevision,intent,baseModule:copy(remote),expectedAwards};
   const stored=await options.writePending(copy(pending),null);guard(current);
   if(stored===false)throw Error('Une autre opération Missions a été conservée entre-temps');
  }
  guard(current);
  const body={p_household_id:pending.actor.householdId,p_expected_revision:pending.expectedRevision,p_operation_id:pending.id,p_intent:copy(pending.intent)};
  let response;
  try{response=await options.send(body);}catch(error){
   guard(current);
   if(atomicRejections.has(error?.code)||error?.status===409){
    pending.rejection={code:atomicRejections.has(error?.code)?error.code:'409'};
    await options.writePending(copy(pending),pending.id);guard(current);
   }
   throw error;
  }
  guard(current);
  const receipt=response?.operation,module=response?.module;
  const delta=Number(receipt?.revision)-pending.expectedRevision,desiredStatus=pending.intent.kind==='complete'?'done':'open';
  const noopAllowed=pending.intent.kind!=='snapshot'&&pending.baseModule?.payload.runeLedgerVersion===3&&pending.baseModule.payload.manualMissions.some(row=>row.id===pending.intent.missionId&&row.status===desiredStatus);
  if(response?.protocol!==3||typeof response.replayed!=='boolean'||receipt?.id!==pending.id||![0,1].includes(delta)||delta===0&&!noopAllowed||!/^[a-f0-9]{64}$/i.test(receipt.digest||'')||Number(module?.revision)<Number(receipt.revision)||
   !response.replayed&&(typeof receipt.changed!=='boolean'||receipt.changed!==(delta===1)||Number(module?.revision)!==Number(receipt.revision)))throw Error('Confirmation V3 incohérente ; opération conservée');
  validateMissionV3Module(module,pending.baseModule);
  if(module.payload.runeLedgerVersion!==3)throw Error('Confirmation V3 absente ; opération conservée');
  if(delta===0&&Number(module.revision)===Number(receipt.revision)&&!equal(module.payload,pending.baseModule.payload))throw Error('Un reçu sans changement ne peut modifier le module ; opération conservée');
  const events=new Map(module.payload.runeCredits.map(row=>[runes.eventKey(row),row]));
  for(const expected of pending.expectedAwards||[])if(!equal(award(events.get(runes.eventKey(expected))||{}),award(expected)))throw Error('Confirmation des répartitions incomplète ; opération conservée');
  if(Number(module.revision)===Number(receipt.revision)){
   if(pending.intent.kind==='snapshot'){
    if(!equal(module.payload.autoTasks,pending.intent.payload.autoTasks)||!equal(module.payload.manualMissions,pending.intent.payload.manualMissions))throw Error('Confirmation des modifications Missions incomplète ; opération conservée');
   }else{
    const mission=module.payload.manualMissions.find(row=>row.id===pending.intent.missionId);
    if(!mission||mission.status!==(pending.intent.kind==='complete'?'done':'open'))throw Error('Confirmation de validation Missions incomplète ; opération conservée');
   }
  }
  guard(current);
  await options.confirm(copy(module),{actor:copy(current),operation:copy(pending)});guard(current);
  // Adapter uses an atomic compare-and-delete. Never clear a newer operation
  // from another tab after adopting this response.
  if(await options.writePending(null,pending.id)===false)throw Error('La file Missions a changé ; opération conservée');
  guard(current);return copy(module);
 }
 function submit(input,remote){
  let intent=null;try{if(input)intent=normalizeMissionIntent(input);}catch(error){return Promise.reject(error);}
  if(flight){if(intent&&!equal(intent,flight.intent))return Promise.reject(Error('Une opération Missions est déjà en cours'));return flight.promise;}
  const promise=execute(intent,remote,input==null),entry={intent,promise};flight=entry;
  promise.finally(()=>{if(flight===entry)flight=null;}).catch(()=>{});return promise;
 }
 async function resolveRejected(archive){
  const current=guard(),pending=await options.readPending();guard(current);
  if(!pending||pending.protocol!==3||!equal(pending.actor,tuple(current))||!pending.rejection)throw Error('Seul un refus atomique confirmé peut être archivé ; réessayer la réponse incertaine.');
  await archive(copy(pending));guard(current);
  if(await options.writePending(null,pending.id)===false)throw Error('La file Missions a changé ; intention conservée');
  guard(current);
 }
 return Object.freeze({available,submit,resume:()=>submit(null,null),pending:()=>options.readPending(),resolveRejected});
}

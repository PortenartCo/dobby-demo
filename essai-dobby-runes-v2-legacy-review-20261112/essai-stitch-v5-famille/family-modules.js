/* Supabase household modules. Files remain in Storage (never JSON), and medical
   records stay outside the shared document payload. */
(function(){
'use strict';
const dobbyPilotRequiresV2=true;
const api = window.DobbyFamilyUI;
if (!api) throw Error('Dobby Family UI unavailable');
const DEFINITIONS = [
  { id:'menus', title:'Repas et menus', keys:['planned','shopHistory','shopFinal','shopChoice'], pages:['plan','pick','shop'] },
  { id:'recipes', title:'Recettes et Thermomix', keys:['customRecipes','tmAdaptations'], pages:['recipes'] },
  { id:'missions', title:'Missions familiales', keys:['autoTasks','manualMissions','runeCredits'], pages:['missions'] },
  { id:'house', title:'Maison et entretiens', keys:['houseItems','houseLogs'], pages:['house'] },
  { id:'family', title:'Membres, contacts et listes', keys:['familyMembers','famContacts','famLists','familyEvents','sharedHealthVisits'], pages:['family'] },
  { id:'contracts', title:'Documents et contrats du foyer', keys:[], pages:['documents'] }
];
const byId = new Map(DEFINITIONS.map(x=>[x.id,x]));
let ctx = null, backendReady = false, checked = false, states = {}, inFlight = false;
let timer = null, applying = false, lastError = '', sharedAvailable = [];
let runeCapability = null, contextGeneration = 0, missionWriteFlight = null;
const esc = api.esc;
function isSharedDocument(x) {
  return x && (x.category==='Contrats'||x.category==='Assurances'||x.sharedToHousehold===true);
}
function pick(id) {
  if (id === 'contracts') {
    const permitted = ['id','title','category','person','date','deadline','provider','reference',
      'tags','note','sharedToHousehold','cloudPath','cloudName','cloudType','cloudSize'];
    return {contracts:(st.familyDocs || []).filter(isSharedDocument).map(x=>{
      const record={};for(const key of permitted)if(x[key]!==undefined)record[key]=x[key];return record;
    })};
  }
  const definition = byId.get(id);
  if (!definition) throw Error('Module inconnu');
  const data = {};
  for (const key of definition.keys) {
    if (st[key] !== undefined) data[key] = JSON.parse(JSON.stringify(st[key]));
  }
  if(id==='missions'){data.runeCredits=st.runeCredits||[];data.runeLedgerVersion=missionVersion(data);}
  return data;
}
function digest(value) { return JSON.stringify(value); }
function canonical(value){return Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;}
function missionDigest(value){return digest(canonical(value));}
function moduleDigest(id,value){if(id!=='missions')return digest(value);const {runeRequests,...confirmed}=value;return missionDigest(confirmed);}

// Rewards are append-only; mutable mission conflicts still use the existing chooser.
let runes;
// A legacy mission editor can preserve the rune protocol while dropping fields
// that identify a series. Remembered occurrence identities must never disappear.
function recurrenceIdentity(row){
 if(row?.recurrence!==undefined){
  const value=row.recurrence;
  if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1||value.seriesId!==row.id||!Array.isArray(value.rules)||!value.rules.length||value.rules.some(rule=>!rule||typeof rule!=='object'||Array.isArray(rule)))throw Error('Version de récurrence Missions incompatible');
  return 'series:'+row.id;
 }
 if(row?.seriesId!==undefined||row?.occurrenceDate!==undefined){
  if(typeof row.seriesId!=='string'||!row.seriesId||typeof row.occurrenceDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.occurrenceDate)||row.id!==row.seriesId+'-r'+row.occurrenceDate.replace(/-/g,''))throw Error('Identité de récurrence Missions incompatible');
  return 'occurrence:'+row.seriesId+':'+row.occurrenceDate;
 }
 return '';
}
function retainRecurrences(state,payload){
 const before=JSON.parse(state?.synced||'{}').manualMissions||[],incoming=new Map((payload.manualMissions||[]).map(row=>[row?.id,row]));
 for(const row of before){const identity=recurrenceIdentity(row);if(identity&&recurrenceIdentity(incoming.get(row.id))!==identity)throw Error('Version Missions incompatible : série ou historique de récurrence absent. Synchronisation bloquée.');}
}
function missionPayload(payload){
 if(runesV2Available())return missionPayloadV2(payload);
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Payload Missions invalide');
 if(payload.runeLedgerVersion===2||runes?.ledgerVersion?.(payload.runeCredits)===2)throw Error('Partage des runes version 2 bloqué : les compensations et récompenses personnalisées nécessitent une validation serveur distincte. Historique local conservé.');
 if(payload.runeLedgerVersion!==undefined&&payload.runeLedgerVersion!==1)throw Error('Version de runes incompatible');
 if(payload.runeLedgerVersion===1&&!Array.isArray(payload.runeCredits))throw Error('Historique familial de runes invalide');
 if(payload.runeCredits!==undefined&&payload.runeLedgerVersion!==1)throw Error('Version de runes absente');
 for(const key of ['autoTasks','manualMissions'])if(payload[key]!==undefined&&!Array.isArray(payload[key]))throw Error('Registre Missions invalide');
 for(const row of payload.manualMissions||[]){recurrenceIdentity(row);if(row.customRunes!==undefined||row.recurrence?.rules?.some(rule=>rule.template?.customRunes!==undefined))throw Error('Partage des récompenses personnalisées bloqué : validation serveur distincte nécessaire.');}
 return payload;
}
function rememberedCredits(){const raw=states.missions?.synced;if(!raw)return [];return JSON.parse(raw).runeCredits||[];}
function retainedCredits(payload){missionPayload(payload);return runes.mergeCredits(payload.runeCredits||[],runes.mergeCredits(st.runeCredits||[],rememberedCredits()));}
function editableMissions(payload){return{autoTasks:payload.autoTasks||[],manualMissions:payload.manualMissions||[]};}
function pendingRunes(){if(runesV2Available()){try{return outstandingRequests(st.runeCredits||[]).length>0||Boolean(states.missions?.pendingOperation);}catch{return true;}}if(!Array.isArray(st.runeCredits||[])||!Array.isArray(st.runeRequests||[]))return true;const key=c=>c?.eventId||c?.missionId,ids=new Set((st.runeCredits||[]).map(key));return(st.runeRequests||[]).some(c=>!c||!ids.has(key(c)));}
function assertLocalRewardSharing(){if(runesV2Available())return;if(dobbyPilotRequiresV2)throw Error('RPC Runes V2 indisponibles. Missions, historique et demandes locales conservés en attente.');if(states.missions?.runeProtocol===2)throw Error('Protocole familial V2 à revérifier. Historique et demandes conservés.');if(runes.ledgerVersion(st.runeCredits||[])===2||runes.ledgerVersion(st.runeRequests||[])===2||(st.manualMissions||[]).some(row=>row.customRunes!==undefined||row.recurrence?.rules?.some(rule=>rule.template?.customRunes!==undefined)))throw Error('Partage des compensations et récompenses personnalisées bloqué : données locales conservées, validation serveur distincte nécessaire.');}
function initialPayload(id){const payload=pick(id);if(id==='missions'&&runesV2Available())return {...missionPayloadV2(payload),runeRequests:runes.normalizeRequests(st.runeRequests||[])};if(id==='missions'&&runes.ledgerVersion(st.runeRequests||[])===2)throw Error('Partage des compensations de runes bloqué : validation serveur distincte nécessaire.');return id==='missions'?{...missionPayload(payload),runeCredits:runes.acceptRequests(payload.runeCredits,st.runeRequests||[],1)}:payload;}
function synchronized(id,revision,payload){return{active:true,revision,synced:moduleDigest(id,id==='missions'?payload:pick(id)),conflict:false,...(id==='missions'?{runeProtocol:runesV2Available()?2:payload.runeLedgerVersion===1}:{})};}
function markMissionsShared(id){if(id==='missions'&&!st.runeSyncRequired){st.runeSyncRequired=true;save();}}
function applyCredits(credits){const before=applying;applying=true;try{st.runeCredits=runes.mergeCredits(credits,runes.mergeCredits(st.runeCredits||[],rememberedCredits()));save();render();}finally{applying=before;}}
function verifyProtocol(state,remote){
 if(runesV2Available()){verifyRemoteV2(state,remote);return;}
 missionPayload(remote.payload);
 if((state.runeProtocol||JSON.parse(state.synced||'{}').runeLedgerVersion===1)&&remote.payload.runeLedgerVersion!==1)throw Error('Version Missions incompatible : historique de runes absent du partage. Synchronisation bloquée.');
 retainRecurrences(state,remote.payload);
}
async function syncMissions(state,remote){
 if(runesV2Available())return syncMissionsV2(state,remote);
 assertLocalRewardSharing();
 let credits;
 try{verifyProtocol(state,remote);credits=retainedCredits(remote.payload);}catch(error){state.conflict={remote,runes:true};await persist();throw error;}
 if(runes.ledgerVersion(st.runeRequests||[])===2)throw Error('Partage des compensations de runes bloqué : validation serveur distincte nécessaire.');
 const local=pick('missions'),base=JSON.parse(state.synced||'{}'),localEditable=missionDigest(editableMissions(local)),remoteEditable=missionDigest(editableMissions(remote.payload)),baseEditable=missionDigest(editableMissions(base));
 if(localEditable!==baseEditable&&remoteEditable!==baseEditable&&localEditable!==remoteEditable){
  applyCredits(credits);state.conflict={remote};await persist();return;
 }
 const revision=Number(remote.revision);if(!Number.isSafeInteger(revision)||revision<1)throw Error('Révision familiale invalide');
 const fields=localEditable!==baseEditable?editableMissions(local):editableMissions(remote.payload);
 const desired={...fields,runeCredits:runes.acceptRequests(credits,st.runeRequests||[],revision+1),runeLedgerVersion:1};
 try{verifyProtocol(state,{payload:desired});}catch(error){state.conflict={remote,recurrence:true};await persist();throw error;}
 if(missionDigest(desired)===missionDigest(remote.payload)){
  applyShared('missions',desired);Object.assign(state,synchronized('missions',revision,desired));await persist();return;
 }
 const result=await api.authorized('PATCH',rowQuery('missions')+'&revision=eq.'+encodeURIComponent(revision),{payload:desired},{Prefer:'return=representation'});
 if(!result?.length){state.conflict={remote:await readRow('missions')};await persist();return;}
 const confirmed=result[0];missionPayload(confirmed.payload);if(Number(confirmed.revision)!==revision+1||confirmed.payload.runeLedgerVersion!==1||missionDigest(confirmed.payload)!==missionDigest(desired))throw Error('Confirmation des runes incohérente');
 // A user can still edit or delete a mission while PATCH is in flight. Never
 // replace that newer local edit with the sent snapshot; only acknowledge credits.
 if(missionDigest(editableMissions(pick('missions')))===localEditable)applyShared('missions',confirmed.payload);else applyCredits(confirmed.payload.runeCredits);
 Object.assign(state,synchronized('missions',Number(confirmed.revision),confirmed.payload));await persist();
}

// V2 uses the existing Missions payload and native ledger. Only the server can
// turn a request into a confirmed credit; the durable operation is a retry receipt,
// not a second ledger or a second business store.
function clone(value){return JSON.parse(JSON.stringify(value));}
function liveContextToken(){
 const actual=api.getContext(),connection=api.connectionState?.();
 if(!actual||!ctx||actual.userId!==ctx.userId||actual.householdId!==ctx.householdId||connection?.access==='rejected'||connection?.verifying)return '';
 return actual.userId+'|'+actual.householdId+'|'+(connection?.epoch??'')+'|'+contextGeneration;
}
function runesV2Available(){return Boolean(runeCapability?.available===true&&runeCapability.token&&runeCapability.token===liveContextToken());}
function requireV2(token){if(!runesV2Available()||token!==liveContextToken())throw Error('Le contexte familial a changé. Opération conservée, connexion à revérifier.');}
function missionVersion(payload){const credits=Array.isArray(payload.runeCredits)?payload.runeCredits:[],requests=Array.isArray(st.runeRequests)?st.runeRequests:[],missions=Array.isArray(payload.manualMissions)?payload.manualMissions:[];return runesV2Available()||payload.runeLedgerVersion===2||JSON.parse(states.missions?.synced||'{}').runeLedgerVersion===2||runes?.ledgerVersion?.(credits)===2||runes?.ledgerVersion?.(requests)===2||missions.some(row=>row.customRunes!==undefined||row.recurrence?.rules?.some(rule=>rule.template?.customRunes!==undefined))?2:1;}
function missionPayloadV2(payload){
 if(!payload||typeof payload!=='object'||Array.isArray(payload)||![1,2].includes(payload.runeLedgerVersion)||!Array.isArray(payload.runeCredits))throw Error('Version ou historique familial de runes invalide');
 for(const key of ['autoTasks','manualMissions'])if(!Array.isArray(payload[key]))throw Error('Registre Missions invalide');
 for(const row of payload.manualMissions)recurrenceIdentity(row);
 runes.normalizeCredits(payload.runeCredits);
 if(payload.runeRequests!==undefined)runes.normalizeRequests(payload.runeRequests);
 if(payload.runeLedgerVersion===1&&missionVersion({...payload,runeLedgerVersion:1})===2&&runes.ledgerVersion(payload.runeCredits)===2)throw Error('Version de runes régressive');
 return payload;
}
function sameAward(a,b){return ['memberId','effort','amount','customRunes','reverses'].every(key=>a[key]===b[key])&&(a.kind||'grant')===(b.kind||'grant')&&(a.cycle||0)===(b.cycle||0);}
function outstandingRequests(credits,strict=true){
 const confirmed=new Map(runes.normalizeCredits(credits).map(row=>[runes.eventKey(row),row]));
 return runes.normalizeRequests(st.runeRequests||[]).filter(request=>{
  const found=confirmed.get(runes.eventKey(request));
  if(found&&!sameAward(found,request)){if(strict)throw Error('Attribution de runes contradictoire : demande locale conservée, résolution nécessaire.');return true;}
  return !found;
 });
}
function verifyRemoteV2(state,remote){
 missionPayloadV2(remote.payload);
 if(remote.payload.runeRequests?.length)throw Error('Le serveur a renvoyé des attributions non confirmées. Synchronisation bloquée.');
 if(!Number.isSafeInteger(Number(remote.revision))||Number(remote.revision)<1)throw Error('Révision familiale invalide');
 if((JSON.parse(state?.synced||'{}').runeLedgerVersion===2)&&remote.payload.runeLedgerVersion!==2)throw Error('Version familiale de runes régressive');
 retainRecurrences(state,remote.payload);
 const incoming=new Map(remote.payload.runeCredits.map(row=>[runes.eventKey(row),row]));
 // Compare raw confirmed fields: normalization may change an old date spelling.
 for(const row of JSON.parse(state?.synced||'{}').runeCredits||[]){if(missionDigest(incoming.get(runes.eventKey(row)))!==missionDigest(row))throw Error('Historique confirmé supprimé ou réécrit. Synchronisation bloquée.');}
 for(const row of st.runeCredits||[]){const known=incoming.get(runes.eventKey(row));if(!known||missionDigest(known)!==missionDigest(row))throw Error('Historique local distinct : adoption familiale explicite nécessaire. Sauvegarde locale conservée.');}
}
function applyMissionsV2(payload,fields=true){
 missionPayloadV2(payload);
 const pending=outstandingRequests(payload.runeCredits,false),previous={autoTasks:st.autoTasks,manualMissions:st.manualMissions,runeCredits:st.runeCredits,runeRequests:st.runeRequests},before=applying;applying=true;
 try{
  if(fields){st.autoTasks=clone(payload.autoTasks);st.manualMissions=clone(payload.manualMissions);}
  st.runeCredits=clone(payload.runeCredits);st.runeRequests=clone(pending);
  try{save();}catch(error){Object.assign(st,previous);throw error;}render();
 }finally{applying=before;}
}
function operationPayload(fields,credits){
 const requests=outstandingRequests(credits),payload={...clone(fields),runeCredits:clone(credits),runeRequests:requests,runeLedgerVersion:missionVersion({...fields,runeCredits:credits})};
 // Check full ordering, cycles, and safe totals before sending; never credit locally.
 runes.acceptRequests(credits,requests,0);missionPayloadV2(payload);return payload;
}
// PostgREST maps 40001 to HTTP 500. Only known atomic refusals permit a
// rebase; 40003/08007 and transport errors keep the original operation ID.
function definitiveRejection(error){return ['40001','40P01','23514','23503','23505','42501','22023'].includes(error?.code);}
function archiveOperation(state){(state.abandonedOperations||(state.abandonedOperations=[])).push(clone(state.pendingOperation));delete state.pendingOperation;}
async function sendMissionsV2(state,fields,remote){
 if(missionWriteFlight)return missionWriteFlight;
 const flight=performMissionsV2(state,fields,remote);missionWriteFlight=flight;
 try{return await flight;}finally{if(missionWriteFlight===flight)missionWriteFlight=null;}
}
async function performMissionsV2(state,fields,remote){
 const token=liveContextToken();requireV2(token);
 if(!state.pendingOperation){
  const payload=operationPayload(fields,remote?.payload.runeCredits||st.runeCredits||[]),revision=remote?Number(remote.revision):0;
  const operation={id:crypto.randomUUID(),expectedRevision:revision,payload:clone(payload),localEditable:missionDigest(editableMissions(pick('missions'))),localFields:clone(editableMissions(pick('missions')))};
  state.pendingOperation=operation;
  // Persist the exact ID, revision, and payload BEFORE the first network write.
  try{await persist();}catch(error){delete state.pendingOperation;throw error;}
 }
 requireV2(token);
 const operation=clone(state.pendingOperation);
 let result;
 try{result=await api.authorized('POST','rpc/dobby_missions_v2_write',{
  p_household_id:ctx.householdId,p_expected_revision:operation.expectedRevision,p_operation_id:operation.id,p_payload:operation.payload
 });}catch(error){
  requireV2(token);
  if(definitiveRejection(error)||error?.status===409){state.pendingOperation.rejection={code:error.code||'409',message:error.message};state.conflict={runes:true,operation:operation.id};await persist();}
  throw error;
 }
 requireV2(token);
 const receipt=result?.operation,confirmed=result?.module;
 if(result?.protocol!==2||receipt?.id!==operation.id||Number(receipt.revision)!==operation.expectedRevision+1||!(/^[a-f0-9]{64}$/i.test(receipt.digest||''))||confirmed?.module!=='missions'||!Number.isSafeInteger(Number(confirmed.revision))||Number(confirmed.revision)<Number(receipt.revision))throw Error('Confirmation des runes V2 incohérente ; opération conservée pour réessai.');
 verifyRemoteV2(state,confirmed);
 const accepted=new Map(confirmed.payload.runeCredits.map(row=>[runes.eventKey(row),row]));
 for(const request of operation.payload.runeRequests||[]){if(!accepted.has(runes.eventKey(request))||!sameAward(accepted.get(runes.eventKey(request)),request))throw Error('Confirmation des attributions incomplète ; opération et demandes conservées.');}
 if(confirmed.payload.runeLedgerVersion!==2)throw Error('Confirmation du protocole V2 absente ; opération conservée.');
 // A replay can return a much later module. Never reapply the old sent snapshot.
 const current=editableMissions(pick('missions')),unchanged=missionDigest(current)===operation.localEditable;
 const rebased=unchanged?editableMissions(confirmed.payload):operation.localFields?mergeMissionEdits(operation.localFields,current,confirmed.payload):null;
 const receivedFields=rebased||mergeMissionEdits(operation.localFields||current,current,confirmed.payload,true);
 const preservation=legacyRecoveryBusy?legacyReceiptFields(receivedFields,current,confirmed.payload):{fields:receivedFields,restored:false};
 const conflict=(!unchanged&&!rebased)||preservation.restored;
 applyMissionsV2({...confirmed.payload,...preservation.fields});
 const retained=state.abandonedOperations;
 Object.assign(state,synchronized('missions',Number(confirmed.revision),confirmed.payload));
 if(conflict)state.conflict={remote:confirmed,inFlight:true};
 if(retained)state.abandonedOperations=retained;
 delete state.pendingOperation;
 markMissionsShared('missions');if(!sharedAvailable.includes('missions'))sharedAvailable.push('missions');
 await persist();return confirmed;
}
function mergeMissionEdits(base,local,remote,preferLocal=false){
 const result={};
 for(const collection of ['autoTasks','manualMissions']){
  const key=row=>collection==='manualMissions'?row.id:row.key,old=new Map((base[collection]||[]).map(row=>[key(row),row])),ours=new Map((local[collection]||[]).map(row=>[key(row),row])),theirs=new Map((remote[collection]||[]).map(row=>[key(row),row]));
  const order=[...new Set([...theirs.keys(),...ours.keys(),...old.keys()])];result[collection]=[];
  for(const id of order){const before=old.get(id),a=ours.get(id),b=theirs.get(id),equal=(x,y)=>missionDigest(x)===missionDigest(y);let chosen;
   if(equal(a,b)||equal(b,before))chosen=a;
   else if(equal(a,before))chosen=b;
   // Identical completions can differ only by their local completion clock.
   else if(a?.status==='done'&&b?.status==='done'&&equal({...a,completedAt:''},{...b,completedAt:''}))chosen=b;
   else if(preferLocal)chosen=a;else return null;
   if(chosen!==undefined)result[collection].push(clone(chosen));
  }
 }
 return result;
}
async function syncMissionsV2(state,remote){
 if(legacyUnversioned(remote)){await legacyMark(state,remote);return;}
 // Lost responses must replay their original operation, even if GET is now newer.
 if(state.pendingOperation)return sendMissionsV2(state,null,remote);
 try{verifyRemoteV2(state,remote);}catch(error){state.conflict={remote,runes:true};await persist();throw error;}
 const local=pick('missions'),base=JSON.parse(state.synced||'{}'),localEditable=missionDigest(editableMissions(local)),remoteEditable=missionDigest(editableMissions(remote.payload)),baseEditable=missionDigest(editableMissions(base));
 const fields=mergeMissionEdits(base,local,remote.payload);
 if(!fields){
  // Remote confirmed credits are retained; unresolved requests remain visible.
  applyMissionsV2(remote.payload,false);
  state.conflict={remote};await persist();return;
 }
 const desired=operationPayload(fields,remote.payload.runeCredits);
 if(remote.payload.runeLedgerVersion===2&&missionDigest(editableMissions(desired))===remoteEditable&&!desired.runeRequests.length){
  applyMissionsV2(remote.payload);Object.assign(state,synchronized('missions',Number(remote.revision),remote.payload));await persist();return;
 }
 return sendMissionsV2(state,fields,remote);
}
async function activateMissionsV2(remote){
 const state=states.missions||(states.missions={active:false});
 if(legacyUnversioned(remote)||state.conflict?.legacyConverted||state.legacyReview){await legacyMark(state,remote,!legacyUnversioned(remote));return;}
 if(state.pendingOperation){await sendMissionsV2(state,null,remote);return;}
 if(remote){
  verifyRemoteV2(state,remote);
  if(missionDigest(pick('missions'))!==missionDigest(remote.payload))backupLocal('missions');
  // Pending local intent cannot be silently replaced by a retrieval.
  if(outstandingRequests(remote.payload.runeCredits).length&&missionDigest(editableMissions(pick('missions')))!==missionDigest(editableMissions(remote.payload)))throw Error('Attributions locales en attente : récupération bloquée sans effacer les missions ni les demandes. Résolvez les modifications locales avant de rejoindre ce module.');
  applyMissionsV2(remote.payload);states.missions=synchronized('missions',Number(remote.revision),remote.payload);markMissionsShared('missions');
 }else{
  backupLocal('missions');state.active=true;state.runeProtocol=2;markMissionsShared('missions');await sendMissionsV2(state,editableMissions(pick('missions')),null);
 }
 if(!sharedAvailable.includes('missions'))sharedAvailable.push('missions');await persist();
}
async function resolveMissionsV2(state,preference){
 const token=liveContextToken(),remote=await readRow('missions');requireV2(token);
 if(legacyUnversioned(remote)||state.conflict?.legacyConverted||state.legacyReview){await legacyMark(state,remote,!legacyUnversioned(remote));return;}
 if(!remote){
  if(preference!=='local'||!state.pendingOperation?.rejection)throw Error('Version familiale inaccessible ; opération conservée pour réessai.');
  if(!confirm('Proposer de nouveau les modifications locales après le refus explicite du serveur ? Les demandes et la sauvegarde de l’opération refusée seront conservées.'))return;
  backupLocal('missions');archiveOperation(state);await persist();await sendMissionsV2(state,editableMissions(pick('missions')),null);return;
 }verifyRemoteV2(state,remote);
 const pending=outstandingRequests(remote.payload.runeCredits);
 if(preference==='server'&&pending.length)throw Error('Des attributions locales restent en attente. Elles sont conservées ; choisissez vos modifications pour les proposer au foyer.');
 if(preference==='local'&&!confirm('Conserver mes modifications locales ? Les gains confirmés du foyer restent intacts et les demandes en attente seront revalidées par le serveur.'))return;
 backupLocal('missions');
 // An explicit conflict choice rebases a refused operation, never an unknown
 // result: first replay it, so a lost acknowledgement cannot become a new write.
 if(state.pendingOperation){
  try{await sendMissionsV2(state,null,remote);return;}catch(error){
   if(!definitiveRejection(error)&&error?.status!==409)throw error;
   archiveOperation(state);
  }
 }
 if(preference==='server')applyMissionsV2(remote.payload);else{const merged=mergeMissionEdits(JSON.parse(state.synced||'{}'),pick('missions'),remote.payload,true);applyMissionsV2({...remote.payload,...merged});}
 Object.assign(state,synchronized('missions',Number(remote.revision),remote.payload));await persist();
 await syncMissionsV2(state,remote);api.repaint();api.openModal();
}

/* Injected only in the isolated legacy-review pilot's native module closure.
 * Missing version is a review gate, never a valid V2 snapshot or permission.
 * All writes still use the native durable operation, RPC and receipt validator.
 */
let legacyRecoveryBusy=false,legacyReviewToken='';
const legacyOwn=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
function legacyUnversioned(remote){
 return Boolean(remote?.payload&&typeof remote.payload==='object'&&!Array.isArray(remote.payload)&&!legacyOwn(remote.payload,'runeLedgerVersion'));
}
async function legacyMark(state,remote,converted=false){
 if(!state)return;
 const token=liveContextToken();requireV2(token);
 if(state.conflict&&!state.conflict.legacyUnversioned&&!state.legacyPreviousConflict)state.legacyPreviousConflict=clone(state.conflict);
 const conflict={...(typeof state.conflict==='object'?state.conflict:{}),remote:clone(remote),legacyUnversioned:!converted,legacyConverted:converted};
 if(missionDigest(state.conflict)!==missionDigest(conflict)){state.conflict=conflict;await persist();requireV2(token);}
}
function legacyArray(payload,key){
 if(!legacyOwn(payload,key))return [];
 if(!Array.isArray(payload[key]))throw Error('Ancien registre non reconnu : '+key+' doit être un tableau. Aucune donnée remplacée.');
 return payload[key];
}
function legacyRemote(remote){
 if(!legacyUnversioned(remote)||!Number.isSafeInteger(Number(remote.revision))||Number(remote.revision)<1)throw Error('La version familiale a changé. Relisez les Missions avant toute reprise.');
 const p=remote.payload;
 if(Object.keys(p).some(key=>!['autoTasks','manualMissions','runeCredits','runeRequests'].includes(key)))throw Error('Ancien registre avec des champs non reconnus : reprise bloquée, données conservées.');
 const fields={autoTasks:legacyArray(p,'autoTasks'),manualMissions:legacyArray(p,'manualMissions')};
 if(fields.manualMissions.length||legacyArray(p,'runeCredits').length||legacyArray(p,'runeRequests').length)throw Error('Cet ancien registre contient des missions manuelles ou des événements à examiner. Aucune reprise automatique.');
 return fields;
}
function legacyFingerprint(state){
 return missionDigest({local:pick('missions'),requests:st.runeRequests||[],pendingOperation:state.pendingOperation||null,synced:state.synced||null,abandonedOperations:state.abandonedOperations||[]});
}
function legacyDataFingerprint(){return missionDigest({local:pick('missions'),requests:st.runeRequests||[],runeSyncRequired:st.runeSyncRequired===true});}
function legacyLocal(state){
 const local=pick('missions'),known=JSON.parse(state.synced||'{}');
 for(const key of ['autoTasks','manualMissions','runeCredits'])if(local[key]!==undefined&&!Array.isArray(local[key]))throw Error('Données locales à vérifier : aucun remplacement effectué.');
 runes.normalizeCredits(local.runeCredits||[]);runes.normalizeRequests(st.runeRequests||[]);
 if((local.runeCredits||[]).length||(known.runeCredits||[]).length)throw Error('Historique local confirmé distinct : le serveur ne permet pas son import dans cette ligne existante. Sauvegarde conservée, reprise bloquée.');
 if(known.runeLedgerVersion===2)throw Error('Une version V2 était déjà confirmée sur cet appareil. Régression distante à examiner, aucune écriture.');
 return editableMissions(local);
}
function legacyFields(state,remote){
 if(legacyUnversioned(remote))return {remote:legacyRemote(remote),local:legacyLocal(state),converted:false};
 verifyRemoteV2(state,remote);runes.normalizeRequests(st.runeRequests||[]);
 if(remote.payload.runeLedgerVersion!==2)throw Error('Version familiale incompatible : données conservées.');
 return {remote:editableMissions(remote.payload),local:editableMissions(pick('missions')),converted:true};
}
function legacyRows(rows,collection){
 const ids=new Set();
 for(const row of rows){
  const id=collection==='autoTasks'?row?.key:row?.id;
  if(!row||typeof row!=='object'||Array.isArray(row)||typeof id!=='string'||!id||ids.has(id))throw Error('Identités de missions absentes ou ambiguës : données conservées, reprise à examiner.');
  ids.add(id);
 }
 return rows;
}
function legacyMerge(local,remote,choice='merge'){
 const fields={},collisions=[];
 for(const collection of ['autoTasks','manualMissions']){
  const a=legacyRows(local[collection]||[],collection),b=legacyRows(remote[collection]||[],collection),key=row=>collection==='autoTasks'?row.key:row.id;
  const ours=new Map(a.map(row=>[key(row),row]));fields[collection]=[];
  for(const row of b){
   const id=key(row),other=ours.get(id);
   if(other&&missionDigest(other)!==missionDigest(row)){
    collisions.push({collection,id,local:clone(other),remote:clone(row)});
    fields[collection].push(clone(choice==='local'?other:row));
   }else fields[collection].push(clone(row));
   ours.delete(id);
  }
  for(const row of ours.values())fields[collection].push(clone(row));
 }
 return {fields,collisions};
}
function legacyReceiptFields(fields,current,confirmed){
 // A complete local restore can leave the durable outbox intact. Native
 // three-way rebasing then interprets a missing cached row as a deletion.
 // During explicit legacy recovery only, keep every distinct current/remote row;
 // flag an ordinary in-flight conflict so no subsequent sync can delete it.
 const result=clone(fields);let restored=false;
 for(const collection of ['autoTasks','manualMissions']){
  legacyRows(result[collection],collection);legacyRows(current[collection],collection);legacyRows(confirmed[collection],collection);
  const key=row=>collection==='autoTasks'?row.key:row.id;
  const present=new Set(result[collection].map(key));
  for(const row of [...confirmed[collection],...current[collection]])if(!present.has(key(row))){result[collection].push(clone(row));present.add(key(row));restored=true;}
 }
 return {fields:result,restored};
}
async function legacyBackup(state,remote){
 const id='v2-missions-legacy-backup:'+crypto.randomUUID();
 const backup={version:1,createdAt:new Date().toISOString(),context:{userId:ctx.userId,householdId:ctx.householdId},local:{...clone(pick('missions')),runeRequests:clone(st.runeRequests||[]),runeSyncRequired:st.runeSyncRequired===true},moduleState:clone(state),remote:clone(remote)};
 await api.putMeta(id,backup);
 if(missionDigest(await api.meta(id))!==missionDigest(backup))throw Error('Sauvegarde locale non confirmée : reprise annulée, aucune écriture.');
 return id;
}
async function legacyPrepare(){
 if(legacyRecoveryBusy||missionWriteFlight)throw Error('Une opération Missions est en cours. Attendez sa confirmation.');
 legacyRecoveryBusy=true;
 try{
  const token=liveContextToken();requireV2(token);
  const remote=await readRow('missions');requireV2(token);
  const state=states.missions||(states.missions={active:false});
  if(!legacyUnversioned(remote)&&remote?.payload?.runeLedgerVersion!==2)throw Error('La version familiale ne correspond plus à cet ancien registre.');
  await legacyMark(state,remote,!legacyUnversioned(remote));requireV2(token);
  const beforeBackup=legacyFingerprint(state);
  const backupId=await legacyBackup(state,remote);requireV2(token);
  state.legacyBackupId=backupId;delete state.legacyReview;await persist();requireV2(token);
  if(legacyFingerprint(state)!==beforeBackup)throw Error('Les Missions ont changé pendant la sauvegarde. Données conservées : préparez une nouvelle revue et sa sauvegarde.');
  const fields=legacyFields(state,remote),remoteFields=fields.remote,localFields=fields.local,merged=legacyMerge(localFields,remoteFields);
  retainRecurrences(state,{...merged.fields,runeCredits:[]});
  state.legacyReview={backupId,converted:fields.converted,remote:clone(remote),localFingerprint:legacyFingerprint(state),remoteFingerprint:missionDigest(remote),localCounts:{autoTasks:localFields.autoTasks.length,manualMissions:localFields.manualMissions.length,requests:(st.runeRequests||[]).length},remoteCounts:{autoTasks:remoteFields.autoTasks.length,manualMissions:remoteFields.manualMissions.length},collisions:merged.collisions};
  legacyReviewToken=token;await persist();requireV2(token);
  if(legacyFingerprint(state)!==state.legacyReview.localFingerprint)throw Error('Les Missions ont changé pendant la revue. Préparez une nouvelle sauvegarde.');
  api.repaint();api.openModal();
 }finally{legacyRecoveryBusy=false;}
}
function legacyPendingSafe(state,remoteFields,remote){
 const op=state.pendingOperation;
 if(!op||op.payload?.runeLedgerVersion!==2||!Array.isArray(op.payload.runeCredits)||typeof op.localEditable!=='string'||!op.localFields)throw Error('Opération en attente conservée : son contenu exige une revue avant reprise.');
 missionPayloadV2(op.payload);legacyRows(op.payload.autoTasks,'autoTasks');legacyRows(op.payload.manualMissions,'manualMissions');
 if(!Array.isArray(op.localFields.autoTasks)||!Array.isArray(op.localFields.manualMissions)||missionDigest(editableMissions(op.localFields))!==op.localEditable)throw Error('Snapshot de l’opération en attente incohérent : opération conservée sans rejeu.');
 if(Number(op.expectedRevision)<Number(remote.revision))return; // receipt replay or atomic CAS refusal, never a new write.
 for(const collection of ['autoTasks','manualMissions'])for(const row of remoteFields[collection])if(!op.payload[collection].some(other=>missionDigest(other)===missionDigest(row)))throw Error('L’opération en attente ne conserve pas toutes les missions du foyer. Elle reste intacte ; aucun rejeu ni nouvelle opération.');
}
async function legacyRecover(choice){
 if(legacyRecoveryBusy||missionWriteFlight)throw Error('Une opération Missions est en cours. Attendez sa confirmation.');
 legacyRecoveryBusy=true;
 try{
  const token=liveContextToken();requireV2(token);
  const state=states.missions,review=state?.legacyReview;
  if(!review||token!==legacyReviewToken||legacyFingerprint(state)!==review.localFingerprint)throw Error('Les données locales ou la connexion ont changé. Préparez à nouveau la reprise.');
  const remote=await readRow('missions');requireV2(token);
  if(missionDigest(remote)!==review.remoteFingerprint)throw Error('Le foyer a changé depuis la sauvegarde. Préparez à nouveau la reprise, sans écraser les données.');
  const fields=legacyFields(state,remote),remoteFields=fields.remote,localFields=fields.local;
  if(!await api.meta(review.backupId))throw Error('Sauvegarde locale introuvable : aucune écriture autorisée.');
  requireV2(token);
  if(legacyFingerprint(state)!==review.localFingerprint)throw Error('Les données locales ont changé. Préparez à nouveau la reprise.');
  if(state.pendingOperation&&!state.pendingOperation.rejection){
   if(choice!=='replay')throw Error('Une opération non confirmée est conservée. Réessayez exactement cette opération avant tout nouveau choix.');
   legacyPendingSafe(state,remoteFields,remote);
   if(!confirm('Réessayer exactement l’opération en attente, avec le même identifiant et le même contenu ? La sauvegarde conserve les deux versions.'))return;
   requireV2(token);
   if(legacyFingerprint(state)!==review.localFingerprint)throw Error('Les données locales ont changé pendant le choix. Nouvelle revue nécessaire.');
   await sendMissionsV2(state,null,remote);
  }else{
   if(!['merge','local','server'].includes(choice))throw Error('Choix de reprise invalide.');
   const merged=legacyMerge(localFields,remoteFields,choice);
   if(choice==='merge'&&merged.collisions.length)throw Error('Des missions différentes ont la même identité. Choisissez les variantes à conserver.');
   retainRecurrences(state,{...merged.fields,runeCredits:[]});
   // Validate pending rewards before any new operation, without confirming them.
   operationPayload(merged.fields,remote.payload.runeCredits||[]);
   if(state.pendingOperation&&!definitiveRejection(state.pendingOperation.rejection))throw Error('Issue de l’opération précédente inconnue : contenu conservé sans remplacement.');
   const detail=merged.collisions.length?(choice==='local'?' Les variantes de cet appareil seront retenues pour les identités en conflit.':' Les variantes du foyer seront retenues pour les identités en conflit.'):' Toutes les missions distinctes des deux versions seront réunies.';
   if(!confirm('Reprendre ce registre familial en version 2 à la révision '+remote.revision+' ?'+detail+' La sauvegarde locale contient les deux versions et les opérations.'+(state.pendingOperation?' L’opération explicitement refusée sera archivée intacte avant une nouvelle proposition.':'')))return;
   requireV2(token);
   if(legacyFingerprint(state)!==review.localFingerprint)throw Error('Les données locales ont changé pendant le choix. Nouvelle revue nécessaire.');
   if(state.pendingOperation){
    const beforeArchiveData=legacyDataFingerprint();
    const previous=clone(state);archiveOperation(state);
    try{await persist();}catch(error){for(const key of Object.keys(state))delete state[key];Object.assign(state,previous);throw error;}
    requireV2(token);
    if(legacyDataFingerprint()!==beforeArchiveData)throw Error('Les Missions ont changé pendant l’archivage. Édition et opération archivée conservées : nouvelle revue nécessaire.');
   }
   await sendMissionsV2(state,merged.fields,remote);
  }
  delete state.legacyReview;legacyReviewToken='';await persist();api.repaint();api.openModal();
 }finally{legacyRecoveryBusy=false;}
}
async function legacyExport(){
 const id=states.missions?.legacyBackupId,backup=id&&await api.meta(id);
 if(!backup)throw Error('Aucune sauvegarde locale de reprise disponible.');
 const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'})),link=document.createElement('a');
 link.href=url;link.download='DOBBY-Missions-sauvegarde-reprise.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function legacyActions(state){
 const button=(action,label)=>'<button type="button" data-fm-action="'+action+'" data-module="missions">'+label+'</button>';
 const backup=state.legacyBackupId?button('legacy-export','Télécharger la sauvegarde locale'):'';
 const review=state.legacyReview;
 let content='<p>'+(state.conflict?.legacyConverted?'Le foyer est maintenant en V2. La réunion des deux versions reste explicite.':'Ancien registre sans version explicite.')+' Aucune donnée n’a été remplacée.</p>'+button('legacy-review',review?'Relire et sauvegarder les deux versions':'Préparer la reprise et sa sauvegarde locale')+backup;
 if(!review)return content;
 if(legacyReviewToken!==liveContextToken()||review.localFingerprint!==legacyFingerprint(state))return content+'<p>La revue doit être renouvelée après ce rechargement ou cette modification. Aucun ancien choix ne sera appliqué.</p>';
 content+='<p>Foyer : '+review.remoteCounts.autoTasks+' mission(s) automatique(s), '+review.remoteCounts.manualMissions+' manuelle(s). Cet appareil : '+review.localCounts.autoTasks+' automatique(s), '+review.localCounts.manualMissions+' manuelle(s), '+review.localCounts.requests+' demande(s) en attente. Sauvegarde locale confirmée.</p>';
 if(state.pendingOperation&&!state.pendingOperation.rejection)return content+'<p>Une opération non confirmée reste prioritaire. Son identifiant, sa révision et son contenu ne seront pas changés.</p>'+button('legacy-replay','Réessayer exactement l’opération en attente');
 if(review.collisions.length){
  content+='<p>'+review.collisions.length+' identité(s) portent des contenus différents. Les missions distinctes des deux versions seront toutes conservées.</p><ul>'+review.collisions.map(row=>'<li>'+esc(row.local.title||row.local.name||row.id)+'<details><summary>Voir les différences</summary><p>Sur cet appareil</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(JSON.stringify(row.local,null,2))+'</pre><p>Dans le foyer</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere">'+esc(JSON.stringify(row.remote,null,2))+'</pre></details></li>').join('')+'</ul>';
  return content+button('legacy-local','Garder les variantes de cet appareil et réunir le reste')+button('legacy-server','Garder les variantes du foyer et réunir le reste');
 }
 return content+button('legacy-merge','Réunir les missions et confirmer la reprise en V2');
}

function seededExampleMeals() {
  // Fresh V5 demos include exactly three placeholder meals. No silent deletions.
  if (st.demoInitialized !== true || !st.planned || typeof st.planned !== 'object') return false;
  const rows = Object.entries(st.planned);
  if (rows.length !== 3 || st.shopFinal || Object.keys(st.shopHistory || {}).length) return false;
  const samples = [['chicken','soir',4],['pasta','soir',4],['toast','midi',2]];
  return samples.every(([id,slot,people]) => rows.some(([date,m]) =>
    /^\d{4}-\d{2}-\d{2}-(midi|soir)$/.test(date) &&
    date.endsWith('-' + slot) &&
    m?.id === id && Number(m.people) === people && m.status === 'prévu' &&
    Object.keys(m).every(key => ['id','people','status'].includes(key))
  ));
}
function storageKey() { return 'v2-module-state:' + ctx.userId + '|' + ctx.householdId; }
async function persist() { if (ctx) await api.putMeta(storageKey(), states); }
function rowQuery(id) {
  return 'dobby_v2_modules?select=module,payload,revision,updated_at&household_id=eq.' +
    encodeURIComponent(ctx.householdId) + '&module=eq.' + encodeURIComponent(id);
}
async function readRow(id) {
  const token=liveContextToken(),generation=contextGeneration;
  const list = await api.authorized('GET', rowQuery(id));
  if(id==='missions'&&(!token||generation!==contextGeneration||token!==liveContextToken()))throw Error('Le contexte familial a changé pendant la lecture des Missions.');
  if (!Array.isArray(list) || list.length > 1) throw Error('Réponse module incohérente');
  return list[0] || null;
}
function backupLocal(id) {
  const key = 'dobby-v5-family-before-sync-' + id + '-' + new Date().toISOString();
  localStorage.setItem(key, digest(id==='missions'?{...pick(id),runeRequests:st.runeRequests||[],pendingOperation:states.missions?.pendingOperation||null}:pick(id)));
}
function applyShared(id, payload) {
  if(id==='missions'&&dobbyPilotRequiresV2)assertLocalRewardSharing();
  if(id==='missions'&&runesV2Available()){applyMissionsV2(payload);return;}
  if(id==='missions'&&states.missions?.runeProtocol===2)assertLocalRewardSharing();
  if(id==='missions'&&(runes.ledgerVersion(st.runeCredits||[])===2||runes.ledgerVersion(st.runeRequests||[])===2||(st.manualMissions||[]).some(row=>row.customRunes!==undefined||row.recurrence?.rules?.some(rule=>rule.template?.customRunes!==undefined))))throw Error('Partage des compensations et récompenses personnalisées bloqué : données locales conservées, validation serveur distincte nécessaire.');
  const def = byId.get(id);
  if (!def || !payload || typeof payload !== 'object' || Array.isArray(payload)) throw Error('Payload invalide');
  if(id==='missions')verifyProtocol(states.missions||{},{payload});
  const credits=id==='missions'?retainedCredits(payload):null;
  applying = true;
  try {
    if (id === 'contracts') {
      if (!Array.isArray(payload.contracts)) throw Error('Fiches de contrats invalides');
      const incoming = payload.contracts.filter(isSharedDocument);
      const incomingIds = new Set(incoming.map(x=>x.id));
      const old = Array.isArray(st.familyDocs)?st.familyDocs:[];
      const protectedIds = new Set(old.filter(x=>x.category==='Santé' && !isSharedDocument(x)).map(x=>x.id));
      const attachments = new Map(old.map(x=>[x.id,x]));
      const retained = old.filter(x=>
        (x.category==='Santé' && !isSharedDocument(x)) ||
        (!incomingIds.has(x.id) && (!isSharedDocument(x) || Boolean(x.attachmentName))));
      st.familyDocs = retained.concat(incoming.filter(x=>!protectedIds.has(x.id)).map(x=>{
        const prior = attachments.get(x.id);
        return {...x, attachmentName:prior?.attachmentName || '',attachmentType:prior?.attachmentType || ''};
      }));
    }
    for (const key of def.keys) {
      if(id==='missions'&&key==='runeCredits')continue;
      if (Object.prototype.hasOwnProperty.call(payload,key)) {
        st[key] = JSON.parse(JSON.stringify(payload[key]));
      }
    }
    if(id==='missions')st.runeCredits=credits;
    if (id === 'recipes') custom = Array.isArray(st.customRecipes) ? st.customRecipes : [];
    save(); render();
  } finally { applying = false; }
}
async function start() {
  const c = api.getContext();
  if (!c) return;
  const next = c.userId + '|' + c.householdId;
  // Keep the success fast-path but retry when network or API checks failed.
  if (ctx && next === ctx.userId + '|' + ctx.householdId && checked && backendReady && runeCapability?.token===liveContextToken()) return;
  const changed = !ctx || next !== ctx.userId + '|' + ctx.householdId;
  if(changed){contextGeneration++;runeCapability=null;}
  ctx = c; checked = false; backendReady = false; lastError = '';
  const generation=contextGeneration, startToken=liveContextToken();
  if (changed){const restored=await api.meta(storageKey())||{};if(generation!==contextGeneration||startToken!==liveContextToken())return;states=restored;}
  runes=await window.DobbyRunesReady;if(generation!==contextGeneration||startToken!==liveContextToken())return;if(!runes)throw Error('Règles de runes indisponibles');
  if(states.missions?.synced)states.missions.synced=moduleDigest('missions',JSON.parse(states.missions.synced));
  if(states.missions?.active&&!st.runeSyncRequired){st.runeSyncRequired=true;save();}
  const stillCurrent = () => {
    const actual = api.getContext();
    return actual?.userId === c.userId && actual?.householdId === c.householdId &&
      ctx?.userId === c.userId && ctx?.householdId === c.householdId &&
      generation===contextGeneration && startToken===liveContextToken();
  };
  try {
    const shared = await api.authorized('GET',
      'dobby_v2_modules?select=module&household_id=eq.' + encodeURIComponent(c.householdId));
    if (!stillCurrent()) return;
    if (!Array.isArray(shared)) throw Error('Liste des modules partagés invalide');
    sharedAvailable = [...new Set(shared.map(row => row.module))].filter(id => byId.has(id));
    backendReady = true;
    // Capability is an authenticated, read-only check, never persisted as authority.
    runeCapability={token:startToken,available:false};
    try{const capability=await api.authorized('GET','rpc/dobby_missions_v2_capabilities?p_household_id='+encodeURIComponent(c.householdId));
      if(!stillCurrent())return;
      if(capability?.protocol===2&&capability.directWritesBlocked===true&&capability.maxPayloadBytes===262144)runeCapability={token:startToken,available:true};
    }catch{if(!stillCurrent())return;}
  } catch (e) {
    if (!stillCurrent()) return;
    backendReady = false; sharedAvailable = [];
    lastError = e?.status
      ? 'Erreur HTTP ' + e.status + ' sur les modules familiaux.'
      : 'Modules familiaux indisponibles temporairement.';
  }
  if (!stillCurrent()) return;
  checked = true;
  api.repaint();
}
function reset() {
  contextGeneration++;runeCapability=null;missionWriteFlight=null;
  ctx = null; checked = false; backendReady = false; lastError = ''; states = {}; sharedAvailable = [];
  if (timer) { clearTimeout(timer); timer = null; }
}
function stateLabel(def) {
  if (!ctx) return api.getContext() ? 'Initialisation du foyer' : 'Foyer non connecté';
  if (!backendReady) return checked ? 'Données locales (non synchronisées)' : 'Vérification en cours';
  if(def.id==='missions'){try{runes.normalizeCredits(st.runeCredits||[]);runes.normalizeRequests(st.runeRequests||[]);}catch{return 'Historique de runes à vérifier';}if(!runesV2Available()&&(runes.ledgerVersion(st.runeCredits||[])===2||runes.ledgerVersion(st.runeRequests||[])===2||(st.manualMissions||[]).some(row=>row.customRunes!==undefined||row.recurrence?.rules?.some(rule=>rule.template?.customRunes!==undefined))))return 'Partage des nouvelles récompenses bloqué — validation serveur nécessaire';}
  if(def.id==='missions'&&dobbyPilotRequiresV2&&!runesV2Available())return 'RPC Runes V2 indisponibles — opérations locales en attente';
  const info = states[def.id];
  if(def.id==='missions'&&(info?.conflict?.legacyUnversioned||info?.conflict?.legacyConverted))return 'Ancien registre : reprise explicite requise, données conservées';
  if (!info?.active) return 'Partage désactivé';
  if (info.conflict) return 'Conflit à résoudre';
  if(def.id==='missions'&&pendingRunes())return 'Runes en attente de synchronisation';
  return moduleDigest(def.id,pick(def.id)) === info.synced ? 'Partagé · à jour' : 'Modifications locales à envoyer';
}
function html() {
  const description = '<p class="fv2-muted">Le partage des modules est volontaire : les données V5 déjà présentes sur cet appareil ne sont jamais téléversées automatiquement.</p>';
  const joinable = sharedAvailable.filter(id => !states[id]?.active);
  const bulkJoin = backendReady && ctx && joinable.length ?
    '<div class="fv2-module"><strong>Rejoindre les modules du foyer</strong>' +
    '<p>' + joinable.length + ' module(s) déjà partagés par un autre membre. Une seule opération récupère les données du foyer. Aucune donnée locale n’est publiée sans accord.</p>' +
    '<button type="button" data-fm-action="join-family">Récupérer les modules partagés (' + joinable.length + ')</button></div>' : '';
  const inactive = DEFINITIONS.filter(def => !states[def.id]?.active);
  const shareAll = backendReady && ctx && inactive.length > 1 && !joinable.length ?
    '<div class="fv2-module"><strong>Activer le foyer en une seule fois</strong>' +
    '<p>Partagez les ' + inactive.length + ' modules restants après une seule confirmation. ' +
    'Les anciens carnets de santé et les pièces locales ne seront pas transférés.</p>' +
    '<button type="button" data-fm-action="activate-all">Activer les ' +
    inactive.length + ' modules du foyer</button></div>' : '';
  const rows = DEFINITIONS.map(def => {
    if(def.id==='missions'){try{runes.normalizeCredits(st.runeCredits||[]);runes.normalizeRequests(st.runeRequests||[]);}catch{return 'Historique de runes à vérifier';}if(!runesV2Available()&&(runes.ledgerVersion(st.runeCredits||[])===2||runes.ledgerVersion(st.runeRequests||[])===2||(st.manualMissions||[]).some(row=>row.customRunes!==undefined||row.recurrence?.rules?.some(rule=>rule.template?.customRunes!==undefined))))return 'Partage des nouvelles récompenses bloqué — validation serveur nécessaire';}
  const info = states[def.id];
    const flag = stateLabel(def);
    let actions = '';
    if (backendReady && ctx && !info?.active)
      actions = '<button type="button" data-fm-action="activate" data-module="' + def.id + '">Activer le partage</button>';
    else if (backendReady && ctx && info?.active) {
      actions = '<button type="button" data-fm-action="refresh" data-module="' + def.id + '">Synchroniser</button>' +
        '<button type="button" data-fm-action="disable" data-module="' + def.id + '">Garder local seulement</button>';
      if (info.conflict) actions +=
        '<div class="fv2-conflict">Deux versions différentes ont été détectées. Aucune n’a été écrasée.' +
        '<button type="button" data-fm-action="server" data-module="' + def.id + '">Conserver la version du foyer</button>' +
        '<button type="button" data-fm-action="local" data-module="' + def.id + '">Conserver mes modifications</button></div>';
    }
    if(def.id==='missions'&&(info?.conflict?.legacyUnversioned||info?.conflict?.legacyConverted))actions=legacyActions(info);
    return '<div class="fv2-module"><strong>' + esc(def.title) + '</strong>' +
      '<span class="fv2-flag">' + esc(flag) + '</span>' +
      (def.id === 'house' ? '<p>Pièces et scans toujours locaux.</p>' : '') +
      (def.id === 'menus' && seededExampleMeals() ?
        '<p>Trois repas de démonstration préchargés sont encore dans le calendrier. Ils ne correspondent pas à des menus familiaux confirmés.</p>' +
        '<button type="button" data-fm-action="remove-demo" data-module="menus">Retirer les trois repas d’exemple</button>' : '') +
      (def.id === 'contracts' ? '<p>Contrats et assurances partagés ; autres fiches sur décision explicite. Les PDF et photos s’envoient séparément.</p>' : '') +
      actions + '</div>';
  }).join('');
  const gate = !ctx || !checked ?
    '<p class="fv2-muted">Vérification de la connexion des modules familiaux…</p>' :
    !backendReady ? '<p class="fv2-error" role="status">' +
      esc(lastError || 'Modules familiaux momentanément indisponibles.') +
      ' Les données restent locales ; aucun partage supplémentaire n’est activé.</p>' +
      '<button type="button" data-fm-action="retry">Revérifier le raccordement</button>' : '';
  const refusal=backendReady&&lastError?'<p class="fv2-error" role="status">'+esc(lastError)+'</p>':'';
  return description + bulkJoin + shareAll + gate + refusal + rows +
    '<div class="fv2-module"><strong>Documents et fichiers joints</strong><span class="fv2-flag">Partage volontaire</span>' +
    '<p>Les fiches et PDF/photos sont partagés avec le foyer uniquement dans les conditions choisies depuis Documents. Les pièces locales ne sont pas envoyées automatiquement.</p></div>' +
    '<div class="fv2-module"><strong>Rendez-vous médicaux et santé</strong><span class="fv2-flag">Choix explicite</span>' +
    '<p>Les anciens carnets restent locaux. Les rendez-vous créés dans le foyer et les documents Santé volontairement partagés sont communs.</p></div>' +
    '';
}
function labelFor(page) {
  if (page === 'documents') return 'Documents · ' + stateLabel(byId.get('contracts')) + ' pour les fiches partagées';
  if (page === 'chat') return 'Conversations conservées sur cet appareil';
  if (page === 'family' && String(st.extraPage || '').startsWith('health')) return 'Carnet de santé local · rendez-vous volontaires dans le foyer';
  const def = DEFINITIONS.find(x => x.pages.includes(page));
  return def ? (def.title + ' · ' + stateLabel(def)) : 'Données locales';
}
async function activate(id) {
  if (!backendReady || !ctx) throw Error('Raccordement Supabase indisponible');
  const def = byId.get(id);
  if (!def) throw Error('Module invalide');
  if (!confirm('Partager « ' + def.title + ' » avec les autres membres actifs du foyer ?\n' +
    'Les données actuelles de ce module pourront être consultées et modifiées par eux.')) return;
  if(id==='missions')assertLocalRewardSharing();
  const remote = await readRow(id);
  if(id==='missions'&&runesV2Available()){await activateMissionsV2(remote);api.repaint();api.openModal();onSave();return;}
if(id==='missions'&&dobbyPilotRequiresV2)throw Error('RPC Runes V2 indisponibles. Missions, historique et demandes locales conservés en attente.');
  if(id==='missions'&&remote)missionPayload(remote.payload);
  let revision,acknowledged;
  if (remote) {
    if (digest(pick(id)) !== digest(remote.payload)) {
      if (!confirm('Il existe déjà une version familiale de « ' + def.title +
        ' ». La récupérer sur cet appareil ?\nUne sauvegarde locale sera créée avant remplacement.')) return;
      backupLocal(id);
      applyShared(id, remote.payload);
    }
    revision = Number(remote.revision);acknowledged=remote.payload;
  } else {
    const original = initialPayload(id);
    const result = await api.authorized('POST', 'dobby_v2_modules', {
      household_id:ctx.householdId,module:id,payload:original
    }, { Prefer:'return=representation' });
    if (!result?.[0] || Number(result[0].revision) < 1) throw Error('Partage créé sans confirmation serveur');
    revision = Number(result[0].revision);acknowledged=result[0].payload||original;if(id==='missions'){if(!result[0].payload||missionDigest(acknowledged)!==missionDigest(original))throw Error('Confirmation des runes incohérente');applyCredits(acknowledged.runeCredits);}
  }
  states[id] = synchronized(id,revision,acknowledged);markMissionsShared(id);
  if (!sharedAvailable.includes(id)) sharedAvailable.push(id);
  await persist();
  api.repaint(); api.openModal();onSave();
}
async function activateRemaining() {
  if (!ctx || !backendReady) throw Error('Foyer non connecté');
  const ids = DEFINITIONS.filter(def => !states[def.id]?.active).map(def => def.id);
  if (!ids.length) return;
  if(ids.includes('missions'))assertLocalRewardSharing();
  // Read first: existing remote data wins, after user confirmation and local backup.
  const entries = await Promise.all(ids.map(async id => ({id, remote:await readRow(id)})));
  const existing = entries.filter(entry => Boolean(entry.remote)).length;
  for (const {id, remote} of entries) {
    if(id==='missions'&&remote)missionPayload(remote.payload);
    if (remote && (!remote.payload || Array.isArray(remote.payload) ||
      typeof remote.payload !== 'object' ||
      !Number.isInteger(Number(remote.revision)) || Number(remote.revision) < 1)) {
      throw Error('Contenu familial non valide pour : ' + id);
    }
  }
  const removeDemo = ids.includes('menus') && seededExampleMeals() &&
    !entries.find(e => e.id === 'menus')?.remote;
  let message = 'Activer le partage de ' + ids.length + ' modules avec les membres actifs du foyer ?\n' +
    'Les données enregistrées dans ces modules pourront être consultées et modifiées par les membres du foyer.\n' +
    'Les anciens carnets de santé et les fichiers locaux ne seront pas envoyés.';
  if (existing) message += '\n' + existing +
    ' module(s) existent déjà : ils seront récupérés après sauvegarde de leur version locale.';
  if (removeDemo) message += '\nLes trois repas fictifs préchargés seront retirés après sauvegarde.';
  if (!confirm(message)) return;
  if (removeDemo) {
    backupLocal('menus');
    st.planned = {};
    st.demoInitialized = true;
    save(); render();
  }
  let activated = 0;
  try {
    for (const {id, remote} of entries) {
      if(id==='missions'&&runesV2Available()){await activateMissionsV2(remote);activated++;continue;}
if(id==='missions'&&dobbyPilotRequiresV2)throw Error('RPC Runes V2 indisponibles. Missions, historique et demandes locales conservés en attente.');
      let revision,acknowledged;
      if (remote) {
        if (digest(pick(id)) !== digest(remote.payload)) {
          backupLocal(id);
          applyShared(id, remote.payload);
        }
        revision = Number(remote.revision);acknowledged=remote.payload;
      } else {
        const original = initialPayload(id);
        const result = await api.authorized('POST','dobby_v2_modules',{
          household_id:ctx.householdId,module:id,payload:original
        },{Prefer:'return=representation'});
        if (!result?.[0] || Number(result[0].revision) < 1) {
          throw Error('Module créé sans confirmation serveur : ' + id);
        }
        revision = Number(result[0].revision);acknowledged=result[0].payload||original;if(id==='missions'){if(!result[0].payload||missionDigest(acknowledged)!==missionDigest(original))throw Error('Confirmation des runes incohérente');applyCredits(acknowledged.runeCredits);}
      }
      states[id] = synchronized(id,revision,acknowledged);markMissionsShared(id);
      if (!sharedAvailable.includes(id)) sharedAvailable.push(id);
      await persist();
      activated++;
    }
  } catch(e) {
    lastError = activated + ' module(s) sur ' + ids.length +
      ' activé(s). Les autres restent inactifs : ' + (e?.message || 'erreur inconnue');
    api.repaint(); api.openModal();
    return;
  }
  lastError = '';
  api.repaint(); api.openModal();onSave();
}
async function joinFamily() {
  if (!backendReady || !ctx) throw Error('Foyer non connecté');
  const ids = sharedAvailable.filter(id => byId.has(id) && !states[id]?.active);
  if (!ids.length) return;
  if(ids.includes('missions'))assertLocalRewardSharing();
  if (!confirm('Récupérer les ' + ids.length + ' modules déjà partagés dans ce foyer ?\n' +
    'Chaque version locale sera sauvegardée avant remplacement. Aucune donnée de cet appareil ne sera envoyée.')) return;
  // Preflight all reads before replacing anything.
  const remote = await Promise.all(ids.map(async id => ({id, row:await readRow(id)})));
  for (const entry of remote) {
    if (!entry.row || !entry.row.payload || Array.isArray(entry.row.payload) ||
      typeof entry.row.payload !== 'object' || !Number.isInteger(Number(entry.row.revision)) ||
      Number(entry.row.revision) < 1) {
      throw Error('Un module familial est invalide ou inaccessible : ' + entry.id);
    }
  }
  for(const entry of remote)if(entry.id==='missions'&&runesV2Available()){verifyRemoteV2(states.missions||{},entry.row);if(outstandingRequests(entry.row.payload.runeCredits).length&&missionDigest(editableMissions(pick('missions')))!==missionDigest(editableMissions(entry.row.payload)))throw Error('Attributions locales en attente : récupération bloquée sans effacer les missions ni les demandes.');}
  const oldStates = JSON.parse(JSON.stringify(states)),oldRequests=clone(st.runeRequests||[]);
  const before = new Map(remote.map(entry => [entry.id,pick(entry.id)]));
  for (const entry of remote) backupLocal(entry.id);
  try {
    for (const entry of remote) {
      if(entry.id==='missions'&&states.missions?.pendingOperation)throw Error('Une opération Missions attend sa confirmation. Réactivez le partage de ce module pour la reprendre.');
      applyShared(entry.id,entry.row.payload);
      states[entry.id] = synchronized(entry.id,Number(entry.row.revision),entry.row.payload);
    }
    await persist();
  } catch (e) {
    states = oldStates;
    for (const entry of remote) {
      try { applyShared(entry.id,before.get(entry.id)); } catch {}
    }
    if(ids.includes('missions')){st.runeRequests=oldRequests;save();render();}
    await persist();
    throw e;
  }
  if(states.missions?.active)markMissionsShared('missions');
  api.repaint(); api.openModal();onSave();
}
async function syncOne(id) {
  if(id==='missions'&&dobbyPilotRequiresV2&&!runesV2Available())return;
  const state = states[id];
  if (!ctx || !backendReady || !state?.active || state.conflict) return;
  const remote = await readRow(id);
  if(id==='missions'&&legacyUnversioned(remote)){await legacyMark(state,remote);return;}
  if(id==='missions'&&state.pendingOperation&&runesV2Available())return sendMissionsV2(state,null,remote);
  if (!remote) {
    state.conflict = true;
    lastError = 'Module familial introuvable : ' + id;
    await persist();
    return;
  }
  if(id==='missions'){if(state.runeProtocol===2&&!runesV2Available())throw Error('Protocole familial V2 à revérifier. Historique et demandes conservés.');return syncMissions(state,remote);}
  const local = pick(id), localJson = digest(local), remoteRevision = Number(remote.revision);
  if (remoteRevision !== state.revision) {
    if (localJson !== state.synced) {
      state.conflict = {remote};
      await persist();
      return;
    }
    applyShared(id, remote.payload);
    state.revision = remoteRevision;
    state.synced = digest(pick(id));
    state.conflict = false;
    await persist();
    return;
  }
  if (localJson === state.synced) return;
  const result = await api.authorized('PATCH', rowQuery(id) +
    '&revision=eq.' + encodeURIComponent(state.revision),
    {payload:local}, {Prefer:'return=representation'});
  if (!result?.length) {
    state.conflict = {remote:await readRow(id)};
    await persist();
    return;
  }
  state.revision = Number(result[0].revision);
  state.synced = localJson;
  state.conflict = false;
  await persist();
}
async function sync() {
  if (!ctx || !checked || !backendReady || inFlight) return;
  inFlight = true;let success=false;
  try {
    for (const def of DEFINITIONS) if (states[def.id]?.active) await syncOne(def.id);
    lastError = '';success=true;
  } catch(e) { lastError = e.message || 'Erreur de partage des modules'; }
  finally { inFlight = false; api.repaint();if(success)onSave(); }
}
function onSave() {
  if (!ctx || !backendReady || applying || inFlight || !DEFINITIONS.some(d=>
    states[d.id]?.active && !states[d.id].conflict && (moduleDigest(d.id,pick(d.id)) !== states[d.id].synced || d.id==='missions'&&pendingRunes()))) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; void sync(); }, 1500);
}
async function resolve(id, preference) {
  const state = states[id];
  if(id==='missions'){
    if(runesV2Available())return resolveMissionsV2(state,preference);
    assertLocalRewardSharing();
    const remote=await readRow(id);if(dobbyPilotRequiresV2)assertLocalRewardSharing();if(!remote)throw Error('Version familiale inaccessible');verifyProtocol(state,remote);const credits=retainedCredits(remote.payload);
    if(preference==='local'&&!confirm('Conserver mes modifications locales ? Les gains de runes confirmés du foyer seront conservés.'))return;
    backupLocal(id);if(preference==='server')applyShared(id,remote.payload);else applyCredits(credits);
    Object.assign(state,synchronized(id,Number(remote.revision),remote.payload));await persist();await sync();api.repaint();api.openModal();return;
  }
  const remote = state?.conflict?.remote || await readRow(id);
  if (!remote) throw Error('Version familiale inaccessible');
  if (preference === 'server') {
    backupLocal(id);
    applyShared(id, remote.payload);
    state.revision = Number(remote.revision);
    state.synced = digest(pick(id));
  } else {
    if (!confirm('Conserver mes modifications locales ? Elles remplaceront la version actuelle du foyer si aucune nouvelle modification ne survient.')) return;
    state.revision = Number(remote.revision);
    state.synced = digest(remote.payload);
  }
  state.conflict = false;
  await persist();
  await sync();
  api.repaint(); api.openModal();
}
document.addEventListener('click', async e => {
  const b = e.target.closest('button[data-fm-action]');
  if (!b) return;
  e.preventDefault();e.stopImmediatePropagation();
  const action = b.dataset.fmAction, id = b.dataset.module;
  try {
    if (action === 'legacy-review') await legacyPrepare();
    if (action === 'legacy-export') await legacyExport();
    if (['legacy-merge','legacy-local','legacy-server','legacy-replay'].includes(action))await legacyRecover(action.slice(7));
    if (action === 'retry') { checked = false; await start(); }
    if (action === 'join-family') await joinFamily();
    if (action === 'activate-all') await activateRemaining();
    if (action === 'activate') await activate(id);
    if (action === 'refresh') await syncOne(id);
    if (action === 'remove-demo' && seededExampleMeals()) {
      if (!confirm('Retirer uniquement les trois repas préchargés ? Une sauvegarde locale sera créée. Si les menus sont partagés, la modification sera proposée au foyer.')) return;
      backupLocal('menus');
      st.planned = {};
      st.demoInitialized = true;
      save(); render();
      if (states.menus?.active) await syncOne('menus');
    }
    if (action === 'disable') {
      if (confirm('Arrêter le partage de ce module sur cet appareil ? Les données déjà partagées sur Supabase ne sont pas supprimées.'+(id==='missions'?' Les runes resteront en attente jusqu’au rétablissement du partage.':''))) {
        // Keep runeSyncRequired sticky: shared mission identities cannot earn a
        // second, local-only confirmation after opting out of synchronization.
        states[id].active=false;await persist();
      }
    }
    if (action === 'server' || action === 'local') await resolve(id,action);
    api.repaint(); api.openModal();
  } catch(err) {
    lastError = err.message || 'Erreur du module';
    api.showMessage(lastError);
    api.openModal();
  }
},true);
window.DobbySharedRunesV2=Object.freeze({available:runesV2Available});
api.registerModules({start,reset,html,labelFor,sync,onSave,
  isConfigured(id){return ctx?Boolean(states[id]?.active):null;},
  isActive(id) {return Boolean(ctx && backendReady && states[id]?.active && !states[id]?.conflict);},
  statusFor(id) { const def=byId.get(id); return def?stateLabel(def):'Module inconnu'; }
});
})();

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

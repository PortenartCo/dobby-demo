/* Contract metadata and pieces use the existing native state, binary store and
   private family Storage. A local save never uploads a file. */
(function(){
'use strict';
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>JSON.parse(JSON.stringify(value));
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const FILE_FIELDS=['key','cloudPath','cloudName','cloudType','cloudSize'];
const CLOUD_FIELDS=FILE_FIELDS.slice(1),TYPES={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const SHARED_RETAINED_NOTICE='La copie sur le serveur est conservée ; sa suppression physique demande une intervention distincte.';
function safeDownloadName(name,type){
 const extension=TYPES[type];if(!extension)throw Error('Type de fichier non pris en charge : PDF ou image attendu.');
 const basename=String(name||'document').split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').replace(/[<>:"|?*]/g,'_').trim().replace(/[. ]+$/,'');
 const suffix=basename.match(/\.([^.]*)$/),matches=suffix&&(suffix[1].toLowerCase()===extension||type==='image/jpeg'&&suffix[1].toLowerCase()==='jpeg');
 const outputExtension=matches?suffix[1]:extension;
 const stem=(suffix?basename.slice(0,suffix.index):basename).replace(/^[. ]+|[. ]+$/g,'')||'document';
 return stem.slice(0,249-outputExtension.length)+'.'+outputExtension;
}
function merge(before,patch){
 const out=object(before)?clone(before):{};
 for(const [key,value] of Object.entries(patch||{})){
  if(['__proto__','constructor','prototype'].includes(key)||value===undefined)continue;
  out[key]=object(value)?merge(object(out[key])?out[key]:{},value):clone(value);
 }
 return out;
}
function rows(){if(st.familyDocs===undefined)return[];if(!Array.isArray(st.familyDocs))throw Error('Registre de contrats invalide. Données conservées.');return st.familyDocs;}
function find(id){window.DobbyArchiveSources?.get('documents',id);const row=rows().find(row=>row.id===id);if(!row)throw Error('Cette fiche a été supprimée.');return row;}
function context(){
 const api=window.DobbyFamilyUI;let connection=null,live=null;
 try{connection=api?.connectionState?.();}catch{}
 try{live=api?.getContext?.();}catch{}
 return{epoch:connection?.epoch??null,userId:connection?.userId??null,householdId:connection?.householdId??null,memberId:connection?.memberId??null,contextUserId:live?.userId??null,contextHouseholdId:live?.householdId??null,contextMemberId:live?.memberId??null};
}
function snapshot(id=null){return JSON.stringify({context:context(),row:id?rows().find(row=>row.id===id)||null:null});}
function assertWrite(){
 const api=window.DobbyFamilyUI,live=api?.getContext?.(),bound=api?.access?.state?.(),connection=api?.connectionState?.();
 const memberId=live?.memberId||bound?.memberId||connection?.memberId,actor=(st.familyMembers||[]).find(row=>row.id===memberId);
 const category=actor?.memberCategory||bound?.profile?.memberCategory;
 let readOnly=false;try{readOnly=window.parent?.DobbyFamilyStitch?.sharedReadOnly?.()===true;}catch{}
 if(readOnly||category&&category!=='parent'||(live?.identityVerified===true||bound?.verified===true)&&(live?.permissions?.canEdit===false||bound?.permissions?.canEdit===false))throw Error('Les contrats du foyer sont en lecture seule pour ce compte. Seul un parent autorisé peut les modifier.');
}
function current(id,expected,required=true){
 assertWrite();const token=typeof expected==='string'?expected:expected?.snapshot;
 if((required||token!==undefined)&&token!==snapshot(id))throw Error('La fiche ou le foyer a été modifié depuis son ouverture. Votre saisie est conservée.');
 return id?find(id):null;
}
function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const year=Number(value.slice(0,4));if(year<1)return false;const d=new Date(value+'T12:00:00Z');return!isNaN(d)&&d.toISOString().slice(0,10)===value;}
function validate(record,prior,values){
 if(typeof record.title!=='string'||!record.title.trim()||record.title.length>140)throw Error('Indiquez un nom de contrat de 140 caractères maximum.');
 record.title=record.title.trim();
 for(const key of ['date','deadline'])if(own(values,key)&&values[key]!==prior?.[key]&&values[key]!==null&&values[key]!==''&&!validDate(values[key]))throw Error('Date de contrat invalide.');
 if(!own(values,'contract'))return;
 if(!object(values.contract)||record.contract.version!==1)throw Error('Version de contrat incompatible. Données conservées.');
 const c=record.contract,patch=values.contract;
 for(const key of ['effectiveDate','renonDate'])if(own(patch,key)&&patch[key]!==prior?.contract?.[key]&&patch[key]!==null&&patch[key]!==''&&!validDate(patch[key]))throw Error('Date de contrat invalide.');
 if(own(patch,'amount')&&patch.amount!==null&&(typeof patch.amount!=='number'||!Number.isFinite(patch.amount)||patch.amount<0))throw Error('Montant de contrat invalide.');
 if(own(patch,'autoRenewal')&&!['yes','no','unknown'].includes(c.autoRenewal))throw Error('Reconduction invalide.');
 if(own(patch,'scope')&&!['house','equipment'].includes(c.scope))throw Error('Périmètre invalide.');
 if(own(patch,'equipmentIds')&&(!Array.isArray(c.equipmentIds)||c.equipmentIds.some(id=>typeof id!=='string'||!id)))throw Error('Équipements invalides.');
 for(const [key,units,min] of [['notice',['days','months'],0],['renewalDuration',['months','years'],1]])if(own(patch,key)){
  const value=c[key];if(!object(value)||!units.includes(value.unit)||value.value!==null&&(!Number.isSafeInteger(value.value)||value.value<min))throw Error('Durée de contrat invalide.');
 }
 for(const key of ['provenance','uncertainties'])if(own(patch,key)&&!Array.isArray(c[key]))throw Error('Sources du contrat invalides.');
 if(own(patch,'reminders')&&(!Array.isArray(c.reminders)||c.reminders.length>30||c.reminders.some(days=>!Number.isSafeInteger(days)||days<0)))throw Error('Rappels du contrat invalides.');
}
function commit(id,record){
 const before=st.familyDocs,had=own(st,'familyDocs'),existing=rows().some(row=>row.id===id);
 st.familyDocs=existing?rows().map(row=>row.id===id?record:row):[...rows(),record];
 try{save();}catch(error){if(had)st.familyDocs=before;else delete st.familyDocs;throw error;}
 render();return id;
}
function removeRecord(id){
 const before=st.familyDocs;st.familyDocs=rows().filter(row=>row.id!==id);
 try{save();}catch(error){st.familyDocs=before;throw error;}
 render();
}
function attachmentInput(prior,input,strict){
 if(!Array.isArray(input))throw Error('Liste de pièces invalide.');
 const before=new Map((prior||[]).map(row=>[row.id,row])),seen=new Set();
 const result=input.map(value=>{
  if(!object(value)||typeof value.id!=='string'||!value.id||['legacy','legacy-cloud'].includes(value.id)||seen.has(value.id))throw Error('Identité de pièce invalide.');seen.add(value.id);
  const old=before.get(value.id),out=merge(old,value);
  for(const key of FILE_FIELDS){
   if(strict&&own(value,key)&&value[key]!==old?.[key])throw Error('Les références de fichier se modifient avec les actions de pièces jointes.');
   if(old&&own(old,key))out[key]=old[key];else delete out[key];
  }
  return out;
 });
 // Metadata imports never remove an existing piece or revision.
 return result.concat((prior||[]).filter(row=>!seen.has(row.id)).map(clone));
}
function mergeImported(prior,input){
 if(window.DobbyArchiveSources)input=window.DobbyArchiveSources.mergeRestored('documents',prior,input);
 if(!object(input))throw Error('Fiche importée invalide.');
 const record=merge(prior,input);
 if(prior?.retainedLocalOnly===true)record.retainedLocalOnly=true;
 for(const key of ['attachmentName','attachmentType',...CLOUD_FIELDS]){if(prior&&own(prior,key))record[key]=prior[key];else delete record[key];}
 if(own(input,'attachments'))record.attachments=attachmentInput(prior?.attachments,input.attachments,false);
 return record;
}
function saveContract(id,values,expected){
 const prior=current(id,expected,Boolean(id));if(!object(values))throw Error('Contrat invalide.');
 if(own(values,'id')&&values.id!==id)throw Error('Identité du contrat invalide.');
 const savedId=id||'fd-'+crypto.randomUUID(),record=merge(prior,values);record.id=savedId;
 if(prior?.retainedLocalOnly===true)record.retainedLocalOnly=true;
 if(!prior&&!record.category)record.category='Contrats';
 if(values.contract&&record.contract.version===undefined)record.contract.version=1;
 for(const key of ['attachmentName','attachmentType',...CLOUD_FIELDS])if(own(values,key)&&values[key]!==prior?.[key])throw Error('Les références de fichier se modifient avec les actions de pièces jointes.');
 if(own(values,'attachments')){
  if(values.attachments.some?.(row=>!(prior?.attachments||[]).some(old=>old.id===row?.id)))throw Error('Ajoutez une pièce avec l’action de fichier.');
  record.attachments=attachmentInput(prior?.attachments,values.attachments,true);
 }
 validate(record,prior,values);return commit(savedId,record);
}
function attachments(id){
 const row=find(id),list=clone(Array.isArray(row.attachments)?row.attachments:[]);
 // The old local and shared slots can hold different documents. Never infer
 // that a historical local copy was uploaded merely because both slots exist.
 if(row.cloudPath)list.unshift({id:'legacy-cloud',name:row.cloudName||'Document partagé',type:row.cloudType||'',size:row.cloudSize??null,kind:'contract',...Object.fromEntries(CLOUD_FIELDS.filter(key=>row[key]!==undefined).map(key=>[key,row[key]]))});
 if(row.attachmentName)list.unshift({id:'legacy',name:row.attachmentName,type:row.attachmentType||'',size:null,kind:'contract',key:'family-'+id});
 return list;
}
function piece(id,attachmentId){const item=attachments(id).find(row=>row.id===attachmentId);if(!item)throw Error('Pièce jointe introuvable.');return item;}
function localKey(id,item){const allowed=item.id==='legacy'?'family-'+id:'family-contract-'+id+'-'+item.id;if(item.key!==allowed)throw Error('Référence de fichier local invalide.');return allowed;}
function checkFile(file){if(!file||!TYPES[file.type]||!Number.isFinite(file.size)||file.size<=0||file.size>10485760)throw Error('Choisissez un PDF ou une image de 10 Mo maximum.');}
async function addAttachment(id,file,kind='contract',supersedes=null){
 assertWrite();find(id);checkFile(file);if(typeof kind!=='string'||!kind.trim()||kind.length>80)throw Error('Type de pièce invalide.');
 const expected=snapshot(id),attachmentId='piece-'+crypto.randomUUID(),key='family-contract-'+id+'-'+attachmentId;
 const descriptor={id:attachmentId,name:safeDownloadName(file.name,file.type),type:file.type,size:file.size,kind,key,...(supersedes?{supersedes}:{})};
 try{await houseStore(file,key);const row=current(id,expected);commit(id,{...row,attachments:[...(row.attachments||[]),descriptor]});}
 catch(error){await houseRead(key,true).catch(()=>{});throw error;}
 return clone(descriptor);
}
async function openAttachment(id,attachmentId){
 const item=piece(id,attachmentId),token=JSON.stringify(context());
 if(item.key){let blob;try{blob=await houseRead(localKey(id,item));}catch(error){if(!item.cloudPath)throw error;}if(token!==JSON.stringify(context()))throw Error('Le foyer a changé pendant la lecture.');if(blob)return blob;}
 const api=window.DobbyFamilyUI;if(!item.cloudPath||!api?.getContext?.()||!api.isModuleActive?.('contracts'))throw Error('Pièce absente de cet appareil ; aucun fichier partagé accessible.');
 const blob=await api.storageFetch('GET',item.cloudPath);if(token!==JSON.stringify(context()))throw Error('Le foyer a changé pendant la lecture.');return blob;
}
async function shareAttachment(id,attachmentId){
 assertWrite();const row=find(id),item=piece(id,attachmentId),api=window.DobbyFamilyUI,live=api?.getContext?.();
 if(!live||!api.isModuleActive?.('contracts'))throw Error('Activez le partage Documents dans les paramètres du foyer.');
 if(row.retainedLocalOnly===true)throw Error('Cette copie locale a été retirée du foyer. Son partage demande une nouvelle action explicite.');
 if(!['Contrats','Assurances'].includes(row.category)&&row.sharedToHousehold!==true)throw Error('Cette fiche doit être partagée avant son fichier.');
 if(item.cloudPath)return item;
 const expected=snapshot(id),blob=await openAttachment(id,attachmentId);current(id,expected);checkFile(blob);
 const path=live.householdId+'/'+crypto.randomUUID()+'.'+TYPES[blob.type];await api.storageFetch('POST',path,blob);
 // Never issue cleanup into a newly selected household. An unreferenced upload
 // can remain after a context switch; the local fiche is never falsely shared.
 try{
  const latest=current(id,expected),fields={cloudPath:path,cloudName:item.name,cloudType:blob.type,cloudSize:blob.size};
  let sharedId=attachmentId;
  if(attachmentId==='legacy'){
   if(!latest.cloudPath){commit(id,{...latest,...fields});sharedId='legacy-cloud';}
   else{sharedId='piece-'+crypto.randomUUID();commit(id,{...latest,attachments:[...(latest.attachments||[]),{id:sharedId,name:item.name,type:blob.type,size:blob.size,kind:item.kind,...fields}]});}
  }else commit(id,{...latest,attachments:latest.attachments.map(value=>value.id===attachmentId?{...value,...fields}:value)});
  return piece(id,sharedId);
 }catch(error){if(expected===snapshot(id))await api.storageFetch('DELETE',path).catch(()=>{});throw error;}
}
async function replaceAttachment(id,attachmentId,file){assertWrite();const old=piece(id,attachmentId);return addAttachment(id,file,old.kind||'contract',attachmentId);}
async function cleanupRemovedLocal(keys,shared){
 // Household snapshots have no transactional acknowledgement covering every
 // peer. Retain shared bytes so stale peers cannot reference deleted objects.
 // No background cleanup is scheduled or claimed by this client.
 const result={removed:true,sharedCleanupDeferred:shared,localCleanupFailed:false,notice:shared?SHARED_RETAINED_NOTICE:''};
 for(const key of keys)try{await houseRead(key,true);}catch{result.localCleanupFailed=true;}
 if(result.localCleanupFailed)result.notice+=(result.notice?' ':'')+'La référence locale est retirée ; la copie binaire locale n’a pas pu être effacée.';
 return result;
}
async function removeAttachment(id,attachmentId){
 assertWrite();const item=piece(id,attachmentId),expected=snapshot(id),keys=item.key?[localKey(id,item)]:[];
 const row=current(id,expected),record={...row};
 if(attachmentId==='legacy'){record.attachmentName='';record.attachmentType='';}
 else if(attachmentId==='legacy-cloud'){for(const key of CLOUD_FIELDS)delete record[key];}
 else record.attachments=(row.attachments||[]).filter(value=>value.id!==attachmentId);
 commit(id,record);return cleanupRemovedLocal(keys,Boolean(item.cloudPath));
}
async function deleteContract(id,expected){
 current(id,expected);const list=attachments(id),keys=list.filter(item=>item.key).map(item=>localKey(id,item));
 current(id,expected);removeRecord(id);
 return cleanupRemovedLocal(keys,list.some(item=>Boolean(item.cloudPath)));
}
window.DobbyFamilyContracts=Object.freeze({snapshot,contextSnapshot:()=>JSON.stringify(context()),assertWritable:assertWrite,safeDownloadName,save:saveContract,attachments,addAttachment,openAttachment,shareAttachment,replaceAttachment,removeAttachment,delete:deleteContract,mergeImported});
})();

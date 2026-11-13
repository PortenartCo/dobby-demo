/* Maison writes use the native state, save pipeline and local binary store.
   No upload, server capability or mission state is introduced here. */
(function(){
'use strict';
const KEYS=['houseItems','houseLogs','houseDocs'],BLOCKED=['__proto__','constructor','prototype'];
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const empty=value=>value===undefined||value===null||value==='';
const identity=value=>typeof value==='string'&&Boolean(value.trim())&&value.length<=200;
const clone=value=>Array.isArray(value)?value.map(clone):object(value)?Object.fromEntries(Object.entries(value).filter(([key])=>!BLOCKED.includes(key)).map(([key,child])=>[key,clone(child)])):value;
function merge(before,patch){
 const out=object(before)?clone(before):{};
 for(const[key,value]of Object.entries(patch||{}))if(!BLOCKED.includes(key)&&value!==undefined)out[key]=object(value)?merge(object(out[key])?out[key]:{},value):clone(value);
 return out;
}
function rows(key){const value=st[key]??[];if(!Array.isArray(value))throw Error('Registre Maison invalide. Données conservées.');return value;}
function find(id,items=rows('houseItems')){const value=items.find(row=>row.id===id);if(!value)throw Error('Cet équipement a été supprimé.');if(rows('houseItems').some(row=>row.id===id))window.DobbyArchiveSources?.get('equipment',id);return value;}
function context(){
 const api=window.DobbyFamilyUI;let connection=null,live=null,bound=null;
 try{connection=api?.connectionState?.();}catch{}
 try{live=api?.getContext?.();}catch{}
 try{bound=api?.access?.state?.();}catch{}
 return{connection,live,bound};
}
function contextSnapshot(){
 const {connection:c,live:l,bound:b}=context();
 return JSON.stringify([c?.epoch??null,c?.userId??null,c?.householdId??null,c?.memberId??null,l?.userId??null,l?.householdId??null,l?.memberId??null,b?.userId??null,b?.householdId??null,b?.memberId??null]);
}
function assertReadable(){
 const {connection:c,live:l,bound:b}=context();
 if(c?.verifying||c?.access==='rejected'||b?.phase==='rejected')throw Error('Le foyer doit être vérifié avant cette opération.');
 const authenticated=Boolean(c?.userId||c?.connected||l?.userId||b?.authenticated||b?.userId||b?.memberId||b?.profile?.id||b?.phase==='active');
 if(authenticated){
  const coherent=c?.access==='verified'&&c.verified===true&&c.identityVerified===true&&l?.identityVerified===true&&b?.authenticated===true&&b.verified===true&&b.phase==='active'&&
   identity(b.userId)&&identity(b.householdId)&&identity(b.memberId)&&b.profile?.id===b.memberId&&['parent','child'].includes(b.profile.memberCategory)&&
   ['userId','householdId','memberId'].every(key=>c[key]===b[key]&&l[key]===b[key]);
  if(!coherent)throw Error('Le compte doit être relié à une identité canonique vérifiée pour ce foyer.');
 }else if(c?.access&&c.access!=='local')throw Error('Le foyer doit être vérifié avant cette opération.');
 for(const key of ['userId','householdId','memberId'])if(c?.[key]&&l?.[key]&&c[key]!==l[key]||b?.[key]&&l?.[key]&&b[key]!==l[key])throw Error('Le foyer ou le compte a changé.');
 return{connection:c,live:l,bound:b,authenticated};
}
function assertWritable(){
 const {connection:c,live:l,bound:b,authenticated}=assertReadable(),memberId=l?.memberId||b?.memberId||c?.memberId;
 const actor=(st.familyMembers||[]).find(row=>row.id===memberId),category=authenticated?b.profile.memberCategory:actor?.memberCategory;
 let readOnly=false;try{readOnly=window.parent?.DobbyFamilyStitch?.sharedReadOnly?.()===true;}catch{}
 if(readOnly||category&&category!=='parent'||authenticated&&b.permissions?.canEdit!==true||[l?.permissions,b?.permissions,c?.permissions].some(permissions=>permissions?.canEdit===false))throw Error('La Maison est en lecture seule pour ce compte. Seul un parent autorisé peut la modifier.');
}
function snapshot(id=null){
 return JSON.stringify({context:contextSnapshot(),row:id?rows('houseItems').find(row=>row.id===id)||null:null,logs:id?rows('houseLogs').filter(row=>row.itemId===id):[],docs:id?rows('houseDocs').filter(row=>row.itemId===id):[]});
}
function registrySnapshot(){return JSON.stringify({context:contextSnapshot(),...Object.fromEntries(KEYS.map(key=>[key,rows(key)]))});}
const token=expected=>typeof expected==='string'?expected:expected?.snapshot;
function current(id,expected){assertWritable();if(token(expected)!==snapshot(id))throw Error('La fiche ou le foyer a été modifié depuis son ouverture. Votre saisie est conservée.');if(id)window.DobbyArchiveSources?.assertMutable('equipment',id);return id?find(id):null;}
function currentRegistry(expected){assertWritable();if(token(expected)!==registrySnapshot())throw Error('Le registre ou le foyer a été modifié depuis son ouverture. Votre saisie est conservée.');}
function validDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number(value.slice(0,4))<1)return false;
 const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
function dateField(values,prior,key){if(own(values,key)&&values[key]!==prior?.[key]&&!empty(values[key])&&!validDate(values[key]))throw Error('Date Maison invalide ('+key+').');}
function stringField(values,key,max){if(own(values,key)&&!empty(values[key])&&(typeof values[key]!=='string'||values[key].length>max))throw Error('Champ Maison invalide ('+key+').');}
function planRows(row){
 if(Array.isArray(row?.maintenancePlans))return row.maintenancePlans;
 if(!row||!['lastMaintenance','nextMaintenance','interval'].some(key=>!empty(row[key])))return[];
 const amount=Number(row.interval);return[{id:'legacy-'+row.id,title:'Entretien',lastKnownDate:row.lastMaintenance||'',interval:{value:Number.isSafeInteger(amount)&&amount>0?amount:null,unit:'months'},nextDateOverride:row.nextMaintenance||'',usualProvider:row.provider||'',notes:'',sourceRefs:[],legacy:true}];
}
function mergePlans(prior,input,itemId,items,additive){
 if(!Array.isArray(input)||input.length>100)throw Error('Liste de programmes invalide.');
 const old=planRows(prior),seen=new Set(),result=input.map(patch=>{
  if(!object(patch))throw Error('Programme invalide.');
  const id=patch.id||'plan-'+crypto.randomUUID();
  if(!identity(id)||seen.has(id)||items.some(row=>row.id!==itemId&&planRows(row).some(plan=>plan.id===id)))throw Error('Identité de programme invalide.');seen.add(id);
  const before=old.find(plan=>plan.id===id),record=merge(before,patch);record.id=id;
  if(typeof record.title!=='string'||!record.title.trim()||record.title.length>200)throw Error('Nom du programme invalide.');record.title=record.title.trim();
  for(const key of ['lastKnownDate','nextDateOverride'])dateField(patch,before,key);
  if(own(patch,'interval')&&JSON.stringify(record.interval)!==JSON.stringify(before?.interval)){
   const interval=record.interval,unknown=interval?.value===null&&interval?.unit===null;
   if(!object(interval)||!unknown&&(!['months','years'].includes(interval.unit)||interval.value!==null&&(!Number.isSafeInteger(interval.value)||interval.value<=0)))throw Error('Fréquence du programme invalide.');
  }
  for(const key of ['sourceRefs','uncertainties'])if(own(patch,key)&&!Array.isArray(record[key]))throw Error('Sources du programme invalides.');
  for(const key of ['usualProvider','notes','overrideReason'])stringField(patch,key,20000);
  return record;
 });
 return additive?result.concat(old.filter(plan=>!seen.has(plan.id)).map(clone)):result;
}
const ADDITIVE=['sources','equipmentDocuments','equipmentDocumentLinks','equipmentImportKeys','equipmentMissing','equipmentUncertain'];
function additiveArray(prior,input){const result=clone(Array.isArray(prior)?prior:[]),seen=new Set(result.map(value=>JSON.stringify(value)));for(const row of input){const key=JSON.stringify(row);if(!seen.has(key)){result.push(clone(row));seen.add(key);}}return result;}
function equipmentRecord(id,values,prior,items,additive=false){
 if(!object(values))throw Error('Équipement invalide.');
 if(own(values,'id')&&values.id!==id)throw Error('Identité de l’équipement invalide.');
 const record=merge(prior,values);record.id=id;
 if(typeof record.name!=='string'||!record.name.trim()||record.name.length>120)throw Error('Indiquez un nom d’équipement de 120 caractères maximum.');record.name=record.name.trim();
 for(const key of ['purchased','warranty','lastMaintenance','nextMaintenance'])dateField(values,prior,key);
 for(const key of ['category','brand','model','serialNumber','manufacturerReference','place','provider'])stringField(values,key,500);
 stringField(values,'notes',20000);
 if(typeof record.place==='string'){
  const place=record.place.trim().replace(/\s+/g,' '),same=items.find(row=>typeof row.place==='string'&&row.place.trim().replace(/\s+/g,' ').toLocaleLowerCase('fr')===place.toLocaleLowerCase('fr'));
  record.place=same?same.place.trim().replace(/\s+/g,' '):place;
 }
 if(own(values,'maintenancePlans'))record.maintenancePlans=mergePlans(prior,values.maintenancePlans,id,items,additive);
 if(additive)for(const key of ADDITIVE)if(own(values,key)){if(!Array.isArray(values[key]))throw Error('Sources importées invalides.');record[key]=additiveArray(prior?.[key],values[key]);}
 return record;
}
function commit(next){
 const before=Object.fromEntries(KEYS.map(key=>[key,{had:own(st,key),value:st[key]}]));
 const derivedTasks={had:own(st,'autoTasks'),value:clone(st.autoTasks)};
 for(const key of KEYS)if(own(next,key))st[key]=next[key];
 try{save();}catch(error){for(const key of KEYS){if(before[key].had)st[key]=before[key].value;else delete st[key];}if(derivedTasks.had)st.autoTasks=derivedTasks.value;else delete st.autoTasks;throw error;}
 // A rendering error must not turn a successfully persisted binary into an orphan.
 try{render();}catch(error){console.error('Affichage Maison indisponible après enregistrement.',error);}
}
function saveEquipment(id,values,expected){
 const prior=current(id,expected),savedId=id||values?.id||'eq-'+crypto.randomUUID(),items=rows('houseItems');
 if(!identity(savedId)||!id&&items.some(row=>row.id===savedId))throw Error('Identité de l’équipement invalide.');
 const record=equipmentRecord(savedId,values,prior,items),next={houseItems:prior?items.map(row=>row.id===id?record:row):[...items,record]};
 if(prior&&own(values,'maintenancePlans')){
  const kept=new Set(record.maintenancePlans.map(plan=>plan.id)),removed=planRows(prior).filter(plan=>!kept.has(plan.id)),removedIds=new Set(removed.map(plan=>plan.id));
  if(rows('houseLogs').some(log=>log.itemId===id&&removedIds.has(log.planId))&&expected?.confirmPlanRemoval!==true)throw Error('Confirmez le retrait du programme et la conservation de son historique.');
  const detach=row=>row.itemId===id&&removedIds.has(row.planId)?{...row,formerPlanId:row.planId,formerPlanTitle:removed.find(plan=>plan.id===row.planId)?.title||'',planId:null}:row;
  next.houseLogs=rows('houseLogs').map(detach);next.houseDocs=rows('houseDocs').map(detach);
 }
 commit(next);return savedId;
}
function saveLog(itemId,logId,values,expected){
 const item=current(itemId,expected);if(!object(values))throw Error('Intervention invalide.');
 const logs=rows('houseLogs'),prior=logId?logs.find(log=>log.id===logId&&log.itemId===itemId):null;
 if(logId&&!prior)throw Error('Cette intervention a été supprimée.');
 if(own(values,'itemId')&&values.itemId!==itemId||own(values,'id')&&values.id!==logId)throw Error('Identité de l’intervention invalide.');
 const id=logId||'log-'+crypto.randomUUID(),record=merge(prior,values);record.id=id;record.itemId=itemId;
 if(!prior&&!validDate(record.date))throw Error('Date de l’intervention invalide.');dateField(values,prior,'date');
 if(!empty(record.planId)&&!planRows(item).some(plan=>plan.id===record.planId)&&record.planId!==prior?.planId)throw Error('Programme de l’intervention invalide.');
 if(own(values,'amount')&&!empty(values.amount)&&(typeof values.amount!=='number'||!Number.isFinite(values.amount)||values.amount<0))throw Error('Montant de l’intervention invalide.');
 if(own(values,'performed')&&typeof values.performed!=='boolean')throw Error('État de l’intervention invalide.');if(!prior&&!own(record,'performed'))record.performed=true;
 for(const key of ['type','description','provider','notes','note'])stringField(values,key,20000);
 if(!['type','description','note'].some(key=>typeof record[key]==='string'&&record[key].trim()))throw Error('Indiquez la nature ou la description de l’intervention.');
 // The complete native backup validates this historical string field. Keep it
 // alongside the structured fields, preserving an existing historical note.
 if(record.note===undefined||record.note===null&&(!prior||own(values,'note')))record.note=String(record.type||record.description||'').trim().slice(0,2000);
 if(record.note!==prior?.note&&(typeof record.note!=='string'||record.note.length>2000))throw Error('La note historique de l’intervention doit contenir au maximum 2000 caractères.');
 commit({houseLogs:prior?logs.map(log=>log.id===id?record:log):[...logs,record]});return id;
}
function deleteLog(itemId,logId,expected){
 current(itemId,expected);const logs=rows('houseLogs');if(!logs.some(log=>log.id===logId&&log.itemId===itemId))throw Error('Cette intervention a été supprimée.');
 commit({houseLogs:logs.filter(log=>!(log.id===logId&&log.itemId===itemId)),houseDocs:rows('houseDocs').map(doc=>doc.itemId===itemId&&doc.logId===logId?{...doc,formerLogId:logId,logId:null}:doc)});
}
const TYPES={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
function safeName(name,type){const extension=TYPES[type],base=String(name||'document').split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').replace(/[<>:"|?*]/g,'_').trim(),stem=base.replace(/\.[^.]*$/,'').replace(/^[. ]+|[. ]+$/g,'')||'document';return stem.slice(0,240)+'.'+extension;}
function checkFile(file){if(!file||typeof file.arrayBuffer!=='function'||!Number.isFinite(file.size)||file.size<=0||file.size>10485760||file.type&&!TYPES[file.type])throw Error('Choisissez un PDF ou une image de 10 Mo maximum.');}
async function binaryType(file){
 checkFile(file);const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer()),ascii=(start,end)=>Array.from(bytes.slice(start,end),code=>String.fromCharCode(code)).join('');
 const type=ascii(0,5)==='%PDF-'?'application/pdf':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':bytes[0]===137&&ascii(1,4)==='PNG'&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10?'image/png':ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP'?'image/webp':null;
 if(!type||file.type&&type!==file.type)throw Error('Le contenu du fichier ne correspond pas à un PDF ou une image autorisée.');return type;
}
function descriptor(item,file,association,type){
 const input=association??{};if(!object(input))throw Error('Association de document invalide.');
 const out=clone(input);for(const key of ['id','itemId','key','localKey','localPath','cloudPath','cloudName','cloudType','cloudSize'])delete out[key];
 if(!empty(out.planId)&&!planRows(item).some(plan=>plan.id===out.planId))throw Error('Programme du document invalide.');
 if(!empty(out.logId)&&!rows('houseLogs').some(log=>log.id===out.logId&&log.itemId===item.id))throw Error('Intervention du document invalide.');
 if(!empty(out.kind)&&(typeof out.kind!=='string'||out.kind.length>100))throw Error('Type de document invalide.');
 return{...out,id:'doc-'+crypto.randomUUID(),itemId:item.id,name:safeName(file.name||String(input.path||'document').split('/').pop(),type),kind:out.kind||'Autre',type,size:file.size,at:new Date().toISOString(),localOnly:true};
}
async function cleanup(ids){let failed=false;for(const id of ids)try{await houseRead(id,true);}catch{failed=true;}return{removed:true,localCleanupFailed:failed,notice:failed?'La référence a été retirée ; le fichier local n’a pas pu être effacé.':''};}
async function addDocuments(itemId,files,associations,expected){
 let item=current(itemId,expected);if(!Array.isArray(files)||!files.length||files.length>100||files.reduce((sum,file)=>sum+(file?.size||0),0)>104857600)throw Error('Liste de documents invalide.');
 if(Array.isArray(associations)&&associations.length!==files.length)throw Error('Associations de documents invalides.');
 const pending=[],staged=[];
 try{
  for(let index=0;index<files.length;index++){const file=files[index],type=await binaryType(file);item=current(itemId,expected);pending.push({file,doc:descriptor(item,file,Array.isArray(associations)?associations[index]:associations,type)});}
  for(const {file,doc}of pending){current(itemId,expected);staged.push(doc.id);await houseStore(file,doc.id);current(itemId,expected);}
  current(itemId,expected);commit({houseDocs:[...rows('houseDocs'),...pending.map(value=>value.doc)]});return pending.map(value=>value.doc.id);
 }catch(error){await cleanup(staged);throw error;}
}
function documentRow(id){const doc=rows('houseDocs').find(row=>row.id===id);if(!doc)throw Error('Document introuvable.');return doc;}
async function openDocument(id){
 assertReadable();const doc=documentRow(id);find(doc.itemId);const expected=snapshot(doc.itemId),blob=await houseRead(doc.id);assertReadable();
 if(expected!==snapshot(doc.itemId))throw Error('La fiche ou le foyer a été modifié pendant la lecture.');if(!blob)throw Error('Fichier absent de cet appareil.');return blob;
}
async function removeDocument(id,expected){const doc=documentRow(id);current(doc.itemId,expected);commit({houseDocs:rows('houseDocs').filter(row=>row.id!==id)});return cleanup([id]);}
async function deleteEquipment(id,expected){
 current(id,expected);
 if((st.familyDocs||[]).some(row=>row.contract?.equipmentIds?.includes(id)))throw Error('Cet équipement est lié à un contrat. Retirez son association dans Contrats avant de le supprimer.');
 const docs=rows('houseDocs').filter(row=>row.itemId===id);commit({houseItems:rows('houseItems').filter(row=>row.id!==id),houseLogs:rows('houseLogs').filter(row=>row.itemId!==id),houseDocs:rows('houseDocs').filter(row=>row.itemId!==id)});return cleanup(docs.map(doc=>doc.id));
}
async function importEquipment(entries,files,expected){
 currentRegistry(expected);if(!Array.isArray(entries)||entries.length>500)throw Error('Liste d’import invalide.');
 const items=clone(rows('houseItems')),result=[],pending=[],staged=[],targets=new Set();
 try{
  // Validate every metadata update before reading or staging the first binary.
  for(const entry of entries){
   if(!object(entry)||!['add','update','skip'].includes(entry.action))throw Error('Action d’import invalide.');
   if(entry.action==='skip'){result.push({action:'skip',status:'skipped',documentIds:[]});continue;}
   const id=entry.action==='update'?entry.targetId:entry.values?.id||'eq-'+crypto.randomUUID();
   if(!identity(id)||targets.has(id)||entry.action==='add'&&items.some(row=>row.id===id))throw Error('Identité de l’équipement importé invalide.');targets.add(id);
   if(entry.action==='update')window.DobbyArchiveSources?.assertMutable('equipment',id);const prior=entry.action==='update'?find(id,items):null,record=equipmentRecord(id,entry.values,prior,items,true);
   const index=items.findIndex(row=>row.id===id);if(index<0)items.push(record);else items[index]=record;
   const outcome={action:entry.action,status:prior?'updated':'added',id,documentIds:[]};result.push(outcome);
   if(entry.documents!==undefined&&!Array.isArray(entry.documents))throw Error('Documents importés invalides.');
   for(const association of entry.documents||[]){const file=files?.get?.(association.path);if(!file)throw Error('Fichier importé absent : '+association.path);checkFile(file);pending.push({file,association,item:record,outcome});}
  }
  if(pending.length>1000||pending.reduce((sum,value)=>sum+value.file.size,0)>104857600)throw Error('Volume des documents importés trop important.');
  for(const value of pending){const type=await binaryType(value.file);currentRegistry(expected);value.doc=descriptor(value.item,value.file,value.association,type);value.outcome.documentIds.push(value.doc.id);}
  for(const value of pending){currentRegistry(expected);staged.push(value.doc.id);await houseStore(value.file,value.doc.id);currentRegistry(expected);}
  currentRegistry(expected);if(result.some(row=>row.status!=='skipped'))commit({houseItems:items,houseDocs:[...rows('houseDocs'),...pending.map(value=>value.doc)]});return result;
 }catch(error){await cleanup(staged);throw error;}
}
function restoreBackup(data,expected){
 currentRegistry(expected);
 if(!object(data)||data.format!=='dobby-house'||data.version!==1||!Array.isArray(data.items)||!Array.isArray(data.logs)||data.items.length>1000||data.logs.length>20000)throw Error('Format ou collections de sauvegarde Maison invalides.');
 const items=clone(rows('houseItems')),logs=clone(rows('houseLogs')),seenItems=new Set(),seenLogs=new Set(),counts={itemsAdded:0,itemsUpdated:0,logsAdded:0,logsUpdated:0};
 // This partial archive has no deletion semantics and contains no binary data.
 // Older exporters may omit every field added by a newer Maison client.
 for(const patch of data.items){
  if(!object(patch)||!identity(patch.id)||seenItems.has(patch.id))throw Error('Identité d’équipement de sauvegarde invalide.');seenItems.add(patch.id);
  if(own(patch,'maintenancePlans')&&(!Array.isArray(patch.maintenancePlans)||patch.maintenancePlans.some(plan=>!object(plan)||!identity(plan.id))))throw Error('Identité de programme de sauvegarde invalide.');
  const index=items.findIndex(row=>row.id===patch.id),prior=index<0?null:items[index],record=equipmentRecord(patch.id,window.DobbyArchiveSources?.mergeRestored('equipment',prior,patch)||patch,prior,items,true);
  if(index<0){items.push(record);counts.itemsAdded++;}else{items[index]=record;counts.itemsUpdated++;}
 }
 for(const patch of data.logs){
  if(!object(patch)||!identity(patch.id)||!identity(patch.itemId)||seenLogs.has(patch.id))throw Error('Identité d’intervention de sauvegarde invalide.');seenLogs.add(patch.id);
  const item=find(patch.itemId,items),index=logs.findIndex(log=>log.id===patch.id),prior=index<0?null:logs[index];
  if(prior&&prior.itemId!==patch.itemId)throw Error('L’équipement d’une intervention ne peut pas être réaffecté par une sauvegarde.');
  const record=merge(prior,patch);
  if(!prior&&!validDate(record.date))throw Error('Date d’intervention de sauvegarde invalide.');dateField(patch,prior,'date');
  if((!prior||record.note!==prior.note)&&(typeof record.note!=='string'||record.note.length>2000))throw Error('Note d’intervention de sauvegarde invalide.');
  if(!empty(record.planId)&&!planRows(item).some(plan=>plan.id===record.planId)&&record.planId!==prior?.planId)throw Error('Programme d’intervention de sauvegarde invalide.');
  if(index<0){logs.push(record);counts.logsAdded++;}else{logs[index]=record;counts.logsUpdated++;}
 }
 if(items.length>3000||logs.length>20000)throw Error('Collections de sauvegarde Maison trop importantes.');
 currentRegistry(expected);if(data.items.length||data.logs.length)commit({houseItems:items,houseLogs:logs});return counts;
}
window.DobbyFamilyHouse=Object.freeze({snapshot,registrySnapshot,contextSnapshot,assertWritable,save:saveEquipment,saveLog,deleteLog,addDocuments,openDocument,removeDocument,delete:deleteEquipment,importEquipment,restoreBackup});
window.DobbyHouseReady=Promise.resolve(window.DobbyFamilyHouse);
})();

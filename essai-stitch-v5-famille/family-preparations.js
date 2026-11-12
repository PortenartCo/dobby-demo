/* Family preparations use the native state/save pipeline and family module. */
(function(){
'use strict';
const KEYS=['familyPreparationTemplates','familyEventPreparations'],LIMIT=200;
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>JSON.parse(JSON.stringify(value));
const identity=value=>typeof value==='string'&&Boolean(value.trim());
const amount=value=>value===null||typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=999999&&Number(value.toFixed(2))===value;
function text(value,max,required,label){
 if(typeof value!=='string'||value.length>max||required&&!value.trim())throw Error(label+' invalide');
 return value.trim();
}
function checkItems(items,template){
 if(!Array.isArray(items)||items.length>LIMIT)throw Error('Liste de préparatifs invalide (200 objets maximum)');
 const ids=new Set();
 for(const item of items){
  if(!object(item)||!identity(item.id)||ids.has(item.id))throw Error('Identité de préparatif invalide');ids.add(item.id);
  text(item.label,200,true,'Libellé');text(item.unit,40,false,'Unité');
  if(!amount(item.qty))throw Error('Quantité invalide : de 0 à 999999, avec deux décimales maximum');
  if(typeof item.done!=='boolean'||template&&item.done)throw Error('État du préparatif invalide');
 }
}
function registries(){
 if(st.familyPreparationsVersion!==undefined&&st.familyPreparationsVersion!==1)throw Error('Version des préparatifs incompatible. Données conservées.');
 const values=KEYS.map(key=>st[key]===undefined?[]:st[key]);
 for(let index=0;index<values.length;index++){
  const rows=values[index],ids=new Set();
  if(!Array.isArray(rows)||rows.length>LIMIT)throw Error('Registre des préparatifs invalide. Données conservées.');
  for(const row of rows){
   if(!object(row)||!identity(row.id)||ids.has(row.id)||row.version!==1)throw Error('Version ou identité de préparation incompatible. Données conservées.');ids.add(row.id);
   if(index===0)text(row.name,140,true,'Nom de liste type');
   else if(row.eventId!==row.id||!identity(row.templateId))throw Error('Association du préparatif invalide. Données conservées.');
   checkItems(row.items,index===0);
  }
 }
 return{templates:values[0],eventPreparations:values[1]};
}
function read(){
 const data=registries();return{version:1,...clone(data),snapshot:JSON.stringify({context:contextIdentity(),...data})};
}
function contextIdentity(){
 const api=window.DobbyFamilyUI,scalar=value=>typeof value==='string'||typeof value==='number'?value:null;
 // Both native context sources can be absent in a local-only client. Include
 // the epoch as well as identities so switching away and back invalidates drafts.
 let connection=null,context=null;
 try{connection=api?.connectionState?.();}catch{}
 try{context=api?.getContext?.();}catch{}
 return{epoch:scalar(connection?.epoch),userId:scalar(connection?.userId),householdId:scalar(connection?.householdId),contextUserId:scalar(context?.userId),contextHouseholdId:scalar(context?.householdId)};
}
function current(expected){
 const value=read(),token=typeof expected==='string'?expected:expected?.snapshot;
 if(token!==value.snapshot)throw Error('Les préparatifs ont été modifiés depuis leur ouverture. Votre saisie est conservée. Revenez consulter la nouvelle version.');
 return registries();
}
function unique(prefix,used){let id;do{id=prefix+crypto.randomUUID();}while(used.has(id));used.add(id);return id;}
function items(values,previous,template){
 if(!Array.isArray(values)||values.length>LIMIT)throw Error('Liste de préparatifs invalide (200 objets maximum)');
 const before=new Map((previous||[]).map(row=>[row.id,row])),used=new Set(),generated=new Set(before.keys());
 const rows=values.map(value=>{
  if(!object(value))throw Error('Préparatif invalide');
  const id=value.id===undefined||value.id===null||value.id===''?unique('prep-item-',generated):value.id;
  if(!identity(id)||used.has(id))throw Error('Identité de préparatif invalide');used.add(id);
  let qty=value.qty;
  if(qty===undefined||qty==='')qty=null;
  else if(typeof qty==='string'){
   if(!/^\d+(?:\.\d{1,2})?$/.test(qty))throw Error('Quantité invalide : deux décimales maximum');qty=Number(qty);
  }
  const old=before.get(id),done=value.done===undefined?(template?false:old?.done??false):value.done;
  return{...(old||clone(value)),id,label:text(value.label,200,true,'Libellé'),qty,unit:text(value.unit??'',40,false,'Unité'),done};
 });
 checkItems(rows,template);return rows;
}
function transact(key,rows,savedId){
 const had=Object.hasOwn(st,key),before=st[key];st[key]=rows;
 try{save();}catch(error){if(had)st[key]=before;else delete st[key];throw error;}
 render();return{...read(),...(savedId?{savedId}:{})};
}
function saveTemplate(id,values,expected){
 const {templates}=current(expected),old=id?templates.find(row=>row.id===id):null;
 if(id&&!old)throw Error('Cette liste type a été supprimée.');
 if(!object(values)||values.version!==undefined&&values.version!==1)throw Error('Version de liste type incompatible');
 if(!id&&templates.length>=LIMIT)throw Error('Limite de 200 listes types atteinte');
 const savedId=id||unique('prep-template-',new Set(templates.map(row=>row.id)));
 const record={...old,id:savedId,version:1,name:text(values.name,140,true,'Nom de liste type'),items:items(values.items,old?.items,true)};
 return transact(KEYS[0],old?templates.map(row=>row.id===id?record:row):[...templates,record],savedId);
}
function deleteTemplate(id,expected){
 const {templates}=current(expected);if(!templates.some(row=>row.id===id))throw Error('Cette liste type a été supprimée.');
 return transact(KEYS[0],templates.filter(row=>row.id!==id));
}
function duplicateTemplate(id,expected){
 const {templates}=current(expected),old=templates.find(row=>row.id===id);if(!old)throw Error('Cette liste type a été supprimée.');
 if(templates.length>=LIMIT)throw Error('Limite de 200 listes types atteinte');
 const savedId=unique('prep-template-',new Set(templates.map(row=>row.id))),used=new Set(old.items.map(row=>row.id));
 const record={...clone(old),id:savedId,name:old.name.slice(0,132)+' (copie)',items:old.items.map(item=>({...clone(item),id:unique('prep-item-',used),done:false}))};
 return transact(KEYS[0],[...templates,record],savedId);
}
function saveEventItems(eventId,values,expected){
 const {eventPreparations}=current(expected),old=eventPreparations.find(row=>row.eventId===eventId);
 if(!old||!Array.isArray(st.familyEvents)||!st.familyEvents.some(row=>row.id===eventId))throw Error('Cet événement ou ses préparatifs ont été supprimés.');
 const record={...old,items:items(values,old.items,false)};
 return transact(KEYS[1],eventPreparations.map(row=>row.eventId===eventId?record:row),eventId);
}
// Staging deliberately does not save: the native event writer commits both
// registries together, and restores both when persistence throws.
function stageEvent(eventId,templateId){
 const {templates,eventPreparations}=registries(),existing=eventPreparations.find(row=>row.eventId===eventId);
 if(!identity(eventId))throw Error('Événement invalide');
 if(existing){
  if(templateId&&templateId!==existing.templateId)throw Error('Les préparatifs existants sont conservés ; leur remplacement est bloqué.');
  return clone(existing);
 }
 if(!templateId)return null;
 const template=templates.find(row=>row.id===templateId);if(!template)throw Error('Cette liste type a été supprimée. Choisissez une liste disponible.');
 if(eventPreparations.length>=LIMIT)throw Error('Limite de 200 préparations atteinte');
 const used=new Set(template.items.map(row=>row.id)),record={id:eventId,eventId,version:1,templateId,items:template.items.map(item=>({...clone(item),id:unique('prep-item-',used),done:false}))};
 st.familyEventPreparations=[...eventPreparations,record];return clone(record);
}
function stageDeleteEvent(eventId){
 const {eventPreparations}=registries();
 if(eventPreparations.some(row=>row.eventId===eventId))st.familyEventPreparations=eventPreparations.filter(row=>row.eventId!==eventId);
}
window.DobbyFamilyPreparations=Object.freeze({available:true,read,saveTemplate,deleteTemplate,duplicateTemplate,saveEventItems,stageEvent,stageDeleteEvent});
})();

/* PREP-01: extension of native st/save, family CAS and grocery import writer. */
window.DobbyPreparations=(()=>{
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 function items(rows){
  if(!Array.isArray(rows)||rows.length>300)throw Error('Liste invalide (300 éléments maximum).');
  const ids=new Set();return rows.map(row=>{const name=String(row.name||'').trim(),qty=row.qty==null||row.qty===''?null:Number(row.qty),unit=String(row.unit||'').trim();
   if(typeof row.id!=='string'||!row.id||ids.has(row.id)||row.done!==undefined&&typeof row.done!=='boolean'||!name||name.length>200||unit.length>40||qty!==null&&(!Number.isFinite(qty)||qty<0||qty>999999))throw Error('Élément invalide : nom, quantité ou unité.');ids.add(row.id);return {...row,name,qty,unit};});
 }
 function validate(payload){
  if(payload.preparationsVersion!==undefined&&payload.preparationsVersion!==1)throw Error('Version des préparatifs incompatible.');
  const present=payload.preparationTemplates!==undefined||(payload.familyEvents||[]).some(e=>e.preparation!==undefined);
  if(present&&payload.preparationsVersion!==1)throw Error('Protocole des préparatifs absent.');
  if((payload.preparationsVersion===1||payload.preparationTemplates!==undefined)&&!Array.isArray(payload.preparationTemplates))throw Error('Modèles invalides.');
  const ids=new Set();for(const t of payload.preparationTemplates||[]){if(typeof t.id!=='string'||!t.id||ids.has(t.id)||typeof t.name!=='string'||!t.name.trim()||t.name.length>140)throw Error('Modèle invalide.');ids.add(t.id);items(t.items);}
  for(const e of payload.familyEvents||[])if(e.preparation!=null){if(e.preparation.version!==1)throw Error('Copie de préparatifs incompatible.');items(e.preparation.items);}
  return payload;
 }
 function association(templateId,previous){
  if(templateId===(previous?.templateId||''))return previous;
  if(!templateId)return null;
  const template=(st.preparationTemplates||[]).find(t=>t.id===templateId);if(!template)throw Error('Ce modèle n’existe plus.');
  return {version:1,templateId,items:items(template.items).map(row=>({...copy(row),id:crypto.randomUUID(),done:false}))};
 }
 function transaction(change){const before=JSON.stringify(st);try{const result=change();save();render();return result;}catch(error){st=JSON.parse(before);throw error;}}
 function expected(row,snapshot){if(!row)throw Error('Cet enregistrement n’existe plus.');if(JSON.stringify(row)!==JSON.stringify(snapshot))throw Error('Cet enregistrement a changé. Votre saisie est conservée ; consultez la nouvelle version.');}
 function template(action,id,values,snapshot){return transaction(()=>{
  const rows=st.preparationTemplates||[],old=rows.find(t=>t.id===id);if(id)expected(old,snapshot);
  if(action==='duplicate'){const row={...copy(old),id:crypto.randomUUID(),name:old.name.slice(0,132)+' (copie)',items:items(old.items).map(i=>({...copy(i),id:crypto.randomUUID()}))};st.preparationTemplates=[...rows,row];return row.id;}
  if(action==='delete'){st.preparationTemplates=rows.filter(t=>t.id!==id);return id;}
  const name=String(values.name||'').trim();if(!name||name.length>140)throw Error('Nom requis (140 caractères maximum).');
  id ||= crypto.randomUUID();const row={...old,id,name,items:items(values.items)};
  st.preparationTemplates=old?rows.map(t=>t.id===id?row:t):[...rows,row];return id;
 });}
 function preparation(eventId,action,itemId,values,snapshot){return transaction(()=>{
  const event=(st.familyEvents||[]).find(e=>e.id===eventId);if(!event?.preparation)throw Error('Préparatifs indisponibles.');
  const rows=event.preparation.items,old=rows.find(i=>i.id===itemId);if(action!=='add')expected(old,snapshot);
  if(action==='delete')event.preparation.items=rows.filter(i=>i.id!==itemId);
  else if(action==='toggle')old.done=!old.done;
  else {const row=items([{...old,...values,id:itemId||crypto.randomUUID(),done:old?.done||false}])[0];event.preparation.items=old?rows.map(i=>i.id===itemId?row:i):[...rows,row];}
 });}
 return Object.freeze({items,validate,association,template,preparation});
})();

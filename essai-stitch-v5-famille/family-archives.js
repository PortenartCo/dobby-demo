/* Source lifecycle commands over native collections and save(). No archive store.
   Contracts delegate to their existing writer; binaries are never touched. */
(()=>{
 'use strict';
 const sources={
  documents:{key:'familyDocs',module:'contracts',label:'Contrats & Documents',view:'document'},
  equipment:{key:'houseItems',module:'house',label:'Maison & Équipements',view:'equipment'},
  recipes:{key:'customRecipes',module:'recipes',label:'Recettes personnelles',view:'recipe'},
  contacts:{key:'famContacts',module:'family',label:'Contacts',view:'contact-edit'},
  localNotes:{key:'familyNotes',module:null,label:'Mémos locaux',view:'memo-edit'},
  sharedNotes:{key:'sharedFamilyNotes',module:'family',label:'Notes du foyer',view:'memo-edit'}
 };
 const clone=x=>JSON.parse(JSON.stringify(x)),normalize=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
 const definition=source=>{const def=sources[source];if(!def)throw Error('Source d’archive inconnue.');return def;};
 function rows(source){const def=definition(source),value=source==='recipes'?custom:st[def.key]??[];if(!Array.isArray(value))throw Error('Source illisible. Données conservées.');return value;}
 function liveContext(){const api=window.DobbyFamilyUI;return {connection:api?.connectionState?.()??null,context:api?.getContext?.()??null};}
 function visible(row){const context=liveContext().context,home=row.archive?.householdId||row.householdId;return !home||home===context?.householdId;}
 function get(source,id){const matches=rows(source).filter(x=>x.id===id);if(matches.length>1)throw Error('Identité de fiche ambiguë. Données conservées.');const row=matches[0];if(!row||!visible(row))throw Error('Fiche introuvable ou accès indisponible.');return clone(row);}
 function archived(row){if(row.archive!==undefined&&(!row.archive||row.archive.version!==1||row.archive.archivedAt!==null&&!Number.isFinite(Date.parse(row.archive.archivedAt))))throw Error('Version d’archive incompatible. Données conservées.');return Boolean(row.archive?.archivedAt);}
 function writable(source){
  const def=definition(source),api=window.DobbyFamilyUI,{context,connection}=liveContext(),bound=api?.access?.state?.();
  const memberId=context?.memberId||bound?.memberId||connection?.memberId,member=(st.familyMembers||[]).find(x=>x.id===memberId),category=member?.memberCategory||bound?.profile?.memberCategory;
  if(connection?.userId&&context?.identityVerified!==true&&bound?.verified!==true)throw Error('Identité du compte à vérifier avant cette modification.');
  let child=false;try{child=window.parent?.DobbyFamilyStitch?.sharedReadOnly?.()===true;}catch{}
  if(child||category&&category!=='parent'||context?.permissions?.canEdit===false||bound?.permissions?.canEdit===false)throw Error('Archive en lecture seule. Seul un parent autorisé peut modifier cette fiche.');
  if(def.module&&api?.isModuleActive?.(def.module)&&!context)throw Error('Session du foyer indisponible. Reconnectez-vous avant de modifier cette fiche.');
 }
 const snapshot=(source,id)=>JSON.stringify({source,row:get(source,id),context:liveContext()});
 function change(source,id,toArchived,options={}){
  if(options.confirmed!==true)return false;
  if(typeof toArchived!=='boolean')throw Error('État d’archive invalide.');
  writable(source);const row=get(source,id),already=archived(row);
  // Replayed confirmations are harmless even if their old snapshot is stale.
  if(already===toArchived)return false;
  if(options.expected!==snapshot(source,id))throw Error('La fiche ou le foyer a été modifié. Ouvrez à nouveau la confirmation.');
  const {context}=liveContext(),def=definition(source),shared=source!=='documents'||row.retainedLocalOnly!==true&&(['Contrats','Assurances'].includes(row.category)||row.sharedToHousehold===true),home=def.module&&shared&&window.DobbyFamilyUI?.isModuleActive?.(def.module)?context?.householdId:null;
  const now=new Date().toISOString(),archive={...row.archive,...(home?{householdId:home}:{}),version:1,archivedAt:toArchived?now:null,updatedAt:now,...(!toArchived?{lastArchivedAt:row.archive.archivedAt}: {})};
  if(source==='documents')window.DobbyFamilyContracts.save(id,{archive},window.DobbyFamilyContracts.snapshot(id));
  else{
   const def=definition(source),before=st[def.key],beforeCustom=source==='recipes'?custom:null,next=rows(source).map(value=>value.id===id?{...value,archive}:value);
   st[def.key]=next;if(source==='recipes')custom=next;
   try{save();}catch(error){if(before===undefined)delete st[def.key];else st[def.key]=before;if(source==='recipes')custom=beforeCustom;throw error;}
   render();
  }
  if(archived(get(source,id))!==toArchived)throw Error('L’enregistrement de l’archive n’a pas été confirmé.');
  return true;
 }
 function list(query=''){
  const term=normalize(query),result=[];
  for(const [source,def]of Object.entries(sources))for(const row of rows(source)){
   if(!visible(row)||!archived(row))continue;
   const type=row.category||({equipment:'Équipement',recipes:'Recette',contacts:'Contact',localNotes:'Mémo',sharedNotes:'Mémo'}[source])||'Document';
   const entry={source,id:row.id,title:row.title||row.name||'Sans titre',type,module:def.label,archivedAt:row.archive.archivedAt,view:source==='documents'&&['Contrats','Assurances'].includes(row.category)?'contract':def.view};
   if(!term||normalize([entry.title,type,entry.module,row.reference,row.provider,row.tags,row.note,row.notes].join(' ')).includes(term))result.push(entry);
  }
  return result.sort((a,b)=>Date.parse(b.archivedAt)-Date.parse(a.archivedAt)||a.source.localeCompare(b.source)||String(a.id).localeCompare(String(b.id)));
 }
 function assertMutable(source,id){const row=get(source,id);if(archived(row))throw Error('Cette fiche est archivée et en lecture seule. Réactivez-la depuis Archives & Scriptorium.');}
 // Extend the existing form/action owners before their handlers execute. The
 // source arrays, save(), files and sync writers remain the only persistence.
 if(typeof document!=='undefined'&&document.addEventListener){
  const refuse=(event,check)=>{try{check();}catch(error){event.preventDefault();event.stopImmediatePropagation();alert(error.message);}};
  document.addEventListener('submit',event=>{
   const form=event.target,formId=form.getAttribute('id');let source,id;
   if(formId==='houseForm'){source='equipment';id=houseEdit;}
   if(formId==='familyDocForm'){source='documents';id=docEdit;}
   if(formId==='familyNoteForm'){source='localNotes';id=docNoteEdit;}
   if(formId==='xContactForm'){source='contacts';id=new FormData(form).get('id');}
   if(source&&id&&id!=='new')refuse(event,()=>assertMutable(source,id));
  },true);
  document.addEventListener('click',event=>{
   const node=event.target.closest('[data-house-action],[data-doc],[data-extra]');if(!node)return;
   const id=node.dataset.id;if(!id)return;let source,mutating=false;
   if(node.dataset.houseAction&&['view','edit','delete'].includes(node.dataset.houseAction)){source='equipment';mutating=node.dataset.houseAction!=='view';}
   if(node.dataset.extra&&['contactedit','contactdelete'].includes(node.dataset.extra)){source='contacts';mutating=node.dataset.extra==='contactdelete';}
   if(node.dataset.doc&&['view','edit','delete','detach'].includes(node.dataset.doc)){source='documents';mutating=node.dataset.doc!=='view';}
   if(source)refuse(event,()=>mutating?assertMutable(source,id):get(source,id));
  },true);
 }
 window.DobbyArchiveSources=Object.freeze({get,snapshot,change,list,archived,writable,assertMutable,sources:clone(sources)});
})();

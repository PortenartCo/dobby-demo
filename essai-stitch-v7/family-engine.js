/* Presentation facade over native V5 forms/actions. No new storage or business writer. */
window.DobbyFamilyStitchEngine=(()=>{
 'use strict';
 const win=()=>document.getElementById('dv7-engine').contentWindow;
 const evaluate=(code,values={})=>win().eval(`(function(p){${code}})(${JSON.stringify(values)})`);
 let lastError='';
 function notices(callback){win().alert=message=>{lastError=String(message);callback(lastError);};}
 function read(){
  const data=evaluate('return JSON.parse(JSON.stringify({state:st,members:st.familyMembers||[],local:st.famHealth||[],shared:st.sharedHealthVisits||[],events:st.familyEvents||[],contacts:st.famContacts||[]}));');
  data.active=Boolean(win().DobbyFamilyUI?.isModuleActive('family'));data.status=win().DobbyFamilyUI?.getModuleStatus('family')||'Statut non disponible';
  data.upcoming=win().DobbyFamilyAgenda?.upcoming()||[];return data;
 }
 function rewardSummary(memberId){return win().DobbyFamilyMissions?.summary(memberId)||null;}
 function page(extra=''){evaluate('st.page="family";st.extraPage=p.extra;st.detail=null;v23MemberEdit=null;render();',{extra});}
 function action(key,value,values={}){
  lastError='';const button=win().document.createElement('button');button.type='button';button.hidden=true;button.dataset[key]=value;
  for(const [name,val]of Object.entries(values))button.dataset[name]=val;
  win().document.body.append(button);try{button.click();}finally{button.remove();}if(lastError)throw Error(lastError);
 }
 function submit(id,values){
  lastError='';const form=win().document.getElementById(id);if(!form)throw Error('Formulaire DOBBY indisponible.');
  for(const [key,value]of Object.entries(values)){const field=form.elements.namedItem(key);if(field)field.value=value??'';}
  if(!form.checkValidity())throw Error([...form.elements].find(x=>x.validity&&!x.validity.valid)?.validationMessage||'Vérifiez les champs.');
  form.requestSubmit();
  if(lastError)throw Error(lastError);
 }
 function unsupportedFields(row,form){const fields=[...form.elements],names=new Set(['id',...fields.map(field=>field.getAttribute('name')).filter(Boolean)]),extra=Object.keys(row||{}).filter(key=>!names.has(key));for(const field of fields){const name=field.getAttribute('name');if(field.type==='date'&&row?.[name]&&!field.value)extra.push(name);}return extra;}
 function ensureEditable(row,form){if(unsupportedFields(row,form).length)throw Error('Cette fiche contient des informations supplémentaires ou dans un ancien format que ce formulaire ne peut pas conserver. La modification est bloquée ; les informations existantes restent intactes.');}
 const requireRecord=(rows,id)=>{if(id&&!rows.some(x=>x.id===id))throw Error('Cette fiche a été supprimée. Revenez au registre.');};
 function memberForm(id){requireRecord(read().members,id);page('health');action('v23Member',id?'edit':'new',id?{id}:{});}
 function saveMember(id,values){memberForm(id);const form=win().document.getElementById('v23MemberForm');if(values.avatar&&![...form.elements.avatar.options].some(o=>o.value===values.avatar))form.elements.avatar.add(new (win().Option)(values.avatar,values.avatar));for(const name of ['magicHouseId','magicPatronusId','magicAvatarId','magicHouseAlgorithm','magicPatronusAlgorithm','magicCeremony','profileFirstName','profileLastName'])if(Object.hasOwn(values,name)){const input=win().document.createElement('input');input.type='hidden';input.name=name;form.append(input);}if(values.birthdate){const check=win().document.createElement('input');check.type='date';check.value=values.birthdate;if(check.value!==values.birthdate)throw Error('Date de naissance enregistrée dans un format incompatible. Corrigez explicitement cette date avant d’enregistrer.');}submit('v23MemberForm',values);if(evaluate('return v23MemberEdit!==null;'))throw Error('Indiquez un prénom / nom pour enregistrer ce membre.');return read().state.v23HealthMemberId;}
 function deleteMember(id){requireRecord(read().members,id);page('health');action('v23Member','delete',{id});return !read().members.some(x=>x.id===id);}
 function localForm(id,personId){requireRecord(read().local,id);page('health');if(personId)evaluate('st.v23HealthMemberId=p.id;',{id:personId});action('extra',id?'healthedit':'healthnew',id?{id}:{});}
 function sharedForm(id){requireRecord(read().shared,id);page();action('fh',id?'edit':'new',id?{id}:{});}
 function saveVisit(scope,id,values){
  const before=read();
  if(scope==='shared'){sharedForm(id);submit('fhForm',values);}
  else{
   const member=before.members.find(x=>x.id===values.personId);if(!member)throw Error('Sélectionnez une personne du registre.');
   localForm(id,member.id);submit('xHealthForm',{...values,person:member.name});if(read().state.extraPage!=='health')throw Error('Indiquez un intitulé pour enregistrer ce rendez-vous.');
  }
  const after=read()[scope==='shared'?'shared':'local'],saved=id||after.find(x=>!before[scope==='shared'?'shared':'local'].some(old=>old.id===x.id))?.id;
  if(scope!=='shared'&&saved){
   // Native legacy form listeners shadow the V23 id check (hidden input name=id).
   // Keep the native save/validation and only restore its existing canonical
   // personId field for the explicitly selected record; never create a person.
   evaluate('const member=v23MemberById(p.personId),row=st.famHealth.find(x=>x.id===p.id);if(!member||!row)throw Error("Fiche ou personne indisponible");row.personId=member.id;row.person=member.name;save();render();',{id:saved,personId:values.personId});
  }
  return saved;
 }
 function deleteVisit(scope,id){requireRecord(read()[scope==='shared'?'shared':'local'],id);page(scope==='shared'?'':'health');action(scope==='shared'?'fh':'extra',scope==='shared'?'delete':'healthdelete',{id});return !read()[scope==='shared'?'shared':'local'].some(x=>x.id===id);}
 function eventForm(id){requireRecord(read().events,id);page();action('fpAction',id?'edit':'new',id?{id}:{});return win().document.getElementById('fpEventForm');}
 function saveEvent(id,values){eventForm(id);submit('fpEventForm',values);}
 function deleteEvent(id){requireRecord(read().events,id);page();action('fpAction','delete',{id});}
 function exportEvent(id){page();action('fpAction','ics',{id});}
 function contactForm(id){requireRecord(read().contacts,id);page('contacts');action('extra',id?'contactedit':'contactnew',id?{id}:{});return win().document.getElementById('xContactForm');}
 function saveContact(id,values){const row=read().contacts.find(r=>r.id===id);const form=contactForm(id);ensureEditable(row,form);submit('xContactForm',values);if(read().state.extraPage!=='contacts')throw Error('Indiquez un nom pour enregistrer ce contact.');}
 function deleteContact(id){requireRecord(read().contacts,id);page('contacts');action('extra','contactdelete',{id});}
 // Shared memos use the native state/save pipeline and its family module.
 function changeSharedMemo(p){
  const before=st.sharedFamilyNotes,rows=before||[];
  if(!Array.isArray(rows))throw Error('Registre des mémos illisible. Les données sont conservées.');
  let id=p.id,values=p.values,existing=rows.find(row=>row.id===id);
  if(p.action==='import'){
   const source=(st.familyNotes||[]).find(row=>row.id===id);if(!source||typeof source.id!=='string'||!source.id)throw Error('Ancien mémo local introuvable.');
   id='memo-import-'+encodeURIComponent(source.id);existing=rows.find(row=>row.id===id);
   if(existing)return id; // Repeated import never reverts later shared edits.
   values={title:source.title,body:source.body,tags:source.tags||''};
  }else if(id){
   if(!existing)throw Error('Ce mémo a été supprimé. Revenez au registre.');
   if(JSON.stringify(existing)!==JSON.stringify(p.expected))throw Error('Ce mémo a été modifié depuis son ouverture. Votre saisie est conservée. Revenez au registre pour comparer les versions.');
  }
  let next;
  if(p.action==='delete')next=rows.filter(row=>row.id!==id);
  else{
   const title=String(values?.title||'').trim(),body=String(values?.body||'').trim(),tags=String(values?.tags||'').trim();
   if(!title||title.length>140||!body||body.length>10000||tags.length>300)throw Error('Renseignez le titre (140 caractères), le contenu (10000) et les mots-clés (300 maximum).');
   id ||= 'memo-'+crypto.randomUUID();const row={...existing,id,title,body,tags,updatedAt:new Date().toISOString()};
   next=existing?rows.map(item=>item.id===id?row:item):[...rows,row];
  }
  st.sharedFamilyNotes=next;
  try{save();}catch(error){if(before===undefined)delete st.sharedFamilyNotes;else st.sharedFamilyNotes=before;throw error;}
  render();return id;
 }
 const memoWrite=(action,id,values,expected)=>evaluate('return ('+changeSharedMemo.toString()+')(p);',{action,id,values,expected});
 const saveSharedMemo=(id,values,expected)=>memoWrite('save',id,values,expected);
 const deleteSharedMemo=(id,expected)=>memoWrite('delete',id,null,expected);
 const importLocalMemo=id=>memoWrite('import',id);
 return Object.freeze({saveSharedMemo,deleteSharedMemo,importLocalMemo,requireRecord,unsupportedFields,ensureEditable,get lastError(){return lastError;},clearError(){lastError='';},win,evaluate,read,rewardSummary,page,action,submit,notices,memberForm,saveMember,deleteMember,localForm,sharedForm,saveVisit,deleteVisit,eventForm,saveEvent,deleteEvent,exportEvent,contactForm,saveContact,deleteContact});
})();

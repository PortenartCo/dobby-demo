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
  form.requestSubmit();if(lastError)throw Error(lastError);
 }
 const requireRecord=(rows,id)=>{if(id&&!rows.some(x=>x.id===id))throw Error('Cette fiche a été supprimée. Revenez au registre.');};
 function memberForm(id){requireRecord(read().members,id);page('health');action('v23Member',id?'edit':'new',id?{id}:{});}
 function saveMember(id,values){memberForm(id);submit('v23MemberForm',values);return read().state.v23HealthMemberId;}
 function deleteMember(id){requireRecord(read().members,id);page('health');action('v23Member','delete',{id});return !read().members.some(x=>x.id===id);}
 function localForm(id,personId){requireRecord(read().local,id);page('health');if(personId)evaluate('st.v23HealthMemberId=p.id;',{id:personId});action('extra',id?'healthedit':'healthnew',id?{id}:{});}
 function sharedForm(id){requireRecord(read().shared,id);page();action('fh',id?'edit':'new',id?{id}:{});}
 function saveVisit(scope,id,values){
  const before=read();if(scope==='shared'){sharedForm(id);submit('fhForm',values);}else{localForm(id,values.personId);submit('xHealthForm',values);}
  const after=read()[scope==='shared'?'shared':'local'];return id||after.find(x=>!before[scope==='shared'?'shared':'local'].some(old=>old.id===x.id))?.id;
 }
 function deleteVisit(scope,id){requireRecord(read()[scope==='shared'?'shared':'local'],id);page(scope==='shared'?'':'health');action(scope==='shared'?'fh':'extra',scope==='shared'?'delete':'healthdelete',{id});return !read()[scope==='shared'?'shared':'local'].some(x=>x.id===id);}
 function eventForm(id){requireRecord(read().events,id);page();action('fpAction',id?'edit':'new',id?{id}:{});return win().document.getElementById('fpEventForm');}
 function saveEvent(id,values){eventForm(id);submit('fpEventForm',values);}
 function deleteEvent(id){requireRecord(read().events,id);page();action('fpAction','delete',{id});}
 function exportEvent(id){page();action('fpAction','ics',{id});}
 function contactForm(id){requireRecord(read().contacts,id);page('contacts');action('extra',id?'contactedit':'contactnew',id?{id}:{});return win().document.getElementById('xContactForm');}
 function saveContact(id,values){contactForm(id);submit('xContactForm',values);}
 function deleteContact(id){requireRecord(read().contacts,id);page('contacts');action('extra','contactdelete',{id});}
 return Object.freeze({win,evaluate,read,page,action,submit,notices,memberForm,saveMember,deleteMember,localForm,sharedForm,saveVisit,deleteVisit,eventForm,saveEvent,deleteEvent,exportEvent,contactForm,saveContact,deleteContact});
})();

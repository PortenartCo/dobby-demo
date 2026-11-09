/* Mission 2A: visible compositions are the seven original Stitch documents. */
window.DobbyFamilyStitch=(()=>{
 'use strict';
 const E=window.DobbyFamilyStitchEngine,routes=['members','member-edit','agenda','medical-edit','health','health-person','health-history'];
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const ui={view:'salon',person:null,record:null,scope:'local',query:'',memberDraft:null,visitDraft:null,day:null},cache=new Map();
 let ready=false,busy=false,revision=0,pristine,rootMain,rootHeader,legacy,dialogDraft=null;
 const text=(el,value)=>{if(el)el.textContent=value??'';};
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const bind=(el,action,values={})=>{if(el){el.dataset.faAction=action;for(const[k,v]of Object.entries(values))el.dataset[k]=v;}return el;};
 const button=(action,label,values={})=>{const b=document.createElement('button');b.type='button';b.className='fa-button';b.textContent=label;return bind(b,action,values);};
 const paragraph=(value,className='fa-note')=>{const el=document.createElement('p');el.className=className;el.textContent=value;return el;};
 const context=(label)=>{const el=document.createElement('section');el.className='fa-context';if(label){const h=document.createElement('h2');h.className='font-headline-sm text-primary';h.textContent=label;el.append(h);}return el;};
 function notice(message){let el=$('#fa-notice');if(!el){el=document.createElement('div');el.id='fa-notice';el.setAttribute('role','status');document.body.append(el);}el.replaceChildren(paragraph(message),button('dismiss','Fermer'));el.hidden=false;}
 function unavailable(el,reason){if(!el)return;el.disabled=true;el.title=reason;el.setAttribute('aria-description',reason);el.dataset.faUnavailable=reason;if(el.matches('input,textarea')){el.required=false;el.value='';el.placeholder='Non disponible';}}
 const heading=part=>$$('main h1,main h2,main h3,main h4').find(x=>x.textContent.includes(part));
 const byText=(part,action,values={})=>{const b=$$('main button,main a,#fa-supplement button').find(x=>x.textContent.toLocaleLowerCase('fr').includes(part.toLocaleLowerCase('fr')));return bind(b,action,values);};
 const date=value=>value?new Date(value+'T12:00:00').toLocaleDateString('fr-BE'):'Date non renseignée';
 const current=data=>data.members.find(x=>x.id===ui.person)||null;
 const belongs=(record,member)=>Boolean(member&&(record.personId?record.personId===member.id:record.person===member.name));
 const nameFor=(record,data)=>data.members.find(x=>x.id===record.personId)?.name||record.person||'Foyer';
 function avatar(image,member){if(!image)return;const el=document.createElement('span');el.className=image.className+' fa-avatar';el.textContent=member?.avatar||'👤';el.setAttribute('aria-label',member?.name||'Personne non sélectionnée');image.replaceWith(el);}
 function clean(doc){
  const sample=/Thomas|Léa|Hugo|Chloé|Granger|Valombre|Flamel|Barnabé|Weasley|potions?|élixir|tisane|rhume|entorse|O\+|sanguin|sensible aux courants|données? chiffr|crypt|AES.?256|seul appareil|exclusivement|hermétique|souverain|jamais transmis|ne quittent|stockage local iPhone|garant|Dans 2 jours|hier|Collégien|Chef de foyer|Père|Mère|Fils aîné|Fille cadette|Apprenti de|14 Rue|végétal/i;
  for(const el of doc.querySelectorAll('main *')){
   if(el.matches('style,script'))continue;
   if(!el.children.length)el.dataset.stitchText=el.textContent.trim().replace(/\s+/g,' ');
   for(const node of [...el.childNodes])if(node.nodeType===3&&(sample.test(node.textContent)||(/\d/.test(node.textContent)&&!el.closest('button')&&!el.classList.contains('material-symbols-outlined'))))node.textContent='—';
  }
  for(const el of doc.querySelectorAll('input,textarea')){if(['checkbox','radio'].includes(el.type)){el.checked=false;el.removeAttribute('checked');}else{el.value='';el.setAttribute('value','');if(el.tagName==='TEXTAREA')el.textContent='';}if(sample.test(el.placeholder))el.placeholder='À renseigner';}
  for(const id of ['modal-event-flamel','archive-modal','toast-parchment'])doc.getElementById(id)?.remove();
 }
 async function template(view){if(!cache.has(view)){const url=new URL('./templates/family/'+view+'.html',location.href),response=await fetch(url);if(!response.ok)throw Error('Maquette Famille indisponible.');const doc=new DOMParser().parseFromString(await response.text(),'text/html');for(const img of doc.images)img.src=new URL(img.getAttribute('src'),url).href;clean(doc);cache.set(view,doc);}return cache.get(view);}
 function shell(data){
  for(const h of $$('body > header h1')){const span=document.createElement('span');span.className=h.className;span.append(...h.childNodes);h.replaceWith(span);}
  for(const b of $$('body > header button,body > header a')){const symbol=b.querySelector('.material-symbols-outlined')?.textContent.trim();if(/volume_/.test(symbol||''))b.remove();else bind(b,/arrow_back|chevron_left|close/.test(symbol||'')?'back':symbol==='person'?'account':'menu');}
  for(const icon of $$('body > header .material-symbols-outlined'))if(icon.textContent.trim()==='person'){const b=icon.closest('button')||icon.parentElement;bind(b,'account');b.setAttribute('role','button');b.tabIndex=0;}
  const nav=$('body > nav');if(nav)nav.hidden=ui.view!=='salon';
  if(!$('main h1')){const h=$('main h2');if(h){const h1=document.createElement('h1');h1.className=h.className;h1.append(...h.childNodes);h.replaceWith(h1);}else{$('main').prepend(Object.assign(document.createElement('h1'),{textContent:({'member-edit':'Fiche du membre','medical-edit':'Consultation & soins'})[ui.view]||'Famille',className:'fa-title'}));}}
  if(ui.view!=='salon'){$('main').append(paragraph('Membres et agenda : '+data.status));if(ui.view.startsWith('health')||ui.view==='medical-edit')$('main').append(paragraph('Fiches individuelles : locales sur cet appareil. Les rendez-vous partagés sont un registre distinct, créé volontairement.'));}
  for(const b of $$('main button,#fa-supplement button'))if(!b.dataset.faAction&&!b.dataset.faUnavailable&&b.type!=='submit')unavailable(b,'Cette fonction de la maquette n’existe pas dans le moteur actuel.');
 }
 function renderSalon(data){
  const members=heading('L’Horloge Enchantée')?.closest('section');if(members){bind(members.querySelector('button'),'members');const cards=[...members.querySelectorAll('div.p-3.rounded-2xl')];cards.forEach((card,i)=>bind(card.querySelector('button'),'health-person',{person:data.members[i]?.id||''}));}
  const agenda=heading('La Gazette & Agenda Rituel')?.closest('section');if(agenda){const controls=agenda.querySelectorAll('button');controls.forEach((b,i)=>bind(b,i?'agenda':'event-new'));}
  const links=heading('Archives & Accès Rapides')?.closest('section');if(links)links.append(button('health','Carnets de santé'),button('agenda','Agenda du foyer'));
 }
 function renderMembers(data){
  const list=$('#members-list'),sample=list.querySelector('.member-card').cloneNode(true),query=ui.query.toLocaleLowerCase('fr');
  list.replaceChildren(...data.members.filter(m=>!query||m.name.toLocaleLowerCase('fr').includes(query)).map(member=>{
   const card=sample.cloneNode(true);card.dataset.faMember=member.id;card.removeAttribute('data-name');card.removeAttribute('data-category');
   text(card.querySelector('h3'),member.name);avatar(card.querySelector('img'),member);
   const details=card.querySelector('h3').parentElement.parentElement;const lines=details.querySelectorAll('p');text(lines[0],'Membre du foyer');text(lines[1],member.birthdate?'Naissance : '+date(member.birthdate):'Date de naissance non renseignée');text(details.querySelector('.rounded-full'),'Membre');
   const badges=card.querySelector(':scope > .flex.flex-wrap');if(badges){const local=data.local.filter(r=>belongs(r,member));badges.replaceChildren(paragraph(local.length+' fiche(s) médicale(s) locale(s)'));}
   for(const b of card.querySelectorAll('button')){text(b,'Consulter la fiche');bind(b,'health-person',{person:member.id});}
   return card;
  }));if(!list.children.length)list.append(paragraph(data.members.length?'Aucun membre pour cette recherche.':'Aucun membre enregistré.'));
  $('#empty-state-card')?.remove();$('#toggle-sim-empty')?.remove();
  const field=$('#search-input');field.value=ui.query;bind($('#clear-search-btn'),'search-clear');bind($('#reset-filters-btn'),'search-clear');bind($('#add-member-btn'),'member-new');
  for(const b of $$('main [data-filter]')){if(b.dataset.filter==='all'){text(b,`Tous (${data.members.length})`);bind(b,'search-clear');}else unavailable(b,'Les rôles parent, enfant ou gardien ne sont pas enregistrés par le moteur.');}
  byText('Coffre des Documents','documents');byText('Calendrier des Anniversaires','agenda');byText("Contacts d'urgence",'health-history');
 }
 function renderMemberEdit(data){
  const member=ui.memberNew?null:current(data),draft=ui.memberDraft||member||{name:'',birthdate:'',avatar:'👤'};
  $('#member-firstname').value=draft.name;$('#member-firstname').maxLength=80;$('#member-firstname').placeholder='Prénom / nom du membre';
  const label=$('label[for="member-firstname"]');if(label)text(label,'Prénom / nom *');
  $('#member-birthdate').value=draft.birthdate||'';
  unavailable($('#member-lastname'),'Le moteur conserve un seul champ prénom / nom.');unavailable($('#member-notes'),'Les notes sur un membre ne sont pas enregistrées dans le moteur.');
  for(const input of $$('main input[name="role"]'))unavailable(input,'Le rôle familial n’est pas enregistré dans le moteur.');
  for(const img of $$('main img'))avatar(img,draft);
  const icons=context('Icône du membre');const select=document.createElement('select');select.id='fa-member-avatar';select.setAttribute('aria-label','Icône du membre');for(const icon of ['👤','👩','👨','👧','👦','🧒'])select.add(new Option(icon,icon));select.value=draft.avatar||'👤';icons.append(select,paragraph('Photos, rôles et notes : non disponibles dans le moteur. Le prénom / nom, la date de naissance et l’icône sont enregistrés.'));$('#member-form').prepend(icons);
  bind($('#tab-create'),'member-new');bind($('#tab-edit'),'members');
  for(const b of $$('button[form="member-form"],#member-form button[type="submit"],#fa-supplement button'))if(/Enregistrer|Confirmer|Consigner|Sauver/.test(b.textContent))bind(b,'member-save');
  if(!$('[data-fa-action="member-save"]'))$('#member-form').append(button('member-save','Enregistrer le membre'));
  $('#member-form').append(button('members','Annuler'),...(member?[button('member-delete','Supprimer le membre',{person:member.id})]:[]));
 }
 function sourceCard(section){return section?.querySelector('article,.rounded-xl,.rounded-lg')?.cloneNode(true)||Object.assign(document.createElement('article'),{className:'fa-context'});}
 function recordCard(sample,record,data,scope='local'){
  const card=sample.cloneNode(true);card.dataset.stitchComponent='medical-card';card.dataset.faRecord=record.id;
  for(const el of [...card.querySelectorAll('*')]){if(el.matches('style,script')){el.remove();continue;}for(const node of [...el.childNodes])if(node.nodeType===3&&!el.classList.contains('material-symbols-outlined'))node.textContent='';el.removeAttribute('id');}
  const h=card.querySelector('h3,h4,strong')||card.appendChild(document.createElement('h3'));text(h,record.title||record.name);
  const ps=card.querySelectorAll('p');text(ps[0],[date(record.date),record.time,nameFor(record,data),record.provider].filter(Boolean).join(' · '));text(ps[1],record.note||'');
  if(!ps.length)h.after(paragraph([date(record.date),record.time,nameFor(record,data),record.provider].filter(Boolean).join(' · ')));
  const buttons=card.querySelectorAll('button');buttons.forEach(b=>{text(b,'Consulter / modifier');bind(b,'medical-edit',{record:record.id,scope,person:record.personId||''});});
  if(!buttons.length)card.append(button('medical-edit','Consulter / modifier',{record:record.id,scope,person:record.personId||''}));
  card.append(paragraph(scope==='shared'?'Rendez-vous volontairement partagé avec le foyer':'Fiche individuelle locale'));
  return card;
 }
 function sectionRows(section,rows,data,scope='local',sampleOverride){
  if(!section)return;const sample=sampleOverride||sourceCard(section),title=section.querySelector('h2,h3');const header=title?.closest('div.flex.items-center.justify-between')||title;
  section.replaceChildren(...(header?[header]:[]),...(rows.length?rows.map(r=>recordCard(sample,r,data,scope)):[paragraph('Aucune fiche enregistrée dans ce registre.')]));
 }
 function memberChooser(data,parent){const group=context('Personne du foyer');for(const member of data.members)group.append(button('health-person',member.name,{person:member.id}));group.append(button('member-new','Ajouter un membre'));parent.append(group);}
 function healthSections(data){
  const member=current(data);const local=data.local.filter(r=>belongs(r,member)),today=E.evaluate('return todayISO();'),future=local.filter(r=>!r.date||r.date>=today),past=local.filter(r=>r.date&&r.date<today).sort((a,b)=>b.date.localeCompare(a.date));
  const identity=heading('Granger')?.closest('section')||$('main h2')?.closest('section');
  for(const img of $$('main img'))if(!/Dobby/i.test(img.alt))avatar(img,member);
  // Identity blocks keep their original frame, with only the native member data.
  const sourcePatient=$$('main h2,main h3').find(h=>h.dataset.stitchText&&/Hugo|Granger/.test(h.dataset.stitchText));
  if(sourcePatient){text(sourcePatient,member?.name||'Sélectionnez un membre');const owner=sourcePatient.closest('section');if(owner){for(const p of owner.querySelectorAll('p'))text(p,'Fiche individuelle locale');for(const b of owner.querySelectorAll('button')){if(/Modifier/.test(b.textContent))bind(b,'member-edit');else if(/Archiver/.test(b.textContent))unavailable(b,'L’archivage d’un carnet n’existe pas dans le moteur.');else bind(b,'medical-new');}}}
  const appointments=heading(ui.view==='health-person'?'Consultations à venir':'Rendez-vous du Membre')?.closest('section');sectionRows(appointments,future,data);appointments?.append(button('medical-new','Ajouter un rendez-vous local'));
  const history=heading(ui.view==='health-person'?'Chronologie des Soins':'Fil Chronologique')?.closest('section');sectionRows(history,past,data);
  const documents=heading(ui.view==='health-person'?'Parchemins & Ordonnances':'Parchemins & Certificats')?.closest('section');
  if(documents){const h=documents.querySelector('h2,h3');documents.replaceChildren(...(h?[h]:[]));for(const r of local.filter(x=>x.reference))documents.append(paragraph(r.reference+' · '+r.name));documents.append(paragraph('Références textuelles des fiches locales. Pièces jointes, ordonnances et registre vaccinal structuré non disponibles ici.'));}
  const overview=heading('Aperçu des Cycles')?.closest('section');if(overview){const h=overview.querySelector('h2,h3'),sample=sourceCard(overview);overview.replaceChildren(...(h?[h]:[]));if(future[0])overview.append(recordCard(sample,future[0],data));else overview.append(paragraph('Aucun rendez-vous à venir enregistré.'));}
  const antecedents=heading("Registre d'antécédents")?.closest('section');if(antecedents){const h=antecedents.querySelector('h2,h3');antecedents.replaceChildren(...(h?[h]:[]),paragraph('Le moteur ne contient pas de registre structuré d’antécédents. Cette absence ne signifie pas qu’aucun antécédent médical n’existe.'));}
  const contacts=heading(ui.view==='health-person'?'Praticiens Référents':'Soignants & Officines')?.closest('section');renderContacts(contacts,data);
  for(const b of $$('main button')){
   if(b.dataset.faAction||b.dataset.faUnavailable)continue;
   if(/Changer/.test(b.textContent))bind(b,'members');else if(/rendez-vous|consultation|nouveau soin/i.test(b.textContent))bind(b,'medical-new');else if(/registre des membres/.test(b.textContent))bind(b,'members');else if(/Annuaire|Soignants/.test(b.textContent))bind(b,'health-history');else if(/Archiver/.test(b.textContent))unavailable(b,'L’archivage du carnet n’existe pas dans le moteur.');
  }
  // Original person chips are replaced, never supplemented with a second identity list.
  const residents=$$('main section').find(s=>/Maisonnée & Familiers/.test(s.textContent));if(residents){residents.replaceChildren();memberChooser(data,residents);}else memberChooser(data,$('main'));
  const tools=context(member?member.name:'Aucun membre sélectionné');tools.append(button('member-edit','Modifier le membre'),button('health-history','Historique & contacts médicaux'),button('health','Carnet familial'),button('members','Registre des membres'));if(member)tools.append(button('member-delete','Supprimer le membre',{person:member.id}));$('main').append(tools);
  if(ui.view==='health'){
   const shared=context('Rendez-vous médicaux partagés volontairement');shared.append(paragraph(data.status));const sample=sourceCard(appointments);for(const visit of data.shared)shared.append(recordCard(sample,visit,data,'shared'));if(!data.shared.length)shared.append(paragraph('Aucun rendez-vous médical partagé.'));const add=button('medical-new-shared','Créer volontairement un rendez-vous partagé');if(!data.active)unavailable(add,'Activez le module Famille dans Gérer le foyer pour ce registre partagé.');shared.append(add,button('account','Gérer le foyer'));$('main').append(shared);
  }
 }
 function renderContacts(section,data){
  if(!section)return;const title=section.querySelector('h2,h3'),sample=sourceCard(section);section.replaceChildren(...(title?[title]:[]),paragraph('Répertoire médical du foyer : aucune association individuelle des contacts n’est stockée par le moteur.'));
  const contacts=data.contacts.filter(r=>/médecin|pédiatre|dentiste|kiné|infirm|docteur/i.test(r.role||''));
  for(const contact of contacts){const card=sample.cloneNode(true);card.replaceChildren(Object.assign(document.createElement('h3'),{textContent:contact.name,className:'font-headline-sm text-primary'}),paragraph(contact.role),paragraph([contact.phone,contact.email,contact.note].filter(Boolean).join(' · ')),button('contact-edit','Modifier le contact',{record:contact.id}),button('contact-delete','Supprimer le contact',{record:contact.id}));if(contact.phone){const a=document.createElement('a');a.textContent='Appeler';a.href='tel:'+encodeURIComponent(contact.phone.replace(/[^+\d]/g,''));a.className='fa-button';card.append(a);}section.append(card);}
  if(!contacts.length)section.append(paragraph('Aucun contact médical enregistré dans le répertoire.'));section.append(button('contact-new','Ajouter un contact médical'));
 }
 async function render(view=ui.view){
  const rev=++revision,data=E.read();ui.view=view;
  let doc;if(view==='salon'){doc=null;}else doc=await template(view);if(rev!==revision)return;
  $('#fa-source-style')?.remove();$('#fa-supplement')?.remove();$('#fa-dialog')?.remove();
  let main,header;if(!doc){main=rootMain.cloneNode(true);header=rootHeader.cloneNode(true);}else{pristine=doc;main=document.importNode(doc.querySelector('main'),true);header=doc.querySelector('body > header')?.cloneNode(true);const style=document.createElement('style');style.id='fa-source-style';style.textContent=[...doc.querySelectorAll('head style')].map(x=>x.textContent).join('\n');document.head.append(style);const supplement=document.createElement('div');supplement.id='fa-supplement';for(const node of doc.body.children)if(!node.matches('main,header,nav,script'))supplement.append(document.importNode(node,true));document.body.append(supplement);}
  $('main').replaceWith(main);if(header)$('body > header')?.replaceWith(header);document.body.dataset.familyView=view;document.body.dataset.stitchSource=doc?.body.dataset.stitchSource||'dobby_le_salon_des_curiosit_s_famille_organisation';main.classList.add('fa-enter');
  if(view==='salon'){window.DobbyStitchRootAdapters.render('famille',data.state);renderSalon(data);}else if(view==='members')renderMembers(data);else if(view==='member-edit')renderMemberEdit(data);else if(view==='agenda')renderAgenda(data);else if(view==='medical-edit')renderMedical(data);else healthSections(data);
  shell(data);main.style.visibility='visible';document.documentElement.classList.remove('dv7-loading');if(dialogDraft)showDialog(dialogDraft.kind,dialogDraft.id,dialogDraft.values);
 }
 async function open(view,values={},history=true){
  if(!routes.includes(view)&&view!=='salon')return false;busy=true;
  try{if(values.person!==undefined&&values.person!==ui.person){ui.person=values.person||null;ui.memberDraft=null;ui.visitDraft=null;}
   if(values.record!==undefined)ui.record=values.record||null;if(values.scope)ui.scope=values.scope;
   const data=E.read();if(!ui.person&&data.members.length&&!(view==='member-edit'&&ui.memberNew))ui.person=data.members[0].id;
   if(['member-edit','health-person'].includes(view)&&ui.person&&!data.members.some(x=>x.id===ui.person)){ui.person=null;view='members';notice('Cette personne n’est plus dans le registre.');}
   dialogDraft=null;if(history)window.history.pushState({},'','#'+view+(ui.person?'?person='+encodeURIComponent(ui.person):'')+(ui.record&&view==='medical-edit'?(ui.person?'&':'?')+'record='+encodeURIComponent(ui.record)+'&scope='+ui.scope:''));await render(view);window.scrollTo(0,0);return true;
  }finally{busy=false;}
 }
 function memberDraft(){return{name:$('#member-firstname').value,birthdate:$('#member-birthdate').value,avatar:$('#fa-member-avatar').value};}
 async function act(action,el){
  if(action==='dismiss'){$('#fa-notice').hidden=true;return;}
  if(routes.includes(action)||action==='salon'){if(action==='member-edit'){ui.memberNew=false;ui.memberDraft=null;}return open(action,el.dataset);}
  if(action==='member-new'){ui.memberNew=true;ui.person=null;ui.memberDraft={name:'',birthdate:'',avatar:'👤'};await open('member-edit');return;}
  if(action==='member-save'){const draft=memberDraft();if(!$('#member-form').reportValidity())return;const id=E.saveMember(ui.memberNew?null:ui.person,draft);ui.memberDraft=null;ui.memberNew=false;return open('health-person',{person:id});}
  if(action==='member-delete'){if(E.deleteMember(el.dataset.person||ui.person)){ui.person=null;ui.memberDraft=null;return open('members');}return;}
  if(action==='search-clear'){ui.query='';return render();}
  if(action==='back'){if(ui.view==='salon')return legacy('home');return open(ui.view==='member-edit'?'members':ui.view==='medical-edit'?'health-person':'salon');}
  if(['account','menu','documents','home'].includes(action))return legacy(action);
  return extraAction(action,el);
 }
 async function refresh(){if(!ready||busy||document.activeElement?.matches('input,textarea,select'))return;busy=true;try{await render();}finally{busy=false;}}
 async function init(openLegacy){
  if(ready)return;legacy=openLegacy;rootMain=$('main').cloneNode(true);rootHeader=$('body > header').cloneNode(true);document.body.classList.add('fa-active');E.notices(notice);
  const parse=()=>{const[v,q]=location.hash.slice(1).split('?'),p=new URLSearchParams(q||'');return{view:routes.includes(v)?v:'salon',person:p.get('person')||undefined,record:p.get('record')||undefined,scope:p.get('scope')||undefined};};
  document.addEventListener('click',event=>{if(event.target.closest('#dv7-panel'))return;const el=event.target.closest('[data-fa-action]');if(!el)return;event.preventDefault();event.stopImmediatePropagation();busy=true;Promise.resolve(act(el.dataset.faAction,el)).catch(e=>notice(e.message)).finally(()=>busy=false);},true);
  document.addEventListener('keydown',event=>{const el=event.target.closest('[data-fa-action][role="button"]');if(el&&['Enter',' '].includes(event.key)){event.preventDefault();el.click();}});
  document.addEventListener('input',event=>{if(event.target.id==='search-input'){ui.query=event.target.value;renderMembers(E.read());$('#search-input').focus();}});
  document.addEventListener('submit',event=>{if(!['member-form','fa-medical-form','fa-native-form'].includes(event.target.id))return;event.preventDefault();event.stopImmediatePropagation();busy=true;Promise.resolve(event.target.id==='member-form'?act('member-save',event.target):saveForm(event.target)).catch(e=>notice(e.message)).finally(()=>busy=false);},true);
  window.addEventListener('popstate',()=>{const state=parse();open(state.view,state,false).catch(e=>notice(e.message));});
  const state=parse();await open(state.view,state,false);ready=true;
  new MutationObserver(()=>{if(ready&&!busy)refresh().catch(e=>notice(e.message));}).observe(E.win().document.getElementById('screen'),{childList:true});
 }
 // Agenda and medical adapters below reuse the same source shell and native forms.
 function renderAgenda(){}
 function renderMedical(){}
 function showDialog(){}
 function saveForm(){}
 function extraAction(){}
 return Object.freeze({init,open,refresh,get ready(){return ready},get view(){return ui.view},handles:route=>['members','agenda','health','member-edit','medical-edit','health-person','health-history'].includes(route)});
})();

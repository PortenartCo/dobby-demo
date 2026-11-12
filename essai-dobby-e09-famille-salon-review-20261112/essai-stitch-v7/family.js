/* Mission 2A: visible compositions are the seven original Stitch documents. */
window.DobbyFamilyStitch=(()=>{
 'use strict';
 const E=window.DobbyFamilyStitchEngine,routes=['members','member-edit','agenda','medical-edit','health','health-person','health-history'];
 const handles=view=>routes.includes(view)||window.DobbyRegister?.handles(view)||window.DobbyOnboarding?.handles(view);
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const ui={view:'salon',person:null,record:null,scope:'local',query:'',memberDraft:null,visitDraft:null,day:null},cache=new Map();
 let ready=false,busy=false,revision=0,pristine,rootMain,rootHeader,legacy,dialogDraft=null,formContext=null;
 const text=(el,value)=>{if(el)el.textContent=value??'';};
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const bind=(el,action,values={})=>{if(el){el.dataset.faAction=action;for(const[k,v]of Object.entries(values))el.dataset[k]=v;}return el;};
 const button=(action,label,values={})=>{const b=document.createElement('button');b.type='button';b.className='fa-button';b.textContent=label;return bind(b,action,values);};
 const paragraph=(value,className='fa-note')=>{const el=document.createElement('p');el.className=className;el.textContent=value;return el;};
 const context=(label)=>{const el=document.createElement('section');el.className='fa-context';if(label){const h=document.createElement('h2');h.className='font-headline-sm text-primary';h.textContent=label;el.append(h);}return el;};
 function selected(el,value){if(!el)return;el.dataset.faSelected=String(value);el.setAttribute('aria-pressed',String(value));if(el.getAttribute('role')==='tab')el.setAttribute('aria-selected',String(value));}
 function disclose(kind,message){for(const el of $$('[data-fa-disclosure="'+kind+'"]')){const glyph=el.querySelector('.material-symbols-outlined')?.cloneNode(true);el.replaceChildren(...(glyph?[glyph]:[]),document.createTextNode(' '+message));}}
 const availability=data=>JSON.stringify({active:data.active,members:data.members.map(m=>[m.id,m.name])});
 function notice(message){let el=$('#fa-notice');if(!el){el=document.createElement('div');el.id='fa-notice';el.setAttribute('role','status');document.body.append(el);}el.replaceChildren(paragraph(message),button('dismiss','Fermer'));el.hidden=false;}
 function unavailable(el,reason){if(!el)return;el.disabled=true;el.title=reason;el.setAttribute('aria-description',reason);el.dataset.faUnavailable=reason;if(el.matches('input,textarea')){el.required=false;el.value='';el.placeholder='Non disponible';}}
 const heading=part=>$$('main h1,main h2,main h3,main h4').find(x=>x.textContent.includes(part));
 const byText=(part,action,values={})=>{const b=$$('main button,main a,#fa-supplement button').find(x=>x.textContent.toLocaleLowerCase('fr').includes(part.toLocaleLowerCase('fr')));return bind(b,action,values);};
 const date=value=>value?new Date(value+'T12:00:00').toLocaleDateString('fr-BE'):'Date non renseignée';
 const current=data=>data.members.find(x=>x.id===ui.person)||null;
 const belongs=(record,member,members)=>Boolean(member&&(record.personId?record.personId===member.id:record.person===member.name&&members.filter(m=>m.name===record.person).length===1));
 const nameFor=(record,data)=>data.members.find(x=>x.id===record.personId)?.name||record.person||'Foyer';
 function avatar(image,member){if(!image)return;const frame=image.parentElement;for(const decoration of frame.parentElement.querySelectorAll(':scope > span.absolute'))if(decoration.querySelector('.material-symbols-outlined'))decoration.remove();const el=window.DobbyMemberAvatar.create(member,{className:image.className+' fa-avatar'});frame.classList.remove('overflow-hidden');image.replaceWith(el);}
 function clean(doc){
  const sample=/Thomas|Léa|Hugo|Chloé|Granger|Valombre|Flamel|Barnabé|Weasley|potions?|élixir|tisane|rhume|entorse|O\+|sanguin|sensible aux courants|chiffr|protection locale|sur iPhone|aucune transmission|strictement restreints|aucun parchemin|crypt|AES.?256|seul appareil|exclusivement|hermétique|souverain|jamais transmis|ne quittent|stockage local iPhone|garant|Dans 2 jours|hier|Collégien|Chef de foyer|Père|Mère|Fils aîné|Fille cadette|Apprenti de|14 Rue|végétal/i;
  for(const el of doc.querySelectorAll('main *')){
   if(el.matches('style,script'))continue;
   const ownText=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').replace(/\s+/g,' ');if(/dates consignées restent locales/i.test(ownText))el.dataset.faDisclosure='agenda';if(/Visible uniquement par le foyer/i.test(ownText))el.dataset.faDisclosure='notes';
   if(!el.children.length)el.dataset.stitchText=el.textContent.trim().replace(/\s+/g,' ');
   if(!el.children.length&&/Données purement fictives/.test(el.textContent))el.textContent='Ce carnet aide à organiser les informations saisies du foyer. Il ne remplace pas un avis médical. Le périmètre local ou partagé est indiqué dans ce formulaire.';
   for(const node of [...el.childNodes])if(node.nodeType===3&&(sample.test(node.textContent)||(/\d/.test(node.textContent)&&!el.closest('button')&&!el.classList.contains('material-symbols-outlined'))))node.textContent='—';
  }
  for(const el of doc.querySelectorAll('[aria-label],[title],[alt],[data-alt]'))for(const attr of ['aria-label','title','alt','data-alt'])if(sample.test(el.getAttribute(attr)||''))el.setAttribute(attr,attr==='alt'?'Illustration de référence Stitch':'Registre DOBBY');
  for(const el of doc.querySelectorAll('input,textarea')){if(['checkbox','radio'].includes(el.type)){el.checked=false;el.removeAttribute('checked');}else{el.value='';el.setAttribute('value','');if(el.tagName==='TEXTAREA')el.textContent='';}if(sample.test(el.placeholder))el.placeholder='À renseigner';}
  for(const id of ['modal-event-flamel','archive-modal','toast-parchment'])doc.getElementById(id)?.remove();
 }
 async function template(view){if(!cache.has(view)){const url=new URL(window.DobbyOnboarding?.template(view)||window.DobbyRegister?.template(view)||'./templates/family/'+view+'.html',location.href),response=await fetch(url);if(!response.ok)throw Error('Maquette Famille indisponible.');const doc=new DOMParser().parseFromString(await response.text(),'text/html');doc._eventFrame=doc.getElementById('modal-event-flamel')?.cloneNode(true);for(const img of doc.images)if(img.getAttribute('src'))img.src=new URL(img.getAttribute('src'),url).href;if(window.DobbyOnboarding?.handles(view))for(const node of doc.querySelectorAll('[style]'))node.style.backgroundImage=node.style.backgroundImage.replace(/url\(["']?([^"')]+)["']?\)/g,(all,relative)=>'url("'+new URL(relative,url).href+'")');if(!window.DobbyOnboarding?.handles(view))clean(doc);if(window.DobbyRegister?.handles(view))window.DobbyRegister.clean(doc);cache.set(view,doc);}return cache.get(view);}
 function shell(data){
  for(const h of $$('body > header h1')){const span=document.createElement('span');span.className=h.className;span.append(...h.childNodes);h.replaceWith(span);}
  for(const b of $$('body > header button,body > header a')){if(b.dataset.faAction||b.dataset.faUnavailable)continue;const symbol=b.querySelector('.material-symbols-outlined')?.textContent.trim();if(/volume_/.test(symbol||''))b.remove();else bind(b,/arrow_back|chevron_left|close/.test(symbol||'')?'back':symbol==='person'?'account':'menu');}
  for(const icon of $$('body > header .material-symbols-outlined'))if(icon.textContent.trim()==='person'){const b=icon.closest('button')||icon.parentElement;bind(b,'account');b.setAttribute('role','button');b.tabIndex=0;}
  const nav=$('body > nav');if(nav)nav.hidden=ui.view!=='salon';
  if(!$('main h1')){const h=$('main h2');if(h){const h1=document.createElement('h1');h1.className=h.className;h1.append(...h.childNodes);h.replaceWith(h1);}else{$('main').prepend(Object.assign(document.createElement('h1'),{textContent:({'member-edit':'Fiche du membre','medical-edit':'Consultation & soins'})[ui.view]||'Famille',className:'fa-title'}));}}
  const visibleMain=$('body > main'),headerHeight=$('body > header')?.getBoundingClientRect().height||0;if(visibleMain&&parseFloat(getComputedStyle(visibleMain).paddingTop)<headerHeight)visibleMain.style.paddingTop=headerHeight+'px';
  if(!['salon','contracts'].includes(ui.view)){$('main').append(paragraph('Membres et agenda : '+data.status,'fa-note fa-sharing-status'));if(ui.view.startsWith('health')||ui.view==='medical-edit')$('main').append(paragraph('Fiches individuelles : locales sur cet appareil. Les rendez-vous partagés sont un registre distinct, créé volontairement.'));}
  for(const b of $$('main button,#fa-supplement button'))if(!b.dataset.faAction&&!b.dataset.faUnavailable&&!b.dataset.magicControl)unavailable(b,'Cette fonction de la maquette n’existe pas dans le moteur actuel.');
 }
 function renderSalon(data){
  const intro=$('main section'),hero=intro?.querySelector('img')?.parentElement;
  if(hero){
   hero.dataset.e09Hero='';const badge=[...hero.querySelectorAll('div')].find(el=>el.textContent.trim().includes('Cabinet des Curiosités'));
   if(badge){badge.dataset.e09Badge='';badge.classList.remove('top-3','left-3');badge.classList.add('bottom-3','right-3');}
   [...hero.querySelectorAll('div')].find(el=>el.textContent.includes('Cheminée allumée'))?.remove();
   const welcome=document.createElement('div');welcome.dataset.e09Intro='';
   const eyebrow=paragraph('FAMILLE & SYNCHRONISATION','e09-eyebrow'),title=document.createElement('h1');title.textContent='Le Salon des Curiosités';
   welcome.append(eyebrow,title,paragraph('Organisation familiale, rituels et événements du foyer.','e09-description'));intro.replaceChildren(hero,welcome);
  }
  function empty(title,description){const card=document.createElement('div');card.className='e01-empty';const strong=document.createElement('strong');strong.textContent=title;card.append(strong,paragraph(description));return card;}
  function section(old,title,subtitle,action,label){
   const section=heading(old)?.closest('section');if(!section)return null;
   section.dataset.e09Section=action;const header=document.createElement('div');header.className='e09-section-heading';
   const copy=document.createElement('div'),h=document.createElement('h2');h.className="font-['Playfair_Display'] text-[16px] font-bold text-[#fcf7ee]";h.textContent=title;
   copy.append(h,paragraph(subtitle,'e09-subtitle'));header.append(copy,button(action,label));section.replaceChildren(header);return section;
  }
  const members=section('L’Horloge Enchantée','L’Horloge Enchantée','Les membres de notre foyer','members','Gérer les membres');
  if(members){if(data.members.length)for(const member of data.members){const card=context();card.className='e09-record';card.append(window.DobbyMemberAvatar.create(member,{className:'fa-avatar'}),paragraph(member.name),button('health-person','Consulter',{person:member.id}));members.append(card);}else members.append(empty('Aucun membre du foyer enregistré','Ajoutez les membres de votre foyer pour retrouver leurs fiches ici.'));}
  const agenda=section('La Gazette & Agenda Rituel','L’Agenda Enchanté','Rendez-vous et événements familiaux','event-new','Ajouter un événement');
  if(agenda){const rows=data.upcoming;if(rows.length)for(const row of rows.slice(0,5)){const card=context();card.className='e09-record';card.append(paragraph(row.title||row.name||'Rendez-vous'),paragraph([date(row.date),row.time].filter(Boolean).join(' · ')),button('agenda','Consulter l’agenda'));agenda.append(card);}else agenda.append(empty('Aucun événement partagé à venir','Les rendez-vous et événements à venir apparaîtront ici.'));}
  const notes=section('La Volière aux Messages','La Volière aux Messages','Notes et pense-bêtes du foyer','rg-memo-new','Ajouter un mémo');
  if(notes){const rows=data.state.sharedFamilyNotes||[];if(rows.length)for(const row of rows.slice(0,3)){const card=context();card.className='e09-record';const title=document.createElement('strong');title.textContent=row.title;card.append(title,paragraph(row.body),button('rg-memo-edit','Ouvrir / modifier',{record:row.id}));notes.append(card);}else notes.append(empty('Aucun mémo familial enregistré','Ajoutez une note ou un pense-bête destiné au foyer.'));
   notes.append(paragraph('Mémos du module Famille · '+data.status,'e09-subtitle'));if((data.state.familyNotes||[]).length||rows.length>3)notes.append(button('memos','Tous les mémos et anciens mémos locaux'));
  }
  heading('Archives & Accès Rapides')?.closest('section')?.remove();
 }
 function renderMembers(data){
  const list=$('#members-list'),sample=pristine.querySelector('#members-list .member-card').cloneNode(true),query=ui.query.toLocaleLowerCase('fr');
  list.replaceChildren(...data.members.filter(m=>!query||m.name.toLocaleLowerCase('fr').includes(query)).map(member=>{
   const card=sample.cloneNode(true);card.dataset.faMember=member.id;card.removeAttribute('data-name');card.removeAttribute('data-category');
   text(card.querySelector('h3'),member.name);avatar(card.querySelector('img'),member);
   const details=card.querySelector('h3').parentElement.parentElement;const lines=details.querySelectorAll('p');text(lines[0],'Membre du foyer');text(lines[1],member.birthdate?'Naissance : '+date(member.birthdate):'Date de naissance non renseignée');text(details.querySelector('.rounded-full'),'Membre');
   const badges=card.querySelector(':scope > .flex.flex-wrap');if(badges){const local=data.local.filter(r=>belongs(r,member,data.members));badges.replaceChildren(paragraph(local.length+' fiche(s) médicale(s) locale(s)'));}
   for(const b of card.querySelectorAll('button')){text(b,'Consulter la fiche');bind(b,'health-person',{person:member.id});}card.append(button('personal','Grimoire personnel',{person:member.id}));
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
  for(const img of $$('main img'))avatar(img,{...member,...draft});
  const icons=context('Icône du membre');const select=document.createElement('select');select.id='fa-member-avatar';select.setAttribute('aria-label','Icône du membre');for(const icon of ['👤','👩','👨','👧','👦','🧒'])select.add(new Option(icon,icon));select.value=draft.avatar||'👤';icons.append(select,paragraph('Photos, rôles et notes : non disponibles dans le moteur. Le prénom / nom, la date de naissance et l’icône sont enregistrés.'));$('#member-form').prepend(icons);
  bind($('#tab-create'),'member-new');bind($('#tab-edit'),'members');selected($('#tab-create'),Boolean(ui.memberNew));selected($('#tab-edit'),!ui.memberNew);
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
  if(record.note&&!ps[1])card.append(paragraph(record.note));
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
  const member=current(data);const local=data.local.filter(r=>belongs(r,member,data.members)),today=E.evaluate('return todayISO();'),future=local.filter(r=>!r.date||r.date>=today),past=local.filter(r=>r.date&&r.date<today).sort((a,b)=>b.date.localeCompare(a.date));
  const identity=heading('Granger')?.closest('section')||$('main h2')?.closest('section');
  for(const img of $$('main img'))if(!/Dobby/i.test(img.alt))avatar(img,member);
  // Identity blocks keep their original frame, with only the native member data.
  const sourcePatient=$$('main h2,main h3').find(h=>h.dataset.stitchText&&/Hugo|Granger/.test(h.dataset.stitchText));
  if(sourcePatient){text(sourcePatient,member?.name||'Sélectionnez un membre');const owner=sourcePatient.closest('section');if(owner){for(const p of owner.querySelectorAll('p'))text(p,'Fiche individuelle locale');for(const b of owner.querySelectorAll('button')){if(/Modifier/.test(b.textContent))bind(b,'member-edit');else if(/Archiver/.test(b.textContent))unavailable(b,'L’archivage d’un carnet n’existe pas dans le moteur.');else bind(b,'medical-new');}}}
  const appointments=heading(ui.view==='health-person'?'Consultations à venir':'Rendez-vous du Membre')?.closest('section');sectionRows(appointments,ui.appointmentMode==='past'?past:future,data);appointments?.append(button('medical-new','Ajouter un rendez-vous local'));
  const history=heading(ui.view==='health-person'?'Chronologie des Soins':'Fil Chronologique')?.closest('section');sectionRows(history,past,data);
  const documents=heading(ui.view==='health-person'?'Parchemins & Ordonnances':'Parchemins & Certificats')?.closest('section');
  if(documents){const h=documents.querySelector('h2,h3');documents.replaceChildren(...(h?[h]:[]));for(const r of local.filter(x=>x.reference))documents.append(paragraph(r.reference+' · '+r.name));documents.append(paragraph('Références textuelles des fiches locales. Pièces jointes, ordonnances et registre vaccinal structuré non disponibles ici.'));}
  const overview=heading('Aperçu des Cycles')?.closest('section');if(overview){const h=overview.querySelector('h2,h3'),sample=sourceCard(overview);overview.replaceChildren(...(h?[h]:[]));if(future[0])overview.append(recordCard(sample,future[0],data));else overview.append(paragraph('Aucun rendez-vous à venir enregistré.'));}
  const antecedentLabel=$$('main [data-stitch-text]').find(el=>/registre d['’]antécédents majeurs/i.test(el.dataset.stitchText));const antecedents=antecedentLabel?.closest('section');if(antecedents){const title=antecedentLabel.parentElement.cloneNode(false),label=antecedentLabel.cloneNode(true),glyph=antecedentLabel.parentElement.querySelector('.material-symbols-outlined')?.cloneNode(true);text(label,'Antécédents — fonction non disponible');title.replaceChildren(...(glyph?[glyph]:[]),label);antecedents.replaceChildren(title,paragraph('Le moteur ne contient pas de registre structuré d’antécédents. Cette absence ne signifie pas qu’aucun antécédent médical n’existe.'));}
  if(appointments)appointments.id='fa-local-appointments';if(history)history.id='fa-local-history';if(documents)documents.id='fa-local-documents';
  const contacts=heading(ui.view==='health-person'?'Praticiens Référents':'Soignants & Officines')?.closest('section');renderContacts(contacts,data);if(contacts)contacts.id='fa-local-contacts';
  for(const b of $$('main button')){
   if(b.dataset.faAction||b.dataset.faUnavailable)continue;
   if(b.dataset.target){const target=({'tab-all':'fa-local-history','tab-rdv':'fa-local-appointments','tab-contacts':'fa-local-contacts','tab-parchemins':'fa-local-documents'})[b.dataset.target];text(b,({'tab-all':'Historique ('+past.length+')','tab-rdv':'Rendez-vous ('+future.length+')','tab-contacts':'Contacts du foyer','tab-parchemins':'Références ('+local.filter(r=>r.reference).length+')'})[b.dataset.target]||'Consulter');bind(b,'health-tab',{target});continue;}
   if(b.dataset.filter==='upcoming'||b.dataset.filter==='archived'){text(b,b.dataset.filter==='upcoming'?'À venir ('+future.length+')':'Passés ('+past.length+')');bind(b,'health-appointments',{mode:b.dataset.filter==='archived'?'past':'future'});continue;}
   if(/constante ou un rappel/i.test(b.textContent)){text(b,'Constantes et rappels indisponibles');unavailable(b,'Le moteur ne gère pas les constantes, vaccinations ni rappels médicaux.');continue;}
   if(/Changer/.test(b.textContent))bind(b,'members');else if(/rendez-vous|consultation|nouveau soin/i.test(b.textContent))bind(b,'medical-new');else if(/registre des membres/.test(b.textContent))bind(b,'members');else if(/Annuaire|Soignants/.test(b.textContent))bind(b,'health-history');else if(/Archiver/.test(b.textContent))unavailable(b,'L’archivage du carnet n’existe pas dans le moteur.');
  }
  for(const leaf of $$('main span,main p')){const original=leaf.dataset.stitchText||'';if(leaf.children.length)continue;if(/\d+\s*(MEMBRES|résidents)/i.test(original))text(leaf,data.members.length+' membres du foyer');else if(/\d+\s*(PRATICIENS|référents)/i.test(original))text(leaf,data.contacts.filter(c=>/médecin|pédiatre|dentiste|kiné|infirm|docteur/i.test(c.role||'')).length+' contacts du foyer');}
  // Original person chips are replaced, never supplemented with a second identity list.
  const residents=$$('main section').find(s=>/Maisonnée & Familiers/.test(s.textContent));if(residents){residents.replaceChildren();memberChooser(data,residents);}else memberChooser(data,$('main'));
  $('main').append(paragraph('Le moteur ne contient ni groupe sanguin, ni constantes, ni vaccinations structurées, ni archivage de carnet.'));
  const tools=context(member?member.name:'Aucun membre sélectionné');tools.append(button('member-edit','Modifier le membre'),button('health-history','Historique & contacts médicaux'),button('health','Carnet familial'),button('members','Registre des membres'));if(member)tools.append(button('member-delete','Supprimer le membre',{person:member.id}));$('main').append(tools);
  for(const b of $$('[data-fa-action="member-delete"]'))if(data.shared.some(r=>r.personId===b.dataset.person)){unavailable(b,'Réattribuez ou supprimez d’abord les rendez-vous partagés associés à ce membre.');b.after(paragraph('Ce membre reste associé à un rendez-vous médical partagé.'));}
  if(!member)for(const b of $$('[data-fa-action="member-edit"]'))unavailable(b,'Choisissez ou ajoutez un membre dans le registre.');
  if(ui.view==='health'){
   const orphans=data.local.filter(r=>!data.members.some(m=>belongs(r,m,data.members)));if(orphans.length){const orphanSection=context('Fiches locales à réattribuer');const cardSample=sourceCard(appointments);for(const r of orphans)orphanSection.append(recordCard(cardSample,r,data));orphanSection.append(paragraph('Aucun membre n’est créé automatiquement. Choisissez une personne existante pour réattribuer une fiche.'));$('main').append(orphanSection);}
   const shared=context('Rendez-vous médicaux partagés volontairement');shared.id='fa-shared';shared.append(paragraph(data.status),button('family-sync','Synchroniser le module Famille'));if(/conflit/i.test(data.status))shared.append(button('family-server','Conserver la version du foyer'),button('family-local','Conserver mes modifications'));const sample=sourceCard(appointments);for(const visit of data.shared)shared.append(recordCard(sample,visit,data,'shared'));if(!data.shared.length)shared.append(paragraph('Aucun rendez-vous médical partagé.'));const add=button('medical-new-shared','Créer volontairement un rendez-vous partagé');if(!data.active)unavailable(add,'Activez le module Famille dans Gérer le foyer pour ce registre partagé.');shared.append(add,button('account','Gérer le foyer'));$('main').append(shared);
  }
 }
 function renderContacts(section,data){
  if(!section)return;const title=section.querySelector('h2,h3'),sample=sourceCard(section);text(title,'Contacts médicaux du foyer');section.replaceChildren(...(title?[title]:[]),paragraph('Répertoire médical du foyer : aucune association individuelle des contacts n’est stockée par le moteur.'));
  const contacts=data.contacts.filter(r=>/médecin|pédiatre|dentiste|kiné|infirm|docteur/i.test(r.role||''));
  for(const contact of contacts){const card=sample.cloneNode(true);card.replaceChildren(Object.assign(document.createElement('h3'),{textContent:contact.name,className:'font-headline-sm text-primary'}),paragraph(contact.role),paragraph([contact.phone,contact.email,contact.note].filter(Boolean).join(' · ')),button('health-contact-edit','Modifier le contact',{record:contact.id}),button('contact-delete','Supprimer le contact',{record:contact.id}));if(contact.phone){const a=document.createElement('a');a.textContent='Appeler';a.href='tel:'+encodeURIComponent(contact.phone.replace(/[^+\d]/g,''));a.className='fa-button';card.append(a);}section.append(card);}
  if(!contacts.length)section.append(paragraph('Aucun contact médical enregistré dans le répertoire.'));section.append(button('contact-new','Ajouter un contact médical'),button('contacts','Répertoire complet du foyer (autre module)'));
 }
 // Unsaved form values live only in this page, keyed by household/route/record.
 // Only edited fields are restored over fresh native values; files/IDs and disabled controls are excluded.
 const formDrafts=new Map();let mountedDraft=null;
 const draftForm=()=>document.querySelector('main #member-form,main #fa-medical-form,main #rg-form,main #rg-log-form');
 function draftKey(view=ui.view){const household=E.win().DobbyFamilyUI?.getContext()?.householdId||'local',record=view==='member-edit'?(ui.memberNew?'new':ui.person||'new'):(ui.record||'new');return JSON.stringify([household,view,record,view==='medical-edit'?ui.scope:'']);}
 function captureDraft(){const form=draftForm();if(!mountedDraft||!form||form.id!==mountedDraft.formId)return;const fields=window.DobbyRegister.formValues(form),base=new Map(mountedDraft.fields.map(f=>[f.key,JSON.stringify(f.value)])),changed=mountedDraft.isNew?fields:fields.filter(f=>base.get(f.key)!==JSON.stringify(f.value));if(changed.length)formDrafts.set(mountedDraft.key,{formId:form.id,fields:changed});else formDrafts.delete(mountedDraft.key);}
 function discardDraft(){if(mountedDraft)formDrafts.delete(mountedDraft.key);mountedDraft=null;}
 function mountDraft(view,restore,previous,capture){const form=draftForm();if(!form){mountedDraft=null;return;}const key=draftKey(view),fields=window.DobbyRegister.formValues(form),saved=restore?formDrafts.get(key):null;mountedDraft={key,formId:form.id,view,isNew:view==='member-edit'?!!ui.memberNew:!ui.record,fields:capture&&previous?.key===key?previous.fields:fields};if(saved&&saved.formId===form.id){window.DobbyRegister.restoreForm(form,saved.fields);if(view==='member-edit')ui.memberDraft=memberDraft();if(view==='medical-edit'){ui.visitDraft=visitDraft();ui.person=ui.visitDraft.personId||null;text($('#selected-member-label'),E.read().members.find(m=>m.id===ui.person)?.name||(ui.scope==='shared'?'Foyer':'Sélectionnez un membre'));}}}
 async function render(view=ui.view,restoreDraft=true,capture=true){
  const previous=mountedDraft;if(capture)captureDraft();
  const rev=++revision,data=E.read();ui.view=view;delete document.body.dataset.registerLot;
  let doc;if(view==='salon'){doc=null;}else doc=await template(view);if(window.DobbyRegister?.handles(view))await window.DobbyRegister.prepare(view);if(window.DobbyOnboarding?.handles(view))await window.DobbyOnboarding.prepare(view,{...ui});if(rev!==revision)return;
  $('#fa-source-style')?.remove();$('#fa-supplement')?.remove();$('#fa-dialog')?.remove();
  let main,header;if(!doc){main=rootMain.cloneNode(true);header=rootHeader.cloneNode(true);}else{pristine=doc;main=document.importNode(doc.querySelector('main'),true);header=doc.querySelector('body > header')?.cloneNode(true);const style=document.createElement('style');style.id='fa-source-style';style.textContent=[...doc.querySelectorAll('head style')].map(x=>x.textContent).join('\n');document.head.append(style);const supplement=document.createElement('div');supplement.id='fa-supplement';for(const node of doc.body.children)if(!node.matches('main,header,nav,script'))supplement.append(document.importNode(node,true));document.body.append(supplement);}
  $('main').replaceWith(main);if(header)$('body > header')?.replaceWith(header);document.body.dataset.familyView=view;document.body.dataset.stitchSource=doc?.body.dataset.stitchSource||'dobby_le_salon_des_curiosit_s_famille_organisation';main.classList.add('fa-enter');
  if(view==='salon'){window.DobbyStitchRootAdapters.render('famille',data.state);renderSalon(data);}else if(window.DobbyOnboarding?.handles(view))window.DobbyOnboarding.render({data,ui,pristine,main,bind,button,paragraph,context,notice,open,legacy,unavailable,rememberMember(id){if(!E.read().members.some(m=>m.id===id))throw Error('Membre non enregistré.');ui.person=id;window.history.replaceState({},'','#'+ui.view+'?person='+encodeURIComponent(id));}});else if(window.DobbyRegister?.handles(view))window.DobbyRegister.render(view,{data,ui,pristine,main,bind,button,paragraph,context,notice,open,legacy,unavailable,heading,text,selected,esc});else if(view==='members')renderMembers(data);else if(view==='member-edit')renderMemberEdit(data);else if(view==='agenda')renderAgenda(data);else if(view==='medical-edit')renderMedical(data);else healthSections(data);
  if(!window.DobbyOnboarding?.handles(view))shell(data);window.DobbyChrome?.mount();mountDraft(view,restoreDraft,previous,capture);formContext=['member-edit','medical-edit'].includes(view)?availability(data):null;main.style.visibility='visible';document.documentElement.classList.remove('dv7-loading');if(dialogDraft)showDialog(dialogDraft.kind,dialogDraft.id,dialogDraft.values);if(formContext)setTimeout(()=>refresh().catch(e=>notice(e.message)),0);
 }
 async function open(view,values={},history=true){if(window.DobbyRegister?.busy)await window.DobbyRegister.wait();const requested=view;
  if(!handles(view)&&view!=='salon')return false;if((view==='personal'||window.DobbyOnboarding?.handles(view))&&values.person===undefined)values={...values,person:null};captureDraft();busy=true;
  try{if(values.record===undefined&&view!==ui.view&&window.DobbyRegister?.handles(view))ui.record=null;if(view==='member-edit'&&(values.mode==='new'||(!ui.person&&!values.person))){ui.memberNew=true;ui.person=null;ui.memberDraft ||= {name:'',birthdate:'',avatar:'👤'};}else if(view==='member-edit'&&values.person){ui.memberNew=false;ui.memberDraft=null;}if(values.person!==undefined&&values.person!==ui.person){ui.person=values.person||null;ui.memberDraft=null;ui.visitDraft=null;}
   if(values.record!==undefined){if((values.record||null)!==ui.record)ui.visitDraft=null;ui.record=values.record||null;}if(values.scope){const scope=values.scope==='shared'?'shared':'local';if(scope!==ui.scope)ui.visitDraft=null;ui.scope=scope;}
   if(values.day&&/^\d{4}-\d{2}-\d{2}$/.test(values.day)&&!Number.isNaN(Date.parse(values.day+'T12:00:00')))ui.day=values.day;
   const data=E.read();if(view!=='personal'&&!window.DobbyOnboarding?.handles(view)&&!ui.person&&data.members.length&&!(view==='member-edit'&&ui.memberNew))ui.person=data.members[0].id;
   if(['member-edit','health-person'].includes(view)&&ui.person&&!data.members.some(x=>x.id===ui.person)){ui.person=null;view='members';notice('Cette personne n’est plus dans le registre.');}
   if(view==='personal'&&!values.person&&values.person!==undefined)ui.person=null;
   if(view==='medical-edit'&&ui.record&&!data[ui.scope==='shared'?'shared':'local'].some(r=>r.id===ui.record)){ui.record=null;ui.visitDraft=null;view=data.members.some(m=>m.id===ui.person)?'health-person':'members';notice('Ce rendez-vous n’existe plus. Le registre est conservé.');}
   dialogDraft=null;if(!history&&view!==requested)window.history.replaceState({},'','#'+view+(ui.person?'?person='+encodeURIComponent(ui.person):''));if(history)window.history.pushState({},'','#'+view+(view==='member-edit'&&ui.memberNew?'?mode=new':ui.person?'?person='+encodeURIComponent(ui.person):'')+(ui.record&&(view==='medical-edit'||window.DobbyRegister?.handles(view))?(ui.person?'&':'?')+'record='+encodeURIComponent(ui.record)+'&scope='+ui.scope:''));if(!history){if(view==='member-edit')ui.memberDraft=null;if(view==='medical-edit')ui.visitDraft=null;}await render(view,!history,false);if(values.eventNew)showDialog('event',values.eventId);window.scrollTo(0,0);return true;
  }finally{busy=false;}
 }
 function memberDraft(){return{name:$('#member-firstname').value,birthdate:$('#member-birthdate').value,avatar:$('#fa-member-avatar').value};}
 async function act(action,el){if(window.DobbyRegister?.busy)await window.DobbyRegister.wait();
  if(/^\s*Annuler/i.test(el.textContent||''))discardDraft();if(action==='dismiss'){$('#fa-notice').hidden=true;return;}
  if(handles(action)||action==='salon'){if(action==='member-edit'){ui.memberNew=false;ui.memberDraft=null;}return open(action,el.dataset);}
  if(action==='member-new'){ui.memberNew=true;ui.person=null;ui.memberDraft={name:'',birthdate:'',avatar:'👤'};await open('member-edit');return;}
  if(action==='member-save'){const draft=memberDraft();if(!$('#member-form').reportValidity())return;const id=E.saveMember(ui.memberNew?null:ui.person,draft);discardDraft();ui.memberDraft=null;ui.memberNew=false;return open('health-person',{person:id});}
  if(action==='member-delete'){if(E.read().shared.some(r=>r.personId===(el.dataset.person||ui.person)))throw Error('Réattribuez ou supprimez d’abord les rendez-vous partagés de ce membre.');if(E.deleteMember(el.dataset.person||ui.person)){ui.person=null;ui.memberDraft=null;return open('members');}return;}
  if(action==='search-clear'){ui.query='';return render();}
  if(action==='contacts')return open('contacts',{record:null});
  if(ui.view==='salon'&&action==='rg-memo-new')return open('memo-edit',{record:null,scope:'shared'});
  if(ui.view==='salon'&&action==='rg-memo-edit')return open('memo-edit',{record:el.dataset.record,scope:'shared'});
  if(action.startsWith('rg-'))return window.DobbyRegister.act(action,el,{data:E.read(),ui});
  if(action==='back'){if(window.DobbyRegister?.handles(ui.view))return window.DobbyRegister.back();if(ui.view==='salon')return legacy('home');return open(ui.view==='member-edit'?'members':ui.view==='medical-edit'?'health-person':'salon');}
  if(action==='legacy'){if(handles(el.dataset.route))return open(el.dataset.route,{record:null});return legacy(el.dataset.route);}
  if(['account','menu','documents','home'].includes(action)){if(ui.view==='member-edit')ui.memberDraft=memberDraft();if(ui.view==='medical-edit')ui.visitDraft=visitDraft();return legacy(action);}
  return extraAction(action,el);
 }
 async function refresh(){
  if(window.DobbyOnboarding?.handles(ui.view)){window.DobbyOnboarding.refresh();return;}
  if(!ready||busy||dialogDraft||window.DobbyRegister?.busy||document.querySelector('#rg-form,#rg-log-form,.mp-editor:not([hidden])'))return;const data=E.read();for(const status of $$('.fa-sharing-status'))text(status,'Membres et agenda : '+data.status);
  const form=['member-edit','medical-edit'].includes(ui.view);let focus;
  if(form){if(availability(data)===formContext)return;const field=document.activeElement;if(field?.matches('input,textarea,select'))focus={id:field.id,start:field.selectionStart,end:field.selectionEnd};if(ui.view==='member-edit')ui.memberDraft=memberDraft();else ui.visitDraft=visitDraft();}
  else if(document.activeElement?.matches('input,textarea,select'))return;
  busy=true;try{await render();if(focus&&$('#dv7-panel')?.hidden){const field=document.getElementById(focus.id);field?.focus();if(field&&focus.start!==null&&field.setSelectionRange&&/^(text|search)$/.test(field.type||'text'))field.setSelectionRange(focus.start,focus.end);}}finally{busy=false;}
 }
 async function init(openLegacy){
  if(ready)return;legacy=openLegacy;rootMain=$('main').cloneNode(true);rootHeader=$('body > header').cloneNode(true);document.body.classList.add('fa-active');E.notices(notice);
  const parse=()=>{const[v,q]=location.hash.slice(1).split('?'),p=new URLSearchParams(q||'');return{view:handles(v)?v:'salon',day:p.get('day')||undefined,person:p.get('person')||undefined,record:p.get('record')||null,scope:p.get('scope')==='shared'?'shared':'local',mode:p.get('mode')||undefined,eventNew:p.get('dialog')==='event',eventId:p.get('event')||undefined};};
  document.addEventListener('click',event=>{if(event.target.closest('#dv7-panel'))return;const el=event.target.closest('[data-fa-action]');if(!el)return;event.preventDefault();event.stopImmediatePropagation();busy=true;Promise.resolve(act(el.dataset.faAction,el)).catch(e=>notice(e.message)).finally(()=>busy=false);},true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('#fa-dialog')){event.preventDefault();dialogDraft=null;$('#fa-dialog').remove();return;}const el=event.target.closest('[data-fa-action][role="button"]');if(el&&['Enter',' '].includes(event.key)){event.preventDefault();el.click();}});
  document.addEventListener('change',event=>{if(event.target.id==='fa-visit-scope'){ui.visitDraft=visitDraft();ui.scope=event.target.value;render();}if(event.target.id==='fa-visit-person'){ui.person=event.target.value||null;text($('#selected-member-label'),E.read().members.find(x=>x.id===ui.person)?.name||'Foyer');}});
  document.addEventListener('input',event=>{window.DobbyRegister?.input(event);if(event.target.id==='consultation-notes')text($('#char-counter'),event.target.value.length+' / 500');if(ui.view==='members'&&event.target.id==='search-input'){ui.query=event.target.value;renderMembers(E.read());$('#search-input').focus();}});
  document.addEventListener('submit',event=>{if(!['member-form','fa-medical-form','fa-native-form'].includes(event.target.getAttribute('id')))return;event.preventDefault();event.stopImmediatePropagation();busy=true;Promise.resolve(event.target.getAttribute('id')==='member-form'?act('member-save',event.target):saveForm(event.target)).catch(e=>notice(e.message)).finally(()=>busy=false);},true);
  window.addEventListener('popstate',()=>{const state=parse();open(state.view,state,false).catch(e=>notice(e.message));});
  const state=parse();await open(state.view,state,false);ready=true;
  new MutationObserver(()=>{if(ready&&!busy)refresh().catch(e=>notice(e.message));}).observe(E.win().document.getElementById('screen'),{childList:true});
 }
 // Agenda and medical adapters below reuse the same source shell and native forms.
 function renderAgenda(data){
  disclose('agenda','Événements ordinaires du module Famille : '+data.status+'. Les fiches individuelles locales ne sont pas copiées dans cet agenda.');
  const today=E.evaluate('return todayISO();');ui.day ||= today;
  const articles=$$('main article'),section=articles[0]?.closest('section'),sample=articles[0]?.cloneNode(true);
  if(section&&sample){const title=section.querySelector('h2,h3'),header=title?.parentElement;const filterPerson=data.members.find(m=>m.id===ui.agendaPerson);const events=data.events.filter(x=>x.date===ui.day&&(!filterPerson||x.person===filterPerson.name)).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
   section.replaceChildren(...(header?[header]:[]));text(title,date(ui.day));
   for(const event of events){const card=sample.cloneNode(true);for(const el of card.querySelectorAll('*'))for(const node of [...el.childNodes])if(node.nodeType===3&&!el.classList.contains('material-symbols-outlined'))node.textContent='';text(card.querySelector('h3,h4'),event.title);const ps=card.querySelectorAll('p');text(ps[0],[event.time||'Toute la journée',event.person,event.location].filter(Boolean).join(' · '));text(ps[1],event.note||'');for(const b of card.querySelectorAll('button'))b.remove();card.append(paragraph(event.category+' · événement familial ordinaire'),button('event-edit','Modifier',{record:event.id}),button('event-export','Exporter vers un calendrier (.ics)',{record:event.id}),button('event-delete','Supprimer',{record:event.id}));section.append(card);}
   if(!events.length)section.append(paragraph('Aucun événement familial ordinaire à cette date.'));
   const shared=data.shared.filter(x=>x.date===ui.day&&(!filterPerson||belongs(x,filterPerson,data.members)));for(const visit of shared)section.append(recordCard(sample,visit,data,'shared'));
   section.append(paragraph('Les fiches médicales individuelles locales ne sont pas ajoutées à cet agenda. Seuls les rendez-vous explicitement partagés peuvent y être consultés.'));
  }
  const firstDay=$$('main button').find(b=>/^Lun\s*\d/.test(b.textContent.trim()));
  if(firstDay){const list=firstDay.parentElement,daySample=firstDay.cloneNode(true),count=ui.calendarMode==='month'?new Date(Number(ui.day.slice(0,4)),Number(ui.day.slice(5,7)),0).getDate():7,start=ui.calendarMode==='month'?ui.day.slice(0,8)+'01':ui.day;list.replaceChildren(...Array.from({length:count},(_,i)=>{const b=daySample.cloneNode(true),value=E.evaluate('return addDays(p.day,p.index);',{day:start,index:i});text(b,new Date(value+'T12:00:00').toLocaleDateString('fr-BE',{weekday:'short',day:'numeric'}));b.setAttribute('aria-pressed',String(value===ui.day));return bind(b,'agenda-day',{date:value});}));}
  const chips=$$('main section').find(s=>s.querySelector('button')?.textContent.includes('Tous'));if(chips){const row=chips.querySelector('button').parentElement,sample=row.querySelector('button').cloneNode(true);row.replaceChildren(...[{id:'',name:'Tout le foyer'},...data.members].map(m=>{const b=sample.cloneNode(true);text(b,m.name);return bind(b,'agenda-person',{person:m.id});}));}
  bind($('#btn-view-week'),'agenda-mode',{mode:'week'});bind($('#btn-view-month'),'agenda-mode',{mode:'month'});selected($('#btn-view-week'),ui.calendarMode!=='month');selected($('#btn-view-month'),ui.calendarMode==='month');
  for(const b of $$('main button')){if(b.dataset.faAction)continue;const symbol=b.querySelector('.material-symbols-outlined')?.textContent.trim();if(/Programmer|Consigner/.test(b.textContent))bind(b,'event-new');else if(/Revenir au Salon/.test(b.textContent))bind(b,'salon');else if(symbol==='chevron_left'||symbol==='chevron_right')bind(b,'agenda-shift',{delta:symbol==='chevron_left'?'-7':'7'});}
  for(const el of $$('main span,main p'))if(!el.children.length&&/NOVEMBRE|2024|12 RITUELS/.test(el.dataset.stitchText||''))text(el,/RITUELS/.test(el.dataset.stitchText)?data.events.length+' événements enregistrés':new Date(ui.day+'T12:00:00').toLocaleDateString('fr-BE',{month:'long',year:'numeric'}));
  const due=context('Échéances des autres modules');const deadlines=data.upcoming.filter(x=>!['event','medical'].includes(x.kind));for(const item of deadlines)due.append(paragraph(date(item.date)+' · '+item.title));if(!deadlines.length)due.append(paragraph('Aucune échéance sur la période du moteur.'));$('main').append(due);
  if(!$('[data-fa-action="event-new"]'))$('main').append(button('event-new','Ajouter un événement familial'));
 }
 function visitDraft(){return{title:$('#consultation-title').value,provider:$('#practitioner-input').value,date:$('#consultation-date').value,time:$('#consultation-time').value,location:$('#location-input').value,note:$('#consultation-notes').value,reference:$('#fa-reference')?.value||'',personId:$('#fa-visit-person').value};}
 function renderMedical(data){
  const shared=ui.scope==='shared',record=(shared?data.shared:data.local).find(r=>r.id===ui.record);
  if(ui.record&&!record)throw Error('Ce rendez-vous a été supprimé. Revenez au carnet.');
  const draft=ui.visitDraft||{title:record?.title||record?.name||'',provider:record?.provider||'',date:record?.date||'',time:record?.time||'',location:record?.location||'',note:record?.note||'',reference:record?.reference||'',personId:record?(record.personId||(!shared&&data.members.filter(m=>m.name===record.person).length===1?data.members.find(m=>m.name===record.person)?.id:'')||''):(ui.person||'')};
  disclose('notes',shared?'Partagé volontairement avec le foyer':'Local sur cet appareil');
  const main=$('main'),form=document.createElement('form');form.id='fa-medical-form';while(main.firstChild)form.append(main.firstChild);main.append(form);
  const scope=context('Périmètre de ce rendez-vous');const scopeLabel=document.createElement('label');scopeLabel.className='fa-field';scopeLabel.textContent='Enregistrement';const scopeSelect=document.createElement('select');scopeSelect.id='fa-visit-scope';scopeSelect.add(new Option('Individuel · local sur cet appareil','local'));const option=new Option('Partagé volontairement avec le foyer','shared');option.disabled=!data.active;scopeSelect.add(option);scopeSelect.value=ui.scope;scopeSelect.disabled=Boolean(ui.record);scopeLabel.append(scopeSelect);scope.append(scopeLabel,paragraph(shared?'Vous choisissez de partager cette fiche avec les membres connectés du foyer. Aucune fiche individuelle existante n’est copiée.':'Ce rendez-vous reste dans le carnet individuel local. Il ne sera pas copié dans l’agenda familial.'));
  if(!data.active)scope.append(paragraph('Le partage volontaire est disponible après activation du module Famille.'),button('account','Gérer le foyer'));
  form.prepend(scope);
  const memberLabel=document.createElement('label');memberLabel.className='fa-field';memberLabel.textContent='Personne du registre existant';const select=document.createElement('select');select.id='fa-visit-person';select.required=!shared;if(shared)select.add(new Option('Foyer',''));for(const m of data.members)select.add(new Option(m.name,m.id));if(shared&&record?.personId&&!data.members.some(m=>m.id===record.personId)){const unresolved=new Option('Ancien rattachement : choisissez une personne ou Foyer',record.personId);unresolved.disabled=true;select.add(unresolved);}
  select.value=draft.personId;memberLabel.append(select);scope.append(memberLabel);
  for(const leaf of $$('main span,main label'))if(!leaf.children.length&&/Visible uniquement par le foyer|NOTES SECRÈTES/i.test(leaf.textContent))text(leaf,/NOTES/.test(leaf.textContent)?'Notes du rendez-vous':shared?'Partagé volontairement avec le foyer':'Local sur cet appareil');
  text($('#selected-member-label'),data.members.find(x=>x.id===draft.personId)?.name||(shared?'Foyer':'Sélectionnez un membre'));
  const personImages=$$('main img');const firstChip=personImages[0]?.closest('button');if(firstChip)firstChip.parentElement.replaceChildren(paragraph('La personne est choisie dans le registre ci-dessus, sans créer de nouvelle identité.'));else for(const image of personImages)avatar(image,current(data));
  const providerButtons=$$('main button').filter(b=>/stethoscope|experiment|potted_plant/.test(b.querySelector('.material-symbols-outlined')?.textContent||''));if(providerButtons.length){const row=providerButtons[0].parentElement,sample=providerButtons[0].cloneNode(true);row.replaceChildren(...data.contacts.filter(c=>/médecin|pédiatre|dentiste|kiné|infirm|docteur/i.test(c.role||'')).map(c=>{const b=sample.cloneNode(true);text(b,c.name);return bind(b,'provider-select',{record:c.id});}));}
  const fields={'consultation-title':'title','practitioner-input':'provider','consultation-date':'date','consultation-time':'time','location-input':'location','consultation-notes':'note'};
  for(const[id,key]of Object.entries(fields)){const el=$('#'+id);if(el){el.value=draft[key]||'';el.required=id==='consultation-title'||shared&&id==='consultation-date';}}
  const providerLabel=$('label[for="practitioner-input"]');if(providerLabel)text(providerLabel,'Professionnel / établissement (facultatif)');
  $('#consultation-title').maxLength=140;$('#practitioner-input').maxLength=shared?160:200;$('#consultation-notes').maxLength=500;
  for(const id of ['practitioner-phone','consultation-fee','consultation-duration','reminder-toggle'])unavailable($('#'+id),'Cette information n’est pas prise en charge par les gestionnaires DOBBY.');
  if(!shared){unavailable($('#consultation-time'),'L’heure n’est pas enregistrée dans le carnet individuel actuel.');unavailable($('#location-input'),'Le lieu n’est pas enregistré dans le carnet individuel actuel.');}
  const attachment=$('#attached-document-card');if(attachment)attachment.replaceChildren(paragraph('Aucune pièce jointe gérée par ce formulaire. La référence ci-dessous est un texte local.'));
  const refLabel=document.createElement('label');refLabel.className='fa-field';refLabel.textContent='Référence de document (texte, sans transfert)';const ref=document.createElement('input');ref.id='fa-reference';ref.maxLength=200;ref.value=draft.reference||'';refLabel.append(ref);if(shared)unavailable(ref,'Le formulaire partagé n’enregistre pas de référence de document.');$('#consultation-notes').closest('div')?.append(refLabel);
  const note=context('Fonctions absentes de ce moteur');note.append(paragraph('Téléphone et tarif du praticien, durée, rappels, pièces jointes et ordonnances structurées ne sont pas enregistrés. Le carnet local ne conserve pas l’heure ni le lieu.'));form.append(note);
  bind($('#mode-create'),'medical-new');bind($('#mode-edit'),'health-person');selected($('#mode-create'),!ui.record);selected($('#mode-edit'),Boolean(ui.record));text($('#mode-badge'),ui.record?'Modification de la fiche existante':'Nouveau rendez-vous');text($('#char-counter'),draft.note.length+' / 500');
  for(const b of $$('main button,#fa-supplement button'))if(/Supprimer définitivement/.test(b.textContent)){text(b,'Supprimer ce rendez-vous');bind(b,'medical-delete');b.hidden=!record;}
  const save=$('#btn-save-consultation');if(save){bind(save,'medical-save');save.setAttribute('form','fa-medical-form');save.type='submit';}else form.append(button('medical-save','Enregistrer le rendez-vous'));
  if(!shared&&!data.members.length){for(const field of form.elements)field.disabled=true;form.append(paragraph('Ajoutez d’abord une personne dans le registre des membres.'),button('member-new','Ajouter une personne'));}
  if(shared&&!data.active){for(const field of form.querySelectorAll('input,textarea'))field.disabled=true;if(save)unavailable(save,'Le module Famille doit être actif pour enregistrer un rendez-vous partagé.');}
  if(!$('main h1'))main.prepend(Object.assign(document.createElement('h1'),{textContent:'Consultation & soins',className:'fa-title'}));
 }
 function showDialog(kind,id,values){
  const native=kind==='event'?E.eventForm(id):E.contactForm(id);if(!native)throw Error('Le formulaire natif est indisponible.');
  $('#fa-dialog')?.remove();const root=document.createElement('div');root.id='fa-dialog';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',kind==='event'?'Événement familial':'Contact du répertoire');
  const section=pristine?._eventFrame?.cloneNode(false)||sourceCard($('main section'));section.removeAttribute('id');section.classList.add('fa-context');section.replaceChildren();
  const h=document.createElement('h2');h.className='fa-title';h.textContent=kind==='event'?'Événement familial ordinaire':'Contact du répertoire familial';section.append(h,paragraph(kind==='event'?'Cet événement peut être partagé avec le foyer. Les informations médicales individuelles ne sont pas copiées ici.':'Ce contact appartient au répertoire du foyer. Le moteur ne l’associe pas automatiquement à une personne.'));
  const form=document.importNode(native,true);form.id='fa-native-form';form.dataset.kind=kind;form.dataset.record=id||'';form.className='fa-native';form.querySelectorAll('button').forEach(b=>b.remove());
  for(const field of form.querySelectorAll('input:not([type="hidden"]),select,textarea')){
   field.className='';let label=field.closest('label');if(!label){label=document.createElement('label');const previous=field.previousElementSibling;if(previous?.tagName==='LABEL'){label.textContent=previous.textContent;previous.remove();}else label.textContent=field.name;field.before(label);label.append(field);}label.classList.add('fa-field');if(values&&Object.hasOwn(values,field.name))field.value=values[field.name];
  }
  if(kind==='contact'&&!id)form.elements.namedItem('role').value='Médecin';
  if(kind==='event'){const list=document.createElement('datalist');list.id='fa-event-people';for(const member of E.read().members)list.append(new Option(member.name,member.name));form.append(list);form.elements.namedItem('person').setAttribute('list',list.id);}
  const submit=document.createElement('button');submit.type='submit';submit.className='fa-button';submit.textContent='Enregistrer';form.append(submit,button('dialog-close','Annuler'));section.append(form);root.append(section);document.body.append(root);form.querySelector('input:not([type="hidden"])')?.focus();dialogDraft={kind,id,values:values||null};
 }
 async function saveForm(form){
  if(!form.reportValidity())return;
  if(form.getAttribute('id')==='fa-native-form'){
   const values=Object.fromEntries(new FormData(form));if(form.dataset.kind==='event'){E.saveEvent(form.dataset.record||null,values);ui.day=values.date;}else E.saveContact(form.dataset.record||null,values);
   dialogDraft=null;$('#fa-dialog')?.remove();return render();
  }
  if(form.getAttribute('id')==='fa-medical-form')return saveMedical();
 }
 async function saveMedical(){
  if(!$('#fa-medical-form').reportValidity())return;const draft=visitDraft();if(draft.personId&&!E.read().members.some(m=>m.id===draft.personId))throw Error('La personne associée n’est plus dans le registre. Choisissez une personne actuelle ou, pour le registre partagé, Foyer.');const values=ui.scope==='shared'?draft:{name:draft.title,date:draft.date,provider:draft.provider,reference:draft.reference,note:draft.note,personId:draft.personId};
  const id=E.saveVisit(ui.scope,ui.record,values);if(!id)throw Error('Le rendez-vous n’a pas été enregistré. Vérifiez la personne et les champs.');discardDraft();ui.visitDraft=null;ui.record=null;if(draft.personId)ui.person=draft.personId;return open(ui.scope==='shared'?'health':'health-person');
 }
 async function extraAction(action,el){
  if(action==='family-sync'){E.action('fvAction','sync');await new Promise(r=>setTimeout(r,100));return render();}
  if(action==='family-local'||action==='family-server'){E.action('fmAction',action==='family-local'?'local':'server',{module:'family'});await new Promise(r=>setTimeout(r,100));return render();}
  if(action==='provider-select'){const contact=E.read().contacts.find(x=>x.id===el.dataset.record);if(contact)$('#practitioner-input').value=contact.name;return;}
  if(action==='health-tab'){$('#'+el.dataset.target)?.scrollIntoView({block:'start'});return;}
  if(action==='health-appointments'){ui.appointmentMode=el.dataset.mode;return render();}
  if(action==='medical-new'||action==='medical-new-shared'){ui.record=null;ui.visitDraft=null;ui.scope=action==='medical-new-shared'?'shared':'local';return open('medical-edit');}
  if(action==='medical-save')return saveMedical();
  if(action==='medical-delete'){if(E.deleteVisit(ui.scope,ui.record)){ui.record=null;ui.visitDraft=null;return open(ui.scope==='shared'?'health':'health-person');}return;}
  if(action==='event-new'){if(ui.view!=='agenda')return open('agenda',{eventNew:true});showDialog('event');return;}
  if(action==='event-edit'){showDialog('event',el.dataset.record);return;}
  if(action==='event-delete'){E.deleteEvent(el.dataset.record);return render();}
  if(action==='event-export'){E.exportEvent(el.dataset.record);return;}
  if(action==='contact-new'){showDialog('contact');return;}
  if(action==='health-contact-edit'){showDialog('contact',el.dataset.record);return;}
  if(action==='contact-delete'){E.deleteContact(el.dataset.record);return render();}
  if(action==='dialog-close'){dialogDraft=null;$('#fa-dialog')?.remove();return;}
  if(action==='agenda-day'){ui.day=el.dataset.date;return render();}
  if(action==='agenda-mode'){ui.calendarMode=el.dataset.mode;return render();}
  if(action==='agenda-shift'){ui.day=E.evaluate('return addDays(p.day,p.delta);',{day:ui.day,delta:Number(el.dataset.delta)});return render();}
  if(action==='agenda-person'){ui.agendaPerson=el.dataset.person;return render();}
 }
 return Object.freeze({init,open,refresh,discardDraft,get ready(){return ready},get view(){return ui.view},handles});
})();

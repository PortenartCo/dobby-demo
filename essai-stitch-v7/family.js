/* Mission 2A: visible compositions are the seven original Stitch documents. */
window.DobbyFamilyStitch=(()=>{
 'use strict';
 const E=window.DobbyFamilyStitchEngine,routes=['member-detail','members','member-edit','agenda','medical-edit','health','health-person','health-history'];
 const handles=view=>routes.includes(view)||window.DobbyRegister?.handles(view)||window.DobbyOnboarding?.handles(view)||window.DobbyPreparations?.handles(view)||window.DobbyAccess?.handles(view);
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const ui={view:'salon',person:null,record:null,scope:'local',query:'',memberDraft:null,visitDraft:null,day:null,origin:'salon',memberOrigin:'salon',memoMode:'edit'},cache=new Map();
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
 function sharedReadOnly(){
  try{const native=E.win(),api=native.DobbyFamilyUI,bound=api?.access?.state?.(),identity=api?.getContext?.(),demoId=native.DobbyReview?.demoMemberId;
   if(demoId)return ['child','baby','pet'].includes(E.read().members.find(member=>member.id===demoId)?.memberCategory);
   const connection=api?.connectionState?.(),nativeSession=[connection?.userId,identity?.userId].some(id=>typeof id==='string'&&id.length>0);
   if(!nativeSession&&!bound?.userId&&!bound?.authenticated&&!bound?.memberId&&!bound?.profile?.memberCategory&&bound?.phase!=='active')return false;
   const canonical=bound?.authenticated===true&&bound.verified&&['userId','householdId','memberId'].every(key=>typeof bound[key]==='string'&&bound[key].length>0)&&identity?.identityVerified&&bound.userId===identity.userId&&bound.householdId===identity.householdId&&bound.memberId===identity.memberId&&bound.profile?.id===bound.memberId;
   return !canonical||bound.profile?.memberCategory!=='parent'||bound.permissions?.canEdit!==true;
  }catch{return true;}
 }

 const sharedReadReason='Les données partagées sont en lecture seule pour ce profil. Leur gestion exige des droits canoniques vérifiés. Un enfant peut seulement valider ses missions autorisées et modifier sa propre Maison et son propre Patronus.';
 const prepReadActions=new Set(['prep-family-back','prep-agenda-back','prep-cancel','prep-event-open','prep-event-back','prep-courses','prep-open']);
 const sharedMutation=action=>/^event-(new|edit|delete)$|^(contact-new|contact-delete|health-contact-edit|family-local|family-server)$|^rg-(contact-(new|edit|delete)|memo-(new|edit|delete|import)|save|delete)$/.test(action)||action.startsWith('prep-')&&!prepReadActions.has(action);
 function gateSharedUI(){
  if(!sharedReadOnly())return;
  for(const el of $$('[data-fa-action]'))if(sharedMutation(el.dataset.faAction))unavailable(el,sharedReadReason);
  for(const field of $$('#rg-form input,#rg-form select,#rg-form textarea,#prep-add-form input,#prep-add-form button,.prep-main #prep-name'))field.disabled=true;
  if(!$('main [data-family-readonly]')){const status=paragraph(sharedReadReason);status.dataset.familyReadonly='';$('main')?.append(status);}
 }
 function familyContext(data=E.read()){return{E,data,ui,main:$('main'),pristine,open,render,button,bind,paragraph,context,notice,legacy,unavailable,heading,text,selected,esc,sharedReadOnly:sharedReadOnly(),gateSharedUI,dialog(value){dialogDraft=value;}};}
 function agendaContext(data=E.read()){return familyContext(data);}
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
  if(!ui.view.startsWith('contract')&&!['salon','contracts','agenda','memos','memo-edit','menu','settings'].includes(ui.view)){$('main').append(paragraph('Membres et agenda : '+data.status,'fa-note fa-sharing-status'));if(ui.view.startsWith('health')||ui.view==='medical-edit')$('main').append(paragraph('Fiches individuelles : locales sur cet appareil. Les rendez-vous partagés sont un registre distinct, créé volontairement.'));}
  for(const b of $$('main button,#fa-supplement button'))if(!b.dataset.faAction&&!b.dataset.faUnavailable&&!b.dataset.magicControl&&!b.closest('.prep-main'))unavailable(b,'Cette fonction de la maquette n’existe pas dans le moteur actuel.');
 }
 function gateMedicalUI(){
  if(!E.visitPermissions)return;
  for(const b of $$('[data-fa-action^="medical-"]')){const action=b.dataset.faAction;if(!['medical-new','medical-new-shared','medical-edit','medical-save','medical-delete'].includes(action))continue;const scope=action==='medical-new'?'local':action==='medical-new-shared'?'shared':b.dataset.scope||ui.scope,record=['medical-new','medical-new-shared'].includes(action)?null:b.dataset.record||ui.record,person=b.dataset.person||ui.person||'';const rights=E.visitPermissions(scope,record,person);if(!(record?rights.canEdit:rights.canCreate)){b.disabled=true;b.title=rights.reason;}}
  if(ui.view==='medical-edit'){const rights=E.visitPermissions(ui.scope,ui.record,ui.person||'');if(!(ui.record?rights.canEdit:rights.canCreate)){for(const field of $$('#fa-medical-form input,#fa-medical-form textarea,#fa-medical-form select'))field.disabled=true;$('#fa-medical-form')?.append(paragraph(rights.reason));}}
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
  const main=$('main');main.replaceChildren(...(intro?[intro]:[]));
  function panel(id,title,summary){
   const details=document.createElement('details');details.className='fam-salon-panel';details.dataset.familyPanel=id;details.name='family-sections';details.open=(ui.salonPanel||'members')===id;
   const toggle=document.createElement('summary'),label=document.createElement('strong'),description=paragraph(summary,'fam-panel-summary');label.textContent=title;toggle.append(label,description);details.append(toggle);
   details.addEventListener('toggle',()=>{if(details.open){ui.salonPanel=id;for(const other of main.querySelectorAll('details[data-family-panel]'))if(other!==details)other.open=false;}else if(ui.salonPanel===id)ui.salonPanel='closed';});
   const content=document.createElement('div');content.className='fam-panel-content';details.append(content);main.append(details);return content;
  }
  const members=panel('members','Membres du foyer',data.members.length+' membre'+(data.members.length>1?'s':'')+' · fiches, invitations et anniversaires');
  members.append(button('members','Gérer les membres'));
  if(data.members.length){const gallery=document.createElement('div');gallery.className='fam-salon-gallery';for(const member of data.members)gallery.append(window.DobbyFamilyMembersReview.createCard(familyContext(data),member,{origin:'salon',compact:true}));members.append(gallery);}else members.append(paragraph('Aucun membre enregistré. Ajoutez un enfant ou un animal, ou invitez une personne.'));
  let prep;try{prep=window.DobbyPreparations?.read();}catch{}
  const events=panel('events','Événements & Préparatifs',data.events.length+' événement'+(data.events.length>1?'s':'')+' · '+(prep?.templates?.length||0)+' modèle'+((prep?.templates?.length||0)>1?'s':''));
  const calendar=document.createElement('section');calendar.className='fam-salon-agenda';events.append(calendar);window.DobbyFamilyAgendaReview.renderAgenda({...agendaContext(data),main:calendar,embedded:true});
  const preparations=document.createElement('section');preparations.className='fam-salon-preparations';const h=document.createElement('h3');h.textContent='Listes de préparation';preparations.append(h,paragraph('Les modèles PREP-01 et les listes associées conservent leur lien avec chaque événement.'),button('preparation-models','Mes modèles'));
  for(const list of prep?.eventPreparations||[]){const event=data.events.find(row=>row.id===list.eventId);if(event)preparations.append(button('prep-event-open',event.title+' · '+list.items.filter(row=>row.done).length+'/'+list.items.length+' préparatifs',{record:event.id}));}
  events.append(preparations);
 }

 function renderMembers(data){return window.DobbyFamilyMembersReview.renderMembers(familyContext(data));}
 function renderMemberEdit(data){const saved=formDrafts.get(draftKey('member-edit')),baseline=saved?.memberBaseline||ui.memberBaseline||JSON.stringify(data.members.find(row=>row.id===ui.person)||null);ui.memberBaseline=baseline;window.DobbyFamilyMembersReview.renderMemberEdit(familyContext(data));const form=$('#member-form');if(form)form.dataset.memberBaseline=baseline;}
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
 function draftKey(view=ui.view){const household=E.win().DobbyFamilyUI?.getContext()?.householdId||'local',record=view==='member-edit'?(ui.memberNew?'new:'+(ui.memberCategory||'child'):ui.person||'new'):(ui.record||'new');return JSON.stringify([household,view,record,view==='medical-edit'?ui.scope:'']);}
 function captureDraft(){const form=draftForm();if(!mountedDraft||!form||form.id!==mountedDraft.formId)return;const fields=window.DobbyRegister.formValues(form),base=new Map(mountedDraft.fields.map(f=>[f.key,JSON.stringify(f.value)])),changed=mountedDraft.isNew?fields:fields.filter(f=>base.get(f.key)!==JSON.stringify(f.value));if(changed.length)formDrafts.set(mountedDraft.key,{formId:form.id,fields:changed,memberBaseline:mountedDraft.memberBaseline});else formDrafts.delete(mountedDraft.key);}
 function discardDraft(){if(mountedDraft)formDrafts.delete(mountedDraft.key);mountedDraft=null;}
 function mountDraft(view,restore,previous,capture){const form=draftForm();if(!form){mountedDraft=null;return;}const key=draftKey(view),fields=window.DobbyRegister.formValues(form),saved=restore?formDrafts.get(key):null;mountedDraft={key,formId:form.id,view,memberBaseline:form.id==='member-form'?form.dataset.memberBaseline:null,isNew:view==='member-edit'?!!ui.memberNew:!ui.record,fields:capture&&previous?.key===key?previous.fields:fields};if(saved&&saved.formId===form.id){window.DobbyRegister.restoreForm(form,saved.fields);if(view==='member-edit')ui.memberDraft=memberDraft();if(view==='medical-edit'){ui.visitDraft=visitDraft();ui.person=ui.visitDraft.personId||null;text($('#selected-member-label'),E.read().members.find(m=>m.id===ui.person)?.name||(ui.scope==='shared'?'Foyer':'Sélectionnez un membre'));}}}
 async function render(view=ui.view,restoreDraft=true,capture=true){
  if(!window.DobbyAccess?.handles(view))window.DobbyAccess?.leave();
  const previous=mountedDraft;if(capture)captureDraft();
  const rev=++revision,data=E.read();ui.view=view;delete document.body.dataset.registerLot;
  let doc;if(['salon','member-detail'].includes(view)||window.DobbyPreparations?.handles(view)||window.DobbyAccess?.handles(view)){doc=null;}else doc=await template(view);if(window.DobbyRegister?.handles(view))await window.DobbyRegister.prepare(view);if(window.DobbyOnboarding?.handles(view))await window.DobbyOnboarding.prepare(view,{...ui});if(window.DobbyAccess?.handles(view))await window.DobbyAccess.prepare(view,{...ui});if(rev!==revision)return;
  $('#fa-source-style')?.remove();$('#fa-supplement')?.remove();$('#fa-dialog')?.remove();
  let main,header;if(!doc){main=rootMain.cloneNode(true);header=rootHeader.cloneNode(true);}else{pristine=doc;main=document.importNode(doc.querySelector('main'),true);header=doc.querySelector('body > header')?.cloneNode(true);const style=document.createElement('style');style.id='fa-source-style';style.textContent=[...doc.querySelectorAll('head style')].map(x=>x.textContent).join('\n');document.head.append(style);const supplement=document.createElement('div');supplement.id='fa-supplement';for(const node of doc.body.children)if(!node.matches('main,header,nav,script'))supplement.append(document.importNode(node,true));document.body.append(supplement);}
  if(['members','member-edit','member-detail','agenda','memos','memo-edit'].includes(view))header=rootHeader.cloneNode(true);
  $('main').replaceWith(main);if(header)$('body > header')?.replaceWith(header);document.body.dataset.familyView=view;document.body.dataset.stitchSource=doc?.body.dataset.stitchSource||'dobby_le_salon_des_curiosit_s_famille_organisation';main.classList.add('fa-enter');
  if(view==='salon'){window.DobbyStitchRootAdapters.render('famille',data.state);renderSalon(data);}else if(view==='member-detail')window.DobbyFamilyMemberDetail.render(familyContext(data));else if(window.DobbyAccess?.handles(view))window.DobbyAccess.render(familyContext(data));else if(window.DobbyPreparations?.handles(view))window.DobbyPreparations.render(familyContext(data));else if(window.DobbyOnboarding?.handles(view))window.DobbyOnboarding.render({data,ui,pristine,main,bind,button,paragraph,context,notice,open,legacy,unavailable,rememberMember(id){if(!E.read().members.some(m=>m.id===id))throw Error('Membre non enregistré.');ui.person=id;window.history.replaceState({},'','#'+ui.view+'?person='+encodeURIComponent(id));}});else if(window.DobbyRegister?.handles(view))window.DobbyRegister.render(view,{data,ui,pristine,main,bind,button,paragraph,context,notice,open,legacy,unavailable,heading,text,selected,esc});else if(view==='members')renderMembers(data);else if(view==='member-edit')renderMemberEdit(data);else if(view==='agenda')renderAgenda(data);else if(view==='medical-edit')renderMedical(data);else healthSections(data);
  if(['medical-edit','health','health-person','health-history'].includes(view))gateMedicalUI();if(!window.DobbyOnboarding?.handles(view)&&!window.DobbyAccess?.handles(view))shell(data);gateSharedUI();window.DobbyChrome?.mount();window.DobbyFamilyReviewEffects?.mount();mountDraft(view,restoreDraft,previous,capture);formContext=['member-edit','medical-edit'].includes(view)?availability(data):null;main.style.visibility='visible';document.documentElement.classList.remove('dv7-loading');if(dialogDraft)showDialog(dialogDraft.kind,dialogDraft.id,dialogDraft.values);if(formContext)setTimeout(()=>refresh().catch(e=>notice(e.message)),0);
 }
 async function open(view,values={},history=true){if(window.DobbyRegister?.busy)await window.DobbyRegister.wait();const requested=view;
  if(!handles(view)&&view!=='salon')return false;if((view==='personal'||window.DobbyOnboarding?.handles(view))&&values.person===undefined)values={...values,person:null};captureDraft();busy=true;
  try{if(window.DobbyAccess?.handles(view)){ui.accessMode=values.mode||'login';ui.person=null;}if(values.origin)ui.origin=values.origin;if(['salon','members'].includes(values.memberOrigin))ui.memberOrigin=values.memberOrigin;if(['member-detail','member-edit'].includes(view)&&['salon','members'].includes(values.origin))ui.memberOrigin=values.origin;if(view==='memo-edit')ui.memoMode=values.mode||'edit';if(values.record===undefined&&view!==ui.view&&window.DobbyRegister?.handles(view))ui.record=null;if(view==='member-edit'&&(values.mode==='new'||(!ui.person&&!values.person))){ui.memberNew=true;ui.person=null;ui.memberCategory=values.category==='pet'?'pet':'child';ui.memberDraft ||= {name:'',birthdate:'',avatar:ui.memberCategory==='pet'?'🐾':'👤',memberCategory:ui.memberCategory};}else if(view==='member-edit'&&values.person){ui.memberNew=false;ui.memberDraft=null;ui.memberBaseline=null;}if(values.person!==undefined&&values.person!==ui.person){ui.person=values.person||null;ui.memberDraft=null;ui.visitDraft=null;}
   if(values.record!==undefined){if((values.record||null)!==ui.record)ui.visitDraft=null;ui.record=values.record||null;}if(values.scope){const scope=values.scope==='shared'?'shared':'local';if(scope!==ui.scope)ui.visitDraft=null;ui.scope=scope;}
   if(values.day&&/^\d{4}-\d{2}-\d{2}$/.test(values.day)&&!Number.isNaN(Date.parse(values.day+'T12:00:00')))ui.day=values.day;
   const data=E.read();if(!['personal','member-detail'].includes(view)&&!window.DobbyOnboarding?.handles(view)&&!window.DobbyAccess?.handles(view)&&!ui.person&&data.members.length&&!(view==='member-edit'&&ui.memberNew))ui.person=data.members[0].id;
   if(['member-edit','health-person'].includes(view)&&ui.person&&!data.members.some(x=>x.id===ui.person)){ui.person=null;view='members';notice('Cette personne n’est plus dans le registre.');}
   if(view==='personal'&&!values.person&&values.person!==undefined)ui.person=null;
   if(view==='medical-edit'&&ui.record&&!data[ui.scope==='shared'?'shared':'local'].some(r=>r.id===ui.record)){ui.record=null;ui.visitDraft=null;view=data.members.some(m=>m.id===ui.person)?'health-person':'members';notice('Ce rendez-vous n’existe plus. Le registre est conservé.');}
   dialogDraft=null;const routeParams=new URLSearchParams();if(ui.person){routeParams.set('person',ui.person);routeParams.set('memberOrigin',ui.memberOrigin);}if(view==='member-edit'&&ui.memberNew){routeParams.set('mode','new');routeParams.set('category',ui.memberCategory||'child');}if(ui.record&&(view==='medical-edit'||window.DobbyRegister?.handles(view)||window.DobbyPreparations?.handles(view))){routeParams.set('record',ui.record);routeParams.set('scope',ui.scope);}routeParams.set('origin',view==='member-detail'?ui.memberOrigin:ui.origin);if(view==='memo-edit')routeParams.set('mode',ui.memoMode);if(window.DobbyAccess?.handles(view)&&ui.accessMode)routeParams.set('mode',ui.accessMode);if(ui.day&&view==='agenda')routeParams.set('day',ui.day);const hash='#'+view+(routeParams.size?'?'+routeParams:'');if(history)window.history.pushState({},'',hash);else if(view!==requested)window.history.replaceState({},'',hash);if(!history){if(view==='member-edit')ui.memberDraft=null;if(view==='medical-edit')ui.visitDraft=null;}await render(view,!history,false);if(values.eventNew)showDialog('event',values.eventId);window.scrollTo(0,0);return true;
  }finally{busy=false;}
 }
 function memberDraft(){return window.DobbyFamilyMembersReview.memberDraft(familyContext());}
 async function act(action,el){if(window.DobbyRegister?.busy)await window.DobbyRegister.wait();
  if(sharedMutation(action)&&sharedReadOnly())throw Error(sharedReadReason);
  if(/^\s*Annuler/i.test(el.textContent||''))discardDraft();if(action==='dismiss'){$('#fa-notice').hidden=true;return;}
  if(action==='child-ceremony'){const member=E.read().members.find(row=>row.id===(el.dataset.person||ui.person));if(!member||!['child','baby'].includes(member.memberCategory))throw Error('Choisissez un profil enfant.');return window.DobbyCeremonies.open({memberId:member.id,auto:true});}
  if(action==='member-detail-back')return open(el.dataset.origin==='members'?'members':'salon');
  if(action==='member-magic'){if(!E.memberPermissions(el.dataset.person).canMagic)throw Error(E.memberPermissions(el.dataset.person).reason);return window.DobbyOnboarding.restart(el.dataset.kind,el.dataset.person);}
  if(handles(action)||action==='salon'){if(action==='member-edit'){ui.memberNew=false;ui.memberDraft=null;ui.memberBaseline=null;}return open(action,el.dataset);}
  if(action==='member-new'){ui.memberBaseline=null;ui.memberOrigin='members';ui.memberNew=true;ui.person=null;ui.memberCategory=el.dataset.category==='pet'?'pet':'child';ui.memberDraft={name:'',birthdate:'',avatar:ui.memberCategory==='pet'?'🐾':'👤',memberCategory:ui.memberCategory};await open('member-edit',{origin:'members',mode:'new',category:ui.memberCategory});return;}
  if(action==='member-save'){if(!ui.memberNew&&$('#member-form')?.dataset.memberBaseline!==JSON.stringify(E.read().members.find(row=>row.id===ui.person)||null))throw Error('La fiche a changé depuis son ouverture. Votre saisie est conservée ; consultez la nouvelle version avant d’enregistrer.');const draft=memberDraft();if(!$('#member-form').reportValidity())return;const id=await E.saveMember(ui.memberNew?null:ui.person,draft);discardDraft();ui.memberDraft=null;ui.memberNew=false;return open('member-detail',{person:id,origin:ui.memberOrigin||'members'});}
  if(action==='member-delete'){if(E.read().shared.some(r=>r.personId===(el.dataset.person||ui.person)))throw Error('Réattribuez ou supprimez d’abord les rendez-vous partagés de ce membre.');if(E.deleteMember(el.dataset.person||ui.person)){ui.person=null;ui.memberDraft=null;return open('members');}return;}
  if(action==='search-clear'){ui.query='';return render();}
  if(action==='contacts')return open('contacts',{record:null});
  if(ui.view==='salon'&&action==='rg-memo-new')return open('memo-edit',{record:null,scope:'shared',origin:'salon',mode:'new'});
  if(ui.view==='salon'&&action==='rg-memo-edit')return open('memo-edit',{record:el.dataset.record,scope:'shared',origin:'salon',mode:'read'});
  if(action.startsWith('prep-'))return window.DobbyPreparations.action(familyContext(),action,el);
  if(action.startsWith('rg-'))return window.DobbyRegister.act(action,el,{data:E.read(),ui});
  if(action==='back'&&$('#fa-dialog')?.dataset.famEvent!==undefined)return window.DobbyFamilyAgendaReview.closeEvent(agendaContext());
  if(action==='back'&&ui.view==='health-person'&&ui.origin==='member-detail')return open('member-detail',{person:ui.person,origin:ui.memberOrigin});
  if(action==='back'&&window.DobbyPreparations?.handles(ui.view))return window.DobbyPreparations.action(familyContext(),ui.view==='preparation-event'?'prep-event-back':ui.view==='preparation-model'?'prep-cancel':'prep-family-back',el);
  if(action==='back'){if(window.DobbyRegister?.handles(ui.view))return window.DobbyRegister.back();if(ui.view==='salon')return legacy('home');return open(ui.view==='member-edit'?'members':ui.view==='medical-edit'?'health-person':'salon');}
  if(action==='legacy'){if(handles(el.dataset.route))return open(el.dataset.route,{record:null});return legacy(el.dataset.route);}
  if(['account','menu','documents','home'].includes(action)){if(ui.view==='member-edit')ui.memberDraft=memberDraft();if(ui.view==='medical-edit')ui.visitDraft=visitDraft();return legacy(action);}
  return extraAction(action,el);
 }
 async function refresh(){
  if(window.DobbyAccess?.handles(ui.view)){window.DobbyAccess.refresh();return;}
  if(window.DobbyOnboarding?.handles(ui.view)){window.DobbyOnboarding.refresh();return;}
  if(!ready||busy||dialogDraft||window.DobbyPreparations?.busy||window.DobbyRegister?.busy||document.querySelector('#rg-form,#rg-log-form,.mp-editor:not([hidden])'))return;const data=E.read();for(const status of $$('.fa-sharing-status'))text(status,'Membres et agenda : '+data.status);
  const form=['member-edit','medical-edit'].includes(ui.view);let focus;
  if(form){if(availability(data)===formContext)return;const field=document.activeElement;if(field?.matches('input,textarea,select'))focus={id:field.id,start:field.selectionStart,end:field.selectionEnd};if(ui.view==='member-edit')ui.memberDraft=memberDraft();else ui.visitDraft=visitDraft();}
  else if(document.activeElement?.matches('input,textarea,select'))return;
  const legacyOpen=ui.view==='memos'&&$('[data-e09-legacy]')?.open;
  busy=true;try{await render();if(legacyOpen&&ui.view==='memos'&&$('[data-e09-legacy]'))$('[data-e09-legacy]').open=true;if(focus&&$('#dv7-panel')?.hidden){const field=document.getElementById(focus.id);field?.focus();if(field&&focus.start!==null&&field.setSelectionRange&&/^(text|search)$/.test(field.type||'text'))field.setSelectionRange(focus.start,focus.end);}}finally{busy=false;}
 }
 async function init(openLegacy){
  if(ready)return;legacy=openLegacy;rootMain=$('main').cloneNode(true);rootHeader=$('body > header').cloneNode(true);document.body.classList.add('fa-active');E.notices(notice);
  const parse=()=>{const[v,q]=location.hash.slice(1).split('?'),p=new URLSearchParams(q||'');return{view:handles(v)?v:'salon',day:p.get('day')||undefined,person:p.get('person')||undefined,record:p.get('record')||null,scope:p.get('scope')==='shared'?'shared':'local',mode:p.get('mode')||undefined,category:p.get('category')||undefined,origin:p.get('origin')||undefined,memberOrigin:p.get('memberOrigin')||undefined,eventNew:p.get('dialog')==='event',eventId:p.get('event')||undefined};};
  document.addEventListener('click',event=>{if(event.target.closest('#dv7-panel'))return;const el=event.target.closest('[data-fa-action]');if(!el)return;event.preventDefault();event.stopImmediatePropagation();busy=true;Promise.resolve(act(el.dataset.faAction,el)).catch(e=>notice(e.message)).finally(()=>busy=false);},true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('#fa-dialog')){event.preventDefault();if($('#fa-dialog').dataset.famEvent!==undefined){Promise.resolve(window.DobbyFamilyAgendaReview.closeEvent(agendaContext())).catch(e=>notice(e.message));return;}dialogDraft=null;$('#fa-dialog').remove();return;}const el=event.target.closest('[data-fa-action][role="button"]');if(el&&['Enter',' '].includes(event.key)){event.preventDefault();el.click();}});
  document.addEventListener('change',event=>{if(event.target.id==='fa-visit-scope'){ui.visitDraft=visitDraft();ui.scope=event.target.value;render();}if(event.target.id==='fa-visit-person'){ui.person=event.target.value||null;text($('#selected-member-label'),E.read().members.find(x=>x.id===ui.person)?.name||'Foyer');}});
  document.addEventListener('input',event=>{window.DobbyRegister?.input(event);if(event.target.id==='consultation-notes')text($('#char-counter'),event.target.value.length+' / 500');if(ui.view==='members'&&event.target.id==='search-input'){ui.query=event.target.value;renderMembers(E.read());$('#search-input').focus();}});
  document.addEventListener('submit',event=>{if(!['member-form','fa-medical-form','fa-native-form'].includes(event.target.getAttribute('id')))return;event.preventDefault();event.stopImmediatePropagation();busy=true;Promise.resolve(event.target.getAttribute('id')==='member-form'?act('member-save',event.target):saveForm(event.target)).catch(e=>notice(e.message)).finally(()=>busy=false);},true);
  window.addEventListener('popstate',()=>{const state=parse();open(state.view,state,false).catch(e=>notice(e.message));});
  const state=parse();await open(state.view,state,false);ready=true;
  new MutationObserver(()=>{if(ready&&!busy)refresh().catch(e=>notice(e.message));}).observe(E.win().document.getElementById('screen'),{childList:true});
 }
 // Agenda and medical adapters below reuse the same source shell and native forms.
 function renderAgenda(data){return window.DobbyFamilyAgendaReview.renderAgenda(agendaContext(data));}
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
  if(kind==='event')return window.DobbyFamilyAgendaReview.beginEvent(agendaContext(),id,values);
  if(kind==='event-read')return window.DobbyFamilyAgendaReview.showEvent(agendaContext(),id);
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
   if(form.dataset.kind==='event')return window.DobbyFamilyAgendaReview.saveEvent(agendaContext(),form);
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
  const agendaAction=window.DobbyFamilyAgendaReview.action(agendaContext(),action,el);if(agendaAction.handled)return agendaAction.value;
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
 return Object.freeze({init,open,refresh,discardDraft,sharedReadOnly,get ready(){return ready},get view(){return ui.view},handles});
})();

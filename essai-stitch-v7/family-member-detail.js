/* FAM-17. Reconstructed from the preserved Stitch source; native data only. */
window.DobbyFamilyMemberDetail=(()=>{'use strict';
 const node=(tag,value='',cls='')=>Object.assign(document.createElement(tag),{textContent:value,className:cls});
 const category=member=>({parent:'Parent',child:'Enfant',baby:'Bébé',pet:'Gardien — animal de compagnie'})[member.memberCategory]||'Membre du foyer';
 function mountChildAccess(section,member,{E,paragraph,notice},permission){
  const api=E.win?.()?.DobbyFamilyUI,account=api?.access,initial=account?.state?.();
  if(api?.childAccessState?.()?.restricted||initial?.profile?.memberCategory==='child')return;
  const action=(label,handler)=>{
   const control=node('button',label,'fa-button');control.type='button';control.addEventListener('click',handler);
   control.setAttribute('aria-describedby','fam-child-access-status');return control;
  };
  const status=paragraph('','fam-detail-status');status.id='fam-child-access-status';status.setAttribute('role','status');status.tabIndex=-1;
  const canInvite=permission.canLinkExistingChild===true&&typeof window.DobbyAccess?.inviteChild==='function';
  const attach=action('Donner accès à DOBBY',()=>void window.DobbyAccess.inviteChild(member.id).catch(error=>notice?.(error.message)));
  attach.dataset.backendGate='child-account-link';
  attach.disabled=!canInvite;attach.title=canInvite?'Créer une invitation pour ce profil existant.':'Le rattachement sécurisé attend une validation serveur.';
  if(!canInvite||initial?.capabilities?.childAccessProtocol!==1||!account.childAccessStatus||!account.suspendChildAccess){
   status.textContent=canInvite?'Créer une invitation pour ce profil existant. Son avatar, ses choix magiques, ses missions, ses Runes et son histoire seront conservés.':'Indisponible : le rattachement sécurisé d’un compte au profil existant attend une validation serveur. Le même profil, ses missions, ses Runes et son histoire devront être conservés.';
   section.append(attach,status);return;
  }
  const current=()=>{
   const live=account.state();
   return section.isConnected&&live.verified&&live.userId===initial.userId&&live.householdId===initial.householdId&&live.memberId===initial.memberId&&live.permissions?.canLinkExistingChild===true;
  };
  const controls=node('div');section.append(status,controls);
  const confirm=action('Confirmer la suspension',async()=>{
   if(!current())return;
   confirm.disabled=true;cancel.disabled=true;status.textContent='Suspension en cours…';
   try{show(await account.suspendChildAccess(member.id));if(current())status.focus();}
   catch{if(current())status.textContent='La suspension n’a pas pu être confirmée. Réessayez.';}
   finally{confirm.disabled=false;cancel.disabled=false;}
  });
  const cancel=action('Annuler',()=>{show({linked:true,active:true});if(current())suspend.focus();});
  const suspend=action('Suspendre l’accès à DOBBY',()=>{
   if(!current())return;
   status.textContent='Confirmez la suspension de la connexion de l’enfant. Sa fiche, ses missions et ses Runes seront conservées.';
   controls.replaceChildren(confirm,cancel);confirm.focus();
  });
  function show(access){
   if(!current())return;
   if(!access.linked){status.textContent='Créer une invitation pour cette fiche enfant existante.';controls.replaceChildren(attach);}
   else if(access.active){status.textContent='Ce profil est lié à un compte DOBBY.';controls.replaceChildren(suspend);}
   else{status.textContent='Accès suspendu. La fiche et son historique sont conservés.';controls.replaceChildren();}
  }
  status.textContent='Vérification de l’accès à DOBBY…';
  const read=()=>void account.childAccessStatus(member.id).then(show,()=>{
   if(current()){status.textContent='Impossible de vérifier l’accès à DOBBY pour ce profil.';controls.replaceChildren(retry);}
  });
  const retry=action('Réessayer',()=>{controls.replaceChildren();status.textContent='Vérification de l’accès à DOBBY…';read();});
  read();
 }
 function render(c){
  const {E,ui,main,button,paragraph}=c,member=c.data.members.find(row=>row.id===ui.person);main.replaceChildren();main.className='fam-detail-page';
  const origin=ui.memberOrigin==='members'?'members':'salon',back=button('member-detail-back',origin==='members'?'← Maisonnée':'← Salon',{origin});back.dataset.famDetailBack='';
  if(!member){main.append(node('h1','Membre introuvable'),paragraph('Choisissez une fiche actuelle dans le registre du foyer.'),back);return;}
  main.dataset.memberDetail=member.id;
  const pet=member.memberCategory==='pet';
  const permission=E.memberPermissions?.(member.id)||{canEdit:false,canMagic:false,reason:'Identité et droits non établis.'};
  const P=window.DobbyMagicIdentity,identity=member.magicProfile||{},house=pet?null:P.houses.find(row=>row.id===identity.houseId),patronus=P.patronuses.find(row=>row.id===identity.patronusId);
  if(house){main.dataset.house=house.id;for(const key of ['primary','accent','surface'])main.style.setProperty('--fam-'+key,house[key]);}
  const toolbar=node('div','','fam-detail-toolbar'),edit=button('member-edit','Modifier',{person:member.id,origin});edit.disabled=!permission.canEdit;if(edit.disabled){edit.title=permission.reason;edit.setAttribute('aria-description',permission.reason);}toolbar.append(back,edit);main.append(toolbar);
  const hero=node('section','','fam-detail-hero');const portrait=window.DobbyMemberAvatar.create(member,{className:'fam-detail-avatar'});if(pet){portrait.querySelector('.dobby-rune-badge')?.remove();for(const key of ['runeShape','runeMaterial','runeGrade','runeTotal'])delete portrait.dataset[key];portrait.removeAttribute('title');portrait.setAttribute('aria-label',member.name||'Animal gardien');}hero.append(portrait,node('h1',member.name||[member.firstName,member.lastName].filter(Boolean).join(' ')||'Membre du foyer'));
  if(member.nickname)hero.append(node('p','« '+member.nickname+' »','fam-detail-nickname'));
  const badges=node('div','','fam-detail-badges');badges.append(node('span',category(member)));if(!pet)badges.append(node('span',house?.name||'Maison à découvrir'));hero.append(badges);
  let summary;if(!pet)try{summary=E.rewardSummary(member.id);}catch{}
  if(summary?.credits?.length)hero.append(node('p',summary.grade.label,'fam-detail-grade'));main.append(hero);
  function section(title,cls=''){const el=node('section','','fam-detail-card '+cls);el.append(node('h2',title));main.append(el);return el;}
  const registry=section('Registre du Logis'),grid=node('dl','','fam-detail-registry');
  for(const [label,value]of [['Prénom',member.firstName],['Nom',member.lastName],['Surnom',member.nickname],['Identité enregistrée',!member.firstName&&!member.lastName?member.name:null],['Date de naissance',member.birthdate?(Number.isNaN(Date.parse(member.birthdate+'T12:00:00'))?member.birthdate+' (format à vérifier)':new Date(member.birthdate+'T12:00:00').toLocaleDateString('fr-BE')):null],['Catégorie',category(member)],['Espèce',pet?member.species:null],['Race',pet?member.breed:null]])if(value){const cell=node('div');cell.append(node('dt',label),node('dd',value));grid.append(cell);}
  registry.append(grid);if(!permission.canEdit)registry.append(paragraph(permission.reason||'Consultation en lecture seule.','fam-detail-status'));
  if(!pet){
  const magic=section('Consécrations Magiques','fam-detail-magic'),panels=node('div','','fam-detail-magic-grid');
  for(const [kind,title,result]of [['house','Maison',house],['patronus','Patronus',patronus]]){
   const panel=node('article','','fam-detail-magic-card');panel.append(node('h3',title));
   if(result){if(kind==='patronus')panel.append(window.DobbyMagicProfile.sprite(result,'patronus'));else{const mark=node('div',result.animal,'fam-detail-house-mark');mark.setAttribute('aria-label','Symbole textuel de la Maison, sans blason officiel');panel.append(mark);}panel.append(node('strong',result.name));const description=(kind==='house'?window.DobbyMagicContent?.houses:window.DobbyMagicContent?.patronuses)?.[result.id]?.description;if(description)panel.append(paragraph(description.split(/(?<=[.!?])\s+/)[0]));}
   else panel.append(paragraph(kind==='house'?'Maison à découvrir':'Patronus à découvrir'));
   if(!result){const test=button('member-magic',kind==='house'?'Découvrir sa Maison':'Découvrir son Patronus',{person:member.id,kind});test.disabled=!permission.canMagic;if(test.disabled)test.title=permission.reason;panel.append(test);}panels.append(panel);
  }
  magic.append(panels);
  const activity=section('Activité & Runes');
  if(summary){const total=node('strong',summary.total+' runes','fam-detail-rune-total');activity.append(total);if(summary.credits?.length)activity.append(paragraph(summary.grade.label));else activity.append(paragraph('Aucun gain confirmé.'));
   if(summary.grade?.next){const progress=document.createElement('progress');progress.max=summary.grade.progress.max;progress.value=summary.grade.progress.value;progress.setAttribute('aria-label','Progression vers '+summary.grade.next.label);activity.append(progress,paragraph(summary.grade.progress.remaining+' runes avant '+summary.grade.next.label));}
   if(summary.pending)activity.append(paragraph(summary.pending+' runes en attente de confirmation.'));
   activity.append(paragraph(summary.shared?summary.syncStatus:'Gains confirmés sur cet appareil.','fam-detail-status'));
  }else activity.append(paragraph('Historique de Runes en cours de chargement.'));
  activity.append(button('personal','Ouvrir le Grimoire personnel',{person:member.id,origin:'member-detail'}));
  }
  if(['child','baby'].includes(member.memberCategory)){
   const access=section('Accompagner l’enfant');
   if(!house||!patronus){const begin=button('child-ceremony','Découvrir sa Maison puis son Patronus',{person:member.id});begin.dataset.childCeremony='';begin.disabled=!permission.canMagic;if(begin.disabled)begin.title=permission.reason;access.append(paragraph('Les questionnaires natifs et les choix directs enregistrent les résultats sur ce profil, sans compte Auth.'),begin);}
   if(member.memberCategory==='child')mountChildAccess(access,member,c,permission);
  }
  const rituals=section(pet?'Notes du gardien':'Rituels & Mémoires');rituals.append(paragraph(member.notes||'Aucune mémoire personnelle enregistrée.','fam-detail-memory'));
  const health=section('Carnet de Santé & Soins','fam-detail-health');health.dataset.famDetailHealth='';
  const healthLink=()=>button('health-person','Consulter le carnet de santé',{person:member.id,origin:'member-detail'});
  if(!window.DobbyHealthRuntime||window.DobbyHealthRuntime.legacyDemo()){
   health.append(paragraph('Consulter le carnet existant sur cet appareil.'),healthLink());
  }else{
   const linkSlot=node('div','','health-member-slot');health.append(linkSlot);
   window.DobbyHealthRuntime.mountMember(linkSlot,member.id,healthLink);
  }
 }
 return Object.freeze({render,category});
})();

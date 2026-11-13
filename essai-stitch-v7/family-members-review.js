/* FAM-02–14. A presentation adapter over the native household member register. */
window.DobbyFamilyMembersReview=(()=>{'use strict';
 const categories=Object.freeze({baby:'Bébé',child:'Enfant',pet:'Gardien (animal de compagnie)',parent:'Parent'});
 const make=(tag,value='',className='')=>Object.assign(document.createElement(tag),{textContent:value,className});
 const has=(row,key)=>Object.prototype.hasOwnProperty.call(row||{},key);
 const categoryLabel=member=>categories[member?.memberCategory]||'';
 const displayName=member=>String(member?.firstName||member?.name||'Membre du foyer');
 const houseFor=member=>member?.memberCategory==='pet'?null:window.DobbyMagicIdentity?.houses.find(h=>h.id===member?.magicProfile?.houseId)||null;
 function permissions(c,id){
  try{const result=c.E?.memberPermissions?.(id)||{canEdit:false,canCreate:false,reason:'Associez votre compte à un membre du foyer pour gérer les fiches.'};return{...result,reason:result.reason?.startsWith('Modification suspendue :')?'Gestion suspendue : l’association vérifiée de votre compte au foyer reste à établir.':result.reason};}
  catch{return{canEdit:false,canCreate:false,reason:'Les droits de ce compte doivent être vérifiés avant toute modification.'};}
 }
 function createCard(c,member,{origin='members',compact=false}={}){
  const card=c.button('member-detail','',{person:member.id,origin});card.className='member-card fam-member-card'+(compact?' fam-member-card-compact':'');card.dataset.faMember=member.id;
  const house=houseFor(member);card.dataset.house=house?.id||'unassigned';
  if(house)for(const name of ['primary','accent','surface'])card.style.setProperty('--fam-house-'+name,house[name]);
  const avatar=window.DobbyMemberAvatar.create(member,{className:'fam-member-avatar'});
  let summary=null;try{summary=c.E?.rewardSummary(member.id);}catch{}
  // A zero/default grade and an old unclassified member are not evidence of a grade.
  const hasGrade=Boolean(member.memberCategory!=='pet'&&categoryLabel(member)&&summary?.grade&&summary.credits?.length);
  if(!hasGrade){avatar.querySelector('.dobby-rune-badge')?.remove();for(const key of ['runeShape','runeMaterial','runeGrade','runeTotal'])delete avatar.dataset[key];avatar.removeAttribute('title');avatar.setAttribute('aria-label',member.name||displayName(member));}
  const copy=make('span','','fam-member-copy');copy.append(make('span',displayName(member),'fam-member-name'));
  if(house)copy.append(make('span',house.name,'fam-member-house'));
  const category=categoryLabel(member);if(category)copy.append(make('span',compact&&member.memberCategory==='pet'?'Gardien':category,'fam-member-category'));
  if(hasGrade)copy.append(make('span',summary.grade.label,'fam-member-grade'));
  card.append(avatar,copy);return card;
 }
 function birthdays(members,now=new Date()){
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  return members.flatMap(member=>{
   const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(member.birthdate||'');if(!match)return[];
   const year=Number(match[1]),month=Number(match[2])-1,day=Number(match[3]),birth=new Date(year,month,day);
   if(birth.getFullYear()!==year||birth.getMonth()!==month||birth.getDate()!==day||birth>today)return[];
   const occurrence=y=>{const d=new Date(y,month,day);return d.getMonth()===month?d:new Date(y,month+1,0);};
   let date=occurrence(today.getFullYear());if(date<today)date=occurrence(today.getFullYear()+1);
   return[{member,date}];
  }).sort((a,b)=>a.date-b.date||displayName(a.member).localeCompare(displayName(b.member),'fr')).slice(0,3);
 }
 function page(c,kind){const main=c.main||document.querySelector('body > main');main.replaceChildren();main.className='fam-members-page fam-'+kind+'-page';return main;}
 function intro(c,main,title,backAction='salon',backLabel='Registre des Âmes du Logis',values={}){
  const header=make('div','','fam-members-heading'),back=c.button(backAction,'← '+backLabel,values);back.className='fam-members-back';header.append(back,make('h1',title,'fam-members-title'));main.append(header);return header;
 }
 function renderMembers(c){
  const main=page(c,'list'),data=c.data,ui=c.ui;intro(c,main,'Membres de la Maisonnée');
  const actions=make('div','','fam-members-actions'),add=c.button('member-new','Ajouter un enfant',{category:'child'}),pet=c.button('member-new','Ajouter un animal gardien',{category:'pet'});add.id='add-member-btn';pet.id='add-pet-btn';add.classList.add('fam-gold');
  const access=permissions(c,null);if(!access.canCreate)for(const b of [add,pet]){b.disabled=true;b.setAttribute('aria-describedby','fam-create-permission');}
  const invite=make('button','Inviter une personne à rejoindre la famille','fa-button');invite.type='button';invite.id='invite-member-btn';invite.dataset.magicControl='true';invite.setAttribute('aria-expanded','false');invite.setAttribute('aria-controls','fam-invite-panel');
  actions.append(add,pet,invite);main.append(actions);
  if(!access.canCreate){const reason=make('p',access.reason||'Votre compte doit être associé au foyer avant d’ajouter un membre.','fam-permission-message');reason.id='fam-create-permission';main.append(reason);}
  const invitation=make('section','','fam-invite-panel');invitation.id='fam-invite-panel';invitation.hidden=true;invitation.append(make('h2','Inviter une personne','fam-section-title'),make('p','Les adultes rejoignent le foyer avec leur propre compte. Le rattachement sécurisé des comptes et l’envoi des invitations doivent être activés avant de poursuivre.','fam-muted'));
  const emailLabel=make('label','Adresse e-mail','fam-field'),email=make('input');email.type='email';email.name='inviteEmail';email.disabled=true;email.placeholder='personne@exemple.be';emailLabel.append(email);const send=make('button','Envoyer l’invitation','fa-button fam-gold');send.type='button';send.disabled=true;invitation.append(emailLabel,send);main.append(invitation);
  const account=c.E.win?.()?.DobbyFamilyUI?.access?.state?.();
  if(account?.verified&&account.profile?.memberCategory==='child'){invite.disabled=true;invite.title='Les invitations sont réservées aux parents du foyer.';}
  if(account?.verified&&account.permissions?.canInvite&&window.DobbyAccess){invitation.remove();invite.setAttribute('aria-haspopup','dialog');invite.setAttribute('aria-controls','access-invite-dialog');invite.onclick=()=>window.DobbyAccess.invite().catch(error=>c.notice(error.message));}
  else invite.onclick=()=>{invitation.hidden=!invitation.hidden;invite.setAttribute('aria-expanded',String(!invitation.hidden));};
  const tools=make('section','','fam-member-tools');tools.setAttribute('aria-label','Rechercher un membre');
  const searchLabel=make('label','Rechercher un membre','fam-field'),search=make('input');search.id='search-input';search.type='search';search.placeholder='Prénom, nom ou surnom';search.value=ui.query||'';searchLabel.append(search);tools.append(searchLabel);
  const clear=c.button('search-clear','Effacer la recherche');clear.id='clear-search-btn';clear.hidden=!ui.query;tools.append(clear);main.append(tools);
  const list=make('section','','fam-member-list');list.id='members-list';list.setAttribute('aria-label','Membres du foyer');
  const query=(ui.query||'').toLocaleLowerCase('fr');const rows=data.members.filter(m=>!query||[m.name,m.firstName,m.lastName,m.nickname,categoryLabel(m)].filter(Boolean).join(' ').toLocaleLowerCase('fr').includes(query));
  for(const member of rows)list.append(createCard(c,member));if(!rows.length)list.append(make('p',data.members.length?'Aucun membre pour cette recherche.':'Aucun membre enregistré.','fam-empty'));main.append(list);
  const upcoming=make('section','','fam-birthdays');upcoming.id='fam-upcoming-birthdays';upcoming.append(make('h2','Prochains anniversaires','fam-section-title'));
  const dates=birthdays(data.members);if(dates.length){const ul=make('ul');for(const row of dates){const item=make('li');item.append(make('span',displayName(row.member)),make('time',row.date.toLocaleDateString('fr-BE',{day:'numeric',month:'long'})));item.lastElementChild.dateTime=[row.date.getFullYear(),String(row.date.getMonth()+1).padStart(2,'0'),String(row.date.getDate()).padStart(2,'0')].join('-');ul.append(item);}upcoming.append(ul);}else upcoming.append(make('p','Ajoutez une date de naissance pour retrouver les prochains anniversaires.','fam-muted'));main.append(upcoming);
 }
 function initialDraft(member){
  const row=member||{};return{...row,firstName:has(row,'firstName')?row.firstName:row.name||'',lastName:row.lastName||'',nickname:row.nickname||'',birthdate:row.birthdate||'',notes:row.notes||'',species:row.species||'',breed:row.breed||'',memberCategory:row.memberCategory||'',avatar:row.avatar||'👤'};
 }
 function field(form,id,name,label,value,{type='text',required=false,maxLength,rows}={}){
  const wrap=make('label',label,'fam-field');wrap.htmlFor=id;const input=make(rows?'textarea':'input');input.id=id;input.name=name;if(rows)input.rows=rows;else input.type=type;input.value=value||'';input.required=required;if(maxLength)input.maxLength=maxLength;wrap.append(input);form.append(wrap);return{wrap,input};
 }
 function renderMemberEdit(c){
  const data=c.data,ui=c.ui,member=ui.memberNew?null:data.members.find(m=>m.id===ui.person),draft=initialDraft(ui.memberDraft||member),main=page(c,'edit');
  const cancelAction=member?'member-detail':'members',cancelValues=member?{person:member.id,origin:ui.memberOrigin||ui.origin||'members'}:{};
  const pet=member?.memberCategory==='pet'||ui.memberNew&&(draft.memberCategory||ui.memberCategory)==='pet';
  intro(c,main,member?(pet?'Modifier l’animal gardien':'Modifier le membre'):(pet?'Ajouter un animal gardien':'Ajouter un enfant'),cancelAction,member?'Fiche du membre':'Membres de la Maisonnée',cancelValues);
  if(!ui.memberNew&&!member){main.append(make('p','Ce membre ne figure plus dans le registre.','fam-empty'));return;}
  const form=make('form','','fam-member-form');form.id='member-form';form.dataset.memberId=member?.id||'';form.dataset.originalName=member?.name||'';form.dataset.originalAvatar=draft.avatar;form.dataset.originalLastName=member?.lastName||'';form.dataset.originalNickname=member?.nickname||'';main.append(form);
  const access=permissions(c,member?.id||null),allowed=member?access.canEdit:access.canCreate;
  if(!allowed){const note=make('p',access.reason||'Votre compte doit être associé au foyer avant de modifier cette fiche.','fam-permission-message');note.id='fam-member-permission';form.append(note);}
  const identity=make('fieldset','','fam-member-identity');identity.disabled=!allowed;const legend=make('legend','Identité de l’enfant','fam-section-title');identity.append(legend);form.append(identity);
  const fixedCategory=member?.memberCategory||(ui.memberNew?(pet?'pet':'child'):'');
  const select=make('input');select.type='hidden';select.id='member-category';select.name='memberCategory';select.value=fixedCategory;identity.append(select);
  const first=field(identity,'member-firstname','firstName',pet?'Nom de l’animal *':'Prénom *',draft.firstName,{required:true,maxLength:80});
  const last=pet?null:field(identity,'member-lastname','lastName','Nom',draft.lastName,{maxLength:80});
  if(!pet)field(identity,'member-nickname','nickname','Surnom (facultatif)',draft.nickname,{maxLength:80});
  if(member&&!has(member,'firstName'))identity.append(make('p','L’identité historique est conservée entière. Vous pouvez la répartir entre Prénom et Nom.','fam-muted'));
  if(pet){field(identity,'member-species','species','Espèce *',draft.species,{required:true,maxLength:80});field(identity,'member-breed','breed','Race (facultative)',draft.breed,{maxLength:80});}
  legend.textContent=pet?'Identité de l’animal gardien':member&&!['child','baby'].includes(member.memberCategory)?'Identité du membre':'Identité de l’enfant';
  const birth=field(identity,'member-birthdate','birthdate','Date de naissance (facultative)',draft.birthdate,{type:'date'});
  if(draft.birthdate&&birth.input.value!==draft.birthdate){
   birth.input.dataset.legacyDate=draft.birthdate;birth.input.setCustomValidity('Vérifiez ou effacez explicitement l’ancienne date de naissance avant d’enregistrer.');
   const warning=make('p','Date à vérifier : « '+draft.birthdate+' ». Corrigez-la ou effacez-la.','fam-muted'),clear=make('button','Effacer l’ancienne date','fa-button');clear.type='button';clear.dataset.magicControl='true';
   const corrected=()=>{delete birth.input.dataset.legacyDate;birth.input.setCustomValidity('');warning.remove();clear.remove();};clear.onclick=corrected;birth.input.addEventListener('input',corrected);birth.wrap.append(warning,clear);
  }
  const appearance=make('fieldset','','fam-member-appearance');appearance.disabled=!allowed;appearance.append(make('legend','Avatar','fam-section-title'));
  const avatarLabel=make('label','Choisir un avatar','fam-field'),avatar=make('select');avatar.id='member-avatar';avatar.name='avatar';
  for(const value of [...new Set([draft.avatar,...(pet?['🐾','🐈','🐕','🐇','🐦','🐢']:['👤','👧','👦','🧒','👶','👩','👨'])])])avatar.add(new Option(value,value));avatar.value=draft.avatar;avatarLabel.append(avatar);appearance.append(avatarLabel);
  if(!pet){const portraitLabel=make('label','Portrait illustré','fam-field'),portrait=make('select');portrait.id='member-portrait';portrait.name='magicAvatarId';portrait.add(new Option('Utiliser l’avatar choisi',''));for(const row of window.DobbyMagicIdentity?.avatars||[])portrait.add(new Option(row.name,row.id));portrait.value=draft.magicProfile?.avatarId||'';portraitLabel.append(portrait);appearance.append(portraitLabel);}
  form.append(appearance);
  const notes=make('fieldset','','fam-member-notes');notes.disabled=!allowed;notes.append(make('legend',pet?'Notes du gardien':'Informations utiles','fam-section-title'));field(notes,'member-notes','notes',pet?'Notes (facultatives)':'Informations utiles et notes (facultatives)',draft.notes,{maxLength:4000,rows:4});form.append(notes);
  if(ui.memberNew&&!pet)form.append(make('p','Après l’enregistrement, accompagnez l’enfant pour découvrir sa Maison puis son Patronus : questionnaires natifs ou choix direct, sans créer de compte.','fam-muted'));
  const validateName=()=>{const full=[first.input.value.trim(),last?.input.value.trim()||''].filter(Boolean).join(' ');first.input.setCustomValidity(full.length>80?'Le prénom et le nom réunis ne peuvent pas dépasser 80 caractères.':'');};
  first.input.addEventListener('input',validateName);last?.input.addEventListener('input',validateName);validateName();
  const footer=make('div','','fam-member-form-actions'),save=c.button('member-save','Enregistrer le membre');save.classList.add('fam-gold');save.disabled=!allowed;if(!allowed)save.setAttribute('aria-describedby','fam-member-permission');footer.append(save,c.button(cancelAction,'Annuler',cancelValues));form.append(footer);
 }
 function memberDraft(c={}){
  const form=(c.main||document).querySelector('#member-form');if(!form)return c.ui?.memberDraft||{};
  const value=name=>form.elements.namedItem(name)?.value||'',firstName=value('firstName').trim(),lastName=(form.elements.namedItem('lastName')?value('lastName'):form.dataset.originalLastName||'').trim(),category=value('memberCategory');
  const result={name:[firstName,lastName].filter(Boolean).join(' '),firstName,lastName,nickname:(form.elements.namedItem('nickname')?value('nickname'):form.dataset.originalNickname||'').trim(),birthdate:form.elements.namedItem('birthdate')?.dataset.legacyDate||value('birthdate'),notes:value('notes'),species:value('species').trim(),avatar:value('avatar')||form.dataset.originalAvatar||'👤'};
  if(category)result.memberCategory=category;if(category==='pet')result.breed=value('breed').trim();if(form.elements.namedItem('magicAvatarId'))result.magicAvatarId=value('magicAvatarId');
  return result;
 }
 return Object.freeze({renderMembers,renderMemberEdit,memberDraft,createCard,displayName,categoryLabel,houseFor,birthdays});
})();

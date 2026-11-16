/* Stitch 19 access views inside the existing Family router and native Auth client. */
window.DobbyAccess = (() => {
  'use strict';
  const views = new Set(['access','access-welcome','access-auth','access-profile','access-create','access-join','access-confirmation','access-unavailable']);
  const E = window.DobbyFamilyStitchEngine;
  let incoming = window.DobbyAccessEntry?.consume();
  const model = import('./access-flow.mjs');
  const pendingKey = 'v7-incoming-invitation', recoveryKey='v7-access-recovery';
  let context, initialized, operation, unsubscribe, invitationToken = '', invitationType='generic', invitation = null;
  let callbackError = '', recovery = false, lastUser = null, creatingInvitation = null, loggingOut = false;
  const api = () => E.win().DobbyFamilyUI;
  const account = () => api().access;
  const state = () => account().state();
  const actorToken = (value=state()) => JSON.stringify([value.userId||null,value.householdId||null,value.memberId||null]);
  function assertActor(expected) {if(actorToken()!==expected)throw Error('Le compte ou le foyer a changé. Rechargez le formulaire avant de continuer.');}
  const el = (tag, text = '', className = '') => Object.assign(document.createElement(tag), {textContent:text,className});
  function button(text, action, secondary = false) {
    const b = el('button',text,secondary?'access-button access-secondary':'access-button');
    b.type='button'; b.dataset.accessControl=''; b.onclick=event=>{event.preventDefault();void run(action,event.currentTarget.closest('dialog'));}; return b;
  }
  function status(text, error = false, scope = document) {
    const target=(scope||document).querySelector('[data-access-status]'); if(!target)return;
    target.textContent=text; target.dataset.error=String(error); target.hidden=!text;
  }
  function publicError(error) {
    // Report only fixed stages/statuses and known Auth reasons. Server text may
    // contain account details and must never become a support diagnostic.
    const stage=error?.stage,code=error?.code;
    const http=Number.isInteger(error?.status)&&error.status>=100&&error.status<=599?String(error.status):'INDISPONIBLE';
    if(stage==='auth'){
      if(code==='invalid_credentials')return 'L’adresse e-mail ou le mot de passe n’a pas été reconnu. Référence : CONNEXION-'+http+'-IDENTIFIANTS.';
      if(code==='email_not_confirmed')return 'Votre adresse e-mail doit être confirmée avant la connexion. Référence : CONNEXION-'+http+'-EMAIL.';
      if(error?.status===429)return 'Trop de tentatives de connexion. Patientez avant de réessayer. Référence : CONNEXION-429.';
      return 'Le service de connexion n’a pas confirmé la demande. Référence : CONNEXION-'+http+'.';
    }
    if(stage==='context')return 'Le serveur n’a pas permis de vérifier l’accès au foyer. Référence : FOYER-'+http+'.';
    if(error?.message==='Ce navigateur conserve les données locales d’un autre foyer. Utilisez un profil de navigateur distinct.')return 'Ce navigateur conserve les données d’un autre foyer. Ouvrez DOBBY dans un profil de navigateur distinct. Référence : FOYER-LOCAL-AUTRE.';
    if(error?.message==='Le registre familial contient des modifications locales en attente ou un conflit.')return 'Le registre familial local contient une opération en cours ou un conflit. Vos données sont conservées. Référence : FOYER-LOCAL-ATTENTE.';
    if(error?.message==='Un registre familial local existe déjà. Comparez et sauvegardez ses données avant de rejoindre le foyer.')return 'Des données familiales locales doivent être examinées avant d’ouvrir ce foyer. Référence : FOYER-LOCAL-EXISTANT.';
    if(/adresse e.mail valide/i.test(error?.message||''))return 'Indiquez une adresse e-mail valide.';
    if(/réseau|network|fetch/i.test(error?.message||''))return 'La connexion est interrompue. Votre saisie est conservée ; réessayez.';
    if(/compte.*changé|foyer.*changé|contexte/i.test(error?.message||''))return 'Le compte ou le foyer a changé. Reconnectez-vous avant de continuer.';
    if(error?.status===401||error?.status===403)return 'La connexion ou l’accès au foyer n’a pas été confirmé. Vérifiez vos informations.';
    return 'L’action n’a pas pu être confirmée. Votre saisie est conservée ; réessayez.';
  }
  async function run(action, scope = null) {
    if(operation)return operation;
    operation=Promise.resolve().then(async()=>{
      const main=scope||context?.main;
      const controls=new Map(main?[...main.querySelectorAll('button,input,select,textarea')].map(control=>[control,control.disabled]):[]);
      if(main){main.setAttribute('aria-busy','true');for(const control of controls.keys())control.disabled=true;}
      status('Vérification en cours…',false,main);
      try { await action(); if((main||document).querySelector('[data-access-status]')?.textContent==='Vérification en cours…')status('',false,main); }
      catch(error) { status(publicError(error),true,main); }
      finally { if(main?.isConnected){main.removeAttribute('aria-busy');for(const[control,disabled]of controls)if(control.isConnected)control.disabled=disabled;} }
    }).finally(()=>operation=null);
    return operation;
  }
  function field(form, label, name, {type='text',value='',required=false,maxLength=100,autocomplete}={}) {
    const wrapper=el('label','','access-field'),copy=el('span',label),input=el('input');
    input.name=name;input.type=type;input.value=value;input.required=required;input.maxLength=maxLength;
    if(autocomplete)input.autocomplete=autocomplete;
    wrapper.append(copy,input);form.append(wrapper);return input;
  }
  function submit(form,label,action) {
    const b=el('button',label,'access-button');b.type='submit';b.dataset.accessControl='';form.append(b);
    form.onsubmit=event=>{event.preventDefault();event.stopImmediatePropagation();if(form.reportValidity())void run(action);};return b;
  }
  function image(src,alt) { const img=el('img');img.src=src;img.alt=alt;img.decoding='async';return img; }
  function shell(title,subtitle,{art=true}={}) {
    const main=context.main;main.replaceChildren();main.className='access-main';main.dataset.accessView=context.ui.view;
    document.body.dataset.accessActive='true';document.body.dataset.familyView=context.ui.view;
    const header=el('div','','access-brand');header.append(el('span','✦','access-star'),el('span','DOBBY'));
    const grid=el('div','','access-layout'),copy=el('section','','access-content'),heading=el('h1',title);
    heading.tabIndex=-1;copy.append(el('p','LE GRIMOIRE DU FOYER','access-kicker'),heading,el('p',subtitle,'access-intro'));
    const message=el('p','','access-status');message.dataset.accessStatus='';message.setAttribute('role','status');message.setAttribute('aria-live','polite');message.hidden=true;
    copy.append(message);
    if(art){const visual=el('aside','','access-visual');visual.append(image('./assets/onboarding/ritual-hearth-original.png','Dobby vous accueille auprès de la cheminée'));grid.append(visual);}
    grid.append(copy);main.append(header,grid);return copy;
  }
  async function rememberInvitation(value) {
    const {invitationReference}=await model,reference=invitationReference(value);
    invitationToken=reference.token;invitationType=reference.type;invitation=null;
    await api().putMeta(pendingKey,{token:invitationToken,...(invitationType==='child-account'?{type:invitationType}:{}),userId:state().userId||null});
  }
  async function clearInvitation(expected={token:invitationToken,type:invitationType,userId:state().userId||null},expectedActor=null) {
    let matched=false;
    await api().updateMeta(pendingKey,saved=>{
      if(expectedActor&&actorToken()!==expectedActor)return saved;
      if(saved&&(saved.token!==expected.token||(saved.type||'generic')!==(expected.type||'generic')||saved.userId&&saved.userId!==expected.userId))return saved;
      matched=true;return null;
    });
    if(matched&&(state().userId||null)===expected.userId&&invitationToken===expected.token&&invitationType===(expected.type||'generic')){invitationToken='';invitationType='generic';invitation=null;}
    return matched;
  }
  async function resumeHousehold() {
    const pending={token:invitationToken,type:invitationType,userId:state().userId||null};
    if(!pending.userId)throw Error('Connexion requise.');
    const fresh=await account().refresh();
    if(fresh.userId!==pending.userId||state().userId!==pending.userId)throw Error('Le compte a changé. Reconnectez-vous avant de continuer.');
    if(fresh.phase!=='active'||!fresh.authenticated||!fresh.verified||!fresh.householdId||!fresh.memberId)throw Error('Le rattachement au foyer n’a pas été confirmé.');
    const owner=actorToken(fresh),{destination}=await model;
    assertActor(owner);
    if(invitationToken!==pending.token||!await clearInvitation(pending,owner))throw Error('L’invitation a changé. Vérifiez le lien actuel avant de continuer.');
    assertActor(owner);
    await go(destination(state(),{invitationPending:false}));
  }
  function invitationInput(value) {
    const text=String(value||'').trim();
    if(text.startsWith('child:'))return text;
    try {const url=new URL(text);return url.searchParams.get('invite')||url.searchParams.get('invitation')||'';}
    catch {return text;}
  }
  async function initialize() {
    if(initialized)return initialized;
    initialized=(async()=>{
      await window.DobbyRegister.until(()=>!!api()?.connectionState?.().ready);
      await account().ready;
      if(incoming?.providerError){
        callbackError='Ce lien n’est plus valide. Connectez-vous ou demandez un nouveau lien.';
        try {await account().refresh();}catch {}
      } else if(incoming?.callbackURL){
        try {const {canonicalAuthCallback}=await model;const result=await account().confirmFromURL(canonicalAuthCallback(incoming.callbackURL,location.href));recovery=!!(result.recovery||incoming.recovery);}
        catch {callbackError='Ce lien de confirmation ne peut plus être utilisé ici. Connectez-vous ou demandez un nouveau lien.';try {await account().refresh();}catch {}}
      } else {try {await account().refresh();}catch {callbackError='La connexion au foyer n’a pas pu être vérifiée. Réessayez.';}}
      // Restore only after Auth/context refresh: the initial facade may still be blank.
      const saved=await api().meta(pendingKey),owner=state().userId;
      if(saved?.token&&(!saved.userId||saved.userId===owner)){invitationToken=saved.token;invitationType=saved.type==='child-account'?'child-account':'generic';}
      else if(saved?.userId&&saved.userId!==owner)await clearInvitation({token:saved.token,type:saved.type||'generic',userId:saved.userId});
      if(incoming?.invitation)await rememberInvitation(incoming.invitation);
      const recoveryRecord=await api().meta(recoveryKey);
      if(recovery&&owner)await api().putMeta(recoveryKey,{userId:owner});
      else recovery=!!(owner&&recoveryRecord?.userId===owner);
      incoming=null;
      lastUser=state().userId;
      unsubscribe=account().subscribe?.(next=>{
        if(lastUser&&next.userId!==lastUser){
          const previous={token:invitationToken,type:invitationType,userId:lastUser};
          invitationToken='';invitationType='generic';invitation=null;
          void clearInvitation(previous);recovery=false;void api().putMeta(recoveryKey,null);
          if(!loggingOut&&!(operation&&context?.ui.view==='access-auth'))location.replace('./famille.html#access');
        }
        lastUser=next.userId;
      });
    })();
    return initialized;
  }
  async function go(view,values={}) {
    if(view==='traverse'){location.replace('./traverse.html');return;}
    if(view==='ritual'){location.replace('./famille.html#onboarding-ritual?entry=session');return;}
    if(window.DobbyFamilyStitch?.ready)return window.DobbyFamilyStitch.open(view,values);
    const params=new URLSearchParams(values.mode?{mode:values.mode}:{});
    location.replace('./famille.html#'+view+(params.size?'?'+params:''));
  }
  async function next() {
    const {destination}=await model;
    const current=state();
    if(invitationToken&&current.userId)await api().putMeta(pendingKey,{token:invitationToken,...(invitationType==='child-account'?{type:invitationType}:{}),userId:current.userId});
    await go(destination(current,{invitationPending:!!invitationToken,invitationType}));
  }
  async function prepare(view) {
    await initialize();
    if(view==='access-join'&&invitationToken){try {invitation=await account()[invitationType==='child-account'?'previewChildInvitation':'previewInvitation'](invitationToken);}catch {invitation=null;}}
  }
  function welcome() {
    const copy=shell('Bienvenue dans DOBBY','Une maisonnée organisée, un peu de magie au quotidien.');
    context.main.classList.add('access-welcome');
    copy.append(el('p','Missions, repas, courses, événements, contrats et assurances : retrouvez les informations de votre foyer dans un même grimoire.','access-description'),button('Continuer',()=>go('access-auth',{mode:'login'})));
  }
  function authentication() {
    const mode=context.ui.accessMode||'login';
    const copy=shell('Entrer dans DOBBY','Retrouvez votre foyer ou commencez une nouvelle aventure.');
    const tabs=el('div','','access-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Accès à DOBBY');
    for(const [id,label]of [['login','Connexion'],['signup','Inscription'],['invite','Invitation']]){
      const tab=button(label,()=>id==='invite'?go('access-join'):go('access-auth',{mode:id}),true);
      tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(mode===id));tabs.append(tab);
    }copy.append(tabs);
    const form=el('form','','access-form');form.noValidate=false;
    const email=field(form,'Adresse e-mail','email',{type:'email',required:true,maxLength:254,autocomplete:'email'});
    const reset=mode==='recover',signup=mode==='signup';
    let password,confirmation;
    if(!reset){
      password=field(form,'Mot de passe','password',{type:'password',required:true,maxLength:4096,autocomplete:signup?'new-password':'current-password'});
      if(signup)confirmation=field(form,'Confirmer le mot de passe','confirmation',{type:'password',required:true,maxLength:4096,autocomplete:'new-password'});
      const show=button('Afficher le mot de passe',()=>{const reveal=password.type==='password';password.type=reveal?'text':'password';if(confirmation)confirmation.type=password.type;show.textContent=reveal?'Masquer le mot de passe':'Afficher le mot de passe';},true);form.append(show);
    }
    const action=submit(form,reset?'Envoyer le lien de récupération':signup?'Créer mon compte':'Se connecter',async()=>{
      if(signup&&password.value!==confirmation.value){confirmation.setCustomValidity('Les mots de passe doivent être identiques.');status('Les mots de passe doivent être identiques.',true);return;}
      const {authReturnURL}=await model;const redirectTo=authReturnURL(location.href);
      if(reset){await account().recover(email.value,{redirectTo});await go('access-confirmation');}
      else {await account()[signup?'signUp':'signIn'](email.value,password.value,{redirectTo});await next();}
    });
    if(confirmation){const clearMismatch=()=>confirmation.setCustomValidity('');confirmation.addEventListener('input',clearMismatch);password.addEventListener('input',clearMismatch);}
    if(!state().configured){action.disabled=true;action.dataset.unavailable='';status('La connexion est momentanément indisponible. Réessayez plus tard.',true);}
    copy.append(form);
    if(!signup&&!reset)copy.append(button('Mot de passe oublié',()=>go('access-auth',{mode:'recover'}),true));
    copy.append(button('Retour à l’accueil',()=>go('access-welcome'),true));
  }
  function profile() {
    const current=state();if(!current.authenticated){void go('access-auth',{mode:'login'});return;}
    if(invitationToken&&invitationType==='child-account'&&current.phase==='profile'){void go('access-join');return;}
    const editing=context.ui.accessMode==='edit',data=current.profile||{},owner=actorToken(current);
    if((editing||current.phase==='active')&&(!current.verified||current.permissions.canEdit!==true)){const copy=shell('Mon profil','Votre identité et votre portrait sont en lecture seule.');copy.append(el('p','Seul un parent du foyer peut modifier cette fiche. Vos choix de Maison et de Patronus restent accessibles depuis votre profil.'),button('Revenir à mon profil',()=>context.open('personal',{person:current.memberId}),true));return;}
    const copy=shell('Mon profil','Votre identité et votre portrait dans le foyer.');
    context.main.classList.add('access-profile');
    const form=el('form','','access-form');
    const first=field(form,'Prénom','firstName',{required:true,maxLength:80,value:data.firstName||'',autocomplete:'given-name'});
    const last=field(form,'Nom de famille','lastName',{maxLength:80,value:data.lastName||'',autocomplete:'family-name'});
    const date=field(form,'Date de naissance (facultative)','birthdate',{type:'date',value:data.birthdate||'',autocomplete:'bday'});
    const group=el('fieldset','','access-portraits'),legend=el('legend','Choisir mon portrait');group.append(legend);
    const chosen=data.avatarId||data.magicProfile?.avatarId||'portrait-1';
    const grid=el('div','','access-avatar-grid');
    for(const portrait of window.DobbyMagicIdentity.avatars.filter(row=>row.available!==false)){
      const label=el('label','','access-avatar'),input=el('input');input.type='radio';input.name='avatarId';input.value=portrait.id;input.required=true;input.checked=portrait.id===chosen;input.dataset.accessAvatar=portrait.id;input.setAttribute('aria-label',portrait.name);
      const art=window.DobbyMemberAvatar.create({name:'',magicProfile:{avatarId:portrait.id}},{className:'access-avatar-image'});
      label.append(input,art,el('span',portrait.name,'access-avatar-name'));grid.append(label);
    }group.append(grid);form.append(group);
    submit(form,'Enregistrer mon profil',async()=>{
      assertActor(owner);
      const selected=form.querySelector('[name=avatarId]:checked');
      await account().saveProfile({firstName:first.value,lastName:last.value,birthdate:date.value,avatarId:selected?.value||''},{expectedRevision:current.familyRevision});
      if(editing&&state().verified)return context.open('personal',{person:state().memberId});
      await next();
    });copy.append(form);
    if(editing)copy.append(button('Revenir à mon profil',()=>context.open('personal',{person:current.memberId}),true));
  }
  function createHousehold() {
    if(!state().authenticated){void go('access-auth',{mode:'login'});return;}
    const owner=actorToken();
    const copy=shell('Créer mon foyer','Donnez un nom à votre foyer. Vos proches pourront ensuite vous rejoindre sur invitation.');
    const form=el('form','','access-form'),name=field(form,'Nom du foyer','householdName',{required:true,maxLength:100,autocomplete:'off'});
    submit(form,'Créer mon foyer',async()=>{assertActor(owner);await account().createHousehold(name.value);if(!state().verified)throw Error('Foyer non confirmé.');await go('traverse');});
    copy.append(form,button('J’ai une invitation',()=>go('access-join'),true));
  }
  function invitationView() {
    const copy=shell('Rejoindre un foyer','Un lien ou un code personnel vous permet de retrouver le bon foyer.');
    const form=el('form','','access-form'),token=field(form,'Code ou lien d’invitation','invitation',{required:true,maxLength:2048,autocomplete:'off'});
    token.value=invitationToken?(invitationType==='child-account'?'child:':'')+invitationToken:'';token.spellcheck=false;
    const result=el('section','','access-invitation');result.dataset.accessInvitation='';result.setAttribute('aria-live','polite');
    function show() {
      result.replaceChildren();
      delete result.dataset.invitationState;
      if(!invitation){result.append(el('p','Vérifiez votre invitation avant de rejoindre le foyer.'));return;}
      result.dataset.invitationState=invitation.status;
      if(invitation.status!=='valid'){
        result.append(el('p',invitation.status==='expired'?'Cette invitation a expiré. Demandez un nouveau lien à la personne qui vous invite.':invitation.status==='unavailable'?'Le rattachement à ce profil enfant n’est pas encore disponible. La validation du service familial reste nécessaire.':'Cette invitation n’est pas valide ou n’est plus disponible.'));
        const current=state();
        if(current.userId)result.append(button(current.phase==='active'&&current.verified?'Accéder à mon foyer':'Vérifier mon accès au foyer',resumeHousehold));
        return;
      }
      result.append(el('p','UNE PLACE VOUS ATTEND','access-kicker'),el('h2',invitation.household.name),el('p','Invitation de '+invitation.inviter.name));
      if(invitationType==='child-account')result.append(el('p','Cette invitation ouvre l’accès à votre profil enfant existant. Votre avatar, vos choix magiques et votre histoire seront conservés.'));
      if(invitation.expiresAt){const when=new Date(invitation.expiresAt);if(Number.isFinite(when.getTime()))result.append(el('p','Valable jusqu’au '+when.toLocaleDateString('fr-FR'),'access-note'));}
      const current=state();
      if(current.authenticated&&(current.phase!=='profile'||invitationType==='child-account')){const owner=actorToken(current);result.append(button('Rejoindre ce foyer',async()=>{assertActor(owner);await account()[invitationType==='child-account'?'acceptChildInvitation':'acceptInvitation'](invitationToken);if(!state().verified)throw Error('Rattachement non confirmé.');await clearInvitation();await go('traverse');}));}
      else result.append(button(current.authenticated?'Créer mon profil':'Me connecter pour rejoindre',()=>go(current.authenticated?'access-profile':'access-auth',{mode:'login'})));
    }
    token.addEventListener('input',()=>{invitation=null;show();});
    submit(form,'Vérifier l’invitation',async()=>{await rememberInvitation(invitationInput(token.value));invitation=await account()[invitationType==='child-account'?'previewChildInvitation':'previewInvitation'](invitationToken);status('');show();});
    copy.append(form,result,button('Créer un nouveau foyer',async()=>{await clearInvitation();await go(state().authenticated?'access-create':'access-auth',{mode:'signup'});},true));show();
  }
  function confirmation() {
    const copy=shell('Consultez votre messagerie','Si votre adresse permet cette opération, un message contient le lien pour continuer.');
    copy.append(el('p','Ouvrez le lien dans ce navigateur pour reprendre le parcours. Vous pourrez aussi confirmer votre adresse puis revenir vous connecter.','access-description'),button('Revenir à la connexion',()=>go('access-auth',{mode:'login'})));
  }
  function passwordRecovery() {
    const copy=shell('Choisir un nouveau mot de passe','Votre identité a été confirmée par le lien reçu.');
    const form=el('form','','access-form'),password=field(form,'Nouveau mot de passe','password',{type:'password',required:true,maxLength:4096,autocomplete:'new-password'}),confirm=field(form,'Confirmer le mot de passe','confirmation',{type:'password',required:true,maxLength:4096,autocomplete:'new-password'});
    submit(form,'Enregistrer mon mot de passe',async()=>{if(password.value!==confirm.value){confirm.setCustomValidity('Les mots de passe doivent être identiques.');status('Les mots de passe doivent être identiques.',true);return;}await account().updatePassword(password.value);recovery=false;await api().putMeta(recoveryKey,null);await next();});const clearMismatch=()=>confirm.setCustomValidity('');confirm.addEventListener('input',clearMismatch);password.addEventListener('input',clearMismatch);copy.append(form);
  }
  function unavailable() {
    const copy=shell('Le foyer n’est pas encore accessible','Votre accès n’a pas pu être confirmé. Vos données existantes sont conservées.');
    copy.append(button('Réessayer',async()=>{await account().refresh();await next();}),button('Revenir à la connexion',()=>go('access-auth',{mode:'login'}),true));
  }
  function render(value) {
    context=value;
    if(context.ui.view==='access'){
      const current=state();const initial=!current.authenticated&&current.phase==='unavailable'?'access-welcome':null;
      const copy=shell('Ouverture de DOBBY','Votre foyer est en cours de vérification.');copy.setAttribute('aria-busy','true');
      setTimeout(()=>{if(recovery)passwordRecovery();else if(callbackError)void go('access-auth',{mode:'login'});else if(initial)void go(initial);else void next();},0);return;
    }
    if(recovery){passwordRecovery();return;}
    const renderer={'access-welcome':welcome,'access-auth':authentication,'access-profile':profile,'access-create':createHousehold,'access-join':invitationView,'access-confirmation':confirmation,'access-unavailable':unavailable}[context.ui.view];
    renderer?.();if(callbackError){status(callbackError,true);callbackError='';}
  }
  function leave() {delete document.body.dataset.accessActive;context=null;}
  function refresh() {if(context?.ui.view==='access-auth'&&!state().configured)status('La connexion est momentanément indisponible. Réessayez plus tard.',true);}
  async function boot() {
    if(window.DobbyReview||window.DobbyGlobalDemo)return;
    if(!window.DobbyStitchV7?.ready){setTimeout(boot,100);return;}
    try {await initialize();if(document.body.dataset.dv7Screen==='traverse'&&state().verified)await window.DobbyCeremonies?.openPending();}
    catch {if(context)status('La connexion au foyer n’a pas pu être vérifiée. Réessayez.',true);}
  }
  async function invitationDialog(memberId=null) {
    await initialize();const current=state(),child=memberId!==null;
    if(!current.verified||current.permissions.canInvite!==true)throw Error('Invitation non autorisée.');
    let target;
    if(child){target=E.read().members.find(member=>member.id===memberId);if(!target||target.memberCategory!=='child'||current.permissions.canLinkExistingChild!==true||E.memberPermissions(memberId).canLinkExistingChild!==true)throw Error('Le rattachement sécurisé d’un compte enfant n’est pas encore disponible.');}
    const owner=actorToken(current);
    const title=child?'Donner accès à DOBBY':'Inviter un proche',dialog=el('dialog','','access-invite-dialog');dialog.id='access-invite-dialog';dialog.setAttribute('aria-label',title);
    const close=button('Fermer',()=>{dialog.close();dialog.remove();},true),info=el('p',child?'Ce lien ouvrira l’accès au profil existant de '+(target.name||target.firstName||'cet enfant')+'. Son avatar, ses choix magiques et son histoire seront conservés.':'Ce lien personnel donnera accès à votre foyer après confirmation.');
    const output=el('textarea');output.readOnly=true;output.setAttribute('aria-label','Lien personnel d’invitation');output.hidden=true;
    const generate=button('Créer un lien d’invitation',async()=>{
      assertActor(owner);const scope=child?'child:'+memberId:'generic';if(creatingInvitation?.scope!==scope)creatingInvitation={scope,id:crypto.randomUUID()};
      const created=await account()[child?'createChildInvitation':'createInvitation']({...(child?{memberId}:{}),operationId:creatingInvitation.id});assertActor(owner);creatingInvitation=null;
      const {childInvitationReference}=await model;const link=new URL('../',location.href);link.searchParams.set('invite',child?childInvitationReference(created.token):created.token);output.value=link.href;output.hidden=false;info.textContent='Lien créé pour '+created.household.name+'. Partagez-le uniquement avec la personne invitée.';
    });
    const message=el('p','','access-status');message.dataset.accessStatus='';message.setAttribute('role','status');message.setAttribute('aria-live','polite');message.hidden=true;
    dialog.append(el('h2',title),info,message,generate,output,button('Copier le lien',async()=>{if(!output.hidden){await navigator.clipboard.writeText(output.value);status('Lien copié.',false,dialog);}},true),close);
    dialog.addEventListener('cancel',event=>{if(operation)event.preventDefault();else dialog.remove();});document.body.append(dialog);dialog.showModal();
  }
  function logout(scope) {
    return run(async()=>{
      loggingOut=true;
      try {
        await account().logout();
        if(api().connectionState?.().userId||state().userId)throw Error('Le compte a changé. Reconnectez-vous avant de continuer.');
        callbackError='';recovery=false;
        await go('access-welcome');
      } finally {loggingOut=false;}
    },scope);
  }
  window.addEventListener('pageshow',event=>{if(event.persisted)void boot();});
  window.addEventListener('load',()=>void boot(),{once:true});
  return Object.freeze({handles:view=>views.has(view),prepare,render,refresh,leave,invite:()=>invitationDialog(),inviteChild:memberId=>invitationDialog(memberId),logout,editProfile:()=>go('access-profile',{mode:'edit'}),get busy(){return !!operation;}});
})();

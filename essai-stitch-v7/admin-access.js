/* Lot 4: owner views over the closed Lot 3 command protocol. No local role grants access. */
window.DobbyAdminAccess = (() => {
  'use strict';
  const routes = ['admin-access','admin-invite','admin-requests','admin-status','admin-history'];
  const labels = ['Accès','Inviter','Demandes familiales','Suspendre / Réactiver','Historique'];
  const E = window.DobbyFamilyStitchEngine;
  const api = () => E.win().DobbyFamilyUI;
  const access = () => api()?.access;
  const state = () => access()?.state() || {};
  const enabled = () => window.DobbyPublicConfig?.privateAdministrationAvailable === true && !E.win()?.DobbyReview;
  function eligible() {
    if(!enabled())return false;
    const native=api(),session=native?.connectionState?.(),current=state();
    return session?.ready === true && !!session.userId &&
      current.phase !== 'rejected' && current.profile?.memberCategory !== 'child' &&
      native.childAccessState?.()?.restricted === false && typeof access()?.admin === 'function';
  }
  // Owner administration belongs to the Auth session, not to a household
  // binding being adopted/rechecked. This fingerprint only cancels stale
  // work; a fresh Edge owner check remains the sole authorization proof.
  const actor = (value = state()) => {
    const native=api()?.connectionState?.();
    return JSON.stringify([native && Object.hasOwn(native,'userId') ? native.userId || null : value.userId || null,Number.isSafeInteger(native?.epoch) ? native.epoch : null]);
  };
  const el = (tag,text = '',className = '') => Object.assign(document.createElement(tag),{textContent:text,className});
  const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  const admissionStates = {requested:'Invitation en attente',approved:'Admission approuvée',delivering:'Livraison en cours ou incertaine',sent:'Envoi confirmé',accepted:'Admission consommée',rejected:'Demande refusée',revoked:'Admission révoquée'};
  const purposes = {'new-household':'Nouveau foyer','family-parent':'Parent d’un foyer existant','family-child':'Enfant existant'};
  const statuses = {active:'Actif',suspended:'Suspendu',unapproved:'Non approuvé'};
  const canManageStatus = account => !(account.status==='unapproved' && account.revision===0 && !(account.admissions || []).some(admission=>admission.targetUserId===account.userId));
  const unapprovedWithoutAdmission = 'Aucune admission liée à ce compte n’est confirmée dans ce registre. Il reste non approuvé. Une invitation approuvée et liée à ce compte est nécessaire pour gérer son autorisation.';
  let context = null, epoch = 0, sequence = 0, proof = null, prepared = null, busy = false, initialized = null;
  let cache = {items:[],requests:[],decisions:[],nextCursor:null,nextRequestsCursor:null,nextDecisionCursor:null};
  let lastActor = null, wasEligible = false, selectedUser = '', selectedCursor = null, inviteEmail = '', notice = null;
  const entries = new Set(), dialogs = new Set(), menuReads = new WeakMap(), accountCursors = new Map();

  function ticket() { return {epoch,actor:actor(),sequence}; }
  function current(t) { return !!t && eligible() && t.epoch === epoch && t.actor === actor(); }
  function assertCurrent(t) { if(!current(t))throw Object.assign(Error('stale_actor'),{code:'stale_actor'}); }
  function clear() {
    epoch++; sequence++; proof = null; prepared = null; notice = null; selectedUser = ''; selectedCursor = null; inviteEmail = ''; busy = false;accountCursors.clear();
    cache = {items:[],requests:[],decisions:[],nextCursor:null,nextRequestsCursor:null,nextDecisionCursor:null};
    for(const entry of entries)entry.remove(); entries.clear();
    for(const dialog of dialogs){if(dialog.open)dialog.close();dialog.remove();} dialogs.clear();
  }
  function invalidate() {
    clear();
    if(context?.main?.isConnected && routes.includes(context.ui.view))renderUnavailable('L’accès à l’administration doit être vérifié à nouveau. Vos données locales sont conservées.');
  }
  async function initialize() {
    if(initialized)return initialized;
    initialized = (async () => {
      await window.DobbyRegister.until(() => !!api()?.connectionState?.().ready);
      await access().ready;
      lastActor = actor(); wasEligible = eligible();
      const observeActor = () => {
        const nextActor = actor(), allowed = eligible();
        if(nextActor !== lastActor || (wasEligible && !allowed))invalidate();
        lastActor = nextActor; wasEligible = allowed;
      };
      access().subscribe?.(observeActor);
      E.win().addEventListener('dobby:account-change',observeActor);
    })().catch(error => {initialized=null;throw error;});
    return initialized;
  }
  function problem(error,mutation = false) {
    if(error?.status === 401 || error?.status === 403)return 'L’accès propriétaire n’a pas été confirmé par le serveur. Reconnectez-vous pour faire vérifier votre session.';
    if(error?.status === 409)return 'L’état a changé ou cette décision n’est pas disponible. Actualisez les états avant une nouvelle confirmation.';
    if(error?.code === 'stale_actor')return 'Le compte a changé. Cette réponse ne peut pas rétablir l’accès précédent.';
    if(mutation)return 'La réponse n’a pas été confirmée. Consultez les accès et l’historique avant toute nouvelle tentative : la décision ou l’envoi peut avoir été enregistré.';
    return 'Le serveur est indisponible. Aucun accès propriétaire n’a pu être vérifié. Votre saisie est conservée.';
  }
  async function command(name,payload,t) {
    assertCurrent(t);
    let result;
    try { result = await access().admin(name,payload); }
    catch(error) {
      if(current(t) && (error?.status === 401 || error?.status === 403))invalidate();
      throw error;
    }
    assertCurrent(t);
    if(!result || typeof result !== 'object' || Array.isArray(result))throw Error('invalid_projection');
    return result;
  }
  function listProjection(result,kind) {
    const cursor = value => value === null || uuid(value);
    const revision = value => Number.isSafeInteger(value) && value >= 0;
    const admission = row => row && uuid(row.id) && Object.hasOwn(admissionStates,row.state) &&
      Object.hasOwn(purposes,row.purpose) && revision(row.revision);
    const account = row => row && uuid(row.userId) && typeof row.isOwner === 'boolean' &&
      Object.hasOwn(statuses,row.status) && revision(row.revision) &&
      Array.isArray(row.admissions) && row.admissions.every(admission);
    const decision = row => row && uuid(row.id) && typeof row.action === 'string';
    if(result.protocol !== 1 || !cursor(result.nextCursor) || !Array.isArray(result.items) ||
       !result.items.every(kind === 'access' ? account : decision) ||
       (kind === 'access' && (!cursor(result.nextRequestsCursor) || !Array.isArray(result.requests) || !result.requests.every(admission))))throw Error('invalid_projection');
    return result;
  }
  async function prepare(view) {
    const id = ++sequence;
    proof = null;
    try {
      if(!enabled())return;
      await initialize();
      if(id !== sequence)return;
      const t = ticket(),kind = view === 'admin-history' ? 'history' : 'access';
      const payload={limit:25};
      // A status target selected on a later page must be reloaded from that
      // same server page, rather than silently replaced by its first account.
      if(view==='admin-status' && selectedUser && selectedCursor)payload.cursor=selectedCursor;
      const result = listProjection(await command(kind === 'history' ? 'listDecisions' : 'listAccess',payload,t),kind);
      if(id !== sequence || !current(t))return;
      if(kind === 'history'){cache.decisions=result.items;cache.nextDecisionCursor=result.nextCursor || null;}
      else {cache.items=result.items;cache.requests=result.requests;cache.nextCursor=result.nextCursor || null;cache.nextRequestsCursor=result.nextRequestsCursor || null;accountCursors.clear();for(const item of result.items)accountCursors.set(item.userId,payload.cursor || null);}
      proof = t; prepared = {view,actor:t.actor};
    } catch(error) {
      if(id !== sequence)return;
      proof = null; prepared = {view,actor:actor(),error};
    }
  }
  function button(label,action,{secondary=false,danger=false,disabled=false}={}) {
    const node = el('button',label,'admin-button'+(secondary?' admin-secondary':'')+(danger?' admin-danger':''));
    node.type='button';node.disabled=disabled;node.onclick=event=>{event.preventDefault();if(!node.disabled)void action();};return node;
  }
  function link(view,label) {
    const node=el('a',label,'admin-tab');node.href='./famille.html#'+view;node.dataset.adminTab=view;
    if(context?.ui.view===view)node.setAttribute('aria-current','page');
    node.onclick=event=>{event.preventDefault();void context.open(view);};return node;
  }
  function message(text,error = false,scope = context?.main) {
    const node=scope?.querySelector('[data-admin-status]');if(!node)return;
    node.textContent=text;node.hidden=!text;node.dataset.error=String(error);node.setAttribute('role',error?'alert':'status');
  }
  function shell() {
    const main=context.main;main.replaceChildren();main.className='admin-main';main.dataset.adminView=context.ui.view;
    delete document.body.dataset.accessActive;
    const back=link('menu','← Menu');back.className='admin-back';delete back.dataset.adminTab;
    const hero=el('header','','admin-hero'),crest=el('span','admin_panel_settings','material-symbols-outlined admin-crest');crest.setAttribute('aria-hidden','true');
    const heading=el('h1','Administration DOBBY');heading.tabIndex=-1;
    hero.append(crest,el('p','LE REGISTRE DES ACCÈS','admin-kicker'),heading,el('p','Décisions d’accès et invitations. Les contenus privés des foyers restent dans leurs grimoires.','admin-intro'));
    const live=el('p','','admin-status');live.dataset.adminStatus='';live.hidden=true;live.setAttribute('aria-live','polite');
    main.append(back,hero,live);return main;
  }
  function renderUnavailable(copy) {
    const main=shell();main.append(el('h2','Administration indisponible'),button('Vérifier à nouveau',()=>reload(),{secondary:true}));
    message(copy,true);return main;
  }
  function section(title,copy = '') {
    const node=el('section','','admin-section');node.append(el('h2',title));if(copy)node.append(el('p',copy,'admin-note'));context.main.append(node);return node;
  }
  function badge(text,tone = '') {return el('span',text,'admin-badge'+(tone?' admin-badge-'+tone:''));}
  function empty(parent,text) {const node=el('p',text,'admin-empty');node.dataset.adminEmpty='';parent.append(node);}
  function detail(parent,label,value) {
    const row=el('div','','admin-detail');row.append(el('dt',label),el('dd',value == null || value === '' ? '—' : String(value)));parent.append(row);
  }
  function date(value) {const parsed=new Date(value);return value && !Number.isNaN(parsed.valueOf())?new Intl.DateTimeFormat('fr-BE',{dateStyle:'medium',timeStyle:'short'}).format(parsed):'—';}
  function accountLabel(id) {return cache.items.find(item=>item.userId===id)?.email || id || '—';}
  function more(parent,kind) {
    const cursor={accounts:cache.nextCursor,requests:cache.nextRequestsCursor,history:cache.nextDecisionCursor}[kind];
    if(!cursor)return;
    const node=button('Afficher la suite',()=>loadMore(kind),{secondary:true});node.dataset.adminMore=kind;parent.append(node);
  }
  function admissionCard(admission,{actions=true}={}) {
    const card=el('article','','admin-card admin-admission');card.dataset.adminRequest=admission.id;
    card.append(el('h3',admission.email || 'Adresse indisponible'),badge(admissionStates[admission.state] || 'État indisponible',admission.state==='accepted'?'good':admission.state==='delivering'?'warn':''));
    const details=el('dl');detail(details,'Type',purposes[admission.purpose] || 'Indisponible');
    if(admission.requestedBy)detail(details,'Demandeur',accountLabel(admission.requestedBy));
    if(admission.memberId)detail(details,'Profil enfant existant',admission.memberId);
    if(admission.approvedAt)detail(details,'Approbation',date(admission.approvedAt));
    if(admission.expiresAt)detail(details,'Expiration',date(admission.expiresAt));card.append(details);
    if(admission.state==='sent')card.append(el('p','Le service confirme l’envoi. L’admission n’est pas encore consommée.','admin-note'));
    if(admission.state==='delivering')card.append(el('p','La livraison n’est pas confirmée. Ne considérez pas le message comme envoyé. Une reprise exige une confirmation explicite.','admin-warning'));
    if(admission.state==='approved')card.append(el('p','La décision est enregistrée. Aucun envoi n’est confirmé par cet état.','admin-note'));
    if(admission.state==='accepted')card.append(el('p','Admission effectivement consommée. Le statut courant du compte reste à consulter dans Accès.','admin-note'));
    const child=admission.purpose==='family-child';
    if(child)card.append(el('p','L’accès avec un compte enfant n’est pas encore disponible. Le profil enfant local et ses données sont conservés.','admin-warning'));
    if(actions){
      const controls=el('div','','admin-actions');
      if(admission.state==='requested'){
        controls.append(button('Approuver',()=>decide(admission,'approve'),{disabled:child}),button('Refuser',()=>decide(admission,'reject'),{secondary:true,danger:true}));
      }
      if(['approved','delivering'].includes(admission.state))controls.append(button('Reprendre la livraison',()=>resume(admission),{secondary:true,disabled:child}));
      if(['requested','approved','delivering','sent'].includes(admission.state))controls.append(button('Révoquer l’admission',()=>revoke(admission),{secondary:true,danger:true}));
      if(controls.childElementCount)card.append(controls);
    }
    return card;
  }
  function accountsView() {
    const parent=section('Accès','Les autorisations et admissions sont distinctes. Une invitation envoyée ne prouve pas une admission consommée.');
    if(!cache.items.length)empty(parent,'Aucun compte dans cette page du registre.');
    for(const account of cache.items){
      const card=el('article','','admin-card');card.dataset.adminAccount=account.userId;
      const top=el('div','','admin-card-top');top.append(el('h3',account.email || 'Adresse indisponible'),badge(statuses[account.status] || 'Indisponible',account.status==='active'?'good':account.status==='suspended'?'danger':'warn'));card.append(top);
      if(account.isOwner)card.append(badge('Propriétaire'));
      const details=el('dl');detail(details,'E-mail confirmé',account.confirmed===true?'Oui':'Non');detail(details,'Création d’un foyer autorisée',account.canCreateHousehold===true?'Oui':'Non');card.append(details);
      if(!account.admissions?.length)card.append(el('p','Aucune admission récente.','admin-note'));
      else {const admissions=el('details','','admin-disclosure');admissions.append(el('summary',`Admissions récentes (${account.admissions.length})`));for(const admission of account.admissions)admissions.append(admissionCard(admission));card.append(admissions);}
      if(!account.isOwner && canManageStatus(account)){const action=button('Gérer le statut',async()=>{selectedUser=account.userId;selectedCursor=accountCursors.get(account.userId) || null;await context.open('admin-status');},{secondary:true});action.dataset.adminSelect=account.userId;card.append(action);}
      else if(!account.isOwner)card.append(el('p',unapprovedWithoutAdmission,'admin-note'));
      parent.append(card);
    }
    more(parent,'accounts');
    const pending=section('Admissions sans compte lié');if(!cache.requests.length)empty(pending,'Aucune admission sans compte lié dans cette page.');for(const request of cache.requests)pending.append(admissionCard(request));more(pending,'requests');
  }
  function field(parent,label,name,{type='text',value='',required=false}={}) {
    const wrapper=el('label','','admin-field'),input=el('input');input.name=name;input.type=type;input.required=required;input.value=value;input.maxLength=254;if(type==='email')input.autocomplete='email';wrapper.append(el('span',label),input);parent.append(wrapper);return input;
  }
  function inviteView() {
    const parent=section('Inviter','Une approbation propriétaire précède la livraison. Le destinataire confirme ensuite son admission et son profil.');
    const form=el('form','','admin-form');form.dataset.adminInvite='';
    const email=field(form,'Adresse e-mail','email',{type:'email',value:inviteEmail,required:true});email.oninput=()=>{inviteEmail=email.value;};
    const type=el('label','','admin-field'),select=el('select');select.name='purpose';select.append(Object.assign(el('option','Nouveau foyer'),{value:'new-household'}));type.append(el('span','Type d’invitation'),select);form.append(type);
    form.append(el('p','Pour rejoindre un foyer existant, un parent crée d’abord une demande nominative depuis Famille.','admin-note'));
    const submit=button('Préparer le récapitulatif',()=>{});submit.type='submit';submit.onclick=null;form.append(submit);
    form.onsubmit=event=>{event.preventDefault();if(form.reportValidity())void confirmMutation({title:'Approuver cette invitation ?',lines:[['Destinataire',email.value.trim().toLowerCase()],['Type','Nouveau foyer']],consequences:'La décision autorise une admission. Un envoi sera tenté ; sa confirmation reste distincte de l’activation du compte.',confirm:'Approuver et tenter l’envoi',command:'invite',payload:{email:email.value.trim().toLowerCase(),purpose:'new-household'}});};
    parent.append(form);
  }
  function requestsView() {
    const parent=section('Demandes familiales','Demandes nominatives et historique de leur traitement. Aucun contenu privé des foyers n’est affiché.');
    const requests=[...cache.requests,...cache.items.flatMap(item=>item.admissions || [])].filter(row=>['family-parent','family-child'].includes(row.purpose));
    const seen=new Set();for(const request of requests){if(seen.has(request.id))continue;seen.add(request.id);parent.append(admissionCard(request));}
    if(!seen.size)empty(parent,'Aucune demande familiale dans ces pages du registre.');
    more(parent,'requests');more(parent,'accounts');
    parent.append(el('p','Les demandes déjà liées à un compte apparaissent aussi dans ses admissions récentes.','admin-note'));
  }
  function statusView() {
    const parent=section('Suspendre / Réactiver','Le statut sera confirmé par le serveur à partir du dernier état vérifié.');
    const candidates=cache.items.filter(item=>!item.isOwner);
    if(selectedUser && !candidates.some(item=>item.userId===selectedUser)){
      empty(parent,'Le compte sélectionné n’est plus présent dans la page vérifiée. Aucune action ne sera appliquée à un autre compte.');
      parent.append(button('Choisir un autre compte',()=>{selectedUser='';selectedCursor=null;render(context.ui.view,context);},{secondary:true}));return;
    }
    if(!candidates.length){empty(parent,'Aucun compte modifiable dans cette page.');more(parent,'accounts');return;}
    if(!selectedUser){selectedUser=candidates[0].userId;selectedCursor=accountCursors.get(selectedUser) || null;}
    const wrapper=el('label','','admin-field'),select=el('select');select.name='userId';select.dataset.adminTarget='';
    for(const item of candidates){const option=el('option',`${item.email || item.userId} — ${statuses[item.status] || 'Indisponible'}`);option.value=item.userId;select.append(option);}select.value=selectedUser;
    wrapper.append(el('span','Compte concerné'),select);parent.append(wrapper);
    const selected=el('div','','admin-status-target');parent.append(selected);
    const draw=()=>{selectedUser=select.value;selectedCursor=accountCursors.get(selectedUser) || null;const target=candidates.find(item=>item.userId===selectedUser);selected.replaceChildren();if(!target)return;
      selected.append(badge(statuses[target.status] || 'Indisponible'));
      if(!canManageStatus(target)){selected.append(el('p',unapprovedWithoutAdmission,'admin-note'));return;}
      const active=target.status==='suspended';
      selected.append(el('p',active?'La réactivation ne restaure aucun ancien lien. Une nouvelle session vérifiée est obligatoire ; une nouvelle admission peut être nécessaire.':'La suspension coupe les accès authentifiés et révoque les admissions ouvertes. Des liens Storage déjà signés peuvent rester utilisables jusqu’à leur expiration.','admin-warning'));
      const action=button(active?'Réactiver ce compte':'Suspendre ce compte',()=>changeStatus(target,active?'active':'suspended'),{danger:!active});action.dataset.adminStatusAction=active?'active':'suspended';selected.append(action);
    };select.onchange=draw;draw();more(parent,'accounts');
  }
  const decisionLabels={invite:'Invitation approuvée',approve:'Demande approuvée',reject:'Demande refusée',revokeAdmission:'Admission révoquée',setStatus:'Statut modifié',suspend:'Suspension',reactivate:'Réactivation'};
  function historyView() {
    const parent=section('Historique','Journal en lecture seule : décision, date, acteur, cible et type d’opération, tels que projetés par le serveur.');
    if(!cache.decisions.length)empty(parent,'Aucune décision dans cette page du journal.');
    for(const decision of cache.decisions){
      const card=el('article','','admin-card');card.dataset.adminDecision=decision.id;card.append(el('h3',decisionLabels[decision.action] || 'Décision d’accès'),el('p',date(decision.decidedAt),'admin-note'));
      const details=el('dl');detail(details,'Décision',decision.id);detail(details,'Action',decision.action);detail(details,'Acteur',accountLabel(decision.actorUserId));detail(details,'Cible',accountLabel(decision.targetUserId));
      if(decision.admissionId)detail(details,'Admission',decision.admissionId);
      if(decision.beforeStatus || decision.afterStatus)detail(details,'Statut',`${statuses[decision.beforeStatus] || decision.beforeStatus || '—'} → ${statuses[decision.afterStatus] || decision.afterStatus || '—'}`);
      if(decision.revision != null)detail(details,'Révision',decision.revision);card.append(details);parent.append(card);
    }
    more(parent,'history');
  }
  function render(view,value) {
    // Support render(context), as used by the neighbouring access controller.
    context=value || view;view=typeof view==='string'?view:context.ui.view;
    if(!proof || !current(proof) || prepared?.view!==view || prepared?.actor!==actor() || prepared?.error){renderUnavailable(problem(prepared?.error));return;}
    shell();
    const nav=el('nav','','admin-tabs');nav.setAttribute('aria-label','Administration DOBBY');for(let index=0;index<routes.length;index++)nav.append(link(routes[index],labels[index]));context.main.append(nav);
    ({'admin-access':accountsView,'admin-invite':inviteView,'admin-requests':requestsView,'admin-status':statusView,'admin-history':historyView}[view])();
    const refresh=button('Actualiser les états',()=>reload(),{secondary:true});refresh.dataset.adminRefresh='';context.main.append(refresh);
    if(notice)message(notice.text,notice.error);
  }
  async function reload() {
    if(busy || !context)return;const saved=context,view=context.ui.view;
    message('Vérification des états en cours…');
    await prepare(view);
    if(context===saved && saved.main.isConnected && saved.ui.view===view)render(view,saved);
  }
  async function loadMore(kind) {
    if(busy || !proof || !current(proof))return;
    const operation={};busy=operation;const t=ticket(),main=context.main;
    try {
      const payload={limit:25};
      if(kind==='history')payload.cursor=cache.nextDecisionCursor;
      else if(kind==='accounts')payload.cursor=cache.nextCursor;
      else payload.requestsCursor=cache.nextRequestsCursor;
      const result=listProjection(await command(kind==='history'?'listDecisions':'listAccess',payload,t),kind==='history'?'history':'access');
      if(kind==='history'){cache.decisions.push(...result.items);cache.nextDecisionCursor=result.nextCursor || null;}
      else if(kind==='accounts'){cache.items.push(...result.items);cache.nextCursor=result.nextCursor || null;for(const item of result.items)accountCursors.set(item.userId,payload.cursor || null);}
      else {cache.requests.push(...result.requests);cache.nextRequestsCursor=result.nextRequestsCursor || null;}
      if(context?.main===main && main.isConnected)render(context.ui.view,context);
    } catch(error) {if(current(t))message(problem(error),true,main);}
    finally {if(busy===operation)busy=false;}
  }
  function resultMessage(name,result,payload) {
    if(name==='setStatus'){
      if(result.status!==payload.status)return 'Le statut demandé n’est pas confirmé. Actualisez les états et l’historique avant toute nouvelle action.';
      if(result.status==='active' && result.sessionBoundaryPending===false)return 'Réactivation confirmée par le serveur. Une nouvelle session vérifiée est obligatoire ; aucun ancien lien n’est restauré.';
      if(result.status==='suspended' && result.sessionBoundaryPending===false)return 'Suspension confirmée par le serveur. Les liens Storage déjà signés restent soumis à leur propre expiration.';
      return 'Le statut n’est pas entièrement confirmé. Actualisez les états et l’historique avant toute nouvelle action.';
    }
    const admission=result.admission,delivery=result.delivery;
    if(admission?.state==='accepted')return 'Admission effectivement consommée, confirmée par le serveur.';
    if(admission?.state==='rejected')return 'Refus enregistré par le serveur. Aucun envoi n’a été demandé.';
    if(admission?.state==='revoked')return 'Révocation enregistrée par le serveur. Cette admission ne peut plus être consommée.';
    if(delivery?.outcome==='sent' || admission?.state==='sent')return 'Décision enregistrée. Envoi confirmé par le service. L’admission n’est pas encore consommée.';
    if(delivery?.state==='failed' && delivery?.outcome!=='uncertain')return 'Décision enregistrée. Envoi échoué selon le service. Une nouvelle tentative exige une reprise explicitement confirmée.';
    if(delivery?.outcome==='uncertain' || delivery?.requiresResume || admission?.state==='delivering')return 'Décision enregistrée. Livraison en cours ou incertaine : aucun envoi confirmé. Vérifiez les états avant une reprise explicite.';
    if(admission?.state==='approved')return 'Approbation enregistrée. Aucun envoi n’est confirmé. Vérifiez les états avant une reprise explicite.';
    return 'La réponse ne confirme pas la décision. Vérifiez les états et l’historique avant toute nouvelle action.';
  }
  function confirmedResult(name,result,payload) {
    if(name==='setStatus')return result.status===payload.status && result.sessionBoundaryPending===false;
    if(result.delivery?.outcome==='uncertain' || result.delivery?.requiresResume || result.delivery?.state==='failed')return false;
    return ['accepted','rejected','revoked','sent'].includes(result.admission?.state) || result.delivery?.outcome==='sent';
  }
  async function confirmMutation({title,lines,consequences,confirm,command:name,payload}) {
    if(busy || !proof || !current(proof))return;
    const t=ticket(),origin=context,dialog=el('dialog','','admin-dialog');dialog.dataset.adminConfirmation='';
    const form=el('form'),heading=el('h2',title);heading.id='admin-confirm-title';dialog.setAttribute('aria-labelledby',heading.id);
    const details=el('dl');for(const [key,value] of lines)detail(details,key,value);
    const check=el('label','','admin-check'),input=el('input');input.type='checkbox';input.name='confirmed';input.required=true;check.append(input,el('span','Je confirme cette décision pour le destinataire indiqué.'));
    const live=el('p','','admin-status');live.dataset.adminStatus='';live.setAttribute('aria-live','polite');live.hidden=true;
    const controls=el('div','','admin-actions'),cancel=button('Annuler',()=>dialog.close(),{secondary:true}),submit=button(confirm,()=>{},{disabled:true});submit.type='submit';submit.onclick=null;submit.dataset.adminConfirm='';input.onchange=()=>{submit.disabled=!input.checked;};controls.append(cancel,submit);
    form.append(heading,details,el('p',consequences,'admin-warning'),check,live,controls);dialog.append(form);document.body.append(dialog);dialogs.add(dialog);
    const previousFocus=document.activeElement;dialog.addEventListener('close',()=>{dialogs.delete(dialog);dialog.remove();if(previousFocus?.isConnected)previousFocus.focus();},{once:true});
    form.onsubmit=async event=>{
      event.preventDefault();if(busy || !input.checked || !form.reportValidity())return;
      if(!current(t) || context!==origin || !origin.main.isConnected){dialog.close();return;}
      const operation={};busy=operation;for(const control of form.querySelectorAll('button,input'))control.disabled=true;form.setAttribute('aria-busy','true');message('Décision en cours de vérification…',false,dialog);
      try {
        const operationId=crypto.randomUUID();
        const result=await command(name,{...payload,operationId},t);assertCurrent(t);
        notice={text:resultMessage(name,result,payload),error:!confirmedResult(name,result,payload)};
        dialog.close();
        // Read after the mutation, never resend it. The receipt and delivery remain distinct.
        await prepare(origin.ui.view);
        if(current(t) && context===origin && origin.main.isConnected)render(origin.ui.view,origin);
      } catch(error) {
        if(current(t) && dialog.isConnected){message(problem(error,true),true,dialog);cancel.disabled=false;cancel.textContent='Fermer et vérifier les états';cancel.onclick=()=>{dialog.close();void reload();};}
      } finally {if(busy===operation)busy=false;form.removeAttribute('aria-busy');}
    };
    dialog.showModal();cancel.focus();
  }
  function decide(admission,decision) {
    return confirmMutation({title:decision==='approve'?'Approuver cette demande ?':'Refuser cette demande ?',lines:[['Destinataire',admission.email],['Type',purposes[admission.purpose]]],consequences:decision==='approve'?'L’approbation enregistre la décision et tente une livraison. L’envoi et la consommation de l’admission sont vérifiés séparément.':'Le refus ferme cette demande. Aucun compte ni envoi ne sera créé par cette décision.',confirm:decision==='approve'?'Approuver et tenter l’envoi':'Confirmer le refus',command:'decide',payload:{admissionId:admission.id,decision,expectedRevision:admission.revision}});
  }
  function revoke(admission) {
    return confirmMutation({title:'Révoquer cette admission ?',lines:[['Destinataire',admission.email]],consequences:'Cette admission et ses liens ouverts ne pourront plus être consommés. Un compte déjà actif doit être suspendu séparément.',confirm:'Confirmer la révocation',command:'revokeAdmission',payload:{admissionId:admission.id,expectedRevision:admission.revision}});
  }
  function resume(admission) {
    return confirmMutation({title:'Reprendre la livraison ?',lines:[['Destinataire',admission.email]],consequences:'Cette action explicite ouvre une nouvelle tentative. Un précédent message peut avoir été livré. Une tentative encore en cours doit d’abord arriver à son délai de reprise.',confirm:'Confirmer la reprise',command:'resumeDelivery',payload:{admissionId:admission.id,expectedRevision:admission.revision,confirmed:true}});
  }
  function changeStatus(target,status) {
    return confirmMutation({title:status==='suspended'?'Suspendre ce compte ?':'Réactiver ce compte ?',lines:[['Compte',target.email],['Statut demandé',statuses[status]]],consequences:status==='suspended'?'Les accès authentifiés et admissions ouvertes seront refusés. Les données locales sont conservées. Des liens Storage déjà signés peuvent rester utilisables jusqu’à expiration.':'La réactivation impose une nouvelle session vérifiée. Aucun ancien lien ni droit de création de foyer n’est restauré. Une nouvelle admission peut être nécessaire.',confirm:status==='suspended'?'Confirmer la suspension':'Confirmer la réactivation',command:'setStatus',payload:{userId:target.userId,status,expectedRevision:target.revision,confirmed:true}});
  }
  async function decorateMenu(value) {
    if(!enabled())return false;
    const main=value.main,read={};menuReads.set(main,read);
    for(const old of main.querySelectorAll('[data-admin-entry]')){entries.delete(old);old.remove();}
    try {
      await initialize();const t=ticket();
      listProjection(await command('listAccess',{limit:1},t),'access');
      if(!current(t) || menuReads.get(main)!==read || !main.isConnected || value.ui.view!=='menu' || document.body.dataset.familyView!=='menu')return false;
      const parent=main.querySelector('#menu-sections');if(!parent)return false;
      const entry=el('a','','module-item rg-menu-card admin-menu-card');entry.href='./famille.html#admin-access';entry.dataset.adminEntry='';
      const icon=el('span','admin_panel_settings','rg-menu-icon material-symbols-outlined');icon.setAttribute('aria-hidden','true');
      const arrow=el('span','chevron_right','material-symbols-outlined');arrow.setAttribute('aria-hidden','true');
      const copy=el('span','','admin-menu-copy');copy.append(el('span','Administration DOBBY','rg-menu-label'),el('span','Comptes, invitations et décisions d’accès','admin-note'));entry.append(icon,copy,arrow);
      entry.onclick=event=>{event.preventDefault();if(current(t))void value.open('admin-access');};parent.append(entry);entries.add(entry);value.filterMenu?.();return true;
    } catch {return false;}
  }
  function leave() {if(context || proof || prepared)clear();else sequence++;context=null;}
  return Object.freeze({handles:view=>routes.includes(view),enabled,eligible,prepare,render,leave,decorateMenu,get busy(){return !!busy;}});
})();

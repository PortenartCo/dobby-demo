/* Supabase household modules. Files remain in Storage (never JSON), and medical
   records stay outside the shared document payload. */
(function(){
'use strict';
const api = window.DobbyFamilyUI;
if (!api) throw Error('Dobby Family UI unavailable');
const DEFINITIONS = [
  { id:'menus', title:'Repas et menus', keys:['planned','shopHistory','shopFinal','shopChoice'], pages:['plan','pick','shop'] },
  { id:'recipes', title:'Recettes et Thermomix', keys:['customRecipes','tmAdaptations'], pages:['recipes'] },
  { id:'missions', title:'Missions familiales', keys:['autoTasks','manualMissions','runeCredits'], pages:['missions'] },
  { id:'house', title:'Maison et entretiens', keys:['houseItems','houseLogs'], pages:['house'] },
  { id:'family', title:'Membres, contacts et listes', keys:['familyMembers','famContacts','famLists','familyEvents','sharedHealthVisits'], pages:['family'] },
  { id:'contracts', title:'Documents et contrats du foyer', keys:[], pages:['documents'] }
];
const byId = new Map(DEFINITIONS.map(x=>[x.id,x]));
let ctx = null, backendReady = false, checked = false, states = {}, inFlight = false;
let timer = null, applying = false, lastError = '', sharedAvailable = [];
const esc = api.esc;
function isSharedDocument(x) {
  return x && (x.category==='Contrats'||x.category==='Assurances'||x.sharedToHousehold===true);
}
function pick(id) {
  if (id === 'contracts') {
    const permitted = ['id','title','category','person','date','deadline','provider','reference',
      'tags','note','sharedToHousehold','cloudPath','cloudName','cloudType','cloudSize'];
    return {contracts:(st.familyDocs || []).filter(isSharedDocument).map(x=>{
      const record={};for(const key of permitted)if(x[key]!==undefined)record[key]=x[key];return record;
    })};
  }
  const definition = byId.get(id);
  if (!definition) throw Error('Module inconnu');
  const data = {};
  for (const key of definition.keys) {
    if (st[key] !== undefined) data[key] = JSON.parse(JSON.stringify(st[key]));
  }
  if(id==='missions'){data.runeCredits=st.runeCredits||[];data.runeLedgerVersion=1;}
  return data;
}
function digest(value) { return JSON.stringify(value); }
function canonical(value){return Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;}
function missionDigest(value){return digest(canonical(value));}
function moduleDigest(id,value){return id==='missions'?missionDigest(value):digest(value);}

// Rewards are append-only; mutable mission conflicts still use the existing chooser.
let runes;
function missionPayload(payload){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Payload Missions invalide');
 if(payload.runeLedgerVersion!==undefined&&payload.runeLedgerVersion!==1)throw Error('Version de runes incompatible');
 if(payload.runeLedgerVersion===1&&!Array.isArray(payload.runeCredits))throw Error('Historique familial de runes invalide');
 if(payload.runeCredits!==undefined&&payload.runeLedgerVersion!==1)throw Error('Version de runes absente');
 for(const key of ['autoTasks','manualMissions'])if(payload[key]!==undefined&&!Array.isArray(payload[key]))throw Error('Registre Missions invalide');
 return payload;
}
function rememberedCredits(){const raw=states.missions?.synced;if(!raw)return [];return JSON.parse(raw).runeCredits||[];}
function retainedCredits(payload){missionPayload(payload);return runes.mergeCredits(payload.runeCredits||[],runes.mergeCredits(st.runeCredits||[],rememberedCredits()));}
function editableMissions(payload){return{autoTasks:payload.autoTasks||[],manualMissions:payload.manualMissions||[]};}
function pendingRunes(){if(!Array.isArray(st.runeCredits||[])||!Array.isArray(st.runeRequests||[]))return true;const ids=new Set((st.runeCredits||[]).map(c=>c?.missionId));return(st.runeRequests||[]).some(c=>!c||!ids.has(c.missionId));}
function initialPayload(id){const payload=pick(id);return id==='missions'?{...payload,runeCredits:runes.acceptRequests(payload.runeCredits,st.runeRequests||[],1)}:payload;}
function synchronized(id,revision,payload){return{active:true,revision,synced:moduleDigest(id,id==='missions'?payload:pick(id)),conflict:false,...(id==='missions'?{runeProtocol:payload.runeLedgerVersion===1}:{})};}
function markMissionsShared(id){if(id==='missions'&&!st.runeSyncRequired){st.runeSyncRequired=true;save();}}
function applyCredits(credits){const before=applying;applying=true;try{st.runeCredits=runes.mergeCredits(credits,runes.mergeCredits(st.runeCredits||[],rememberedCredits()));save();render();}finally{applying=before;}}
function verifyProtocol(state,remote){
 missionPayload(remote.payload);
 if((state.runeProtocol||JSON.parse(state.synced||'{}').runeLedgerVersion===1)&&remote.payload.runeLedgerVersion!==1)throw Error('Version Missions incompatible : historique de runes absent du partage. Synchronisation bloquée.');
}
async function syncMissions(state,remote){
 let credits;
 try{verifyProtocol(state,remote);credits=retainedCredits(remote.payload);}catch(error){state.conflict={remote,runes:true};await persist();throw error;}
 const local=pick('missions'),base=JSON.parse(state.synced||'{}'),localEditable=missionDigest(editableMissions(local)),remoteEditable=missionDigest(editableMissions(remote.payload)),baseEditable=missionDigest(editableMissions(base));
 if(localEditable!==baseEditable&&remoteEditable!==baseEditable&&localEditable!==remoteEditable){
  applyCredits(credits);state.conflict={remote};await persist();return;
 }
 const revision=Number(remote.revision);if(!Number.isSafeInteger(revision)||revision<1)throw Error('Révision familiale invalide');
 const fields=localEditable!==baseEditable?editableMissions(local):editableMissions(remote.payload);
 const desired={...fields,runeCredits:runes.acceptRequests(credits,st.runeRequests||[],revision+1),runeLedgerVersion:1};
 if(missionDigest(desired)===missionDigest(remote.payload)){
  applyShared('missions',desired);Object.assign(state,synchronized('missions',revision,desired));await persist();return;
 }
 const result=await api.authorized('PATCH',rowQuery('missions')+'&revision=eq.'+encodeURIComponent(revision),{payload:desired},{Prefer:'return=representation'});
 if(!result?.length){state.conflict={remote:await readRow('missions')};await persist();return;}
 const confirmed=result[0];missionPayload(confirmed.payload);if(Number(confirmed.revision)!==revision+1||confirmed.payload.runeLedgerVersion!==1||missionDigest(confirmed.payload)!==missionDigest(desired))throw Error('Confirmation des runes incohérente');
 // A user can still edit or delete a mission while PATCH is in flight. Never
 // replace that newer local edit with the sent snapshot; only acknowledge credits.
 if(missionDigest(editableMissions(pick('missions')))===localEditable)applyShared('missions',confirmed.payload);else applyCredits(confirmed.payload.runeCredits);
 Object.assign(state,synchronized('missions',Number(confirmed.revision),confirmed.payload));await persist();
}

function seededExampleMeals() {
  // Fresh V5 demos include exactly three placeholder meals. No silent deletions.
  if (st.demoInitialized !== true || !st.planned || typeof st.planned !== 'object') return false;
  const rows = Object.entries(st.planned);
  if (rows.length !== 3 || st.shopFinal || Object.keys(st.shopHistory || {}).length) return false;
  const samples = [['chicken','soir',4],['pasta','soir',4],['toast','midi',2]];
  return samples.every(([id,slot,people]) => rows.some(([date,m]) =>
    /^\d{4}-\d{2}-\d{2}-(midi|soir)$/.test(date) &&
    date.endsWith('-' + slot) &&
    m?.id === id && Number(m.people) === people && m.status === 'prévu' &&
    Object.keys(m).every(key => ['id','people','status'].includes(key))
  ));
}
function storageKey() { return 'v2-module-state:' + ctx.userId + '|' + ctx.householdId; }
async function persist() { if (ctx) await api.putMeta(storageKey(), states); }
function rowQuery(id) {
  return 'dobby_v2_modules?select=module,payload,revision,updated_at&household_id=eq.' +
    encodeURIComponent(ctx.householdId) + '&module=eq.' + encodeURIComponent(id);
}
async function readRow(id) {
  const list = await api.authorized('GET', rowQuery(id));
  if (!Array.isArray(list) || list.length > 1) throw Error('Réponse module incohérente');
  return list[0] || null;
}
function backupLocal(id) {
  const key = 'dobby-v5-family-before-sync-' + id + '-' + new Date().toISOString();
  localStorage.setItem(key, digest(pick(id)));
}
function applyShared(id, payload) {
  const def = byId.get(id);
  if (!def || !payload || typeof payload !== 'object' || Array.isArray(payload)) throw Error('Payload invalide');
  if(id==='missions'&&states.missions&&(states.missions.runeProtocol||JSON.parse(states.missions.synced||'{}').runeLedgerVersion===1)&&payload.runeLedgerVersion!==1)throw Error('Version Missions incompatible : synchronisation des runes bloquée');
  const credits=id==='missions'?retainedCredits(payload):null;
  applying = true;
  try {
    if (id === 'contracts') {
      if (!Array.isArray(payload.contracts)) throw Error('Fiches de contrats invalides');
      const incoming = payload.contracts.filter(isSharedDocument);
      const incomingIds = new Set(incoming.map(x=>x.id));
      const old = Array.isArray(st.familyDocs)?st.familyDocs:[];
      const protectedIds = new Set(old.filter(x=>x.category==='Santé' && !isSharedDocument(x)).map(x=>x.id));
      const attachments = new Map(old.map(x=>[x.id,x]));
      const retained = old.filter(x=>
        (x.category==='Santé' && !isSharedDocument(x)) ||
        (!incomingIds.has(x.id) && (!isSharedDocument(x) || Boolean(x.attachmentName))));
      st.familyDocs = retained.concat(incoming.filter(x=>!protectedIds.has(x.id)).map(x=>{
        const prior = attachments.get(x.id);
        return {...x, attachmentName:prior?.attachmentName || '',attachmentType:prior?.attachmentType || ''};
      }));
    }
    for (const key of def.keys) {
      if(id==='missions'&&key==='runeCredits')continue;
      if (Object.prototype.hasOwnProperty.call(payload,key)) {
        st[key] = JSON.parse(JSON.stringify(payload[key]));
      }
    }
    if(id==='missions')st.runeCredits=credits;
    if (id === 'recipes') custom = Array.isArray(st.customRecipes) ? st.customRecipes : [];
    save(); render();
  } finally { applying = false; }
}
async function start() {
  const c = api.getContext();
  if (!c) return;
  const next = c.userId + '|' + c.householdId;
  // Keep the success fast-path but retry when network or API checks failed.
  if (ctx && next === ctx.userId + '|' + ctx.householdId && checked && backendReady) return;
  const changed = !ctx || next !== ctx.userId + '|' + ctx.householdId;
  ctx = c; checked = false; backendReady = false; lastError = '';
  if (changed) states = await api.meta(storageKey()) || {};
  runes=await window.DobbyRunesReady;if(!runes)throw Error('Règles de runes indisponibles');
  if(states.missions?.synced)states.missions.synced=missionDigest(JSON.parse(states.missions.synced));
  if(states.missions?.active&&!st.runeSyncRequired){st.runeSyncRequired=true;save();}
  const stillCurrent = () => {
    const actual = api.getContext();
    return actual?.userId === c.userId && actual?.householdId === c.householdId &&
      ctx?.userId === c.userId && ctx?.householdId === c.householdId;
  };
  try {
    const shared = await api.authorized('GET',
      'dobby_v2_modules?select=module&household_id=eq.' + encodeURIComponent(c.householdId));
    if (!stillCurrent()) return;
    if (!Array.isArray(shared)) throw Error('Liste des modules partagés invalide');
    sharedAvailable = [...new Set(shared.map(row => row.module))].filter(id => byId.has(id));
    backendReady = true;
  } catch (e) {
    if (!stillCurrent()) return;
    backendReady = false; sharedAvailable = [];
    lastError = e?.status
      ? 'Erreur HTTP ' + e.status + ' sur les modules familiaux.'
      : 'Modules familiaux indisponibles temporairement.';
  }
  if (!stillCurrent()) return;
  checked = true;
  api.repaint();
}
function reset() {
  ctx = null; checked = false; backendReady = false; lastError = ''; states = {}; sharedAvailable = [];
  if (timer) { clearTimeout(timer); timer = null; }
}
function stateLabel(def) {
  if (!ctx) return api.getContext() ? 'Initialisation du foyer' : 'Foyer non connecté';
  if (!backendReady) return checked ? 'Données locales (non synchronisées)' : 'Vérification en cours';
  const info = states[def.id];
  if (!info?.active) return 'Partage désactivé';
  if (info.conflict) return 'Conflit à résoudre';
  if(def.id==='missions'){try{runes.normalizeCredits(st.runeCredits||[]);runes.normalizeRequests(st.runeRequests||[]);}catch{return 'Historique de runes à vérifier';}if(pendingRunes())return 'Runes en attente de synchronisation';}
  return moduleDigest(def.id,pick(def.id)) === info.synced ? 'Partagé · à jour' : 'Modifications locales à envoyer';
}
function html() {
  const description = '<p class="fv2-muted">Le partage des modules est volontaire : les données V5 déjà présentes sur cet appareil ne sont jamais téléversées automatiquement.</p>';
  const joinable = sharedAvailable.filter(id => !states[id]?.active);
  const bulkJoin = backendReady && ctx && joinable.length ?
    '<div class="fv2-module"><strong>Rejoindre les modules du foyer</strong>' +
    '<p>' + joinable.length + ' module(s) déjà partagés par un autre membre. Une seule opération récupère les données du foyer. Aucune donnée locale n’est publiée sans accord.</p>' +
    '<button type="button" data-fm-action="join-family">Récupérer les modules partagés (' + joinable.length + ')</button></div>' : '';
  const inactive = DEFINITIONS.filter(def => !states[def.id]?.active);
  const shareAll = backendReady && ctx && inactive.length > 1 && !joinable.length ?
    '<div class="fv2-module"><strong>Activer le foyer en une seule fois</strong>' +
    '<p>Partagez les ' + inactive.length + ' modules restants après une seule confirmation. ' +
    'Les anciens carnets de santé et les pièces locales ne seront pas transférés.</p>' +
    '<button type="button" data-fm-action="activate-all">Activer les ' +
    inactive.length + ' modules du foyer</button></div>' : '';
  const rows = DEFINITIONS.map(def => {
    const info = states[def.id];
    const flag = stateLabel(def);
    let actions = '';
    if (backendReady && ctx && !info?.active)
      actions = '<button type="button" data-fm-action="activate" data-module="' + def.id + '">Activer le partage</button>';
    else if (backendReady && ctx && info?.active) {
      actions = '<button type="button" data-fm-action="refresh" data-module="' + def.id + '">Synchroniser</button>' +
        '<button type="button" data-fm-action="disable" data-module="' + def.id + '">Garder local seulement</button>';
      if (info.conflict) actions +=
        '<div class="fv2-conflict">Deux versions différentes ont été détectées. Aucune n’a été écrasée.' +
        '<button type="button" data-fm-action="server" data-module="' + def.id + '">Conserver la version du foyer</button>' +
        '<button type="button" data-fm-action="local" data-module="' + def.id + '">Conserver mes modifications</button></div>';
    }
    return '<div class="fv2-module"><strong>' + esc(def.title) + '</strong>' +
      '<span class="fv2-flag">' + esc(flag) + '</span>' +
      (def.id === 'house' ? '<p>Pièces et scans toujours locaux.</p>' : '') +
      (def.id === 'menus' && seededExampleMeals() ?
        '<p>Trois repas de démonstration préchargés sont encore dans le calendrier. Ils ne correspondent pas à des menus familiaux confirmés.</p>' +
        '<button type="button" data-fm-action="remove-demo" data-module="menus">Retirer les trois repas d’exemple</button>' : '') +
      (def.id === 'contracts' ? '<p>Contrats et assurances partagés ; autres fiches sur décision explicite. Les PDF et photos s’envoient séparément.</p>' : '') +
      actions + '</div>';
  }).join('');
  const gate = !ctx || !checked ?
    '<p class="fv2-muted">Vérification de la connexion des modules familiaux…</p>' :
    !backendReady ? '<p class="fv2-error" role="status">' +
      esc(lastError || 'Modules familiaux momentanément indisponibles.') +
      ' Les données restent locales ; aucun partage supplémentaire n’est activé.</p>' +
      '<button type="button" data-fm-action="retry">Revérifier le raccordement</button>' : '';
  return description + bulkJoin + shareAll + gate + rows +
    '<div class="fv2-module"><strong>Documents et fichiers joints</strong><span class="fv2-flag">Partage volontaire</span>' +
    '<p>Les fiches et PDF/photos sont partagés avec le foyer uniquement dans les conditions choisies depuis Documents. Les pièces locales ne sont pas envoyées automatiquement.</p></div>' +
    '<div class="fv2-module"><strong>Rendez-vous médicaux et santé</strong><span class="fv2-flag">Choix explicite</span>' +
    '<p>Les anciens carnets restent locaux. Les rendez-vous créés dans le foyer et les documents Santé volontairement partagés sont communs.</p></div>' +
    '';
}
function labelFor(page) {
  if (page === 'documents') return 'Documents · ' + stateLabel(byId.get('contracts')) + ' pour les fiches partagées';
  if (page === 'chat') return 'Conversations conservées sur cet appareil';
  if (page === 'family' && String(st.extraPage || '').startsWith('health')) return 'Carnet de santé local · rendez-vous volontaires dans le foyer';
  const def = DEFINITIONS.find(x => x.pages.includes(page));
  return def ? (def.title + ' · ' + stateLabel(def)) : 'Données locales';
}
async function activate(id) {
  if (!backendReady || !ctx) throw Error('Raccordement Supabase indisponible');
  const def = byId.get(id);
  if (!def) throw Error('Module invalide');
  if (!confirm('Partager « ' + def.title + ' » avec les autres membres actifs du foyer ?\n' +
    'Les données actuelles de ce module pourront être consultées et modifiées par eux.')) return;
  const remote = await readRow(id);
  let revision,acknowledged;
  if (remote) {
    if (digest(pick(id)) !== digest(remote.payload)) {
      if (!confirm('Il existe déjà une version familiale de « ' + def.title +
        ' ». La récupérer sur cet appareil ?\nUne sauvegarde locale sera créée avant remplacement.')) return;
      backupLocal(id);
      applyShared(id, remote.payload);
    }
    revision = Number(remote.revision);acknowledged=remote.payload;
  } else {
    const original = initialPayload(id);
    const result = await api.authorized('POST', 'dobby_v2_modules', {
      household_id:ctx.householdId,module:id,payload:original
    }, { Prefer:'return=representation' });
    if (!result?.[0] || Number(result[0].revision) < 1) throw Error('Partage créé sans confirmation serveur');
    revision = Number(result[0].revision);acknowledged=result[0].payload||original;if(id==='missions'){if(!result[0].payload||missionDigest(acknowledged)!==missionDigest(original))throw Error('Confirmation des runes incohérente');applyCredits(acknowledged.runeCredits);}
  }
  states[id] = synchronized(id,revision,acknowledged);markMissionsShared(id);
  if (!sharedAvailable.includes(id)) sharedAvailable.push(id);
  await persist();
  api.repaint(); api.openModal();onSave();
}
async function activateRemaining() {
  if (!ctx || !backendReady) throw Error('Foyer non connecté');
  const ids = DEFINITIONS.filter(def => !states[def.id]?.active).map(def => def.id);
  if (!ids.length) return;
  // Read first: existing remote data wins, after user confirmation and local backup.
  const entries = await Promise.all(ids.map(async id => ({id, remote:await readRow(id)})));
  const existing = entries.filter(entry => Boolean(entry.remote)).length;
  for (const {id, remote} of entries) {
    if (remote && (!remote.payload || Array.isArray(remote.payload) ||
      typeof remote.payload !== 'object' ||
      !Number.isInteger(Number(remote.revision)) || Number(remote.revision) < 1)) {
      throw Error('Contenu familial non valide pour : ' + id);
    }
  }
  const removeDemo = ids.includes('menus') && seededExampleMeals() &&
    !entries.find(e => e.id === 'menus')?.remote;
  let message = 'Activer le partage de ' + ids.length + ' modules avec les membres actifs du foyer ?\n' +
    'Les données enregistrées dans ces modules pourront être consultées et modifiées par les membres du foyer.\n' +
    'Les anciens carnets de santé et les fichiers locaux ne seront pas envoyés.';
  if (existing) message += '\n' + existing +
    ' module(s) existent déjà : ils seront récupérés après sauvegarde de leur version locale.';
  if (removeDemo) message += '\nLes trois repas fictifs préchargés seront retirés après sauvegarde.';
  if (!confirm(message)) return;
  if (removeDemo) {
    backupLocal('menus');
    st.planned = {};
    st.demoInitialized = true;
    save(); render();
  }
  let activated = 0;
  try {
    for (const {id, remote} of entries) {
      let revision,acknowledged;
      if (remote) {
        if (digest(pick(id)) !== digest(remote.payload)) {
          backupLocal(id);
          applyShared(id, remote.payload);
        }
        revision = Number(remote.revision);acknowledged=remote.payload;
      } else {
        const original = initialPayload(id);
        const result = await api.authorized('POST','dobby_v2_modules',{
          household_id:ctx.householdId,module:id,payload:original
        },{Prefer:'return=representation'});
        if (!result?.[0] || Number(result[0].revision) < 1) {
          throw Error('Module créé sans confirmation serveur : ' + id);
        }
        revision = Number(result[0].revision);acknowledged=result[0].payload||original;if(id==='missions'){if(!result[0].payload||missionDigest(acknowledged)!==missionDigest(original))throw Error('Confirmation des runes incohérente');applyCredits(acknowledged.runeCredits);}
      }
      states[id] = synchronized(id,revision,acknowledged);markMissionsShared(id);
      if (!sharedAvailable.includes(id)) sharedAvailable.push(id);
      await persist();
      activated++;
    }
  } catch(e) {
    lastError = activated + ' module(s) sur ' + ids.length +
      ' activé(s). Les autres restent inactifs : ' + (e?.message || 'erreur inconnue');
    api.repaint(); api.openModal();
    return;
  }
  lastError = '';
  api.repaint(); api.openModal();onSave();
}
async function joinFamily() {
  if (!backendReady || !ctx) throw Error('Foyer non connecté');
  const ids = sharedAvailable.filter(id => byId.has(id) && !states[id]?.active);
  if (!ids.length) return;
  if (!confirm('Récupérer les ' + ids.length + ' modules déjà partagés dans ce foyer ?\n' +
    'Chaque version locale sera sauvegardée avant remplacement. Aucune donnée de cet appareil ne sera envoyée.')) return;
  // Preflight all reads before replacing anything.
  const remote = await Promise.all(ids.map(async id => ({id, row:await readRow(id)})));
  for (const entry of remote) {
    if (!entry.row || !entry.row.payload || Array.isArray(entry.row.payload) ||
      typeof entry.row.payload !== 'object' || !Number.isInteger(Number(entry.row.revision)) ||
      Number(entry.row.revision) < 1) {
      throw Error('Un module familial est invalide ou inaccessible : ' + entry.id);
    }
  }
  const oldStates = JSON.parse(JSON.stringify(states));
  const before = new Map(remote.map(entry => [entry.id,pick(entry.id)]));
  for (const entry of remote) backupLocal(entry.id);
  try {
    for (const entry of remote) {
      applyShared(entry.id,entry.row.payload);
      states[entry.id] = synchronized(entry.id,Number(entry.row.revision),entry.row.payload);
    }
    await persist();
  } catch (e) {
    for (const entry of remote) {
      try { applyShared(entry.id,before.get(entry.id)); } catch {}
    }
    states = oldStates;
    await persist();
    throw e;
  }
  if(states.missions?.active)markMissionsShared('missions');
  api.repaint(); api.openModal();onSave();
}
async function syncOne(id) {
  const state = states[id];
  if (!ctx || !backendReady || !state?.active || state.conflict) return;
  const remote = await readRow(id);
  if (!remote) {
    state.conflict = true;
    lastError = 'Module familial introuvable : ' + id;
    await persist();
    return;
  }
  if(id==='missions')return syncMissions(state,remote);
  const local = pick(id), localJson = digest(local), remoteRevision = Number(remote.revision);
  if (remoteRevision !== state.revision) {
    if (localJson !== state.synced) {
      state.conflict = {remote};
      await persist();
      return;
    }
    applyShared(id, remote.payload);
    state.revision = remoteRevision;
    state.synced = digest(pick(id));
    state.conflict = false;
    await persist();
    return;
  }
  if (localJson === state.synced) return;
  const result = await api.authorized('PATCH', rowQuery(id) +
    '&revision=eq.' + encodeURIComponent(state.revision),
    {payload:local}, {Prefer:'return=representation'});
  if (!result?.length) {
    state.conflict = {remote:await readRow(id)};
    await persist();
    return;
  }
  state.revision = Number(result[0].revision);
  state.synced = localJson;
  state.conflict = false;
  await persist();
}
async function sync() {
  if (!ctx || !checked || !backendReady || inFlight) return;
  inFlight = true;let success=false;
  try {
    for (const def of DEFINITIONS) if (states[def.id]?.active) await syncOne(def.id);
    lastError = '';success=true;
  } catch(e) { lastError = e.message || 'Erreur de partage des modules'; }
  finally { inFlight = false; api.repaint();if(success)onSave(); }
}
function onSave() {
  if (!ctx || !backendReady || applying || inFlight || !DEFINITIONS.some(d=>
    states[d.id]?.active && !states[d.id].conflict && (moduleDigest(d.id,pick(d.id)) !== states[d.id].synced || d.id==='missions'&&pendingRunes()))) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; void sync(); }, 1500);
}
async function resolve(id, preference) {
  const state = states[id];
  if(id==='missions'){
    const remote=await readRow(id);if(!remote)throw Error('Version familiale inaccessible');verifyProtocol(state,remote);const credits=retainedCredits(remote.payload);
    if(preference==='local'&&!confirm('Conserver mes modifications locales ? Les gains de runes confirmés du foyer seront conservés.'))return;
    backupLocal(id);if(preference==='server')applyShared(id,remote.payload);else applyCredits(credits);
    Object.assign(state,synchronized(id,Number(remote.revision),remote.payload));await persist();await sync();api.repaint();api.openModal();return;
  }
  const remote = state?.conflict?.remote || await readRow(id);
  if (!remote) throw Error('Version familiale inaccessible');
  if (preference === 'server') {
    backupLocal(id);
    applyShared(id, remote.payload);
    state.revision = Number(remote.revision);
    state.synced = digest(pick(id));
  } else {
    if (!confirm('Conserver mes modifications locales ? Elles remplaceront la version actuelle du foyer si aucune nouvelle modification ne survient.')) return;
    state.revision = Number(remote.revision);
    state.synced = digest(remote.payload);
  }
  state.conflict = false;
  await persist();
  await sync();
  api.repaint(); api.openModal();
}
document.addEventListener('click', async e => {
  const b = e.target.closest('button[data-fm-action]');
  if (!b) return;
  e.preventDefault();e.stopImmediatePropagation();
  const action = b.dataset.fmAction, id = b.dataset.module;
  try {
    if (action === 'retry') { checked = false; await start(); }
    if (action === 'join-family') await joinFamily();
    if (action === 'activate-all') await activateRemaining();
    if (action === 'activate') await activate(id);
    if (action === 'refresh') await syncOne(id);
    if (action === 'remove-demo' && seededExampleMeals()) {
      if (!confirm('Retirer uniquement les trois repas préchargés ? Une sauvegarde locale sera créée. Si les menus sont partagés, la modification sera proposée au foyer.')) return;
      backupLocal('menus');
      st.planned = {};
      st.demoInitialized = true;
      save(); render();
      if (states.menus?.active) await syncOne('menus');
    }
    if (action === 'disable') {
      if (confirm('Arrêter le partage de ce module sur cet appareil ? Les données déjà partagées sur Supabase ne sont pas supprimées.'+(id==='missions'?' Les runes resteront en attente jusqu’au rétablissement du partage.':''))) {
        // Keep runeSyncRequired sticky: shared mission identities cannot earn a
        // second, local-only confirmation after opting out of synchronization.
        states[id].active=false;await persist();
      }
    }
    if (action === 'server' || action === 'local') await resolve(id,action);
    api.repaint(); api.openModal();
  } catch(err) {
    lastError = err.message || 'Erreur du module';
    api.showMessage(lastError);
    api.openModal();
  }
},true);
api.registerModules({start,reset,html,labelFor,sync,onSave,
  isConfigured(id){return ctx?Boolean(states[id]?.active):null;},
  isActive(id) {return Boolean(ctx && backendReady && states[id]?.active && !states[id]?.conflict);},
  statusFor(id) { const def=byId.get(id); return def?stateLabel(def):'Module inconnu'; }
});
})();
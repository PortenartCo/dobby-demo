/* Optional Supabase household modules. Never uploads local V5 data without
   explicit per-module consent. No medical or attachment payloads. */
(function(){
'use strict';
const api = window.DobbyFamilyUI;
if (!api) throw Error('Dobby Family UI unavailable');
const DEFINITIONS = [
  { id:'menus', title:'Repas et menus', keys:['planned','shopHistory','shopFinal','shopChoice'], pages:['plan','pick','shop'] },
  { id:'recipes', title:'Recettes et Thermomix', keys:['customRecipes','tmAdaptations'], pages:['recipes'] },
  { id:'missions', title:'Missions familiales', keys:['autoTasks'], pages:['missions'] },
  { id:'house', title:'Maison et entretiens', keys:['houseItems','houseLogs'], pages:['house'] },
  { id:'family', title:'Membres, contacts et listes', keys:['familyMembers','famContacts','famLists'], pages:['family'] },
  { id:'contracts', title:'Contrats et assurances (fiches seulement)', keys:[], pages:['documents'] }
];
const byId = new Map(DEFINITIONS.map(x=>[x.id,x]));
let ctx = null, backendReady = false, checked = false, states = {}, inFlight = false;
let timer = null, applying = false, lastError = '';
const esc = api.esc;
function pick(id) {
  if (id === 'contracts') {
    const permitted = ['id','title','category','person','date','deadline','provider','reference','tags','note'];
    return {contracts:(st.familyDocs || []).filter(x=>x.category === 'Contrats' || x.category === 'Assurances').map(x=>{
      const record={};for(const key of permitted)if(x[key]!==undefined)record[key]=x[key];return record;
    })};
  }
  const definition = byId.get(id);
  if (!definition) throw Error('Module inconnu');
  const data = {};
  for (const key of definition.keys) {
    if (st[key] !== undefined) data[key] = JSON.parse(JSON.stringify(st[key]));
  }
  return data;
}
function digest(value) { return JSON.stringify(value); }
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
  applying = true;
  try {
    if (id === 'contracts') {
      if (!Array.isArray(payload.contracts)) throw Error('Fiches de contrats invalides');
      const incoming = payload.contracts;
      const incomingIds = new Set(incoming.map(x=>x.id));
      const old = Array.isArray(st.familyDocs)?st.familyDocs:[];
      const attachments = new Map(old.map(x=>[x.id,x]));
      const retained = old.filter(x=>
        !['Contrats','Assurances'].includes(x.category) ||
        (x.attachmentName && !incomingIds.has(x.id)));
      st.familyDocs = retained.concat(incoming.map(x=>{
        const prior = attachments.get(x.id);
        return {...x, attachmentName:prior?.attachmentName || '',attachmentType:prior?.attachmentType || ''};
      }));
    }
    for (const key of def.keys) {
      if (Object.prototype.hasOwnProperty.call(payload,key)) {
        st[key] = JSON.parse(JSON.stringify(payload[key]));
      }
    }
    if (id === 'recipes') custom = Array.isArray(st.customRecipes) ? st.customRecipes : [];
    save(); render();
  } finally { applying = false; }
}
async function start() {
  const c = api.getContext();
  if (!c) return;
  const next = c.userId + '|' + c.householdId;
  if (ctx && next === ctx.userId + '|' + ctx.householdId && checked) return;
  ctx = c; checked = false; backendReady = false; lastError = '';
  states = await api.meta(storageKey()) || {};
  try {
    await api.authorized('GET','dobby_v2_modules?select=module&limit=1');
    backendReady = true;
  } catch (e) {
    backendReady = false;
    lastError = 'Partage des autres modules non activé sur Supabase (' +
      (e.status || 'hors ligne') + '). Leurs données restent locales.';
  }
  checked = true;
  api.repaint();
}
function reset() {
  ctx = null; checked = false; backendReady = false; lastError = ''; states = {};
  if (timer) { clearTimeout(timer); timer = null; }
}
function stateLabel(def) {
  if (!ctx) return 'Foyer non connecté';
  if (!backendReady) return 'Données locales';
  const info = states[def.id];
  if (!info?.active) return 'Partage désactivé';
  if (info.conflict) return 'Conflit à résoudre';
  return digest(pick(def.id)) === info.synced ? 'Partagé · à jour' : 'Modifications locales à envoyer';
}
function html() {
  const description = '<p class="fv2-muted">Le partage des modules est volontaire : les données V5 déjà présentes sur cet appareil ne sont jamais téléversées automatiquement.</p>';
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
      (def.id === 'contracts' ? '<p>Seules les fiches des catégories Contrats et Assurances sont partagées; aucune pièce jointe.</p>' : '') +
      actions + '</div>';
  }).join('');
  const gate = !backendReady ? '<p class="fv2-error">Le nouveau modèle de sécurité des modules doit d’abord être déployé dans le projet Supabase Dobby. Aucun partage n’est activé.</p>' +
    '<button type="button" data-fm-action="retry">Revérifier le raccordement</button>' : '';
  return description + gate + rows +
    '<div class="fv2-module"><strong>Documents et fichiers joints</strong><span class="fv2-flag">Local uniquement</span>' +
    '<p>Les fiches de contrats peuvent être partagées après activation explicite; les fichiers, autres documents et mémos restent sur cet appareil.</p></div>' +
    '<div class="fv2-module"><strong>Rendez-vous médicaux et santé</strong><span class="fv2-flag">Privé · local</span>' +
    '<p>Aucun dossier de santé n’est envoyé au panier ou aux modules communs.</p></div>' +
    (lastError ? '<p class="fv2-minor">' + esc(lastError) + '</p>' : '');
}
function labelFor(page) {
  if (page === 'documents') return 'Documents locaux · ' + stateLabel(byId.get('contracts')) + ' pour les fiches contrats';
  if (page === 'chat') return 'Conversations conservées sur cet appareil';
  if (page === 'family' && String(st.extraPage || '').startsWith('health')) return 'Santé privée locale';
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
  let revision;
  if (remote) {
    if (digest(pick(id)) !== digest(remote.payload)) {
      if (!confirm('Il existe déjà une version familiale de « ' + def.title +
        ' ». La récupérer sur cet appareil ?\nUne sauvegarde locale sera créée avant remplacement.')) return;
      backupLocal(id);
      applyShared(id, remote.payload);
    }
    revision = Number(remote.revision);
  } else {
    const original = pick(id);
    const result = await api.authorized('POST', 'dobby_v2_modules', {
      household_id:ctx.householdId,module:id,payload:original
    }, { Prefer:'return=representation' });
    if (!result?.[0] || Number(result[0].revision) < 1) throw Error('Partage créé sans confirmation serveur');
    revision = Number(result[0].revision);
  }
  states[id] = {active:true,revision,synced:digest(pick(id)),conflict:false};
  await persist();
  api.repaint(); api.openModal();
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
  inFlight = true;
  try {
    for (const def of DEFINITIONS) if (states[def.id]?.active) await syncOne(def.id);
    lastError = '';
  } catch(e) { lastError = e.message || 'Erreur de partage des modules'; }
  finally { inFlight = false; api.repaint(); }
}
function onSave() {
  if (!ctx || !backendReady || applying || inFlight || !DEFINITIONS.some(d=>
    states[d.id]?.active && digest(pick(d.id)) !== states[d.id].synced)) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; void sync(); }, 1500);
}
async function resolve(id, preference) {
  const state = states[id];
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
    if (action === 'activate') await activate(id);
    if (action === 'refresh') await syncOne(id);
    if (action === 'disable') {
      if (confirm('Arrêter le partage de ce module sur cet appareil ? Les données déjà partagées sur Supabase ne sont pas supprimées.')) {
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
api.registerModules({start,reset,html,labelFor,sync,onSave});
})();
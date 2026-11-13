/* Dobby V5: isolated household synchronization adapter. No service role key and no
   automatic upload of the existing V5 localStorage data. */
(function () {
'use strict';
const PROJECT = 'https://pqcdkrwljgvgagzwrcmg.supabase.co';
const DB_NAME = 'dobby-v5-household-preview-v2';
const KEY_PREFIX = 'sb_publishable_';
const OLD_V5_KEY = 'dobby-stitch-preview-20261105';
const f = {
  db: null, core: null, key: null, session: null, context: null, householdId: null,
  cache: new Map(), syncing: false, again: false, epoch: 0, editing: null,
  homeSupported: null, lastSync: null, error: '', notice: '', ready: false, verifiedContext: null, membershipRejected: false, checkingEpoch: null, modalOpen: false, provider: null, accessContext: null
};
let syncCycle=null,publicContextRead=null;
const verificationOwner=()=>({epoch:f.epoch,userId:f.session?.user_id,householdId:f.householdId});
const sameVerificationOwner=owner=>Boolean(owner&&owner.epoch===f.epoch&&owner.userId===f.session?.user_id&&(!owner.householdId||owner.householdId===f.householdId));
const now = () => new Date().toISOString();
const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);
function fail(error) {
  return error instanceof TypeError ? 'Réseau indisponible. Les modifications locales sont conservées.' :
    (error && error.message) || 'Erreur de synchronisation';
}
function showMessage(s) { f.error = s || ''; repaint(); }
function openDb(name, version, required) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = () => {
      if (required) {
        const db = req.result;
        if (!db.objectStoreNames.contains('items')) db.createObjectStore('items', { keyPath: 'storageKey' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'id' });
      } else req.transaction.abort();
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || Error('IndexedDB inaccessible'));
    req.onblocked = () => reject(Error('Fermez les anciens onglets Dobby qui bloquent le stockage.'));
  });
}
function dbCall(db, store, operation, arg) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, (operation === 'get' || operation === 'getAll') ? 'readonly' : 'readwrite');
    const req = arg === undefined ? tx.objectStore(store)[operation]() : tx.objectStore(store)[operation](arg);
    let result;
    req.onsuccess = () => { result = req.result; };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || Error('Transaction annulée'));
  });
}
const meta = async id => (await dbCall(f.db, 'meta', 'get', id))?.value ?? null;
const putMeta = (id, value) => dbCall(f.db, 'meta', 'put', { id, value });
const delMeta = id => dbCall(f.db, 'meta', 'delete', id);
// Atomic metadata mutation on the existing IndexedDB store. E06 draft updates
// from different tabs must read the latest value inside the same transaction.
function updateMeta(id,change){return new Promise((resolve,reject)=>{
 const tx=f.db.transaction('meta','readwrite'),store=tx.objectStore('meta'),request=store.get(id);let result,error;
 request.onsuccess=()=>{try{result=change(request.result?.value??null);if(result?.then)throw Error('La mise à jour des métadonnées doit être synchrone.');store.put({id,value:result});}catch(e){error=e;tx.abort();}};
 tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(error||tx.error||Error('Métadonnées non enregistrées.'));tx.onerror=()=>reject(error||tx.error);
});}

async function loadItems() {
  const list = await dbCall(f.db, 'items', 'getAll');
  f.cache = new Map(list.filter(x => f.context && x.storageKey.startsWith(f.context + '|'))
    .map(x => [x.id, x]));
  // A previously acknowledged schema field remains usable after an offline
  // reload. This is capability from the native cache, never a local home note.
  if([...f.cache.values()].some(x=>Object.prototype.hasOwnProperty.call(x,'at_home_quantity')))f.homeSupported=true;
}
function getItem(id) { return f.cache.get(id) || null; }
async function putItem(entry) {
  if (!f.context) throw Error('Foyer non identifié');
  const row = { ...entry, storageKey: f.context + '|' + entry.id };
  await dbCall(f.db, 'items', 'put', row);
  f.cache.set(row.id, row);
}
// Merge into the latest stored row in the same transaction as the write.
// A pull/ack queued behind an edit must never replace it using a stale cache.
function updateItem(id,mutate,epoch=f.epoch,context=f.context){return new Promise((resolve,reject)=>{
  if(!context){reject(Error('Foyer non identifié'));return;}
  const tx=f.db.transaction('items','readwrite'),store=tx.objectStore('items'),req=store.get(context+'|'+id);let saved,error;
  req.onsuccess=()=>{try{
    if(f.epoch!==epoch||f.context!==context)throw Error('Le foyer a changé.');
    const next=mutate(req.result||null);
    if(next){saved={...next,storageKey:context+'|'+id};store.put(saved);}
  }catch(e){error=e;tx.abort();}};
  tx.oncomplete=()=>{if(saved&&f.epoch===epoch&&f.context===context)f.cache.set(id,saved);resolve(saved);};
  tx.onabort=()=>reject(error||tx.error||Error('Modification non enregistrée.'));tx.onerror=()=>reject(error||tx.error);
});}
async function raw(path, method, body, headers = {}, bearer = null) {
  if (!f.key) throw Error('Clé publiable absente');
  const h = { apikey: f.key, ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (bearer) h.Authorization = 'Bearer ' + bearer;
  const response = await fetch(PROJECT + path, {
    method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store'
  });
  const t = await response.text();
  let data;
  try { data = t ? JSON.parse(t) : null; } catch { data = t; }
  if (!response.ok) {
    const error = Error(data?.msg || data?.error_description || data?.message || ('HTTP ' + response.status));
    error.status = response.status;
    error.code = typeof data?.code === 'string' ? data.code : data?.error_code;
    throw error;
  }
  return data;
}
function requestActor(){return{epoch:f.epoch,userId:f.session?.user_id||null,householdId:f.householdId||null};}
function assertRequestActor(expected){
  const actual=requestActor();
  if(actual.epoch!==expected.epoch||actual.userId!==expected.userId||actual.householdId!==expected.householdId)throw Error('Le compte ou le foyer a changé pendant cette opération.');
}
async function keepSession(result,expected=null) {
  if (!result?.access_token || !result?.refresh_token) throw Error('Jetons de connexion incomplets');
  if(expected)assertRequestActor(expected);
  const old = f.session || {};
  const next = {
    access_token: result.access_token, refresh_token: result.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + Number(result.expires_in || 3600),
    user_id: result.user?.id || old.user_id,
    email: result.user?.email || old.email || ''
  };
  if(expected){
    await updateMeta('session',()=>{assertRequestActor(expected);return next;});
    assertRequestActor(expected);f.session=next;
  }else{f.session=next;await putMeta('session',f.session);}
}
async function refreshToken(expected=requestActor()) {
  assertRequestActor(expected);
  if (!f.session?.refresh_token) throw Error('Session expirée');
  const result = await raw('/auth/v1/token?grant_type=refresh_token', 'POST', {
    refresh_token: f.session.refresh_token
  });
  assertRequestActor(expected);
  if(result?.user?.id!==undefined&&result.user.id!==expected.userId)throw Error('Le compte retourné par la connexion ne correspond pas à la session.');
  await keepSession(result,expected);assertRequestActor(expected);
}
async function token(expected=requestActor()) {
  assertRequestActor(expected);
  if (!f.session) throw Error('Connexion requise');
  if ((f.session.expires_at || 0) - Math.floor(Date.now() / 1000) < 90) await refreshToken(expected);
  assertRequestActor(expected);
  return f.session.access_token;
}
function assertNativeSharedWrite(method,query,body={}) {
  let state=accessController?.state?.()||f.accessContext;
  // A new native Auth session can precede the next V7 context refresh. Its
  // blank/stale V7 state is authenticated but unverified, never local-only.
  if(f.session&&(!f.session.user_id||state?.userId!==f.session.user_id||state?.authenticated!==true)){
    state={phase:'unavailable',userId:f.session.user_id||null,authenticated:true,verified:false};
  }
  if(f.core?.assertSharedWrite){f.core.assertSharedWrite({method,query,body,access:state});return;}
  const rpc=query.split('?')[0].replace(/^rpc\//,'');
  if(['GET','HEAD','OPTIONS'].includes(method.toUpperCase())||['dobby_v7_context','dobby_v7_preview_invitation','dobby_v7_family_capabilities','dobby_v7_preview_child_invitation','dobby_missions_v2_capabilities','dobby_missions_v3_capabilities'].includes(rpc))return;
  if(!state?.userId&&!state?.authenticated&&!state?.memberId&&!state?.profile?.memberCategory&&state?.phase!=='active')return;
  throw Error('Permissions serveur indisponibles : écriture partagée bloquée.');
}
async function authorized(method, query, body, headers = {}) {
  const expected=requestActor();
  assertNativeSharedWrite(method,query,body);
  let bearer = await token(expected);assertRequestActor(expected);
  assertNativeSharedWrite(method,query,body);
  try { const result=await raw('/rest/v1/' + query, method, body, headers, bearer);assertRequestActor(expected);return result; }
  catch (e) {
    assertRequestActor(expected);
    if (e.status !== 401) throw e;
    assertNativeSharedWrite(method,query,body);
    await refreshToken(expected);assertRequestActor(expected);bearer=f.session.access_token;
    assertNativeSharedWrite(method,query,body);
    const result=await raw('/rest/v1/' + query, method, body, headers, bearer);assertRequestActor(expected);return result;
  }
}
const SHARED_BUCKET='dobby-family-files';
function validStoragePath(path){
  if(!f.context || !f.session || typeof path!=='string')return false;
  const sections=path.split('/');
  return sections.length===2 && sections[0]===f.householdId &&
    /^[a-f0-9-]{36}\.(pdf|jpg|png|webp)$/i.test(sections[1]);
}
async function storageFetch(method,path,file){
  const expected=requestActor();
  assertNativeSharedWrite(method,'storage');
  if(!validStoragePath(path))throw Error('Fichier hors du foyer');
  if(method==='POST' && (!file || !['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)
      || file.size>10485760 || file.size<=0))throw Error('PDF ou image de 10 Mo maximum');
  const send=async()=>{
    assertRequestActor(expected);const jwt=await token(expected);assertRequestActor(expected);
    assertNativeSharedWrite(method,'storage');
    if(!validStoragePath(path))throw Error('Fichier hors du foyer');
    const target=method==='GET'?'authenticated/'+SHARED_BUCKET+'/'+path:
      method==='DELETE'?SHARED_BUCKET:SHARED_BUCKET+'/'+path;
    const headers={apikey:f.key,Authorization:'Bearer '+jwt};
    let body;
    if(method==='POST'){headers['Content-Type']=file.type;headers['x-upsert']='false';body=file;}
    if(method==='DELETE'){headers['Content-Type']='application/json';body=JSON.stringify({prefixes:[path]});}
    const response=await fetch(PROJECT+'/storage/v1/object/'+target,{method,headers,body,cache:'no-store'});
    assertRequestActor(expected);
    if(!response.ok){
      let detail={};try{detail=await response.json()}catch{}
      const e=Error(detail.message||detail.error||('Stockage Dobby HTTP '+response.status));
      e.status=response.status;throw e;
    }
    const result=method==='GET'?await response.blob():true;assertRequestActor(expected);return result;
  };
  try{return await send()}catch(e){
    assertRequestActor(expected);
    if(e.status!==401)throw e;
    assertNativeSharedWrite(method,'storage');
    await refreshToken(expected);assertRequestActor(expected);return send();
  }
}
async function requireHousehold() {
  if (!f.session?.user_id) throw Error('Compte sans identifiant utilisateur');
  const epoch = f.epoch;
  f.checkingEpoch=epoch;f.verifiedContext = null;
  const rows = await authorized('GET', 'dobby_v2_memberships?select=household_id&active=eq.true&user_id=eq.' +
    encodeURIComponent(f.session.user_id));
  if (epoch !== f.epoch) throw Error('Session remplacée');
  if (!Array.isArray(rows) || rows.length !== 1 || !rows[0]?.household_id) {
    f.membershipRejected=true;
    throw Error('Ce compte doit appartenir à un seul foyer actif pour cette version.');
  }
  const hh = rows[0].household_id;
  const context = f.session.user_id + '|' + hh;
  const household = await authorized('GET', 'dobby_v2_households?select=id&id=eq.' + encodeURIComponent(hh));
  if (!Array.isArray(household) || household.length !== 1){f.membershipRejected=true;throw Error('Accès au foyer non autorisé');}
  if (epoch !== f.epoch) throw Error('Session remplacée');
  // V5's local state is one namespace per browser profile; prevent sharing a
  // single profile between households until full partitioning is implemented.
  const deviceHousehold = await meta('deviceHouseholdId');
  if (deviceHousehold && deviceHousehold !== hh) {
    f.membershipRejected=true;
    throw Error('Ce navigateur conserve les données locales d’un autre foyer. Utilisez un profil de navigateur distinct.');
  }
  if (!deviceHousehold) await putMeta('deviceHouseholdId', hh);
  if (f.context !== context) {
    f.context = context;
    f.householdId = hh;
    await putMeta('verifiedContext', context);
    await loadItems();
  }
  f.householdId = hh;
  f.verifiedContext = context;f.membershipRejected=false;if(f.checkingEpoch===epoch)f.checkingEpoch=null;
  // Also initialize modules when an existing, previously verified household was
  // restored from IndexedDB. The context-equality shortcut must not skip this.
  // start() is idempotent once its backend probe has succeeded.
  if (f.provider?.start) await f.provider.start();
}
async function restoreCachedHousehold() {
  if (!f.session?.user_id) return;
  const known = await meta('verifiedContext');
  if (!known || !known.startsWith(f.session.user_id + '|')) return;
  f.context = known;
  f.householdId = known.split('|')[1];
  await loadItems();
}
async function pull(epoch) {
  // Probe column support without depending on the presence of grocery rows.
  // Missing schema only disables availability; never discard a queued value.
  if(f.homeSupported!==true){
    try{await authorized('GET','dobby_v2_grocery?select=at_home_quantity&household_id=eq.'+encodeURIComponent(f.householdId)+'&limit=0');if(epoch!==f.epoch)return;f.homeSupported=true;}
    catch(error){if(epoch!==f.epoch)return;if(['42703','PGRST204'].includes(error.code)&&/at_home_quantity/i.test(error.message))f.homeSupported=false;else throw error;}
  }
  const rows = await authorized('GET', 'dobby_v2_grocery?select=id,title,quantity,unit,checked,created_at,updated_at,deleted_at,revision,import_source_id'+(f.homeSupported?',at_home_quantity':'')+'&household_id=eq.' +
    encodeURIComponent(f.householdId) + '&order=created_at.asc');
  if (epoch !== f.epoch) return;
  if (!Array.isArray(rows)) throw Error('Réponse serveur incohérente');
  for (const row of rows) {
    if (epoch !== f.epoch) return;
    await updateItem(row.id,local=>{const merged=f.core.mergeRemote(local,row);return {...merged,import_source_id:row.import_source_id||merged.import_source_id||null};},epoch);
  }
}
async function readOne(id) {
  const rows = await authorized('GET', 'dobby_v2_grocery?select=*&id=eq.' +
    encodeURIComponent(id) + '&household_id=eq.' + encodeURIComponent(f.householdId));
  return rows?.[0] || null;
}
async function conflict(snapshot, server, epoch) {
  if (epoch !== f.epoch) return;
  await updateItem(snapshot.id,local=>{
    if(!local||local.syncState==='clean')return null;
    if(server&&f.core.sameFields(local,server))return {...f.core.cleanFromRemote(server),import_source_id:server.import_source_id||local.import_source_id||null};
    return {...local,syncState:'conflict',remoteShadow:server};
  },epoch);
}
async function push(snapshot, epoch) {
  if (epoch !== f.epoch || snapshot.syncState !== 'pending') return;
  let returned;
  if (snapshot.baseRevision === 0) {
    try {
      returned = await authorized('POST', 'dobby_v2_grocery', {
        id: snapshot.id, household_id: f.householdId,
        ...(snapshot.import_source_id ? { import_source_id: snapshot.import_source_id } : {}),
        ...f.core.toServerPayload(snapshot)
      }, { Prefer: 'return=representation' });
    } catch (e) {
      if (e.status !== 409) throw e;
      const remote = await readOne(snapshot.id);
      if (!remote) throw Error('Doublon détecté : vérification manuelle nécessaire. Aucun écrasement.');
      await conflict(snapshot, remote, epoch);
      return;
    }
  } else {
    returned = await authorized('PATCH',
      'dobby_v2_grocery?id=eq.' + encodeURIComponent(snapshot.id) +
      '&household_id=eq.' + encodeURIComponent(f.householdId) +
      '&revision=eq.' + encodeURIComponent(snapshot.baseRevision),
      f.core.toServerPayload(snapshot), { Prefer: 'return=representation' });
    if (!Array.isArray(returned) || !returned.length) {
      const remote = await readOne(snapshot.id);
      await conflict(snapshot, remote, epoch);
      return;
    }
  }
  const server = returned?.[0];
  if (!server) throw Error('Modification reçue sans confirmation serveur');
  if (epoch !== f.epoch) return;
  await updateItem(snapshot.id,current=>current?{...f.core.afterPush(current,snapshot,server),import_source_id:server.import_source_id||current.import_source_id||null}:null,epoch);
}
async function sync() {
  if (!f.ready || !f.session || !f.key) return;
  if (f.syncing) { f.again = true; return; }
  f.syncing = true;
  const epoch = f.epoch;
  const cycle={...verificationOwner(),promise:null};let finishCycle;
  cycle.promise=new Promise(resolve=>{finishCycle=resolve;});syncCycle=cycle;
  try {
    // A bootstrap context read which already started owns verification first.
    // Public reads started later wait for this complete drain instead.
    if(sameVerificationOwner(publicContextRead)){
      try {await publicContextRead.promise;}catch {}
      if(epoch!==f.epoch)return;
    }
    await requireHousehold();
    cycle.householdId=f.householdId;
    if (epoch !== f.epoch) return;
    // Login and cached-session recovery share the same canonical read under
    // the existing sync lock. bind() may verify the household, never sync().
    if(!verifiedBinding()){
      try {await (await ensureAccess()).refresh();}catch {}
      if(epoch!==f.epoch)return;
    }
    await pull(epoch);
    const queue = [...f.cache.values()].filter(x => x.syncState === 'pending')
      .sort((a, b) => String(a.updated_at).localeCompare(String(b.updated_at)));
    for (const snapshot of queue) {
      if (epoch !== f.epoch) return;
      await push(snapshot, epoch);
    }
    if (epoch !== f.epoch) return;
    await pull(epoch);
    if (f.provider?.sync) await f.provider.sync();
    f.lastSync = new Date();
    f.error = '';
  } catch (e) {
    if (epoch === f.epoch){if([401,403].includes(e.status))f.membershipRejected=true;f.error = fail(e);}
  } finally {
    if(f.checkingEpoch===epoch)f.checkingEpoch=null;
    f.syncing = false;
    if(syncCycle===cycle)syncCycle=null;
    finishCycle();
    repaint();
    if (f.again) {
      f.again = false;
      if (!f.error || epoch !== f.epoch) queueMicrotask(() => void sync());
    }
  }
}
function status() {
  if (!f.session) return 'Non connecté';
  if (!f.context) return f.error || 'Foyer à vérifier';
  if (accessController && !verifiedBinding()) return 'Foyer connecté en lecture seule : profil et droits V7 à vérifier.';
  const arr = [...f.cache.values()];
  const conflicts = arr.filter(x => x.syncState === 'conflict').length;
  const pending = arr.filter(x => x.syncState === 'pending').length;
  if (conflicts) return conflicts + ' conflit(s) à résoudre';
  if (pending) return pending + ' changement(s) en attente';
  if (f.syncing) return 'Synchronisation…';
  if (f.error) return 'Hors ligne / connexion à vérifier';
  return f.lastSync ? 'Liste partagée à jour' : 'Liste locale disponible';
}
function visible() {
  return [...f.cache.values()].filter(x => !x.deleted_at || x.syncState === 'conflict')
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}
function itemHtml(x) {
  const body = '<div class="fv2-itemname' + (x.checked ? ' fv2-done' : '') + '">' + esc(x.title) + '</div>' +
    '<div class="fv2-minor">' + (x.quantity == null ? 'Quantité à préciser' : esc(x.quantity)) +
    (x.unit ? ' ' + esc(x.unit) : '') + '</div>';
  const controls = x.syncState === 'conflict'
    ? '<div class="fv2-conflict">Versions différentes. Choisir laquelle conserver.' +
      '<button data-fv-action="conflict-server" data-id="' + esc(x.id) + '">Version du foyer</button>' +
      '<button data-fv-action="conflict-local" data-id="' + esc(x.id) + '">Ma version</button></div>'
    : '<div class="fv2-controls"><button type="button" data-fv-action="edit" data-id="' + esc(x.id) + '">Modifier</button>' +
      '<button type="button" data-fv-action="delete" data-id="' + esc(x.id) + '">Supprimer</button></div>';
  if (f.editing === x.id && x.syncState !== 'conflict') return '<li class="fv2-item"><form id="fv2EditForm" data-id="' + esc(x.id) + '">' +
    '<label>Article<input name="title" maxlength="200" required value="' + esc(x.title) + '"></label>' +
    '<label>Quantité<input name="quantity" type="number" min="0" max="999999" step="0.01"' +
    (x.quantity == null ? '' : ' value="' + esc(x.quantity) + '"') + '></label>' +
    '<label>Unité<input name="unit" maxlength="40" value="' + esc(x.unit) + '"></label>' +
    '<div class="fv2-controls"><button type="submit">Enregistrer</button><button type="button" data-fv-action="cancel-edit">Annuler</button></div>' +
    '</form></li>';
  return '<li class="fv2-item"><input aria-label="Cocher ' + esc(x.title) + '" type="checkbox" data-fv-check="' +
    esc(x.id) + '"' + (x.checked ? ' checked' : '') + (x.syncState === 'conflict' ? ' disabled' : '') + '>' +
    '<div class="fv2-itembody">' + body +
    (x.syncState === 'pending' ? '<small class="fv2-pending">En attente de synchronisation</small>' : '') +
    controls + '</div></li>';
}
function shopPanel() {
  const conn = Boolean(f.context);
  const rows = conn ? visible() : [];
  const syncStatus = status();
  const actions = conn
    ? '<button type="button" data-fv-action="sync">Synchroniser</button>' +
      '<button type="button" data-fv-action="open">Gérer mon foyer</button>'
    : '<button type="button" data-fv-action="open">Connecter mon foyer</button>';
  const form = conn ? '<form id="fv2AddForm" class="fv2-add">' +
    '<label>Nouvel article<input name="title" required maxlength="200" placeholder="Par exemple : pain"></label>' +
    '<label>Quantité<input name="quantity" type="number" min="0" max="999999" step="0.01" placeholder="Facultatif"></label>' +
    '<label>Unité<input name="unit" maxlength="40" placeholder="pièce, g, L…"></label>' +
    '<button type="submit">Ajouter au foyer</button></form>' +
    '<ul class="fv2-list">' + (rows.length ? rows.map(itemHtml).join('') : '<li class="fv2-empty">Aucun article partagé.</li>') + '</ul>'
    : '<p class="fv2-muted">Vos courses V5 locales sont conservées. Connectez-vous pour afficher et modifier le panier commun.</p>';
  const fromMeal = conn ? '<div class="fv2-import"><p>Les ingrédients des repas restent dans le planning V5. Vous pouvez les ajouter au panier familial sans modifier vos menus.</p>' +
    '<button type="button" data-fv-action="import">Ajouter les ingrédients du planning au panier partagé</button></div>' : '';
  return '<section class="fv2-panel" aria-label="Panier partagé du foyer">' +
    '<div class="fv2-head"><span class="fv2-mark">✧ Dobby · Foyer familial</span><span class="fv2-status">' + esc(syncStatus) + '</span></div>' +
    '<h2>Le panier commun</h2><div class="fv2-actions">' + actions + '</div>' +
    (f.error ? '<p class="fv2-error" role="status">' + esc(f.error) + '</p>' : '') +
    (f.notice ? '<p class="fv2-minor" role="status">' + esc(f.notice) + '</p>' : '') +
    form + fromMeal + '</section>';
}
function strip() {
  const group = {home:'Accueil',plan:'Repas',pick:'Repas',recipes:'Recettes',
    missions:'Missions',family:'Famille',house:'Maison',documents:'Documents',
    menu:'Navigation',chat:'Conversation'}[st.page] || 'Dobby';
  const label = st.page === 'family' && String(st.extraPage || '').startsWith('health')
    ? 'Santé : données conservées uniquement sur cet appareil'
    : (st.page === 'documents' ? 'Fichiers joints : locaux jusqu’à validation du stockage sécurisé' :
        f.provider?.labelFor?.(st.page) || (f.context ? 'Foyer connecté · données V5 locales' : 'Données V5 locales'));
  return '<div class="fv2-strip"><span class="fv2-strip-label">' + esc(group) + ' · ' + esc(label) +
    '</span><button type="button" data-fv-action="open">Gérer le foyer</button></div>';
}
const legacyShop = drawShop;
drawShop = function () {
  return '<div class="fv2-view">' + shopPanel() +
    '<details class="fv2-recipeprep"><summary>Préparation des courses depuis les recettes et menus</summary>' +
    '<p class="fv2-muted">Valider une liste dans cette préparation ne la partage pas automatiquement : utilisez le bouton du panier commun.</p>' +
    legacyShop() + '</details></div>';
};
const previousRender = render;
render = function () {
  previousRender();
  const target = document.getElementById('screen');
  if (target && (st.page !== 'shop' || st.extraPage)) {
    target.insertAdjacentHTML('afterbegin', strip());
  }
};
let repaintQueued = false;
function repaint() {
  notifyAccess();
  if (repaintQueued) return;
  repaintQueued = true;
  queueMicrotask(() => {
    repaintQueued = false;
    if (!document.activeElement?.closest('#screen form')) render();
    if (f.modalOpen && !document.activeElement?.closest('#fv2LoginForm')) refreshModal();
  });
}
function createOverlay() {
  if (document.getElementById('fv2Overlay')) return;
  const div = document.createElement('div');
  div.id = 'fv2Overlay'; div.hidden = true;
  div.innerHTML = '<div class="fv2-modal" role="dialog" aria-modal="true" aria-label="Gestion du foyer">' +
    '<button class="fv2-close" type="button" data-fv-action="close" aria-label="Fermer">×</button>' +
    '<div id="fv2ModalBody"></div></div>';
  document.body.append(div);
}
function refreshModal() {
  const target = document.getElementById('fv2ModalBody');
  if (!target) return;
  const copyOld = localStorage.getItem(OLD_V5_KEY) ?
    '<details class="fv2-legacy-options"><summary>Import facultatif d’un ancien essai V5</summary>' +
    '<p class="fv2-muted">À utiliser seulement si vous aviez personnellement enregistré des données dans l’ancien essai. ' +
    'Les données de démonstration ne nécessitent aucune migration.</p>' +
    '<button type="button" data-fv-action="import-original">Importer les anciennes données locales</button></details>' : '';
  if (!f.session || !f.context) {
    target.innerHTML = '<h2>Connexion familiale</h2><p class="fv2-muted">Utilisez votre compte Supabase Dobby. Aucune clé secrète ne doit être saisie. Un profil navigateur distinct est requis pour chaque foyer.</p>' + copyOld +
      '<button type="button" data-fv-action="pilot-key">Retrouver la clé publique du pilote Sync V2</button>' +
      '<form id="fv2LoginForm"><label>Clé publique<input name="key" autocomplete="off" placeholder="sb_publishable_…" value="' +
      esc(f.key || '') + '" required></label>' +
      '<label>Email<input name="email" type="email" autocomplete="username" required></label>' +
      '<label>Mot de passe<input name="password" type="password" autocomplete="current-password" required></label>' +
      '<button type="submit">Se connecter au foyer</button></form>' +
      (f.error ? '<p class="fv2-error">' + esc(f.error) + '</p>' : '');
    return;
  }
  const modules = f.provider?.html?.() ||
    '<p class="fv2-muted">Les autres modules V5 restent en local jusqu’à la mise en place de leurs règles de partage.</p>';
  target.innerHTML = '<h2>Mon foyer Dobby</h2><p>Compte : <strong>' + esc(f.session.email) + '</strong></p>' +
    '<p class="fv2-muted">Panier familial partagé : ' + visible().length + ' article(s). Les fichiers médicaux et pièces jointes restent locaux.</p>' +
    '<p class="fv2-minor">' + esc(status()) + '</p>' +
    '<div class="fv2-actions"><button type="button" data-fv-action="sync">Synchroniser</button>' +
    '<button type="button" data-fv-action="logout">Se déconnecter</button></div>' + copyOld +
    '<h3>Modules du foyer</h3>' + modules;
}
function openModal() {
  createOverlay();
  f.modalOpen = true;
  const overlay = document.getElementById('fv2Overlay');
  overlay.hidden = false;
  refreshModal();
}
function closeModal() {
  f.modalOpen = false;
  const overlay = document.getElementById('fv2Overlay');
  if (overlay) overlay.hidden = true;
}
function importOriginalLocal() {
  const raw = localStorage.getItem(OLD_V5_KEY);
  if (!raw) throw Error('Aucune donnée V5 locale précédente sur cet appareil');
  const parsed = JSON.parse(raw);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw Error('Données V5 invalides');
  if (!confirm('Importer les menus, recettes, missions, équipements et informations familiales de l’ancien essai V5 sur cet appareil ?\n' +
    'Cette importation est uniquement locale, sans mise en ligne automatique. Les fichiers PDF et images restent dans l’ancien essai. Une sauvegarde du nouvel essai sera créée.')) return;
  const snapshot = JSON.stringify(st);
  localStorage.setItem('dobby-v5-familial-before-import-' + Date.now(), snapshot);
  const fields = ['planned','customRecipes','tmAdaptations','shopHistory','shopFinal','shopChoice','extras',
    'autoTasks','houseItems','houseLogs','familyMembers','famContacts','famLists','famHealth',
    'familyNotes','v2ChatHistory'];
  for (const key of fields) if (Object.prototype.hasOwnProperty.call(parsed,key)) {
    st[key] = JSON.parse(JSON.stringify(parsed[key]));
  }
  if (Array.isArray(parsed.familyDocs)) {
    st.familyDocs = parsed.familyDocs.map(x => {
      const d = {...x};
      d.attachmentName = ''; d.attachmentType = '';
      return d;
    });
  }
  if (Array.isArray(st.customRecipes)) custom = st.customRecipes;
  st.demoInitialized = true;
  st.page='home';st.extraPage='';st.detail=null;
  save();render();
  f.notice='Les données de l’ancien essai V5 ont été copiées localement. Aucune publication sur Supabase.';
  refreshModal();
}
function validateKey(rawKey) {
  const value = String(rawKey || '').trim();
  if (!value.startsWith(KEY_PREFIX) || value.length < KEY_PREFIX.length + 15 || value.length > 300) {
    throw Error('Utiliser uniquement la clé sb_publishable_… (jamais de clé secrète).');
  }
  return value;
}
async function usePilotPublicKey() {
  let pilot;
  try {
    pilot = await openDb('dobby-sync-pilot-v2', 1, false);
    if (!pilot.objectStoreNames.contains('meta')) throw Error('Pilote Sync V2 absent de cet appareil');
    const entry = await dbCall(pilot, 'meta', 'get', 'publicKey');
    f.key = validateKey(entry?.value);
    await putMeta('publicKey', f.key);
    f.error = '';
    refreshModal();
  } catch(e) { f.error = 'Clé publique non récupérée : ' + fail(e); refreshModal(); }
  finally { if (pilot) pilot.close(); }
}
async function login(form) {
  f.error = '';
  f.key = validateKey(new FormData(form).get('key'));
  const data = new FormData(form);
  await putMeta('publicKey', f.key);
  const result = await raw('/auth/v1/token?grant_type=password', 'POST', {
    email: String(data.get('email') || '').trim(),
    password: String(data.get('password') || '')
  });
  f.epoch += 1;
  f.accessContext = null;
  await keepSession(result);
  f.context = null; f.householdId = null; f.verifiedContext = null; f.checkingEpoch=null;
  try {
    await requireHousehold();
    await loadItems();
    await sync();
  } catch (e) {
    // Never retain a new session after a refused household switch.
    f.epoch += 1; f.session = null; f.context = null; f.householdId = null; f.verifiedContext = null; f.checkingEpoch=null;
    f.cache.clear();
    await delMeta('session');
    throw e;
  }
  refreshModal(); repaint();
}
async function logout() {
  const old = f.session;
  f.epoch += 1;
  f.accessContext = null;
  f.session = null; f.context = null; f.householdId = null; f.verifiedContext = null; f.checkingEpoch=null;
  f.cache.clear(); f.lastSync = null; f.error = ''; f.membershipRejected=false;
  await delMeta('session');
  if (f.provider?.reset) f.provider.reset();
  repaint(); refreshModal();
  if (old?.access_token) void raw('/auth/v1/logout', 'POST', undefined, {}, old.access_token).catch(() => {});
}
function validQuantity(input) {
  const s = String(input == null ? '' : input).trim();
  if (!s) return null;
  const n = Number(s.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 999999) throw Error('Quantité invalide');
  return Math.round(n * 100) / 100;
}
async function add(title, quantity, unit, id = crypto.randomUUID(), checked = false, importId = null) {
  if (!f.context) throw Error('Connectez votre foyer');
  const label = String(title || '').trim();
  if (!label || label.length > 200) throw Error('Nom de l’article invalide');
  const candidate = f.core.newLocal(id, label, quantity, String(unit || '').trim().slice(0,40), now());
  candidate.checked = checked;
  if(f.homeSupported===true)candidate.at_home_quantity=0;
  if (importId) candidate.import_source_id = importId;
  await putItem(candidate);
  repaint();
}
async function change(id, values) {
  await updateItem(id,current=>{if(!current)throw Error('Article introuvable sur cet appareil');return f.core.editLocal(current,values,now());});
  repaint(); void sync();
}
function groceryPatch(values){
  const patch={...values};
  if('title' in patch){patch.title=String(patch.title||'').trim();if(!patch.title||patch.title.length>200)throw Error('Nom de l’article invalide');}
  if('quantity' in patch)patch.quantity=validQuantity(patch.quantity);
  if('unit' in patch)patch.unit=String(patch.unit||'').trim().slice(0,40);
  if('at_home_quantity' in patch){if(f.homeSupported!==true)throw Error('Disponibilité partagée indisponible : migration at_home_quantity requise ou vérification en attente.');const qty=Number(patch.at_home_quantity);if(!Number.isFinite(qty)||qty<0||qty>999999)throw Error('Quantité disponible invalide.');patch.at_home_quantity=qty;}
  return patch;
}
async function editGroceryGroup(changes,context){
  if(!f.context||f.context!==context)throw Error('Le foyer a changé.');
  const epoch=f.epoch,prepared=changes.map(x=>({...x,values:groceryPatch(x.values)}));
  const saved=await new Promise((resolve,reject)=>{
    const tx=f.db.transaction('items','readwrite'),store=tx.objectStore('items'),result=[];let error;
    const abort=e=>{error=e;tx.abort();};
    for(const change of prepared){const req=store.get(context+'|'+change.id);req.onsuccess=()=>{try{
      const current=req.result;if(f.epoch!==epoch||f.context!==context)throw Error('Le foyer a changé.');
      if(!current||current.deleted_at)throw Error('Article indisponible.');
      if(current.syncState==='conflict')throw Error('Résolvez le conflit avant de modifier cet article.');
      const expected=change.expected;
      if(!expected||!f.core.sameFields(current,expected)||current.clientRev!==expected.clientRev||current.baseRevision!==expected.baseRevision)throw Error('L’article a changé. Ouvrez un nouveau récapitulatif.');
      const entry=f.core.editLocal(current,change.values,now());store.put(entry);result.push(entry);
    }catch(e){abort(e);}};}
    tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(error||tx.error||Error('Modification non enregistrée.'));tx.onerror=()=>reject(error||tx.error);
  });
  if(f.epoch===epoch&&f.context===context){for(const item of saved)f.cache.set(item.id,item);repaint();void sync();}
}
async function choose(id, mode) {
  const current = getItem(id);
  if (!current) throw Error('Article introuvable');
  await updateItem(id,latest=>{if(!latest||latest.clientRev!==current.clientRev||latest.baseRevision!==current.baseRevision||!f.core.sameFields(latest,current)||JSON.stringify(latest.remoteShadow)!==JSON.stringify(current.remoteShadow))throw Error('Le conflit a changé. Vérifiez de nouveau les versions.');return {...f.core.resolveConflict(latest,mode),import_source_id:latest.import_source_id||null};});
  repaint(); void sync();
}
async function deterministicUuid(input) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const h = [...bytes.slice(0,16)].map(x => x.toString(16).padStart(2,'0')).join('');
  return h.slice(0,8) + '-' + h.slice(8,12) + '-' + h.slice(12,16) + '-' + h.slice(16,20) + '-' + h.slice(20);
}
function norm(v) { return String(v || '').trim().toLocaleLowerCase('fr-BE').replace(/\s+/g,' '); }
function proposedIngredients() {
  if (st.shopFinal && Array.isArray(st.shopFinal.items)) return st.shopFinal.items.map(x => {
    const detail = String(x.detail || '');
    const match = /^(\d+(?:[.,]\d+)?)\s+(.+)$/.exec(detail);
    return {title:String(x.name || ''),quantity:match ? validQuantity(match[1]) : null,
      unit:match ? match[2].trim() : '', checked: Boolean(x.done)};
  });
  return shoppingDraft().filter(x => shouldBuy('recipe:' + x.id))
    .map(x => ({title:x.name,quantity:x.qty == null ? null : validQuantity(x.qty),
      unit:x.unit || '', checked:false})).concat((st.extras || []).filter((_, i) => shouldBuy('extra:' + i))
      .map(x => ({title:x,quantity:null,unit:'',checked:false})));
}
async function importIngredients() {
  if (!f.context) throw Error('Connectez votre foyer avant le partage des courses');
  const source = proposedIngredients();
  if (!source.length) { showMessage('Aucun ingrédient à ajouter depuis les menus.'); return; }
  let added = 0, duplicates = 0;
  const active = new Set([...f.cache.values()].filter(x => !x.deleted_at)
    .map(x => norm(x.title) + '|' + norm(x.unit)));
  const signature = st.shopFinal?.validatedAt ||
    Object.keys(st.planned || {}).sort().map(k => k + ':' +
      JSON.stringify(st.planned[k])).join('|');
  for (const row of source) {
    const title = row.title.trim();
    if (!title) continue;
    const label = norm(title) + '|' + norm(row.unit);
    if (active.has(label)) { duplicates++; continue; }
    const key = await deterministicUuid('dobby-v5-import|' + f.householdId + '|' + signature + '|' + label);
    if (getItem(key)) { duplicates++; continue; }
    await add(title, row.quantity, row.unit, key, row.checked, key);
    active.add(label); added++;
  }
  f.error = '';
  f.notice = added + ' nouvel(le)(s) article(s) préparé(s), ' + duplicates + ' déjà présent(s).';
  repaint();
  if (added) void sync();
}
document.addEventListener('click', async e => {
  const b = e.target.closest('button[data-fv-action]');
  if (!b) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const action = b.dataset.fvAction, id = b.dataset.id;
  try {
    if (action === 'open') return openModal();
    if (action === 'close') return closeModal();
    if (action === 'pilot-key') return await usePilotPublicKey();
    if (action === 'import-original') return importOriginalLocal();
    if (action === 'logout') return await logout();
    if (action === 'sync') return await sync();
    if (action === 'import') return await importIngredients();
    if (action === 'edit') { f.editing = id; return repaint(); }
    if (action === 'cancel-edit') { f.editing = null; return repaint(); }
    if (action === 'delete') return await change(id, { deleted_at: now() });
    if (action === 'conflict-server') return await choose(id, 'server');
    if (action === 'conflict-local') return await choose(id, 'local');
  } catch (error) { showMessage(fail(error)); }
}, true);
document.addEventListener('submit', async e => {
  const form = e.target;
  if (!['fv2LoginForm', 'fv2AddForm', 'fv2EditForm'].includes(form.id)) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const submit = form.querySelector('[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    if (form.id === 'fv2LoginForm') await login(form);
    if (form.id === 'fv2AddForm') {
      const data = new FormData(form);
      await add(data.get('title'), validQuantity(data.get('quantity')), data.get('unit'));
      form.reset(); document.activeElement?.blur(); render(); void sync();
    }
    if (form.id === 'fv2EditForm') {
      const data = new FormData(form), id = form.dataset.id;
      await change(id, {title:String(data.get('title') || '').trim(),
        quantity:validQuantity(data.get('quantity')), unit:String(data.get('unit') || '').trim()});
      f.editing = null; document.activeElement?.blur(); render();
    }
  } catch (error) { showMessage(fail(error)); }
  finally { if (submit?.isConnected) submit.disabled = false; }
}, true);
document.addEventListener('change', e => {
  const id = e.target.dataset.fvCheck;
  if (id) {
    e.stopImmediatePropagation();
    void change(id, {checked:e.target.checked}).catch(err => showMessage(fail(err)));
  }
}, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && f.modalOpen) closeModal(); });
const oldSave = save;
save = function() {
  const result = oldSave.apply(this, arguments);
  if (f.provider?.onSave) f.provider.onSave();
  return result;
};
// E06 facade: same native login and membership verification, no alternate auth.
function structuralNativeBinding(){const binding=f.accessContext;return binding&&binding.epoch===f.epoch&&binding.userId===f.session?.user_id&&binding.householdId===f.householdId&&f.context&&f.verifiedContext===f.context&&!f.membershipRejected?binding:null;}
function verifiedBinding(){
 const binding=structuralNativeBinding();if(!binding)return null;
 const live=accessController?.state();
 if(live?.verified!==true||live.phase!=='active'||live.userId!==binding.userId||live.householdId!==binding.householdId||live.memberId!==binding.memberId)return null;
 return{...binding,permissions:{...live.permissions}};
}
function connectionState(){const binding=verifiedBinding();return {verifying:f.checkingEpoch!==null,access:f.membershipRejected?'rejected':f.context&&f.verifiedContext===f.context?'verified':f.context?'cached':'local',userId:f.session?.user_id||null,householdId:f.householdId||null,epoch:f.epoch,ready:f.ready,configured:Boolean(f.key),connected:Boolean(f.context&&f.session),verified:Boolean(f.context&&f.verifiedContext===f.context),identityVerified:Boolean(binding),memberId:binding?.memberId||null,permissions:binding?{...binding.permissions}:{}};}
async function signIn(email,password){
 if(!f.ready)throw Error('Connexion en cours d’initialisation.');
 if(!f.key)throw Error('Configuration publique absente : connexion indisponible sur cet appareil.');
 const form=document.createElement('form');for(const[name,value]of Object.entries({key:f.key,email,password})){const input=document.createElement('input');input.name=name;input.value=String(value||'');form.append(input);}await login(form);return connectionState();
}
let accessController=null,accessPromise=null,lastAccessEvent='';
const accessListeners=new Set();
function notifyAccess(){
 const state=accessController?.state()||{phase:f.session?'unavailable':'signed-out',userId:f.session?.user_id||null,householdId:null,memberId:null,profile:null,permissions:{},configured:Boolean(f.key),verified:false,pendingCeremony:false};
 const signature=JSON.stringify(state);if(signature===lastAccessEvent)return;lastAccessEvent=signature;
 for(const listener of accessListeners){try{listener(JSON.parse(signature));}catch{}}
 if(typeof window.dispatchEvent==='function'&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('dobby:access-change'));
}
function ensureAccess(){
 if(!accessPromise)accessPromise=import('./family-access.mjs').then(({createFamilyAccess})=>{
  accessController=createFamilyAccess({crypto:window.crypto||globalThis.crypto,now:Date.now,
   snapshot:()=>({ready:f.ready,configured:Boolean(f.key),userId:f.session?.user_id||null,householdId:f.householdId,epoch:f.epoch,verified:Boolean(structuralNativeBinding()),rejected:f.membershipRejected}),
   meta,putMeta,delMeta,updateMeta,
   auth:async(path,method,body,options={})=>{
    if(!options.authenticated)return raw(path,method,body);
    const expected=requestActor(),jwt=await token(expected);assertRequestActor(expected);
    const result=await raw(path,method,body,{},jwt);assertRequestActor(expected);return result;
   },
   rpc:(name,body,options={})=>options.public?raw('/rest/v1/rpc/'+name,'POST',body):authorized('POST','rpc/'+name,body),
   clearBinding:()=>{f.accessContext=null;},
   async installSession(result,before){
    if(f.epoch!==before.epoch||(f.session?.user_id||null)!==before.userId)throw Error('Le compte a changé pendant la connexion.');
    f.epoch++;f.accessContext=null;f.context=null;f.householdId=null;f.verifiedContext=null;f.checkingEpoch=null;f.membershipRejected=false;f.cache.clear();f.provider?.reset?.();
    await keepSession(result);repaint();refreshModal();
   },
   async bind(context,before){
    const guard=()=>{if(f.epoch!==before.epoch||f.session?.user_id!==context.userId)throw Error('Le compte a changé pendant la vérification.');};
    guard();try{await requireHousehold();guard();
     if(f.householdId!==context.householdId)throw Error('Le contexte serveur ne correspond pas au foyer autorisé.');
     if(!f.provider?.adoptVerifiedFamily)throw Error('Le registre familial natif est indisponible.');
     const binding={...context,identityVerified:true};
     const revalidated=await f.provider.revalidateExistingFamily?.(binding);guard();
     if(revalidated!==true){await f.provider.adoptVerifiedFamily(binding);guard();}
     f.accessContext={...context,epoch:f.epoch};
    }finally{if(f.checkingEpoch===before.epoch)f.checkingEpoch=null;}
   },
   logout,
   notify:notifyAccess
  });return accessController;
 });return accessPromise;
}
async function refreshPublicAccess(){
 const owner=verificationOwner();
 // Serialize actual reads, never reuse an earlier GET as confirmation of a
 // later mutation. The internal Sync read does not call this waiting facade.
 for(;;){
  if(!sameVerificationOwner(owner))throw Error('Le compte ou le foyer a changé pendant la vérification.');
  const pending=sameVerificationOwner(syncCycle)?syncCycle:sameVerificationOwner(publicContextRead)?publicContextRead:null;
  if(!pending)break;
  try {await pending.promise;}catch {}
 }
 const entry={...verificationOwner(),promise:null};
 entry.promise=ensureAccess().then(controller=>{
  if(!sameVerificationOwner(entry))throw Error('Le compte ou le foyer a changé pendant la vérification.');
  return controller.refresh();
 });publicContextRead=entry;
 try{return await entry.promise;}finally{if(publicContextRead===entry)publicContextRead=null;}
}
const accessFacade=Object.freeze({
 get ready(){return ensureAccess();},
 state:()=>accessController?.state()||{phase:f.session?'unavailable':'signed-out',userId:f.session?.user_id||null,householdId:null,memberId:null,profile:null,permissions:{},configured:Boolean(f.key),verified:false,pendingCeremony:false},
 subscribe(listener){if(typeof listener!=='function')throw Error('Écouteur de connexion invalide.');accessListeners.add(listener);return()=>accessListeners.delete(listener);},
 refresh:refreshPublicAccess,
 ...Object.fromEntries(['signIn','signUp','recover','confirmFromURL','updatePassword','saveProfile','previewInvitation','createHousehold','acceptInvitation','createInvitation','createChildInvitation','previewChildInvitation','acceptChildInvitation','updateMagic','updateMember','logout'].map(name=>[name,(...args)=>ensureAccess().then(controller=>controller[name](...args))])),
 cleanURL:value=>{if(!accessController)throw Error('Le gestionnaire de connexion est en cours de chargement.');return accessController.cleanURL(value);}
});
window.DobbyFamilyAccess=accessFacade;
window.DobbyFamilyUI = Object.freeze({connectionState,signIn,access:accessFacade,
  // V7 consumes the existing cache and writers directly, without a second basket.
  grocery: Object.freeze({
    read: () => ({context:f.context, status:status(), error:f.error, homeSupported:f.homeSupported, items:visible().map(x=>({...x})), ready:f.ready}),
    async add(values) { await add(values.title,validQuantity(values.quantity),values.unit); void sync(); },
    async edit(id,values) {
      if(!f.context)throw Error('Foyer indisponible');
      if(getItem(id)?.syncState==='conflict')throw Error('Résolvez le conflit avant de modifier cet article.');
      await change(id,groceryPatch(values));
    },
    editGroup: editGroceryGroup,

    async proposeRows(rows,context) {
      if(!f.context||f.context!==context)throw Error('Le foyer a changé.');
      const result=[];
      for(const row of rows){
        let candidate={...row};const id=await deterministicUuid('dobby-e072|'+f.householdId+'|'+row.token),current=getItem(id);
        if(current&&norm(current.unit)!==norm(candidate.unit)){const units={g:['mass',1],kg:['mass',1000],mg:['mass',.001],ml:['volume',1],cl:['volume',10],dl:['volume',100],l:['volume',1000]},from=units[norm(candidate.unit)],to=units[norm(current.unit)];if(from&&to&&from[0]===to[0])candidate={...candidate,qty:candidate.qty==null?null:candidate.qty*from[1]/to[1],unit:current.unit};}
        const qty=validQuantity(candidate.qty);
        if(!current){result.push({...candidate,qty});continue;}
        if(current.deleted_at||current.checked)continue;
        if(current.syncState==='conflict')throw Error('Résolvez le conflit de cet apport avant de le réimporter.');
        if(norm(current.unit)!==norm(candidate.unit))throw Error('L’unité d’un apport a été modifiée. Ajustez cet article manuellement.');
        if(current.quantity!==qty)result.push({...candidate,qty,mode:'update',previousLabel:current.title,previousQty:current.quantity,expected:f.core.toServerPayload(current)});
      }
      return result;
    },
    async importRows(rows,context,options={}) {
      if(!f.context||f.context!==context)throw Error('Le foyer a changé. Vérifiez le récapitulatif.');
      const epoch=f.epoch,householdId=f.householdId,receipts=[];
      const guard=()=>{if(f.epoch!==epoch||f.context!==context||f.householdId!==householdId)throw Error('Le foyer a changé.');};
      let added=0;
      for(const row of rows){
        guard();
        const id=await deterministicUuid('dobby-e072|'+householdId+'|'+row.token);
        guard();
        // Include tombstones: repeating an already archived import is not a new purchase.
        const current=getItem(id);
        if(row.mode==='update'){
          if(!current||current.syncState==='conflict'||!f.core.sameFields(current,row.expected))throw Error('L’article a changé. Vérifiez un nouveau récapitulatif.');
          await change(id,{quantity:validQuantity(row.qty)});guard();added++;
          receipts.push({...getItem(id),token:row.token});continue;
        }
        let receipt,inserted=false;
        // Read the latest durable row inside the existing native transaction.
        // Another tab's pending item or tombstone must not be overwritten.
        await updateItem(id,latest=>{
          if(latest){receipt=latest;return null;}
          const title=String(row.name||'').trim();if(!title||title.length>200)throw Error('Nom de l’article invalide');
          receipt=f.core.newLocal(id,title,validQuantity(row.qty),String(row.unit||'').trim().slice(0,40),now());
          receipt.checked=Boolean(row.done);receipt.import_source_id=id;
          if(f.homeSupported===true)receipt.at_home_quantity=0;
          inserted=true;return receipt;
        },epoch,context);
        guard();f.cache.set(id,receipt);receipts.push({...receipt,token:row.token});if(inserted)added++;
      }
      if(added){repaint();void sync();}
      return options.receipt?{scope:context,added,receipts}:added;
    },
    resolve: choose, sync
  }),
  getContext: () => {const binding=verifiedBinding();return f.context ? { householdId: f.householdId, userId: f.session?.user_id,...(binding?{memberId:binding.memberId,permissions:{...binding.permissions},identityVerified:true,familyRevision:binding.familyRevision||null}:{} ) } : null;},
  authorized, meta, putMeta, updateMeta, esc, showMessage, repaint, openModal,
  storageFetch,
  getModuleStatus(module) { return f.provider?.statusFor?.(module) || 'Module non chargé'; },
  isModuleActive(module) {return Boolean(f.context && f.provider?.isActive?.(module));},
  isModuleConfigured(module) {return f.provider?.isConfigured?.(module)??null;},
  registerModules(provider) {
    f.provider = provider;
    // A provider may register before or after boot(), including while sync()
    // is already in progress. Always rerun membership verification before
    // enabling its module UI, even if the grocery household is cached.
    if (f.ready && f.session && provider?.start) void sync();
    repaint();
  }
});
async function loadPublicKey(){
 const existing=await meta('publicKey');if(existing){try{return validateKey(existing);}catch{return null;}}
 let config=window.DobbyPublicConfig;
 if(!config)try{if(window.parent&&window.parent!==window&&window.parent.location.origin===window.location.origin)config=window.parent.DobbyPublicConfig;}catch{}
 if(!config||config.projectRef&&config.projectRef!=='pqcdkrwljgvgagzwrcmg')return null;
 try{const key=validateKey(config.publicKey);await putMeta('publicKey',key);return key;}catch{return null;}
}
async function boot() {
  try {
    f.core = await import('./family-core.mjs');
    f.db = await openDb(DB_NAME, 1, true);
    f.key = await loadPublicKey();
    f.session = await meta('session');
    f.ready = true;
    if (f.session) {
      await restoreCachedHousehold();
      repaint();
      void sync();
    } else repaint();
  } catch (e) { showMessage('Initialisation familiale impossible : ' + fail(e)); }
}
window.addEventListener('online', () => void sync());
document.addEventListener('visibilitychange', () => { if (!document.hidden) void sync(); });
setInterval(() => { if (!document.hidden && f.session) void sync(); }, 45000);
createOverlay();
render();
void boot();
})();

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
  lastSync: null, error: '', notice: '', ready: false, modalOpen: false, provider: null
};
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
async function loadItems() {
  const list = await dbCall(f.db, 'items', 'getAll');
  f.cache = new Map(list.filter(x => f.context && x.storageKey.startsWith(f.context + '|'))
    .map(x => [x.id, x]));
}
function getItem(id) { return f.cache.get(id) || null; }
async function putItem(entry) {
  if (!f.context) throw Error('Foyer non identifié');
  const row = { ...entry, storageKey: f.context + '|' + entry.id };
  await dbCall(f.db, 'items', 'put', row);
  f.cache.set(row.id, row);
}
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
    error.code = data?.code;
    throw error;
  }
  return data;
}
async function keepSession(result) {
  if (!result?.access_token || !result?.refresh_token) throw Error('Jetons de connexion incomplets');
  const old = f.session || {};
  f.session = {
    access_token: result.access_token, refresh_token: result.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + Number(result.expires_in || 3600),
    user_id: result.user?.id || old.user_id,
    email: result.user?.email || old.email || ''
  };
  await putMeta('session', f.session);
}
async function refreshToken() {
  if (!f.session?.refresh_token) throw Error('Session expirée');
  const result = await raw('/auth/v1/token?grant_type=refresh_token', 'POST', {
    refresh_token: f.session.refresh_token
  });
  await keepSession(result);
}
async function token() {
  if (!f.session) throw Error('Connexion requise');
  if ((f.session.expires_at || 0) - Math.floor(Date.now() / 1000) < 90) await refreshToken();
  return f.session.access_token;
}
async function authorized(method, query, body, headers = {}) {
  let bearer = await token();
  try { return await raw('/rest/v1/' + query, method, body, headers, bearer); }
  catch (e) {
    if (e.status !== 401) throw e;
    await refreshToken(); bearer = f.session.access_token;
    return raw('/rest/v1/' + query, method, body, headers, bearer);
  }
}
async function requireHousehold() {
  if (!f.session?.user_id) throw Error('Compte sans identifiant utilisateur');
  const epoch = f.epoch;
  const rows = await authorized('GET', 'dobby_v2_memberships?select=household_id&active=eq.true&user_id=eq.' +
    encodeURIComponent(f.session.user_id));
  if (epoch !== f.epoch) throw Error('Session remplacée');
  if (!Array.isArray(rows) || rows.length !== 1 || !rows[0]?.household_id) {
    throw Error('Ce compte doit appartenir à un seul foyer actif pour cette version.');
  }
  const hh = rows[0].household_id;
  const context = f.session.user_id + '|' + hh;
  const household = await authorized('GET', 'dobby_v2_households?select=id&id=eq.' + encodeURIComponent(hh));
  if (!Array.isArray(household) || household.length !== 1) throw Error('Accès au foyer non autorisé');
  if (epoch !== f.epoch) throw Error('Session remplacée');
  // V5's local state is one namespace per browser profile; prevent sharing a
  // single profile between households until full partitioning is implemented.
  const deviceHousehold = await meta('deviceHouseholdId');
  if (deviceHousehold && deviceHousehold !== hh) {
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
  const rows = await authorized('GET', 'dobby_v2_grocery?select=id,title,quantity,unit,checked,created_at,updated_at,deleted_at,revision,import_source_id&household_id=eq.' +
    encodeURIComponent(f.householdId) + '&order=created_at.asc');
  if (epoch !== f.epoch) return;
  if (!Array.isArray(rows)) throw Error('Réponse serveur incohérente');
  for (const row of rows) {
    if (epoch !== f.epoch) return;
    const merged = f.core.mergeRemote(getItem(row.id), row);
    await putItem(merged);
  }
}
async function readOne(id) {
  const rows = await authorized('GET', 'dobby_v2_grocery?select=*&id=eq.' +
    encodeURIComponent(id) + '&household_id=eq.' + encodeURIComponent(f.householdId));
  return rows?.[0] || null;
}
async function conflict(snapshot, server, epoch) {
  if (epoch !== f.epoch) return;
  const local = getItem(snapshot.id);
  if (!local || local.syncState === 'clean') return;
  if (server && f.core.sameFields(local, server)) return putItem(f.core.cleanFromRemote(server));
  await putItem({ ...local, syncState: 'conflict', remoteShadow: server });
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
  const current = getItem(snapshot.id);
  if (current) await putItem(f.core.afterPush(current, snapshot, server));
}
async function sync() {
  if (!f.ready || !f.session || !f.key) return;
  if (f.syncing) { f.again = true; return; }
  f.syncing = true;
  const epoch = f.epoch;
  try {
    await requireHousehold();
    if (epoch !== f.epoch) return;
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
    if (epoch === f.epoch) f.error = fail(e);
  } finally {
    f.syncing = false;
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
  await keepSession(result);
  f.context = null; f.householdId = null;
  try {
    await requireHousehold();
    await loadItems();
    await sync();
  } catch (e) {
    // Never retain a new session after a refused household switch.
    f.epoch += 1; f.session = null; f.context = null; f.householdId = null;
    f.cache.clear();
    await delMeta('session');
    throw e;
  }
  refreshModal(); repaint();
}
async function logout() {
  const old = f.session;
  f.epoch += 1;
  f.session = null; f.context = null; f.householdId = null;
  f.cache.clear(); f.lastSync = null; f.error = '';
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
  if (importId) candidate.import_source_id = importId;
  await putItem(candidate);
  repaint();
}
async function change(id, values) {
  const current = getItem(id);
  if (!current) throw Error('Article introuvable sur cet appareil');
  await putItem(f.core.editLocal(current, values, now()));
  repaint(); void sync();
}
async function choose(id, mode) {
  const current = getItem(id);
  if (!current) throw Error('Article introuvable');
  await putItem(f.core.resolveConflict(current, mode));
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
window.DobbyFamilyUI = Object.freeze({
  getContext: () => f.context ? { householdId: f.householdId, userId: f.session?.user_id } : null,
  authorized, meta, putMeta, esc, showMessage, repaint, openModal,
  getModuleStatus(module) { return f.provider?.statusFor?.(module) || 'Module non chargé'; },
  registerModules(provider) {
    f.provider = provider;
    // A provider may register before or after boot(), including while sync()
    // is already in progress. Always rerun membership verification before
    // enabling its module UI, even if the grocery household is cached.
    if (f.ready && f.session && provider?.start) void sync();
    repaint();
  }
});
async function boot() {
  try {
    f.core = await import('./family-core.mjs');
    f.db = await openDb(DB_NAME, 1, true);
    f.key = await meta('publicKey');
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
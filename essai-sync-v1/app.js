import {
  newLocal, editLocal, mergeRemote, afterPush, resolveConflict,
  toServerPayload, cleanFromRemote, sameFields
} from './core.mjs';

const PROJECT = 'https://pqcdkrwljgvgagzwrcmg.supabase.co';
const DB = 'dobby-sync-pilot-v1';
const KEY_PREFIX = 'sb_publishable_';
const el = id => document.getElementById(id);
const state = { db: null, key: null, session: null, working: false, again: false, editing: null, lastError: '', lastSync: null, sessionEpoch: 0 };

function now() { return new Date().toISOString(); }
function say(message, kind = '') {
  el('notice').textContent = message;
  el('notice').className = 'notice ' + kind;
}
function show(screen) {
  for (const id of ['configScreen', 'authScreen', 'appScreen']) el(id).hidden = id !== screen;
}
function openLocal() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('items')) db.createObjectStore('items', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Stockage bloqué par un autre onglet.'));
  });
}
function idb(store, method, value) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(store, method === 'get' || method === 'getAll' ? 'readonly' : 'readwrite');
    const request = value === undefined ? tx.objectStore(store)[method]() : tx.objectStore(store)[method](value);
    let result;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction locale annulée.'));
  });
}
async function getMeta(id) { const r = await idb('meta', 'get', id); return r?.value ?? null; }
async function putMeta(id, value) { return idb('meta', 'put', { id, value }); }
async function items() { return idb('items', 'getAll'); }
async function item(id) { return idb('items', 'get', id); }
async function putItem(value) { await idb('items', 'put', value); }
async function wipeSession() {
  state.sessionEpoch += 1;
  await idb('items', 'clear');
  await idb('meta', 'delete', 'session');
  state.session = null;
}

function failureMessage(error) {
  if (error instanceof TypeError) return 'Serveur inaccessible. Vos modifications restent sur cet appareil.';
  return error?.message || 'Une erreur inconnue est survenue.';
}
async function rawRequest(path, method, body, extra = {}, bearer = null) {
  if (!state.key) throw new Error('Clé publiable manquante.');
  const headers = { 'apikey': state.key, ...extra };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (bearer) headers['Authorization'] = 'Bearer ' + bearer;
  const response = await fetch(PROJECT + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store'
  });
  const txt = await response.text();
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  if (!response.ok) {
    const error = new Error(data?.msg || data?.error_description || data?.message || 'Erreur HTTP ' + response.status);
    error.status = response.status; error.code = data?.code;
    throw error;
  }
  return data;
}
async function keepSession(data) {
  if (!data?.access_token || !data?.refresh_token) throw new Error('Réponse de connexion incomplète.');
  const previous = state.session || {};
  state.session = {
    access_token: data.access_token, refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
    user_id: data.user?.id || previous.user_id || null,
    email: data.user?.email || previous.email || ''
  };
  await putMeta('session', state.session);
}
async function refreshSession() {
  if (!state.session?.refresh_token) throw new Error('Session absente.');
  const next = await rawRequest('/auth/v1/token?grant_type=refresh_token', 'POST', {
    refresh_token: state.session.refresh_token
  });
  await keepSession(next);
}
async function token() {
  if (!state.session) throw new Error('Veuillez vous connecter.');
  if ((state.session.expires_at || 0) - Math.floor(Date.now() / 1000) < 90) await refreshSession();
  return state.session.access_token;
}
async function authorized(method, url, body, options = {}) {
  let access = await token();
  try {
    return await rawRequest('/rest/v1/' + url, method, body, options, access);
  } catch (error) {
    if (error.status !== 401) throw error;
    await refreshSession();
    access = state.session.access_token;
    return rawRequest('/rest/v1/' + url, method, body, options, access);
  }
}
async function fetchRemote() {
  return authorized('GET', 'dobby_sync_grocery_items?select=id,title,quantity,unit,checked,created_at,updated_at,deleted_at,revision&order=created_at.asc');
}
async function fetchOne(id) {
  const rows = await authorized('GET', 'dobby_sync_grocery_items?select=*&id=eq.' + encodeURIComponent(id));
  return rows?.[0] || null;
}
async function checkMember() {
  if (!state.session?.user_id) throw new Error('Identifiant utilisateur absent.');
  const rows = await authorized('GET', 'dobby_sync_members?select=user_id&active=eq.true&user_id=eq.' + encodeURIComponent(state.session.user_id));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('Compte non autorisé pour le foyer Dobby.');
}

async function pull(epoch) {
  const remote = await fetchRemote();
  if (epoch !== state.sessionEpoch) throw new Error('Session modifiée.');
  if (!Array.isArray(remote)) throw new Error('Réponse de synchronisation inattendue.');
  for (const row of remote) {
    if (epoch !== state.sessionEpoch) throw new Error('Session modifiée.');
    const current = await item(row.id);
    if (epoch !== state.sessionEpoch) throw new Error('Session modifiée.');
    await putItem(mergeRemote(current, row));
  }
  return remote.length;
}

async function markConflict(snapshot, server, epoch) {
  if (epoch !== state.sessionEpoch) return;
  const current = await item(snapshot.id);
  if (epoch !== state.sessionEpoch) return;
  if (!current || current.syncState === 'clean') return;
  if (server && sameFields(current, server)) {
    await putItem(cleanFromRemote(server));
    return;
  }
  await putItem({ ...current, syncState: 'conflict', remoteShadow: server });
}

async function pushOne(snapshot, epoch) {
  if (epoch !== state.sessionEpoch) return;
  if (snapshot.syncState !== 'pending') return;
  const original = { ...snapshot };
  let returned;
  if (original.baseRevision === 0) {
    try {
      returned = await authorized(
        'POST', 'dobby_sync_grocery_items',
        { id: original.id, ...toServerPayload(original) },
        { Prefer: 'return=representation' }
      );
    } catch (error) {
      if (error.status !== 409) throw error;
      const remote = await fetchOne(original.id);
      if (!remote) throw new Error('Article déjà présent, mais lecture impossible : intervention nécessaire.');
      await markConflict(original, remote, epoch);
      return;
    }
  } else {
    returned = await authorized(
      'PATCH',
      'dobby_sync_grocery_items?id=eq.' + encodeURIComponent(original.id) +
        '&revision=eq.' + encodeURIComponent(original.baseRevision),
      toServerPayload(original),
      { Prefer: 'return=representation' }
    );
    if (!Array.isArray(returned) || returned.length === 0) {
      const remote = await fetchOne(original.id);
      if (!remote) throw new Error('Modification refusée ou article inaccessible. Rien n’a été écrasé.');
      await markConflict(original, remote, epoch);
      return;
    }
  }
  const remote = returned?.[0];
  if (!remote) throw new Error('Aucun reçu serveur après la modification ; nouvelle vérification nécessaire.');
  if (epoch !== state.sessionEpoch) return;
  const current = await item(original.id);
  if (epoch === state.sessionEpoch && current) await putItem(afterPush(current, original, remote));
}

async function performSync() {
  if (!state.session || !state.key || document.hidden) return;
  if (state.working) { state.again = true; return; }
  state.working = true; state.lastError = '';
  const epoch = state.sessionEpoch;
  void renderStatus();
  try {
    await checkMember();
    if (epoch !== state.sessionEpoch) return;
    await pull(epoch);
    const pending = (await items()).filter(x => x.syncState === 'pending')
      .sort((a, b) => String(a.updated_at).localeCompare(String(b.updated_at)));
    for (const entry of pending) await pushOne(entry, epoch);
    await pull(epoch);
    if (epoch !== state.sessionEpoch) return;
    state.lastSync = new Date();
    say('Synchronisation terminée. Les modifications confirmées sont partagées entre les deux comptes.', 'ok');
  } catch (error) {
    state.lastError = failureMessage(error);
    say(state.lastError, 'error');
  } finally {
    state.working = false;
    await render();
    if (state.again) {
      state.again = false;
      // No network retry loop; a changed session may begin its own first sync.
      if (!state.lastError || epoch !== state.sessionEpoch) void performSync();
    }
  }
}

function make(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = String(value);
  return node;
}
function button(text, className, handler) {
  const btn = make('button', className, text);
  btn.type = 'button'; btn.addEventListener('click', handler);
  return btn;
}
function statusText(data) {
  const conflicts = data.filter(x => x.syncState === 'conflict').length;
  const pending = data.filter(x => x.syncState === 'pending').length;
  if (state.working) return { text: 'Synchronisation…', css: '' };
  if (conflicts) return { text: conflicts + ' conflit(s) à résoudre', css: 'warn' };
  if (pending) return { text: pending + ' modification(s) en attente', css: 'warn' };
  if (state.lastError) return { text: 'Réseau ou accès à vérifier', css: 'warn' };
  return { text: state.lastSync ? 'À jour avec la famille' : 'En attente de connexion', css: state.lastSync ? 'good' : '' };
}
async function renderStatus(existing) {
  const all = existing || await items();
  const pending = all.filter(x => x.syncState !== 'clean').length;
  const visible = all.filter(x => !x.deleted_at);
  const status = statusText(all);
  el('syncIndicator').textContent = status.text;
  el('syncIndicator').className = 'statuspill ' + status.css;
  el('pendingCount').textContent = pending ? pending + ' modification(s) non confirmée(s)' : 'Aucun changement en attente';
  el('countLabel').textContent = visible.length + (visible.length > 1 ? ' articles' : ' article');
  el('syncButton').disabled = state.working;
}

function buildEdit(itemData, parent) {
  const form = make('form', 'editform');
  const nameLabel = make('label', '', 'Article');
  const nameInput = make('input'); nameInput.type = 'text'; nameInput.maxLength = 200; nameInput.required = true;
  nameInput.value = itemData.title; nameInput.setAttribute('aria-label', 'Nom de l’article');
  const cols = make('div', 'formcols');
  const qtyWrap = make('div'), unitWrap = make('div');
  const qtyLabel = make('label', '', 'Quantité'), unitLabel = make('label', '', 'Unité');
  const qty = make('input'); qty.type = 'number'; qty.min = '0'; qty.max = '999999'; qty.step = 'any'; qty.required = true; qty.value = itemData.quantity;
  const unit = make('input'); unit.type = 'text'; unit.maxLength = 40; unit.value = itemData.unit;
  qtyWrap.append(qtyLabel, qty); unitWrap.append(unitLabel, unit); cols.append(qtyWrap, unitWrap);
  const actions = make('div', 'edit-actions');
  const submit = make('button', 'primary', 'Enregistrer'); submit.type = 'submit';
  actions.append(submit, button('Annuler', 'tertiary', () => { state.editing = null; void render(); }));
  form.append(nameLabel, nameInput, cols, actions);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const title = nameInput.value.trim(), quantity = Number(qty.value);
    if (!title || !Number.isFinite(quantity) || quantity < 0 || quantity > 999999) return;
    await change(itemData.id, { title, quantity: Math.round(quantity * 100) / 100, unit: unit.value.trim() });
    state.editing = null;
  });
  parent.append(form);
}
function describe(itemData) {
  return (itemData.quantity === 1 ? '' : itemData.quantity + ' × ') + itemData.unit;
}
function conflictDescription(itemData) {
  if (!itemData) return 'Version introuvable.';
  if (itemData.deleted_at) return 'Article supprimé';
  return itemData.title + ' · ' + itemData.quantity + ' ' + (itemData.unit || '') +
    (itemData.checked ? ' · coché' : ' · non coché');
}
function buildItem(data) {
  const li = make('li', 'item');
  const top = make('div', 'itemtop');
  const cb = make('input', 'itemcheck'); cb.type = 'checkbox'; cb.checked = !!data.checked;
  cb.disabled = !!data.deleted_at || data.syncState === 'conflict';
  cb.setAttribute('aria-label', 'Cocher ' + data.title);
  cb.addEventListener('change', () => void change(data.id, { checked: cb.checked }));
  const info = make('div', 'itemmain');
  info.append(make('div', 'itemtitle ' + (data.checked ? 'done' : ''), data.title));
  info.append(make('div', 'itemmeta', (data.quantity || '0') + ' ' + (data.unit || 'unité(s)')));
  if (data.syncState === 'pending') info.append(make('span', 'pending', '⏳ En attente d’envoi'));
  if (data.syncState === 'conflict') info.append(make('span', 'pending', '⚠ Versions différentes'));
  top.append(cb, info); li.append(top);
  if (!data.deleted_at && data.syncState !== 'conflict') {
    const actions = make('div', 'item-actions');
    actions.append(button('Modifier', 'secondary', () => { state.editing = data.id; void render(); }));
    actions.append(button('Supprimer', 'danger', () => void change(data.id, { deleted_at: now() })));
    li.append(actions);
    if (state.editing === data.id) buildEdit(data, li);
  }
  if (data.syncState === 'conflict') {
    const panel = make('div', 'conflict');
    panel.append(make('h3', '', 'Conflit de synchronisation'));
    panel.append(make('p', '', 'Sur cet iPhone : ' + conflictDescription(data)));
    panel.append(make('p', '', 'Sur le serveur : ' + conflictDescription(data.remoteShadow)));
    if (data.remoteShadow) {
      const actions = make('div', 'conflict-actions');
      actions.append(button('Garder ma version', 'secondary', () => void choose(data.id, 'local')));
      actions.append(button('Prendre la version familiale', 'secondary', () => void choose(data.id, 'server')));
      panel.append(actions);
    } else panel.append(make('p', '', 'Le serveur est inaccessible. Réessayez après reconnexion.'));
    li.append(panel);
  }
  return li;
}
async function render() {
  if (!state.db) return;
  const all = (await items()).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const visible = all.filter(x => !x.deleted_at || x.syncState === 'conflict');
  el('itemsList').replaceChildren();
  if (!visible.length) el('itemsList').append(make('li', 'empty', 'Aucun article pour le moment.'));
  for (const data of visible) el('itemsList').append(buildItem(data));
  el('accountLabel').textContent = state.session?.email || 'Compte familial';
  await renderStatus(all);
}
async function change(id, changes) {
  try {
    const existing = await item(id);
    if (!existing) throw new Error('Article local introuvable.');
    await putItem(editLocal(existing, changes, now()));
    await render();
    void performSync();
  } catch (error) { say(failureMessage(error), 'error'); }
}
async function choose(id, preference) {
  try {
    const existing = await item(id);
    await putItem(resolveConflict(existing, preference));
    await render(); void performSync();
  } catch (error) { say(failureMessage(error), 'error'); }
}

function validatePublicKey(value) {
  const key = String(value || '').trim();
  if (!key.startsWith(KEY_PREFIX) || key.length < KEY_PREFIX.length + 15 || key.length > 300) {
    throw new Error('Seule la clé publiable sb_publishable_… est acceptée. Ne jamais utiliser une clé secrète.');
  }
  return key;
}
async function boot() {
  try {
    state.db = await openLocal();
    state.key = await getMeta('publicKey');
    state.session = await getMeta('session');
    if (!state.key) { show('configScreen'); say('Saisissez la clé publiable Supabase une seule fois.'); return; }
    if (!state.session) { show('authScreen'); say('Connectez-vous avec votre compte familial.'); return; }
    show('appScreen');
    say('Session conservée sur cet appareil. Vérification de la synchronisation en cours.');
    await render();
    void performSync();
  } catch (error) { say('Impossible d’utiliser le stockage local : ' + failureMessage(error), 'error'); }
}

el('configForm').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    state.key = validatePublicKey(el('publicKey').value);
    await putMeta('publicKey', state.key);
    el('publicKey').value = '';
    show('authScreen'); say('Configuration enregistrée localement. Connectez-vous maintenant.', 'ok');
  } catch (error) { say(failureMessage(error), 'error'); }
});
el('resetConfig').addEventListener('click', async () => {
  await idb('meta', 'delete', 'publicKey'); state.key = null;
  show('configScreen'); say('Renseignez la clé publiable du projet Dobby.');
});
el('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const result = await rawRequest('/auth/v1/token?grant_type=password', 'POST', {
      email: el('email').value.trim(), password: el('password').value
    });
    await keepSession(result);
    await checkMember();
    el('password').value = '';
    show('appScreen');
    say('Connexion autorisée. Récupération de la liste familiale…');
    await render(); void performSync();
  } catch (error) {
    // Never display cached data for a user who has failed the membership check.
    await wipeSession();
    say('Connexion refusée : ' + failureMessage(error), 'error');
  } finally { submit.disabled = false; }
});
el('logout').addEventListener('click', async () => {
  const old = state.session;
  await wipeSession();
  state.lastSync = null; state.lastError = '';
  show('authScreen'); say('Session fermée et cache familial effacé de cet appareil.', 'ok');
  if (old?.access_token) {
    void rawRequest('/auth/v1/logout', 'POST', undefined, {}, old.access_token).catch(() => {});
  }
});
el('addForm').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const title = el('itemTitle').value.trim();
    const quantity = Number(el('itemQuantity').value);
    const unit = el('itemUnit').value.trim();
    if (!title || title.length > 200 || !Number.isFinite(quantity) || quantity < 0 || quantity > 999999) {
      throw new Error('Nom ou quantité invalide.');
    }
    const entry = newLocal(crypto.randomUUID(), title, Math.round(quantity * 100) / 100, unit, now());
    await putItem(entry);
    event.currentTarget.reset(); el('itemQuantity').value = 1;
    await render();
    say('Article enregistré localement. Synchronisation dès que le réseau le permet.');
    void performSync();
  } catch (error) { say(failureMessage(error), 'error'); }
});
el('syncButton').addEventListener('click', () => void performSync());
window.addEventListener('online', () => void performSync());
document.addEventListener('visibilitychange', () => { if (!document.hidden) void performSync(); });
setInterval(() => { if (!document.hidden) void performSync(); }, 30000);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
void boot();

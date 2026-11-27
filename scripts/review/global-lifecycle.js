/* Durable lifecycle for the fictional launch scenario. All storage is under its namespace. */
(() => {
  'use strict';
  const config = window.DobbyReviewConfig;
  const raw = Storage.prototype.__reviewRaw;
  const prefix = window.DobbyGlobalScenario.namespace;
  const backendKey = `${prefix}backend-v1`;
  const resetKey = `${prefix}reset-in-progress`;
  const selectedKey = `${prefix}selected-client`;
  const sessionKey = 'globalFixtureSignedOut';
  const generationKey = 'globalFixtureGeneration';
  const nativeDB = 'dobby-v5-household-preview-v2';
  const stateKey = 'dobby-v5-familial-preview-20261108';
  const scopedOpen = indexedDB.open.bind(indexedDB);
  const scopedDelete = indexedDB.deleteDatabase.bind(indexedDB);
  const notify = () => window.dispatchEvent(new Event('dobby:demo-change'));
  const readLocal = key => raw.getItem.call(localStorage, key);
  const putLocal = (key, value) => raw.setItem.call(localStorage, key, value);
  const removeLocal = key => raw.removeItem.call(localStorage, key);
  const shellStorage = name => config.storagePrefix + name;
  const resetChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(`${prefix}reset`) : null;
  const withLock = fn => navigator.locks?.request
    ? navigator.locks.request(backendKey, fn)
    : Promise.reject(Error('La démonstration exige localhost et un navigateur compatible avec Web Locks.'));
  function clearOwned(storage, preserve = []) {
    const keys = Array.from({ length: raw.length.call(storage) }, (_, index) => raw.key.call(storage, index));
    for (const key of keys) {
      if (key?.startsWith(prefix) && !preserve.includes(key)) raw.removeItem.call(storage, key);
    }
  }
  async function deleteOwnedDatabases() {
    const databases = await indexedDB.databases();
    await Promise.all(databases.filter(database => database.name?.startsWith(prefix)).map(database => new Promise((resolve, reject) => {
      const request = IDBFactory.prototype.deleteDatabase.call(indexedDB, database.name);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
      // A blocked request is still queued by the browser. Keep the marker
      // until the connection closes and the deletion actually completes.
      request.onblocked = () => window.dispatchEvent(new Event('dobby:demo-reset-blocked'));
    })));
  }
  function database(action) {
    return new Promise((resolve, reject) => {
      const open = scopedOpen(nativeDB, 1);
      open.onupgradeneeded = () => {
        for (const [name, keyPath] of [['items', 'storageKey'], ['meta', 'id']]) {
          if (!open.result.objectStoreNames.contains(name)) open.result.createObjectStore(name, { keyPath });
        }
      };
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const transaction = db.transaction(['meta', 'items'], 'readwrite');
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onabort = () => { db.close(); reject(transaction.error || Error('Initialisation de la session fictive interrompue.')); };
        try { action(transaction); }
        catch (error) { transaction.abort(); reject(error); }
      };
    });
  }
  function decodeMarker(value, generation) {
    try {
      const marker = JSON.parse(value);
      if (typeof marker?.token === 'string' && Number.isSafeInteger(marker.targetGeneration)) return marker;
    } catch {}
    return { token: value, targetGeneration: generation + 1 };
  }
  function create({ seed, client, session, prepare }) {
    let generation;
    let previouslySuspended;
    let previouslySignedOut;
    let reloading = false;
    const read = () => JSON.parse(readLocal(backendKey));
    const write = value => putLocal(backendKey, JSON.stringify(value));
    const suspended = state => state.suspended?.[client] === true;
    const signedOut = () => readLocal(shellStorage(sessionKey)) === 'true';
    const pending = () => Boolean(readLocal(resetKey) || generation !== undefined && read()?.generation !== generation);
    const isOffline = () => sessionStorage.getItem('globalFixtureOffline') === 'true';
    const setOffline = value => { sessionStorage.setItem('globalFixtureOffline', String(Boolean(value))); notify(); };
    const locked = task => withLock(() => {
      if (pending()) throw Error('Réinitialisation de la démonstration en cours.');
      return task();
    });
    function reconcile() {
      if (window !== top || reloading || generation === undefined) return;
      const state = read();
      if (!readLocal(resetKey) && state && (state.generation !== generation || suspended(state) !== previouslySuspended || signedOut() !== previouslySignedOut)) {
        reloading = true;
        if (state.generation !== generation) clearOwned(sessionStorage);
        location.reload();
      } else notify();
    }
    async function finishReset() {
      const value = readLocal(resetKey);
      if (!value) return;
      const previous = read();
      const marker = decodeMarker(value, previous?.generation ?? 0);
      if ((previous?.generation ?? 0) < marker.targetGeneration) {
        await deleteOwnedDatabases();
        clearOwned(localStorage, [resetKey, backendKey]);
        clearOwned(sessionStorage);
        write(seed(previous?.day, marker.targetGeneration));
      }
      removeLocal(resetKey);
      resetChannel?.postMessage({ type: 'complete' });
    }
    const ready = withLock(async () => {
      await finishReset();
      if (!read()) write(seed());
      const state = read();
      const revision = String(state.generation);
      const fresh = readLocal(shellStorage(generationKey)) !== revision;
      await database(transaction => {
        const metadata = transaction.objectStore('meta');
        if (fresh) {
          transaction.objectStore('items').clear();
          metadata.clear();
          const initial = prepare(state);
          putLocal(shellStorage(stateKey), JSON.stringify(initial.snapshot));
          metadata.put({ id: 'v2-module-state:' + session.user_id + '|' + state.household, value: initial.modules });
        }
        metadata.put({ id: 'publicKey', value: session.key });
        metadata.put({ id: 'deviceHouseholdId', value: state.household });
        if (signedOut() || suspended(state)) {
          metadata.delete('session');
          metadata.delete('verifiedContext');
        } else {
          metadata.put({ id: 'session', value: session });
          metadata.put({ id: 'verifiedContext', value: session.user_id + '|' + state.household });
        }
      });
      putLocal(shellStorage(generationKey), revision);
      generation = state.generation;
      previouslySuspended = suspended(state);
      previouslySignedOut = signedOut();
    });
    function guard(operation) {
      return function (...args) {
        if (pending()) throw Error('Réinitialisation de la démonstration en cours.');
        return operation.apply(this, args);
      };
    }
    for (const key of ['setItem', 'removeItem', 'clear']) Storage.prototype[key] = guard(Storage.prototype[key]);
    indexedDB.open = guard(scopedOpen);
    indexedDB.deleteDatabase = guard(scopedDelete);
    if (resetChannel) resetChannel.onmessage = reconcile;
    window.addEventListener('storage', event => {
      if (event.storageArea === localStorage && [backendKey, resetKey, shellStorage(sessionKey)].includes(event.key)) reconcile();
    });
    window.addEventListener('pageshow', reconcile);
    window.addEventListener('focus', reconcile);
    async function reset() {
      await ready;
      const token = crypto.randomUUID();
      if (!readLocal(resetKey)) putLocal(resetKey, JSON.stringify({ token, targetGeneration: generation + 1 }));
      resetChannel?.postMessage({ type: 'prepare' });
      await withLock(finishReset);
      reconcile();
    }
    async function setSession(enabled) {
      await ready;
      await locked(() => {
        if (enabled && suspended(read())) throw Error('Ce profil fictif est suspendu.');
        if (enabled) removeLocal(shellStorage(sessionKey));
        else putLocal(shellStorage(sessionKey), 'true');
      });
      location.reload();
    }
    function selectClient(code) {
      if (!window.DobbyGlobalScenario.profiles.some(profile => profile.code === code)) throw Error('Profil fictif inconnu.');
      if (pending()) throw Error('Réinitialisation de la démonstration en cours.');
      // Each tab keeps its own character across navigations without a query.
      raw.setItem.call(sessionStorage, selectedKey, code);
      const url = new URL('essai-stitch-v7/traverse.html', DobbyReview.root);
      url.searchParams.set('client', code);
      location.assign(url);
    }
    return { read, write, ready, pending, locked, reset, setOffline, isOffline, selectClient, signedOut,
      endSession: () => setSession(false), startSession: () => setSession(true), notify };
  }
  window.DobbyGlobalLifecycle = Object.freeze({ create });
})();

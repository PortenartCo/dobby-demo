// Pure merge rules: shared by browser pilot and automated tests.
// No network calls, credentials, or browser storage in this module.

export function comparable(row) {
  const stamp = row?.deleted_at ? Date.parse(row.deleted_at) : null;
  return {
    title: String(row?.title ?? '').trim(),
    quantity: Number(row?.quantity ?? 1),
    unit: String(row?.unit ?? '').trim(),
    checked: Boolean(row?.checked),
    deleted_at: Number.isFinite(stamp) ? stamp : null
  };
}

export function sameFields(a, b) {
  return JSON.stringify(comparable(a)) === JSON.stringify(comparable(b));
}

export function cleanFromRemote(row) {
  return {
    id: row.id, title: row.title, quantity: Number(row.quantity),
    unit: row.unit || '', checked: Boolean(row.checked),
    deleted_at: row.deleted_at || null,
    created_at: row.created_at, updated_at: row.updated_at,
    baseRevision: Number(row.revision),
    syncState: 'clean', remoteShadow: null, clientRev: 0
  };
}

export function newLocal(id, title, quantity, unit, now) {
  return {
    id, title: String(title).trim(), quantity: Number(quantity),
    unit: String(unit).trim(), checked: false, deleted_at: null,
    created_at: now, updated_at: now, baseRevision: 0,
    syncState: 'pending', remoteShadow: null, clientRev: 1
  };
}

export function editLocal(item, changes, now) {
  const editable = ['title', 'quantity', 'unit', 'checked', 'deleted_at'];
  const next = { ...item };
  for (const field of editable) {
    if (Object.prototype.hasOwnProperty.call(changes, field)) next[field] = changes[field];
  }
  next.updated_at = now;
  next.clientRev = (item.clientRev || 0) + 1;
  if (item.syncState !== 'conflict') next.syncState = 'pending';
  return next;
}

export function mergeRemote(local, remote) {
  if (!local) return cleanFromRemote(remote);
  const revision = Number(remote.revision);
  if (local.syncState === 'clean') {
    return revision >= local.baseRevision ? cleanFromRemote(remote) : local;
  }
  if (sameFields(local, remote)) return cleanFromRemote(remote);
  if (local.syncState === 'pending' && local.baseRevision === revision) return local;
  return { ...local, syncState: 'conflict', remoteShadow: remote };
}

export function afterPush(localNow, originalSnapshot, remote) {
  if (localNow.clientRev === originalSnapshot.clientRev && sameFields(localNow, remote)) {
    return cleanFromRemote(remote);
  }
  if (localNow.clientRev !== originalSnapshot.clientRev && localNow.syncState === 'pending') {
    return { ...localNow, baseRevision: Number(remote.revision), remoteShadow: null };
  }
  return localNow;
}

export function resolveConflict(item, preference) {
  if (item.syncState !== 'conflict' || !item.remoteShadow) {
    throw new Error('Pas de version serveur disponible pour résoudre ce conflit.');
  }
  if (preference === 'server') return cleanFromRemote(item.remoteShadow);
  if (preference === 'local') {
    return {
      ...item, baseRevision: Number(item.remoteShadow.revision),
      clientRev: (item.clientRev || 0) + 1, syncState: 'pending', remoteShadow: null
    };
  }
  throw new Error('Choix de conflit inconnu.');
}

export function toServerPayload(item) {
  return {
    title: String(item.title).trim(),
    quantity: Number(item.quantity), unit: String(item.unit || ''),
    checked: Boolean(item.checked), deleted_at: item.deleted_at || null
  };
}

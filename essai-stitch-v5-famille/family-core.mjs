// Pure merge rules: shared by browser pilot and automated tests.
// No network calls, credentials, or browser storage in this module.
import {MISSION_V3_RELEASE_VERIFIED,normalizeMissionIntent} from './family-mission-intents.mjs';

export function comparable(row) {
  const stamp = row?.deleted_at ? Date.parse(row.deleted_at) : null;
  return {
    title: String(row?.title ?? '').trim(),
    quantity: row?.quantity == null ? null : Number(row.quantity),
    unit: String(row?.unit ?? '').trim(),
    checked: Boolean(row?.checked),
    at_home_quantity: Number(row?.at_home_quantity ?? 0),
    deleted_at: Number.isFinite(stamp) ? stamp : null
  };
}

export function sameFields(a, b) {
  return JSON.stringify(comparable(a)) === JSON.stringify(comparable(b));
}

export function cleanFromRemote(row) {
  return {
    id: row.id, title: row.title, quantity: row.quantity == null ? null : Number(row.quantity),
    unit: row.unit || '', checked: Boolean(row.checked),
    ...('at_home_quantity' in row ? {at_home_quantity:Number(row.at_home_quantity ?? 0)} : {}),
    deleted_at: row.deleted_at || null,
    created_at: row.created_at, updated_at: row.updated_at,
    baseRevision: Number(row.revision),
    syncState: 'clean', remoteShadow: null, clientRev: 0
  };
}

export function newLocal(id, title, quantity, unit, now) {
  return {
    id, title: String(title).trim(), quantity: quantity == null ? null : Number(quantity),
    unit: String(unit).trim(), checked: false, deleted_at: null,
    created_at: now, updated_at: now, baseRevision: 0,
    syncState: 'pending', remoteShadow: null, clientRev: 1
  };
}

export function editLocal(item, changes, now) {
  const editable = ['title', 'quantity', 'unit', 'checked', 'deleted_at', 'at_home_quantity'];
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
    quantity: item.quantity == null ? null : Number(item.quantity), unit: String(item.unit || ''),
    checked: Boolean(item.checked), deleted_at: item.deleted_at || null,
    ...('at_home_quantity' in item ? {at_home_quantity:Number(item.at_home_quantity ?? 0)} : {})
  };
}

/* Client transport guard. This never certifies or replaces server ACL/RLS.
 * Child mission completion remains unavailable until its server protocol is
 * installed and verified; own magic uses the existing targeted canonical RPC.
 */
const readRPCs=new Set(['dobby_v7_context','dobby_v7_preview_invitation','dobby_missions_v2_capabilities','dobby_missions_v3_capabilities']);
export function isCanonicalChildMissionCompletion({query='',body={},access=null}={}){
 if(access?.verified!==true||access.phase!=='active'||access.profile?.memberCategory!=='child'||!access.memberId||!access.householdId||access.permissions?.canCompleteMissionsV3!==true||
  query.split('?')[0].replace(/^rpc\//,'')!=='dobby_missions_v3_write'||Object.keys(body).some(key=>!['p_household_id','p_expected_revision','p_operation_id','p_intent'].includes(key))||
  body.p_household_id!==access.householdId||!Number.isSafeInteger(body.p_expected_revision)||body.p_expected_revision<1||typeof body.p_operation_id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.p_operation_id))return false;
 try{return normalizeMissionIntent(body.p_intent).kind==='complete';}catch{return false;}
}
export function assertSharedWrite({method='GET',query='',body={},access=null}={}) {
 if(['GET','HEAD','OPTIONS'].includes(method.toUpperCase()))return;
 const category=access?.profile?.memberCategory;
 // Preserve historical clients; the canonical V7 access router requires a
 // verified identity before shared use. A known child never inherits a parent
 // permission from a stale or malformed context.
 if(!category||category==='parent')return;
 const rpc=query.split('?')[0].replace(/^rpc\//,'');
 if(readRPCs.has(rpc))return;
 if(category==='child'&&access.verified===true&&access.phase==='active'&&
    rpc==='dobby_v7_update_magic'&&body?.p_member_id===access.memberId)return;
 if(MISSION_V3_RELEASE_VERIFIED&&method.toUpperCase()==='POST'&&isCanonicalChildMissionCompletion({query,body,access}))return;
 throw Error('Compte enfant en lecture seule : écriture partagée indisponible avant validation serveur. Seule sa propre Maison et son propre Patronus peuvent être modifiés.');
}

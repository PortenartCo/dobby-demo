import { validDate } from '../essai-stitch-v5-famille/family-agenda-core.mjs';

const brussels = new Intl.DateTimeFormat('en', {
  timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit'
});
const views = new Set(['people', 'private', 'practical', 'agenda', 'reminders']);
const mimeTypes = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

export function civilDay(now = new Date()) {
  const parts = Object.fromEntries(brussels.formatToParts(now).map(({ type, value }) => [type, value]));
  return [parts.year, parts.month, parts.day].join('-');
}

export function activeReminders(rows, now = new Date()) {
  const today = civilDay(now);
  const tomorrow = new Date(Date.parse(today + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
  const byWindow = new Map();
  for (const { id, date, time, offset } of rows) {
    if (!id || !((offset === 0 && date === today) || (offset === 1 && date === tomorrow))) continue;
    byWindow.set(`${id}|${date}|${offset}`, { id, date, offset, time });
  }
  return [...byWindow.values()];
}

export function agendaSlots(rows) {
  return rows.filter(row => validDate(row.date))
    .map(({ id, date, time }) => ({ id, date, time, title: 'Rendez-vous' }));
}

/**
 * Uses the verified native household session. The Storage adapter must use the
 * same session and the health-only bucket, sending authenticated requests.
 */
export function createHealthClient(native, storage) {
  function identity() {
    const context = native.getContext();
    if (!context?.identityVerified || !context.householdId || !context.memberId || !context.userId) {
      throw Error('Connexion au foyer vérifiée requise pour Santé.');
    }
    return { ...context, epoch: native.connectionState?.().epoch };
  }

  function assertIdentity(initial) {
    let current;
    try { current = identity(); } catch {}
    if (!current || ['userId', 'householdId', 'memberId', 'epoch'].some(key => current[key] !== initial[key])) {
      throw Error('Le compte ou le foyer a changé.');
    }
  }

  async function read(view, person) {
    if (!views.has(view) || ((view === 'private') !== Boolean(person))) {
      throw Error('Carnet ou vue Santé invalide.');
    }
    const actor = identity();
    const params = new URLSearchParams({ p_household_id: actor.householdId, p_view: view });
    if (person) params.set('p_member_id', person);
    const result = await native.authorized('GET', `rpc/dobby_health_read?${params}`);
    assertIdentity(actor);
    if (!Array.isArray(result)) throw Error('Réponse Santé inattendue.');
    return result;
  }

  async function write({ person, id, kind, values = {}, revision = 0, action = 'save', operationId }, actor = identity()) {
    assertIdentity(actor);
    const result = await native.authorized('POST', 'rpc/dobby_health_write', {
      p_household_id: actor.householdId,
      p_id: id,
      p_kind: kind,
      p_member_id: person,
      p_action: action,
      p_revision: revision,
      p_operation_id: operationId,
      p_values: values
    });
    assertIdentity(actor);
    if (result?.id !== id || result.revision !== revision + 1) {
      throw Error('Écriture Santé sans confirmation.');
    }
    return result;
  }

  function validateFile(file, path, actor) {
    if (!storage?.upload || !storage?.download) throw Error('Stockage Santé indisponible.');
    if (path && (typeof path !== 'string' || path.split('/')[0] !== actor.householdId ||
        !/^[^/]+\/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/i.test(path))) {
      throw Error('Chemin de document Santé invalide.');
    }
    if (file && (!mimeTypes.has(file.type) || file.size <= 0 || file.size > 10485760)) {
      throw Error('Choisissez un PDF ou une image JPEG, PNG ou WebP de 10 Mo maximum.');
    }
  }

  async function upload(person, file, pending, title, request = {}) {
    const actor = identity();
    validateFile(file, pending?.path, actor);
    if (!file) throw Error('Choisissez le fichier à envoyer.');
    if (pending && (pending.canUpload !== true || pending.fields?.mime !== file.type)) {
      throw Error('Ce fichier ne correspond pas à la pièce en attente.');
    }
    const registered = pending || await write({
      person, id: request.id || crypto.randomUUID(), kind: 'document',
      values: { title, mime: file.type }, operationId: request.operationId || crypto.randomUUID()
    }, actor);
    validateFile(file, registered.path, actor);
    await storage.upload(registered.path, file);
    assertIdentity(actor);
    return finalize(person, registered, actor, request.finalizeId);
  }

  function finalize(person, row, actor = identity(), operationId = crypto.randomUUID()) {
    return write({ person, id: row.id, kind: 'document', revision: row.revision,
      action: 'finalize', operationId }, actor);
  }

  async function download(row) {
    const actor = identity();
    if (!row?.path || row.fields?.ready !== true) throw Error('Document indisponible.');
    validateFile(null, row.path, actor);
    const file = await storage.download(row.path);
    assertIdentity(actor);
    if (!file || file.type !== row.fields.mime || file.size <= 0 || file.size > 10485760) {
      throw Error('Fichier inattendu.');
    }
    return file;
  }

  return Object.freeze({ read, write, upload, finalize, download });
}

/* Pure contract metadata and UTC calendar helpers. No storage or notification side effects. */
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const absent = value => value === undefined || value === null || value === '';
const text = value => typeof value === 'string' ? value.trim() : '';
const natural = value => Number.isSafeInteger(value) && value >= 0;
const positive = value => Number.isSafeInteger(value) && value > 0;
const clone = value => Array.isArray(value) ? value.map(clone)
  : object(value) ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clone(child)])) : value;
const metadata = row => object(row?.contract) ? row.contract : {};
const unknown = () => ({ date: null, source: 'unknown' });
const defaultReminders = [90, 30, 7];

function utcDate(year, month, day) {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/** Accept only real YYYY-MM-DD dates, in years 0001 through 9999. */
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = utcDate(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isoDate(date) {
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return null;
  return date.toISOString().slice(0, 10);
}

export function subtractDays(value, days) {
  if (!validDate(value) || !natural(days)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = utcDate(year, month - 1, day);
  date.setUTCDate(date.getUTCDate() - days);
  return isoDate(date);
}

/** Subtract calendar months directly, clamping the day to the target month's last day. */
export function subtractMonths(value, months) {
  if (!validDate(value) || !natural(months)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const target = year * 12 + month - 1 - months;
  if (target < 12 || target > 9999 * 12 + 11) return null;
  const targetYear = Math.floor(target / 12), targetMonth = target % 12;
  const lastDay = utcDate(targetYear, targetMonth + 1, 0).getUTCDate();
  return isoDate(utcDate(targetYear, targetMonth, Math.min(day, lastDay)));
}

export function subtractYears(value, years) {
  return natural(years) && Number.isSafeInteger(years * 12) ? subtractMonths(value, years * 12) : null;
}

function duration(value, units, defaultUnit, isValid) {
  const raw = object(value) ? value : {};
  const unitKnown = units.includes(raw.unit);
  return { ...clone(raw), value: unitKnown && isValid(raw.value) ? raw.value : null,
    unit: unitKnown ? raw.unit : defaultUnit };
}

/** Normalize a display/calculation copy. Use mergeContract on raw rows when saving old data. */
export function normalizeContract(row = {}) {
  const raw = metadata(row);
  const reminderValues = absent(raw.reminders) ? defaultReminders : Array.isArray(raw.reminders) ? raw.reminders : [];
  return {
    ...clone(raw), version: 1,
    type: text(raw.type) || (row?.category === 'Assurances' ? 'insurance' : 'other'),
    scope: ['house', 'equipment'].includes(raw.scope) ? raw.scope : 'house',
    equipmentIds: Array.isArray(raw.equipmentIds) ? [...new Set(raw.equipmentIds.filter(value => typeof value === 'string' && value.trim()))] : [],
    effectiveDate: validDate(raw.effectiveDate) ? raw.effectiveDate : null,
    autoRenewal: ['yes', 'no', 'unknown'].includes(raw.autoRenewal) ? raw.autoRenewal : 'unknown',
    renewalDuration: duration(raw.renewalDuration, ['months', 'years'], 'months', positive),
    notice: duration(raw.notice, ['days', 'months'], 'days', natural),
    renonDate: validDate(raw.renonDate) ? raw.renonDate : null,
    renonMethod: text(raw.renonMethod),
    reminders: [...new Set(reminderValues.filter(natural))].sort((a, b) => b - a),
    amount: typeof raw.amount === 'number' && Number.isFinite(raw.amount) && raw.amount >= 0 ? raw.amount : null,
    periodicity: text(raw.periodicity),
    terminationConditions: text(raw.terminationConditions),
    provenance: Array.isArray(raw.provenance) ? clone(raw.provenance) : [],
    uncertainties: Array.isArray(raw.uncertainties) ? clone(raw.uncertainties) : [],
  };
}

/** A recorded explicit date has precedence; an invalid explicit date blocks a guessed fallback. */
export function cancellation(row = {}) {
  const raw = metadata(row);
  if (!absent(raw.renonDate)) return validDate(raw.renonDate) ? { date: raw.renonDate, source: 'explicit' } : unknown();
  if (!validDate(row?.deadline) || !object(raw.notice) || !natural(raw.notice.value)) return unknown();
  const date = raw.notice.unit === 'days' ? subtractDays(row.deadline, raw.notice.value)
    : raw.notice.unit === 'months' ? subtractMonths(row.deadline, raw.notice.value) : null;
  return date ? { date, source: 'calculated' } : unknown();
}

/** An échéancier only: preparing these dates does not schedule or deliver notifications. */
export function reminderSchedule(row = {}) {
  const renon = cancellation(row).date;
  if (!renon) return [];
  return normalizeContract(row).reminders.map(days => ({ days, date: subtractDays(renon, days) })).filter(item => item.date);
}

/** Earliest upcoming useful date; retain overdue cancellation/expiry when all dates have passed. */
export function nextAction(row = {}, today = new Date().toISOString().slice(0, 10)) {
  if (!validDate(today)) return null;
  const actual = [cancellation(row).date, validDate(row?.deadline) ? row.deadline : null].filter(Boolean).sort();
  const upcoming = [...actual, ...reminderSchedule(row).map(item => item.date)].filter(date => date >= today).sort();
  return upcoming[0] || actual[0] || null;
}

/** Deeply merge supplied fields; omitted/undefined fields survive and explicit arrays replace. */
export function mergeContract(existing = {}, patch = {}) {
  if (!object(existing)) existing = {};
  if (!object(patch)) return clone(existing);
  const keys = new Set([...Object.keys(existing), ...Object.keys(patch)]);
  return Object.fromEntries([...keys].map(key => {
    const before = existing[key], after = Object.hasOwn(patch, key) ? patch[key] : undefined;
    return [key, after === undefined ? clone(before)
      : object(before) && object(after) ? mergeContract(before, after) : clone(after)];
  }));
}

/** Validate raw values so malformed legacy fields cannot be disguised by normalization. */
export function validateContract(row, equipmentIds) {
  if (!object(row)) return ['contract: une fiche objet est attendue.'];
  const errors = [];
  const error = (field, reason) => errors.push(field + ' : ' + reason);
  if (typeof row.title !== 'string' || !row.title.trim() || row.title.length > 140) error('title', 'le nom du contrat est obligatoire (140 caractères maximum).');
  for (const field of ['id', 'category', 'provider', 'reference', 'note']) {
    if (!absent(row[field]) && typeof row[field] !== 'string') error(field, 'texte attendu.');
  }
  for (const field of ['date', 'deadline']) {
    if (!absent(row[field]) && !validDate(row[field])) error(field, 'date YYYY-MM-DD valide attendue.');
  }
  if (row.contract === undefined || row.contract === null) return errors;
  if (!object(row.contract)) return [...errors, 'contract : objet attendu.'];
  const raw = row.contract;
  if (raw.version !== undefined && raw.version !== 1) error('version', 'version de contrat non prise en charge.');
  for (const field of ['type', 'renonMethod', 'periodicity', 'terminationConditions']) {
    if (!absent(raw[field]) && typeof raw[field] !== 'string') error(field, 'texte attendu.');
  }
  for (const [field, values] of [['scope', ['house', 'equipment']], ['autoRenewal', ['yes', 'no', 'unknown']]]) {
    if (!absent(raw[field]) && !values.includes(raw[field])) error(field, 'valeur non prise en charge.');
  }
  for (const field of ['effectiveDate', 'renonDate']) {
    if (!absent(raw[field]) && !validDate(raw[field])) error(field, 'date YYYY-MM-DD valide attendue.');
  }
  for (const [field, units, isValid] of [['renewalDuration', ['months', 'years'], positive], ['notice', ['days', 'months'], natural]]) {
    if (raw[field] === undefined || raw[field] === null) continue;
    const clause = raw[field];
    if (!object(clause)) { error(field, 'objet attendu.'); continue; }
    if (clause.value !== undefined && clause.value !== null && !isValid(clause.value)) error(field, 'valeur entière valide attendue.');
    if (clause.unit !== undefined && !units.includes(clause.unit) || clause.value !== undefined && clause.value !== null && !units.includes(clause.unit)) {
      error(field, 'unité valide obligatoire pour une valeur connue.');
    }
  }
  if (raw.amount !== undefined && raw.amount !== null && (typeof raw.amount !== 'number' || !Number.isFinite(raw.amount) || raw.amount < 0)) {
    error('amount', 'montant numérique fini et positif ou nul attendu.');
  }
  if (raw.reminders !== undefined && raw.reminders !== null && (!Array.isArray(raw.reminders) || raw.reminders.some(value => !natural(value)))) {
    error('reminders', 'liste de nombres entiers de jours positifs ou nuls attendue.');
  }
  for (const field of ['provenance', 'uncertainties']) {
    if (raw[field] !== undefined && raw[field] !== null && !Array.isArray(raw[field])) error(field, 'liste attendue.');
  }
  const ids = raw.equipmentIds;
  const validIds = Array.isArray(ids) && ids.every(value => typeof value === 'string' && value.trim()) && new Set(ids).size === ids.length;
  if (ids !== undefined && ids !== null && !validIds || raw.scope === 'equipment' && (!validIds || !ids.length)) {
    error('equipmentIds', 'sélectionner des identifiants d’équipements uniques et valides.');
  } else if (validIds && equipmentIds !== undefined) {
    const allowed = equipmentIds instanceof Set ? equipmentIds : new Set(Array.isArray(equipmentIds) ? equipmentIds : []);
    if (ids.some(id => !allowed.has(id))) error('equipmentIds', 'un équipement sélectionné n’est plus enregistré.');
  }
  return errors;
}

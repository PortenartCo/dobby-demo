import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validDate, subtractDays, subtractMonths, subtractYears,
  normalizeContract, cancellation, reminderSchedule, nextAction,
  mergeContract, validateContract,
} from '../contracts-model.mjs';

test('dates reject rolled-over calendar days, timestamps and coerced values', () => {
  for (const date of ['2024-02-29', '2000-02-29', '2026-11-13', '0099-12-31']) {
    assert.equal(validDate(date), true, date);
  }
  for (const date of ['2023-02-29', '1900-02-29', '2026-04-31', '2026-2-01',
    '2026-11-13T00:00:00Z', '2026-11-13 ', '0000-01-01', '', null, 20261113]) {
    assert.equal(validDate(date), false, String(date));
  }
});

test('calendar subtraction clamps the target month and preserves leap-year rules', () => {
  assert.equal(subtractMonths('2024-03-31', 1), '2024-02-29');
  assert.equal(subtractMonths('2025-03-31', 1), '2025-02-28');
  assert.equal(subtractMonths('2024-01-31', 2), '2023-11-30');
  assert.equal(subtractMonths('2025-03-31', 13), '2024-02-29');
  assert.equal(subtractYears('2024-02-29', 1), '2023-02-28');
  assert.equal(subtractYears('2024-02-29', 4), '2020-02-29');
});

test('day subtraction uses UTC calendar days and refuses invalid or out-of-range inputs', () => {
  assert.equal(subtractDays('2024-03-31', 1), '2024-03-30');
  assert.equal(subtractDays('2024-03-01', 1), '2024-02-29');
  assert.equal(subtractDays('2025-01-01', 7), '2024-12-25');
  assert.equal(subtractDays('2026-11-13', 0), '2026-11-13');
  for (const subtract of [subtractDays, subtractMonths, subtractYears]) {
    assert.equal(subtract('invalid', 1), null);
    assert.equal(subtract('2026-11-13', -1), null);
    assert.equal(subtract('2026-11-13', 1.5), null);
    assert.equal(subtract('2026-11-13', '1'), null);
    assert.equal(subtract('0001-01-01', 1), null);
    assert.equal(subtract('2026-11-13', Number.MAX_SAFE_INTEGER), null);
  }
});

test('legacy contracts normalize unknown clauses without inventing cancellation dates', () => {
  const row = { title: 'Police habitation', category: 'Assurances', date: '2020-02-01', deadline: '2027-03-31' };
  const contract = normalizeContract(row);
  assert.equal(contract.version, 1);
  assert.equal(contract.type, 'insurance');
  assert.equal(contract.scope, 'house');
  assert.equal(contract.effectiveDate, null);
  assert.equal(contract.autoRenewal, 'unknown');
  assert.deepEqual(contract.notice, { value: null, unit: 'days' });
  assert.deepEqual(contract.renewalDuration, { value: null, unit: 'months' });
  assert.deepEqual(contract.reminders, [90, 30, 7]);
  assert.deepEqual(cancellation(row), { date: null, source: 'unknown' });
  assert.equal(row.date, '2020-02-01');
  assert.equal(row.contract, undefined);
});

test('normalization preserves extensible metadata and isolates mutable nested values', () => {
  const row = { contract: { type: 'telecom', scope: 'equipment', equipmentIds: ['boiler', 'boiler', 'ventilation'],
    future: { clause: { code: 'kept' } }, notice: { value: 2, unit: 'months', sourcePage: 4 },
    provenance: [{ field: 'notice', pages: [4] }], uncertainties: ['Annexe absente'], reminders: [] } };
  const contract = normalizeContract(row);
  assert.equal(contract.type, 'telecom');
  assert.deepEqual(contract.equipmentIds, ['boiler', 'ventilation']);
  assert.deepEqual(contract.notice, { value: 2, unit: 'months', sourcePage: 4 });
  assert.deepEqual(contract.reminders, []);
  contract.future.clause.code = 'changed';
  contract.provenance[0].pages.push(5);
  assert.equal(row.contract.future.clause.code, 'kept');
  assert.deepEqual(row.contract.provenance[0].pages, [4]);
});

test('explicit cancellation dates override clauses and invalid explicit dates are never substituted', () => {
  const row = { deadline: '2027-03-31', contract: { renonDate: '2027-01-10', notice: { value: 3, unit: 'months' } } };
  assert.deepEqual(cancellation(row), { date: '2027-01-10', source: 'explicit' });
  assert.deepEqual(cancellation({ ...row, contract: { ...row.contract, renonDate: '2027-02-31' } }), { date: null, source: 'unknown' });
});

test('cancellation requires known valid notice clauses and uses legacy deadline as expiry', () => {
  assert.deepEqual(cancellation({ deadline: '2024-03-31', contract: { notice: { value: 1, unit: 'months' } } }), { date: '2024-02-29', source: 'calculated' });
  assert.deepEqual(cancellation({ deadline: '2025-03-01', contract: { notice: { value: 1, unit: 'days' } } }), { date: '2025-02-28', source: 'calculated' });
  assert.deepEqual(cancellation({ deadline: '2025-03-01', contract: { notice: { value: 0, unit: 'days' } } }), { date: '2025-03-01', source: 'calculated' });
  for (const row of [
    { deadline: '2027-03-31' },
    { deadline: '2027-02-31', contract: { notice: { value: 1, unit: 'months' } } },
    { deadline: '2027-03-31', contract: { notice: { value: 1 } } },
    { deadline: '2027-03-31', contract: { notice: { value: '1', unit: 'months' } } },
    { deadline: '2027-03-31', contract: { notice: { value: 1, unit: 'years' } } },
  ]) assert.deepEqual(cancellation(row), { date: null, source: 'unknown' });
});

test('reminder schedules derive only from a known cancellation date and keep explicit opt-out', () => {
  const row = { contract: { renonDate: '2027-04-01' } };
  assert.deepEqual(reminderSchedule(row), [
    { days: 90, date: '2027-01-01' }, { days: 30, date: '2027-03-02' }, { days: 7, date: '2027-03-25' },
  ]);
  assert.deepEqual(reminderSchedule({ deadline: '2027-04-01' }), []);
  assert.deepEqual(reminderSchedule({ contract: { renonDate: '2027-04-01', reminders: [] } }), []);
  assert.deepEqual(reminderSchedule({ contract: { renonDate: '2027-04-01', reminders: [7, 30, 7, 0] } }), [
    { days: 30, date: '2027-03-02' }, { days: 7, date: '2027-03-25' }, { days: 0, date: '2027-04-01' },
  ]);
});

test('next useful action chooses upcoming reminders, cancellation or expiry and retains overdue contracts', () => {
  const row = { deadline: '2027-05-01', contract: { renonDate: '2027-04-01' } };
  assert.equal(nextAction(row, '2027-02-01'), '2027-03-02');
  assert.equal(nextAction(row, '2027-03-25'), '2027-03-25');
  assert.equal(nextAction(row, '2027-04-01'), '2027-04-01');
  assert.equal(nextAction(row, '2027-04-02'), '2027-05-01');
  assert.equal(nextAction(row, '2027-05-02'), '2027-04-01');
  assert.equal(nextAction({ deadline: '2027-05-01' }, '2027-02-01'), '2027-05-01');
  assert.equal(nextAction({}, '2027-02-01'), null);
  assert.equal(nextAction(row, 'invalid'), null);
});

test('partial merges preserve legacy invalid dates, nested unknown fields and existing attachments', () => {
  const existing = { id: 'one', title: 'Ancien', deadline: '31/03/2027', attachmentName: 'legacy.pdf',
    unknown: { kept: true }, contract: { future: { a: 1, b: 2 }, notice: { value: 'ancien', unit: 'months', page: 4 } },
    attachments: [{ id: 'original', name: 'contrat.pdf', key: 'local-original' }, { id: 'rider', name: 'avenant.pdf' }] };
  const patch = { title: 'Modifié', deadline: undefined, contract: { future: { a: 3 }, notice: { unit: 'days' } } };
  const merged = mergeContract(existing, patch);
  assert.equal(merged.title, 'Modifié');
  assert.equal(merged.deadline, '31/03/2027');
  assert.equal(merged.attachmentName, 'legacy.pdf');
  assert.deepEqual(merged.contract.future, { a: 3, b: 2 });
  assert.deepEqual(merged.contract.notice, { value: 'ancien', unit: 'days', page: 4 });
  assert.deepEqual(merged.attachments, existing.attachments);
  merged.attachments[0].name = 'changed.pdf';
  merged.contract.future.b = 8;
  assert.equal(existing.attachments[0].name, 'contrat.pdf');
  assert.equal(existing.contract.future.b, 2);
  assert.equal(patch.contract.future.b, undefined);
});

test('partial merges permit explicit field clearing while keeping independent metadata', () => {
  const merged = mergeContract({ deadline: '2027-04-01', contract: { renonDate: '2027-01-01', notice: { value: 3, unit: 'months', page: 2 }, future: 'kept' } },
    { deadline: null, contract: { renonDate: null, notice: { value: null }, reminders: [] } });
  assert.equal(merged.deadline, null);
  assert.equal(merged.contract.renonDate, null);
  assert.deepEqual(merged.contract.notice, { value: null, unit: 'months', page: 2 });
  assert.deepEqual(merged.contract.reminders, []);
  assert.equal(merged.contract.future, 'kept');
});

test('validation accepts partial legacy rows, extensible types and unknown clauses', () => {
  assert.deepEqual(validateContract({ title: 'Ancien contrat' }), []);
  assert.deepEqual(validateContract({ title: 'Chaudière', deadline: '2028-02-29', contract: {
    version: 1, type: 'telecom', scope: 'equipment', equipmentIds: ['boiler', 'ventilation'],
    autoRenewal: 'unknown', renewalDuration: { value: null, unit: 'years' }, notice: { value: 0, unit: 'days' },
    amount: 0, reminders: [], provenance: [{ field: 'notice', pages: [2] }], uncertainties: [],
  } }, ['boiler', 'ventilation']), []);
});

test('validation reports raw invalid values instead of silently normalizing them', () => {
  const invalid = [
    [{ title: ' ' }, 'title'], [{ title: 'Contrat', date: '2023-02-29' }, 'date'],
    [{ title: 'Contrat', deadline: '31/03/2027' }, 'deadline'],
    ...[
      [{ version: 2 }, 'version'], [{ type: 42 }, 'type'], [{ scope: 'elsewhere' }, 'scope'],
      [{ effectiveDate: '2027-02-29' }, 'effectiveDate'], [{ renonDate: '2027-02-31' }, 'renonDate'],
      [{ autoRenewal: true }, 'autoRenewal'], [{ amount: '12' }, 'amount'], [{ amount: Infinity }, 'amount'],
      [{ amount: -1 }, 'amount'], [{ renewalDuration: { value: 0, unit: 'months' } }, 'renewalDuration'],
      [{ renewalDuration: { value: 1.5, unit: 'years' } }, 'renewalDuration'],
      [{ notice: { value: -1, unit: 'days' } }, 'notice'], [{ notice: { value: 3 } }, 'notice'],
      [{ notice: { value: true, unit: 'days' } }, 'notice'], [{ notice: { value: 3, unit: 'years' } }, 'notice'],
      [{ reminders: [30, -7] }, 'reminders'], [{ reminders: [true] }, 'reminders'], [{ provenance: 'source' }, 'provenance'],
      [{ uncertainties: {} }, 'uncertainties'], [{ scope: 'equipment', equipmentIds: [] }, 'equipmentIds'],
      [{ equipmentIds: ['boiler', 42] }, 'equipmentIds'], [{ equipmentIds: ['boiler', 'boiler'] }, 'equipmentIds'],
    ].map(([contract, field]) => [{ title: 'Contrat', contract }, field]),
  ];
  for (const [row, field] of invalid) {
    const errors = validateContract(row);
    assert.ok(errors.some(error => error.includes(field)), field + ': ' + JSON.stringify(row));
  }
  assert.ok(validateContract({ title: 'Équipement absent', contract: { scope: 'equipment', equipmentIds: ['removed'] } }, ['boiler'])
    .some(error => error.includes('equipmentIds')));
});

test('title validation matches the native writer before any batch mutations', () => {
  assert.deepEqual(validateContract({title:'a'.repeat(140)}), []);
  assert.ok(validateContract({title:'a'.repeat(141)}).some(error=>error.includes('title')));
});

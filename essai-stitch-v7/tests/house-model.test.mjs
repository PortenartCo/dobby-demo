import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = new URL('../house-model.mjs', import.meta.url);
const model = fs.existsSync(path) ? await import(path) : {};

test('calendar calculations reject invalid dates and clamp month ends and leap years', () => {
  assert.equal(typeof model.validDate, 'function', 'Maison calendar model exists');
  for (const date of ['2024-02-29', '0099-12-31', '2000-02-29']) assert.equal(model.validDate(date), true);
  for (const date of ['2025-02-29', '1900-02-29', '2026-04-31', '0000-01-01', '', null, 20261113]) assert.equal(model.validDate(date), false);
  for (const [date, months, expected] of [['2024-01-31',1,'2024-02-29'],['2025-01-31',1,'2025-02-28'],['2024-02-29',12,'2025-02-28'],['2024-02-29',48,'2028-02-29'],['2025-02-28',1,'2025-03-28'],['0099-12-31',1,'0100-01-31']]) assert.equal(model.addMonths(date,months),expected);
  for (const [date, months] of [['invalid',1],['2026-01-01',-1],['2026-01-01','1'],['2026-01-01',1.5],['9999-12-31',1]]) assert.equal(model.addMonths(date,months),null);
});

test('legacy plans remain stable read copies and explicit zero plans stay empty', () => {
  assert.equal(typeof model.plans, 'function', 'Maison compatibility model exists');
  const row={id:'old',lastMaintenance:'2024-02-29',nextMaintenance:'2025-03-01',interval:'12',provider:'Artisan',future:{kept:true}};
  const [plan]=model.plans(row);
  assert.equal(plan.id,'legacy-old');assert.equal(plan.lastKnownDate,'2024-02-29');assert.equal(plan.nextDateOverride,'2025-03-01');assert.deepEqual(plan.interval,{value:12,unit:'months'});
  assert.equal(model.plans(row)[0].id,plan.id);assert.deepEqual(model.plans({...row,maintenancePlans:[]}),[]);assert.deepEqual(model.plans({id:'empty'}),[]);
  const modern={maintenancePlans:[{id:'p',title:'Filtre',interval:{value:12,unit:'months',page:2},future:{kept:true}}]};
  model.plans(modern)[0].future.kept=false;assert.equal(modern.maintenancePlans[0].future.kept,true);assert.equal(row.maintenancePlans,undefined);
});

test('two independent programs use only classified performed logs and never invent a date', () => {
  assert.equal(typeof model.due, 'function', 'Maison independent schedules exist');
  const row={id:'boiler'},a={id:'flue',lastKnownDate:'2024-02-29',interval:{value:12,unit:'months'}},b={id:'boiler-service',lastKnownDate:'2023-05-31',interval:{value:3,unit:'years'}};
  const logs=[{id:'legacy',itemId:'boiler',date:'2026-01-01'}, {itemId:'boiler',planId:'flue',date:'2025-01-31'}, {itemId:'boiler',planId:'flue',date:'2026-01-01',performed:false}, {itemId:'other',planId:'boiler-service',date:'2026-06-01'}];
  assert.deepEqual(model.due(row,a,logs),{date:'2026-01-31',source:'calculated',lastDate:'2025-01-31'});
  assert.deepEqual(model.due(row,b,logs),{date:'2026-05-31',source:'calculated',lastDate:'2023-05-31'});
  assert.deepEqual(model.due(row,{id:'unknown',interval:{value:12,unit:'months'}},logs),{date:null,source:null,lastDate:null});
  assert.deepEqual(model.due(row,{...a,nextDateOverride:'2026-07-10'},logs),{date:'2026-07-10',source:'explicit',lastDate:'2025-01-31'});
  assert.deepEqual(model.due(row,{...a,nextDateOverride:'2026-02-30'},logs),{date:null,source:null,lastDate:'2025-01-31'});
  assert.equal(logs.length,4);
});

test('unclassified legacy history cannot become a program through absent identities',()=>{
  assert.deepEqual(model.due({id:'old'},{interval:{value:12,unit:'months'}},[{itemId:'old',date:'2025-01-01'}]),{date:null,source:null,lastDate:null});
});

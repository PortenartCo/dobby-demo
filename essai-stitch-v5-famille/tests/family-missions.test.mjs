import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMission,validMissions,orderedMissions} from '../family-missions-core.mjs';
import {collectUpcoming} from '../family-agenda-core.mjs';

const a={id:'fm-one',title:'Préparer les vélos',category:'Famille',due:'2026-11-20',
  status:'open',assigneeId:'member-1',note:'Vérifier les pneus',
  createdAt:'2026-11-08T12:00:00.000Z'};
test('manual mission normalization validates due date and does not use medical categories',()=>{
  assert.equal(normalizeMission(a).title,'Préparer les vélos');
  assert.throws(()=>normalizeMission({...a,title:''}),/Titre/);
  assert.throws(()=>normalizeMission({...a,due:'2026-02-29'}),/Date/);
  assert.throws(()=>normalizeMission({...a,category:'Santé'}),/Catégorie/);
  assert.throws(()=>normalizeMission({...a,status:'obsolete'}),/État/);
  assert.equal(validMissions([a,{title:'invalid'}]).length,1);
});
test('manual open tasks are ordered by date and completed remain distinct',()=>{
  const rows=orderedMissions([
    {...a,id:'fm-late',due:'2026-12-01'},
    {...a,id:'fm-done',status:'done',completedAt:'2026-11-08T17:00:00Z'},
    a
  ]);
  assert.deepEqual(rows.map(x=>x.id),['fm-one','fm-late','fm-done']);
});
test('manual missions appear in due summary without polluting autoTasks',()=>{
  const auto=[{key:'equipment:1:2026-11-19',state:'open',title:'Entretien',due:'2026-11-05'}];
  const state={autoTasks:auto,manualMissions:[a,{...a,id:'fm-done',status:'done',due:'2026-11-22'}],
    famHealth:[{name:'Prive',date:'2026-11-20'}]};
  const rows=collectUpcoming(state,'2026-11-08',30);
  assert.equal(rows.filter(x=>x.kind==='mission').length,2);
  assert.ok(rows.some(x=>x.title==='Mission : Préparer les vélos'));
  assert.equal(state.autoTasks.length,1);
  assert.equal(rows.some(x=>x.title==='Prive'),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeVisit,validVisits} from '../family-health-core.mjs';
import {collectUpcoming} from '../family-agenda-core.mjs';

const visit={id:'fh-100',title:'Consultation',date:'2026-11-19',time:'14:30',
  personId:'child-1',person:'Enfant',provider:'Cabinet',
  location:'Wavre',note:'Apporter le carnet'};
test('medical visit requires an explicit valid record, date and time',()=>{
  assert.equal(normalizeVisit(visit).title,'Consultation');
  assert.throws(()=>normalizeVisit({...visit,date:'2026-02-29'}),/Date/);
  assert.throws(()=>normalizeVisit({...visit,time:'28:00'}),/Heure/);
  assert.throws(()=>normalizeVisit({...visit,title:''}),/intitulé/);
  assert.equal(validVisits([visit,{id:'bad',date:'2026-00-10'}]).length,1);
});
test('only appointments explicitly shared with the household appear in global due list',()=>{
  const state={
    famHealth:[{name:'Consultation PRIVEE',date:'2026-11-10',person:'Enfant'}],
    sharedHealthVisits:[visit],
    familyDocs:[{id:'d',category:'Santé',title:'Document local',deadline:'2026-11-18'}]
  };
  const due=collectUpcoming(state,'2026-11-08',30);
  assert.equal(due.length,1);
  assert.equal(due[0].kind,'medical');
  assert.equal(due[0].title,'Rendez-vous : Consultation');
  assert.equal(JSON.stringify(due).includes('PRIVEE'),false);
});

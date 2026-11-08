import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validDate, validTime, nextDate, normalizeEvent, validEvents, birthdayFor,
  collectUpcoming, eventIcs
} from '../family-agenda-core.mjs';

const base={id:'fp-test-1',title:'Match de football',date:'2026-11-10',time:'16:30',
  category:'Activité',person:'La famille',location:'Au stade',note:'Prendre une écharpe'};

test('validates actual calendar dates and time instead of accepting malformed input',()=>{
  assert.equal(validDate('2026-02-29'),false);
  assert.equal(validDate('2028-02-29'),true);
  assert.equal(validDate('2026-13-08'),false);
  assert.equal(validTime('24:00'),false);
  assert.equal(validTime('23:45'),true);
  assert.equal(nextDate('2026-12-31',1),'2027-01-01');
  assert.throws(()=>normalizeEvent({...base,date:'2026-02-29'}),/date/i);
  assert.throws(()=>normalizeEvent({...base,time:'26:80'}),/heure/i);
});

test('shared agenda rejects medical category and normalizes ordinary events',()=>{
  assert.throws(()=>normalizeEvent({...base,category:'Santé'}),/Catégorie/);
  assert.throws(()=>normalizeEvent({...base,category:'Médical'}),/Catégorie/);
  assert.throws(()=>normalizeEvent({...base,title:''}),/intitulé/);
  assert.equal(normalizeEvent({...base,title:' A '.repeat(90)}).title.length,120);
  assert.deepEqual(validEvents([base,{title:'broken'},null]).length,1);
});

test('aggregates events, task deadlines, maintenance, insurance and birthdays but not medical records',()=>{
  const state={
    familyEvents:[base,{...base,id:'fp-past',date:'2026-02-01'}],
    famHealth:[{id:'secret',name:'Consultation médicale',date:'2026-11-09'}],
    familyDocs:[{id:'contract',category:'Assurances',title:'Habitation',deadline:'2026-11-19'},
      {id:'medical',category:'Santé',title:'Analyses',deadline:'2026-11-15'}],
    autoTasks:[{key:'task-1',title:'Préparer la valise',state:'open',due:'2026-11-11'},
      {key:'task-2',title:'Finie',state:'done',due:'2026-11-09'}],
    houseItems:[{id:'house-1',name:'Chaudière',nextMaintenance:'2026-11-12'}],
    familyMembers:[{id:'m1',name:'Lucie',birthdate:'2015-11-10'}]
  };
  const due=collectUpcoming(state,'2026-11-08',30);
  assert.deepEqual([...new Set(due.map(x=>x.kind))].sort(),
    ['birthday','contract','event','maintenance','mission']);
  assert.equal(due.some(x=>x.title.includes('Analyses')),false);
  assert.equal(due.some(x=>x.title.includes('Consultation')),false);
  assert.equal(due.some(x=>x.title.includes('Finie')),false);
  assert.equal(due.length,5);
});

test('birthdays are re-evaluated annually and leap-day policy is defined',()=>{
  assert.equal(birthdayFor('2012-11-03','2026-11-08'),'2027-11-03');
  assert.equal(birthdayFor('2020-02-29','2027-01-05'),'2027-02-28');
});

test('ics export contains correct floating local time and escapes injection',()=>{
  const ics=eventIcs({...base,title:'Match, famille; allez !\nNOTE:Injected',location:'Rue A, 12'},
    '2026-11-08T18:00:00.000Z');
  assert.match(ics,/DTSTART:20261110T163000/);
  assert.match(ics,/DTEND:20261110T173000/);
  assert.match(ics,/SUMMARY:Match\\, famille\\; allez !\\nNOTE:Injected/);
  assert.doesNotMatch(ics,/\r\nNOTE:Injected/);
  assert.match(ics,/BEGIN:VCALENDAR\r\nVERSION:2.0/);
  const allDay=eventIcs({...base,time:''});
  assert.match(allDay,/DTSTART;VALUE=DATE:20261110/);
  assert.match(allDay,/DTEND;VALUE=DATE:20261111/);
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../seasonal-calendar.js');
const active=date=>C.resolve(date).theme;
test('all inclusive fixed windows and season boundaries',()=>{
 const cases={
 '2026-01-01':'new-year','2026-01-02':'winter','2026-01-30':'winter','2026-01-31':'magic','2026-02-01':'winter',
 '2026-02-11':'winter','2026-02-12':'valentine','2026-02-14':'valentine','2026-02-15':'carnival','2026-02-17':'carnival','2026-02-18':'winter',
 '2026-03-19':'winter','2026-03-20':'spring','2026-05-31':'spring','2026-06-01':'summer','2026-07-19':'summer','2026-07-20':'belgium','2026-07-21':'belgium','2026-07-22':'summer',
 '2026-08-31':'summer','2026-09-01':'autumn','2026-10-23':'autumn','2026-10-24':'halloween','2026-11-01':'halloween','2026-11-02':'autumn',
 '2026-11-23':'autumn','2026-11-24':'thanksgiving','2026-11-29':'thanksgiving','2026-11-30':'autumn',
 '2026-12-01':'saint-nicholas','2026-12-06':'saint-nicholas','2026-12-07':'christmas','2026-12-26':'christmas','2026-12-27':'new-year','2026-12-31':'new-year',
 '2027-01-01':'new-year','2027-01-02':'winter'
 };for(const [date,theme]of Object.entries(cases))assert.equal(active(date),theme,date);
});
test('Gregorian mobile feasts are recomputed, inclusive and cross months',()=>{
 for(const [year,easter,carnival,thanksgiving]of [[2026,'2026-04-05','2026-02-17','2026-11-26'],[2027,'2027-03-28','2027-02-09','2027-11-25'],[2028,'2028-04-16','2028-02-29','2028-11-23'],[2038,'2038-04-25','2038-03-09','2038-11-25'],[2100,'2100-03-28','2100-02-09','2100-11-25']]){
  assert.deepEqual(C.mobileDates(year),{easter,carnival,thanksgiving});
  const shift=(date,n)=>new Date(Date.parse(date+'T12:00Z')+n*86400000).toISOString().slice(0,10);
  for(let n=-7;n<=1;n++)assert.equal(active(shift(easter,n)),'easter');
  assert.notEqual(active(shift(easter,-8)),'easter');assert.notEqual(active(shift(easter,2)),'easter');
  for(let n=-2;n<=0;n++)assert.equal(active(shift(carnival,n)),'carnival');
  for(let n=-2;n<=3;n++)assert.equal(active(shift(thanksgiving,n)),'thanksgiving');
  assert.notEqual(active(shift(thanksgiving,-3)),'thanksgiving');assert.notEqual(active(shift(thanksgiving,4)),'thanksgiving');
 }
});
test('Valentine wins Carnival overlap, including February 14',()=>{
 assert.equal(C.mobileDates(2021).carnival,'2021-02-16');
 for(const date of ['2021-02-12','2021-02-13','2021-02-14'])assert.equal(active(date),'valentine');
 assert.equal(active('2021-02-15'),'carnival');assert.equal(active('2021-02-16'),'carnival');
 assert.equal(C.resolve('2026-12-25').season,'winter');assert.equal(C.resolve('2026-12-25').celebration,'christmas');
});
test('Saint-Nicolas wins the December 1 overlap with late Thanksgiving',()=>{
 for(const year of [2024,2030]){assert.equal(active(`${year}-11-30`),'thanksgiving');assert.equal(active(`${year}-12-01`),'saint-nicholas');assert.equal(active(`${year}-12-06`),'saint-nicholas');}
});
test('Brussels date ignores host timezone and handles summer/winter midnight',()=>{
 for(const [instant,date]of [['2026-12-06T22:59:59Z','2026-12-06'],['2026-12-06T23:00:00Z','2026-12-07'],['2026-07-19T22:00:00Z','2026-07-20'],['2026-03-29T01:30:00Z','2026-03-29'],['2026-10-25T01:30:00Z','2026-10-25']])assert.equal(C.civilDate(new Date(instant)),date);
 assert.equal(C.nextMidnight(new Date('2026-03-28T23:00:00Z')).toISOString(),'2026-03-29T22:00:00.000Z');
 assert.equal(C.nextMidnight(new Date('2026-10-24T22:00:00Z')).toISOString(),'2026-10-25T23:00:00.000Z');
});
test('invalid civil dates are rejected instead of overflowing or using host parsing',()=>{
 for(const value of ['2026-02-29','2026-04-31','2026-2-01','2026-01-01T00:00Z','<script>','',null])assert.throws(()=>C.resolve(value),/date/i);
 assert.equal(active('2028-02-29'),'carnival');assert.equal(active('2100-02-28'),'winter');
});
test('every day 2000–2100 has one stable theme; February 14 always Valentine',()=>{
 for(let year=2000;year<=2100;year++){
  assert.equal(active(`${year}-02-14`),'valentine');
  for(let month=1;month<=12;month++)for(let day=1;day<=new Date(Date.UTC(year,month,0)).getUTCDate();day++){
   const date=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,result=C.resolve(date);
   assert.equal(typeof result.theme,'string');assert.deepEqual(result,C.resolve(date));
  }
 }
});

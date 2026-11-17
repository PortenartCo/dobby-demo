/* Civil Gregorian calendar only. No state, network, browser clock override or scheduler. */
(function(root,factory){
 const calendar=factory();
 if(typeof module==='object'&&module.exports)module.exports=calendar;
 else root.DobbySeasonalCalendar=calendar;
})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 const dayMs=86400000;
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Brussels',year:'numeric',month:'2-digit',day:'2-digit'});
 function civilDate(instant=new Date()){
  if(!(instant instanceof Date)||!Number.isFinite(instant.getTime()))throw new RangeError('Invalid date');
  const parts=Object.fromEntries(formatter.formatToParts(instant).map(part=>[part.type,part.value]));
  return `${parts.year.padStart(4,'0')}-${parts.month}-${parts.day}`;
 }
 function parse(date){
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number(date.slice(0,4))<1)throw new RangeError('Invalid civil date');
  const instant=new Date(date+'T12:00:00Z');
  if(!Number.isFinite(instant.getTime())||instant.toISOString().slice(0,10)!==date)throw new RangeError('Invalid civil date');
  return instant;
 }
 const shift=(date,days)=>new Date(parse(date).getTime()+days*dayMs).toISOString().slice(0,10);
 function mobileDates(year){
  if(!Number.isInteger(year)||year<1||year>9999)throw new RangeError('Invalid date year');
  // Meeus/Jones/Butcher, Gregorian Easter. Carnival = Easter - 47 days.
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4;
  const f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;
  const prefix=String(year).padStart(4,'0'),easter=`${prefix}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const first=`${prefix}-11-01`,fourthThursday=1+(4-parse(first).getUTCDay()+7)%7+21;
  return Object.freeze({easter,carnival:shift(easter,-47),thanksgiving:`${prefix}-11-${fourthThursday}`});
 }
 const labels=Object.freeze({winter:'Hiver',spring:'Printemps',summer:'Été',autumn:'Automne',magic:'Journée de la magie',valentine:'Saint-Valentin',carnival:'Carnaval',easter:'Pâques',belgium:'Fête nationale belge',halloween:'Halloween',thanksgiving:'Thanksgiving', 'saint-nicholas':'Saint-Nicolas',christmas:'Noël','new-year':'Nouvel An'});
 function resolve(date=civilDate()){
  const year=parse(date).getUTCFullYear(),md=date.slice(5),mobile=mobileDates(year);
  const season=md>='12-01'||md<='03-19'?'winter':md<='05-31'?'spring':md<='08-31'?'summer':'autumn';
  const between=(start,end)=>date>=start&&date<=end;
  // Explicit precedence: Valentine wins Carnival (especially February 14).
  // Saint-Nicolas also wins December 1 when late Thanksgiving extends into December.
  const celebrations=[
   ['magic',md==='01-31'],['valentine',md>='02-12'&&md<='02-14'],
   ['carnival',between(shift(mobile.carnival,-2),mobile.carnival)],
   ['easter',between(shift(mobile.easter,-7),shift(mobile.easter,1))],
   ['belgium',md>='07-20'&&md<='07-21'],['halloween',md>='10-24'&&md<='11-01'],
   ['saint-nicholas',md>='12-01'&&md<='12-06'],
   ['thanksgiving',between(shift(mobile.thanksgiving,-2),shift(mobile.thanksgiving,3))],['christmas',md>='12-07'&&md<='12-26'],
   ['new-year',md>='12-27'||md==='01-01']
  ];
  const celebration=celebrations.find(([,active])=>active)?.[0]||null,theme=celebration||season;
  return Object.freeze({date,year,season,celebration,theme,label:labels[theme]});
 }
 function nextMidnight(instant=new Date()){
  const current=civilDate(instant);let low=instant.getTime(),high=low+27*3600000;
  // Find the first millisecond of the next Brussels civil day, including DST.
  while(high-low>1){const middle=Math.floor((low+high)/2);if(civilDate(new Date(middle))===current)low=middle;else high=middle;}
  return new Date(high);
 }
 return Object.freeze({civilDate,mobileDates,resolve,nextMidnight});
});

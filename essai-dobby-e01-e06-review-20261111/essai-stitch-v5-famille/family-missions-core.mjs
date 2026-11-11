import * as runes from './family-runes-core.mjs';
export {runes};
import { validDate } from './family-agenda-core.mjs';
export const MISSION_CATEGORIES=Object.freeze(['Famille','Maison','Administratif','Autre']);
const short=(v,n)=>String(v??'').trim().slice(0,n);
export const RECURRENCE_LOOKBACK_DAYS=30;
const iso=d=>d.toISOString().slice(0,10);
export function brusselsDate(instant=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Brussels',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(instant));
  const part=name=>parts.find(x=>x.type===name).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function addCalendarDays(day,count){
  if(!validDate(day)||!Number.isInteger(count))throw Error('Date de projection invalide');
  const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+count);return iso(date);
}
export const occurrenceId=(seriesId,date)=>seriesId+'-r'+date.replaceAll('-','');
export function recurrenceMatches(day,rule){
  if(!validDate(day))throw Error('Date de récurrence invalide');
  const date=new Date(day+'T12:00:00Z'),monthEnd=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
  return rule.frequency==='daily'||rule.frequency==='weekly'&&rule.weekdays.includes(date.getUTCDay())||rule.frequency==='monthly'&&date.getUTCDate()===Math.min(rule.monthDay,monthEnd);
}
export function normalizeRecurrence(raw,id){
  if(!raw||raw.version!==1||raw.seriesId!==id||!Array.isArray(raw.rules)||!raw.rules.length||raw.rules.length>200)throw Error('Série de missions incompatible');
  let previous='',stopped=false;
  const rules=raw.rules.map(rule=>{
    if(stopped)throw Error('Une série arrêtée ne peut pas être reprise');
    if(!rule||!validDate(rule.from)||!validDate(rule.start)||rule.from<previous||!['daily','weekly','monthly'].includes(rule.frequency)||!['active','paused','stopped'].includes(rule.state)||rule.shortMonth!=='last-day')throw Error('Règle de récurrence invalide');
    if(!Array.isArray(rule.weekdays)||rule.weekdays.some(d=>!Number.isInteger(d)||d<0||d>6)||new Set(rule.weekdays).size!==rule.weekdays.length||rule.frequency==='weekly'&&!rule.weekdays.length)throw Error('Choisir au moins un jour de la semaine');
    if(!Number.isInteger(rule.monthDay)||rule.monthDay<1||rule.monthDay>31)throw Error('Jour du mois invalide');
    previous=rule.from;stopped=rule.state==='stopped';
    // Validate the native fields without dropping extension fields from the template.
    const template=normalizeMission({...rule.template,id,due:rule.start,status:'open'});
    delete template.id;delete template.due;delete template.status;delete template.createdAt;delete template.completedAt;
    if(template.recurrence||template.seriesId||template.occurrenceDate)throw Error('Modèle de série invalide');
    return {...rule,weekdays:[...rule.weekdays].sort((a,b)=>a-b),template};
  });
  return {...raw,rules};
}
export function normalizeMission(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Mission invalide');
  const id=short(raw.id,80),title=short(raw.title,140),due=String(raw.due||''),
    category=String(raw.category||'Famille'),status=String(raw.status||'open');
  if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id))throw Error('Identifiant invalide');
  if(!title)throw Error('Titre de mission requis');
  if(due&&!validDate(due))throw Error('Date d’échéance invalide');
  if(!MISSION_CATEGORIES.includes(category))throw Error('Catégorie non autorisée');
  if(!['open','done'].includes(status))throw Error('État de mission invalide');
  const completedAt=raw.completedAt?short(raw.completedAt,40):'';
  if(raw.effort!==undefined||raw.rewardVersion===1)runes.effortFor(raw.effort);
  if(raw.rewardVersion!==undefined&&raw.rewardVersion!==1)throw Error('Version de récompense non prise en charge');
  if(raw.recurrence!==undefined&&(raw.seriesId!==undefined||raw.occurrenceDate!==undefined))throw Error('Identité de série invalide');
  const recurrence=raw.recurrence===undefined?undefined:normalizeRecurrence(raw.recurrence,id);
  if(raw.seriesId!==undefined||raw.occurrenceDate!==undefined){
    if(typeof raw.seriesId!=='string'||!validDate(raw.occurrenceDate)||occurrenceId(raw.seriesId,raw.occurrenceDate)!==id||raw.due!==raw.occurrenceDate)throw Error('Identité d’occurrence invalide');
  }
  return {...raw,id,title,due,category,status,
    ...(recurrence?{recurrence}:{}),
    ...(raw.effort!==undefined?{effort:raw.effort}:{}),
    ...(raw.rewardVersion===1?{rewardVersion:1}:{}),
    assigneeId:short(raw.assigneeId,100),
    note:short(raw.note,400),
    createdAt:short(raw.createdAt,40),
    completedAt:status==='done'?completedAt:''};
}
// Materialize only the last 30 civil days and today. Previously persisted rows
// are never removed, including done/open history outside this recovery window.
export function projectRecurringMissions(rows,today=brusselsDate()){
  if(!Array.isArray(rows)||!validDate(today))throw Error('Projection de missions invalide');
  const known=new Map(rows.map(row=>[row.id,row])),result=[...rows];
  for(const raw of rows){
    if(raw.recurrence===undefined)continue;
    const root=normalizeMission(raw),rules=root.recurrence.rules;
    for(let day=addCalendarDays(today,-RECURRENCE_LOOKBACK_DAYS);day<=today;day=addCalendarDays(day,1)){
      const rule=rules.findLast(r=>r.from<=day);
      if(!rule||rule.state!=='active'||day<rule.start||day===root.due)continue;
      if(!recurrenceMatches(day,rule))continue;
      const id=occurrenceId(root.id,day),existing=known.get(id);
      if(existing){if(existing.seriesId!==root.id||existing.occurrenceDate!==day)throw Error('Identifiant d’occurrence déjà utilisé');continue;}
      const row=normalizeMission({...rule.template,id,due:day,status:'open',seriesId:root.id,occurrenceDate:day,createdAt:day+'T12:00:00.000Z',completedAt:''});
      known.set(id,row);result.push(row);
    }
  }
  return result;
}
export function validMissions(rows){
  return Array.isArray(rows)?rows.flatMap(x=>{try{return[normalizeMission(x)];}catch{return[];}}):[];
}
export function orderedMissions(rows){
  return validMissions(rows).sort((a,b)=>{
    if(a.status!==b.status)return a.status==='open'?-1:1;
    if(a.status==='open')return (a.due||'9999').localeCompare(b.due||'9999')||a.title.localeCompare(b.title,'fr');
    return (b.completedAt||'').localeCompare(a.completedAt||'');
  });
}

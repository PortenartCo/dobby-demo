/* Dobby family agenda — deterministic helpers. No medical records in shared payloads. */
export const CATEGORIES = Object.freeze(['Famille', 'École', 'Activité', 'Anniversaire', 'Déplacement', 'Autre']);
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d] = value.split('-').map(Number);
  if (y < 2000 || y > 2100 || m < 1 || m > 12) return false;
  const date = new Date(Date.UTC(y,m-1,d));
  return date.getUTCFullYear()===y && date.getUTCMonth()+1===m && date.getUTCDate()===d;
}
export function validTime(value) {
  return value === '' || (typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value));
}
export function nextDate(date, days) {
  if (!validDate(date) || !Number.isInteger(days)) throw Error('Date invalide');
  const d=new Date(date+'T12:00:00Z');
  d.setUTCDate(d.getUTCDate()+days);
  return d.toISOString().slice(0,10);
}
function limit(value,max) { return String(value??'').trim().slice(0,max); }
export function normalizeEvent(raw) {
  if (!raw || typeof raw!=='object' || Array.isArray(raw)) throw Error('Événement incorrect');
  const title=limit(raw.title,120), date=String(raw.date||''), time=String(raw.time||''),
    category=String(raw.category || 'Famille'), id=String(raw.id || '');
  if (!title) throw Error('Un intitulé est nécessaire');
  if (!validDate(date)) throw Error('La date doit être valide');
  if (!validTime(time)) throw Error("L'heure est invalide");
  if (!CATEGORIES.includes(category)) throw Error('Catégorie non partagée : utiliser une activité familiale ordinaire');
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw Error('Identifiant invalide');
  return {
    id, title, date, time, category,
    person:limit(raw.person,80),
    location:limit(raw.location,140),
    note:limit(raw.note,350)
  };
}
export function validEvents(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap(row => {try {return [normalizeEvent(row)];} catch {return [];}});
}
export function eventSort(a,b) {
  return a.date.localeCompare(b.date)||a.time.localeCompare(b.time)||a.title.localeCompare(b.title,'fr');
}
export function birthdayFor(birthdate,today) {
  if (!validDate(birthdate)||!validDate(today)) return null;
  const [,month,day]=birthdate.split('-').map(Number);
  const firstYear=Number(today.slice(0,4));
  for (let y=firstYear;y<=firstYear+1;y++) {
    // 29 February birthdays are displayed on 28 February in non-leap years.
    const leap=(y%4===0 && (y%100!==0 || y%400===0));
    const mm=String(month).padStart(2,'0');
    const dd=String(month===2 && day===29 && !leap ? 28 : day).padStart(2,'0');
    const candidate=y+'-'+mm+'-'+dd;
    if(validDate(candidate)&&candidate>=today)return candidate;
  }
  return null;
}
export function collectUpcoming(state,today,horizonDays=30) {
  if(!validDate(today))throw Error('Date courante invalide');
  const horizon=nextDate(today,horizonDays),overdue=nextDate(today,-30),rows=[];
  const add=(id,title,date,kind,meta='',time='')=>{
    if (!validDate(date))return;
    const lo=kind==='event'||kind==='birthday'||kind==='medical'?today:overdue;
    if (date<lo||date>horizon)return;
    rows.push({id:String(id),title:String(title||''),date,kind,meta:String(meta||''),time:String(time||'')});
  };
  for(const event of validEvents(state?.familyEvents))
    add(event.id,event.title,event.date,'event',event.category + (event.person?' · '+event.person:''),event.time);
  for(const task of Array.isArray(state?.autoTasks)?state.autoTasks:[])
    if(task?.state==='open') add(task.key||task.id,task.title,task.due,'mission',task.sourceLabel||'');
  for(const mission of Array.isArray(state?.manualMissions)?state.manualMissions:[])
    if(mission?.status==='open')
      add(mission.id,'Mission : '+String(mission.title||''),mission.due,'mission',mission.category||'Famille');
  for(const x of Array.isArray(state?.houseItems)?state.houseItems:[])
    add(x.id,'Entretien : '+String(x.name||''),x.nextMaintenance,'maintenance',x.place||'');
  for(const x of Array.isArray(state?.familyDocs)?state.familyDocs:[])
    if (['Contrats','Assurances'].includes(x?.category))
      add(x.id,'Échéance : '+String(x.title||''),x.deadline,'contract',x.provider||'');
  for(const member of Array.isArray(state?.familyMembers)?state.familyMembers:[]){
    const d=birthdayFor(member.birthdate,today);
    if(d) add(member.id,'Anniversaire : '+String(member.name||''),d,'birthday','');
  }
  return rows.sort((a,b)=>eventSort(a,b));
}
function icsEscape(value) {
  return String(value??'').replace(/\\/g,'\\\\')
    .replace(/\r\n|\r|\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
}
function foldLine(line) {
  let current='',bytes=0;const pieces=[];
  for(const char of line) {
    const count=new TextEncoder().encode(char).length;
    if(bytes+count>70 && current) {pieces.push(current);current=' ';bytes=1;}
    current+=char;bytes+=count;
  }
  pieces.push(current);
  return pieces.join('\r\n');
}
export function eventIcs(raw,stamp='2026-11-08T00:00:00.000Z') {
  const event=normalizeEvent(raw);
  const compact=event.date.replaceAll('-','');
  const begin=event.time ? compact+'T'+event.time.replace(':','')+'00' : compact;
  let end;
  if(event.time) {
    const minutes=Number(event.time.slice(0,2))*60+Number(event.time.slice(3))+60;
    const dayOffset=minutes>=1440?1:0;
    end=nextDate(event.date,dayOffset).replaceAll('-','')+'T'+
      String(Math.floor(minutes%1440/60)).padStart(2,'0')+
      String(minutes%60).padStart(2,'0')+'00';
  } else end=nextDate(event.date,1).replaceAll('-','');
  const created=new Date(stamp);
  if(!Number.isFinite(created.getTime()))throw Error("Horodatage d'export invalide");
  const lines=[
    'BEGIN:VCALENDAR','VERSION:2.0','CALSCALE:GREGORIAN',
    'PRODID:-//Dobby//Family Agenda//FR','BEGIN:VEVENT',
    'UID:'+event.id+'@dobby.family',
    'DTSTAMP:'+created.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),
    'SUMMARY:'+icsEscape(event.title),
    (event.time?'DTSTART:':'DTSTART;VALUE=DATE:')+begin,
    (event.time?'DTEND:':'DTEND;VALUE=DATE:')+end,
    'LOCATION:'+icsEscape(event.location),
    'DESCRIPTION:'+icsEscape([event.category,event.person,event.note].filter(Boolean).join(' — ')),
    'END:VEVENT','END:VCALENDAR'
  ];
  return lines.map(foldLine).join('\r\n')+'\r\n';
}

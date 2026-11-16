import {validDate,validTime} from './family-agenda-core.mjs';
const cut=(x,n)=>String(x??'').trim().slice(0,n);
export function normalizeVisit(data){
  if(!data || typeof data!=='object'||Array.isArray(data))throw Error('Rendez-vous incorrect');
  const id=cut(data.id,80),title=cut(data.title,140),date=String(data.date||''),
    time=String(data.time||'');
  if(!/^[A-Za-z0-9_-]{1,80}$/.test(id))throw Error('Identifiant incorrect');
  if(!title)throw Error('Indiquez un intitulé');
  if(!validDate(date))throw Error('Date incorrecte');
  if(!validTime(time))throw Error('Heure incorrecte');
  return {id,title,date,time,personId:cut(data.personId,100),person:cut(data.person,80),
    provider:cut(data.provider,160),location:cut(data.location,160),note:cut(data.note,500)};
}
export function validVisits(rows){
  return Array.isArray(rows)?rows.flatMap(row=>{
    try{return[normalizeVisit(row)]}catch{return[]}
  }).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)):[];
}

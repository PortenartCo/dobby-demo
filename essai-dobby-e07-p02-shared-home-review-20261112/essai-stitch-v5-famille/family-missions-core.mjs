import * as runes from './family-runes-core.mjs';
export {runes};
import { validDate } from './family-agenda-core.mjs';
export const MISSION_CATEGORIES=Object.freeze(['Famille','Maison','Administratif','Autre']);
const short=(v,n)=>String(v??'').trim().slice(0,n);
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
  return {id,title,due,category,status,
    ...(raw.effort!==undefined?{effort:raw.effort}:{}),
    ...(raw.rewardVersion===1?{rewardVersion:1}:{}),
    assigneeId:short(raw.assigneeId,100),
    note:short(raw.note,400),
    createdAt:short(raw.createdAt,40),
    completedAt:status==='done'?completedAt:''};
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

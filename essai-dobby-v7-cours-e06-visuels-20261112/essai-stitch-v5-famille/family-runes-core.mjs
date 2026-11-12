/* Mission rewards: pure rules, no storage/network. Grade thresholds V1 approved (E05). */
export const EFFORTS=Object.freeze([
 Object.freeze({id:'light',label:'Légère',amount:10}),
 Object.freeze({id:'regular',label:'Régulière',amount:25}),
 Object.freeze({id:'major',label:'Majeure',amount:50})
]);
const thresholds=[0,50,100,200,350,550,800,1100,1500,2000,2600,3300];
const shapes=['point','star4','star8'],shapeNames=['Point','Étoile à 4 branches','Étoile à 8 branches'];
const materials=['copper','silver','gold','diamond'],materialNames=['cuivre','argent','or','diamant'];
export const GRADE_CONFIG=Object.freeze({provisional:false,version:1,levels:Object.freeze(thresholds.map((threshold,index)=>Object.freeze({index,threshold,cycle:Math.floor(index/4)+1,shape:shapes[Math.floor(index/4)],material:materials[index%4],label:index<4?['Pastille de cuivre','Pastille d’argent','Pastille d’or','Pastille de diamant'][index]:shapeNames[Math.floor(index/4)]+' '+materialNames[index%4]})))});
export function effortFor(id){const effort=EFFORTS.find(e=>e.id===id);if(!effort)throw Error('Niveau d’effort invalide');return effort;}
// V1 credits remain intact. V2 adds deterministic, append-only grant/reversal
// events in the same ledger; no confirmed gain is deleted or rewritten.
const keys=['missionId','memberId','effort','amount','date','title'];
export const eventKey=row=>row.eventId||row.missionId;
export const ledgerVersion=rows=>(rows||[]).some(row=>row?.eventId||row?.customRunes!==undefined)?2:1;
const cycleOf=row=>row.cycle??0;
export function rewardFor(mission){
 const effort=effortFor(mission?.effort);
 if(mission.customRunes===undefined)return {effort:effort.id,amount:effort.amount};
 if(!Number.isSafeInteger(mission.customRunes)||mission.customRunes<0)throw Error('La récompense personnalisée doit être un entier positif ou nul représentable sans perte');
 return {effort:effort.id,amount:mission.customRunes,customRunes:mission.customRunes};
}
function request(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(key=>![...keys,'revision','customRunes','eventId','kind','cycle','reverses'].includes(key)))throw Error('Historique de runes non pris en charge');
 if(typeof raw.missionId!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(raw.missionId)||typeof raw.memberId!=='string'||!raw.memberId.trim()||raw.memberId.length>100)throw Error('Bénéficiaire ou mission de runes invalide');
 const reward=rewardFor(raw);if(raw.amount!==reward.amount)throw Error('Valeur de récompense invalide');
 if(typeof raw.date!=='string'||!Number.isFinite(Date.parse(raw.date))||typeof raw.title!=='string'||!raw.title.trim()||raw.title.length>140)throw Error('Date ou intitulé de runes invalide');
 const row={missionId:raw.missionId,memberId:raw.memberId,...reward,date:new Date(raw.date).toISOString(),title:raw.title};
 if(raw.eventId!==undefined||raw.kind!==undefined||raw.cycle!==undefined||raw.reverses!==undefined){
  if(!['grant','reversal'].includes(raw.kind)||!Number.isSafeInteger(raw.cycle)||raw.cycle<0||raw.eventId!==raw.missionId+'~'+raw.cycle+'~'+raw.kind)throw Error('Identité d’événement de runes invalide');
  Object.assign(row,{eventId:raw.eventId,kind:raw.kind,cycle:raw.cycle});
  if(raw.kind==='reversal'){if(typeof raw.reverses!=='string'||!raw.reverses)throw Error('Référence d’annulation invalide');row.reverses=raw.reverses;}
  else if(raw.reverses!==undefined)throw Error('Référence d’annulation inattendue');
 }else if(raw.customRunes!==undefined)throw Error('La récompense personnalisée exige un événement de runes versionné');
 return row;
}
const sameAward=(a,b)=>a.memberId===b.memberId&&a.effort===b.effort&&a.amount===b.amount&&a.customRunes===b.customRunes&&a.kind===b.kind&&a.cycle===b.cycle&&a.reverses===b.reverses;
export function normalizeRequests(rows=[]){
 if(!Array.isArray(rows))throw Error('Demandes de runes invalides');const byId=new Map();
 for(const raw of rows){const row=request(raw),key=eventKey(row),prior=byId.get(key);if(prior&&!sameAward(prior,row))throw Error('Demandes de runes contradictoires');if(!prior||row.date<prior.date)byId.set(key,row);}
 return [...byId.values()].sort((a,b)=>eventKey(a).localeCompare(eventKey(b),'en'));
}
function checkHistory(rows){
 const missions=new Map();for(const row of rows){if(!missions.has(row.missionId))missions.set(row.missionId,[]);missions.get(row.missionId).push(row);}
 const active=[];
 for(const events of missions.values()){
  const grants=new Map(),reversals=new Map();
  for(const row of events){const target=row.kind==='reversal'?reversals:grants,cycle=cycleOf(row);if(target.has(cycle))throw Error('Deux événements de runes contradictoires pour un même cycle');target.set(cycle,row);}
  const cycles=[...grants.keys()].sort((a,b)=>a-b);
  for(const [index,cycle]of cycles.entries()){
   if(cycle!==index||cycle>0&&!reversals.has(cycle-1))throw Error('Historique de runes incomplet ou plusieurs gains actifs');
   const grant=grants.get(cycle),reverse=reversals.get(cycle);
   if(reverse){if(reverse.reverses!==eventKey(grant)||reverse.memberId!==grant.memberId||reverse.amount!==grant.amount||reverse.effort!==grant.effort||reverse.customRunes!==grant.customRunes)throw Error('Annulation différente du gain de runes référencé');}
   else active.push(grant);
  }
  if([...reversals.keys()].some(cycle=>!grants.has(cycle)))throw Error('Annulation sans gain de runes confirmé');
 }
 const totals=new Map();for(const row of active){const next=(totals.get(row.memberId)||0)+row.amount;if(!Number.isSafeInteger(next))throw Error('Le total de runes dépasse la capacité numérique du modèle');totals.set(row.memberId,next);}
 return active;
}
export function normalizeCredits(rows=[]){
 if(!Array.isArray(rows))throw Error('Historique de runes invalide');const byId=new Map();
 for(const raw of rows){const row=request(raw);if(!Number.isSafeInteger(raw.revision)||raw.revision<0)throw Error('Confirmation de runes invalide');row.revision=raw.revision;const key=eventKey(row),prior=byId.get(key);
  if(prior&&!sameAward(prior,row))throw Error('Crédits de runes confirmés contradictoires : synchronisation bloquée');
  const rankA=row.revision||Number.MAX_SAFE_INTEGER,rankB=prior?.revision||Number.MAX_SAFE_INTEGER;
  if(!prior||rankA<rankB||rankA===rankB&&(row.date<prior.date||row.date===prior.date&&row.title<prior.title))byId.set(key,row);
 }
 const rowsOut=[...byId.values()].sort((a,b)=>eventKey(a).localeCompare(eventKey(b),'en'));checkHistory(rowsOut);return rowsOut;
}
export function activeCredits(credits=[]){return checkHistory(normalizeCredits(credits));}
export function mergeCredits(remote=[],local=[]){return normalizeCredits([...normalizeCredits(remote),...normalizeCredits(local)]);}
export function completionRequest(mission,members,credits=[],requests=[],date){
 if(mission?.rewardVersion!==1||mission.status!=='open'||!mission.assigneeId||!members.some(m=>m.id===mission.assigneeId))return null;
 const history=acceptRequests(credits,requests,0),past=history.filter(row=>row.missionId===mission.id);
 if(activeCredits(history).some(c=>c.missionId===mission.id))return null;
 const reward=rewardFor(mission),cycle=past.length?Math.max(...past.map(cycleOf))+1:0;
 if(!Number.isSafeInteger(cycle))throw Error('Limite numérique de cycles de runes atteinte');
 const row={missionId:mission.id,memberId:mission.assigneeId,...reward,date,title:mission.title};
 if(cycle||reward.customRunes!==undefined)Object.assign(row,{eventId:mission.id+'~'+cycle+'~grant',kind:'grant',cycle});
 return request(row);
}
export function reopeningRequest(mission,credits=[],requests=[],date){
 if(mission?.status!=='done')return null;
 const history=acceptRequests(credits,requests,0),grant=activeCredits(history).find(row=>row.missionId===mission.id);if(!grant)return null;
 const {revision,...base}=grant,cycle=cycleOf(grant);
 return request({...base,eventId:mission.id+'~'+cycle+'~reversal',kind:'reversal',cycle,reverses:eventKey(grant),date});
}
export function acceptRequests(credits=[],requests=[],revision){
 if(!Number.isSafeInteger(revision)||revision<0)throw Error('Révision de runes invalide');const rows=normalizeCredits(credits),known=new Set(rows.map(eventKey));
 for(const candidate of normalizeRequests(requests))if(!known.has(eventKey(candidate))){rows.push({...candidate,revision});known.add(eventKey(candidate));}
 return normalizeCredits(rows);
}
export function gradeFor(total){
 if(!Number.isSafeInteger(total)||total<0)throw Error('Total de runes invalide');const levels=GRADE_CONFIG.levels;let index=0;while(index+1<levels.length&&total>=levels[index+1].threshold)index++;
 const current=levels[index],next=levels[index+1]||null;return {...current,next,provisional:GRADE_CONFIG.provisional,progress:next?{value:total-current.threshold,max:next.threshold-current.threshold,remaining:next.threshold-total}:null};
}
export function memberSummary(memberId,credits=[],requests=[]){
 const rows=normalizeCredits(credits),known=new Map(rows.map(c=>[eventKey(c),c])),mine=rows.filter(c=>c.memberId===memberId),queue=normalizeRequests(requests).filter(c=>c.memberId===memberId);
 const total=activeCredits(rows).filter(c=>c.memberId===memberId).reduce((sum,c)=>sum+c.amount,0),pending=queue.filter(c=>!known.has(eventKey(c))).reduce((sum,c)=>sum+(c.kind==='reversal'?-c.amount:c.amount),0),settledElsewhere=queue.filter(c=>known.has(eventKey(c))&&!sameAward(c,known.get(eventKey(c)))).length;
 if(!Number.isSafeInteger(pending))throw Error('Total de runes en attente invalide');
 return {total,pending,settledElsewhere,grade:gradeFor(total),credits:mine};
}

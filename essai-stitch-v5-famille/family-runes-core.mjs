/* Mission rewards: pure rules, no storage/network. Grade thresholds V1 approved (E05). */
export const EFFORTS=Object.freeze([
 Object.freeze({id:'light',label:'Légère',amount:10}),
 Object.freeze({id:'regular',label:'Régulière',amount:25}),
 Object.freeze({id:'major',label:'Majeure',amount:50})
]);
const thresholds=[0,50,100,200,350,550,800,1100,1500,2000,2600,3300];
const shapes=['point','star4','star8'],shapeNames=['Point','Étoile à 4 branches','Étoile à 8 branches'];
const materials=['copper','silver','gold','diamond'],materialNames=['cuivre','argent','or','diamant'];
export const GRADE_CONFIG=Object.freeze({provisional:false,version:1,levels:Object.freeze(thresholds.map((threshold,index)=>Object.freeze({index,threshold,cycle:Math.floor(index/4)+1,shape:shapes[Math.floor(index/4)],material:materials[index%4],label:shapeNames[Math.floor(index/4)]+' '+materialNames[index%4]})))});
export function effortFor(id){const effort=EFFORTS.find(e=>e.id===id);if(!effort)throw Error('Niveau d’effort invalide');return effort;}
const keys=['missionId','memberId','effort','amount','date','title'];
function request(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(key=>![...keys,'revision'].includes(key)))throw Error('Historique de runes non pris en charge');
 if(typeof raw.missionId!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(raw.missionId)||typeof raw.memberId!=='string'||!raw.memberId.trim()||raw.memberId.length>100)throw Error('Bénéficiaire ou mission de runes invalide');
 const effort=effortFor(raw.effort);if(raw.amount!==effort.amount)throw Error('Valeur de récompense invalide');
 if(typeof raw.date!=='string'||!Number.isFinite(Date.parse(raw.date))||typeof raw.title!=='string'||!raw.title.trim()||raw.title.length>140)throw Error('Date ou intitulé de runes invalide');
 return {missionId:raw.missionId,memberId:raw.memberId,effort:effort.id,amount:effort.amount,date:new Date(raw.date).toISOString(),title:raw.title};
}
const sameAward=(a,b)=>a.memberId===b.memberId&&a.effort===b.effort&&a.amount===b.amount;
export function normalizeRequests(rows=[]){
 if(!Array.isArray(rows))throw Error('Demandes de runes invalides');const byId=new Map();
 for(const raw of rows){const row=request(raw),prior=byId.get(row.missionId);if(prior&&!sameAward(prior,row))throw Error('Demandes de runes contradictoires');if(!prior||row.date<prior.date)byId.set(row.missionId,row);}
 return [...byId.values()].sort((a,b)=>a.missionId.localeCompare(b.missionId,'en'));
}
export function normalizeCredits(rows=[]){
 if(!Array.isArray(rows))throw Error('Historique de runes invalide');const byId=new Map();
 for(const raw of rows){const row=request(raw);if(!Number.isSafeInteger(raw.revision)||raw.revision<0)throw Error('Confirmation de runes invalide');row.revision=raw.revision;const prior=byId.get(row.missionId);
  if(prior&&!sameAward(prior,row))throw Error('Crédits de runes confirmés contradictoires : synchronisation bloquée');
  const rankA=row.revision||Number.MAX_SAFE_INTEGER,rankB=prior?.revision||Number.MAX_SAFE_INTEGER;
  if(!prior||rankA<rankB||rankA===rankB&&(row.date<prior.date||row.date===prior.date&&row.title<prior.title))byId.set(row.missionId,row);
 }
 return [...byId.values()].sort((a,b)=>a.missionId.localeCompare(b.missionId,'en'));
}
export function mergeCredits(remote=[],local=[]){return normalizeCredits([...normalizeCredits(remote),...normalizeCredits(local)]);}
export function completionRequest(mission,members,credits=[],requests=[],date){
 if(mission?.rewardVersion!==1||mission.status!=='open'||!mission.assigneeId||!members.some(m=>m.id===mission.assigneeId))return null;
 if(normalizeCredits(credits).some(c=>c.missionId===mission.id)||normalizeRequests(requests).some(c=>c.missionId===mission.id))return null;
 const effort=effortFor(mission.effort);return request({missionId:mission.id,memberId:mission.assigneeId,effort:effort.id,amount:effort.amount,date,title:mission.title});
}
export function acceptRequests(credits=[],requests=[],revision){
 if(!Number.isSafeInteger(revision)||revision<0)throw Error('Révision de runes invalide');const rows=normalizeCredits(credits),known=new Set(rows.map(c=>c.missionId));
 for(const candidate of normalizeRequests(requests))if(!known.has(candidate.missionId)){rows.push({...candidate,revision});known.add(candidate.missionId);}
 return normalizeCredits(rows);
}
export function gradeFor(total){
 if(!Number.isSafeInteger(total)||total<0)throw Error('Total de runes invalide');const levels=GRADE_CONFIG.levels;let index=0;while(index+1<levels.length&&total>=levels[index+1].threshold)index++;
 const current=levels[index],next=levels[index+1]||null;return {...current,next,provisional:GRADE_CONFIG.provisional,progress:next?{value:total-current.threshold,max:next.threshold-current.threshold,remaining:next.threshold-total}:null};
}
export function memberSummary(memberId,credits=[],requests=[]){
 const rows=normalizeCredits(credits),known=new Map(rows.map(c=>[c.missionId,c])),mine=rows.filter(c=>c.memberId===memberId),queue=normalizeRequests(requests).filter(c=>c.memberId===memberId);
 const total=mine.reduce((sum,c)=>sum+c.amount,0),pending=queue.filter(c=>!known.has(c.missionId)).reduce((sum,c)=>sum+c.amount,0),settledElsewhere=queue.filter(c=>known.has(c.missionId)&&!sameAward(c,known.get(c.missionId))).length;
 return {total,pending,settledElsewhere,grade:gradeFor(total),credits:mine};
}

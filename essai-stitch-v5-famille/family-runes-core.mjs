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
// V1/V2 credits remain intact. V3 adds one atomic allocation per occurrence,
// rather than separate grants which could multiply or partially award its total.
const keys=['missionId','memberId','effort','amount','date','title'];
export const eventKey=row=>row.eventId||row.missionId;
export const ledgerVersion=rows=>(rows||[]).some(row=>row?.allocations!==undefined)?3:(rows||[]).some(row=>row?.eventId||row?.customRunes!==undefined)?2:1;
const cycleOf=row=>row.cycle??0;
const compareId=(a,b)=>a<b?-1:a>b?1:0;
const validMemberId=id=>typeof id==='string'&&Boolean(id.trim())&&id.length<=100;
export const isHumanMember=member=>Boolean(member)&&![member.memberCategory,member.type,member.kind].some(value=>['pet','animal','guardian','baby'].includes(value));
const declaredAssignees=mission=>Array.isArray(mission.assigneeIds)&&mission.assigneeIds.length?mission.assigneeIds:mission.assigneeId?[mission.assigneeId]:[];
const unassignedMission=mission=>mission.allFamily!==true&&!declaredAssignees(mission).length;
// Completion candidates differ from assignment: an unassigned task may be done
// by any real eligible member, but participation is always explicitly selected.
export function completionCandidateIds(mission,members){
 const humans=(Array.isArray(members)?members:[]).filter(member=>isHumanMember(member)&&validMemberId(member.id)),known=new Set(humans.map(member=>member.id));
 const ids=mission.allFamily===true||unassignedMission(mission)?[...known]:declaredAssignees(mission).filter(id=>known.has(id));
 return [...new Set(ids)].sort(compareId);
}
export const canCompleteWithoutParticipants=(mission,members)=>unassignedMission(mission)&&!completionCandidateIds(mission,members).length;
export function allocateReward(amount,participantIds){
 if(!Number.isSafeInteger(amount)||amount<0)throw Error('Total de runes à répartir invalide');
 if(!Array.isArray(participantIds)||!participantIds.length||participantIds.some(id=>!validMemberId(id))||new Set(participantIds).size!==participantIds.length)throw Error('Choisissez des participants distincts');
 const ids=[...participantIds].sort(compareId),base=Math.floor(amount/ids.length),remainder=amount%ids.length;
 return ids.map((memberId,index)=>({memberId,amount:base+(index<remainder?1:0)}));
}
const allocationsEqual=(a,b)=>JSON.stringify(a.allocations)===JSON.stringify(b.allocations);
const allocationsOf=row=>row.allocations||[{memberId:row.memberId,amount:row.amount}];
const memberAmount=(row,memberId)=>allocationsOf(row).find(part=>part.memberId===memberId)?.amount??0;
const includesMember=(row,memberId)=>allocationsOf(row).some(part=>part.memberId===memberId);
export function rewardFor(mission){
 const effort=effortFor(mission?.effort);
 if(mission.customRunes===undefined)return {effort:effort.id,amount:effort.amount};
 if(!Number.isSafeInteger(mission.customRunes)||mission.customRunes<0)throw Error('La récompense personnalisée doit être un entier positif ou nul représentable sans perte');
 return {effort:effort.id,amount:mission.customRunes,customRunes:mission.customRunes};
}
function request(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(key=>![...keys,'revision','customRunes','eventId','kind','cycle','reverses','allocations'].includes(key)))throw Error('Historique de runes non pris en charge');
 if(typeof raw.missionId!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(raw.missionId)||typeof raw.memberId!=='string'||!raw.memberId.trim()||raw.memberId.length>100)throw Error('Bénéficiaire ou mission de runes invalide');
 const reward=rewardFor(raw);if(raw.amount!==reward.amount)throw Error('Valeur de récompense invalide');
 if(typeof raw.date!=='string'||!Number.isFinite(Date.parse(raw.date))||typeof raw.title!=='string'||!raw.title.trim()||raw.title.length>140)throw Error('Date ou intitulé de runes invalide');
 const row={missionId:raw.missionId,memberId:raw.memberId,...reward,date:new Date(raw.date).toISOString(),title:raw.title};
 if(raw.eventId!==undefined||raw.kind!==undefined||raw.cycle!==undefined||raw.reverses!==undefined){
  if(!['grant','reversal'].includes(raw.kind)||!Number.isSafeInteger(raw.cycle)||raw.cycle<0||raw.eventId!==raw.missionId+'~'+raw.cycle+'~'+raw.kind)throw Error('Identité d’événement de runes invalide');
  Object.assign(row,{eventId:raw.eventId,kind:raw.kind,cycle:raw.cycle});
  if(raw.kind==='reversal'){if(typeof raw.reverses!=='string'||!raw.reverses)throw Error('Référence d’annulation invalide');row.reverses=raw.reverses;}
  else if(raw.reverses!==undefined)throw Error('Référence d’annulation inattendue');
 }else if(raw.customRunes!==undefined||raw.allocations!==undefined)throw Error('La récompense répartie ou personnalisée exige un événement de runes versionné');
 if(raw.allocations!==undefined){
  if(!Array.isArray(raw.allocations)||raw.allocations.some(part=>!part||typeof part!=='object'||Array.isArray(part)||Object.keys(part).some(key=>!['memberId','amount'].includes(key))))throw Error('Répartition de runes invalide');
  const expected=allocateReward(row.amount,raw.allocations.map(part=>part.memberId));
  const actual=[...raw.allocations].sort((a,b)=>compareId(a.memberId,b.memberId));
  if(row.memberId!==expected[0].memberId||actual.some((part,index)=>part.amount!==expected[index].amount))throw Error('Répartition de runes différente du total déterministe');
  row.allocations=expected;
 }
 return row;
}
const sameAward=(a,b)=>a.memberId===b.memberId&&a.effort===b.effort&&a.amount===b.amount&&a.customRunes===b.customRunes&&a.kind===b.kind&&a.cycle===b.cycle&&a.reverses===b.reverses&&allocationsEqual(a,b);
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
   if(reverse){if(reverse.reverses!==eventKey(grant)||reverse.memberId!==grant.memberId||reverse.amount!==grant.amount||reverse.effort!==grant.effort||reverse.customRunes!==grant.customRunes||!allocationsEqual(reverse,grant))throw Error('Annulation différente du gain de runes référencé');}
   else active.push(grant);
  }
  if([...reversals.keys()].some(cycle=>!grants.has(cycle)))throw Error('Annulation sans gain de runes confirmé');
 }
 const totals=new Map();for(const row of active)for(const part of allocationsOf(row)){const next=(totals.get(part.memberId)||0)+part.amount;if(!Number.isSafeInteger(next))throw Error('Le total de runes dépasse la capacité numérique du modèle');totals.set(part.memberId,next);}
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
 if(mission?.rewardVersion!==1||mission.status!=='open'||!mission.assigneeId||!members.some(m=>m.id===mission.assigneeId&&isHumanMember(m)))return null;
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
// The plural API intentionally returns zero or ONE event: all shares commit,
// deduplicate and reverse together. It is local-only until a V3 server is proven.
export function completionRequests(mission,members,participantIds,credits=[],requests=[],date){
 if(mission?.rewardVersion!==1||mission.status!=='open')return [];
 const humanMembers=Array.isArray(members)?members.filter(isHumanMember):[],known=new Set(humanMembers.map(member=>member.id));
 const reward=rewardFor(mission);
 if(canCompleteWithoutParticipants(mission,members)&&Array.isArray(participantIds)&&!participantIds.length)return [];
 const allocations=allocateReward(reward.amount,participantIds),allowed=new Set(completionCandidateIds(mission,members));
 if(allocations.some(part=>!known.has(part.memberId)))throw Error('Participant inconnu ou animal non autorisé');
 if(allocations.some(part=>!allowed.has(part.memberId)))throw Error('Participant non attribué à cette mission');
 const history=acceptRequests(credits,requests,0),past=history.filter(row=>row.missionId===mission.id);
 if(activeCredits(history).some(row=>row.missionId===mission.id))return [];
 const cycle=past.length?Math.max(...past.map(cycleOf))+1:0;
 if(!Number.isSafeInteger(cycle))throw Error('Limite numérique de cycles de runes atteinte');
 return [request({missionId:mission.id,memberId:allocations[0].memberId,...reward,date,title:mission.title,allocations,eventId:mission.id+'~'+cycle+'~grant',kind:'grant',cycle})];
}
export function reopeningRequests(mission,credits=[],requests=[],date){
 const reversal=reopeningRequest(mission,credits,requests,date);return reversal?[reversal]:[];
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
 const rows=normalizeCredits(credits),known=new Map(rows.map(c=>[eventKey(c),c])),mine=rows.filter(c=>includesMember(c,memberId)).map(c=>c.allocations?{...c,allocationTotal:c.amount,memberId,amount:memberAmount(c,memberId)}:c),queue=normalizeRequests(requests).filter(c=>includesMember(c,memberId));
 const total=activeCredits(rows).reduce((sum,c)=>sum+memberAmount(c,memberId),0),settledElsewhere=queue.filter(c=>known.has(eventKey(c))&&!sameAward(c,known.get(eventKey(c)))).length;
 // Event order can temporarily exceed Number's safe range before an exact
 // compensation cancels it. Keep the signed sum exact, then enforce the same
 // public Number bounds without changing stored events or their amounts.
 const exactPending=queue.filter(c=>!known.has(eventKey(c))).reduce((sum,c)=>sum+(c.kind==='reversal'?-1n:1n)*BigInt(memberAmount(c,memberId)),0n),limit=BigInt(Number.MAX_SAFE_INTEGER);
 if(exactPending>limit||exactPending< -limit)throw Error('Total de runes en attente invalide');
 const pending=Number(exactPending);
 return {total,pending,settledElsewhere,grade:gradeFor(total),credits:mine};
}

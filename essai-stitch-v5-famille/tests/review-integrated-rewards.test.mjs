import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../family-runes-core.mjs';
import * as M from '../family-missions-core.mjs';
const members=[{id:'a'},{id:'b'}],date='2026-11-11T12:00:00.000Z';
const mission=(overrides={})=>({id:'mission-a',title:'Préparer la salle',status:'open',effort:'light',rewardVersion:1,assigneeId:'a',due:'2026-11-11',category:'Famille',...overrides});
const grant=(m,credits=[])=>R.acceptRequests(credits,[R.completionRequest(m,members,credits,[],date)].filter(Boolean),0);
const reopen=(m,credits)=>R.acceptRequests(credits,[R.reopeningRequest({...m,status:'done'},credits,[],date)].filter(Boolean),0);
test('custom reward accepts zero and safe integers, rejects coercion and overflow',()=>{
 for(const customRunes of [0,10,Number.MAX_SAFE_INTEGER]){const row=M.normalizeMission(mission({customRunes}));assert.equal(row.customRunes,customRunes);assert.equal(R.rewardFor(row).amount,customRunes);}
 for(const customRunes of [-1,1.2,NaN,Infinity,'10',Number.MAX_SAFE_INTEGER+1,null])assert.throws(()=>M.normalizeMission(mission({customRunes})));
});
test('required example is auditable +10 -> 0 -> 10 without replacing original grant',()=>{
 const m=mission(),one=grant(m),original=JSON.stringify(one[0]);assert.equal(R.memberSummary('a',one).total,10);
 const two=reopen(m,one);assert.equal(R.memberSummary('a',two).total,0);assert.equal(JSON.stringify(two.find(x=>!x.eventId)),original);assert.equal(two.length,2);assert.equal(two.find(x=>x.kind==='reversal').amount,10);
 const three=grant(m,two);assert.equal(R.memberSummary('a',three).total,10);assert.equal(three.length,3);assert.equal(R.activeCredits(three).length,1);assert.equal(R.ledgerVersion(three),2);
 assert.equal(R.completionRequest(m,members,three,[],date),null);
 const four=reopen(m,three);assert.equal(R.memberSummary('a',four).total,0);assert.equal(R.reopeningRequest({...m,status:'done'},four,[],date),null);
});
test('zero custom grants and compensations retain event identities and history',()=>{
 const m=mission({customRunes:0}),one=grant(m),two=reopen(m,one),three=grant(m,two);
 assert.equal(one.length,1);assert.equal(two.length,2);assert.equal(three.length,3);assert.equal(R.memberSummary('a',three).total,0);assert.equal(R.activeCredits(three).length,1);
});
test('amount and responsible edits do not rewrite old gains or their reversal',()=>{
 const initial=mission({customRunes:73}),one=grant(initial),changed=mission({customRunes:15,assigneeId:'b',title:'Titre modifié'}),two=reopen(changed,one);
 assert.equal(R.memberSummary('a',two).total,0);assert.equal(two.find(x=>x.kind==='reversal').memberId,'a');assert.equal(two.find(x=>x.kind==='reversal').amount,73);
 const three=grant(changed,two);assert.equal(R.memberSummary('b',three).total,15);assert.equal(R.memberSummary('a',three).total,0);assert.equal(three.find(x=>x.cycle===0&&x.kind==='grant').amount,73);
});
test('concurrent duplicate transitions and replay produce one active event',()=>{
 const m=mission(),one=grant(m),request=R.reopeningRequest({...m,status:'done'},one,[],date),a=R.acceptRequests(one,[request],2),b=R.acceptRequests(one,[request],3),merged=R.mergeCredits(a,b);
 assert.equal(merged.length,2);assert.equal(R.memberSummary('a',merged).total,0);
 const a2=grant(m,merged),b2=grant(m,merged);assert.equal(R.mergeCredits(a2,b2).length,3);assert.equal(R.memberSummary('a',R.mergeCredits(a2,b2)).total,10);
});
test('contradictory compensation, event identities and unsafe aggregate fail closed',()=>{
 const m=mission(),one=grant(m),reverse=R.reopeningRequest({...m,status:'done'},one,[],date);
 assert.throws(()=>R.acceptRequests(one,[{...reverse,amount:25}],0));
 assert.throws(()=>R.acceptRequests(one,[{...reverse,reverses:'another-grant'}],0));
 const huge=grant(mission({customRunes:Number.MAX_SAFE_INTEGER}));assert.throws(()=>grant(mission({id:'second'}),huge));
 assert.equal(R.memberSummary('a',huge).total,Number.MAX_SAFE_INTEGER);
});
test('legacy credits and legacy ineligibility remain unchanged',()=>{
 const legacy={missionId:'old',memberId:'a',effort:'regular',amount:25,date,title:'Ancienne mission',revision:4};
 assert.deepEqual(R.normalizeCredits([legacy]),[legacy]);assert.equal(R.ledgerVersion([legacy]),1);
 assert.equal(R.completionRequest(mission({rewardVersion:undefined}),members,[],[],date),null);
 const credits=R.acceptRequests([legacy],[R.reopeningRequest(mission({id:'old',status:'done',assigneeId:'b',rewardVersion:undefined}),[legacy],[],date)],0);
 assert.deepEqual(credits.find(x=>!x.eventId),legacy);assert.equal(R.memberSummary('a',credits).total,0);
});
test('recurrence templates carry custom reward to independent occurrence without altering old row',()=>{
 const root=M.normalizeMission(mission({customRunes:17,recurrence:{version:1,seriesId:'mission-a',rules:[{from:'2026-11-11',start:'2026-11-11',frequency:'daily',weekdays:[3],monthDay:11,shortMonth:'last-day',state:'active',template:{title:'Chaque jour',category:'Famille',assigneeId:'a',note:'',effort:'light',rewardVersion:1,customRunes:17}}]}}));
 const rows=M.projectRecurringMissions([root],'2026-11-12');assert.equal(rows[1].customRunes,17);
 const credits=grant(root);const both=grant(rows[1],credits);assert.equal(R.memberSummary('a',both).total,34);
 const reopened=reopen(rows[1],both);assert.equal(R.memberSummary('a',reopened).total,17);assert.equal(R.activeCredits(reopened)[0].missionId,root.id);
});

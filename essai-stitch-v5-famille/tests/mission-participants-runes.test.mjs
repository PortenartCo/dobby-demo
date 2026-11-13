import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../family-runes-core.mjs';

const date='2026-11-13T12:00:00.000Z';
const members=[{id:'a',memberCategory:'parent'},{id:'b',memberCategory:'child'},{id:'c'},{id:'pet',memberCategory:'pet'}];
const mission=(extra={})=>({id:'fm-shared',title:'TEST — Ranger ensemble',status:'open',effort:'regular',rewardVersion:1,participantVersion:1,assigneeIds:['a','b'],allFamily:false,...extra});
const complete=(m,participants,credits=[],requests=[])=>R.completionRequests(m,members,participants,credits,requests,date);
const confirm=(requests,credits=[])=>R.acceptRequests(credits,requests,1);

test('one atomic event distributes one total among selected participants deterministically',()=>{
 const requests=complete(mission(),['b','a']);
 assert.equal(requests.length,1);assert.equal(requests[0].amount,25);
 assert.deepEqual(requests[0].allocations,[{memberId:'a',amount:13},{memberId:'b',amount:12}]);
 assert.deepEqual(complete(mission(),['a','b']),requests,'selection order never changes the remainder');
 const credits=confirm(requests);assert.equal(R.ledgerVersion(credits),3);
 assert.equal(R.memberSummary('a',credits).total,13);assert.equal(R.memberSummary('b',credits).total,12);assert.equal(R.memberSummary('c',credits).total,0);
 assert.equal(R.memberSummary('a',credits).credits[0].amount,13,'history displays only this member’s share');
 assert.equal(R.memberSummary('b',[],requests).pending,12);
 assert.equal(credits.length,1,'one occurrence has one atomic ledger event');
});
test('solo receives all, zero stays zero and many participants remain fair',()=>{
 const solo=complete(mission(),['b']);assert.deepEqual(solo[0].allocations,[{memberId:'b',amount:25}]);
 const zero=complete(mission({customRunes:0}),['b','a']);assert.equal(zero[0].amount,0);assert.deepEqual(zero[0].allocations,[{memberId:'a',amount:0},{memberId:'b',amount:0}]);
 const small=complete(mission({customRunes:2,allFamily:true}),['c','b','a'])[0];
 assert.deepEqual(small.allocations,[{memberId:'a',amount:1},{memberId:'b',amount:1},{memberId:'c',amount:0}]);
 assert.equal(R.memberSummary('b',confirm(zero)).total,0);
});
test('unknown, animal, duplicated, empty and unauthorized participants are rejected',()=>{
 for(const ids of [[],['unknown'],['pet'],['a','a'],['c']])assert.throws(()=>complete(mission(),ids),/participant|attribu|membre/i);
 assert.throws(()=>complete(mission({allFamily:true}),['pet']),/participant|animal/i);
 assert.equal(complete(mission({status:'done'}),['a']).length,0);
 assert.equal(complete(mission({rewardVersion:undefined}),['a']).length,0,'historical mission never receives a retrospective reward');
});
test('replay and concurrent completion never multiply the occurrence reward',()=>{
 const m=mission(),a=complete(m,['a','b']),b=complete(m,['b']);
 const credits=confirm(a);assert.deepEqual(complete(m,['a'],credits),[]);assert.deepEqual(complete(m,['b'],[],a),[]);
 assert.deepEqual(R.acceptRequests(credits,b,2),credits,'first confirmed result wins');
 assert.equal(R.memberSummary('b',credits,b).pending,0);
 assert.equal(R.memberSummary('b',credits,b).settledElsewhere,1);
 assert.throws(()=>R.mergeCredits(credits,confirm(b)),/contradictoire/i,'confirmed divergent allocation blocks');
 assert.throws(()=>R.normalizeRequests([...a,...b]),/contradictoire/i);
 assert.equal(R.acceptRequests(credits,a,2).length,1);
});
test('reopening reverses exactly the previous allocation and recompletion appends one cycle',()=>{
 const m=mission(),granted=confirm(complete(m,['a','b'])),original=structuredClone(granted);
 const reverse=R.reopeningRequests({...m,status:'done'},granted,[],date);
 assert.equal(reverse.length,1);assert.deepEqual(reverse[0].allocations,granted[0].allocations);
 const reopened=confirm(reverse,granted);assert.equal(R.memberSummary('a',reopened).total,0);assert.equal(R.memberSummary('b',reopened).total,0);
 assert.deepEqual(R.reopeningRequests({...m,status:'done'},reopened,[],date),[]);
 const second=confirm(complete(m,['b'],reopened),reopened);assert.equal(second.length,3);
 assert.equal(R.memberSummary('a',second).total,0);assert.equal(R.memberSummary('b',second).total,25);
 assert.deepEqual(second.find(r=>r.eventId===original[0].eventId),original[0]);
});
test('recurring occurrences each have an independent single reward identity',()=>{
 const first=mission({id:'fm-series-r20261113',seriesId:'fm-series',occurrenceDate:'2026-11-13'}),second=mission({id:'fm-series-r20261114',seriesId:'fm-series',occurrenceDate:'2026-11-14'});
 const credits=confirm([...complete(first,['a','b']),...complete(second,['b'])]);
 assert.equal(credits.length,2);assert.equal(R.memberSummary('a',credits).total,13);assert.equal(R.memberSummary('b',credits).total,37);
 assert.deepEqual(complete(first,['b'],credits),[]);
});
test('malformed allocation totals and nondeterministic remainder cannot enter the ledger',()=>{
 const valid=complete(mission(),['a','b'])[0];
 for(const allocations of [[{memberId:'a',amount:25},{memberId:'b',amount:25}],[{memberId:'a',amount:12},{memberId:'b',amount:13}],[{memberId:'a',amount:25},{memberId:'a',amount:0}],[],[{memberId:'a',amount:-1}]])assert.throws(()=>R.normalizeRequests([{...valid,allocations}]),/runes|répart|participant/i);
 assert.throws(()=>R.normalizeRequests([{...valid,eventId:undefined,kind:undefined,cycle:undefined}]),/version|événement|répart/i);
 const credits=confirm([valid]),reversal=R.reopeningRequests({...mission(),status:'done'},credits,[],date)[0];
 assert.throws(()=>R.acceptRequests(credits,[{...reversal,allocations:[{memberId:'a',amount:25}]}],2),/annulation/i);
});
test('V1 history coexists unchanged with allocation events and aggregate overflow fails closed',()=>{
 const legacyRequest=R.completionRequest({id:'fm-legacy',title:'TEST — Ancienne mission',status:'open',assigneeId:'a',effort:'light',rewardVersion:1},members,[],[],date);
 const legacy=confirm([legacyRequest]),unchanged=structuredClone(legacy[0]);
 const combined=confirm(complete(mission(),['a','b']),legacy);
 assert.deepEqual(combined.find(row=>row.missionId==='fm-legacy'),unchanged);
 assert.equal(R.memberSummary('a',combined).total,23);assert.equal(R.memberSummary('b',combined).total,12);
 const huge=confirm(complete(mission({id:'fm-huge',customRunes:Number.MAX_SAFE_INTEGER}),['a']));
 assert.equal(R.memberSummary('a',huge).total,Number.MAX_SAFE_INTEGER);
 assert.throws(()=>confirm(complete(mission(),['a','b']),huge),/capacité numérique/i);
 assert.equal(R.completionRequest({id:'fm-pet',title:'TEST — Animal',status:'open',assigneeId:'pet',effort:'light',rewardVersion:1},members,[],[],date),null,'legacy API also excludes animals');
});

test('unassigned completion offers real humans and requires their explicit participation',()=>{
 const unassigned=mission({assigneeIds:[],assigneeId:'',allFamily:false});
 assert.deepEqual(R.completionCandidateIds(unassigned,[...members,{id:'baby',memberCategory:'baby'}]),['a','b','c']);
 assert.throws(()=>complete(unassigned,[]),/participant/i);
 const event=complete(unassigned,['b'])[0];assert.equal(event.amount,25);assert.deepEqual(event.allocations,[{memberId:'b',amount:25}]);
 const credits=confirm([event]);assert.equal(R.memberSummary('a',credits).total,0);assert.equal(R.memberSummary('b',credits).total,25);
 assert.deepEqual(R.completionCandidateIds(mission({assigneeIds:['removed']}),members),[]);
 assert.throws(()=>complete(mission({assigneeIds:['removed']}),['a']),/attribu/i);
});
test('a genuinely unassigned mission in an empty household completes without fabricating a reward',()=>{
 const unassigned=mission({assigneeIds:[],assigneeId:'',allFamily:false});
 assert.equal(R.canCompleteWithoutParticipants(unassigned,[]),true);
 assert.deepEqual(R.completionRequests(unassigned,[],[],[],[],date),[]);
 assert.equal(R.canCompleteWithoutParticipants(mission({assigneeIds:['removed']}),[]),false);
 assert.throws(()=>R.completionRequests(mission({assigneeIds:['removed']}),[],[],[],[],date),/participant/i);
 assert.throws(()=>R.completionRequests(unassigned,[],['unknown'],[],[],date),/inconnu/i);
});

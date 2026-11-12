import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../family-runes-core.mjs';
const date='2026-11-10T12:00:00.000Z';
const mission=(effort='regular',id='fm-rune')=>({id,title:'TEST — Mission',status:'open',assigneeId:'member-a',effort,rewardVersion:1});
const members=[{id:'member-a'},{id:'member-b'}];
test('validated effort choices and approved V1 grades have one centralized definition',()=>{
 assert.deepEqual(R.EFFORTS.map(x=>[x.id,x.amount]),[['light',10],['regular',25],['major',50]]);
 assert.equal(R.GRADE_CONFIG.provisional,false);assert.equal(R.GRADE_CONFIG.levels.length,12);
 assert.deepEqual([...new Set(R.GRADE_CONFIG.levels.map(g=>g.shape))],['point','star4','star8']);
});
test('only new eligible assigned completions create a single durable request per mission',()=>{
 const request=R.completionRequest(mission(),members,[],[],date);assert.equal(request.amount,25);assert.equal(request.memberId,'member-a');
 assert.equal(R.completionRequest({...mission(),rewardVersion:undefined},members,[],[],date),null,'legacy open or completed missions never earn retrospectively');
 assert.equal(R.completionRequest({...mission(),assigneeId:''},members,[],[],date),null);
 assert.equal(R.completionRequest({...mission(),assigneeId:'removed'},members,[],[],date),null);
 assert.equal(R.completionRequest(mission(),members,[],[request],date),null,'reopen/replay cannot issue a second request');
 assert.equal(R.completionRequest({...mission('major'),assigneeId:'member-b'},members,[{...request,revision:2}],[],date),null,'confirmed reward cannot transfer after reassignment/effort edit');
});
test('10/25/50 credits are validated, durable without mission rows, and deterministic',()=>{
 const requests=R.EFFORTS.map((e,i)=>R.completionRequest(mission(e.id,'fm-'+i),members,[],[],date));
 const credits=R.acceptRequests([],requests,4);assert.equal(R.memberSummary('member-a',credits,requests).total,85);
 assert.equal(R.memberSummary('member-a',credits,requests).pending,0);
 assert.deepEqual(R.acceptRequests(credits,requests,5),credits,'CAS replay keeps confirmation and values');
 assert.deepEqual(R.mergeCredits(credits,[...credits].reverse()),credits,'order-independent deduplication by mission id');
 assert.throws(()=>R.normalizeCredits([{...credits[0],amount:500}]),/runes|récompense/i);
});
test('first confirmed CAS result wins over a divergent offline request without transfer',()=>{
 const a=R.completionRequest(mission('light'),members,[],[],date),b={...a,memberId:'member-b',effort:'major',amount:50};
 const credits=R.acceptRequests([], [a],2);assert.deepEqual(R.acceptRequests(credits,[b],3),credits);
 assert.equal(R.memberSummary('member-b',credits,[b]).total,0);assert.equal(R.memberSummary('member-b',credits,[b]).pending,0);
 assert.equal(R.memberSummary('member-b',credits,[b]).settledElsewhere,1);
 assert.throws(()=>R.mergeCredits(credits,[{...b,revision:3}]),/contradictoire/i,'already confirmed contradictions must block instead of silently transferring');
});
test('pending requests do not inflate totals, and all twelve grade boundaries are stable',()=>{
 const request=R.completionRequest(mission(),members,[],[],date);const summary=R.memberSummary('member-a',[],[request]);assert.equal(summary.total,0);assert.equal(summary.pending,25);
 for(const [index,grade]of R.GRADE_CONFIG.levels.entries()){assert.equal(R.gradeFor(grade.threshold).index,index);if(index)assert.equal(R.gradeFor(grade.threshold-1).index,index-1);}
 const max=R.gradeFor(R.GRADE_CONFIG.levels.at(-1).threshold+10000);assert.equal(max.next,null);
 assert.throws(()=>R.gradeFor(-1),/total/i);
});
test('the reward history is not truncated to the 200 current mission limit',()=>{
 const requests=Array.from({length:251},(_,i)=>R.completionRequest(mission('major','fm-history-'+i),members,[],[],date));const credits=R.acceptRequests([],requests,1);assert.equal(credits.length,251);assert.equal(R.memberSummary('member-a',credits,[]).total,12550);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../family-runes-core.mjs';

const date='2026-11-13T12:00:00.000Z',members=[{id:'exact-member',memberCategory:'parent'}];
const mission=(id,amount)=>({id,title:'TEST — '+id,status:'open',category:'Famille',due:'',effort:'regular',customRunes:amount,rewardVersion:1,assigneeId:'exact-member',assigneeIds:['exact-member'],allFamily:false,participantVersion:1});
const grant=(version,row,credits=[],requests=[])=>version===3?R.completionRequests(row,members,['exact-member'],credits,requests,date):[R.completionRequest(row,members,credits,requests,date)].filter(Boolean);
const reverse=(version,row,credits=[],requests=[])=>version===3?R.reopeningRequests({...row,status:'done'},credits,requests,date):[R.reopeningRequest({...row,status:'done'},credits,requests,date)].filter(Boolean);

for(const version of [2,3])test(`V${version}: queued compensations preserve the exact safe pending total before confirmation`,()=>{
 const small=mission('b-small',2),large=mission('a-large',Number.MAX_SAFE_INTEGER);
 // This chronological history is valid: the small task was completed/reopened
 // before the large one. Stable event sorting places the large grant first.
 const smallGrant=grant(version,small),smallReverse=reverse(version,small,[],smallGrant),largeGrant=grant(version,large,[],[...smallGrant,...smallReverse]);
 const queue=R.normalizeRequests([...smallGrant,...smallReverse,...largeGrant]),before=structuredClone(queue);
 assert.equal(R.memberSummary('exact-member',[],queue).pending,Number.MAX_SAFE_INTEGER);
 const confirmed=R.acceptRequests([],queue,7);
 assert.equal(R.ledgerVersion(confirmed),version);assert.equal(confirmed.length,3);
 assert.equal(R.memberSummary('exact-member',confirmed,queue).total,Number.MAX_SAFE_INTEGER);
 assert.equal(R.memberSummary('exact-member',confirmed,queue).pending,0);
 assert.deepEqual(confirmed.find(event=>R.eventKey(event)===R.eventKey(smallGrant[0])),{...smallGrant[0],revision:7});
 assert.deepEqual(confirmed.find(event=>R.eventKey(event)===R.eventKey(smallReverse[0])),{...smallReverse[0],revision:7});
 const reversal=reverse(version,large,confirmed);
 assert.equal(R.memberSummary('exact-member',confirmed,reversal).pending,-Number.MAX_SAFE_INTEGER);
 const reopened=R.acceptRequests(confirmed,reversal,8);
 assert.equal(R.memberSummary('exact-member',reopened,[]).total,0);
 assert.deepEqual(queue,before,'summaries and confirmations do not mutate queued history');
});

for(const version of [2,3])test(`V${version}: persistent overflow still fails before accepting any ledger change`,()=>{
 const large=grant(version,mission('a-large',Number.MAX_SAFE_INTEGER)),extra=grant(version,mission('b-extra',2)),queue=R.normalizeRequests([...large,...extra]),before=structuredClone(queue);
 assert.throws(()=>R.memberSummary('exact-member',[],queue),/en attente invalide/);
 assert.throws(()=>R.acceptRequests([],queue,1),/capacité numérique/);
 assert.deepEqual(queue,before);
});

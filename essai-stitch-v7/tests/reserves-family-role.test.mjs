import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function readonly({role='child',members=[],verified=true,matching=true,demo=null,offline=false,boundOverride={}}={}){
 const bound=offline?{}:{authenticated:true,phase:'active',userId:'TEST-U',householdId:'TEST-H',memberId:'TEST-M',verified,profile:{id:'TEST-M',memberCategory:role},...boundOverride};
 const native={...(demo?{DobbyReview:{demoMemberId:demo}}:{}),DobbyFamilyUI:{access:{state:()=>bound},getContext:()=>offline?null:{identityVerified:verified,userId:matching?'TEST-U':'OTHER-U',householdId:'TEST-H',memberId:'TEST-M'}}};
 const realm={window:{DobbyFamilyStitchEngine:{win:()=>native,read:()=>({members})}}};
 vm.runInNewContext(fs.readFileSync(new URL('../family.js',import.meta.url),'utf8'),realm);return realm.window.DobbyFamilyStitch.sharedReadOnly();
}
test('reserves: canonical child remains readonly with a promoted, absent or stale local row',()=>{
 for(const members of [[{id:'TEST-M',memberCategory:'parent'}],[],[{id:'TEST-M',memberCategory:'child'}]])assert.equal(readonly({members}),true);
 assert.equal(readonly({verified:false}),true,'Losing verification never grants a child write controls');
 assert.equal(readonly({matching:false}),true,'Mismatched canonical identity never grants child write controls');
});
test('reserves: canonical parent wins over a stale local child category; missing/unknown canonical role cannot grant writes',()=>{
 assert.equal(readonly({role:'parent',members:[{id:'TEST-M',memberCategory:'child'}]}),false);
 for(const role of [undefined,'unknown',''])assert.equal(readonly({role:role===undefined?null:role,members:[{id:'TEST-M',memberCategory:'parent'}]}),true);
});
test('reserves: explicit local demo roles and unauthenticated local use retain their existing scope',()=>{
 assert.equal(readonly({offline:true}),false);
 assert.equal(readonly({offline:true,demo:'TEST-M',members:[{id:'TEST-M',memberCategory:'child'}]}),true);
 assert.equal(readonly({offline:true,demo:'TEST-M',members:[{id:'TEST-M',memberCategory:'parent'}]}),false);
});

test('reserves: parent UI requires the complete canonical binding, including authentication and profile identity',()=>{
 for(const boundOverride of [{authenticated:false},{userId:null},{householdId:''},{memberId:null},{profile:{memberCategory:'parent'}},{profile:{id:'OTHER',memberCategory:'parent'}}])assert.equal(readonly({role:'parent',boundOverride}),true);
});

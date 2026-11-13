import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function readonly({role='child',members=[],verified=true,matching=true,demo=null,offline=false,boundOverride={},nativeUser=null,contextUser=null}={}){
 const bound=offline?{}:{authenticated:true,phase:'active',userId:'TEST-U',householdId:'TEST-H',memberId:'TEST-M',verified,profile:{id:'TEST-M',memberCategory:role},permissions:{canEdit:true,canMagic:true},...boundOverride};
 const native={...(demo?{DobbyReview:{demoMemberId:demo}}:{}),DobbyFamilyUI:{access:{state:()=>bound},connectionState:()=>({userId:nativeUser}),getContext:()=>offline?(contextUser?{userId:contextUser}:null):{identityVerified:verified,userId:matching?'TEST-U':'OTHER-U',householdId:'TEST-H',memberId:'TEST-M'}}};
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

test('reserves: blank V7 state with a real native account remains readonly during context replacement',()=>{
 assert.equal(readonly({offline:true,nativeUser:'TEST-NEW-ACCOUNT'}),true,'connectionState identifies a native session even when V7 state is blank');
 assert.equal(readonly({offline:true,contextUser:'TEST-NEW-ACCOUNT'}),true,'A native household context also prevents the local fallback');
 assert.equal(readonly({offline:true}),false,'A genuinely local session retains local editing');
 assert.equal(readonly({offline:true,nativeUser:'TEST-NEW-ACCOUNT',demo:'TEST-M',members:[{id:'TEST-M',memberCategory:'parent'}]}),false,'Explicit local demo behavior is unchanged');
});

test('reserves: parent UI respects explicit or missing edit grants without using family-create permission',()=>{
 for(const permissions of [{canEdit:false},{},undefined])assert.equal(readonly({role:'parent',boundOverride:{permissions}}),true);
 assert.equal(readonly({role:'parent',boundOverride:{permissions:{canEdit:true,canCreate:false}}}),false);
 assert.equal(readonly({offline:true,demo:'TEST-M',members:[{id:'TEST-M',memberCategory:'parent'}],boundOverride:{permissions:{canEdit:false}}}),false,'Explicit local demo remains separate from canonical grants');
});

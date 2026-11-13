import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {createFamilyAccess,FAMILY_FEATURE_RELEASE,verifiedFamilyCapabilities} from '../family-access.mjs';

// Fictional transport only. These checks never call Auth or a remote database.
const USER='TEST-auth-child',HH='TEST-household',CHILD='local-child-history:07',PARENT='local-parent:03',TOKEN='a'.repeat(64);
const release={familyRoles:true,childAccountLink:true};
const ready=()=>({protocol:2,installed:true,familyRolesAvailable:true,childAccountLinkAvailable:true,familyRolesVerified:true,childAccountLinkVerified:true,storagePoliciesVerified:true});
const parent=()=>({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:PARENT,profile:{id:PARENT,name:'TEST Parent',memberCategory:'parent'},permissions:{canEdit:true,canMagic:true,canCreate:true,canManageDependents:false,canInvite:true,canManageHousehold:true},familyRevision:8});
const child=()=>({...parent(),memberId:CHILD,profile:{id:CHILD,name:'TEST Enfant',memberCategory:'child',avatar:'🐉',magicProfile:{version:1,houseId:'ravenclaw',patronusId:'otter',futureHistory:{keep:'TEST'}}}});
const preview=()=>({status:'valid',kind:'child-account',targetMemberId:CHILD,household:{id:HH,name:'TEST Foyer'},inviter:{name:'TEST Parent'},expiresAt:'2099-11-13T12:00:00Z'});
function fixture({flags,context=parent(),caps=ready()}={}){
 const native={ready:true,configured:true,userId:USER,householdId:context.householdId||null,epoch:0,verified:false},metadata=new Map(),calls=[];
 let current=context,capabilities=caps,binding=null,intercept=null;
 const driver={crypto:webcrypto,now:()=>Date.now(),snapshot:()=>({...native}),
  meta:async key=>metadata.get(key)??null,putMeta:async(key,value)=>metadata.set(key,structuredClone(value)),delMeta:async key=>metadata.delete(key),updateMeta:async(key,change)=>metadata.set(key,change(metadata.get(key)??null)),
  clearBinding:()=>{binding=null;native.verified=false;},bind:async value=>{binding=structuredClone(value);native.verified=true;},notify(){},
  rpc:async(name,body,options)=>{calls.push({name,body:structuredClone(body),options,actor:native.userId,householdId:native.householdId});if(intercept){const result=await intercept(name,body,options);if(result!==undefined)return result;}
   if(name==='dobby_v7_context')return structuredClone(current);
   if(name==='dobby_v7_family_capabilities')return structuredClone(capabilities);
   if(name==='dobby_v7_preview_child_invitation')return preview();
   if(name==='dobby_v7_create_child_invitation')return{...preview(),protocol:1,token:TOKEN};
   if(name==='dobby_v7_accept_child_invitation'){current=child();return child();}
   return{ok:true};
  },logout:async()=>{native.userId=null;native.epoch++;}};
 const api=createFamilyAccess(driver,flags?{release:flags}:{});
 return{api,driver,native,metadata,calls,get binding(){return binding;},setContext(value){current=value;},setCapabilities(value){capabilities=value;},intercept(fn){intercept=fn;}};
}
function policy(){const realm={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../family-member-policy.js',import.meta.url),'utf8'),realm);return realm.window.DobbyFamilyMemberPolicy;}

test('published F08/F09 additions stay closed and make no new RPC, even against verified advertised capabilities',async()=>{
 assert.deepEqual(FAMILY_FEATURE_RELEASE,{familyRoles:false,childAccountLink:false});assert.equal(Object.isFrozen(FAMILY_FEATURE_RELEASE),true);
 const f=fixture();await f.api.refresh();assert.equal(f.api.state().permissions.canManageHousehold,false);assert.equal(f.api.state().permissions.canLinkExistingChild,false);
 assert.deepEqual(await f.api.previewChildInvitation(TOKEN),{status:'unavailable',kind:'child-account'});
 await assert.rejects(f.api.createChildInvitation({memberId:CHILD}),/pas encore disponible/);
 await assert.rejects(f.api.acceptChildInvitation(TOKEN),/pas encore disponible/);
 assert.deepEqual(f.calls.map(call=>call.name),['dobby_v7_context']);assert.doesNotMatch(JSON.stringify(f.api.state()),new RegExp(TOKEN));
});

test('Available alone, absent verification, absent storage proof or a closed release flag never authorize household management',()=>{
 const closed=raw=>verifiedFamilyCapabilities(raw,release);
 for(const key of ['installed','familyRolesAvailable','familyRolesVerified','storagePoliciesVerified'])assert.equal(closed({...ready(),[key]:false}).familyRolesReady,false,key);
 for(const key of ['childAccountLinkAvailable','childAccountLinkVerified'])assert.equal(closed({...ready(),[key]:false}).childAccountLinkReady,false,key);
 assert.equal(closed({...ready(),protocol:1}).familyRolesReady,false);
 assert.equal(verifiedFamilyCapabilities(ready(),{familyRoles:false,childAccountLink:true}).childAccountLinkReady,false);
 assert.equal(verifiedFamilyCapabilities(ready(),{familyRoles:true,childAccountLink:false}).childAccountLinkReady,false);
 assert.equal(closed(ready()).childAccountLinkReady,true);
});

test('full parent management needs a fresh server capability and remains scoped to the current member register',async()=>{
 const f=fixture({flags:release});await f.api.refresh();const live=f.api.state();assert.equal(live.permissions.canManageHousehold,true);
 const P=policy(),members=[live.profile,{id:'local-other-parent',memberCategory:'parent'},{id:CHILD,memberCategory:'child'}],context={verified:true,userId:USER,householdId:HH,actorId:PARENT,members,permissions:live.permissions};
 assert.equal(P.permissions(members[1],context).canEdit,true);assert.equal(P.permissions(members[2],context).canLinkExistingChild,true);
 assert.equal(P.permissions({id:'foreign-child',memberCategory:'child'},context).canEdit,false);
 assert.equal(P.permissions(members[1],{...context,permissions:{...live.permissions,familyRolesVerified:false}}).canEdit,false);
 await f.api.updateMember({memberId:'local-other-parent',values:{nickname:'TEST'},expectedRevision:8});
 assert.equal(f.calls.find(call=>call.name==='dobby_v7_update_member').body.p_member_id,'local-other-parent');
 f.setCapabilities({...ready(),storagePoliciesVerified:false});await f.api.refresh();assert.equal(f.api.state().permissions.canManageHousehold,false);
 await assert.rejects(f.api.updateMember({memberId:'local-other-parent',values:{nickname:'TEST'},expectedRevision:8}),/non autorisée/);
});

test('capability endpoint failure closes additions without breaking the existing verified family session',async()=>{
 const f=fixture({flags:release});f.intercept(name=>{if(name==='dobby_v7_family_capabilities')throw Object.assign(Error('TEST PRIVATE INTERNAL'),{status:403});});
 await f.api.refresh();assert.equal(f.api.state().verified,true);assert.equal(f.api.state().permissions.canManageHousehold,false);assert.equal(f.api.state().capabilities.childAccountLinkReady,false);
});

test('a canonical child keeps own magic only even when the transport claims parental grants',async()=>{
 const f=fixture({flags:release,context:child()});await f.api.refresh();const live=f.api.state();
 for(const key of ['canEdit','canCreate','canInvite','canManageDependents','canManageHousehold','canLinkExistingChild'])assert.equal(live.permissions[key],false,key);
 await assert.rejects(f.api.saveProfile({firstName:'TEST Changed'}),/non autorisée/);
 await assert.rejects(f.api.updateMember({memberId:CHILD,values:{avatar:'👤'},expectedRevision:8}),/non autorisée/);
 await assert.rejects(f.api.updateMagic({memberId:PARENT,values:{magicHouseId:'ravenclaw'},expectedRevision:8}),/non autorisée/);
 await f.api.updateMagic({memberId:CHILD,values:{magicHouseId:'ravenclaw'},expectedRevision:8});
 const P=policy(),members=[live.profile,{id:PARENT,memberCategory:'parent'}],context={verified:true,userId:USER,householdId:HH,actorId:CHILD,members,permissions:parent().permissions};
 assert.equal(P.permissions(members[0],context).canEdit,false);assert.equal(P.permissions(members[0],context).canMagic,true);assert.equal(P.permissions(members[1],context).canMagic,false);
 assert.throws(()=>P.assertWrite(members[0],{notes:'TEST',magicHouseId:'ravenclaw'},context,{magicResult:true}),/uniquement/);
});

test('targeted creation sends the exact existing TEXT ID and never invents an Auth user or household parameter',async()=>{
 const f=fixture({flags:release});await f.api.refresh();const created=await f.api.createChildInvitation({memberId:CHILD});
 assert.equal(created.targetMemberId,CHILD);assert.equal(created.kind,'child-account');assert.equal(created.token,TOKEN);
 const request=f.calls.find(call=>call.name==='dobby_v7_create_child_invitation');assert.equal(request.body.p_member_id,CHILD);
 assert.deepEqual(Object.keys(request.body).sort(),['p_expires_in_hours','p_member_id','p_operation_id']);
 assert.doesNotMatch(JSON.stringify(f.api.state()),new RegExp(TOKEN));
});

test('a failed capability recheck cannot retain old household or child invitation grants',async()=>{
 const f=fixture({flags:release});await f.api.refresh();assert.equal(f.api.state().permissions.canManageHousehold,true);
 f.setCapabilities({...ready(),familyRolesVerified:false});assert.equal((await f.api.previewChildInvitation(TOKEN)).status,'unavailable');
 assert.equal(f.api.state().permissions.canManageHousehold,false);assert.equal(f.api.state().permissions.canLinkExistingChild,false);
 await assert.rejects(f.api.createChildInvitation({memberId:CHILD}),/pas encore disponible/);
 await assert.rejects(f.api.updateMember({memberId:'local-other-parent',values:{nickname:'TEST'},expectedRevision:8}),/non autorisée/);
});

test('the existing generic invitation still uses its own endpoint while additions remain closed',async()=>{
 const f=fixture();await f.api.refresh();f.intercept(name=>{if(name==='dobby_v7_create_invitation')return{protocol:1,token:'TEST-adult-token',household:{id:HH,name:'TEST Foyer'},inviter:{name:'TEST Parent'},expiresAt:'2099-11-13T12:00:00Z'};});
 const created=await f.api.createInvitation();assert.equal(created.token,'TEST-adult-token');await f.api.acceptInvitation(created.token);
 assert.equal(f.calls.some(call=>call.name==='dobby_v7_create_invitation'),true);assert.equal(f.calls.some(call=>call.name==='dobby_v7_accept_invitation'),true);
 assert.equal(f.calls.some(call=>/child|family_capabilities/.test(call.name)),false);
});

test('targeted acceptance bypasses pending profile creation and adopts only the original canonical child, including replay',async()=>{
 const f=fixture({flags:release,context:{protocol:1,phase:'profile',userId:USER,profile:null}});await f.api.refresh();
 await f.api.previewChildInvitation(TOKEN);assert.equal(f.api.state().phase,'profile');
 const first=await f.api.acceptChildInvitation(TOKEN),second=await f.api.acceptChildInvitation(TOKEN);
 assert.equal(first.memberId,CHILD);assert.equal(second.memberId,CHILD);assert.equal(f.binding.memberId,CHILD);
 assert.equal(first.profile.memberCategory,'child');assert.equal(first.profile.avatar,'🐉');assert.deepEqual(first.profile.magicProfile,child().profile.magicProfile);
 assert.equal(f.calls.some(call=>['dobby_v7_update_profile','dobby_v7_accept_invitation','dobby_v7_create_household'].includes(call.name)),false);
 const requests=f.calls.filter(call=>call.name==='dobby_v7_accept_child_invitation');assert.equal(requests.length,2);assert.equal(requests[0].body.p_operation_id,requests[1].body.p_operation_id);
 assert.doesNotMatch(JSON.stringify([...f.metadata.entries()]),new RegExp(TOKEN));
});

test('a child acceptance response cannot replace the target with another canonical profile during fresh adoption',async()=>{
 const f=fixture({flags:release,context:{protocol:1,phase:'profile',userId:USER,profile:null}});await f.api.refresh();await f.api.previewChildInvitation(TOKEN);
 f.intercept(name=>{if(name==='dobby_v7_accept_child_invitation'){f.setContext({...child(),memberId:'other-child',profile:{...child().profile,id:'other-child'}});return child();}});
 await assert.rejects(f.api.acceptChildInvitation(TOKEN),/profil existant/);assert.equal(f.binding,null);assert.equal(f.api.state().verified,false);
});

test('a late child preview cannot be adopted after the authenticated account changes',async()=>{
 const f=fixture({flags:release});await f.api.refresh();let respond;
 f.intercept(name=>name==='dobby_v7_preview_child_invitation'?new Promise(resolve=>respond=resolve):undefined);
 const pending=f.api.previewChildInvitation(TOKEN);while(!respond)await new Promise(resolve=>setImmediate(resolve));
 f.native.userId='TEST-other-auth';f.native.epoch++;respond(preview());
 await assert.rejects(pending,/compte a changé/);assert.equal(f.api.state().memberId,null);
});

test('an account or household replacement in the operation microtask gap prevents either targeted mutation from reaching the network',async t=>{
 for(const action of ['create','accept'])for(const scope of ['account','household'])await t.test(action+'/'+scope,async()=>{
  const f=fixture({flags:release,...(action==='accept'?{context:{protocol:1,phase:'profile',userId:USER,profile:null}}:{})});
  await f.api.refresh();if(action==='accept')await f.api.previewChildInvitation(TOKEN);
  const originalMeta=f.driver.meta;let metaStarted=false,resolveOperation;
  const operation=new Promise(resolve=>resolveOperation=resolve);
  f.driver.meta=key=>key.startsWith('v7-operation:')?(metaStarted=true,operation):originalMeta(key);
  const pending=action==='create'?f.api.createChildInvitation({memberId:CHILD}):f.api.acceptChildInvitation(TOKEN);
  while(!metaStarted)await new Promise(resolve=>setImmediate(resolve));
  // Registered after operation()'s own await: its internal guard sees A, then
  // this reaction replaces A before the caller of operation() resumes.
  operation.then(()=>{f.native.householdId='TEST-replacement-household-B';if(scope==='account'){f.native.userId='TEST-replacement-account-B';f.native.epoch++;}});
  resolveOperation('00000000-0000-4000-8000-000000000099');
  await assert.rejects(pending,/compte|foyer/i);
  const endpoint=action==='create'?'dobby_v7_create_child_invitation':'dobby_v7_accept_child_invitation';
  assert.equal(f.calls.filter(call=>call.name===endpoint).length,0,'No mutation may be sent using the replacement account');
 });
});

test('legacy operation continuations retain the original account even when another household reuses the same TEXT member ID',async t=>{
 const cases=[
  ['dobby_v7_create_household',api=>api.createHousehold('TEST Nouveau foyer'),true],
  ['dobby_v7_accept_invitation',api=>api.acceptInvitation('TEST-existing-adult-invite'),true],
  ['dobby_v7_create_invitation',api=>api.createInvitation(),false],
  ['dobby_v7_update_magic',api=>api.updateMagic({memberId:PARENT,values:{magicHouseId:'ravenclaw'},expectedRevision:8}),false],
  ['dobby_v7_update_member',api=>api.updateMember({memberId:PARENT,values:{nickname:'TEST'},expectedRevision:8}),false]
 ];
 for(const[endpoint,invoke,pendingHousehold]of cases)for(const scope of ['account','household'])await t.test(endpoint+'/'+scope,async()=>{
  const f=fixture({context:pendingHousehold?{protocol:1,phase:'household',userId:USER,profile:{firstName:'TEST'}}:parent()});await f.api.refresh();
  const originalMeta=f.driver.meta;let metaStarted=false,resolveOperation;const operation=new Promise(resolve=>resolveOperation=resolve);
  f.driver.meta=key=>key.startsWith('v7-operation:')?(metaStarted=true,operation):originalMeta(key);
  const pending=invoke(f.api);while(!metaStarted)await new Promise(resolve=>setImmediate(resolve));
  operation.then(()=>{f.native.householdId='TEST-household-B';if(scope==='account'){f.native.userId='TEST-account-B';f.native.epoch++;}f.setContext({...parent(),userId:f.native.userId,householdId:f.native.householdId});});
  resolveOperation('00000000-0000-4000-8000-000000000100');
  await assert.rejects(pending,/compte|foyer/i);
  assert.equal(f.calls.filter(call=>call.name===endpoint).length,0,'A TEXT ID reused in household B must not redirect the original mutation to B');
 });
});

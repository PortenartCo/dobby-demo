import test from 'node:test';
import assert from 'node:assert/strict';
import {createFamilyAccess} from '../family-access.mjs';

const release={familyRoles:true,childAccountLink:true};
const capabilities={protocol:2,installed:true,familyRolesAvailable:true,familyRolesVerified:true,storagePoliciesVerified:true,childAccountLinkAvailable:true,childAccountLinkVerified:true};
const householdId='household-fixture',parentId='parent-fixture',childId='legacy-child:01';

function fixture({category='parent',phase='active',protocol=1,childStatus={linked:true,active:true},suspension={linked:true,active:false},beforeContext}={}){
 const memberId=category==='child'?childId:parentId;
 const native={ready:true,configured:true,userId:'fixture-user',householdId,epoch:0,verified:false};
 const calls=[];
 const access=createFamilyAccess({
  snapshot:()=>({...native}),clearBinding(){native.verified=false;},async bind(){native.verified=true;},
  async rpc(name,body,options){
   calls.push({name,body,options});
   if(name==='dobby_v7_context'){
    await beforeContext?.();
    return phase==='rejected'
     ? {protocol:1,phase,userId:native.userId,reason:'child_access_suspended'}
     : {protocol:1,phase,userId:native.userId,householdId,memberId,profile:{id:memberId,memberCategory:category},permissions:{canEdit:true,canManageHousehold:true}};
   }
   if(name==='dobby_v7_family_capabilities')return {...capabilities,childAccessProtocol:protocol};
   if(name==='dobby_v7_child_access_status')return childStatus;
   if(name==='dobby_v7_suspend_child_access')return suspension;
  }
 },{release,requireChildAccessProtocol:true});
 return {access,calls};
}

test('local child releases require the exact child protocol before using targeted RPCs',async()=>{
 for(const protocol of [null,2,'1']){
  const {access,calls}=fixture({protocol});
  await access.refresh();
  assert.equal(access.state().permissions.canLinkExistingChild,false);
  assert.deepEqual(await access.previewChildInvitation('fixture-child-token'),{status:'unavailable',kind:'child-account'});
  await assert.rejects(access.childAccessStatus(childId),/indisponible|non autorisé/);
  await assert.rejects(access.suspendChildAccess(childId),/indisponible|non autorisé/);
  assert.equal(calls.some(({name})=>name.includes('child_')),false);
 }
});

test('an authorized parent reads and suspends the exact existing child with minimal DTOs',async()=>{
 const {access,calls}=fixture({childStatus:{linked:true,active:true,email:'ignored@example.invalid'}});
 await access.refresh();
 assert.equal(access.state().capabilities.childAccessProtocol,1);
 assert.deepEqual(await access.childAccessStatus(childId),{linked:true,active:true});
 assert.deepEqual(await access.suspendChildAccess(childId),{linked:true,active:false});
 assert.deepEqual(calls.slice(-2),[
  {name:'dobby_v7_child_access_status',body:{p_member_id:childId},options:{method:'GET'}},
  {name:'dobby_v7_suspend_child_access',body:{p_member_id:childId},options:{}}
 ]);
});

test('a non-parent cannot read another child link or suspend it and only confirmed suspension succeeds',async()=>{
 const child=fixture({category:'child'});
 await child.access.refresh();
 await assert.rejects(child.access.childAccessStatus(childId),/non autorisé/);
 await assert.rejects(child.access.suspendChildAccess(childId),/non autorisé/);
 assert.equal(child.calls.length,2);
 const unconfirmed=fixture({childStatus:{linked:false,active:true},suspension:{linked:true,active:true}});
 await unconfirmed.access.refresh();
 await assert.rejects(unconfirmed.access.childAccessStatus(childId),/non confirmé/);
 await assert.rejects(unconfirmed.access.suspendChildAccess(childId),/non confirmée/);
});

test('a suspended session keeps its rejected context and offers no canonical binding',async()=>{
 const {access}=fixture({phase:'rejected',category:'child'});
 const context=await access.refresh();
 assert.equal(context.phase,'rejected');
 assert.equal(context.reason,'child_access_suspended');
 assert.equal(context.verified,false);
 assert.equal(context.memberId,null);
});

test('background sync cannot supersede a child account confirmation after a mutation',async()=>{
 const entered=Promise.withResolvers(), unblocked=Promise.withResolvers();
 const {access,calls}=fixture({category:'child',async beforeContext(){entered.resolve();await unblocked.promise;}});
 const first=access.refresh();
 await entered.promise;
 const second=access.refresh();
 await Promise.resolve();
 assert.equal(calls.filter(call=>call.name==='dobby_v7_context').length,1);
 unblocked.resolve();
 const results=await Promise.all([first,second]);
 assert.ok(results.every(result=>result.verified&&result.memberId===childId));
 assert.equal(calls.filter(call=>call.name==='dobby_v7_context').length,2);
});

test('a pending scope read keeps the same verified session until its server result arrives',async()=>{
 const entered=Promise.withResolvers(), unblocked=Promise.withResolvers();
 let hold=false;
 const {access}=fixture({category:'child',async beforeContext(){if(hold){entered.resolve();await unblocked.promise;}}});
 await access.refresh();
 hold=true;
 const refreshing=access.refresh();
 await entered.promise;
 assert.equal(access.state().verified,true);
 assert.equal(access.state().memberId,childId);
 unblocked.resolve();
 assert.equal((await refreshing).verified,true);
});

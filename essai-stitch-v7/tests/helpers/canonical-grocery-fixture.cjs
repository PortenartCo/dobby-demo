/* Synthetic canonical server DTOs for grocery transport tests. No production
 * identity setter: native access.refresh/bind must verify and adopt these rows. */
'use strict';
function canonicalGroceryFixture(householdId,users){
 const profiles=Object.fromEntries(Object.entries(users).map(([label,userId])=>[label,{
  id:'fixture-parent-'+userId.slice(-12),name:'TEST — Parent '+label,memberCategory:'parent',
  magicProfile:{version:1,houseId:'gryffindor',patronusId:'stag',ceremonyStatus:'complete',
   houseSelectionSource:'manual',patronusSelectionSource:'manual'}
 }]));
 const permissions={canEdit:true,canMagic:true,canCreate:true,canManageDependents:true,canInvite:true};
 const familyRow={household_id:householdId,module:'family',revision:1,updated_at:'2026-11-13T10:00:00.000Z',payload:{
  familyMembers:Object.values(profiles),famContacts:[],famLists:[],familyEvents:[],sharedHealthVisits:[],
  sharedFamilyNotes:[],familyNotesVersion:1,familyPreparationTemplates:[],familyEventPreparations:[],familyPreparationsVersion:1
 }};
 return {familyRow,profiles,context(label){
  if(!users[label])throw Error('Unknown synthetic canonical actor: '+label);
  return {protocol:1,phase:'active',userId:users[label],householdId,memberId:profiles[label].id,
   profile:profiles[label],permissions,pendingCeremony:false,familyRevision:familyRow.revision};
 }};
}
async function assertCanonicalGroceryIdentity(page,expected){
 const {strict:assert}=require('node:assert');
 const observation=await page.waitForFunction(expected=>{
  const api=DobbyCuisineEngine.win().DobbyFamilyUI,access=api.access.state(),binding=api.getContext();
  if(access.authenticated!==true||access.verified!==true||access.phase!=='active'
   ||binding?.identityVerified!==true||api.connectionState().verifying
   ||['userId','householdId','memberId'].some(field=>access[field]!==expected[field]||binding[field]!==expected[field]))return false;
  // Freeze the ready observation in this browser turn. Another canonical read
  // may revoke the live binding before Playwright retrieves the result.
  return JSON.stringify({access,binding,members:DobbyCuisineEngine.read().state.familyMembers,
   readOnly:DobbyFamilyStitch.sharedReadOnly()});
 },expected);
 let actual;
 try{actual=JSON.parse(await observation.jsonValue());}finally{await observation.dispose();}
 assert.equal(actual.access.authenticated,true);
 assert.equal(actual.access.verified,true);
 assert.equal(actual.access.phase,'active');
 for(const field of ['userId','householdId','memberId']){
  assert.equal(actual.access[field],expected[field],field+' canonical access');
  assert.equal(actual.binding[field],expected[field],field+' native binding');
 }
 assert.equal(actual.binding.identityVerified,true);
 assert.equal(actual.access.profile.id,expected.memberId);
 assert.equal(actual.access.profile.memberCategory,'parent');
 assert.equal(actual.access.pendingCeremony,false);
 assert.equal(actual.access.profile.magicProfile.houseId,expected.profile.magicProfile.houseId);
 assert.equal(actual.access.profile.magicProfile.patronusId,expected.profile.magicProfile.patronusId);
 assert.equal(actual.access.permissions.canEdit,true);
 assert.equal(actual.binding.permissions.canEdit,true);
 assert.equal(actual.members.filter(x=>x.id===expected.memberId).length,1,'One server-bound member in the native family registry');
 assert.equal(actual.readOnly,false,'Canonical parent may edit shared groceries');
}
module.exports={canonicalGroceryFixture,assertCanonicalGroceryIdentity};

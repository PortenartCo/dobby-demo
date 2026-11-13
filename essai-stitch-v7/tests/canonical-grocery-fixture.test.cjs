/* Deterministic synchronization regression on an isolated synthetic page.
 * This never installs an identity in the native application or calls refresh. */
'use strict';
const assert=require('node:assert/strict');
const {canonicalGroceryFixture,assertCanonicalGroceryIdentity}=require('./helpers/canonical-grocery-fixture.cjs');

async function checkCanonicalGrocerySnapshot(browser){
 const context=await browser.newContext(),page=await context.newPage();
 const expected=canonicalGroceryFixture('test-household',{A:'test-user'}).context('A');
 const install=patch=>page.evaluate(({expected,patch})=>{
  window.fixture={
   access:{...expected,authenticated:true,verified:true},
   binding:{userId:expected.userId,householdId:expected.householdId,memberId:expected.memberId,
    identityVerified:true,permissions:expected.permissions},
   members:[expected.profile],verifying:false
  };
  for(const [section,values] of Object.entries(patch||{})){
   if(section==='verifying')fixture.verifying=values;
   else Object.assign(fixture[section],values);
  }
  window.DobbyCuisineEngine={
   win:()=>({DobbyFamilyUI:{access:{state:()=>structuredClone(fixture.access)},
    getContext:()=>structuredClone(fixture.binding),connectionState:()=>({verifying:fixture.verifying})}}),
   read:()=>({state:{familyMembers:fixture.members}})
  };
  window.DobbyFamilyStitch={sharedReadOnly:()=>false};
 },{expected,patch});
 try{
  await install();
  // A new verification starts immediately after readiness. The assertion must
  // consume the ready observation, not sample the new unavailable state.
  await assertCanonicalGroceryIdentity({
   async waitForFunction(...args){
    const observation=await page.waitForFunction(...args);
    await page.evaluate(()=>{
     Object.assign(fixture.access,{phase:'unavailable',authenticated:false,verified:false});
     fixture.binding.identityVerified=false;
     fixture.members.length=0;
    });
    return observation;
   },
   evaluate:(...args)=>page.evaluate(...args)
  },expected);
  assert.equal(await page.evaluate(()=>fixture.access.authenticated),false,
   'The synthetic verification really changed after readiness');

  const pending=[
   {access:{authenticated:false}},
   {access:{phase:'unavailable'}},
   {access:{userId:'another-user'}},
   {binding:{householdId:'another-household'}},
   {access:{memberId:'another-member'},binding:{memberId:'another-member'}},
   {verifying:true}
  ];
  for(const patch of pending){
   await install(patch);
   await assertCanonicalGroceryIdentity({
    async waitForFunction(predicate,arg,options){
     assert.equal(await page.evaluate(predicate,arg),false,
      'Wait for the authenticated expected identity: '+JSON.stringify(patch));
     await install();
     return page.waitForFunction(predicate,arg,options);
    },
    evaluate:(...args)=>page.evaluate(...args)
   },expected);
  }
  await install({access:{permissions:{canEdit:false}}});
  await assert.rejects(assertCanonicalGroceryIdentity(page,expected),
   {code:'ERR_ASSERTION'},'A settled context still has to pass every permission assertion');
  return 8;
 }finally{await context.close();}
}
module.exports={checkCanonicalGrocerySnapshot};
if(require.main===module){
 require('node:test').test('canonical grocery identity waits and snapshots atomically (8 cases)',async()=>{
  const browser=await require('playwright').chromium.launch({
   executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  try{assert.equal(await checkCanonicalGrocerySnapshot(browser),8);}finally{await browser.close();}
 });
}

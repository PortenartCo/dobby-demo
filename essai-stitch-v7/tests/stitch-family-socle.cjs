/* Focused F08/F09 browser fixtures. No real Auth, SQL, account or permission proof. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8893';
const executablePath=process.env.CHROMIUM_PATH||'/workspace/scratch/chrome-ci157/chrome-linux64/chrome';
const CHILD='TEST-existing-child:07',PARENT='TEST-parent:03',TOKEN='b'.repeat(64);
let browser;
async function fixture(mode){
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'fr-BE',reducedMotion:'reduce'}),external=[];
 await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():(external.push(new URL(route.request().url()).origin),route.abort()));
 await context.addInitScript(({mode,CHILD,PARENT,TOKEN})=>{
  if(!location.pathname.endsWith('/essai-stitch-v5-famille/index.html'))return;
  const accepted=sessionStorage.getItem('TEST-socle-child-accepted')==='true',isChild=mode==='active-child'||accepted;
  const grants={canEdit:!isChild,canMagic:true,canCreate:!isChild,canManageDependents:!isChild,canInvite:!isChild,canManageHousehold:false,familyRolesVerified:false,canLinkExistingChild:false};
  let state={phase:mode==='child-invitation'&&!accepted?'profile':'active',configured:true,authenticated:true,userId:'TEST-socle-account',verified:mode!=='child-invitation'||accepted,
   profile:mode==='child-invitation'&&!accepted?null:{id:isChild?CHILD:PARENT,name:isChild?'TEST Enfant':'TEST Parent',memberCategory:isChild?'child':'parent'},permissions:grants,
   ...(mode==='child-invitation'&&!accepted?{}:{householdId:'TEST-socle-household',memberId:isChild?CHILD:PARENT,familyRevision:3,pendingCeremony:false})};
  const record=call=>{const calls=JSON.parse(sessionStorage.getItem('TEST-socle-calls')||'[]');calls.push(call);sessionStorage.setItem('TEST-socle-calls',JSON.stringify(calls));};
  const listeners=new Set(),emit=()=>{for(const listener of listeners)listener({...state});return {...state};};
  const access={ready:Promise.resolve(),state:()=>({...state}),refresh:async()=>emit(),subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},
   saveProfile:async()=>{record({kind:'saveProfile'});throw Error('TEST forbidden duplicate onboarding');},
   previewInvitation:async()=>{record({kind:'genericPreview'});throw Error('TEST wrong invitation kind');},
   acceptInvitation:async()=>{record({kind:'genericAccept'});throw Error('TEST wrong invitation kind');},
   previewChildInvitation:async token=>{record({kind:'childPreview',token});return{status:'valid',kind:'child-account',targetMemberId:CHILD,household:{id:'TEST-socle-household',name:'TEST Foyer existant'},inviter:{name:'TEST Parent'},expiresAt:'2099-11-13T12:00:00Z'};},
   acceptChildInvitation:async token=>{record({kind:'childAccept',token,memberId:CHILD});sessionStorage.setItem('TEST-socle-child-accepted','true');state={...state,phase:'active',verified:true,householdId:'TEST-socle-household',memberId:CHILD,familyRevision:3,pendingCeremony:false,profile:{id:CHILD,name:'TEST Enfant',memberCategory:'child'},permissions:{...grants,canEdit:false,canCreate:false,canManageDependents:false,canInvite:false}};return emit();}};
  let native;Object.defineProperty(window,'DobbyFamilyUI',{configurable:true,get:()=>native,set:api=>{native={...api,access,
   connectionState:()=>({...api.connectionState(),ready:true,configured:true,userId:state.userId,householdId:state.householdId,verified:state.verified,identityVerified:state.verified,verifying:false,access:state.verified?'verified':'local'}),
   getContext:()=>state.verified?{identityVerified:true,userId:state.userId,householdId:state.householdId,memberId:state.memberId,permissions:state.permissions,familyRevision:3}:null};}});
 },{mode,CHILD,PARENT,TOKEN});
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);
 return{context,page,errors,external,calls:()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('TEST-socle-calls')||'[]'))};
}
(async()=>{
 browser=await chromium.launch({executablePath,args:['--no-sandbox']});
 const results=[];
 try{
  const f=await fixture('active-parent');
  try{
   await f.page.goto(origin+'/essai-stitch-v7/famille.html#members');await f.page.waitForFunction(()=>window.DobbyStitchV7?.ready&&window.DobbyAccess);
   await f.page.evaluate(({CHILD,PARENT})=>DobbyFamilyStitchEngine.evaluate('st.familyMembers=p.members;render();',{members:[{id:PARENT,name:'TEST Parent',memberCategory:'parent'},{id:CHILD,name:'TEST Enfant',memberCategory:'child',magicProfile:{version:1,houseId:'ravenclaw',patronusId:'otter'}}]}),{CHILD,PARENT});
   await f.page.evaluate(CHILD=>DobbyFamilyStitch.open('member-detail',{person:CHILD}),CHILD);
   const button=f.page.getByRole('button',{name:'Donner accès à DOBBY',exact:true});await button.waitFor();assert.equal(await button.isDisabled(),true);assert.equal(await button.getAttribute('data-backend-gate'),'child-account-link');
   assert.equal((await f.calls()).some(call=>/child|generic/.test(call.kind)),false);assert.deepEqual(f.errors,[]);
   results.push({case:'published child access stays disabled',status:'FIXTURE_PASS'});
  }finally{await f.context.close();}
  const linked=await fixture('child-invitation');
  try{
   await linked.page.goto(origin+'/?invite='+encodeURIComponent('child:'+TOKEN));await linked.page.getByRole('heading',{name:'Rejoindre un foyer',exact:true}).waitFor();
   await linked.page.getByRole('heading',{name:'TEST Foyer existant',exact:true}).waitFor();assert.equal(await linked.page.getByRole('button',{name:'Créer mon profil',exact:true}).count(),0);
   assert.equal(new URL(linked.page.url()).searchParams.has('invite'),false);
   await linked.page.getByRole('button',{name:'Rejoindre ce foyer',exact:true}).click();
   await linked.page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('TEST-socle-calls')||'[]').some(call=>call.kind==='childAccept'));
   const calls=await linked.calls();assert.equal(calls.filter(call=>call.kind==='childAccept').length,1);assert.equal(calls.find(call=>call.kind==='childAccept').memberId,CHILD);assert.equal(calls.find(call=>call.kind==='childPreview').token,TOKEN);assert.equal(calls.some(call=>['saveProfile','genericPreview','genericAccept'].includes(call.kind)),false);
   assert.deepEqual(linked.errors,[]);results.push({case:'typed child acceptance bypasses duplicate profile onboarding',status:'FIXTURE_PASS'});
  }finally{await linked.context.close();}
  const child=await fixture('active-child');
  try{
   await child.page.goto(origin+'/essai-stitch-v7/famille.html#access-profile?mode=edit');await child.page.getByRole('heading',{name:'Mon profil',exact:true}).waitFor();
   assert.equal(await child.page.getByRole('button',{name:'Enregistrer mon profil',exact:true}).count(),0);await child.page.getByText('Votre identité et votre portrait sont en lecture seule.',{exact:true}).waitFor();assert.deepEqual(child.errors,[]);
   results.push({case:'active child identity remains read-only',status:'FIXTURE_PASS'});
  }finally{await child.context.close();}
  console.log(JSON.stringify({scope:'local-fixtures-only',realAuthOrRlsVerified:false,results},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

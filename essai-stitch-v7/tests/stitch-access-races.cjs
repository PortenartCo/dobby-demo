/* Focused access regressions. Auth/account/invitation outcomes are explicitly
 * local UI fixtures; no live account, permission or Supabase certification. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8819';
const executablePath=process.env.CHROMIUM_PATH||'/workspace/scratch/chrome-ci156/chrome-linux64/chrome';
const results=[];
let browser;

async function fixture({phase='active',deferPreview=false,signInError=null}={}){
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'fr-BE',reducedMotion:'reduce'});
 const external=[];
 await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():(external.push(new URL(route.request().url()).origin),route.abort()));
 await context.addInitScript(({phase,deferPreview,signInError})=>{
  if(!location.pathname.endsWith('/essai-stitch-v5-famille/index.html'))return;
  const grants={canEdit:true,canMagic:true,canCreate:true,canManageDependents:true,canInvite:true};
  let restored={phase,configured:true,authenticated:true,userId:'TEST-ACCESS-OWNER',profile:{id:'TEST-CANONICAL-MEMBER',firstName:'TEST',lastName:'Access',avatarId:'portrait-9'},verified:phase==='active',pendingCeremony:false,permissions:grants,...(phase==='active'?{householdId:'TEST-ACCESS-HOUSEHOLD',memberId:'TEST-CANONICAL-MEMBER',familyRevision:1}:{})};
  // Mirror native access: synchronous state starts blank until refresh resolves.
  let state={phase:'signed-out',configured:true,authenticated:false,verified:false,userId:null};
  const listeners=new Set(),emit=()=>{for(const listener of listeners)listener({...state});return {...state};};
  window.__accessRace={calls:[],previewPending:false,releasePreview:null,refreshes:0};
  window.__accessRace.switchAccount=()=>{restored={...restored,userId:'TEST-ACCESS-OTHER',householdId:'TEST-OTHER-HOUSEHOLD',memberId:'TEST-OTHER-MEMBER',familyRevision:1,profile:{id:'TEST-OTHER-MEMBER',firstName:'TEST OTHER',lastName:'Other',avatarId:'portrait-2'}};state={...restored};return emit();};
  const invitation=token=>({status:'valid',household:{id:'TEST-HH-'+token,name:'TEST foyer '+token},inviter:{name:'TEST invitant'},expiresAt:'2099-11-12T12:00:00Z'});
  const access={ready:Promise.resolve(),state:()=>({...state}),subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},
   signIn:async()=>{window.__accessRace.calls.push({kind:'signIn'});throw Object.assign(Error('PRIVATE SERVER DETAIL private@example.test private-token'),signInError||{});},
   refresh:async()=>{window.__accessRace.refreshes++;state={...restored};return emit();},
   confirmFromURL:async()=>{window.__accessRace.calls.push({kind:'confirm'});throw Error('TEST expired PKCE confirmation');},
   saveProfile:async(values,options)=>{window.__accessRace.calls.push({kind:'saveProfile',userId:state.userId,values:{...values},options:{...options}});state={...state,profile:{...state.profile,...values}};return emit();},
   previewInvitation:async token=>{window.__accessRace.calls.push({kind:'preview',token});if(deferPreview){window.__accessRace.previewPending=true;await new Promise(resolve=>window.__accessRace.releasePreview=resolve);window.__accessRace.previewPending=false;}return invitation(token);},
   acceptInvitation:async token=>{window.__accessRace.calls.push({kind:'accept',token});throw Error('TEST acceptance deliberately stops before navigation');},
   createInvitation:async()=>{window.__accessRace.calls.push({kind:'create'});throw new TypeError('TEST network unavailable');}
  };
  let native;
  Object.defineProperty(window,'DobbyFamilyUI',{configurable:true,get:()=>native,set:api=>{native={...api,access,
   connectionState:()=>({...api.connectionState(),configured:true,verified:state.verified,identityVerified:state.verified,access:state.verified?'verified':'local',verifying:false}),
   getContext:()=>state.verified?{userId:state.userId,householdId:state.householdId,memberId:state.memberId,identityVerified:true,permissions:grants,familyRevision:1}:null
  };}});
 },{phase,deferPreview,signInError});
 const page=await context.newPage();page.setDefaultTimeout(6000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const load=async route=>{await page.goto(origin+'/essai-stitch-v7/famille.html#'+route);await page.waitForFunction(()=>window.DobbyStitchV7?.ready&&DobbyFamilyStitchEngine.win().DobbyFamilyUI.access.state().userId==='TEST-ACCESS-OWNER');};
 const native=code=>page.evaluate(code=>DobbyFamilyStitchEngine.evaluate(code),code);
 const seedMember=()=>native('st.familyMembers=[{id:"TEST-CANONICAL-MEMBER",name:"TEST Access",firstName:"TEST",lastName:"Access",memberCategory:"parent",magicProfile:{avatarId:"portrait-9",houseId:"ravenclaw",patronusId:"otter",ceremonyStatus:"complete"}}];save();');
 return{context,page,errors,external,load,native,seedMember};
}
async function check(name,options,action){
 if(process.env.DOBBY_ACCESS_CASE_PATTERN&&!new RegExp(process.env.DOBBY_ACCESS_CASE_PATTERN).test(name))return;
 const f=await fixture(options);
 try{await action(f);assert.deepEqual(f.errors,[],'No browser exception');assert.deepEqual(f.external.filter(url=>/supabase\.co|dobby[^/]*\.invalid/.test(url)),[],'No request to a live backend');results.push({name,status:'PASS'});console.log('PASS',name);}
 catch(error){results.push({name,status:'FAIL',message:error.message});console.error('FAIL',name,error.message);}
 finally{await f.context.close();}
}
(async()=>{
 browser=await chromium.launch({executablePath,args:['--no-sandbox']});
 console.log('BROWSER',browser.version(),'AUTH_FIXTURES_ONLY no live certification');
 try{
  for(const [name,error,expected] of [
   ['Auth refusal',{stage:'auth',status:401,code:'private-token'},/CONNEXION-401/],
   ['household refusal after Auth',{stage:'context',status:403,code:'42501'},/FOYER-403/],
   ['unconfirmed email',{stage:'auth',status:400,code:'email_not_confirmed'},/adresse e-mail.*confirmée.*CONNEXION-400-EMAIL/i],
   ['unrecognized credentials',{stage:'auth',status:400,code:'invalid_credentials'},/adresse e-mail ou le mot de passe.*CONNEXION-400-IDENTIFIANTS/i]
  ])await check('login displays safe diagnostic for '+name,{signInError:error},async({page,load,native})=>{
   await load('access-auth');
   await page.getByLabel('Adresse e-mail',{exact:true}).fill('fixture@example.test');
   await page.getByLabel('Mot de passe',{exact:true}).fill('fixture-password');
   await page.getByRole('button',{name:'Se connecter',exact:true}).click();
   await page.waitForFunction(()=>!DobbyAccess.busy);
   const message=await page.locator('[data-access-status]').innerText();
   assert.match(message,expected);
   assert.doesNotMatch(message,/PRIVATE|private@example|private-token|42501/);
   assert.equal(await page.getByLabel('Adresse e-mail',{exact:true}).inputValue(),'fixture@example.test');
   assert.equal(await page.getByRole('button',{name:'Se connecter',exact:true}).isEnabled(),true);
   assert.equal(await native('return window.__accessRace.calls.filter(row=>row.kind==="signIn").length;'),1);
  });
  await check('editing invitation B cannot install or accept delayed preview A',{phase:'household',deferPreview:true},async({page,load,native})=>{
   await load('access-join');const input=page.getByLabel('Code ou lien d’invitation',{exact:true});
   await input.fill('TEST-TOKEN-A');await page.getByRole('button',{name:'Vérifier l’invitation',exact:true}).click();
   await page.waitForFunction(()=>DobbyFamilyStitchEngine.win().__accessRace.previewPending);
   const locked=await input.isDisabled()||await input.getAttribute('readonly')!==null;
   if(!locked)await input.fill('TEST-TOKEN-B');
   await native('window.__accessRace.releasePreview();');await page.waitForFunction(()=>!DobbyAccess.busy);
   if(!locked){assert.equal(await input.inputValue(),'TEST-TOKEN-B');assert.equal(await page.getByRole('button',{name:'Rejoindre ce foyer',exact:true}).count(),0,'An edited token must not regain the old preview acceptance button');assert.doesNotMatch(await page.locator('[data-access-invitation]').innerText(),/TEST foyer TEST-TOKEN-A/);}
   else assert.equal(await input.isEnabled(),true,'The token unlocks after verification');
   assert.equal(await native('return window.__accessRace.calls.filter(row=>row.kind==="accept").length;'),0);
  });
  await check('actual Members invitation action opens native invitation creation',{},async({page,load,seedMember})=>{
   await load('members');await seedMember();await page.evaluate(()=>DobbyFamilyStitch.open('members'));
   await page.locator('#invite-member-btn').click();
   await page.getByRole('dialog',{name:'Inviter un proche',exact:true}).waitFor();
   await page.getByRole('button',{name:'Créer un lien d’invitation',exact:true}).waitFor();
  });
  await check('failed invitation creation has visible inline error outside access screen',{},async({page,load,native})=>{
   await load('members');await page.evaluate(()=>DobbyAccess.invite());
   const dialog=page.getByRole('dialog',{name:'Inviter un proche',exact:true});
   await dialog.getByRole('button',{name:'Créer un lien d’invitation',exact:true}).click();
   await page.waitForFunction(()=>!DobbyAccess.busy);
   assert.equal(await native('return window.__accessRace.calls.filter(row=>row.kind==="create").length;'),1);
   const error=dialog.locator('[role="status"],[role="alert"],[data-access-status]');
   assert.ok(await error.count(),'The modal needs its own visible error/status target');
   assert.ok(await error.first().isVisible());assert.match(await error.first().innerText(),/interrompue|connexion|réseau|réessay|confirmée/i);
  });
  await check('owner-bound invitation survives full reload and restored Auth refresh',{phase:'household'},async({page,load,native})=>{
   await load('access-join');await native('return DobbyFamilyUI.putMeta("v7-incoming-invitation",{token:"TEST-OWNER-INVITATION",userId:"TEST-ACCESS-OWNER"});');
   await page.evaluate(()=>history.replaceState(null,'','#access'));await page.reload();
   await page.waitForFunction(()=>window.DobbyStitchV7?.ready&&!DobbyAccess.busy&&document.body.dataset.familyView!=='access');
   assert.ok(await native('return window.__accessRace.refreshes;')>0,'The native-style fixture restores Auth through refresh after reload');
   assert.equal(await page.evaluate(()=>document.body.dataset.familyView),'access-join','Restored owner sees its pending invitation, not create-household');
   assert.equal(await page.getByLabel('Code ou lien d’invitation',{exact:true}).inputValue(),'TEST-OWNER-INVITATION');
  });
  await check('personal profile edit action opens fused identity and portrait form',{},async({page,load,seedMember})=>{
   await load('members');await seedMember();
   await page.locator('[data-e01-account]').click();
   await page.getByRole('button',{name:'Modifier les informations personnelles',exact:true}).click();
   await page.getByRole('heading',{name:'Mon profil',exact:true}).waitFor();
   assert.equal(await page.getByLabel('Prénom',{exact:true}).inputValue(),'TEST');
   assert.ok(await page.locator('[data-access-avatar]').count()>=8,'The same form exposes the native portrait gallery');
  });
  await check('failed PKCE confirmation preserves invitation belonging to restored Auth owner',{phase:'household'},async({page,load,native})=>{
   await load('access-join');
   await native('return DobbyFamilyUI.putMeta("v7-incoming-invitation",{token:"TEST-PKCE-OWNER-INVITATION",userId:"TEST-ACCESS-OWNER"});');
   await page.goto(origin+'/essai-stitch-v7/famille.html?code=TEST-EXPIRED-CODE&dobby_flow=TEST-EXPIRED-FLOW#access');
   await page.waitForFunction(()=>window.DobbyStitchV7?.ready&&document.body.dataset.familyView==='access-auth');
   assert.equal(new URL(page.url()).search,'','Failed callback inputs are removed from the visible URL');
   assert.equal(await native('return window.__accessRace.calls.filter(row=>row.kind==="confirm").length;'),1,'The fixture takes the failed PKCE confirmation path');
   const pending=await native('return DobbyFamilyUI.meta("v7-incoming-invitation");');
   assert.equal(pending?.token,'TEST-PKCE-OWNER-INVITATION','An expired callback must not delete the restored owner\'s pending invitation');
   assert.ok(await native('return window.__accessRace.refreshes;')>0,'Failed PKCE confirmation refreshes native Auth before comparing invitation ownership');
  });
  await check('direct account A to B switch cannot save A rendered profile draft into B',{},async({page,load,native,seedMember})=>{
   await load('members');await seedMember();await page.locator('[data-e01-account]').click();
   await page.getByRole('button',{name:'Modifier les informations personnelles',exact:true}).click();
   await page.getByRole('heading',{name:'Mon profil',exact:true}).waitFor();
   await page.getByLabel('Prénom',{exact:true}).fill('TEST A unsaved identity');
   await native('window.__accessRace.switchAccount();');
   // A correct implementation may redirect, clear the draft, or keep a disabled
   // form with an error. Only submit if the old editable form still exists.
   const submit=page.getByRole('button',{name:'Enregistrer mon profil',exact:true});
   if(await submit.count()&&await submit.isVisible()&&await submit.isEnabled())await submit.click();
   await page.waitForFunction(()=>!window.DobbyAccess?.busy);
   const writes=await native('return window.__accessRace.calls.filter(row=>row.kind==="saveProfile");');
   assert.equal(writes.filter(row=>row.userId==='TEST-ACCESS-OTHER'&&row.values.firstName==='TEST A unsaved identity').length,0,'Equal family revisions must not allow account A\'s draft to overwrite account B\'s profile');
  });
 }finally{await browser.close();}
 console.log(JSON.stringify({liveBackend:false,results},null,2));
 if(results.some(row=>row.status==='FAIL'))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});

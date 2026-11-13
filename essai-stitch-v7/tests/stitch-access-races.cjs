/* Focused access regressions. Auth/account/invitation outcomes are explicitly
 * local UI fixtures; no live account, permission or Supabase certification.
 * Positive active DTOs mirror dobby_v7_context: matching profile.id/memberId,
 * canonical memberCategory and the existing server permission fixture. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8819';
const executablePath=process.env.CHROMIUM_PATH||'/workspace/scratch/chrome-ci156/chrome-linux64/chrome';
const results=[];
let browser;

async function fixture({phase='active',deferPreview=false,signInError=null,previewInvalid=false,acceptCommittedFailure=false,deferLogout=false}={}){
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'fr-BE',reducedMotion:'reduce'});
 const external=[];
 await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():(external.push(new URL(route.request().url()).origin),route.abort()));
 await context.addInitScript(({phase,deferPreview,signInError,previewInvalid,acceptCommittedFailure,deferLogout})=>{
  if(!location.pathname.endsWith('/essai-stitch-v5-famille/index.html'))return;
  const grants={canEdit:true,canMagic:true,canCreate:true,canManageDependents:true,canInvite:true};
  const active=()=>({phase:'active',configured:true,authenticated:true,verified:true,userId:'TEST-ACCESS-OWNER',householdId:'TEST-ACCESS-HOUSEHOLD',memberId:'TEST-CANONICAL-MEMBER',familyRevision:1,profile:{id:'TEST-CANONICAL-MEMBER',memberCategory:'parent',firstName:'TEST',lastName:'Access',avatarId:'portrait-9'},pendingCeremony:true,permissions:grants});
  let restored=JSON.parse(sessionStorage.getItem('dobby-test-restored-access')||'null')||{phase,configured:true,authenticated:phase!=='unavailable',userId:'TEST-ACCESS-OWNER',profile:{id:'TEST-CANONICAL-MEMBER',...(phase==='active'?{memberCategory:'parent'}:{}),firstName:'TEST',lastName:'Access',avatarId:'portrait-9'},verified:phase==='active',pendingCeremony:false,permissions:grants,...(phase==='active'?{householdId:'TEST-ACCESS-HOUSEHOLD',memberId:'TEST-CANONICAL-MEMBER',familyRevision:1}:{})};
  // Mirror native access: synchronous state starts blank until refresh resolves.
  let state={phase:'signed-out',configured:true,authenticated:false,verified:false,userId:null};
  const listeners=new Set(),emit=()=>{for(const listener of listeners)listener({...state});return {...state};};
  window.__accessRace={calls:[],previewPending:false,releasePreview:null,refreshes:0,recoveryArmed:false,recoveryPending:false,releaseRecovery:null,pauseCas:false,casPending:false,releaseCas:null,consumed:false,metadataReadReplacements:0,logoutPending:false,releaseLogout:null};
  const record=call=>{window.__accessRace.calls.push(call);const history=JSON.parse(sessionStorage.getItem('dobby-test-access-calls')||'[]');history.push(call);sessionStorage.setItem('dobby-test-access-calls',JSON.stringify(history));};
  window.__accessRace.armRecovery=({phase='active',verified=phase==='active',defer=false,pendingCeremony=true}={})=>{window.__accessRace.recoveryArmed={phase,verified,defer,pendingCeremony,userId:state.userId};};
  window.__accessRace.switchAccount=(overrides={})=>{restored={...restored,userId:'TEST-ACCESS-OTHER',householdId:'TEST-OTHER-HOUSEHOLD',memberId:'TEST-OTHER-MEMBER',familyRevision:1,profile:{id:'TEST-OTHER-MEMBER',memberCategory:'parent',firstName:'TEST OTHER',lastName:'Other',avatarId:'portrait-2'},...overrides};sessionStorage.setItem('dobby-test-restored-access',JSON.stringify(restored));state={...restored};return emit();};
  const invitation=token=>({status:'valid',household:{id:'TEST-HH-'+token,name:'TEST foyer '+token},inviter:{name:'TEST invitant'},expiresAt:'2099-11-12T12:00:00Z'});
  const access={ready:Promise.resolve(),state:()=>({...state}),subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},
   signIn:async()=>{record({kind:'signIn'});throw Object.assign(Error('PRIVATE SERVER DETAIL private@example.test private-token'),signInError||{});},
   refresh:async()=>{window.__accessRace.refreshes++;const recovery=window.__accessRace.recoveryArmed;record({kind:'refresh',recovery:!!recovery});if(recovery){window.__accessRace.recoveryArmed=false;if(recovery.defer){window.__accessRace.recoveryPending=true;await new Promise(resolve=>window.__accessRace.releaseRecovery=resolve);window.__accessRace.recoveryPending=false;}if(state.userId===recovery.userId){restored={...active(),phase:recovery.phase,verified:recovery.verified,authenticated:recovery.phase!=='unavailable',pendingCeremony:recovery.pendingCeremony,...(recovery.phase==='active'?{}:{householdId:null,memberId:null})};state={...restored};}}else state={...restored};return emit();},
   confirmFromURL:async()=>{record({kind:'confirm'});throw Error('TEST expired PKCE confirmation');},
   saveProfile:async(values,options)=>{record({kind:'saveProfile',userId:state.userId,values:{...values},options:{...options}});state={...state,profile:{...state.profile,...values}};return emit();},
   previewInvitation:async token=>{record({kind:'preview',token});if(deferPreview){window.__accessRace.previewPending=true;await new Promise(resolve=>window.__accessRace.releasePreview=resolve);window.__accessRace.previewPending=false;}return previewInvalid||window.__accessRace.consumed?{status:'invalid'}:invitation(token);},
   acceptInvitation:async token=>{record({kind:'accept',token});if(acceptCommittedFailure){window.__accessRace.consumed=true;restored=active();state={phase:'unavailable',configured:true,userId:'TEST-ACCESS-OWNER',authenticated:false,verified:false};emit();throw Error('TEST server accepted; first native adoption failed');}throw Error('TEST acceptance deliberately stops before navigation');},
   logout:async()=>{record({kind:'logout'});if(deferLogout){window.__accessRace.logoutPending=true;await new Promise(resolve=>window.__accessRace.releaseLogout=resolve);window.__accessRace.logoutPending=false;}restored={phase:'signed-out',configured:true,authenticated:false,verified:false,userId:null,householdId:null,memberId:null,profile:null,permissions:{},pendingCeremony:false};sessionStorage.setItem('dobby-test-restored-access',JSON.stringify(restored));state={...restored};return emit();},
   createInvitation:async()=>{record({kind:'create'});throw new TypeError('TEST network unavailable');}
  };
  let native;
  Object.defineProperty(window,'DobbyFamilyUI',{configurable:true,get:()=>native,set:api=>{native={...api,access,
   connectionState:()=>({...api.connectionState(),configured:true,verified:state.verified,identityVerified:state.verified,access:state.verified?'verified':'local',verifying:false}),
   getContext:()=>state.verified?{userId:state.userId,householdId:state.householdId,memberId:state.memberId,identityVerified:true,permissions:grants,familyRevision:1}:null,
   meta:async key=>{const saved=await api.meta(key),replacement=sessionStorage.getItem('dobby-test-replace-invitation-after-read');if(key==='v7-incoming-invitation'&&replacement){sessionStorage.removeItem('dobby-test-replace-invitation-after-read');await api.putMeta(key,JSON.parse(replacement));window.__accessRace.metadataReadReplacements++;}return saved;},
   updateMeta:async(key,change)=>{if(key==='v7-incoming-invitation'&&window.__accessRace.pauseCas){window.__accessRace.pauseCas=false;window.__accessRace.casPending=true;await new Promise(resolve=>window.__accessRace.releaseCas=resolve);window.__accessRace.casPending=false;}return api.updateMeta(key,change);}
  };}});
 },{phase,deferPreview,signInError,previewInvalid,acceptCommittedFailure,deferLogout});
 const page=await context.newPage();page.setDefaultTimeout(6000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const load=async route=>{await page.goto(origin+'/essai-stitch-v7/famille.html#'+route);await page.waitForFunction(()=>window.DobbyStitchV7?.ready&&DobbyFamilyStitchEngine.win().DobbyFamilyUI.access.state().userId==='TEST-ACCESS-OWNER');};
 const native=code=>page.evaluate(code=>DobbyFamilyStitchEngine.evaluate(code),code);
 const seedMember=()=>native('st.familyMembers=[{id:"TEST-CANONICAL-MEMBER",name:"TEST Access",firstName:"TEST",lastName:"Access",memberCategory:"parent",magicProfile:{avatarId:"portrait-9",houseId:"ravenclaw",patronusId:"otter",ceremonyStatus:"complete"}}];save();');
 const calls=()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('dobby-test-access-calls')||'[]'));
 return{context,page,errors,external,load,native,seedMember,calls};
}

async function invalidInvitation({page,load,native},token='TEST-RECOVERY-INVITATION'){
 await load('access-join');await page.getByLabel('Code ou lien d’invitation',{exact:true}).fill(token);
 await page.getByRole('button',{name:'Vérifier l’invitation',exact:true}).click();await page.waitForFunction(()=>!DobbyAccess.busy);
 await page.locator('[data-access-invitation][data-invitation-state=invalid]').waitFor();
 assert.deepEqual(await native('return DobbyFamilyUI.meta("v7-incoming-invitation");'),{token,userId:'TEST-ACCESS-OWNER'});
 return token;
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
  await check('committed invitation with failed native adoption resumes through one refresh without replay',{phase:'household',acceptCommittedFailure:true},async f=>{
   const {page,load,native,calls}=f,token='TEST-RECOVERY-CONSUMED';
   await load('access-join');await page.getByLabel('Code ou lien d’invitation',{exact:true}).fill(token);
   await page.getByRole('button',{name:'Vérifier l’invitation',exact:true}).click();await page.waitForFunction(()=>!DobbyAccess.busy);
   await page.getByRole('button',{name:'Rejoindre ce foyer',exact:true}).click();await page.waitForFunction(()=>!DobbyAccess.busy);
   assert.deepEqual(await native('const s=DobbyFamilyUI.access.state();return {phase:s.phase,userId:s.userId,authenticated:s.authenticated,verified:s.verified};'),{phase:'unavailable',userId:'TEST-ACCESS-OWNER',authenticated:false,verified:false});
   await page.getByRole('button',{name:'Vérifier l’invitation',exact:true}).click();await page.waitForFunction(()=>!DobbyAccess.busy);
   await page.locator('[data-access-invitation][data-invitation-state=invalid]').waitFor();
   await native('window.__accessRace.armRecovery();');
   await page.getByRole('button',{name:'Vérifier mon accès au foyer',exact:true}).click();
   await page.waitForURL(url=>url.pathname.endsWith('/traverse.html'));
   const history=await calls();assert.equal(history.filter(row=>row.kind==='accept').length,1,'Acceptance is never replayed after the server consumed the token');
   assert.equal(history.filter(row=>row.kind==='refresh'&&row.recovery).length,1,'Recovery performs one fresh access check');
   await page.waitForFunction(()=>window.DobbyFamilyStitchEngine?.win()?.DobbyFamilyUI?.connectionState?.().ready);
   assert.equal(await native('return DobbyFamilyUI.meta("v7-incoming-invitation");'),null,'Only the recovered owner token is cleared');
  });
  await check('already verified account can leave an invalid invitation for its existing household',{previewInvalid:true},async f=>{
   const {page,native,calls,seedMember}=f;await invalidInvitation(f);await seedMember();
   await native('window.__accessRace.armRecovery({pendingCeremony:false});');
   await page.getByRole('button',{name:'Accéder à mon foyer',exact:true}).click();
   await page.waitForURL(url=>url.hash.startsWith('#onboarding-ritual'));
   assert.equal(await native('return DobbyFamilyUI.meta("v7-incoming-invitation");'),null);
   const history=await calls();assert.equal(history.filter(row=>row.kind==='refresh'&&row.recovery).length,1);assert.equal(history.filter(row=>row.kind==='accept').length,0);
  });
  for(const target of [{phase:'profile'},{phase:'household'},{phase:'unavailable'},{phase:'active',verified:false}])await check('invitation recovery preserves pending token when refreshed '+target.phase+(target.verified===false?' is unverified':''),{phase:'unavailable',previewInvalid:true},async f=>{
   const {page,native,calls}=f,token=await invalidInvitation(f),before=page.url();
   await native('window.__accessRace.armRecovery('+JSON.stringify(target)+');');
   await page.getByRole('button',{name:'Vérifier mon accès au foyer',exact:true}).click();await page.waitForFunction(()=>!DobbyAccess.busy);
   assert.equal(page.url(),before,'Incomplete identity cannot navigate to the household');
   assert.deepEqual(await native('return DobbyFamilyUI.meta("v7-incoming-invitation");'),{token,userId:'TEST-ACCESS-OWNER'});
   const history=await calls();assert.equal(history.filter(row=>row.kind==='refresh'&&row.recovery).length,1);assert.equal(history.filter(row=>row.kind==='accept').length,0);
  });
  for(const replacement of [{token:'TEST-RECOVERY-INVITATION',userId:'TEST-ACCESS-OTHER'},{token:'TEST-NEWER-INVITATION',userId:'TEST-ACCESS-OWNER'}])await check('invitation recovery CAS preserves '+(replacement.userId==='TEST-ACCESS-OTHER'?'same token of another owner':'newer token of same owner'),{phase:'unavailable',previewInvalid:true},async f=>{
   const {page,native,calls}=f;await invalidInvitation(f);const before=page.url();
   await native('window.__accessRace.armRecovery();window.__accessRace.pauseCas=true;');
   await page.getByRole('button',{name:'Vérifier mon accès au foyer',exact:true}).click();
   await page.waitForFunction(()=>DobbyFamilyStitchEngine.win().__accessRace.casPending);
   await native('return DobbyFamilyUI.putMeta("v7-incoming-invitation",'+JSON.stringify(replacement)+');');
   await native('window.__accessRace.releaseCas();');await page.waitForFunction(()=>!DobbyAccess.busy);
   assert.equal(page.url(),before,'A superseded invitation cannot authorize navigation');
   assert.deepEqual(await native('return DobbyFamilyUI.meta("v7-incoming-invitation");'),replacement);
   assert.equal((await calls()).filter(row=>row.kind==='accept').length,0);
  });
  for(const boundary of ['refresh','CAS'])await check('account switch during invitation recovery '+boundary+' preserves new owner token and blocks navigation',{phase:'unavailable',previewInvalid:true},async f=>{
   const {page,native,calls}=f;await invalidInvitation(f);const replacement={token:'TEST-OTHER-OWNER-INVITATION',userId:'TEST-ACCESS-OTHER'};
   await native(boundary==='refresh'?'window.__accessRace.armRecovery({defer:true});':'window.__accessRace.armRecovery();window.__accessRace.pauseCas=true;');
   await page.getByRole('button',{name:'Vérifier mon accès au foyer',exact:true}).click();
   await page.waitForFunction(boundary=>DobbyFamilyStitchEngine.win().__accessRace[boundary==='refresh'?'recoveryPending':'casPending'],boundary);
   await native('return DobbyFamilyUI.putMeta("v7-incoming-invitation",'+JSON.stringify(replacement)+');');
   // Native session installation withdraws member/household authority before
   // the replacement account has completed its own server verification.
   await native('window.__accessRace.switchAccount({phase:"unavailable",authenticated:false,verified:false,householdId:null,memberId:null});window.__accessRace.'+(boundary==='refresh'?'releaseRecovery':'releaseCas')+'();');
   await page.waitForFunction(()=>!window.DobbyAccess?.busy&&window.DobbyFamilyStitchEngine?.win()?.DobbyFamilyUI?.access?.state()?.userId==='TEST-ACCESS-OTHER');
   const after=new URL(page.url());assert.ok(after.pathname.endsWith('/famille.html')&&after.hash.startsWith('#access'),'Account changes may redirect to safe access, never Traverse or the earlier owner ritual: '+after.href);
   assert.deepEqual(await native('return DobbyFamilyUI.meta("v7-incoming-invitation");'),replacement);
   assert.equal((await calls()).filter(row=>row.kind==='accept').length,0);
  });
  await check('valid invitation for another household keeps the explicit acceptance path',{},async({page,load,native,calls})=>{
   await load('access-join');await page.getByLabel('Code ou lien d’invitation',{exact:true}).fill('TEST-OTHER-HOUSEHOLD-INVITATION');
   await page.getByRole('button',{name:'Vérifier l’invitation',exact:true}).click();await page.waitForFunction(()=>!DobbyAccess.busy);
   await page.getByRole('button',{name:'Rejoindre ce foyer',exact:true}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Accéder à mon foyer',exact:true}).count(),0);
   assert.equal(await page.getByRole('button',{name:'Vérifier mon accès au foyer',exact:true}).count(),0);
   assert.deepEqual(await native('return DobbyFamilyUI.meta("v7-incoming-invitation");'),{token:'TEST-OTHER-HOUSEHOLD-INVITATION',userId:'TEST-ACCESS-OWNER'});
   assert.equal((await calls()).filter(row=>row.kind==='accept').length,0);
  });
  await check('initialization stale owner cleanup preserves a newer current owner invitation',{phase:'household'},async({page,load,native})=>{
   await load('access-join');
   const newer={token:'TEST-INITIALIZE-NEWER-INVITATION',userId:'TEST-ACCESS-OWNER'};
   await native('return DobbyFamilyUI.putMeta("v7-incoming-invitation",{token:"TEST-INITIALIZE-OTHER-INVITATION",userId:"TEST-ACCESS-OTHER"});');
   await native('sessionStorage.setItem("dobby-test-replace-invitation-after-read",'+JSON.stringify(JSON.stringify(newer))+');');
   await page.evaluate(()=>history.replaceState(null,'','#access'));await page.reload();
   await page.waitForFunction(()=>window.DobbyStitchV7?.ready&&!window.DobbyAccess?.busy&&document.body.dataset.familyView!=='access');
   assert.equal(await native('return window.__accessRace.metadataReadReplacements;'),1,'The newer pointer is committed after the stale initialization read');
   assert.deepEqual(await native('return DobbyFamilyUI.meta("v7-incoming-invitation");'),newer,'Initialization may clear only the stale token and owner it actually read');
  });
  for(const phase of ['active','unavailable'])await check('visible account logout works for '+(phase==='active'?'verified member':'unverified native user')+' and preserves cached family',{phase},async({page,load,native,seedMember,calls})=>{
   await load('members');await seedMember();const cached=await native('return st.familyMembers;');
   await page.locator('[data-e01-account]').click();await page.getByRole('heading',{name:'Profil magique',exact:true}).waitFor();
   const logout=page.getByRole('button',{name:'Se déconnecter',exact:true});
   await logout.waitFor();await page.evaluate(()=>scrollTo(0,0));
   assert.equal(await logout.isEnabled(),true,'A native user may sign out even while household identity is unverified');
   const position=await logout.evaluate(el=>{const r=el.getBoundingClientRect();return {hiddenDetails:!!el.closest('details:not([open])'),top:r.top,bottom:r.bottom,height:innerHeight};});
   assert.ok(!position.hiddenDetails&&position.top>=0&&position.bottom<=position.height,'Logout is visible at the top without opening settings: '+JSON.stringify(position));
   await logout.click();await page.getByRole('heading',{name:'Bienvenue dans DOBBY',exact:true}).waitFor();
   assert.equal((await calls()).filter(row=>row.kind==='logout').length,1,'The visible action calls the native account logout once');
   assert.deepEqual(await native('const s=DobbyFamilyUI.access.state();return {phase:s.phase,userId:s.userId,verified:s.verified,permissions:s.permissions};'),{phase:'signed-out',userId:null,verified:false,permissions:{}});
   assert.equal(await native('return DobbyFamilyUI.connectionState().identityVerified;'),false);
   assert.equal(await native('return DobbyFamilyUI.getContext();'),null);
   assert.deepEqual(await native('return st.familyMembers;'),cached,'Signing out must preserve cached member identities and magical choices');
  });
  await check('deferred account logout serializes repeated activation and keeps cached members',{deferLogout:true},async({page,load,native,seedMember,calls})=>{
   await load('members');await seedMember();const cached=await native('return st.familyMembers;');
   await page.locator('[data-e01-account]').click();await page.getByRole('heading',{name:'Profil magique',exact:true}).waitFor();
   const logout=page.getByRole('button',{name:'Se déconnecter',exact:true});await logout.click();
   await page.waitForFunction(()=>DobbyFamilyStitchEngine.win().__accessRace.logoutPending);
   assert.equal(await logout.isDisabled(),true,'Logout locks its visible action while the native operation is pending');
   await logout.evaluate(el=>{el.dispatchEvent(new MouseEvent('click',{bubbles:true}));el.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
   assert.equal((await calls()).filter(row=>row.kind==='logout').length,1,'Repeated handlers must share one pending logout operation');
   assert.deepEqual(await native('return st.familyMembers;'),cached);
   await native('window.__accessRace.releaseLogout();');
   await page.getByRole('heading',{name:'Bienvenue dans DOBBY',exact:true}).waitFor();
   assert.equal((await calls()).filter(row=>row.kind==='logout').length,1);
   assert.deepEqual(await native('return st.familyMembers;'),cached);
  });
 }finally{await browser.close();}
 console.log(JSON.stringify({liveBackend:false,results},null,2));
 if(results.some(row=>row.status==='FAIL'))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});

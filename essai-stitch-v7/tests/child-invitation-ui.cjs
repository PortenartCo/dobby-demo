/* Browser fixture for the native invitation entry and Auth callback routing. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8781';
const childId='existing-child:07',token='fixture-targeted-invitation';

async function run(browser,{width,startsWithParent=false}){
 const context=await browser.newContext({viewport:{width,height:900},locale:'fr-BE'});
 try{
  await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  await context.addInitScript(({childId,token,startsWithParent})=>{
   if(!location.pathname.endsWith('/essai-stitch-v5-famille/index.html'))return;
   const signedOut={phase:'signed-out',configured:true,authenticated:false,verified:false};
   const parent={...signedOut,phase:'active',authenticated:true,verified:true,userId:'fixture-auth-parent',householdId:'fixture-family',memberId:'fixture-parent',profile:{id:'fixture-parent',memberCategory:'parent'}};
   const child={...signedOut,phase:'profile',authenticated:true,userId:'fixture-auth-child'};
   let state=JSON.parse(sessionStorage.getItem('fixture-child-auth'))||(startsWithParent?parent:signedOut);
   const listeners=new Set();
   const publish=next=>{state=next;sessionStorage.setItem('fixture-child-auth',JSON.stringify(state));for(const listener of listeners)listener(state);return state;};
   const record=(kind,details={})=>{
    const calls=JSON.parse(sessionStorage.getItem('fixture-child-calls')||'[]');
    sessionStorage.setItem('fixture-child-calls',JSON.stringify([...calls,{kind,...details}]));
   };
   const access={ready:Promise.resolve(),state:()=>({...state}),refresh:async()=>({...state}),
    subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},
    async signUp(email,_password,{redirectTo}){record('signup',{email,redirectTo});return publish({...signedOut,phase:'email-confirmation'});},
    async confirmFromURL(url){record('callback',{url});return publish(child);},
    async signIn(email){record('login',{email});return publish(child);},
    async logout(){record('logout');return publish(signedOut);},
    async previewChildInvitation(reference){return reference===token?{status:'valid',kind:'child-account',targetMemberId:childId,household:{id:'fixture-family',name:'Foyer de test'},inviter:{name:'Parent du foyer'},expiresAt:'2099-11-23T00:00:00Z'}:{status:'invalid'};},
    async acceptChildInvitation(reference){
     if(reference!==token||state.userId!==child.userId)throw Error('Fixture child only');
     record('accept',{memberId:childId});
     return publish({...child,phase:'active',verified:true,householdId:'fixture-family',memberId:childId,profile:{id:childId,memberCategory:'child'}});
    },
    async saveProfile(){record('unexpected-profile');throw Error('Fixture child already exists');}
   };
   let native;
   Object.defineProperty(window,'DobbyFamilyUI',{configurable:true,get:()=>native,set:api=>{native={...api,access};}});
  },{childId,token,startsWithParent});
  const page=await context.newPage();page.setDefaultTimeout(20000);
  const button=name=>page.getByRole('button',{name,exact:true});
  await page.goto(origin+'/?invite='+encodeURIComponent('child:'+token));
  await page.getByRole('heading',{name:'Foyer de test',exact:true}).waitFor();
  assert.doesNotMatch(page.url(),/invite=|fixture-targeted/);
  assert.equal(await button('Créer un nouveau foyer').count(),0);
  if(startsWithParent){
   assert.equal(await button('Rejoindre ce foyer').count(),0);
   await page.evaluate(()=>DobbyFamilyStitch.open('access-auth',{mode:'signup'}));
   await button('Se déconnecter pour changer de compte').click();
  }
  await button('Créer mon compte pour rejoindre').waitFor();
  await button('Me connecter pour rejoindre').waitFor();
  await button(startsWithParent?'Me connecter pour rejoindre':'Créer mon compte pour rejoindre').click();
  const email='enfant-fixture@example.test';
  await page.getByLabel('Adresse e-mail',{exact:true}).fill(email);
  await page.getByLabel('Mot de passe',{exact:true}).fill('fixture-password-only');
  if(startsWithParent){await button('Se connecter').click();}
  else{
   await page.getByLabel('Confirmer le mot de passe',{exact:true}).fill('fixture-password-only');
   await button('Créer mon compte').click();
   await page.getByRole('heading',{name:'Consultez votre messagerie',exact:true}).waitFor();
   await page.goto(origin+'/?code=fixture-confirmation');
  }
  await button('Rejoindre ce foyer').waitFor();
  assert.equal(await page.getByRole('heading',{name:'Mon profil',exact:true}).count(),0);
  assert.equal(await button('Créer mon profil').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
  await button('Rejoindre ce foyer').click();
  await page.waitForURL('**/essai-stitch-v7/traverse.html');
  const calls=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('fixture-child-calls')));
  assert.deepEqual(calls,startsWithParent?[
   {kind:'logout'},{kind:'login',email},{kind:'accept',memberId:childId}
  ]:[
   {kind:'signup',email,redirectTo:origin+'/'},{kind:'callback',url:origin+'/?code=fixture-confirmation#access'},{kind:'accept',memberId:childId}
  ]);
  console.log('CHILD_INVITATION_UI_PASS',width,startsWithParent?'shared device and login':'registration and callback');
 }finally{await context.close();}
}

async function parentLifecycle(browser){
 const context=await browser.newContext({viewport:{width:390,height:900},locale:'fr-BE'});
 try{
  await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  const page=await context.newPage();page.setDefaultTimeout(20000);
  const button=name=>page.getByRole('button',{name,exact:true});
  await page.goto(origin+'/essai-stitch-v7/famille.html');
  await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);
  await page.evaluate(({childId,token})=>{
   const engine=DobbyFamilyStitchEngine,frame=engine.win(),native=frame.DobbyFamilyUI,actorId='fixture-parent';
   const permissions={canEdit:true,canMagic:true,canInvite:true,canManageHousehold:true,canLinkExistingChild:true,familyRolesVerified:true};
   const bound={phase:'active',verified:true,identityVerified:true,authenticated:true,userId:'fixture-auth-parent',householdId:'fixture-family',memberId:actorId,profile:{id:actorId,memberCategory:'parent'},permissions,capabilities:{childAccountLinkReady:true,familyRolesReady:true,childAccessProtocol:1}};
   window.fixtureLifecycle={linked:false,active:false,calls:[]};
   frame.DobbyFamilyUI={...native,connectionState:()=>({...bound,access:'verified',ready:true,configured:true}),getContext:()=>bound,
    access:{...native.access,state:()=>bound,refresh:async()=>bound,
     async childAccessStatus(id){if(id!==childId)throw Error('Unexpected profile');return {linked:fixtureLifecycle.linked,active:fixtureLifecycle.active};},
     async suspendChildAccess(id){if(id!==childId||!fixtureLifecycle.active)throw Error('Unexpected suspension');fixtureLifecycle.calls.push(['suspend',id]);fixtureLifecycle.active=false;return {linked:true,active:false};},
     async createChildInvitation({memberId}){if(memberId!==childId)throw Error('Unexpected invitation');fixtureLifecycle.calls.push(['invite',memberId]);return {token,household:{name:'Foyer de test'}};}
    }};
   engine.evaluate('st.familyMembers=p.members;',{members:[{id:actorId,name:'Parent du foyer',memberCategory:'parent'},{id:childId,name:'Fiche enfant existante',memberCategory:'child'}]});
   return DobbyFamilyStitch.open('member-detail',{person:childId});
  },{childId,token});
  await button('Donner accès à DOBBY').click();
  await button('Créer un lien d’invitation').click();
  const link=page.getByRole('textbox',{name:'Lien personnel d’invitation'});
  await link.waitFor();
  assert.equal(new URL(await link.inputValue()).searchParams.get('invite'),'child:'+token);
  await button('Fermer').click();
  await page.evaluate(childId=>{Object.assign(fixtureLifecycle,{linked:true,active:true});return DobbyFamilyStitch.open('member-detail',{person:childId});},childId);
  await button('Suspendre l’accès à DOBBY').click();
  await button('Confirmer la suspension').waitFor();
  assert.equal(await page.evaluate(()=>fixtureLifecycle.active),true);
  await button('Annuler').click();
  await button('Suspendre l’accès à DOBBY').click();
  await button('Confirmer la suspension').click();
  await page.getByText('Accès suspendu. La fiche et son historique sont conservés.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Fiche enfant existante',exact:true}).count(),1);
  assert.equal(await button('Donner accès à DOBBY').count(),0);
  assert.deepEqual(await page.evaluate(()=>fixtureLifecycle.calls),[['invite',childId],['suspend',childId]]);
  console.log('CHILD_INVITATION_UI_PASS parent invitation and suspension');
 }finally{await context.close();}
}

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const width of [320,390,1440])await run(browser,{width,startsWithParent:width===390});await parentLifecycle(browser);}
 finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

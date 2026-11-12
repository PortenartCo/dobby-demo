/* Canonical root and callback forwarding. Auth outcomes are local UI fixtures;
 * this does not certify an external redirect allowlist or live family accounts. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8819';
const executablePath=process.env.CHROMIUM_PATH||'/workspace/scratch/chrome-ci156/chrome-linux64/chrome';
const results=[];
let browser;

async function check(name,{suffix='',session=false}={},verify){
 if(process.env.DOBBY_ROOT_CASE_PATTERN&&!new RegExp(process.env.DOBBY_ROOT_CASE_PATTERN).test(name))return;
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'fr-BE',reducedMotion:'reduce'});
 const external=[];
 await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():(external.push(new URL(route.request().url()).origin),route.abort()));
 await context.addInitScript(({session})=>{
  if(!location.pathname.endsWith('/essai-stitch-v5-famille/index.html'))return;
  const blank={phase:'signed-out',configured:true,authenticated:false,verified:false,userId:null};
  const active={phase:'active',configured:true,authenticated:true,verified:true,userId:'TEST-ROOT-ACCOUNT',householdId:'TEST-ROOT-HOUSEHOLD',memberId:'TEST-ROOT-MEMBER',profile:{id:'TEST-ROOT-MEMBER',firstName:'TEST',lastName:'Root',avatarId:'portrait-1'},permissions:{canEdit:true},pendingCeremony:false,familyRevision:1};
  let state={...blank};
  window.__rootEntry={calls:[],refreshes:0};
  const access={ready:Promise.resolve(),state:()=>({...state}),subscribe:()=>()=>{},
   refresh:async()=>{window.__rootEntry.refreshes++;state={...(session?active:blank)};return{...state};},
   signUp:async()=>{window.__rootEntry.calls.push({kind:'signup'});state={...active,phase:'profile',verified:false,householdId:null,memberId:null};return{...state};},
   updatePassword:async()=>{window.__rootEntry.calls.push({kind:'password'});return{...state};},
   confirmFromURL:async value=>{const input=new URL(value);window.__rootEntry.calls.push({kind:'confirm',url:value});state={...active,phase:'profile',verified:false,householdId:null,memberId:null};return{...state,recovery:input.searchParams.get('type')==='recovery'};}
  };
  let native;
  Object.defineProperty(window,'DobbyFamilyUI',{configurable:true,get:()=>native,set:api=>{native={...api,access};}});
 },{session});
 const page=await context.newPage();page.setDefaultTimeout(8000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const assetReferrers=[];page.on('request',request=>{if(request.url().startsWith(origin+'/')&&request.resourceType()!=='document')assetReferrers.push(request.headers().referer||'');});
 try{
  await page.goto(origin+'/'+suffix);await page.waitForFunction(()=>window.DobbyStitchV7?.ready);
  await verify({page,native:code=>page.evaluate(code=>DobbyFamilyStitchEngine.evaluate(code),code)});
  assert.equal(new URL(page.url()).origin,origin,'Forwarding remains on the same origin');
  assert.equal(new URL(page.url()).pathname,'/essai-stitch-v7/famille.html','Public root reaches the native V7 access shell');
  assert.doesNotMatch(page.url(),/TEST-(?:CODE|RECOVERY|INVITATION|PROVIDER|ACCESS|REFRESH)/,'Auth/invitation inputs do not remain in the visible URL');
  assert.equal(assetReferrers.some(value=>/TEST-(?:CODE|RECOVERY|INVITATION|PROVIDER|ACCESS|REFRESH)/.test(value)),false,'Callback values never become asset referrers');
  assert.deepEqual(errors,[],'No browser exceptions');
  assert.deepEqual(external.filter(host=>/supabase\.co/.test(host)),[],'No family backend is contacted');
  results.push({name,status:'PASS'});console.log('PASS',name);
 }catch(error){results.push({name,status:'FAIL',message:error.message});console.error('FAIL',name,error.message);}
 finally{await context.close();}
}

(async()=>{
 const root=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
 assert.match(root,/<link rel="canonical" href="https:\/\/portenartco\.github\.io\/dobby-demo\/">/,'The public canonical URL is exact');
 assert.match(fs.readFileSync(path.join(__dirname,'../../index-v2.9.2.html'),'utf8'),/Dobby V2\.9\.2/,'Historical root remains archived');
 const nativeHTML=fs.readFileSync(path.join(__dirname,'../famille.html'),'utf8');
 const scripts=[...nativeHTML.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)];
 assert.equal(scripts[0]?.[1],'./access-entry.js','Native URL sanitization precedes every other executable script');
 assert.ok(nativeHTML.indexOf('name="referrer"')<scripts[0].index,'The referrer policy precedes callback processing');
 assert.ok(scripts[0].index<nativeHTML.indexOf('<link '),'The callback sanitizer precedes styles/font assets');
 browser=await chromium.launch({executablePath,args:['--no-sandbox']});
 console.log('BROWSER',browser.version(),'AUTH_FIXTURES_ONLY no live certification');
 try{
  await check('ordinary canonical root opens logged-out welcome',{},async({page})=>{await page.getByRole('heading',{name:'Bienvenue dans DOBBY',exact:true}).waitFor();});
  await check('ordinary root deep link cannot bypass canonical access',{suffix:'?redirect_to=https%3A%2F%2Fexample.invalid%2F#agenda?day=2026-11-12'},async({page})=>{
   await page.getByRole('heading',{name:'Bienvenue dans DOBBY',exact:true}).waitFor();assert.equal(new URL(page.url()).search,'');
  });
  await check('ordinary root route with type metadata still enters access',{suffix:'#members?type=ordinary'},async({page})=>{await page.getByRole('heading',{name:'Bienvenue dans DOBBY',exact:true}).waitFor();});
  await check('existing root session enters Cheminette even with old route hash',{suffix:'#members',session:true},async({page})=>{await page.locator('#btn-floo-trigger').waitFor();assert.match(new URL(page.url()).hash,/^#onboarding-ritual\?/);});
  await check('exact-root PKCE callback forwards the code without requiring a flow query',{suffix:'?code=TEST-CODE#agenda'},async({page,native})=>{
   await page.getByRole('heading',{name:'Mon profil',exact:true}).waitFor();
   const calls=await native('return window.__rootEntry.calls;');assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).searchParams.get('code'),'TEST-CODE');assert.equal(new URL(calls[0].url).searchParams.has('dobby_flow'),false);
  });
  await check('root recovery callback reaches the native password form',{suffix:'?code=TEST-RECOVERY&type=recovery'},async({page,native})=>{
   await page.getByRole('heading',{name:'Choisir un nouveau mot de passe',exact:true}).waitFor();assert.equal((await native('return window.__rootEntry.calls;')).length,1);
  });
  await check('legacy implicit root callback credentials reach only private callback input',{suffix:'#access_token=TEST-ACCESS&refresh_token=TEST-REFRESH&type=recovery'},async({page,native})=>{
   await page.getByRole('heading',{name:'Choisir un nouveau mot de passe',exact:true}).waitFor();
   const calls=await native('return window.__rootEntry.calls;');assert.equal(calls.length,1);const values=new URLSearchParams(new URL(calls[0].url).hash.slice(1));assert.equal(values.get('access_token'),'TEST-ACCESS');assert.equal(values.get('refresh_token'),'TEST-REFRESH');
  });
  for(const suffix of ['?error=access_denied&error_description=TEST-PROVIDER#members','#error=access_denied&error_description=TEST-PROVIDER']){
   await check('root provider error is visible and sanitized '+(suffix.startsWith('?')?'query':'fragment'),{suffix},async({page,native})=>{
    await page.getByRole('heading',{name:'Entrer dans DOBBY',exact:true}).waitFor();assert.match(await page.locator('[data-access-status]').innerText(),/lien.*valide/i);assert.equal((await native('return window.__rootEntry.calls;')).length,0);
   });
  }
  await check('signup mismatch can be corrected by editing only the first password',{},async({page,native})=>{
   await page.getByRole('heading',{name:'Bienvenue dans DOBBY',exact:true}).waitFor();
   await page.getByRole('button',{name:'Continuer',exact:true}).click();await page.waitForFunction(()=>!DobbyAccess.busy);
   await page.getByRole('tab',{name:'Inscription',exact:true}).click();await page.waitForFunction(()=>!DobbyAccess.busy);
   await page.getByLabel('Adresse e-mail',{exact:true}).fill('fixture@example.test');
   await page.getByLabel('Mot de passe',{exact:true}).fill('TEST-OLD');await page.getByLabel('Confirmer le mot de passe',{exact:true}).fill('TEST-NEW');
   await page.getByRole('button',{name:'Créer mon compte',exact:true}).click();await page.waitForFunction(()=>!DobbyAccess.busy);
   assert.equal(await page.getByLabel('Confirmer le mot de passe',{exact:true}).evaluate(input=>input.validity.customError),true);
   await page.getByLabel('Mot de passe',{exact:true}).fill('TEST-NEW');
   await page.getByRole('button',{name:'Créer mon compte',exact:true}).click();await page.waitForFunction(()=>!DobbyAccess.busy);
   assert.equal((await native('return window.__rootEntry.calls;')).filter(call=>call.kind==='signup').length,1,'The corrected first password must permit one signup request');
  });
  await check('recovery mismatch can be corrected by editing only the first password',{suffix:'?code=TEST-RECOVERY&type=recovery'},async({page,native})=>{
   await page.getByRole('heading',{name:'Choisir un nouveau mot de passe',exact:true}).waitFor();
   await page.getByLabel('Nouveau mot de passe',{exact:true}).fill('TEST-OLD');await page.getByLabel('Confirmer le mot de passe',{exact:true}).fill('TEST-NEW');
   await page.getByRole('button',{name:'Enregistrer mon mot de passe',exact:true}).click();await page.waitForFunction(()=>!DobbyAccess.busy);
   assert.equal(await page.getByLabel('Confirmer le mot de passe',{exact:true}).evaluate(input=>input.validity.customError),true);
   await page.getByLabel('Nouveau mot de passe',{exact:true}).fill('TEST-NEW');
   await page.getByRole('button',{name:'Enregistrer mon mot de passe',exact:true}).click();await page.waitForFunction(()=>!DobbyAccess.busy);
   assert.equal((await native('return window.__rootEntry.calls;')).filter(call=>call.kind==='password').length,1,'The corrected first password must permit one recovery update');
  });
  await check('root invitation survives forwarding despite an ordinary legacy hash',{suffix:'?invite=TEST-INVITATION#agenda'},async({page,native})=>{
   await page.getByRole('heading',{name:'Bienvenue dans DOBBY',exact:true}).waitFor();assert.equal((await native('return DobbyFamilyUI.meta("v7-incoming-invitation");')).token,'TEST-INVITATION');
  });
 }finally{await browser.close();}
 console.log(JSON.stringify({liveBackend:false,canonical:'https://portenartco.github.io/dobby-demo/',results},null,2));
 if(results.some(row=>row.status==='FAIL'))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});

/* Packaged client and hosted static journeys. ALL Supabase traffic is mocked. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('../../essai-stitch-v7/tests/node_modules/playwright');
const repo=path.resolve(__dirname,'../..'),base=new URL(process.env.DOBBY_PILOT_BASE||'http://127.0.0.1:8765/essai-dobby-runes-v2-pilot-20261111/');
const evidence=process.env.DOBBY_PILOT_EVIDENCE||path.join(repo,'docs/dobby-v7/evidence/runes-v2-pilot/local');
const uid='00000000-0000-4000-8000-000000000701',hh='00000000-0000-4000-8000-000000000702';
const key='dobby-v5-familial-preview-20261108',metaKey='v2-module-state:'+uid+'|'+hh;
const date='2026-11-11T12:00:00.000Z';
(async()=>{
 const runes=await import('../../essai-stitch-v5-famille/family-runes-core.mjs');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const results=[];fs.mkdirSync(evidence,{recursive:true});
 try{for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:width===1440?1000:900},locale:'fr-BE'});
  const journal=[],errors=[],missing=[];
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.hostname==='pqcdkrwljgvgagzwrcmg.supabase.co'){
    journal.push({method:request.method(),path:url.pathname,query:url.search});
    const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(url.pathname.startsWith('/auth/v1/token'))return send({access_token:'TEST-pilot-access',refresh_token:'TEST-pilot-refresh',expires_in:3600,user:{id:uid,email:'pilot@example.test'}});
    if(url.pathname.includes('dobby_v2_memberships'))return send([{household_id:hh}]);
    if(url.pathname.includes('dobby_v2_households'))return send([{id:hh}]);
    if(url.pathname.endsWith('/rpc/dobby_missions_v2_capabilities'))return send({code:'PGRST202',message:'TEST RPC not installed'},404);
    if(request.method()!=='GET'&&request.method()!=='HEAD')return send({message:'TEST unexpected write'},500);
    if(url.pathname.endsWith('/dobby_v2_modules'))return send(url.searchParams.has('module')?[{household_id:hh,module:'missions',revision:7,payload:{autoTasks:[],manualMissions:[],runeCredits:[],runeLedgerVersion:1}}]:[{module:'missions'}]);
    return send([]);
   }
   if(url.origin===base.origin)return route.continue();
   return route.abort();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',response=>{if(response.url().startsWith(base.href)&&response.status()>=400)missing.push({url:response.url(),status:response.status()});});
  await page.goto(new URL('pilot-manifest.json',base).href);
  if(width===320){
   await page.goto(new URL('essai-stitch-v7/traverse.html',base).href);await page.waitForFunction(()=>window.DobbyStitchV7?.ready);
   await page.locator('#dobby-pilot-notice button').click();
   const setup=page.frameLocator('#dv7-engine');await setup.locator('#fv2LoginForm').waitFor();
   assert.equal(await setup.locator('#fv2LoginForm [name=key]').inputValue(),'');
   await setup.locator('#fv2LoginForm [name=key]').fill('sb_secret_TEST_rejected_locally');
   await setup.locator('#fv2LoginForm [name=email]').fill('pilot@example.test');
   await setup.locator('#fv2LoginForm [name=password]').fill('TEST');
   await setup.locator('#fv2LoginForm button[type=submit]').click();
   await page.waitForFunction(()=>document.getElementById('dv7-engine').contentWindow.DobbyFamilyUI.grocery.read().error.includes('sb_publishable'));
   assert.equal(await page.evaluate(()=>document.getElementById('dv7-engine').contentWindow.DobbyFamilyUI.connectionState().configured),false);
   assert.equal(journal.length,0,'Invalid configuration never contacts auth');
   await page.goto(new URL('pilot-manifest.json',base).href);
  }
  const member={id:'pilot-member',name:'TEST — Membre pilote',avatar:'🌿',birthdate:''};
  const mission=id=>({id,title:'TEST — '+id,category:'Famille',due:'',note:'',status:'open',assigneeId:member.id,effort:'light',rewardVersion:1});
  const credit={missionId:'pilot-history',memberId:member.id,effort:'light',amount:10,title:'TEST — Historique',date,revision:7};
  const pending=runes.completionRequest(mission('pilot-old-pending'),[member],[credit],[],date);
  const state={page:'family',demoInitialized:true,planned:{},familyMembers:[member],manualMissions:[mission('pilot-new'),{...mission('pilot-old-pending'),status:'done',completedAt:date}],runeCredits:[credit],runeRequests:[pending],pilotSentinel:'KEEP'};
  const payload={autoTasks:[],manualMissions:state.manualMissions,runeCredits:[credit],runeLedgerVersion:1};
  const operation={id:'00000000-0000-4000-8000-000000000703',expectedRevision:7,payload:{...payload,runeRequests:[pending],runeLedgerVersion:2}};
  await page.evaluate(async({key,state,metaKey,payload,operation})=>{
   localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('dobby-review-e072|sentinel','KEEP-OLD-PREVIEW');
   await new Promise((resolve,reject)=>{const request=indexedDB.open('dobby-v5-household-preview-v2',1);request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore('items',{keyPath:'storageKey'});db.createObjectStore('meta',{keyPath:'id'});};request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('meta','readwrite'),store=tx.objectStore('meta');for(const [id,value]of [['publicKey','sb_publishable_pilot_fixture_only_1234567890'],['pilotSentinel','KEEP-IDB'],[metaKey,{missions:{active:true,revision:7,runeProtocol:1,synced:JSON.stringify(payload),conflict:false,pendingOperation:operation}}]])store.put({id,value});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
  },{key,state,metaKey,payload,operation});
  const native=code=>page.evaluate(code=>document.getElementById('dv7-engine').contentWindow.eval('(()=>{'+code+'})()'),code);
  const ready=()=>page.waitForFunction(()=>window.DobbyStitchV7?.ready&&document.getElementById('dv7-engine')?.contentWindow.DobbyFamilyMissions?.available);
  async function renderShot(name){await page.evaluate(()=>document.fonts.ready);const sizes=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(sizes.scroll<=width+1,JSON.stringify(sizes));await page.screenshot({path:path.join(evidence,name+'-'+width+'.png'),fullPage:true});}
  await page.goto(new URL('essai-stitch-v7/traverse.html',base).href);await ready();
  assert.equal(await page.evaluate(()=>window.DobbyReview),undefined);assert.equal(await page.locator('[data-review-reset]').count(),0);
  await renderShot('accueil');
  for(const [dock,file,name]of [[1,'missions.html','missions'],[2,'index.html','taverne'],[3,'famille.html','famille']]){
   await page.locator('[data-e01-destination="'+dock+'"]').click();await page.waitForURL(url=>url.pathname.endsWith('/'+file));await ready();await renderShot(name);
  }
  await page.locator('[data-e01-destination="4"]').click();await page.waitForFunction(()=>window.DobbyFamilyStitch?.view==='menu');
  await page.locator('[data-e01-destination="3"]').click();await page.waitForFunction(()=>window.DobbyFamilyStitch?.view==='salon');
  const before=await native('return JSON.parse(JSON.stringify({credits:st.runeCredits,requests:st.runeRequests}));');
  // Actual native completion handler; even a disconnected pilot keeps it pending.
  await page.evaluate(()=>DobbyFamilyStitchEngine.action('fmsAction','toggle',{id:'pilot-new'}));
  assert.deepEqual(await native('return st.runeCredits;'),before.credits);
  assert.equal((await native('return st.runeRequests;')).length,before.requests.length+1);
  const after=await native('return JSON.parse(JSON.stringify({missions:st.manualMissions,credits:st.runeCredits,requests:st.runeRequests}));');
  await page.reload();await ready();assert.deepEqual(await native('return JSON.parse(JSON.stringify({missions:st.manualMissions,credits:st.runeCredits,requests:st.runeRequests}));'),after);
  await page.locator('#dobby-pilot-notice button').click();
  const frame=page.frameLocator('#dv7-engine');await frame.locator('#fv2LoginForm').waitFor();
  assert.equal(await frame.locator('#fv2LoginForm [name=key]').inputValue(),'sb_publishable_pilot_fixture_only_1234567890');
  await frame.locator('#fv2LoginForm [name=email]').fill('pilot@example.test');
  await frame.locator('#fv2LoginForm [name=password]').fill('TEST-pilot-password');
  await renderShot('connexion');
  await frame.locator('#fv2LoginForm button[type=submit]').click();
  await page.waitForFunction(()=>document.getElementById('dv7-engine').contentWindow.DobbyFamilyUI.connectionState().verified===true);
  await page.waitForFunction(()=>document.getElementById('dv7-engine').contentWindow.DobbyFamilyUI.getModuleStatus('missions').includes('RPC'));
  assert.equal(await native('return DobbySharedRunesV2.available();'),false);
  await page.evaluate(()=>document.getElementById('dv7-engine').contentWindow.DobbyFamilyUI.grocery.sync());
  assert.deepEqual(await native('return JSON.parse(JSON.stringify({missions:st.manualMissions,credits:st.runeCredits,requests:st.runeRequests}));'),after);
  assert.deepEqual(await native('return DobbyFamilyUI.meta('+JSON.stringify(metaKey)+').then(x=>x.missions.pendingOperation);'),operation);
  assert.equal(await page.evaluate(()=>localStorage.getItem('dobby-review-e072|sentinel')),'KEEP-OLD-PREVIEW');
  assert.equal(await native('return st.pilotSentinel;'),'KEEP');assert.equal(await native('return DobbyFamilyUI.meta("pilotSentinel");'),'KEEP-IDB');
  assert.equal(journal.filter(x=>x.method!=='GET'&&x.method!=='HEAD'&&x.path!=='/auth/v1/token').length,0,'No remote module mutation or writer call attempted');
  assert.ok(journal.some(x=>x.path.endsWith('/rpc/dobby_missions_v2_capabilities')));
  if(width===320){
   // A partial network load must never reopen V1 or locally confirm a reward.
   await context.route('**/pilot-runtime.js',route=>route.abort());await page.reload();await ready();
   assert.equal(await page.evaluate(()=>window.DobbyRunesPilot),undefined);
   const kept=await native('return JSON.parse(JSON.stringify({credits:st.runeCredits,requests:st.runeRequests}));');
   await page.evaluate(()=>DobbyFamilyStitchEngine.action('fmsAction','toggle',{id:'pilot-new'}));
   assert.deepEqual(await native('return st.runeCredits;'),kept.credits);
   assert.equal((await native('return st.runeRequests;')).length,kept.requests.length+1);
   assert.deepEqual(await native('return DobbyFamilyUI.meta('+JSON.stringify(metaKey)+').then(x=>x.missions.pendingOperation);'),operation);
   assert.equal(journal.filter(x=>x.method!=='GET'&&x.method!=='HEAD'&&x.path!=='/auth/v1/token').length,0);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  results.push({width,pass:true,roots:['accueil','missions','taverne','famille','menu'],missingConfigurationAndSecretRefusal:width===320?'PASS':'covered at 320',missingNoticeRuntime:width===320?'PASS: guard and pending queue remain mandatory':'covered at 320',nativeAuth:'HTTP fixture only',capability:'404 fixture; V1 disabled',newReward:'pending after reload',outbox:'unchanged',actualSupabaseRequests:0,sameOriginMissing:missing,pageErrors:errors,journal});
  await context.close();console.log('RUNES_PILOT_BROWSER_PASS',width,base.href);
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(evidence,'browser-verification.json'),JSON.stringify({base:base.href,realSupabaseVerified:false,results},null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});

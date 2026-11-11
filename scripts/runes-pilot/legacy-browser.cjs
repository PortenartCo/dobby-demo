/* Local/hosted static browser proof. Every Supabase request is intercepted.
 * The fictional HTTP boundary is intentionally separate from the real local
 * PostgreSQL proof in legacy-postgres.test.mjs. Never use real credentials. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('../../essai-stitch-v7/tests/node_modules/playwright');
const repo=path.resolve(__dirname,'../..'),argument=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const base=new URL(argument('--base-url')||process.env.DOBBY_LEGACY_BASE||(process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8898')+'/essai-dobby-runes-v2-legacy-review-20261112/');
const evidence=argument('--output')||process.env.DOBBY_LEGACY_EVIDENCE||path.join(repo,'docs/dobby-v7/evidence/legacy-missions/browser');
const uid='00000000-0000-4000-8000-000000000801',hh='00000000-0000-4000-8000-000000000802';
const key='dobby-v5-familial-preview-20261108',metadataKey='v2-module-state:'+uid+'|'+hh;
const date='2026-11-12T12:00:00.000Z',clone=value=>JSON.parse(JSON.stringify(value));
const member={id:'fixture-member',name:'TEST — Membre fictif',avatar:'🌿',birthdate:''};
const mission=id=>({id,title:'TEST — '+id,category:'Famille',due:'',note:'',status:'open',assigneeId:member.id,effort:'light',rewardVersion:1});
const auto=(id,extra={})=>({key:id,title:'TEST — '+id,state:'open',due:'2026-11-12',sourceDate:'2026-11-12',origin:'equipment',originId:id,sourceLabel:'TEST — source absente de cet appareil',opaque:{preserve:['nested',id]},...extra});
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const fields=state=>clone({autoTasks:state.autoTasks,manualMissions:state.manualMissions,runeCredits:state.runeCredits,runeRequests:state.runeRequests});

(async()=>{
 const runes=await import('../../essai-stitch-v5-famille/family-runes-core.mjs');
 fs.mkdirSync(evidence,{recursive:true});const results=[];
 const manifestResponse=await fetch(new URL('pilot-manifest.json',base));assert.equal(manifestResponse.status,200);const manifest=await manifestResponse.json();
 const clientResponse=await fetch(new URL('essai-stitch-v5-famille/family-modules.js',base));assert.equal(clientResponse.status,200);const generatedClientSha256=crypto.createHash('sha256').update(Buffer.from(await clientResponse.arrayBuffer())).digest('hex');
 assert.equal(generatedClientSha256,manifest.files.find(row=>row.path==='essai-stitch-v5-famille/family-modules.js').sha256,'actual served client must match its manifest');
 const provenance={sourceSha:manifest.sourceSha,sourceDirty:manifest.sourceDirty,legacyFeatureSha256:manifest.legacyFeatureSha256,legacyTransformSha256:manifest.legacyTransformSha256,generatedClientSha256};
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const cases=[320,390,1440].flatMap(width=>[false,true].map(withAuto=>({width,withAuto,mode:'union'}))).concat([{width:390,withAuto:true,mode:'collision'},{width:320,withAuto:true,mode:'pending'}]);
 try{for(const{width,withAuto,mode}of cases){
  const name=(mode==='union'?(withAuto?'with-remote-auto':'without-remote-auto'):mode)+'-'+width;
  const remotePayload={autoTasks:withAuto?[auto('remote-auto')]:[],manualMissions:[],runeCredits:[]};
  let remote={module:'missions',revision:2,payload:clone(remotePayload),updated_at:date};
  const state={page:'missions',demoInitialized:true,planned:{},houseItems:[],houseLogs:[],familyDocs:[],familyMembers:[member],autoTasks:[auto('local-auto')],manualMissions:[mission('local-mission')],runeCredits:[],runeRequests:[],pilotSentinel:'KEEP-LOCAL'};
  if(mode==='collision'){state.autoTasks.push(auto('same-identity',{note:'TEST — détail appareil'}));remotePayload.autoTasks.push(auto('same-identity',{note:'TEST — détail foyer'}));remote.payload=clone(remotePayload);}
  const expectedAutos=[...remotePayload.autoTasks.map(row=>mode==='collision'&&row.key==='same-identity'?state.autoTasks.find(x=>x.key===row.key):row),...state.autoTasks.filter(row=>!remotePayload.autoTasks.some(other=>other.key===row.key))];
  const operation=mode==='pending'?{id:'00000000-0000-4000-8000-000000000803',expectedRevision:2,payload:{autoTasks:clone(expectedAutos),manualMissions:clone(state.manualMissions),runeCredits:[],runeRequests:[],runeLedgerVersion:2},localFields:{autoTasks:clone(state.autoTasks),manualMissions:clone(state.manualMissions)},localEditable:JSON.stringify(canonical({autoTasks:state.autoTasks,manualMissions:state.manualMissions}))}:null;
  const context=await browser.newContext({viewport:{width,height:width===1440?1000:920},locale:'fr-BE',acceptDownloads:true});
  const journal=[],errors=[],missing=[],external=[],receipts=new Map();let assertions=0;
  const check=(condition,message)=>{assert.ok(condition,message);assertions++;};
  const equal=(a,b,message)=>{assert.deepEqual(a,b,message);assertions++;};
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.hostname==='pqcdkrwljgvgagzwrcmg.supabase.co'){
    const entry={method:request.method(),path:url.pathname,query:url.search};journal.push(entry);
    const send=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(url.pathname.includes('dobby_v2_memberships'))return send([{household_id:hh}]);
    if(url.pathname.includes('dobby_v2_households'))return send([{id:hh}]);
    if(url.pathname.endsWith('/rpc/dobby_missions_v2_capabilities'))return send({protocol:2,directWritesBlocked:true,maxPayloadBytes:262144,ledgerVersions:[1,2]});
    if(url.pathname.endsWith('/rpc/dobby_missions_v2_write')){
     const body=request.postDataJSON();entry.body=clone(body);assert.equal(request.method(),'POST');assert.equal(body.p_household_id,hh);
     const signature=JSON.stringify(body.p_payload),prior=receipts.get(body.p_operation_id);
     if(prior){assert.equal(prior.signature,signature);assert.equal(prior.expectedRevision,body.p_expected_revision);return send({protocol:2,replayed:true,operation:prior.receipt,module:remote});}
     if(body.p_expected_revision!==remote.revision)return send({code:'40001',message:'TEST atomic CAS refusal'},500);
     assert.equal(body.p_payload.runeLedgerVersion,2);assert.deepEqual(body.p_payload.runeCredits,remote.payload.runeCredits);
     const revision=remote.revision+1,confirmed=runes.acceptRequests(body.p_payload.runeCredits,body.p_payload.runeRequests,revision);
     remote={module:'missions',revision,payload:{...clone(body.p_payload),runeCredits:clone(confirmed),runeRequests:[],runeLedgerVersion:2},updated_at:date};
     const receipt={id:body.p_operation_id,revision,digest:crypto.createHash('sha256').update(signature).digest('hex')};
     receipts.set(body.p_operation_id,{signature,expectedRevision:body.p_expected_revision,receipt});return send({protocol:2,replayed:false,operation:receipt,module:remote});
    }
    if(request.method()!=='GET'&&request.method()!=='HEAD')return send({code:'42501',message:'TEST direct writes forbidden'},403);
    if(url.pathname.endsWith('/dobby_v2_modules'))return send(url.searchParams.has('module')?[remote]:[{module:'missions'}]);
    return send([]);
   }
   if(url.origin===base.origin)return route.continue();
   external.push({method:request.method(),url:request.url()});return route.abort();
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.url().startsWith(base.href)&&response.status()>=400)missing.push({url:response.url(),status:response.status()});});
  await page.goto(new URL('pilot-manifest.json',base).href);
  await page.evaluate(async({key,state,metadataKey,remotePayload,uid,hh,operation})=>{
   localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('dobby-review-e072|sentinel','KEEP-OLD-PREVIEW');
   await new Promise((resolve,reject)=>{const request=indexedDB.open('dobby-v5-household-preview-v2',1);request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore('items',{keyPath:'storageKey'});db.createObjectStore('meta',{keyPath:'id'});};request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('meta','readwrite'),store=tx.objectStore('meta');
    const session={access_token:'TEST-browser-only',refresh_token:'TEST-browser-refresh-only',expires_at:Math.floor(Date.now()/1000)+3600,user_id:uid,email:'legacy-browser@example.test'};
    for(const[id,value]of[['publicKey','sb_publishable_browser_fixture_only_1234567890'],['session',session],['deviceHouseholdId',hh],['verifiedContext',uid+'|'+hh],['pilotSentinel','KEEP-IDB'],[metadataKey,{missions:{active:true,revision:2,synced:JSON.stringify(remotePayload),conflict:false,...(operation?{pendingOperation:operation}:{})}}]])store.put({id,value});
    tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
  },{key,state,metadataKey,remotePayload,uid,hh,operation});
  const native=code=>page.evaluate(code=>document.getElementById('dv7-engine').contentWindow.eval('(()=>{'+code+'})()'),code);
  const ready=()=>page.waitForFunction(()=>window.DobbyStitchV7?.ready&&document.getElementById('dv7-engine')?.contentWindow.DobbySharedRunesV2?.available());
  const metadata=()=>native('return DobbyFamilyUI.meta('+JSON.stringify(metadataKey)+');');
  const local=()=>native('return JSON.parse(JSON.stringify({autoTasks:st.autoTasks,manualMissions:st.manualMissions,runeCredits:st.runeCredits,runeRequests:st.runeRequests}));');
  const frame=page.frameLocator('#dv7-engine'),button=action=>frame.locator('[data-fm-action="'+action+'"][data-module="missions"]');
  async function shot(stage){
   await page.evaluate(()=>document.fonts.ready);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no outer horizontal overflow');
   check(await native('return document.documentElement.scrollWidth<=innerWidth+1;'),'no native horizontal overflow');
   await page.screenshot({path:path.join(evidence,name+'-'+stage+'.png'),fullPage:true});
  }
  async function open(){await page.locator('#dobby-pilot-notice button').click();await button('legacy-review').waitFor();}
  await page.goto(new URL('essai-stitch-v7/missions.html',base).href);await ready();
  await page.waitForFunction(key=>document.getElementById('dv7-engine').contentWindow.DobbyFamilyUI.getModuleStatus('missions').includes('Ancien registre'),metadataKey);
  equal(await local(),fields(state),'initial versionless read never replaces local Missions');
  equal(journal.filter(x=>x.method!=='GET'&&x.method!=='HEAD'),[],'initial read never writes');
  const finalAction=mode==='collision'?'legacy-local':mode==='pending'?'legacy-replay':'legacy-merge';
  await shot('before');await open();await button('legacy-review').click();await button(finalAction).waitFor();
  if(mode==='collision'){await frame.locator('.fv2-module details').last().locator('summary').click();const text=await frame.locator('#fv2ModalBody').innerText();check(text.includes('TEST — détail appareil')&&text.includes('TEST — détail foyer'),'explicit collision variants expose actual differing fields');equal(await button('legacy-merge').count(),0,'no implicit collision winner');}
  if(mode==='pending'){equal((await metadata()).missions.pendingOperation,operation,'unknown native outbox remains exact before explicit replay');equal(await button('legacy-merge').count(),0,'pending operation cannot be replaced by a new recovery');}
  const prepared=(await metadata()).missions;check(prepared.legacyBackupId.startsWith('v2-missions-legacy-backup:'),'durable backup linked');
  const backup=await native('return DobbyFamilyUI.meta('+JSON.stringify(prepared.legacyBackupId)+');');
  equal(backup.remote,{module:'missions',revision:2,payload:remotePayload,updated_at:date},'backup retains exact legacy row');
  equal(backup.local.autoTasks,state.autoTasks,'backup local auto tasks');equal(backup.local.manualMissions,state.manualMissions,'backup local manual missions');
  equal(journal.filter(x=>x.method!=='GET'&&x.method!=='HEAD'),[],'review and backup never publish');
  await button(finalAction).scrollIntoViewIfNeeded();await shot('review');
  const downloadPromise=page.waitForEvent('download');await button('legacy-export').click();const download=await downloadPromise;
  const downloaded=JSON.parse(fs.readFileSync(await download.path(),'utf8'));equal(downloaded,backup,'download is exact durable backup');
  page.once('dialog',dialog=>dialog.dismiss());await button(finalAction).click();
  await page.waitForTimeout(100);equal(remote.revision,2,'cancelled confirmation cannot write');equal(await local(),fields(state),'cancelled confirmation cannot replace local Missions');
  page.once('dialog',dialog=>dialog.accept());await button(finalAction).click();
  for(let retry=0;retry<100;retry++){const saved=await metadata();if(remote.revision===3&&saved.missions.revision===3&&!saved.missions.pendingOperation)break;if(retry===99)throw Error('Recovery acknowledgement timed out: '+JSON.stringify({remote,journal,metadata:saved}));await new Promise(resolve=>setTimeout(resolve,50));}
  equal(remote.revision,3,'one CAS revision increment');equal(remote.payload.runeLedgerVersion,2,'explicit V2 conversion');
  equal(remote.payload.autoTasks,expectedAutos,'all remote and local automatic rows retained byte for byte');
  equal(remote.payload.manualMissions,state.manualMissions,'local manual missions retained');equal(remote.payload.runeCredits,[],'no invented rune credits');
  const writes=journal.filter(x=>x.method!=='GET'&&x.method!=='HEAD');equal(writes.length,1,'one native writer call only');check(writes[0].path.endsWith('/rpc/dobby_missions_v2_write'),'RPC writer only');equal(writes[0].body.p_expected_revision,2,'expected revision2');check(receipts.has(writes[0].body.p_operation_id),'operation receipt returned');if(mode==='pending'){equal(writes[0].body.p_operation_id,operation.id,'explicit replay retains exact operation UUID');equal(writes[0].body.p_payload,operation.payload,'explicit replay retains exact payload');}
  await native('document.querySelector("[data-fv-action=close]").click();save();render();');
  await page.evaluate(()=>DobbyStitchV7.refresh());await shot('after');
  const adopted=await local();equal(adopted.autoTasks,remote.payload.autoTasks,'render and save do not obsolete remote tasks with missing local sources');
  await page.reload();await ready();await page.waitForFunction(()=>document.getElementById('dv7-engine').contentWindow.DobbyFamilyUI.getModuleStatus('missions').includes('jour'));
  equal(await local(),adopted,'adopted Missions survive actual browser reload');
  equal((await metadata()).missions.pendingOperation,undefined,'receipt cleared outbox');
  equal(await native('return DobbyFamilyUI.meta('+JSON.stringify(prepared.legacyBackupId)+');'),backup,'backup survives adoption and reload');
  equal(await native('return st.pilotSentinel;'),'KEEP-LOCAL','other native fields preserved');equal(await native('return DobbyFamilyUI.meta("pilotSentinel");'),'KEEP-IDB','other IDB preserved');equal(await page.evaluate(()=>localStorage.getItem('dobby-review-e072|sentinel')),'KEEP-OLD-PREVIEW','other preview namespace preserved');
  equal(journal.filter(x=>x.method!=='GET'&&x.method!=='HEAD').length,1,'reload cannot duplicate recovery writes');equal(errors,[],'no page errors');equal(missing,[],'no same origin HTTP404');
  results.push({name,width,mode,withRemoteAutomaticTasks:withAuto,pass:true,assertions,source:'fictional browser HTTP fixture',realSupabaseRequests:0,initialRevision:2,confirmedRevision:remote.revision,ledgerVersion:remote.payload.runeLedgerVersion,confirmedCredits:remote.payload.runeCredits.length,cases:['initial gate','durable backup','download exact backup','confirmation cancellation','explicit union','native CAS+receipt','automatic task status across render/save','reload','no duplicate write','other local and IDB sentinels'],pageErrors:errors,missingResources:missing,blockedExternalResources:external,journal});
  console.log('LEGACY_BROWSER_PASS',name,assertions,base.href);await context.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(evidence,'browser-verification.json'),JSON.stringify({base:base.href,generatedAt:new Date().toISOString(),provenance,realSupabaseVerified:false,allSupabaseTraffic:'intercepted and fulfilled with invented fixture data; no real requests',results},null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});

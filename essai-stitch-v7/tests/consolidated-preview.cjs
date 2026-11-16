/* Delivered partial composition: real clicks/native writers, disposable browser, no external transport. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{chromium,request}=require('playwright');
const base=new URL((process.env.DOBBY_CONSOLIDATED_BASE||'http://127.0.0.1:8765/essai-dobby-v7-consolidated-partial/').replace(/\/?$/,'/'));
const out=path.resolve(process.env.DOBBY_CONSOLIDATED_EVIDENCE||path.join(__dirname,'../../docs/dobby-v7/consolidated/evidence/local'));
const widths=(process.env.DOBBY_CONSOLIDATED_WIDTHS||'320,390,768,1440').split(',').map(Number),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const url=(client='A',view='settings')=>new URL('essai-stitch-v7/famille.html?client='+client+'#'+view,base).href;
const state=page=>page.evaluate(()=>DobbyFamilyStitchEngine.read().state),sync=page=>page.evaluate(()=>DobbyGlobalDemo.sync());
async function familyReady(page,view){await page.waitForFunction(expected=>window.DobbyFamilyStitch?.ready&&window.DobbyGlobalDemo&&DobbyFamilyStitchEngine.win().DobbyFamilyUI?.grocery?.read().ready&&(!expected||DobbyFamilyStitch.view===expected&&document.body.dataset.familyView===expected)&&!document.documentElement.classList.contains('dv7-loading'),view);await page.evaluate(()=>DobbyGlobalDemo.ready);}
async function menu(page){await page.locator('body>nav [data-e01-destination="5"]').click();await familyReady(page,'menu');}
async function menuItem(page,view){await menu(page);await page.locator('#menu-sections [data-fa-action="'+view+'"]').click();await familyReady(page,view);}
async function shot(page,name,width){await page.evaluate(()=>{scrollTo(0,0);return document.fonts.ready;});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No overflow: '+name);await page.screenshot({path:path.join(out,name+'-'+width+'.png'),fullPage:true});}
async function seedSentinels(page){
 await page.goto(new URL('review-manifest.json',base).href);
 return page.evaluate(async()=>{
  const old=['dobby-v5-familial-preview-20261108','dobby-review-e072|sentinel','dobby-review-e074-20261111|sentinel','dobby-review-integrated-v1|sentinel','dobby-review-v7-global-20261112|sentinel','dobby-review-v7-famille-20261112|sentinel','dobby-review-v7-menu-20261112|sentinel','dobby-review-v7-notes-stitch23-20261116|sentinel'];
  old.forEach((key,i)=>localStorage.setItem(key,'UNCHANGED_OLD_PROFILE_'+i));
  sessionStorage.setItem('dobby-review-v7-notes-stitch23-20261116|session-sentinel','UNCHANGED_OLD_SESSION');sessionStorage.setItem('unrelated-session-sentinel','UNCHANGED_SESSION');
  for(const name of ['dobby-v5-household-preview-v2','dobby-review-e072|sentinel-db','dobby-review-v7-global-20261112|sentinel-db','dobby-review-v7-famille-20261112|sentinel-db','dobby-review-v7-notes-stitch23-20261116|sentinel-db'])await new Promise((resolve,reject)=>{
   const req=indexedDB.open(name,1);req.onupgradeneeded=()=>req.result.createObjectStore('proof');req.onsuccess=()=>{const db=req.result,tx=db.transaction('proof','readwrite');tx.objectStore('proof').put('UNCHANGED_IDB_'+name,'sentinel');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};req.onerror=()=>reject(req.error);
  });
  return {local:Object.fromEntries(old.map(key=>[key,localStorage.getItem(key)])),session:Object.fromEntries(Object.keys(sessionStorage).map(key=>[key,sessionStorage.getItem(key)])),databases:(await indexedDB.databases()).map(row=>row.name).sort()};
 });
}
async function sentinels(page,prefix){
 return page.evaluate(async prefix=>{
  const raw=Storage.prototype.__reviewRaw,keys=store=>Array.from({length:raw.length.call(store)},(_,i)=>raw.key.call(store,i)).filter(key=>!key.startsWith(prefix));
  const local=Object.fromEntries(keys(localStorage).sort().map(key=>[key,raw.getItem.call(localStorage,key)])),session=Object.fromEntries(keys(sessionStorage).sort().map(key=>[key,raw.getItem.call(sessionStorage,key)]));
  const databases=(await indexedDB.databases()).map(row=>row.name).filter(name=>!name.startsWith(prefix)).sort(),values={};
  for(const name of databases)values[name]=await new Promise((resolve,reject)=>{const req=IDBFactory.prototype.open.call(indexedDB,name);req.onsuccess=()=>{const db=req.result,tx=db.transaction('proof'),get=tx.objectStore('proof').get('sentinel');get.onsuccess=()=>{resolve(get.result);db.close();};get.onerror=()=>reject(get.error);};req.onerror=()=>reject(req.error);});
  return {local,session,databases,values};
 },prefix);
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 if(base.hostname==='raw.githack.com')assert.match(base.pathname,/\/[a-f\d]{40}\//,'Hosted review must use an immutable commit URL.');
 const http=await request.newContext({proxy:base.protocol==='https:'&&process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined,timeout:60000});
 let manifest,manifestSha256,resources=[];
 try{
  const response=await http.get(new URL('review-manifest.json',base).href);assert.equal(response.status(),200);const bytes=await response.body();manifestSha256=sha(bytes);manifest=JSON.parse(bytes.toString());
  assert.equal(manifest.version,'V7-CONSOLIDATED-PARTIAL');assert.match(manifest.sourceSha,/^[a-f\d]{40}$/);
  const prefix='dobby-review-v7-consolidated-'+manifest.sourceSha+'|';assert.equal(manifest.storageNamespace,prefix);
  for(const [key,suffix]of Object.entries({storagePrefix:'client-{A|B}|',sharedFixtureKey:'backend-v1',selectedClientKey:'selected-client',resetKey:'reset-in-progress',resetChannel:'reset',backendLock:'backend-v1'}))assert.equal(manifest[key],prefix+suffix,key);
  assert.equal(manifest.entry,'essai-stitch-v7/famille.html?client=A#settings');assert.equal(manifest.composition.status,'partial');assert.equal(manifest.composition.generalPromotion,false);
  assert.deepEqual(manifest.composition.included,['Archives / Stitch 22','Notes du foyer / Stitch 23','Paramètres']);assert.deepEqual(manifest.composition.contacts,{status:'historical-only',stitch24SourceAvailable:false,stitch24FeaturesClaimed:false,stitch24PermissionsClaimed:false});
  for(const key of ['realBackend','realAuth','realAccountsTested','migrationsApplied','newServices'])assert.equal(manifest[key],false,key);
  assert.equal(new Set(manifest.files.map(row=>row.path)).size,manifest.files.length);assert.ok(manifest.files.length>100);
  let next=0;await Promise.all(Array.from({length:6},async()=>{while(next<manifest.files.length){const row=manifest.files[next++],response=await http.get(new URL(row.path,base).href);assert.equal(response.status(),200,row.path);const digest=sha(await response.body());assert.equal(digest,row.sha256,row.path);resources.push({path:row.path,status:response.status(),sha256:digest});}}));
  for(const [field,file]of Object.entries({configSha256:'review-config.js',familyConfigSha256:'family-config.js',fixtureSha256:'global-demo.js',runtimeSha256:'review-runtime.js',readmeSha256:'README.md'}))assert.equal(manifest[field],manifest.files.find(row=>row.path===file)?.sha256,field);
  for(const file of ['review-config.js','global-demo.js','family-config.js']){const record=manifest.files.find(row=>row.path===file),source=await(await http.get(new URL(file,base).href)).text();assert.ok(record.transforms.some(t=>t.type==='namespace-substitution'&&t.to===prefix));assert.ok(source.includes(prefix));assert.doesNotMatch(source,/dobby-review-v7-(?:global|famille|notes-stitch23)-\d{8}\|/);}
  assert.deepEqual(manifest.illustrations.map(row=>row.stitch),[22,23]);for(const art of manifest.illustrations){assert.equal(art.sha256,art.sourceSha256);assert.equal(art.artisticChanges,false);assert.equal(art.sha256,manifest.files.find(row=>row.path===art.path)?.sha256);}
  const readme=await(await http.get(new URL('README.md',base).href)).text();assert.match(readme,/Consolidation partielle Archives \+ Notes \+ Paramètres/);assert.match(readme,/Contacts historiques seulement/);assert.match(readme,/Aucune promotion générale/);
  console.log('CONSOLIDATED_HASHES_PASS',resources.length,manifest.sourceSha);
 }finally{await http.dispose();}
 const prefix=manifest.storageNamespace,browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}),results=[];
 try{for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:950},locale:'fr-BE',timezoneId:'Europe/Paris',reducedMotion:'reduce'}),external=[],errors=[],mutations=[],missing=[],dialogs=[];
  context.on('page',page=>{page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>{dialogs.push(dialog.message());dialog.accept();});page.on('request',req=>{if(!['GET','HEAD'].includes(req.method()))mutations.push({method:req.method(),url:req.url()});});page.on('response',response=>{if(response.url().startsWith(base.href)&&response.status()>=400)missing.push({status:response.status(),url:response.url()});});});
  await context.route('**/*',route=>{const requested=route.request().url();if(requested.startsWith(base.href)||requested.startsWith('data:')||requested.startsWith('blob:'))return route.continue();external.push(requested);return route.abort();});
  const page=await context.newPage();page.setDefaultTimeout(20000);const before=await seedSentinels(page);
  await page.goto(base.href);await familyReady(page,'settings');assert.equal(new URL(page.url()).hash,'#settings');assert.equal(await page.evaluate(()=>DobbyReview.version),'V7-CONSOLIDATED-PARTIAL');assert.equal(await page.evaluate(()=>DobbyGlobalDemo.realBackend),false);
  assert.match(await page.locator('[data-review-banner]').innerText(),/Archives \+ Notes \+ Paramètres · partiel/);assert.match(await page.locator('[data-review-banner]>span').first().getAttribute('title'),/Contacts historiques seulement/);
  const isolation=await page.evaluate(()=>({prefix:DobbyReviewConfig.storagePrefix,names:Object.keys(localStorage),db:true}));assert.equal(isolation.prefix,prefix+'client-A|');assert.ok(isolation.names.some(key=>key.startsWith(prefix+'client-A|')));
  await shot(page,'01-settings',width);await menu(page);assert.equal(await page.locator('#menu-sections .rg-menu-card').count(),6);await shot(page,'02-menu',width);
  await page.getByRole('link',{name:'Paramètres',exact:true}).click();await familyReady(page,'settings');assert.deepEqual(await page.locator('[data-settings-card] .rg-menu-label').allTextContents(),['Ambiance magique','Gestion du foyer','Données et sauvegardes']);
  await page.locator('[data-settings-card="settings-magic"]').click();await familyReady(page,'settings-magic');const effects=page.getByRole('switch',{name:'Effets magiques',exact:true}),originalEffects=await effects.getAttribute('aria-checked');await effects.click();const changedEffects=await effects.getAttribute('aria-checked');assert.notEqual(changedEffects,originalEffects);await page.reload();await familyReady(page,'settings-magic');assert.equal(await effects.getAttribute('aria-checked'),changedEffects);await shot(page,'03-settings-magic',width);await effects.click();
  await page.getByRole('button',{name:'Retour aux paramètres',exact:true}).click();await familyReady(page,'settings');await page.locator('[data-settings-card="members"]').click();await familyReady(page,'members');assert.equal(await page.locator('#invite-member-btn').count(),1);await shot(page,'04-settings-members',width);
  await page.getByRole('button',{name:'Retour aux paramètres',exact:true}).click();await familyReady(page,'settings');await page.locator('[data-settings-card="backup"]').click();await familyReady(page,'backup');assert.equal(await page.locator('#rg-restore-file').count(),1);await shot(page,'05-settings-backup',width);
  await menuItem(page,'documents');assert.equal(await page.locator('[data-archives-hero] img').getAttribute('src'),'./assets/archives/stitch22.png');await shot(page,'06-archives',width);
  await menuItem(page,'memos');assert.equal(await page.locator('.fam-notes-illustration img').evaluate(img=>img.src),new URL('essai-stitch-v7/assets/notes-stitch23.png',base).href);assert.match(await page.locator('main').innerText(),/DÉMO — Préparer la soirée en famille/);await shot(page,'07-notes',width);
  const localNotes=await page.evaluate(()=>DobbyFamilyStitchEngine.read().state.familyNotes);
  await page.locator('[data-fa-action="rg-memo-new"]').first().click();await familyReady(page,'memo-edit');await page.locator('#memo-title').fill('DÉMO — Consolidation '+width);await page.locator('#memo-body').fill('Mémo écrit par le formulaire et le writer natifs.');await page.locator('#tag-input').fill('démo, consolidation');await page.locator('[data-fa-action="rg-save"]').click();await familyReady(page,'memos');
  const memo=(await state(page)).sharedFamilyNotes.find(row=>row.title==='DÉMO — Consolidation '+width);assert.ok(memo?.id);await page.reload();await familyReady(page,'memos');assert.ok((await state(page)).sharedFamilyNotes.some(row=>row.id===memo.id));assert.deepEqual((await state(page)).familyNotes,localNotes);await sync(page);
  const other=await context.newPage();other.setDefaultTimeout(20000);await other.goto(url('B','memos'));await familyReady(other,'memos');await sync(other);assert.equal((await state(other)).sharedFamilyNotes.find(row=>row.id===memo.id)?.body,memo.body);assert.equal(await other.evaluate(()=>DobbyReviewConfig.storagePrefix),prefix+'client-B|');await other.close();
  await menuItem(page,'house');assert.equal(await page.locator('[data-house-hero] img').count(),1);await shot(page,'08-maison',width);
  await menuItem(page,'contracts');assert.match(await page.locator('main').innerText(),/Contrats|Assurances/);await shot(page,'09-contrats',width);
  await page.locator('body>nav [data-e01-destination="4"]').click();await familyReady(page,'salon');await shot(page,'10-famille',width);
  for(const [destination,view,name]of [[3,'shop','11-courses'],[2,'taverne','12-repas']]){await page.locator('body>nav [data-e01-destination="'+destination+'"]').click();await page.waitForFunction(view=>window.DobbyCuisine?.ready&&DobbyCuisine.view===view,view);await shot(page,name,width);}
  // Probe the actual wrapper, without allowing a browser request to leave this preview.
  const blocked=await page.evaluate(async()=>{
   const results={};for(const target of ['https://pqcdkrwljgvgagzwrcmg.supabase.co/rest/v1/dobby_v2_modules','https://example.invalid/rest/v1/test',new URL('/outside-consolidated-preview',location.origin).href])try{await fetch(target,{method:'POST'});results[target]=false;}catch{results[target]=true;}
   try{new XMLHttpRequest().open('GET','https://pqcdkrwljgvgagzwrcmg.supabase.co/rest/v1/dobby_v2_modules');results.xhr=false;}catch{results.xhr=true;}results.beacon=navigator.sendBeacon('https://example.invalid','test')===false;return results;
  });assert.ok(Object.values(blocked).every(Boolean));
  await menu(page);const oldGeneration=(await page.evaluate(()=>DobbyGlobalDemo.state())).generation;await Promise.all([page.waitForEvent('framenavigated',{predicate:frame=>frame===page.mainFrame()}),page.locator('[data-global-reset]').click()]);await familyReady(page,'menu');assert.ok((await page.evaluate(()=>DobbyGlobalDemo.state())).generation>oldGeneration);assert.equal((await state(page)).sharedFamilyNotes.some(row=>row.id===memo.id),false);
  const kept=await sentinels(page,prefix);assert.deepEqual(kept.local,before.local);assert.deepEqual(kept.session,before.session);assert.deepEqual(kept.databases,before.databases);for(const name of kept.databases)assert.equal(kept.values[name],'UNCHANGED_IDB_'+name);
  const allDatabases=await page.evaluate(async()=> (await indexedDB.databases()).map(row=>row.name));assert.ok(allDatabases.filter(name=>!before.databases.includes(name)).every(name=>name.startsWith(prefix)));
  assert.equal(await page.locator('body>header').count(),1);assert.equal(await page.locator('body>nav a').count(),6);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(mutations,[]);assert.deepEqual(missing,[]);assert.deepEqual(dialogs,['Réinitialiser uniquement les données fictives de cet essai, pour A et B ?']);
  results.push({width,status:'PASS',journeys:['Menu','Paramètres : 3 sections','Archives','Notes','Maison','Contrats','Famille','Courses','Repas'],memoId:memo.id,simulatedAB:true,resetGeneration:oldGeneration+1,sentinelsPreserved:kept,blocked,errors,externalRequests:external,networkMutations:mutations,missing,dialogs});console.log('CONSOLIDATED_PREVIEW_PASS',width);await context.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(out,'review-manifest.json'),JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(path.join(out,'proof.json'),JSON.stringify({base:base.href,at:new Date().toISOString(),manifestSha256,sourceSha:manifest.sourceSha,sourceState:manifest.sourceState,composition:manifest.composition,limits:manifest.limits,realAccountsTested:false,results,resources:resources.sort((a,b)=>a.path.localeCompare(b.path))},null,2)+'\n');
 console.log('CONSOLIDATED_PARTIAL_PASS',manifest.sourceSha,base.href);
})().catch(error=>{console.error(error);process.exitCode=1;});

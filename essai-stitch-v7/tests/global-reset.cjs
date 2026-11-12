/* Reset real native attachments and all review storage, preserving other data. */
'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const base=new URL(process.env.DOBBY_GLOBAL_RESET_BASE||process.env.DOBBY_GLOBAL_PREVIEW_BASE||'http://127.0.0.1:8765/essai-dobby-v7-global-review-20261112/');
const prefix='dobby-review-v7-global-20261112|',attachment='global-reset-native-attachment';
async function diagnostics(page){return Promise.all(page.frames().map(async frame=>{try{return await frame.evaluate(()=>({url:location.href,top:window===top,fixtureClient:window.DobbyGlobalDemo?.client,lifecycle:window.DobbyGlobalDemo?.diagnoseReset?.(),familyReady:window.DobbyFamilyStitch?.ready,stitchReady:window.DobbyStitchV7?.ready,native:window.DobbyFamilyUI?.grocery.read(),backendGeneration:JSON.parse(Storage.prototype.__reviewRaw?.getItem.call(localStorage,'dobby-review-v7-global-20261112|backend-v1')||'null')?.generation,resetToken:Storage.prototype.__reviewRaw?.getItem.call(localStorage,'dobby-review-v7-global-20261112|reset-in-progress'),trace:window.__globalResetTrace||[],errors:window.__globalResetErrors||[]}));}catch(error){return{url:frame.url(),error:error.message};}}));}
async function ready(page){try{await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready&&window.DobbyFamilyStitchEngine?.win()?.DobbyFamilyUI.grocery.read().ready);await page.evaluate(()=>DobbyGlobalDemo.ready);}catch(error){console.error('GLOBAL_RESET_DIAGNOSTIC',JSON.stringify(await diagnostics(page)));throw error;}}
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 const context=await browser.newContext({viewport:{width:390,height:900},locale:'fr-BE'}),pages=[],messages=[];
 await context.exposeBinding('__recordGlobalResetMessage',(_source,event)=>messages.push(event));
 await context.addInitScript(()=>{
  const NativeChannel=BroadcastChannel;window.__globalResetTrace=[];window.__globalResetErrors=[];
  window.addEventListener('error',event=>window.__globalResetErrors.push(event.error?.stack||event.message));window.addEventListener('unhandledrejection',event=>window.__globalResetErrors.push(String(event.reason?.stack||event.reason)));
  window.BroadcastChannel=class extends NativeChannel{
   constructor(name){super(name);this.__resetTraceName=name;if(name==='dobby-review-v7-global-20261112|reset')this.addEventListener('message',event=>{const row={direction:'receive',data:event.data,url:location.href,top:window===top};window.__globalResetTrace.push(row);void window.__recordGlobalResetMessage(row);});}
   postMessage(data){if(this.__resetTraceName==='dobby-review-v7-global-20261112|reset'){const row={direction:'send',data,url:location.href,top:window===top};window.__globalResetTrace.push(row);void window.__recordGlobalResetMessage(row);}return super.postMessage(data);}
  };
 });
 // Deferred native loading must not add child entries to joint session history.
 const historyPage=await context.newPage(),historyTrace=[];historyPage.setDefaultTimeout(15000);historyPage.on('framenavigated',frame=>historyTrace.push({top:frame===historyPage.mainFrame(),url:frame.url()}));
 const loaderReady=()=>historyPage.waitForFunction(()=>window.DobbyStitchV7?.ready&&window.DobbyFamilyStitchEngine?.win()?.DobbyFamilyUI.grocery.read().ready);
 await historyPage.goto(new URL('essai-stitch-v7/traverse.html?client=A',base).href);await loaderReady();
 for(const destination of [1,2,3,4]){await historyPage.locator('[data-e01-destination="'+destination+'"]').click();await loaderReady();}
 const previousTop=historyPage.url(),historyHolder=await context.newPage();await historyHolder.goto(new URL('review-manifest.json',base).href);
 await historyHolder.evaluate(()=>{void navigator.locks.request('dobby-review-v7-global-20261112|backend-v1',()=>new Promise(resolve=>{window.__releaseHistoryProbe=resolve;}));});await historyHolder.waitForFunction(()=>typeof window.__releaseHistoryProbe==='function');
 await historyPage.locator('[data-e01-destination="0"]').click();await historyPage.waitForURL(url=>url.pathname.endsWith('/traverse.html'));await historyPage.waitForFunction(()=>document.readyState==='complete');
 const beforeNativeHistory=await historyPage.evaluate(()=>({length:history.length,top:location.href,native:document.getElementById('dv7-engine').contentWindow.location.href}));
 await historyHolder.evaluate(()=>window.__releaseHistoryProbe());await loaderReady();await historyHolder.close();
 const afterNativeHistory=await historyPage.evaluate(()=>({length:history.length,top:location.href,native:document.getElementById('dv7-engine').contentWindow.location.href}));console.log('GLOBAL_LOADER_HISTORY_TRACE',JSON.stringify({beforeNativeHistory,afterNativeHistory}));assert.equal(afterNativeHistory.length,beforeNativeHistory.length,'Deferred engine loading does not append joint session history');
 const finalTop=historyPage.url(),backHolder=await context.newPage();await backHolder.goto(new URL('review-manifest.json',base).href);
 await backHolder.evaluate(()=>{void navigator.locks.request('dobby-review-v7-global-20261112|backend-v1',()=>new Promise(resolve=>{window.__releaseBackProbe=resolve;}));});await backHolder.waitForFunction(()=>typeof window.__releaseBackProbe==='function');
 await historyPage.goBack();
 const backTrace=await historyPage.evaluate(()=>({top:location.href,native:document.getElementById('dv7-engine')?.contentWindow.location.href}));
 assert.equal(backTrace.top,previousTop,'Back must restore the previous top-level route: '+JSON.stringify({backTrace,historyTrace}));
 await historyPage.waitForFunction(()=>{const native=document.getElementById('dv7-engine').contentWindow;return native.location.pathname.endsWith('/essai-stitch-v5-famille/index.html')&&native.document.readyState==='complete';});
 const restoredToken=await historyPage.evaluate(()=>{const native=document.getElementById('dv7-engine').contentWindow;return native.__restoredNativeProbe=crypto.randomUUID();});
 await backHolder.evaluate(()=>window.__releaseBackProbe());await loaderReady();await backHolder.close();assert.equal(await historyPage.evaluate(()=>document.getElementById('dv7-engine').contentWindow.__restoredNativeProbe),restoredToken,'Fixture bootstrap preserves an already history-restored native document');
 await historyPage.goForward();assert.equal(historyPage.url(),finalTop,'Forward restores the top-level route');await loaderReady();await historyPage.close();
 // Hold recovery at its real Web Lock boundary while the V7 document parses.
 // Native inline render/save must not run until the isolated fixture is ready.
 const holder=await context.newPage();await holder.goto(new URL('review-manifest.json',base).href);
 await holder.evaluate(()=>{localStorage.setItem('dobby-review-v7-global-20261112|reset-in-progress','parse-barrier-probe');void navigator.locks.request('dobby-review-v7-global-20261112|backend-v1',()=>new Promise(resolve=>{window.__releaseParseProbe=resolve;}));});
 await holder.waitForFunction(()=>typeof window.__releaseParseProbe==='function');
 const probe=await context.newPage(),nativeRequests=[];probe.on('request',request=>{if(new URL(request.url()).pathname.endsWith('/essai-stitch-v5-famille/index.html'))nativeRequests.push(request.url());});
 await probe.goto(new URL('essai-stitch-v7/famille.html?client=A#salon',base).href,{waitUntil:'domcontentloaded'});
 assert.deepEqual(nativeRequests,[],'Native HTML is not parsed while top fixture recovery is waiting for its browser lock');
 await holder.evaluate(()=>window.__releaseParseProbe());await ready(probe);assert.equal(nativeRequests.length,1,'One native document loads after fixture recovery');assert.deepEqual((await diagnostics(probe)).flatMap(frame=>frame.errors||[]),[],'Native inline initialization waits for fixture readiness');
 await probe.close();await holder.close();
 for(const client of ['A','B']){const page=await context.newPage();page.setDefaultTimeout(15000);page.on('dialog',dialog=>dialog.accept());await page.goto(new URL('essai-stitch-v7/famille.html?client='+client+'#salon',base).href);await ready(page);pages.push(page);
  await page.evaluate(async({client,attachment})=>{
   const native=DobbyFamilyStitchEngine.win();await native.houseStore(new native.Blob(['Native attachment '+client],{type:'text/plain'}),attachment);
   const stored=await native.houseRead(attachment);if(await stored.text()!=='Native attachment '+client)throw Error('Attachment setup failed');
   localStorage.setItem('dobby-cuisine-timers-v1|reset-test','TIMER_'+client);localStorage.setItem('dobby-recipe-import-backup-reset','IMPORT_'+client);sessionStorage.setItem('reset-session-extra','SESSION_'+client);
   await new Promise((resolve,reject)=>{const request=indexedDB.open('global-reset-extra-database',1);request.onupgradeneeded=()=>request.result.createObjectStore('sentinels');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,transaction=db.transaction('sentinels','readwrite');transaction.objectStore('sentinels').put('EXTRA_'+client,'probe');transaction.oncomplete=()=>{window.__resetExtraConnection=db;resolve();};transaction.onerror=()=>reject(transaction.error);};});
  },{client,attachment});
 }
 await pages[0].evaluate(async()=>{
  const raw=Storage.prototype.__reviewRaw;raw.setItem.call(localStorage,'__global_reset_unrelated','KEEP_REAL_STORAGE');raw.setItem.call(localStorage,'dobby-review-e074-20261111|reset-sentinel','KEEP_OLDER_PREVIEW');
  for(const name of ['global-reset-unrelated-database','dobby-review-e074-20261111|reset-database'])await new Promise((resolve,reject)=>{const request=IDBFactory.prototype.open.call(indexedDB,name,1);request.onupgradeneeded=()=>request.result.createObjectStore('sentinels');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,transaction=db.transaction('sentinels','readwrite');transaction.objectStore('sentinels').put('KEEP_UNRELATED_DATABASE','probe');transaction.oncomplete=()=>{db.close();resolve();};transaction.onerror=()=>reject(transaction.error);};});
 });
 try{await Promise.all([...pages.map(page=>page.waitForEvent('load')),pages[0].locator('[data-global-reset]').click()]);}catch(error){console.error('GLOBAL_RESET_COMPLETION_DIAGNOSTIC',JSON.stringify({pages:await Promise.all(pages.map(diagnostics)),messages}));throw error;}
 for(const page of pages){await ready(page);const client=await page.evaluate(()=>DobbyGlobalDemo.client);
  const databases=await page.evaluate(()=>indexedDB.databases());
  assert.ok(!databases.some(database=>database.name.startsWith(prefix)&&database.name.endsWith('global-reset-extra-database')),'Reset deletes extra databases for A and B: '+JSON.stringify(databases));
  assert.equal(await page.evaluate(async attachment=>{const blob=await DobbyFamilyStitchEngine.win().houseRead(attachment);return blob?blob.text():null;},attachment),null,'Native attachment '+client+' is absent after reset');
  assert.equal(await page.evaluate(()=>localStorage.getItem('dobby-cuisine-timers-v1|reset-test')),null,'Timer keys are reset');assert.equal(await page.evaluate(()=>localStorage.getItem('dobby-recipe-import-backup-reset')),null,'Import backups are reset');assert.equal(await page.evaluate(()=>sessionStorage.getItem('reset-session-extra')),null,'Each tab resets its session namespace');
  assert.equal(await page.evaluate(()=>Storage.prototype.__reviewRaw.getItem.call(localStorage,'__global_reset_unrelated')),'KEEP_REAL_STORAGE');assert.equal(await page.evaluate(()=>Storage.prototype.__reviewRaw.getItem.call(localStorage,'dobby-review-e074-20261111|reset-sentinel')),'KEEP_OLDER_PREVIEW');
 }
 for(const name of ['global-reset-unrelated-database','dobby-review-e074-20261111|reset-database'])assert.equal(await pages[0].evaluate(name=>new Promise((resolve,reject)=>{const request=IDBFactory.prototype.open.call(indexedDB,name);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,transaction=db.transaction('sentinels'),read=transaction.objectStore('sentinels').get('probe');read.onsuccess=()=>resolve(read.result);read.onerror=()=>reject(read.error);transaction.oncomplete=()=>db.close();};}),name),'KEEP_UNRELATED_DATABASE');
 // Closing the initiating tab while its reset waits behind a native write must
 // leave a recoverable operation, rather than permanently blocking both clients.
 await pages[1].evaluate(()=>{void navigator.locks.request('dobby-review-v7-global-20261112|backend-v1',()=>new Promise(resolve=>{window.__releaseResetProbe=resolve;}));});
 await pages[1].waitForFunction(()=>typeof window.__releaseResetProbe==='function');
 await pages[0].evaluate(()=>{void DobbyGlobalDemo.reset();});
 await pages[1].waitForFunction(()=>Storage.prototype.__reviewRaw.getItem.call(localStorage,'dobby-review-v7-global-20261112|reset-in-progress'));
 await pages[0].close();await pages[1].evaluate(()=>window.__releaseResetProbe());await pages[1].reload();
 await pages[1].waitForFunction(()=>window.DobbyGlobalDemo);await pages[1].evaluate(()=>DobbyGlobalDemo.ready);await ready(pages[1]);
 assert.equal(await pages[1].evaluate(()=>Storage.prototype.__reviewRaw.getItem.call(localStorage,'dobby-review-v7-global-20261112|reset-in-progress')),null,'An interrupted reset resumes under the browser lock');
 assert.equal(await pages[1].evaluate(()=>Storage.prototype.__reviewRaw.getItem.call(localStorage,'__global_reset_unrelated')),'KEEP_REAL_STORAGE');
 // Reproduce a prepare message queued until a fresh document has already booted.
 // Replay the real message produced above, so a protocol change cannot hide it.
 const stalePrepare=messages.filter(row=>row.direction==='send'&&(row.data==='prepare'||row.data?.type==='prepare')).at(-1)?.data;assert.ok(stalePrepare,'The real reset emitted a prepare message');
 await pages[1].evaluate(data=>{const sender=new BroadcastChannel('dobby-review-v7-global-20261112|reset');sender.postMessage(data);sender.close();},stalePrepare);
 await pages[1].waitForFunction(data=>window.__globalResetTrace.some(row=>row.direction==='receive'&&JSON.stringify(row.data)===JSON.stringify(data)),stalePrepare);
 try{await pages[1].evaluate(()=>DobbyGlobalDemo.sync());}catch(error){console.error('GLOBAL_RESET_STALE_MESSAGE_DIAGNOSTIC',JSON.stringify(await diagnostics(pages[1])));throw error;}
 const staleComplete=messages.filter(row=>row.direction==='send'&&(row.data==='complete'||row.data?.type==='complete')).at(-1)?.data;assert.ok(staleComplete,'The real reset emitted a completion message');let freshNavigations=0;
 pages[1].on('framenavigated',frame=>{if(frame===pages[1].mainFrame())freshNavigations++;});
 await pages[1].evaluate(data=>{const sender=new BroadcastChannel('dobby-review-v7-global-20261112|reset');sender.postMessage(data);sender.close();},staleComplete);
 await pages[1].waitForFunction(data=>window.__globalResetTrace.some(row=>row.direction==='receive'&&JSON.stringify(row.data)===JSON.stringify(data)),staleComplete);
 await pages[1].evaluate(()=>DobbyGlobalDemo.sync());assert.equal(freshNavigations,0,'A delayed completion cannot reload a newly initialized native client');
 const finalDiagnostics=await diagnostics(pages[1]);if(finalDiagnostics.some(frame=>frame.errors?.length))console.error('GLOBAL_RESET_RECOVERY_DIAGNOSTIC',JSON.stringify(finalDiagnostics));
 assert.deepEqual(finalDiagnostics.flatMap(frame=>frame.errors||[]),[],'Recovered top and native frame have no uncaught errors');
 console.log('GLOBAL_RESET_PASS native attachments/A+B timers/import backups/session keys/extra open DBs cleared; unrelated data preserved; interrupted reset recovers; delayed prepare/complete messages are harmless');await context.close();
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});

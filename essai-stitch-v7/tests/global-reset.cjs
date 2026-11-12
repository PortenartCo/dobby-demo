/* Reset real native attachments and all review storage, preserving other data. */
'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const base=new URL(process.env.DOBBY_GLOBAL_RESET_BASE||process.env.DOBBY_GLOBAL_PREVIEW_BASE||'http://127.0.0.1:8765/essai-dobby-v7-global-review-20261112/');
const prefix='dobby-review-v7-global-20261112|',attachment='global-reset-native-attachment';
async function ready(page){await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready&&window.DobbyFamilyStitchEngine?.win()?.DobbyFamilyUI.grocery.read().ready);await page.evaluate(()=>DobbyGlobalDemo.ready);}
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 const context=await browser.newContext({viewport:{width:390,height:900},locale:'fr-BE'}),pages=[];
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
 await Promise.all([...pages.map(page=>page.waitForEvent('load')),pages[0].locator('[data-global-reset]').click()]);
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
 console.log('GLOBAL_RESET_PASS native attachments/A+B timers/import backups/session keys/extra open DBs cleared; unrelated data preserved; interrupted reset recovers');await context.close();
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});

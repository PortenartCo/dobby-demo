/* Hosted preview acceptance: use its shipped fictional seed, never inject state. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{chromium}=require('playwright');
const base=process.env.PREVIEW_BASE,out=process.env.PREVIEW_EVIDENCE;
if(!base?.endsWith('/')||!out)throw Error('PREVIEW_BASE (new directory URL) and PREVIEW_EVIDENCE required.');
fs.mkdirSync(out,{recursive:true});const receipt={base,at:new Date().toISOString(),fixturesOnly:true,checks:[]},hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{const manifest=await (await fetch(base+'review-manifest.json')).json();receipt.sourceSha=manifest.sourceSha;assert.equal(manifest.realBackend,false);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{for(const width of [320,390,768,1440]){
 const c=await browser.newContext({viewport:{width,height:950},locale:'fr-BE',timezoneId:'Europe/Paris',reducedMotion:'reduce',serviceWorkers:'block'}),external=[],missing=[],errors=[];
 await c.route('**/*',r=>{const url=r.request().url();if(!/^https?:/.test(url)||url.startsWith(base))return r.continue();external.push(url);return r.abort();});const p=await c.newPage();p.setDefaultTimeout(20000);
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)missing.push([r.status(),r.url()]);});
 const ready=()=>p.waitForFunction(()=>DobbyStitchV7?.ready&&DobbyFamilyStitch?.ready&&document.readyState==='complete'&&document.querySelector('[data-review-banner]'));
 const state=()=>p.evaluate(()=>DobbyFamilyStitchEngine.read().state),native=(code,data={})=>p.evaluate(({code,data})=>DobbyFamilyStitchEngine.evaluate(code,data),{code,data});
 const shot=async name=>{await p.evaluate(()=>document.fonts.ready);await p.evaluate(async()=>{await Promise.all([...document.querySelectorAll('main img')].filter(i=>i.src).map(i=>i.decode().catch(()=>{})));scrollTo(0,0);});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:path.join(out,name+'-'+width+'.png'),fullPage:!name.includes('confirm')});};
 // Sentinels live in the unwrapped real/old-preview namespace of this fresh test browser.
 await p.goto(base+'review-manifest.json');await p.evaluate(async()=>{localStorage.setItem('dobby-v5-familial-preview-20261108','REAL_SENTINEL');localStorage.setItem('dobby-review-v7-archives-pr17-aeed16e-20261116|sentinel','OLD_PREVIEW_SENTINEL');await new Promise((resolve,reject)=>{const r=indexedDB.open('dobby-v5-familial-files-20261108',1);r.onupgradeneeded=()=>r.result.createObjectStore('docs');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,t=db.transaction('docs','readwrite');t.objectStore('docs').put('REAL_IDB_SENTINEL','sentinel');t.oncomplete=()=>{db.close();resolve();};};});});
 await p.goto(base);await ready();assert.equal((await state()).previewFixture,manifest.previewDirectory);assert.equal(await p.locator('[data-archive-row]').count(),4);
 assert.equal(await p.evaluate(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.getContext()),null);assert.equal(await p.evaluate(()=>Object.keys(DobbyPublicConfig).length),0);
 await p.locator('[data-archives-hero] img').evaluate(img=>img.decode());await shot('entry');
 await p.locator('#archive-search').fill('ÉQUIPEMENT');assert.equal(await p.locator('[data-archive-row]').count(),1);await p.getByRole('button',{name:'Effacer la recherche'}).click();
 const cases=[['documents','familyDocs','final-contract'],['documents','familyDocs','final-document'],['equipment','houseItems','final-equipment'],['recipes','customRecipes','final-recipe']];
 for(const [source,key,id]of cases){
  console.log('HOSTED_NATIVE_CASE',width,id);
  await p.goto(base+'essai-stitch-v7/famille.html#documents');await ready();const row=(await state())[key].find(r=>r.id===id);
  await p.locator('[data-archive-row][data-record='+id+'] [data-fa-action=archive-open]').click();await p.locator('[data-archive-detail-tools]').waitFor();
  if(id==='final-contract'){
   assert.equal(await p.locator('.contracts-piece').count(),2);for(const attachment of ['final-original','final-amendment']){await p.locator('[data-fa-action=rg-contract-file-open][data-attachment='+attachment+']').click();await p.locator('[data-contract-pdf]').waitFor();}
   const bytes=await native('return window.DobbyFamilyContracts.openAttachment("final-contract","final-original").then(b=>b.arrayBuffer()).then(b=>[...new Uint8Array(b)]);');assert.equal(hash(Buffer.from(bytes)),manifest.files.find(r=>r.path==='fixtures/original-fictif.pdf').sha256);
  }
  if(source==='equipment'){assert.equal(await p.locator('.house-plan-summary').count(),2);await p.locator('[data-fa-action=maintenance]').click();await p.locator('.house-log').waitFor();assert.match(await p.locator('main').innerText(),/Historique d’entretien natif/);await p.locator('[data-fa-action=rg-house-file-open]').click();await p.locator('#house-document-preview object').waitFor();await p.locator('[data-fa-action=rg-equipment-open]').click();await p.locator('.house-plan-summary').first().waitFor();}
  if(source==='recipes'){await p.locator('.e074-cover img').evaluate(img=>img.decode());await p.locator('#tab-btn-steps').click();assert.match(await p.locator('#tab-content-steps').innerText(),/Laver et couper/);await p.locator('.e074-instructions .e074-step-photos img').evaluate(img=>img.decode());await p.locator('#mode-tm5-btn').click();assert.match(await p.locator('#tab-content-steps').innerText(),/bol du TM5/);await p.locator('#mode-trad-btn').click();}
  if(id==='final-document'){assert.doesNotMatch(await p.locator('main').innerText(),/Registre des Métadonnées|Consignes du Foyer|Enregistrement et partage/);const download=p.waitForEvent('download');await p.locator('[data-fa-action=rg-doc-download]').click();const file=await download;assert.equal(hash(fs.readFileSync(await file.path())),manifest.files.find(r=>r.path==='fixtures/original-fictif.pdf').sha256);}
  assert.equal(await p.locator('main [data-fa-action=rg-save]:visible:enabled,main [data-fa-action=rg-log-save]:visible:enabled,main [data-fa-action=rg-contract-file-replace]:visible:enabled,main [data-cu-action=edit-recipe]:visible:enabled,main input[type=file]:visible:enabled').count(),0);
  await shot(id+'-archived');const toolbar=p.locator('[data-archive-detail-tools]');
  await toolbar.getByRole('button',{name:'Retour aux Archives',exact:true}).click();await p.waitForURL(/famille.html#documents/);await ready();await p.locator('[data-archive-row][data-record='+id+'] [data-fa-action=archive-open]').click();await p.locator('[data-archive-detail-tools]').waitFor();
  await toolbar.getByRole('button',{name:'Réactiver',exact:true}).click();await p.getByRole('button',{name:'Annuler',exact:true}).click();assert.ok((await state())[key].find(r=>r.id===id).archive.archivedAt);
  await toolbar.getByRole('button',{name:'Réactiver',exact:true}).click();await shot('restore-confirm-'+id);await p.getByRole('button',{name:'Confirmer la réactivation',exact:true}).click();
  const archive=p.locator(source==='recipes'?'[data-cu-action=archive-source]':'[data-fa-action=archive-request]');await archive.waitFor();const restored=(await state())[key].find(r=>r.id===id),strip=r=>{r=structuredClone(r);delete r.archive;return r;};assert.deepEqual(strip(restored),strip(row));assert.equal((await state())[key].filter(r=>r.id===id).length,1);assert.equal(restored.archive.archivedAt,null);
  // Re-archive from the now-active native source, using its real confirmation.
  await archive.click();await p.getByRole('button',{name:'Annuler',exact:true}).click();assert.equal((await state())[key].find(r=>r.id===id).archive.archivedAt,null);
  await archive.click();await p.getByRole('button',{name:'Confirmer l’archivage',exact:true}).click();await p.waitForURL(/famille.html#documents/);await ready();await p.locator('[data-archive-row][data-record='+id+']').waitFor();await p.reload();await ready();assert.ok((await state())[key].find(r=>r.id===id).archive.archivedAt);
  receipt.checks.push({width,source,id,native:true,piecesAndHistory:true,readOnly:true,return:true,cancel:true,reactivate:true,sourceArchive:true,identityAndData:true,reload:true});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);assert.deepEqual(external,[]);
 assert.equal(await p.evaluate(async()=>{try{await fetch('https://dobby-archives-pr17.invalid/rest/v1/forbidden');return false;}catch{return true;}}),true);
 p.on('dialog',d=>d.accept());await Promise.all([p.waitForEvent('load'),p.locator('[data-review-reset]').click()]);await ready();await p.locator('[data-archive-row][data-record=final-recipe] [data-fa-action=archive-open]').click();await p.locator('.e074-cover img').evaluate(img=>img.decode());
 await p.goto(base+'review-manifest.json');assert.equal(await p.evaluate(()=>localStorage.getItem('dobby-v5-familial-preview-20261108')),'REAL_SENTINEL');assert.equal(await p.evaluate(()=>localStorage.getItem('dobby-review-v7-archives-pr17-aeed16e-20261116|sentinel')),'OLD_PREVIEW_SENTINEL');
 assert.equal(await p.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('dobby-v5-familial-files-20261108');r.onsuccess=()=>{const db=r.result,g=db.transaction('docs').objectStore('docs').get('sentinel');g.onsuccess=()=>{resolve(g.result);db.close();};};})),'REAL_IDB_SENTINEL');
 receipt.checks.push({width,resetAndBinaryFixtures:true,realAndOldPreviewStoragePreserved:true,externalRequests:external,missingResources:missing,pageErrors:errors});
 await c.close();console.log('ARCHIVES_HOSTED_PREVIEW_PASS',width,base);
}}finally{await browser.close();}})().then(()=>{receipt.passed=true;}).catch(e=>{receipt.passed=false;receipt.error=e.message;console.error(e);process.exitCode=1;}).finally(()=>fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n'));

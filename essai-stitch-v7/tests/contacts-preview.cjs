/* Verify the actual served preview, namespace/reset and external network boundary. */
const assert=require('node:assert/strict'),crypto=require('node:crypto'),{chromium}=require('playwright');
const base=process.env.DOBBY_CONTACTS_BASE||'http://127.0.0.1:8765/.contacts-preview-local/';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
(async()=>{
 const response=await fetch(new URL('review-manifest.json',base));assert.equal(response.status,200);const manifest=await response.json();assert.equal(manifest.version,'CONTACTS-STITCH24');assert.equal(manifest.realBackend,false);assert.equal(manifest.realAuth,false);assert.equal(manifest.migrationsApplied,false);assert.equal(manifest.illustration.sha256,'b6dcdc9a7765036fcb9ff38089032c4aac832165d0907fc883b8082f6d507cac');
 for(const file of ['essai-stitch-v7/family-register.js','essai-stitch-v7/family-engine.js','essai-stitch-v5-famille/index.html','essai-stitch-v7/templates/remaining/contacts.html','essai-stitch-v7/templates/remaining/contact-edit.html','essai-stitch-v7/assets/contacts/stitch24.png','review-config.js']){const r=await fetch(new URL(file,base));assert.equal(r.status,200,file);assert.equal(sha(Buffer.from(await r.arrayBuffer())),manifest.files.find(row=>row.path===file).sha256,'Served bytes match '+file);}
 assert.equal(sha(Buffer.from(await(await fetch(new URL('review-runtime.js',base))).arrayBuffer())),manifest.runtimeSha256);
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 const c=await b.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'}),external=[],errors=[];

 await c.route('**/*',route=>route.request().url().startsWith(base)?route.continue():(external.push(route.request().url()),route.abort()));
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.dismiss());await p.goto(base);await p.waitForFunction(()=>window.DobbyFamilyStitch?.ready);await p.locator('#contactSearchInput').waitFor();
 await p.evaluate(()=>{const raw=Storage.prototype.__reviewRaw;raw.setItem.call(localStorage,'contacts-unrelated-main','KEEP_MAIN');raw.setItem.call(localStorage,'dobby-review-e09-20261112|contacts-unrelated','KEEP_OTHER_PREVIEW');});
 assert.equal(await p.locator('[data-fa-action=rg-contact-open]').count(),3);assert.equal(await p.locator('nav:visible').count(),1);
 for(const url of await p.locator('nav:visible a').evaluateAll(links=>links.map(link=>link.href))){assert.ok(url.startsWith(base),url);assert.equal((await fetch(url)).status,200);}
 const blocked=await p.evaluate(async()=>{const test=async url=>{try{await fetch(url);return false;}catch{return true;}};return Promise.all([test('https://example.test/forbidden'),test(new URL('../index.html',DobbyReview.root))]);});assert.deepEqual(blocked,[true,true]);
 await p.getByRole('button',{name:'+ Inscrire un nouveau contact',exact:true}).click();await p.locator('#contact-name').fill('DÉMO — Ajout avant remise à zéro');await p.getByRole('button',{name:'Enregistrer',exact:true}).click();await p.waitForFunction(()=>DobbyFamilyStitch.view==='contacts');
 await p.locator('[data-review-reset]').click();assert.equal(await p.locator('[data-fa-action=rg-contact-open]').count(),4,'Dismissed reset retains contacts');
 p.removeAllListeners('dialog');p.on('dialog',d=>d.accept());await p.locator('[data-review-reset]').click();await p.waitForFunction(()=>window.DobbyFamilyStitch?.ready&&DobbyFamilyStitchEngine.read().contacts.length===3);
 const preserved=await p.evaluate(()=>{const raw=Storage.prototype.__reviewRaw;return[raw.getItem.call(localStorage,'contacts-unrelated-main'),raw.getItem.call(localStorage,'dobby-review-e09-20261112|contacts-unrelated')];});assert.deepEqual(preserved,['KEEP_MAIN','KEEP_OTHER_PREVIEW']);assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 console.log('CONTACTS_PREVIEW_PASS',base,'served hashes, fixture, dock, namespaced reset, main/other preview preserved, no external requests');await c.close();
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

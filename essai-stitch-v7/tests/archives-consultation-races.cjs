'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright'),{records}=require('./helpers/archives-final-fixture.cjs'),{pdf}=require('./contracts-fixtures.cjs');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 const c=await browser.newContext({viewport:{width:390,height:900}});await c.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());const p=await c.newPage();p.setDefaultTimeout(15000);p.on('dialog',d=>d.accept());
 const ready=()=>p.waitForFunction(()=>DobbyFamilyStitch?.ready&&document.readyState==='complete');
 const native=(code,data={})=>p.evaluate(({code,data})=>DobbyFamilyStitchEngine.evaluate(code,data),{code,data});
 await p.goto(origin+'/essai-stitch-v7/famille.html#documents');await ready();await native('Object.assign(st,p.seed);custom=st.customRecipes;save();',{seed:records('0'.repeat(64))});
 // A pending file chooser is a live callback created while the record was active.
 await p.evaluate(()=>DobbyFamilyStitch.open('contract',{record:'final-contract'}));
 const [chooser]=await Promise.all([p.waitForEvent('filechooser'),p.locator('[data-fa-action=rg-contract-file-replace]').first().click()]);
 await native('const A=window.DobbyArchiveSources;A.change("documents","final-contract",true,{confirmed:true,expected:A.snapshot("documents","final-contract")});');
 await chooser.setFiles({name:'replacement-fictif.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf())});
 await p.locator('#fa-notice').filter({hasText:/lecture seule|archivée/}).waitFor();
 assert.equal((await p.evaluate(()=>DobbyFamilyStitchEngine.read().state.familyDocs[0])).attachments.length,2,'A stale picker cannot append a replacement');
 console.log('ARCHIVES_CONSULTATION_RACE_PASS pending-file-chooser');
 // An archived autonomous document must retain the existing binary, too.
 await native('return houseStore(new Blob(["ORIGINAL FICTIF"],{type:"application/pdf"}),"family-final-document");');
 await p.evaluate(()=>DobbyFamilyStitch.open('document',{record:'final-document'}));
 const [documentPicker]=await Promise.all([p.waitForEvent('filechooser'),p.locator('label[for=rg-doc-file]').click()]);
 await native('const A=window.DobbyArchiveSources;A.change("documents","final-document",true,{confirmed:true,expected:A.snapshot("documents","final-document")});');
 await documentPicker.setFiles({name:'changed-fictif.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf())});
 await p.waitForFunction(()=>document.querySelector('#fa-notice')?.textContent||DobbyFamilyStitchEngine.read().state.familyDocs.find(r=>r.id==='final-document').attachmentName==='changed-fictif.pdf');
 assert.equal(await native('return st.familyDocs.find(r=>r.id==="final-document").attachmentName;'),'document-fictif.pdf');
 assert.equal(await native('return houseRead("family-final-document").then(b=>b.text());'),'ORIGINAL FICTIF');
 console.log('ARCHIVES_CONSULTATION_RACE_PASS document-pending-file-chooser');
 // Recheck after an asynchronous binary store and roll back only its replacement.
 await native('const A=window.DobbyArchiveSources;A.change("documents","final-document",false,{confirmed:true,expected:A.snapshot("documents","final-document")});const original=houseStore;houseStore=async function(...args){if(args[0].name==="inflight-fictif.pdf")await new Promise(resolve=>window.__archiveWriteRelease=resolve);return original(...args);};');
 await p.evaluate(()=>DobbyFamilyStitch.open('document',{record:'final-document'}));
 const [inflightPicker]=await Promise.all([p.waitForEvent('filechooser'),p.locator('label[for=rg-doc-file]').click()]);
 await inflightPicker.setFiles({name:'inflight-fictif.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf())});
 await p.waitForFunction(()=>typeof DobbyFamilyStitchEngine.win().__archiveWriteRelease==='function');
 await native('const A=window.DobbyArchiveSources;A.change("documents","final-document",true,{confirmed:true,expected:A.snapshot("documents","final-document")});window.__archiveWriteRelease();');
 await p.locator('#fa-notice').filter({hasText:/lecture seule|archivée/}).waitFor();
 assert.equal(await native('return st.familyDocs.find(r=>r.id==="final-document").attachmentName;'),'document-fictif.pdf');
 assert.equal(await native('return houseRead("family-final-document").then(b=>b.text());'),'ORIGINAL FICTIF');
 console.log('ARCHIVES_CONSULTATION_RACE_PASS document-archive-during-binary-write');
 // A different accepted writer must never be overwritten by a stale rollback.
 await native('const A=window.DobbyArchiveSources;A.change("documents","final-document",false,{confirmed:true,expected:A.snapshot("documents","final-document")});const raw=houseStore;window.__concurrentStore=raw;houseStore=async function(...args){if(args[0].name==="concurrent-slow.pdf")await new Promise(resolve=>window.__concurrentRelease=resolve);return raw(...args);};');
 await p.evaluate(()=>DobbyFamilyStitch.open('document',{record:'final-document'}));
 const [slowPicker]=await Promise.all([p.waitForEvent('filechooser'),p.locator('label[for=rg-doc-file]').click()]);
 await slowPicker.setFiles({name:'concurrent-slow.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf())});
 await p.waitForFunction(()=>typeof DobbyFamilyStitchEngine.win().__concurrentRelease==='function');
 await native('return window.__concurrentStore(new Blob(["CONCURRENT B"],{type:"application/pdf"}),"family-final-document").then(()=>{st.familyDocs.find(r=>r.id==="final-document").attachmentName="concurrent.pdf";save();window.__concurrentRelease();});');
 await p.locator('#fa-notice').filter({hasText:/changé|modifi/}).waitFor();
 assert.equal(await native('return st.familyDocs.find(r=>r.id==="final-document").attachmentName;'),'concurrent.pdf');
 assert.equal(await native('return houseRead("family-final-document").then(b=>b.text());'),'CONCURRENT B');
 console.log('ARCHIVES_CONSULTATION_RACE_PASS concurrent-binary-writer-retained');
 // Stale restore confirmation must leave the concurrent row untouched.
 await p.evaluate(()=>DobbyFamilyStitch.open('contract',{record:'final-contract',origin:'archives'}));
 await p.locator('[data-archive-detail-tools] [data-fa-action=archive-reactivate]').click();
 await native('st.familyDocs[0].note="DÉMO — Concurrent";save();');
 await p.getByRole('button',{name:'Confirmer la réactivation',exact:true}).click();
 assert.match(await p.locator('#archive-confirm [role=alert]').innerText(),/modifié/);
 assert.ok((await p.evaluate(()=>DobbyFamilyStitchEngine.read().state.familyDocs[0])).archive.archivedAt);
 await p.getByRole('button',{name:'Annuler',exact:true}).click();
 console.log('ARCHIVES_CONSULTATION_RACE_PASS stale-restore-confirmation');
 // The detail toolbar observes native rights, including direct action dispatch.
 await native('st.familyMembers=[{id:"final-child",name:"DÉMO — Enfant",memberCategory:"child"}];window.DobbyReview=Object.freeze({demoMemberId:"final-child"});save();');
 await p.evaluate(()=>DobbyFamilyStitch.open('contract',{record:'final-contract',origin:'archives'}));
 assert.equal(await p.locator('[data-archive-detail-tools] [data-fa-action=archive-reactivate]').isDisabled(),true);
 const denied=await p.evaluate(()=>{try{DobbyArchivesUI.act('archive-reactivate',{dataset:{source:'documents',record:'final-contract'}});return 'ALLOWED';}catch(e){return e.message;}});assert.match(denied,/lecture seule|parent/);
 console.log('ARCHIVES_CONSULTATION_RACE_PASS denied-detail-restore');
 await native('st.familyMembers=[{id:"final-child",name:"DÉMO — Parent",memberCategory:"parent"}];const A=window.DobbyArchiveSources;A.change("recipes","final-recipe",true,{confirmed:true,expected:A.snapshot("recipes","final-recipe")});save();');
 await p.goto(origin+'/essai-stitch-v7/index.html#recipe?id=final-recipe');await p.waitForFunction(()=>DobbyCuisine?.ready&&document.querySelector('[data-archive-detail-tools]'));
 // A synchronised reactivation must never turn the old return arrow into Archiver.
 await p.evaluate(()=>{const back=document.querySelector('[data-archive-detail-tools] button');const A=DobbyFamilyStitchEngine.win().DobbyArchiveSources;A.change('recipes','final-recipe',false,{confirmed:true,expected:A.snapshot('recipes','final-recipe')});back.click();});
 await p.waitForURL(/famille.html#documents/);await ready();assert.equal(await p.locator('#archive-confirm').count(),0);
 console.log('ARCHIVES_CONSULTATION_RACE_PASS recipe-return-after-concurrent-restore');
 await c.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

/* Browser delivery check for the packaged preview, with zero external transport. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const base=process.env.DOBBY_NOTES_PREVIEW||'http://127.0.0.1:8873/';
const out=path.resolve(process.env.DOBBY_NOTES_PREVIEW_EVIDENCE||path.join(__dirname,'../../docs/dobby-v7/notes-stitch23/evidence/preview'));
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:900},locale:'fr-BE',reducedMotion:'reduce'}),external=[],errors=[];
  const root=new URL(base);
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===root.origin)return route.continue();external.push(url.origin+url.pathname);return route.abort();});
  await context.addInitScript(()=>localStorage.setItem('dobby-review-v7-menu-20261112|sentinel','outside-notes-untouched'));
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base);await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready&&DobbyFamilyStitch.view==='memos');
  assert.equal(await page.evaluate(()=>DobbyReview.version),'V7-NOTES-STITCH23');
  assert.match(await page.locator('main').textContent(),/DÉMO — Préparer la soirée en famille/);
  assert.doesNotMatch(await page.locator('main').textContent(),/Anciens mémos locaux|Foyer non connecté|Synchroniser/);
  await page.locator('.fam-notes-illustration img').waitFor();
  await page.screenshot({path:path.join(out,'isolated-390.png'),fullPage:true});
  const action=name=>page.locator('[data-fa-action="'+name+'"]').first();
  const localBefore=await page.evaluate(()=>DobbyFamilyStitchEngine.read().state.familyNotes);
  await action('rg-memo-new').click();await page.locator('#memo-title').fill('DÉMO — Mémo de recette isolée');await page.locator('#memo-body').fill('Créé avec le formulaire et le writer natifs.');await page.locator('#tag-input').fill('démo, recette');await action('rg-save').click();
  await page.waitForFunction(()=>DobbyFamilyStitch.view==='memos');
  const saved=await page.evaluate(()=>DobbyFamilyStitchEngine.read().state.sharedFamilyNotes.find(row=>row.title==='DÉMO — Mémo de recette isolée'));assert.ok(saved?.id);
  await page.reload();await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);
  assert.equal(await page.evaluate(id=>DobbyFamilyStitchEngine.read().state.sharedFamilyNotes.some(row=>row.id===id),saved.id),true);
  assert.deepEqual(await page.evaluate(()=>DobbyFamilyStitchEngine.read().state.familyNotes),localBefore);
  assert.equal(await page.evaluate(()=>Storage.prototype.__reviewRaw.getItem.call(localStorage,'dobby-review-v7-menu-20261112|sentinel')),'outside-notes-untouched');
  const storageKeys=await page.evaluate(()=>Object.keys(localStorage));assert.ok(storageKeys.some(key=>key.startsWith('dobby-review-v7-notes-stitch23-20261116|')));
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({base,nativeFormAndWriter:true,reloadPersists:true,localNotesRetained:true,otherPreviewUntouched:true,realAccountsTested:false,externalRequests:external,errors},null,2)+'\n');
  console.log('NOTES_PREVIEW_PASS',base);await context.close();
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

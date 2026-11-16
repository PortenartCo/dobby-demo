/* Real native memo UI with disposable fictitious storage; all remote requests blocked. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8863';
const baseline=process.argv.includes('--baseline');
const out=path.resolve(process.env.DOBBY_NOTES_EVIDENCE||path.join(__dirname,'../../docs/dobby-v7/notes-stitch23/evidence'),baseline?'before':'after');
const body='La lanterne est dans le placard.\nÀ emporter pour la veillée familiale.\n\n'+('Texte long de démonstration pour vérifier la lecture du mémo. '.repeat(35))+'\n'+('parchemin'.repeat(40));
const legacy={id:'notes-local-fixture',title:'TEST — Carnet conservé',body:'Ancienne consigne fictive : nourrir le chat avant le départ.',tags:'local, historique'};
const fixture={id:'notes-shared-fixture',title:'TEST — Préparer la veillée '+('étoiles'.repeat(16)),body,tags:'maison, veillée, '+('motcle'.repeat(32))};
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const results=[];
 try{for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900},locale:'fr-BE',timezoneId:'Europe/Paris',reducedMotion:'reduce'});
  await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  const page=await context.newPage(),errors=[];let accept=false;
  page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>accept?dialog.accept():dialog.dismiss());
  const open=(view,values={})=>page.evaluate(({view,values})=>DobbyFamilyStitch.open(view,values),{view,values});
  const state=()=>page.evaluate(()=>DobbyFamilyStitchEngine.read().state);
  const action=value=>page.locator('[data-fa-action="'+value+'"]').first();
  const view=value=>page.waitForFunction(value=>DobbyFamilyStitch.view===value,value);
  const size=locator=>locator.evaluate(element=>parseFloat(getComputedStyle(element).fontSize));
  const capture=name=>page.screenshot({path:path.join(out,`${name}-${width}.png`),fullPage:true});
  async function chrome(){
   assert.equal(await page.locator('body > header').count(),1);assert.equal(await page.locator('body > nav').count(),1);
   assert.equal(await page.locator('body > nav a').count(),6);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow');
   if(!baseline&&['memos','memo-edit'].includes(await page.evaluate(()=>DobbyFamilyStitch.view))){
    assert.doesNotMatch(await page.locator('main').innerText(),/Anciens mémos locaux|Foyer non connecté|Synchroniser/);
    assert.equal(await page.locator('main [data-fa-action=family-sync]').count(),0);
    for(const button of await page.locator('main .fa-button').all())assert.ok(await size(button)>=16,'readable memo action');
   }
  }
  async function form(){
   assert.equal(await page.locator('#rg-form input,#rg-form textarea').count(),3,'unchanged fields');
   if(!baseline)for(const input of await page.locator('#rg-form input,#rg-form textarea,#rg-form label').all())assert.ok(await size(input)>=16,'readable form');
   await chrome();
  }
  await page.goto(origin+'/essai-stitch-v7/famille.html');await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);
  await page.evaluate(({legacy,fixture})=>DobbyFamilyStitchEngine.evaluate('st.familyNotes=[p.legacy];st.sharedFamilyNotes=[p.fixture];save();',{legacy,fixture}),{legacy,fixture});
  await open('menu');await action('memos').click();await view('memos');
  await capture('list');
  if(!baseline){
   const img=page.locator('main .fam-notes-illustration img');
   await img.waitFor();await page.waitForFunction(()=>document.querySelector('.fam-notes-illustration img')?.complete);
   const image=await img.evaluate(el=>({width:el.naturalWidth,height:el.naturalHeight,fit:getComputedStyle(el).objectFit}));
   assert.deepEqual(image,{width:1376,height:768,fit:'contain'});
   const banner=await page.locator('.fam-notes-illustration').boundingBox();assert.equal(banner.height,width>=768?220:155);
   const heading=await page.locator('main h1').boundingBox(),add=await action('rg-memo-new').boundingBox(),query=await page.locator('#memoSearchInput').boundingBox();
   assert.ok(banner.y>=heading.y+heading.height&&add.y>=banner.y+banner.height&&query.y>=add.y+add.height,'title, image, add, search order');
   assert.equal(await page.locator('.fam-notes-illustration button,.fam-notes-illustration a,.fam-notes-illustration figcaption').count(),0);
   assert.ok(query.y+query.height<810,'add and search accessible above dock');
   assert.ok(await size(page.locator('.fam-review-query'))>=15);
   assert.ok(await size(page.locator('#memoSearchInput'))>=16);
   assert.ok(await size(page.locator('[data-rg-memos] h3').first())>=18);
   assert.ok(await size(page.locator('[data-rg-memos] .fa-note').first())>=16);
   assert.ok(await size(page.locator('[data-rg-memos] .fam-review-tag-line').first())>=14);
   assert.equal(await action('rg-memo-local-open').count(),1,'local note immediately available');
  }
  await chrome();assert.deepEqual((await state()).familyNotes,[legacy]);assert.deepEqual((await state()).sharedFamilyNotes,[fixture]);
  for(const query of ['PRÉPARER','lanterne','veillée','historique']){
   await page.locator('#memoSearchInput').fill(query);
   assert.equal(await page.locator('main .fam-review-record').count(),1,'search title, body, tags and local notes');
  }
  await page.locator('#memoSearchInput').fill('aucun-resultat-fixture');
  assert.match(await page.locator('[data-rg-memos]').textContent(),/Aucun mémo/);
  if(!baseline)assert.ok(await size(page.locator('[data-rg-memos] .fa-note'))>=16);
  await capture('empty');await action('rg-memo-query-clear').click();
  await action('rg-memo-new').click();await page.locator('#memo-title').fill('TEST — Nouveau mémo');await page.locator('#memo-body').fill(body);await page.locator('#tag-input').fill('famille, fictif');await form();await capture('create');
  await action('rg-save').click();await view('memos');
  const created=(await state()).sharedFamilyNotes.find(row=>row.title==='TEST — Nouveau mémo');assert.ok(created.id);
  await page.locator('[data-fa-action=rg-memo-open][data-record="'+created.id+'"]').click();await view('memo-edit');
  assert.equal(await page.locator('[data-fam-memo-read] .fam-review-body').textContent(),body);
  if(!baseline)assert.ok(await size(page.locator('[data-fam-memo-read] .fam-review-body'))>=16);
  await chrome();await capture('read');await action('rg-memo-edit').click();await form();
  await page.locator('#memo-body').fill(body+'\nModifié et conservé.');await capture('edit');await action('rg-save').click();await view('memos');
  await page.reload();await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);await open('memos');
  const updated=(await state()).sharedFamilyNotes.find(row=>row.id===created.id);assert.equal(updated.body,body+'\nModifié et conservé.');assert.deepEqual((await state()).familyNotes,[legacy]);
  const summary=page.locator('[data-e09-legacy] summary');if(await summary.count())await summary.click();
  await action('rg-memo-local-open').click();await view('memo-edit');assert.match(await page.locator('[data-fam-memo-read]').textContent(),/Ancienne consigne fictive/);await chrome();await capture('local-read');
  await action('rg-memo-local-edit').click();await form();await page.locator('#memo-body').fill(legacy.body+' Consigne mise à jour.');await action('rg-save').click();await view('memos');
  assert.equal((await state()).familyNotes[0].id,legacy.id);assert.equal((await state()).familyNotes[0].body,legacy.body+' Consigne mise à jour.');assert.equal((await state()).sharedFamilyNotes.length,2,'no automatic import');
  if(await summary.count())await summary.click();await action('rg-memo-import').click();assert.equal((await state()).sharedFamilyNotes.length,2,'cancel import');
  accept=true;await action('rg-memo-import').click();await view('memos');
  assert.equal((await state()).sharedFamilyNotes.length,3);assert.equal((await state()).familyNotes.length,1);
  if(await summary.count())await summary.click();await action('rg-memo-import').click();assert.equal((await state()).sharedFamilyNotes.length,3,'idempotent explicit import');
  accept=false;
  await page.locator('[data-fa-action=rg-memo-open][data-record="'+created.id+'"]').click();await action('rg-memo-delete').click();assert.equal((await state()).sharedFamilyNotes.length,3,'cancel delete');accept=true;await action('rg-memo-delete').click();await view('memos');assert.equal((await state()).sharedFamilyNotes.length,2);assert.equal((await state()).familyNotes.length,1);
  await open('memo-edit',{record:fixture.id,scope:'shared',mode:'read',origin:'salon'});await chrome();await action('rg-back').click();await view('salon');await chrome();await open('memos');await chrome();
  if(!baseline){
   for(const status of ['Conflit à résoudre','Erreur de synchronisation']){
    await page.evaluate(status=>{const current=DobbyRegister.current;DobbyRegister.render('memos',{...current,data:{...DobbyFamilyStitchEngine.read(),status}});},status);
    assert.equal(await page.locator('main [role=alert]').textContent(),status==='Conflit à résoudre'?status+'Conserver la version du foyerConserver mes modifications':status);
    assert.equal(await page.locator('main [data-fa-action=family-sync]').count(),0);
    assert.equal(await page.locator('main [data-fa-action=family-server]').count(),status==='Conflit à résoudre'?1:0);
   }
  }
  assert.deepEqual(errors,[]);
  results.push({width,nativeCrud:true,stableId:true,longText:true,searchTitleBodyTagsAndLocal:true,localRetained:true,noAutomaticImport:true,explicitIdempotentImport:true,oneHeaderDock:true,errors});
  console.log('NOTES_STITCH23_'+(baseline?'BASELINE':'PASS'),width);await context.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({baseline,realAccountsTested:false,results},null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});

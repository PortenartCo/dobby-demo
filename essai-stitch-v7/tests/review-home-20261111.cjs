/* A/B review: real native writers in temporary profiles, external requests blocked.
   Catches: a dead manual reopening action, duplicate rewards, implicit/broken
   automatic-source access, an unbanded quick basket, or a second basket. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8891';
const phase=process.env.DOBBY_REVIEW_BASELINE?'before':'after';
const out=path.resolve(__dirname,'../../docs/dobby-v7/evidence/review-e01-e05/home');
const observations=[],failures=[];
const verify=(condition,label)=>{if(!condition)failures.push(label);};
const baselineSources=process.env.DOBBY_REVIEW_BASELINE_REF?Object.fromEntries(['home.js','home-consolidation.css'].map(file=>[file,require('node:child_process').execFileSync('git',['show',process.env.DOBBY_REVIEW_BASELINE_REF+':essai-stitch-v7/'+file],{cwd:path.resolve(__dirname,'../..'),encoding:'utf8'})])):null;
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},locale:'fr-BE',timezoneId:'Europe/Brussels',reducedMotion:'reduce'});
  await context.route('**/*',route=>{const url=route.request().url(),file=new URL(url).pathname.split('/').at(-1);if(url.startsWith(origin+'/'))return baselineSources?.[file]?route.fulfill({status:200,contentType:file.endsWith('.css')?'text/css':'application/javascript',body:baselineSources[file]}):route.continue();return route.abort();});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  const ready=()=>page.waitForFunction(()=>window.DobbyStitchV7?.ready&&DobbyFamilyStitchEngine.win().DobbyFamilyMissions?.available);
  const native=code=>page.evaluate(code=>DobbyFamilyStitchEngine.evaluate(code),code);
  const home=async()=>{await page.goto(origin+'/essai-stitch-v7/traverse.html');await ready();};
  const refresh=()=>page.evaluate(()=>DobbyStitchV7.refresh());
  const manual=()=>page.locator('[data-e01-mission="review-manual"]'),check=()=>page.locator('[data-e01-complete="review-manual"]');
  await home();
  await native(`st.familyMembers=[{id:'review-member',name:'TEST — Camille',avatar:'🧙'}];st.manualMissions=[{id:'review-manual',title:'TEST — Préparer la maison',category:'Famille',note:'Mission fictive de contrôle',due:todayISO(),assigneeId:'review-member',status:'open',effort:'regular',rewardVersion:1,createdAt:'2026-11-11T08:00:00Z',completedAt:''}];st.runeCredits=[];st.runeRequests=[];st.runeSyncRequired=false;st.houseItems=[{id:'review-equipment',name:'TEST — Chaudière',nextMaintenance:addDays(todayISO(),14)}];st.familyDocs=[{id:'review-document',title:'TEST — Contrat',category:'Contrats',deadline:addDays(todayISO(),30)}];st.autoTasks=[{key:'review-orphan',title:'TEST — Source supprimée',sourceLabel:'Ancienne fiche',origin:'equipment',originId:'removed',due:todayISO(),state:'done',completedAt:'2026-11-10T08:00:00Z'}];st.planned={};st.familyEvents=[];st.famHealth=[];st.sharedHealthVisits=[];st.shopFinal={id:'review-basket',e072:true,items:[],meals:[],imports:[]};st.extras=[];save();`);
  await refresh();
  await check().click();
  for(const id of ['review-equipment','review-document'])await page.locator(`[data-e01-complete*="${id}"]`).click();
  assert.equal(await native('return st.manualMissions[0].status;'),'done');
  const ledger=await native('return {credits:st.runeCredits,requests:st.runeRequests};');
  assert.equal(ledger.credits.length,1);assert.equal(ledger.credits[0].amount,25);
  assert.equal(await check().getAttribute('aria-pressed'),'true');
  assert.equal(await manual().locator('h3').evaluate(e=>e.classList.contains('line-through')),true);
  assert.match(await page.locator('[data-e01-count]').innerText(),/0 actives · 4 terminées/);
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:path.join(out,`${phase}-home-${width}.png`),fullPage:true});
  await page.locator('[data-e01-quick]').screenshot({path:path.join(out,`${phase}-courses-${width}.png`)});
  // Distinguish an automatic task deliberately controlled by its source from a
  // manual task whose native toggle must reopen and survive a reload.
  const automatic=await page.locator('[data-e01-mission][data-e01-kind=automatic]').evaluateAll(cards=>cards.map(card=>({id:card.dataset.e01Mission,href:card.dataset.e01Href,role:card.getAttribute('role'),disabled:card.querySelector('[data-e01-complete]').disabled,text:card.innerText,links:[...card.querySelectorAll('a[href]')].map(a=>({href:a.getAttribute('href'),text:a.textContent}))})));
  for(const id of ['review-equipment','review-document']){
   const task=automatic.find(t=>t.id.includes(id));assert.ok(task);assert.equal(task.disabled,true);
   verify(task.links.some(link=>link.href.includes('record='+id)),`${width}: automatic ${id} has explicit source access`);
   verify(/[Rr]éouverture.*(?:indisponible|impossible)|(?:indisponible|impossible).*[Rr]éouverture/.test(task.text),`${width}: automatic task explains why reopening is unavailable`);
  }
  const orphan=automatic.find(t=>t.id==='review-orphan');
  verify(!orphan.href&&orphan.role!=='link'&&/source indisponible/i.test(orphan.text),`${width}: removed source is read-only without a broken route`);
  const bands=await page.evaluate(()=>{
   const meal=document.querySelector('[data-e01-meal]'),quick=document.querySelector('[data-e01-quick] > div'),gazette=document.querySelector('[data-e013b-card]');
   const read=card=>{const header=card.firstElementChild,h=header.querySelector('h2'),css=getComputedStyle(header),title=h&&getComputedStyle(h);return {band:!!h,icon:header.querySelector('.material-symbols-outlined')?.textContent,background:css.backgroundColor,border:css.borderBottom,padding:[css.paddingTop,css.paddingRight,css.paddingBottom,css.paddingLeft],font:title&&[title.fontFamily,title.fontSize,title.fontWeight,title.lineHeight],headerHeight:header.getBoundingClientRect().height,cardWidth:card.getBoundingClientRect().width};};
   return {meal:read(meal),quick:read(quick),gazette:read(gazette),width:document.documentElement.scrollWidth};
  });
  verify(bands.quick.band&&bands.quick.icon==='shopping_basket',`${width}: Courses has a common header band and its icon`);
  for(const key of ['background','border','padding','font'])verify(JSON.stringify(bands.quick[key])===JSON.stringify(bands.meal[key])&&JSON.stringify(bands.quick[key])===JSON.stringify(bands.gazette[key]),`${width}: Courses ${key} matches Repas/Gazette`);
  assert.equal(bands.width,width,'no horizontal overflow');
  await check().click();assert.match(page.url(),/traverse.html$/);
  assert.equal(await native('return st.manualMissions[0].status;'),'open');
  assert.equal(await check().getAttribute('aria-pressed'),'false');
  assert.equal(await check().locator('span').first().textContent(),'radio_button_unchecked');
  assert.equal(await manual().locator('h3').evaluate(e=>e.classList.contains('line-through')),false);
  assert.match(await manual().innerText(),/À faire/i);
  assert.match(await page.locator('[data-e01-count]').innerText(),/1 actives · 3 terminées/);
  assert.deepEqual(await native('return {credits:st.runeCredits,requests:st.runeRequests};'),ledger,'reopening preserves earned runes');
  await page.reload();await ready();assert.equal(await check().getAttribute('aria-pressed'),'false');
  assert.equal(await native('return JSON.parse(localStorage.getItem(key)).manualMissions[0].status;'),'open');
  await page.goto(origin+'/essai-stitch-v7/missions.html');await ready();
  assert.equal(await page.locator('[data-e03-card="review-manual"]').count(),1,'E03 sees reopened task');
  await page.locator('[data-e03-status=done]').click();assert.equal(await page.locator('[data-e03-card="review-manual"]').count(),0);
  assert.equal(await page.locator('[data-e03-card][data-e03-kind=auto]').count(),3);
  await home();await check().click();
  assert.equal(await check().getAttribute('aria-pressed'),'true');
  assert.deepEqual(await native('return {credits:st.runeCredits,requests:st.runeRequests};'),ledger,'second completion cannot reward twice');
  await page.reload();await ready();assert.equal(await check().getAttribute('aria-pressed'),'true');
  assert.deepEqual(await native('return {credits:st.runeCredits,requests:st.runeRequests};'),ledger);
  await page.goto(origin+'/essai-stitch-v7/missions.html');await ready();await page.locator('[data-e03-status=done]').click();
  assert.equal(await page.locator('[data-e03-card="review-manual"]').count(),1,'E03 sees recompleted task');
  await home();
  if(phase==='after')for(const id of ['review-equipment','review-document']){
   await page.locator(`[data-e01-mission][data-e01-kind=automatic] a[href*="record=${id}"]`).click();
   await page.waitForURL(new RegExp('record='+id));await ready();
   assert.match(await page.locator('main').innerText(),id==='review-equipment'?/TEST — Chaudière/:/TEST — Contrat/);
   assert.equal(await native(`return st.autoTasks.find(t=>t.originId==='${id}').state;`),'done','visiting the source never simulates reopening');
   await home();
  }
  await page.locator('[data-e01-quick-input]').fill('TEST — Pain gris');await page.locator('[data-e01-quick-add]').click();
  await page.waitForFunction(()=>DobbyCuisineList.snapshot(DobbyCuisineEngine).items.length===1);
  await page.locator('[data-e01-quick-input]').fill('TEST — Pain gris');await page.locator('[data-e01-quick-add]').click();
  await page.waitForFunction(()=>document.querySelector('[data-e01-quick-notice]')?.textContent.includes('Aucun doublon'));
  await page.reload();await ready();
  assert.deepEqual(await page.evaluate(()=>DobbyCuisineList.snapshot(DobbyCuisineEngine).items.map(x=>x.name)),['TEST — Pain gris']);
  assert.equal(await native('return st.shopFinal.id;'),'review-basket','quick add preserves the existing basket');
  await page.locator('[data-e01-quick-open]').click();await page.waitForURL(/index.html#shop/);await ready();
  assert.match(await page.locator('main').innerText(),/TEST — Pain gris/);
  assert.deepEqual(errors,[]);observations.push({width,manualReopen:'PASS including reload/E03',runes:'25 once including recompletion/reload',basket:'same native basket, persisted, duplicate avoided, visible in E07',automatic,bands});
  await context.close();console.log('REVIEW_HOME_'+phase.toUpperCase(),width,'native manual reopening/recompletion/runes/E03/basket PASS');
 }}finally{await browser.close();fs.writeFileSync(path.join(out,`${phase}-results.json`),JSON.stringify({phase,observations,failures},null,2)+'\n');}
 assert.deepEqual(failures,[],`${phase}: source access and common Courses header`);
})().catch(error=>{console.error(error);process.exitCode=1;});

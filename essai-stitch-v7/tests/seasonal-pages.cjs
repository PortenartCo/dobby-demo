/* Missing route dressing, stale hosts and OFF leaks must fail on real native pages.
   All contexts are disposable and external traffic is blocked. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
const base=process.env.DOBBY_SEASONAL_BASE||origin+'/essai-stitch-v7/';
const out=process.env.DOBBY_SEASONAL_PAGES_EVIDENCE||fs.mkdtempSync(path.join(os.tmpdir(),'dobby-seasonal-pages-'));
const reference=process.argv.includes('--reference');
const events={christmas:'2026-12-25',halloween:'2026-10-31','new-year':'2026-12-31'};
const pages=['home','missions','meals','shopping','family','menu'];
async function ready(p,index){
 await p.waitForFunction(index=>{if(!window.DobbyStitchV7?.ready||document.documentElement.classList.contains('dv7-loading'))return false;const b=document.body.dataset;return [()=>b.dv7Screen==='traverse'&&!b.familyView,()=>b.dv7Screen==='missions'&&!b.familyView,()=>b.cuisineView==='taverne',()=>b.cuisineView==='shop',()=>b.familyView==='salon',()=>b.familyView==='menu'][index]();},index);
}
async function preferences(p,enabled){await p.evaluate(enabled=>{DobbyFamilyStitchEngine.evaluate('st.stitchPreferences={...st.stitchPreferences,effects:false,sound:false,seasonalDecorations:p.enabled};save();',{enabled});DobbyChrome.apply();},enabled);}
const bars=p=>p.evaluate(()=>Object.fromEntries(['header','nav'].map(tag=>{const r=document.querySelector('body>'+tag).getBoundingClientRect();return[tag,{x:r.x,y:r.y,w:r.width,h:r.height}];})));
async function visit(p,index){await p.locator('body>nav [data-e01-destination="'+index+'"]').click();await ready(p,index);}
async function cleanDetail(p){assert.equal(await p.locator('main [data-seasonal-decoration],main [data-seasonal-page-host],main [data-seasonal-section-host]').count(),0,'Forms and details keep only the shared event header');assert.equal(await p.locator('[data-seasonal-header]').count(),1);}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const results=[];
 try{for(const width of (reference?[390,1440]:[320,390,768,1440])){
  const c=await browser.newContext({viewport:{width,height:960},locale:'fr-BE',timezoneId:'Europe/Brussels',reducedMotion:'no-preference',serviceWorkers:'block'});await c.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(15000);
  await p.clock.setFixedTime(new Date('2026-12-25T12:00Z'));await p.goto(base+'traverse.html');await ready(p,0);await preferences(p,true);
  const business=()=>p.evaluate(()=>DobbyFamilyStitchEngine.evaluate('return JSON.stringify({missions:st.manualMissions,meals:st.planned,contacts:st.famContacts,members:st.familyMembers});'));
  const records=await business();
  for(const [event,date]of Object.entries(events)){
   await p.clock.setFixedTime(new Date(date+'T12:00Z'));await p.evaluate(()=>window.dispatchEvent(new Event('focus')));
   for(let index=0;index<6;index++){
    if(index)await visit(p,index);else{await visit(p,0);}
    await p.waitForFunction(event=>document.documentElement.dataset.seasonalTheme===event,event);
    await preferences(p,false);const chrome=await bars(p),headingText=await p.locator('main h1').textContent(),images=await p.locator('main img').evaluateAll(nodes=>nodes.map(n=>({src:n.getAttribute('src'),width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));
    await preferences(p,true);
    if(!reference){
     assert.ok(await p.locator('main [data-seasonal-decoration] svg use').count()>=2,event+' has recognisable vector motifs in '+pages[index]+' content, beyond the global header');
     if(index===0)assert.equal(await p.locator('[data-seasonal-scene]').count(),1);else{assert.equal(await p.locator('[data-seasonal-scene],[data-seasonal-welcome]').count(),0,'The home frame is not copied to '+pages[index]);assert.equal(await p.locator('main [data-seasonal-page]').count(),1,'One dressed main heading or ledger');}
     const metric=await p.evaluate(()=>({width:document.documentElement.scrollWidth,nodes:document.querySelectorAll('[data-seasonal-decoration],[data-seasonal-decoration] *').length,pointers:[...document.querySelectorAll('[data-seasonal-decoration],[data-seasonal-decoration] *')].every(n=>getComputedStyle(n).pointerEvents==='none'),animations:document.getAnimations().filter(a=>a.animationName?.startsWith('seasonal-')).length,validUses:[...document.querySelectorAll('main [data-seasonal-decoration] use')].every(n=>document.querySelector(n.getAttribute('href'))),libraries:document.querySelectorAll('#seasonal-symbol-library').length}));
     assert.ok(metric.width<=width+1,'No overflow on '+pages[index]+' '+width);assert.ok(metric.nodes<420,'Bounded shared SVG population');assert.ok(metric.pointers&&metric.validUses);assert.equal(metric.libraries,1);assert.equal(metric.animations,0,'Effects OFF retains a complete static identity');
     assert.deepEqual(await bars(p),chrome,'Fixed native chrome dimensions are unchanged');assert.deepEqual(await p.locator('main img').evaluateAll(nodes=>nodes.map(n=>({src:n.getAttribute('src'),width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height}))),images,'Original image sources and proportions retained');
     assert.equal(await p.locator('main h1').textContent(),headingText,'Native heading text is unchanged, including hidden DOM text');
     assert.equal(await p.locator('[data-seasonal-section-host]').evaluateAll(hosts=>hosts.every(host=>[...host.children].filter(n=>!n.matches('[data-seasonal-decoration]')&&n.textContent.trim()&&getComputedStyle(n).position==='absolute').every(n=>(parseInt(getComputedStyle(n).zIndex)||0)>(parseInt(getComputedStyle(host.querySelector('[data-seasonal-section]')).zIndex)||0)))),true,'Native illustration captions remain painted above the ornaments');
     await p.evaluate(()=>{for(let i=0;i<12;i++)DobbyChrome.apply();});assert.equal(await p.locator('[data-seasonal-header]').count(),1);assert.equal(await p.locator('main [data-seasonal-page]').count(),index?1:0,'Repeated native refresh has no duplicate');
     if(index===5){await p.locator('#global-module-search').fill('maison');assert.equal(await p.locator('#menu-sections .module-item:not([hidden])').count(),1,'Menu search remains usable under the ornaments');await p.locator('#global-module-search').fill('');await p.locator('#global-module-search').blur();}
    }
    if(width===390||width===1440){await p.addStyleTag({content:'.seasonal-caption{visibility:hidden!important}'});await p.screenshot({path:path.join(out,`${reference?'before':'after'}-${event}-${pages[index]}-${width}.png`),scale:'css'});}
    results.push({width,event,page:pages[index],status:reference?'REFERENCE':'PASS'});
   }
   await visit(p,0);assert.equal(await p.locator('[data-seasonal-scene]').count(),1,'Returning home restores its own composition');
  }
  if(!reference&&(width===390||width===1440)){
   // Same-document Family/Cuisine view changes must mount and reclaim their hosts.
   await visit(p,4);
   for(const view of ['members','agenda','health','memos','contacts','house','contracts','contracts-1','document-library','settings']){await p.evaluate(view=>DobbyFamilyStitch.open(view),view);await p.waitForFunction(view=>document.body.dataset.familyView===view,view);assert.equal(await p.locator('main [data-seasonal-page]').count(),1,'First-level '+view+' keeps the event');}
   await p.evaluate(()=>DobbyFamilyStitch.open('documents'));
   await p.locator('[data-archives-hero] [data-seasonal-section]').waitFor();
   const badge=p.locator('[data-archives-title]');
   assert.equal(await badge.getAttribute('data-seasonal-page-host'),null,'The seasonal frame does not restyle the Archives badge');
   assert.equal(await badge.evaluate(node=>getComputedStyle(node).position),'absolute');
   await p.evaluate(()=>DobbyFamilyStitch.open('mission-edit'));await p.waitForFunction(()=>document.body.dataset.familyView==='mission-edit');await cleanDetail(p);await p.locator('#quest-title').fill('TEST — Preserved local draft');await p.evaluate(()=>{document.body.dataset.cuisineView='taverne';DobbyChrome.apply();});await cleanDetail(p);await p.evaluate(()=>delete document.body.dataset.cuisineView);assert.equal(await p.locator('#quest-title').inputValue(),'TEST — Preserved local draft');
   await p.goto(base+'famille.html#agenda?dialog=event');await p.waitForFunction(()=>document.body.dataset.familyView==='agenda'&&document.getElementById('fa-dialog'));assert.equal(await p.locator('#fa-dialog [data-seasonal-decoration]').count(),0);await p.keyboard.press('Escape');await p.locator('#fa-dialog').waitFor({state:'detached'});
   await visit(p,2);await p.evaluate(()=>DobbyCuisine.open('recipes'));await p.waitForFunction(()=>document.body.dataset.cuisineView==='recipes');assert.equal(await p.locator('main [data-seasonal-page]').count(),1,'Recipe catalogue keeps the event');
   await p.evaluate(()=>DobbyCuisine.open('recipe',{id:DobbyCuisineEngine.read().recipes[0].id}));await p.waitForFunction(()=>document.body.dataset.cuisineView==='recipe');await cleanDetail(p);await p.evaluate(()=>{document.body.dataset.familyView='menu';DobbyChrome.apply();});await cleanDetail(p);await p.evaluate(()=>delete document.body.dataset.familyView);
   await p.evaluate(()=>DobbyCuisine.open('recipe-ai'));await p.waitForFunction(()=>document.body.dataset.cuisineView==='recipe-ai');await cleanDetail(p);await visit(p,3);assert.equal(await p.locator('main [data-seasonal-page]').count(),1);
   await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>{DobbyFamilyStitchEngine.evaluate('st.stitchPreferences.effects=true;save();');DobbyChrome.apply();});assert.equal(await p.evaluate(()=>document.getAnimations().filter(a=>a.animationName?.startsWith('seasonal-')).length),0);assert.equal(await p.locator('main [data-seasonal-page]').count(),1);
   for(let index=0;index<6;index++){await visit(p,index);await preferences(p,false);assert.equal(await p.locator('[data-seasonal-decoration],[data-seasonal-page-host],[data-seasonal-section-host],[data-seasonal-panel-host]').count(),0,'Decorations OFF cleans every owned surface on '+pages[index]);}
   await preferences(p,true);await p.reload();await ready(p,5);assert.equal(await p.locator('main [data-seasonal-page]').count(),1,'Native preference persists through reload');
   assert.equal(await business(),records,'Route decoration and navigation leave business records unchanged');
   // Declared local equipment fixture exercises real detail/history renderers.
   await visit(p,4);const house=await p.evaluate(()=>DobbyFamilyStitchEngine.read().state.houseItems);
   await p.evaluate(()=>DobbyFamilyStitchEngine.evaluate('st.houseItems=[{id:"test-seasonal-equipment",name:"TEST — Décor discret",category:"Autre",place:"TEST",maintenancePlans:[],sources:[]}];save();'));
   try{for(const view of ['equipment','maintenance']){await p.evaluate(view=>DobbyFamilyStitch.open(view,{record:'test-seasonal-equipment'}),view);await p.waitForFunction(view=>document.body.dataset.familyView===view,view);assert.equal(await p.locator('main h1').count(),1);await cleanDetail(p);}}
   finally{await p.evaluate(house=>DobbyFamilyStitchEngine.evaluate('st.houseItems=p.house;save();',{house}),house);}
   if(width===390){
    // Level two has the same route coverage; all four seasons stay quiet.
    await p.clock.setFixedTime(new Date('2027-02-14T12:00Z'));await p.evaluate(()=>window.dispatchEvent(new Event('focus')));
    for(let index=0;index<6;index++){await visit(p,index);await p.waitForFunction(()=>document.documentElement.dataset.seasonalTheme==='valentine');assert.ok(await p.locator('main [data-seasonal-decoration] svg use').count()>=2,'Level two covers '+pages[index]);}
    for(const [season,date]of Object.entries({winter:'2026-01-15',spring:'2026-05-15',summer:'2026-06-15',autumn:'2026-09-15'})){
     await p.clock.setFixedTime(new Date(date+'T12:00Z'));await p.evaluate(()=>window.dispatchEvent(new Event('focus')));
     for(let index=0;index<6;index++){await visit(p,index);await p.waitForFunction(season=>document.documentElement.dataset.seasonalTheme===season,season);assert.equal(await p.locator('#seasonal-symbol-library,main [data-seasonal-page],main [data-seasonal-section]').count(),0,'Quiet '+season+' on '+pages[index]);}
    }
    await c.setOffline(true);await p.clock.setFixedTime(new Date('2026-10-31T12:00Z'));await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await p.waitForFunction(()=>document.documentElement.dataset.seasonalTheme==='halloween');assert.equal(await p.locator('main [data-seasonal-page]').count(),1,'Offline date refresh dresses the loaded page');await c.setOffline(false);
   }
  }
  assert.deepEqual(errors,[]);await c.close();console.log('SEASONAL_PAGES_'+(reference?'REFERENCE':'PASS'),width,'six pages, three events');
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(out,reference?'before-results.json':'results.json'),JSON.stringify({reference,base,realAccounts:false,effects:false,events,pages,results},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});

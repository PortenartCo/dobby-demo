/* Real native family/module clients, in-memory HTTP fixture. No real accounts/network. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765',HH='00000000-0000-4000-8000-000000000010',UID='00000000-0000-4000-8000-000000000001';
const out=path.resolve(__dirname,'../../docs/dobby-v7/evidence/family-2a/states');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{for(const width of [320,390]){
 const modules=new Map(),writes=[];let offline=false;const until=async test=>{const deadline=Date.now()+10000;while(!test()&&Date.now()<deadline)await new Promise(r=>setTimeout(r,40));assert.ok(test(),'Native module synchronization reaches the HTTP fixture');};
 const context=await browser.newContext({viewport:{width,height:844},locale:'fr-BE',timezoneId:'Europe/Paris',reducedMotion:'reduce'});
 await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(req.url().startsWith(origin+'/'))return route.continue();
  if(!url.pathname.startsWith('/auth/v1/')&&!url.pathname.startsWith('/rest/v1/'))return route.abort();if(offline)return route.abort();
  const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(url.pathname.includes('/auth/v1/token'))return reply({access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,user:{id:UID,email:'fixture@example.test'}});
  if(url.pathname.includes('dobby_v2_memberships'))return reply([{household_id:HH,active:true,user_id:UID}]);if(url.pathname.includes('dobby_v2_households'))return reply([{id:HH}]);if(url.pathname.includes('dobby_v2_grocery'))return reply([]);
  if(!url.pathname.includes('dobby_v2_modules'))return reply({message:'Unexpected fixture endpoint'},404);
  const module=(url.searchParams.get('module')||'').replace(/^eq\./,''),method=req.method();
  if(method==='GET')return reply(module?(modules.has(module)?[modules.get(module)]:[]):[...modules.values()].map(x=>({module:x.module})));
  const body=req.postDataJSON();writes.push({method,body});
  if(method==='POST'){const row={...body,revision:1,updated_at:new Date().toISOString()};modules.set(body.module,row);return reply([row],201);}
  if(method==='PATCH'){const old=modules.get(module);if(!old||String(old.revision)!==(url.searchParams.get('revision')||'').replace(/^eq\./,''))return reply([]);const row={...old,...body,revision:old.revision+1,updated_at:new Date().toISOString()};modules.set(module,row);return reply([row]);}
  throw Error('Unexpected module fixture write');
 });
 const page=await context.newPage();page.setDefaultTimeout(12000);page.on('dialog',d=>d.accept());const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/essai-stitch-v7/famille.html');await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);
 await page.evaluate(()=>DobbyFamilyStitchEngine.evaluate(`st.familyMembers=[{id:'f1',name:'TEST — Camille',birthdate:'2010-03-12',avatar:'🧒'},{id:'f2',name:'TEST — Alex',birthdate:'1980-05-18',avatar:'👤'}];st.famHealth=[{id:'private-1',personId:'f1',person:'TEST — Camille',name:'PRIVATE_2A consultation',date:addDays(todayISO(),2),provider:'PRIVATE_2A provider',reference:'PRIVATE_2A reference',note:'PRIVATE_2A secret'}];st.familyEvents=[];st.sharedHealthVisits=[];st.famContacts=[];save();`));
 await page.evaluate(()=>DobbyFamilyStitch.open('health',{person:'f1'}));assert.equal(await page.locator('[data-fa-action="medical-new-shared"]').isDisabled(),true);
 await page.locator('[data-fa-action="medical-new"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='medical-edit');await page.locator('#consultation-title').fill('TEST — Brouillon avant activation');await page.locator('#fa-visit-scope').press('End');assert.equal(await page.locator('#fa-visit-scope').inputValue(),'local','The native keyboard cannot select an unavailable shared option');
 await page.evaluate(()=>DobbyStitchV7.open('account')); // Native settings portal; gold button now opens E05 profile.
const engine=page.frameLocator('#dv7-engine');
 await engine.locator('#fv2LoginForm [name="key"]').fill('sb_publishable_fixture_only_123456789');await engine.locator('#fv2LoginForm [name="email"]').fill('fixture@example.test');await engine.locator('#fv2LoginForm [name="password"]').fill('fixture-only');await engine.locator('#fv2LoginForm button[type="submit"]').click();
 await engine.locator('[data-fm-action="activate"][data-module="family"]').click();await page.waitForFunction(()=>DobbyFamilyStitchEngine.read().active);await page.locator('#dv7-close').click();
 assert.equal(await page.locator('#consultation-title').inputValue(),'TEST — Brouillon avant activation');await page.waitForFunction(()=>document.querySelector('#fa-visit-scope option[value=shared]')?.disabled===false);assert.equal(await page.locator('#fa-visit-scope option[value="shared"]').evaluate(option=>option.disabled),false,'Returning from account activation refreshes scope availability without discarding the local draft');
 await page.locator('#fa-visit-scope').press('ArrowDown');await page.waitForFunction(()=>document.querySelector('#fa-visit-scope')?.value==='shared');
 assert.equal(await page.locator('#fa-visit-scope').inputValue(),'shared');await page.locator('#fa-visit-person').selectOption('f2');await page.locator('#consultation-title').fill('TEST — Rendez-vous volontairement partagé');await page.locator('#practitioner-input').fill('TEST — Cabinet commun');
 const date=await page.evaluate(()=>DobbyFamilyStitchEngine.evaluate('return addDays(todayISO(),2);'));await page.locator('#consultation-date').fill(date);await page.locator('#consultation-time').fill('10:30');await page.locator('#location-input').fill('TEST — Lieu commun');await page.locator('#consultation-notes').fill('TEST — Note commune');
 await page.locator('[data-fa-action="medical-save"]').click();await page.waitForFunction(()=>document.body.dataset.familyView==='health');await until(()=>modules.get('family')?.payload.sharedHealthVisits.length===1);
 const visit=modules.get('family').payload.sharedHealthVisits[0].id;assert.equal(modules.get('family').payload.sharedHealthVisits[0].personId,'f2');assert.equal(modules.get('family').payload.familyEvents.length,0,'No medical visit is copied into ordinary events');
 const memberDelete=page.locator('[data-fa-action="member-delete"][data-person="f2"]');assert.equal(await memberDelete.isDisabled(),true,'A shared medical link must prevent removal of its sole canonical member');
 await page.screenshot({path:path.join(out,`health-shared-${width}.png`),fullPage:true});
 await page.locator('[data-fa-action="medical-edit"][data-record="'+visit+'"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='medical-edit');await page.locator('#fa-visit-person').selectOption('');await page.locator('#consultation-time').fill('11:00');await page.locator('[data-fa-action="medical-save"]').click();await page.waitForFunction(()=>document.body.dataset.familyView==='health');await until(()=>modules.get('family')?.payload.sharedHealthVisits[0]?.personId==='');
 await page.locator('[data-fa-action="medical-edit"][data-record="'+visit+'"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='medical-edit');assert.equal(await page.locator('#fa-visit-person').inputValue(),'','An existing Foyer visit stays Foyer on edit');
 offline=true;await page.locator('#consultation-notes').fill('TEST — Modification hors ligne');await page.locator('[data-fa-action="medical-save"]').click();await page.waitForFunction(()=>document.body.dataset.familyView==='health');
 assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().shared[0].note),'TEST — Modification hors ligne');assert.notEqual(modules.get('family').payload.sharedHealthVisits[0].note,'TEST — Modification hors ligne');
 await page.screenshot({path:path.join(out,`health-offline-${width}.png`),fullPage:true});
 await page.reload();await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().local[0].note),'PRIVATE_2A secret');assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().shared[0].note),'TEST — Modification hors ligne');
 // Simulate another device changing the same module during the outage.
 const old=modules.get('family');modules.set('family',{...old,revision:old.revision+1,payload:{...old.payload,sharedHealthVisits:old.payload.sharedHealthVisits.map(x=>({...x,location:'TEST — Autre appareil'}))}});
 offline=false;await page.locator('[data-fa-action="family-sync"]').click();await page.waitForFunction(()=>/conflit/i.test(DobbyFamilyStitchEngine.read().status));
 await page.screenshot({path:path.join(out,`health-conflict-${width}.png`),fullPage:true});await page.locator('[data-fa-action="family-local"]').click();await until(()=>modules.get('family')?.payload.sharedHealthVisits[0]?.note==='TEST — Modification hors ligne');
 assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().members.length),2);assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().local.length),1);
 for(const write of writes){if(write.body.payload){assert.ok(!Object.hasOwn(write.body.payload,'famHealth'));assert.ok(!JSON.stringify(write.body.payload).includes('PRIVATE_2A'),'No individual medical data reaches any family payload');}}
 assert.deepEqual(errors,[]);console.log('FAMILY_SHARED_PASS '+width+'px voluntary scope, canonical member IDs, no private upload, offline persistence, module conflict and native resolution');await context.close();
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

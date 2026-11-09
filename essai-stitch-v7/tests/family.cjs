/* Mission 2A: real native handlers in ephemeral profiles, no external requests. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{for(const width of [320,390]){
 const context=await browser.newContext({viewport:{width,height:844},locale:'fr-BE',reducedMotion:'reduce'});
 await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
 const page=await context.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(origin+'/essai-stitch-v7/famille.html');await page.waitForFunction(()=>window.DobbyStitchV7?.ready);
 assert.ok(await page.evaluate(()=>Boolean(window.DobbyFamilyStitch)),'The seven-screen Family source controller must exist');
 await page.evaluate(()=>DobbyFamilyStitchEngine.evaluate('st.familyMembers=[];st.famHealth=[];st.sharedHealthVisits=[];st.familyEvents=[];st.famContacts=[];st.v23HealthMemberId="";save();'));
 await page.evaluate(()=>DobbyFamilyStitch.open('members'));
 assert.equal(await page.locator('#dv7-panel').isVisible(),false);
 await page.locator('[data-fa-action="member-new"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='member-edit');
 await page.locator('#member-firstname').fill('TEST — Camille');await page.locator('#member-birthdate').fill('2010-03-12');
 await page.locator('[data-fa-action="member-save"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='health-person');
 const id=await page.evaluate(()=>DobbyFamilyStitchEngine.read().members.find(x=>x.name==='TEST — Camille').id);
 await page.locator('[data-fa-action="member-edit"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='member-edit');
 await page.locator('#member-firstname').fill('TEST — Camille modifiée');await page.locator('[data-fa-action="member-save"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='health-person');
 await page.reload();await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);
 assert.equal(await page.evaluate(id=>DobbyFamilyStitchEngine.read().members.find(x=>x.id===id).name,id),'TEST — Camille modifiée');
 assert.deepEqual(errors,[]);console.log('FAMILY_MEMBER_PASS '+width+'px');await context.close();
 }}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

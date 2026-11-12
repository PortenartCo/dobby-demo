/* Real native handlers in an ephemeral TEST parent/dependent household.
   Parent persona exists only in the native iframe after the initial denied empty state. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{for(const width of (process.env.DOBBY_FAMILY_WIDTHS||'320,390').split(',').map(Number)){
 const context=await browser.newContext({viewport:{width,height:844},locale:'fr-BE',timezoneId:'Europe/Paris',reducedMotion:'reduce'});
 await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
 const page=await context.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));let approve=true;page.on('dialog',d=>approve?d.accept():d.dismiss());
 await page.goto(origin+'/essai-stitch-v7/famille.html');await page.waitForFunction(()=>window.DobbyStitchV7?.ready);
 assert.ok(await page.evaluate(()=>Boolean(window.DobbyFamilyStitch)),'The seven-screen Family source controller must exist');
 await page.evaluate(()=>DobbyFamilyStitchEngine.evaluate('st.familyMembers=[];st.famHealth=[];st.sharedHealthVisits=[];st.familyEvents=[];st.famContacts=[];st.v23HealthMemberId="";save();'));
 await page.evaluate(()=>DobbyFamilyStitch.open('members'));
 assert.equal(await page.locator('#dv7-panel').isVisible(),false);
 assert.equal(await page.locator('[data-fa-action="member-new"]').first().isDisabled(),true,'An empty unbound account cannot create a dependent');
 await context.addInitScript(()=>{if(location.pathname.endsWith('/essai-stitch-v5-famille/index.html'))window.DobbyReview={demoMemberId:'fixture-parent'};});
 await page.evaluate(()=>DobbyFamilyStitchEngine.evaluate('window.DobbyReview={demoMemberId:"fixture-parent"};st.familyMembers=[{id:"fixture-parent",memberCategory:"parent",name:"TEST — Parent",birthdate:"",avatar:"👤"}];save();'));
 await page.evaluate(()=>DobbyFamilyStitch.open('members'));
 await page.locator('[data-fa-action="member-new"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='member-edit');
 await page.locator('#member-category').selectOption('child');await page.locator('#member-firstname').fill('TEST — Camille');await page.locator('#member-birthdate').fill('2010-03-12');
 await page.locator('[data-fa-action="member-save"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='member-detail');
 const id=await page.evaluate(()=>DobbyFamilyStitchEngine.read().members.find(x=>x.name==='TEST — Camille').id);await page.evaluate(id=>DobbyFamilyStitch.open('health-person',{person:id}),id);
 await page.locator('[data-fa-action="member-edit"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='member-edit');
 await page.locator('#member-firstname').fill('TEST — Camille modifiée');await page.locator('[data-fa-action="member-save"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='member-detail');await page.evaluate(id=>DobbyFamilyStitch.open('health-person',{person:id}),id);
 await page.reload();await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);
 assert.equal(await page.evaluate(id=>DobbyFamilyStitchEngine.read().members.find(x=>x.id===id).name,id),'TEST — Camille modifiée');console.log('FAMILY_BASELINE_REENTRY_PASS',width,'fresh read-to-edit baseline, stable member ID and reload');

 await page.evaluate(()=>DobbyFamilyStitch.open('members'));await page.locator('#search-input').fill('introuvable');assert.equal(await page.locator('#members-list .member-card').count(),0);await page.locator('#search-input').fill('');assert.equal(await page.locator('#members-list .member-card').count(),2,'Clearing an empty search restores the source member card');await page.locator('#members-list [data-fa-member="'+id+'"]').click();await page.waitForFunction(()=>document.body.dataset.familyView==='member-detail');await page.getByRole('button',{name:'Consulter le carnet de santé',exact:true}).click();await page.waitForFunction(()=>document.body.dataset.familyView==='health-person');
 // A new individual visit stays local and never creates an ordinary/shared event.
 await page.locator('[data-fa-action="medical-new"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='medical-edit');
 assert.equal(await page.locator('#fa-visit-scope').inputValue(),'local');assert.equal(await page.locator('#practitioner-phone').isDisabled(),true);
 await page.locator('#consultation-title').fill('TEST — Consultation privée');await page.locator('#practitioner-input').fill('TEST — Cabinet privé');await page.locator('#consultation-date').fill('2027-01-12');await page.locator('#consultation-notes').fill('TEST — Note médicale locale');
 await page.locator('[data-fa-action="medical-save"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='health-person');
 let state=await page.evaluate(()=>DobbyFamilyStitchEngine.read());assert.equal(state.local.length,1);assert.equal(state.local[0].personId,id,'The native-form adapter preserves the canonical member ID');assert.equal(state.shared.length,0);assert.equal(state.events.length,0);const visit=state.local[0].id;
 // Leaving a new draft for an account dialog must not contaminate another saved record.
 await page.locator('[data-fa-action="medical-new"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='medical-edit');await page.locator('#consultation-title').fill('TEST — Brouillon à ne pas copier');
 await page.evaluate(()=>DobbyStitchV7.open('account')); // Native settings portal; gold button now opens E05 profile.
await page.locator('#dv7-close').click();assert.equal(await page.locator('#consultation-title').inputValue(),'TEST — Brouillon à ne pas copier');
 await page.locator('header [data-fa-action="back"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='health-person');
 await page.locator('[data-fa-action="medical-edit"][data-record="'+visit+'"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='medical-edit');assert.equal(await page.locator('#consultation-title').inputValue(),'TEST — Consultation privée','A saved record cannot inherit a different unsaved draft');
 await page.locator('header [data-fa-action="back"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='health-person');
 // Renaming a person preserves the ID and all local health links, without a second occupant.
 await page.locator('[data-fa-action="member-edit"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='member-edit');
 await page.locator('#member-firstname').fill('TEST — Camille renommée');await page.locator('[data-fa-action="member-save"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='member-detail');await page.evaluate(id=>DobbyFamilyStitch.open('health-person',{person:id}),id);
 state=await page.evaluate(()=>DobbyFamilyStitchEngine.read());assert.equal(state.members.length,2);assert.equal(state.local[0].personId,id);assert.equal(state.local[0].person,'TEST — Camille renommée');
 await page.locator('[data-fa-action="member-delete"]').first().click();assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().members.length),2,'Native linked-member deletion is blocked');
 await page.locator('#fa-notice [data-fa-action="dismiss"]').click();
 await page.evaluate(()=>DobbyFamilyStitch.open('members'));await page.locator('[data-fa-action="member-new"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='member-edit');
 await page.reload();await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);assert.equal(await page.locator('#member-firstname').inputValue(),'','Reloading a new-member route must not turn it into editing the first existing member');
 await page.locator('#member-category').selectOption('child');await page.locator('#member-firstname').fill('test — camille renommée');await page.locator('[data-fa-action="member-save"]').first().click();
 assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().members.length),2,'Native case-insensitive duplicate protection survives the Stitch form');await page.locator('#fa-notice [data-fa-action="dismiss"]').click();
 await page.evaluate(({id,visit})=>DobbyFamilyStitch.open('medical-edit',{person:id,record:visit,scope:'local'}),{id,visit});
 await page.locator('#consultation-title').fill('TEST — Consultation modifiée');await page.locator('[data-fa-action="medical-save"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='health-person');
 assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().local[0].id),visit);assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().local[0].personId),id);
 await page.reload();await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);assert.ok((await page.locator('main').textContent()).includes('TEST — Consultation modifiée'));
 // Ordinary event dialog is styled inside the Stitch agenda, using the native handler.
 await page.evaluate(()=>DobbyFamilyStitch.open('agenda'));assert.ok(!(await page.locator('main').textContent()).includes('TEST — Consultation modifiée'),'Private medicine never appears in the shared agenda');
 await page.locator('[data-fa-action="event-new"]').first().click();
 await page.locator('#fa-native-form [name="title"]').fill('TEST — Événement ordinaire');await page.locator('#fa-native-form [name="date"]').fill('2027-01-12');await page.locator('#fa-native-form [name="person"]').fill('TEST — Camille renommée');
 await page.locator('#fa-native-form button[type="submit"]').click();await page.waitForFunction(()=>!document.querySelector('#fa-dialog'));
 state=await page.evaluate(()=>DobbyFamilyStitchEngine.read());assert.equal(state.events.length,1);assert.equal(state.local.length,1);const event=state.events[0].id;
 await page.locator('[data-fa-action="event-open"][data-record="'+event+'"]').click();await page.locator('[data-fa-action="event-edit"][data-record="'+event+'"]').click();await page.locator('#fa-native-form [name="title"]').fill('TEST — Événement modifié');await page.locator('#fa-native-form button[type="submit"]').click();await page.waitForFunction(()=>!document.querySelector('#fa-dialog'));
 assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().events[0].id),event);
 await page.locator('[data-fa-action="event-open"][data-record="'+event+'"]').click();const icsEvent=page.waitForEvent('download');await page.locator('[data-fa-action="event-export"]').first().click();assert.ok((await icsEvent).suggestedFilename().endsWith('.ics'));await page.locator('#fa-dialog [data-fa-action="dialog-close"]').click();await page.waitForFunction(()=>!document.querySelector('#fa-dialog'));
 // Native contact CRUD is visible in the source history, with no invented patient association.
 await page.evaluate(({id})=>DobbyFamilyStitch.open('health-history',{person:id}),{id});await page.locator('[data-fa-action="contact-new"]').first().click();
 await page.locator('#fa-native-form [name="name"]').fill('TEST — Médecin du foyer');await page.locator('#fa-native-form [name="role"]').fill('Médecin');await page.locator('#fa-native-form [name="phone"]').fill('+32000000000');await page.locator('#fa-native-form button[type="submit"]').click();await page.waitForFunction(()=>!document.querySelector('#fa-dialog'));
 const contact=await page.evaluate(()=>DobbyFamilyStitchEngine.read().contacts[0].id);await page.locator('[data-fa-action="health-contact-edit"][data-record="'+contact+'"]').click();await page.locator('#fa-native-form [name="name"]').fill('TEST — Médecin modifié');await page.locator('#fa-native-form button[type="submit"]').click();await page.waitForFunction(()=>!document.querySelector('#fa-dialog'));
 assert.ok((await page.locator('main').textContent()).includes('TEST — Médecin modifié'));
 approve=false;await page.locator('[data-fa-action="contact-delete"]').first().click();assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().contacts.length),1);approve=true;
 await page.locator('[data-fa-action="contact-delete"]').first().click();assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().contacts.length),0);
 await page.evaluate(({id,visit})=>DobbyFamilyStitch.open('medical-edit',{person:id,record:visit,scope:'local'}),{id,visit});approve=false;
 await page.locator('[data-fa-action="medical-delete"]').first().click();assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().local.length),1);approve=true;
 await page.locator('[data-fa-action="medical-delete"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='health-person');assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().local.length),0);
 await page.evaluate(()=>DobbyFamilyStitch.open('agenda'));await page.locator('[data-fa-action="event-open"][data-record="'+event+'"]').click();await page.locator('[data-fa-action="event-delete"]').first().click();assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().events.length),0);
 await page.evaluate(({id})=>DobbyFamilyStitch.open('health-person',{person:id}),{id});await page.locator('[data-fa-action="member-delete"]').first().click();await page.waitForFunction(()=>document.body.dataset.familyView==='members');assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().members.length),1);
 await page.evaluate(()=>DobbyFamilyStitch.open('salon'));await page.locator('body > nav [data-e01-destination="4"]').first().click();await page.waitForFunction(()=>DobbyFamilyStitch.view==='menu');await page.locator('body > nav [data-e01-destination="3"]').first().click();await page.waitForFunction(()=>DobbyFamilyStitch.view==='salon');
 assert.equal(await page.locator('#dv7-panel').isVisible(),false,'The Family dock destination must return to the source Salon');console.log('FAMILY_PATH_PASS '+width+'px local medical isolation, native CRUD, duplicate/deletion safeguards, persistence and empty states');
 assert.deepEqual(errors,[]);console.log('FAMILY_MEMBER_PASS '+width+'px');await context.close();
 }}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

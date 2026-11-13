/* Local profile edge cases. Native-frame TEST parent permissions are removed
   before Auth-context denial checks; no real account or remote transport. */
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'});
  await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  await context.addInitScript(()=>{if(location.pathname.endsWith('/essai-stitch-v5-famille/index.html'))window.DobbyReview={demoMemberId:'qa-member'};});
  const page=await context.newPage();page.setDefaultTimeout(12000);
  await page.goto(origin+'/essai-stitch-v7/famille.html#personal');await page.waitForFunction(()=>DobbyFamilyStitch?.ready);
  await page.evaluate(()=>DobbyFamilyStitchEngine.evaluate("st.familyMembers=[{id:'qa-member',memberCategory:'parent',name:'TEST — Identité',avatar:'🌿',birthdate:'',future:{keep:true}}];st.runeCredits=[];st.runeRequests=[];save();"));
  await page.evaluate(()=>DobbyFamilyStitch.open('personal',{person:'qa-member'}));
  for(const value of ['stag','otter','fox','wolf','cat','owl','horse','hare','swan','lynx','badger','dolphin']){
   await page.locator('.mp-patronus').getByRole('button',{name:'Refaire le test',exact:true}).click();
   await page.getByRole('button',{name:'Choisir directement',exact:true}).click();await page.locator('[data-ceremony-choice="'+value+'"]').click();
   await page.getByRole('button',{name:'Confirmer mon Patronus',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#dobby-ceremonies')&&!DobbyRegister.busy);
   assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().members[0].magicProfile.patronusId),value);
   await page.locator('.mp-patronus [data-media-id="'+value+'"]').waitFor();
  }
  for(const value of Array.from({length:24},(_,index)=>'portrait-'+(index+1))){
   await page.locator('#magic-avatar-edit').click();await page.locator('[name=magicAvatarId]').selectOption(value);await page.locator('#magic-avatar-form button[type=submit]').click();
   await page.waitForFunction(value=>DobbyFamilyStitchEngine.read().members[0].magicProfile.avatarId===value,value);await page.locator('#magic-avatar-edit').waitFor();
  }
  assert.deepEqual(await page.evaluate(()=>DobbyFamilyStitchEngine.read().members[0].future),{keep:true});
  // Generic links and Back must never infer a profile from the local persona.
  await page.evaluate(()=>DobbyFamilyStitch.open('salon'));await page.locator('[data-e01-destination="5"]').click();await page.waitForFunction(()=>DobbyFamilyStitch.view==='menu');
  await page.evaluate(()=>DobbyFamilyStitch.open('personal'));await page.waitForFunction(()=>DobbyFamilyStitch.view==='personal');assert.equal(await page.locator('[data-profile-member]').count(),0,'Generic entry requires an explicit choice');
  await page.locator('[data-magic-choose="qa-member"]').click();await page.locator('[data-profile-member]').waitFor();await page.goBack();await page.waitForFunction(()=>DobbyFamilyStitch.view==='personal');assert.equal(await page.locator('[data-profile-member]').count(),0,'Back restores the chooser');
  await page.evaluate(()=>DobbyFamilyStitch.open('personal',{person:'qa-member'}));
  // The current identity form preserves an open draft and rejects a changed member.
  await page.getByRole('button',{name:'Modifier les informations personnelles',exact:true}).click();await page.locator('#member-firstname').fill('TEST — Brouillon');
  await page.evaluate(()=>DobbyFamilyStitchEngine.evaluate("st.familyMembers[0].name='TEST — Modification distante';save();"));
  assert.equal(await page.locator('#member-firstname').inputValue(),'TEST — Brouillon','Native refresh preserves the open identity draft');
  await page.getByRole('button',{name:'Enregistrer le membre',exact:true}).click();await page.locator('#fa-notice').waitFor();assert.match(await page.locator('#fa-notice').innerText(),/changé/);
  assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().members[0].name),'TEST — Modification distante');await page.locator('#member-form').getByRole('button',{name:'Annuler',exact:true}).click();
  await page.evaluate(()=>DobbyFamilyStitch.open('personal',{person:'qa-member'}));
  // No local demo permission may mask an account-context denial. The retained
  // avatar editor also pins the full context captured when the form opened.
  await page.locator('#magic-avatar-edit').click();await page.locator('[name=magicAvatarId]').selectOption('portrait-1');
  const membersBefore=await page.evaluate(()=>DobbyFamilyStitchEngine.read().members);
  await page.evaluate(()=>{const w=DobbyFamilyStitchEngine.win();w.__testProfileApi=w.DobbyFamilyUI;w.__testProfileReview=w.DobbyReview;delete w.DobbyReview;w.DobbyFamilyUI={...w.DobbyFamilyUI,getContext:()=>({userId:'TEST-other',householdId:'TEST-other'})};});
  assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.memberPermissions('qa-member').canEdit),false,'The changed, unverified account has no demo permission');
  await page.locator('#magic-avatar-form button[type=submit]').click();await page.locator('#fa-notice').waitFor();assert.match(await page.locator('#fa-notice').innerText(),/changé/);assert.deepEqual(await page.evaluate(()=>DobbyFamilyStitchEngine.read().members),membersBefore);
  const denied=await page.evaluate(async()=>{try{await DobbyFamilyStitchEngine.saveMember('qa-member',{name:'TEST — Unauthorized identity'});return'saved';}catch(error){return error.message;}});
  assert.match(denied,/suspendue|relié|droits|association/i,'The actual identity writer denies an unbound account');assert.deepEqual(await page.evaluate(()=>DobbyFamilyStitchEngine.read().members),membersBefore);
  await page.evaluate(()=>{const w=DobbyFamilyStitchEngine.win();w.DobbyFamilyUI=w.__testProfileApi;w.DobbyReview=w.__testProfileReview;delete w.__testProfileApi;delete w.__testProfileReview;});
  await page.locator('#magic-avatar-form button[type=button]').click();await page.evaluate(()=>DobbyFamilyStitch.open('personal',{person:'qa-member'}));
  // Keyboard opens the single current House modal and Escape returns to its trigger.
  const houseTrigger=page.locator('.mp-house').getByRole('button',{name:'Refaire le test',exact:true});await houseTrigger.focus();await page.keyboard.press('Enter');
  await page.locator('#dobby-ceremonies[data-ceremony-kind=house]').waitFor();assert.equal(await page.locator('#dobby-ceremonies[open]').count(),1);assert.equal(await page.evaluate(()=>document.querySelector('#dobby-ceremonies').contains(document.activeElement)),true);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#dobby-ceremonies'));assert.equal(await houseTrigger.evaluate(el=>el===document.activeElement),true);
  assert.equal(await page.locator('[data-magic-profile] input[type=file]').count(),0);assert.equal(await page.locator('[data-profile-member]').getAttribute('data-profile-member'),'qa-member');
  await page.locator('[data-e01-account]').click();await page.waitForFunction(()=>!!document.querySelector('[data-magic-profile]')&&!document.querySelector('[data-profile-member]'));assert.equal(await page.locator('[data-profile-member]').count(),0,'Gold account control never reattributes the consulted member');
  for(const file of ['traverse.html','missions.html','index.html','famille.html','famille.html#menu']){
   await page.goto(origin+'/essai-stitch-v7/'+file);await page.waitForFunction(()=>DobbyStitchV7?.ready);await page.locator('[data-e01-account]').click();await page.waitForURL(/famille.html#personal/);await page.waitForFunction(()=>DobbyFamilyStitch?.ready);assert.equal(await page.locator('[data-profile-member]').count(),0);assert.equal(await page.locator('body > nav a').count(),6);
  }
  await context.close();console.log('E05_EDGE_PASS 12 native Patronus confirmations, 24 portraits, extensions, stale identity protection, unbound-context denial, modal keyboard, six gold destinations, no inferred account');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

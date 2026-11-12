/* Historical E06 regressions over real native writers and metadata adapters.
 * Creation is an explicitly fictional-parent legacy fixture. The separate Auth
 * refusal context has no DobbyReview and retains the production boundary. */
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765',uid='00000000-0000-4000-8000-000000000611',hh='00000000-0000-4000-8000-000000000612';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const c=await b.newContext();
  await c.addInitScript(()=>{window.DobbyReview={demoMemberId:'TEST-E06-PARENT'};});
  await c.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  const p=await c.newPage();p.setDefaultTimeout(12000);
  await p.goto(origin+'/essai-stitch-v7/famille.html#onboarding-identity');await p.waitForFunction(()=>DobbyFamilyStitch?.ready);
  await p.evaluate(()=>DobbyFamilyStitchEngine.evaluate('st.familyMembers=[{id:"TEST-E06-PARENT",name:"TEST Fictional parent",memberCategory:"parent"}];save();'));
  await p.evaluate(()=>DobbyFamilyStitch.open('onboarding-identity',{person:null}));
  await p.locator('#first-name').fill('TEST Created Once');
  await p.evaluate(()=>{
   const w=DobbyFamilyStitchEngine.win(),original=w.DobbyFamilyUI;w.__reviewApi=original;let fail=true;
   w.DobbyFamilyUI={...original,meta:async k=>{if(k==='deviceHouseholdId'&&fail){fail=false;throw Error('TEST metadata read failed after creation');}return original.meta(k);}};
  });
  await p.locator('#e06-identity-next').click();
  await p.waitForFunction(()=>DobbyFamilyStitchEngine.read().members.length===2&&document.getElementById('fa-notice')?.textContent.includes('metadata'));
  const id=await p.evaluate(()=>DobbyFamilyStitchEngine.read().members.find(member=>member.id!=='TEST-E06-PARENT').id);
  await p.locator('#first-name').fill('TEST Corrected Name');await p.locator('#e06-identity-next').click();await p.locator('#questionnaire-options').waitFor();
  const created=await p.evaluate(()=>DobbyFamilyStitchEngine.read().members);
  assert.equal(created.length,2,'Retry preserves parent and edits the one created child');assert.equal(created.filter(member=>member.id===id).length,1);assert.equal(created.find(member=>member.id===id).name,'TEST Corrected Name');
  console.log('E06_REVIEW_CREATION_PASS explicit fictional parent, canonical creation retry preserves ID');
  await p.evaluate(()=>DobbyFamilyStitchEngine.evaluate('st.familyMembers=[{id:"TEST-E06-PARENT",name:"TEST Fictional parent",memberCategory:"parent"},{id:"one",name:"TEST One",memberCategory:"child"},{id:"two",name:"TEST Two",memberCategory:"child"}];save();'));
  await p.evaluate(()=>DobbyFamilyStitch.open('onboarding-house',{person:'one',record:null}));
  const p2=await c.newPage();await p2.goto(origin+'/essai-stitch-v7/famille.html#onboarding-house?person=two');await p2.waitForFunction(()=>DobbyFamilyStitch?.ready);
  await p.evaluate(()=>DobbyOnboardingEngine.answer('house',0,'A'));await p2.evaluate(()=>DobbyOnboardingEngine.answer('house',0,'B'));
  await p.evaluate(()=>DobbyOnboardingEngine.drafts.load('one'));assert.deepEqual(await p.evaluate(()=>DobbyOnboardingEngine.drafts.read().house),['A']);
  await p2.evaluate(()=>DobbyOnboardingEngine.drafts.load('one'));await p.evaluate(()=>DobbyOnboardingEngine.answer('house',1,'B'));
  const conflict=await p2.evaluate(async()=>{try{await DobbyOnboardingEngine.drafts.update(d=>d.house[1]='D');return 'overwritten';}catch(e){return e.message;}});
  assert.match(conflict,/autre onglet/);await p.evaluate(()=>DobbyOnboardingEngine.drafts.load('one'));assert.deepEqual(await p.evaluate(()=>DobbyOnboardingEngine.drafts.read().house),['A','B']);
  await c.close();console.log('E06_REVIEW_MULTITAB_PASS native IndexedDB, distinct-member merge and same-member revision refusal');

  // Separate production context: no fictional identity/permission override.
  const auth=await b.newContext();let revoked=false;
  await auth.route('**/*',async r=>{
   const u=new URL(r.request().url());if(r.request().url().startsWith(origin+'/'))return r.continue();
   const send=body=>r.fulfill({contentType:'application/json',body:JSON.stringify(body)});
   if(u.pathname.startsWith('/auth/v1/token'))return send({access_token:'TEST-fixture',refresh_token:'TEST-refresh',expires_in:3600,user:{id:uid,email:'e06-review@example.test'}});
   if(u.pathname.includes('dobby_v2_memberships'))return send(revoked?[]:[{household_id:hh}]);if(u.pathname.includes('dobby_v2_households'))return send([{id:hh}]);if(u.pathname.startsWith('/rest/v1/'))return send([]);return r.abort();
  });
  const ap=await auth.newPage();ap.setDefaultTimeout(12000);
  await ap.goto(origin+'/essai-stitch-v7/famille.html');await ap.waitForFunction(()=>DobbyFamilyStitch?.ready);
  assert.equal(await ap.evaluate(()=>!!window.DobbyReview||!!DobbyFamilyStitchEngine.win().DobbyReview),false,'Auth refusal context must not select a fictional persona');
  await ap.evaluate(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.putMeta('publicKey','sb_publishable_e06_review_fixture_only_1234567890'));
  await ap.reload();await ap.waitForFunction(()=>DobbyFamilyStitch?.ready);
  await ap.evaluate(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.signIn('e06-review@example.test','TEST'));revoked=true;
  await ap.goto(origin+'/essai-stitch-v7/famille.html#onboarding-foyer');await ap.reload();
  await ap.waitForFunction(()=>DobbyFamilyStitch?.ready&&!DobbyFamilyStitchEngine.win().DobbyFamilyUI.connectionState().verified,{},{timeout:10000});
  await ap.waitForFunction(()=>document.getElementById('e06-connection-status')?.textContent.includes('refusé'));
  assert.doesNotMatch(await ap.locator('main').innerText(),/Foyer reconnu/);
  await ap.evaluate(()=>DobbyFamilyStitch.open('onboarding-identity',{person:null}));
  assert.equal(await ap.locator('#first-name').isDisabled(),true,'Refused account cannot enter a new identity');assert.equal(await ap.locator('#e06-identity-next').isDisabled(),true);
  const denial=await ap.evaluate(async()=>{try{await DobbyOnboardingEngine.identity({firstName:'TEST Refused Member'},()=>{});return 'written';}catch(error){return error.message;}});
  assert.match(denial,/refus/i,'The native engine refuses a direct write as well as disabling the UI');
  assert.equal(await ap.evaluate(()=>DobbyFamilyStitchEngine.read().members.length),0,'Explicit membership refusal blocks canonical ceremony writes');
  await auth.close();console.log('E06_REVIEW_MEMBERSHIP_PASS production UI and native writer refusal, no fictional persona');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

const assert=require('node:assert/strict'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:900},locale:'fr-BE'});
  await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  const page=await context.newPage();await page.goto(origin+'/essai-stitch-v7/famille.html');
  await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready&&DobbyFamilyStitchEngine.win().DobbyFamilyMissions?.available);
  const native=code=>page.evaluate(code=>DobbyFamilyStitchEngine.evaluate(code),code);
  const action=(action,id)=>page.evaluate(({action,id})=>DobbyFamilyStitchEngine.action('fmsAction',action,id?{id}:{}),{action,id});
  await native(`st.familyMembers=[{id:'history-person',name:'TEST Camille'}];st.manualMissions=[];st.autoTasks=[];st.runeCredits=[];st.runeRequests=[];st.runeSyncRequired=false;save();`);
  for(const [title,effort,customRunes,reopen]of [['TEST — Réversible','custom','17',true],['TEST — Conservée','regular','',false]]){
   await action('new');await page.evaluate(values=>DobbyFamilyStitchEngine.submit('fmsForm',values),{title,effort,customRunes,assigneeId:'history-person'});
   const id=await native('return st.manualMissions.at(-1).id;');await action('toggle',id);if(reopen)await action('toggle',id);
  }
  const ledger=await native('return JSON.stringify(st.runeCredits);');
  await page.evaluate(()=>DobbyFamilyStitch.open('personal',{person:'history-person'}));
  const profile=page.locator('[data-rune-profile="history-person"]');assert.equal(await profile.isVisible(),true);
  assert.equal(await profile.locator('.dobby-rune-total').textContent(),'25 runes');
  assert.equal(await profile.locator('details summary').textContent(),'Historique des gains et annulations');
  assert.match(await profile.locator('li').filter({hasText:'Gain — TEST — Réversible'}).textContent(),/\+17 runes/);
  assert.match(await profile.locator('li').filter({hasText:'Annulation — TEST — Réversible'}).textContent(),/−17 runes/);
  assert.match(await profile.locator('li').filter({hasText:'Gain — TEST — Conservée'}).textContent(),/\+25 runes/);
  assert.equal(await profile.locator('li[data-rune-event]').count(),3);
  assert.equal(await native('return JSON.stringify(st.runeCredits);'),ledger,'Profile rendering preserves the confirmed native ledger');
  await context.close();console.log('RUNES_HISTORY_PASS visible native profile labels grants/reversals with correct signs; net total 25 and all three events preserved');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

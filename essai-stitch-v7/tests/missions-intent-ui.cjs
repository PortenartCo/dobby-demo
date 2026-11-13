/* Intent UI only, with deferred native promises. No real Auth/API is used. */
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:900},locale:'fr-BE',timezoneId:'Europe/Brussels'});
  await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/essai-stitch-v7/famille.html#mission-edit');
  await page.waitForFunction(()=>DobbyFamilyStitchEngine.win().DobbyFamilyMissions?.participantVersion===1&&window.DobbyMissionParticipants);
  await page.evaluate(()=>{
   const w=DobbyFamilyStitchEngine.win();
   DobbyFamilyStitchEngine.evaluate(`st.manualMissions=[{id:'async-test',title:'TEST — Deferred intent',status:'open',category:'Famille',effort:'regular',rewardVersion:1,participantVersion:1,assigneeIds:['a','b'],assigneeId:'a',due:''}];st.runeCredits=[];st.runeRequests=[];st.familyMembers=[{id:'a',name:'TEST Alice',memberCategory:'parent'},{id:'b',name:'TEST Benoît',memberCategory:'child'}];st.runeSyncRequired=false;save();`);
   w.__intentCalls=[];
   w.DobbyFamilyMissions={...w.DobbyFamilyMissions,requiresSync:()=>true,complete:(id,ids)=>{w.__intentCalls.push({kind:'complete',id,ids});return new Promise((resolve,reject)=>{w.__intentResolve=resolve;w.__intentReject=reject;});},reopen:id=>{w.__intentCalls.push({kind:'reopen',id});return new Promise((resolve,reject)=>{w.__intentResolve=resolve;w.__intentReject=reject;});}};
   w.DobbySharedRunesV3={available:()=>true};
   window.DobbyMissionParticipants.open('async-test');
  });
  const dialog=page.locator('dialog.dv7-participant-dialog'),confirm=dialog.getByRole('button',{name:'Confirmer la mission',exact:true});
  await dialog.getByRole('checkbox',{name:'TEST Alice',exact:true}).check();
  await dialog.getByRole('checkbox',{name:'TEST Benoît',exact:true}).check();
  await confirm.click();
  await page.waitForFunction(()=>DobbyFamilyStitchEngine.win().__intentCalls.length===1);
  assert.equal(await dialog.evaluate(node=>node.open),true,'dialog remains open until real confirmation');
  assert.equal(await confirm.isDisabled(),true);
  await page.evaluate(()=>DobbyFamilyStitchEngine.win().__intentReject(Error('TEST — Atomic refusal')));
  await page.waitForFunction(()=>document.querySelector('dialog [role=alert]')?.textContent.includes('Atomic refusal'));
  assert.equal(await confirm.isEnabled(),true);assert.equal(await dialog.getByRole('checkbox',{name:'TEST Alice',exact:true}).isChecked(),true);
  assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.evaluate('return st.manualMissions[0].status;')),'open');
  await confirm.click();await page.waitForFunction(()=>DobbyFamilyStitchEngine.win().__intentCalls.length===2);
  await page.evaluate(()=>DobbyFamilyStitchEngine.win().__intentResolve());await dialog.waitFor({state:'detached'});
  // The real reopen handler also awaits its promise and reports a refusal.
  await page.evaluate(()=>{const button=document.createElement('button');button.dataset.dv7Reopen='async-test';button.textContent='TEST reopen';document.querySelector('main').append(button);});
  const reopen=page.getByRole('button',{name:'TEST reopen',exact:true});await reopen.click();
  await page.waitForFunction(()=>DobbyFamilyStitchEngine.win().__intentCalls.length===3);assert.equal(await reopen.isDisabled(),true);
  await page.evaluate(()=>DobbyFamilyStitchEngine.win().__intentReject(Error('TEST — Reopen refused')));
  await page.waitForFunction(()=>document.querySelector('main [role=alert]')?.textContent.includes('Reopen refused'));
  assert.equal(await reopen.isEnabled(),true);assert.deepEqual(errors,[]);await context.close();
  console.log('MISSIONS_INTENT_UI_PASS 390px deferred confirmation, preserved checked form/refusal, retry and awaited reopen (native promise fixture only)');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

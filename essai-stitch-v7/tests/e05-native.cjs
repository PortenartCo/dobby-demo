/* Actual native form and trusted E06 writers in a local TEST parent persona.
   The fixture flag exists only in the native iframe. All external traffic is blocked. */
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext();
  await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  await context.addInitScript(()=>{if(location.pathname.endsWith('/essai-stitch-v5-famille/index.html'))window.DobbyReview={demoMemberId:'test-member'};});
  const page=await context.newPage();page.on('dialog',d=>d.accept());
  await page.goto(origin+'/essai-stitch-v7/famille.html');await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);
  const run=code=>page.evaluate(code=>DobbyFamilyStitchEngine.evaluate(code),code);
  await run(`st.familyMembers=[{id:'test-member',memberCategory:'parent',name:'TEST — Avant',birthdate:'',avatar:'👩',future:{x:1}}];st.runeCredits=[];st.runeRequests=[];save();`);
  async function save(values,fail=false){return page.evaluate(({values,fail})=>{
   const E=DobbyFamilyStitchEngine;E.clearError();E.memberForm('test-member');E.win().eval('window.__testSave=save;window.__testSaveAttempts=0;');
   if(fail)E.win().eval('save=()=>{window.__testSaveAttempts++;throw Error("TEST quota");};');
   try{const form=E.win().document.getElementById('v23MemberForm');for(const[name,value]of Object.entries(values)){let f=form.elements.namedItem(name);if(!f){f=E.win().document.createElement('input');f.type='hidden';f.name=name;form.append(f);}f.value=value;}form.requestSubmit();return{member:E.read().members[0],error:E.lastError,saveAttempts:E.win().__testSaveAttempts};}
   finally{if(fail)E.win().eval('save=window.__testSave;');}
  },{values,fail});}
  const initial=await run('return st.familyMembers;');
  let result=await save({name:'TEST — Forged',magicHouseId:'slytherin',magicPatronusId:'otter',magicHouseAlgorithm:'e06-v1'});
  assert.match(result.error,/questionnaires|galeries|confirmation/i,'Generic hidden fields cannot grant a magic confirmation capability');assert.deepEqual(await run('return st.familyMembers;'),initial);
  result=await save({name:'TEST — Après',magicAvatarId:'portrait-1'});assert.equal(result.error,'');assert.equal(result.member.id,'test-member');assert.equal(result.member.name,'TEST — Après');assert.deepEqual(result.member.future,{x:1});
  await page.evaluate(async()=>{await DobbyFamilyStitchEngine.saveMagicChoice('test-member','house','slytherin');await DobbyFamilyStitchEngine.saveMagicChoice('test-member','patronus','otter');});
  let member=await run('return st.familyMembers[0];');assert.equal(member.magicProfile.houseId,'slytherin');assert.equal(member.magicProfile.houseSelectionSource,'manual');assert.equal(member.magicProfile.patronusId,'otter');assert.deepEqual(member.future,{x:1});assert.deepEqual(await run('return st.runeCredits;'),[]);
  await page.reload();await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);assert.equal((await run('return st.familyMembers[0];')).magicProfile.patronusId,'otter');
  member=(await save({name:'TEST — Edition classique'})).member;assert.equal(member.magicProfile.avatarId,'portrait-1');
  const before=await run('return st.familyMembers;');result=await save({magicHouseId:'invalid'});assert.match(result.error,/questionnaires|galeries|confirmation/i);assert.deepEqual(await run('return st.familyMembers;'),before);
  const invalid=await page.evaluate(async()=>{try{await DobbyFamilyStitchEngine.saveMagicChoice('test-member','house','invalid');return'saved';}catch(error){return error.message;}});assert.match(invalid,/invalide/i);assert.deepEqual(await run('return st.familyMembers;'),before);
  result=await save({name:'TEST — Refus stockage'},true);assert.equal(result.saveAttempts,1,'Quota test reaches the actual writer');assert.match(result.error,/Enregistrement impossible/);assert.deepEqual(await run('return st.familyMembers;'),before);
  const magicQuota=await page.evaluate(async()=>{const E=DobbyFamilyStitchEngine;E.win().eval('window.__testSave=save;window.__testSaveAttempts=0;save=()=>{if(st.familyMembers[0].magicProfile?.houseId==="ravenclaw"){window.__testSaveAttempts++;throw Error("TEST magic quota");}return window.__testSave();};');try{await E.saveMagicChoice('test-member','house','ravenclaw');return{saved:true};}catch(error){return{error:error.message,saveAttempts:E.win().__testSaveAttempts};}finally{E.win().eval('save=window.__testSave;');}});
  assert.equal(magicQuota.saveAttempts,1);assert.match(magicQuota.error,/non enregistré/i);assert.deepEqual(await run('return st.familyMembers;'),before,'Failed trusted magic write rolls back the member');
  const beforeCreate=await run('return st.familyMembers;');
  const creation=await page.evaluate(()=>{const E=DobbyFamilyStitchEngine;E.clearError();E.memberForm(null);E.win().eval('window.__testSave=save;window.__testSaveAttempts=0;save=()=>{window.__testSaveAttempts++;throw Error("TEST creation quota");};');try{const form=E.win().document.getElementById('v23MemberForm');form.elements.name.value='TEST — Création refusée';const f=E.win().document.createElement('input');f.type='hidden';f.name='memberCategory';f.value='child';form.append(f);form.requestSubmit();return{error:E.lastError,saveAttempts:E.win().__testSaveAttempts};}finally{E.win().eval('save=window.__testSave;');}});
  assert.equal(creation.saveAttempts,1,'Creation test reaches storage with an authorized child category');assert.match(creation.error,/Enregistrement impossible/);assert.deepEqual(await run('return st.familyMembers;'),beforeCreate,'Creation failure leaves no unsaved ghost member');
  await page.evaluate(async()=>{const G=DobbyOnboardingEngine;await G.ready;const answers=G.scoring.config.house.questions.map(row=>row.answers[0].id);await DobbyFamilyStitchEngine.saveMagicResult('test-member','house',answers);});
  member=await run('return st.familyMembers[0];');assert.equal(member.magicProfile.houseSelectionSource,'calculated');assert.equal(member.magicProfile.houseAlgorithmVersion,'e06-v1');assert.equal(member.magicProfile.patronusId,'otter');assert.deepEqual(member.future,{x:1});assert.deepEqual(await run('return st.runeCredits;'),[]);
  await run('st.familyMembers[0].birthdate="2026-02-30";save();');const legacyBefore=await run('return st.familyMembers;');
  const legacy=await page.evaluate(async()=>{try{await DobbyFamilyStitchEngine.saveMember('test-member',{name:'TEST — Date ancienne',birthdate:'2026-02-30',avatar:'👩'});return'saved';}catch(error){return error.message;}});assert.match(legacy,/date/i,'An unrepresentable date blocks rather than erasing it');assert.deepEqual(await run('return st.familyMembers;'),legacyBefore);
  await context.close();console.log('E05_NATIVE_PASS actual form, forged magic rejection, trusted manual/calculated writers, extensions, reload, validation, quota rollback, unchanged rewards');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

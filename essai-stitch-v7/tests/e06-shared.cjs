/* E06 canonical-result native synchronization, in-memory HTTP fixture. No real accounts/network. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765',HH='00000000-0000-4000-8000-000000000010',UID='00000000-0000-4000-8000-000000000001';
const out=path.resolve(__dirname,'../../docs/dobby-v7/evidence/e06/shared');fs.mkdirSync(out,{recursive:true});
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
 const page=await context.newPage();page.on('dialog',d=>d.accept());page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/essai-stitch-v7/famille.html');await page.waitForFunction(()=>DobbyFamilyStitch?.ready);
 const native=code=>page.evaluate(code=>DobbyFamilyStitchEngine.evaluate(code),code);
 await native('st.familyMembers=[];st.famContacts=[];st.famLists=[];st.famHealth=[{id:"private",name:"PRIVATE_E06_HEALTH"}];st.familyNotes=[{id:"private",body:"PRIVATE_E06_MEMO"}];save();');
 const id=await page.evaluate(()=>DobbyFamilyStitchEngine.saveMember(null,{name:'TEST Shared E06',avatar:'👤',birthdate:'',profileFirstName:'TEST Shared',profileLastName:'E06'}));
 await page.evaluate(()=>DobbyStitchV7.open('account'));const engine=page.frameLocator('#dv7-engine');await engine.locator('#fv2LoginForm [name=key]').fill('sb_publishable_e06_fixture_only_1234567890');await engine.locator('#fv2LoginForm [name=email]').fill('e06-shared@example.test');await engine.locator('#fv2LoginForm [name=password]').fill('TEST');await engine.locator('#fv2LoginForm button[type=submit]').click();await engine.locator('[data-fm-action=activate][data-module=family]').click();await page.waitForFunction(()=>DobbyFamilyStitchEngine.read().active);await page.locator('#dv7-close').click();
 await page.evaluate(async id=>{const G=DobbyOnboardingEngine;await DobbyOnboarding.restart('house',id);for(const[i,pick]of [0,0,0,2,3,0,2].entries())await G.answer('house',i,G.scoring.config.house.questions[i].answers[pick].id);await DobbyFamilyStitch.open('onboarding-house-result',{person:id,record:null});},id);await page.locator('#e06-confirm-result').click();await page.locator('#spectral-choices').waitFor();
 await until(()=>modules.get('family')?.payload.familyMembers.some(m=>m.id===id&&m.magicProfile?.houseAlgorithmVersion==='e06-v1'));const remote=modules.get('family').payload.familyMembers.find(m=>m.id===id);assert.equal(remote.magicProfile.houseId,'slytherin');assert.equal(remote.firstName,'TEST Shared');assert.equal(remote.lastName,'E06');assert.doesNotMatch(JSON.stringify(writes),/PRIVATE_E06|houseAlgorithmVersion.*answers/);assert.ok(!Object.hasOwn(modules.get('family').payload,'runeCredits'));
 await page.reload();await page.waitForFunction(()=>DobbyFamilyStitch?.ready);const saved=(await native('return st.familyMembers;')).find(m=>m.id===id);assert.equal(saved.magicProfile.houseAlgorithmVersion,'e06-v1');assert.equal(saved.magicProfile.houseId,'slytherin');assert.equal((await native('return st.familyMembers;')).length,1);await page.screenshot({path:path.join(out,'profile-resynced-'+width+'.png'),fullPage:true});assert.deepEqual(errors,[]);await context.close();console.log('E06_SHARED_PASS',width,'native identity/result writer, native module PATCH and reload, same member ID/version, private records excluded (HTTP fixture only)');
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});

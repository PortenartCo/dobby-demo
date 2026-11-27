/* E06-01 error/lifecycle boundaries only. Real native data and real WebAudio;
   temporary fault injection is limited to the intro's local metadata key. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {traceRitualAudio,ritualAudioStates,ritualAudioStopped,ritualAudioPlaying}=require('./helpers/ritual-audio.cjs');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8790',base=process.env.DOBBY_REVIEW_PATH||'/essai-stitch-v7',key='dobby.e06.ritual.v1',out=process.env.DOBBY_E0601_ERROR_EVIDENCE||path.resolve(__dirname,'../../docs/dobby-v7/evidence/e06-01/errors');
fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});let page;try{
 const context=await browser.newContext({viewport:{width:320,height:900},locale:'fr-BE',timezoneId:'Europe/Paris',reducedMotion:'no-preference'});
 await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
 await context.addInitScript(traceRitualAudio);
 page=await context.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const native=code=>page.evaluate(code=>DobbyFamilyStitchEngine.evaluate(code),code),audio=()=>ritualAudioStates(page);
 const restore=()=>page.evaluate(()=>{if(window.__ritualOriginalApi){DobbyFamilyStitchEngine.win().DobbyFamilyUI=window.__ritualOriginalApi;delete window.__ritualOriginalApi;}if(window.__ritualHiddenOverridden){delete document.hidden;delete window.__ritualHiddenOverridden;document.dispatchEvent(new Event('visibilitychange'));}});
 const deferWrite=()=>page.evaluate(key=>{const w=DobbyFamilyStitchEngine.win(),original=w.DobbyFamilyUI;window.__ritualOriginalApi=original;window.__ritualWritePending=false;w.DobbyFamilyUI={...original,updateMeta:(id,change)=>id!==key?original.updateMeta(id,change):new Promise((resolve,reject)=>{window.__ritualWritePending=true;window.__releaseRitualWrite=()=>original.updateMeta(id,change).then(resolve,reject);})};},key);
 await page.goto(origin+base+'/famille.html#onboarding-ritual');await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);await page.locator('#dobby-hearth-img').evaluate(i=>i.decode());
 await native('st.stitchPreferences={effects:true,sound:true};save();');await page.evaluate(()=>DobbyChrome.mount());const audioSupported=await page.evaluate(()=>!!(window.AudioContext||window.webkitAudioContext));const initial=await native('return JSON.stringify({members:st.familyMembers,credits:st.runeCredits,planned:st.planned});');
 // Storage rejection must end continuous audio before enabling a retry.
 await page.evaluate(key=>{const w=DobbyFamilyStitchEngine.win(),original=w.DobbyFamilyUI;window.__ritualOriginalApi=original;w.DobbyFamilyUI={...original,updateMeta:(id,change)=>id===key?Promise.reject(Error('TEST ONLY: intro metadata storage rejection')):original.updateMeta(id,change)};},key);
 await page.locator('#btn-floo-trigger').click();await page.waitForFunction(()=>document.querySelector('.ritual-status')?.textContent.includes('non enregistrée'));
 await page.waitForFunction(ritualAudioStopped,null,{timeout:2000});
 const rejectedAudio=await audio();fs.writeFileSync(path.join(out,'rejected-audio-observed.json'),JSON.stringify({states:rejectedAudio,status:await page.locator('.ritual-status').innerText()},null,2)+'\n');
 if(audioSupported)assert.ok(rejectedAudio.length>0,'Supported browser actually started a Ritual source');assert.ok(rejectedAudio.every(state=>state==='stopped'),'Rejected intro metadata must stop Ritual audio before retry: '+JSON.stringify(rejectedAudio));
 assert.equal(await page.locator('#btn-floo-trigger').isEnabled(),true);assert.equal(await page.locator('#chk-never-again').isEnabled(),true);
 await restore();await page.locator('#btn-floo-trigger').click();if(audioSupported)await page.waitForFunction(ritualAudioPlaying);const retryAudio=await audio();if(audioSupported)assert.equal(retryAudio.filter(state=>state==='playing').length,1,'Retry has one live Ritual source; the rejected attempt remains stopped');
 await page.waitForURL(/#onboarding-foyer(?:\?|$)/);await page.waitForFunction(()=>document.body.dataset.familyView==='onboarding-foyer');await page.waitForFunction(ritualAudioStopped,null,{timeout:2000});
 assert.equal(await native('return JSON.stringify({members:st.familyMembers,credits:st.runeCredits,planned:st.planned});'),initial);
 // Skipping a running transition stops the source without waiting for metadata.
 await page.evaluate(()=>DobbyFamilyStitch.open('onboarding-ritual',{person:null,record:'replay'}));
 await deferWrite();await page.locator('#btn-floo-trigger').click();
 if(audioSupported)await page.waitForFunction(ritualAudioPlaying);
 await page.locator('#e06-ritual-skip').click();await page.waitForFunction(()=>window.__ritualWritePending);await page.waitForFunction(ritualAudioStopped,null,{timeout:400});
 const skippedAudio=await audio();assert.ok(skippedAudio.every(state=>state==='stopped'),'Skip stops any active Ritual source before metadata responds');
 await page.evaluate(()=>__releaseRitualWrite());await page.waitForFunction(()=>document.body.dataset.familyView==='onboarding-foyer');await restore();
 // An interrupted, pending finish may persist its local metadata, but cannot
 // navigate after the visibility handler told the user it was interrupted.
 await native('st.stitchPreferences={effects:true,sound:false};save();');await page.evaluate(()=>DobbyChrome.mount());await page.evaluate(()=>DobbyFamilyStitch.open('onboarding-ritual',{person:null,record:'replay'}));await page.locator('#btn-floo-trigger').waitFor();
 await deferWrite();
 await page.locator('#btn-floo-trigger').click();await page.waitForFunction(()=>window.__ritualWritePending);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});window.__ritualHiddenOverridden=true;document.dispatchEvent(new Event('visibilitychange'));});assert.match(await page.locator('.ritual-status').innerText(),/interrompue/);
 await page.evaluate(()=>__releaseRitualWrite());await page.waitForTimeout(350);const afterHidden=await page.evaluate(()=>({view:document.body.dataset.familyView,url:location.href,status:document.querySelector('.ritual-status')?.textContent}));fs.writeFileSync(path.join(out,'hidden-finish-observed.json'),JSON.stringify(afterHidden,null,2)+'\n');
 assert.equal(afterHidden.view,'onboarding-ritual','A cancelled pending finish cannot navigate later');assert.match(afterHidden.url,/#onboarding-ritual/);assert.match(afterHidden.status,/interrompue/);
 await restore();assert.equal(await page.locator('#btn-floo-trigger').isEnabled(),true);await page.locator('#btn-floo-trigger').click();await page.waitForURL(/#onboarding-foyer(?:\?|$)/);assert.equal(await native('return JSON.stringify({members:st.familyMembers,credits:st.runeCredits,planned:st.planned});'),initial);assert.deepEqual(errors,[]);
 const result={status:'PASS',width:320,origin,base,metadataFaults:['explicit rejection','skip while metadata is pending','pending completion interrupted by visibility'],realWebAudio:audioSupported,businessWriters:'unchanged native',businessMocks:false,faultInjection:'only the local intro metadata facade and document visibility browser boundary',rejectedAudio,retryAudio,skippedAudio,afterHidden};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2)+'\n');console.log('E06_RITUAL_ERRORS_PASS storage rejection/audio cleanup/retry; skip and pending finish visibility cancellation; native data unchanged');await context.close();
 }finally{if(page&&!page.isClosed())await page.evaluate(()=>{if(window.__ritualOriginalApi)DobbyFamilyStitchEngine.win().DobbyFamilyUI=window.__ritualOriginalApi;if(window.__ritualHiddenOverridden)delete document.hidden;}).catch(()=>{});await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});

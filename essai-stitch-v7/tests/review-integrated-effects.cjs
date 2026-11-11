/* Effects contract for the canonical app and the isolated E03–E06 preview.
   No preference migration is inferred from an unversioned stored false. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8893';
const base=process.env.DOBBY_REVIEW_PATH||'/essai-stitch-v7';
const out=process.env.DOBBY_EFFECTS_EVIDENCE||path.resolve(__dirname,'../../docs/dobby-v7/evidence/integrated-e03-e06-20261111/effects/canonical');
const widths=(process.env.DOBBY_EFFECTS_WIDTHS||'320,390,1440').split(',').map(Number);
const oldPrefix='dobby-review-e01-e06-20261111|',stateKey='dobby-v5-familial-preview-20261108';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const results=[];
 try{for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:900},locale:'fr-BE',timezoneId:'Europe/Brussels',reducedMotion:'no-preference'});
  await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  // The previous review namespace remains a separate, untouched historical value.
  await context.addInitScript(({oldPrefix,stateKey})=>{const marker='effects-isolation-fixture';if(!sessionStorage.getItem(marker)){localStorage.setItem(oldPrefix+stateKey,JSON.stringify({demoInitialized:true,stitchPreferences:{effects:false,sound:false},legacyFixture:'preserved'}));sessionStorage.setItem(marker,'true');}},{oldPrefix,stateKey});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(18000);
  const ready=async()=>{await page.waitForFunction(()=>window.DobbyStitchV7?.ready);};
  const native=code=>page.evaluate(code=>DobbyFamilyStitchEngine.evaluate(code),code);
  const ritual=async()=>{await page.evaluate(()=>DobbyFamilyStitch.open('onboarding-ritual',{record:'replay',person:null}));await page.locator('#btn-floo-trigger').waitFor();await page.waitForFunction(()=>DobbyRitual.active);await page.locator('#dobby-hearth-img').evaluate(i=>i.decode());};
  const effects=()=>page.locator('#iphone-app-frame [data-e01-toggle=effects]');
  const sound=()=>page.locator('#iphone-app-frame [data-e01-toggle=sound]');
  const shot=async name=>{await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(x=>x.getAttribute('src')).map(x=>x.decode().catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);await page.screenshot({path:path.join(out,name+'-'+width+'.png'),fullPage:true});};
  const buttonState=()=>effects().evaluate(b=>({pressed:b.getAttribute('aria-pressed'),disabled:b.disabled,background:getComputedStyle(b).backgroundColor,color:getComputedStyle(b).color,label:b.getAttribute('aria-label')}));
  const business=()=>native('return JSON.stringify({members:st.familyMembers,missions:st.manualMissions,credits:st.runeCredits,requests:st.runeRequests});');
  const oldStored=()=>page.evaluate(({oldPrefix,stateKey})=>{const raw=Storage.prototype.__reviewRaw;return raw?raw.getItem.call(localStorage,oldPrefix+stateKey):localStorage.getItem(oldPrefix+stateKey);},{oldPrefix,stateKey});
  await page.goto(origin+base+'/famille.html#onboarding-ritual?record=replay');await ready();await page.locator('#btn-floo-trigger').waitFor();
  const preview=await page.evaluate(()=>!!window.DobbyReview);
  if(preview){assert.equal(await page.evaluate(()=>DobbyReviewConfig.storagePrefix),'dobby-review-e03-e06-20261111|','A new review must use the dedicated, separate namespace');}
  const oldBefore=await oldStored();assert.equal(JSON.parse(oldBefore).legacyFixture,'preserved');
  const fresh=await buttonState();assert.equal(fresh.pressed,'true','New use has effects ON');assert.equal(fresh.disabled,false);assert.equal(fresh.color,'rgb(249, 187, 95)','ON is visibly gold');assert.equal(await sound().getAttribute('aria-pressed'),'false');
  assert.equal(await native('return Object.hasOwn(st.stitchPreferences||{},"effects");'),false,'Reading defaults does not create a saved choice');
  await shot('fresh-on');
  // Reproduce the observed OFF with an already stored value: this is not proof
  // that an old automatic default can be distinguished from a voluntary choice.
  await native('st.stitchPreferences={effects:false,sound:false};save();');await page.evaluate(()=>DobbyChrome.apply());
  const storedOff=await buttonState();assert.equal(storedOff.pressed,'false');assert.notEqual(storedOff.color,fresh.color);await shot('stored-off');
  await page.reload();await ready();await page.locator('#btn-floo-trigger').waitFor();assert.equal(await effects().getAttribute('aria-pressed'),'false','Unproven historical OFF is preserved');
  await effects().click();assert.equal(await native('return st.stitchPreferences.effects;'),true);
  await effects().click();assert.equal(await native('return st.stitchPreferences.effects;'),false,'A user click makes explicit OFF persistent');
  for(const route of ['traverse.html','famille.html#onboarding-identity']){
   await page.goto(origin+base+'/'+route);await ready();if(route.includes('onboarding'))await page.locator('[data-e06-main]').waitFor();
   assert.equal(await page.locator('body>header [data-e01-toggle=effects]').getAttribute('aria-pressed'),'false','OFF across '+route);
   assert.equal(await page.locator('body>header [data-e01-toggle=sound]').getAttribute('aria-pressed'),'false');
  }
  await page.goto(origin+base+'/famille.html#onboarding-ritual?record=replay');await ready();await page.locator('#btn-floo-trigger').waitFor();
  assert.equal(await effects().getAttribute('aria-pressed'),'false');
  const signature=await business(),offStart=Date.now();await page.locator('#btn-floo-trigger').click();await page.waitForURL(/#onboarding-foyer(?:\?|$)/,{timeout:1800});assert.ok(Date.now()-offStart<1800,'OFF skips the long animated transition');await page.locator('#e06-local-entry').waitFor();
  await ritual();await effects().click();assert.equal(await native('return st.stitchPreferences.effects;'),true);
  const canvas=()=>page.locator('#fireCanvas').evaluate(c=>{let green=0;const rgba=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=0;i<rgba.length;i+=4)if(rgba[i+3]>35&&rgba[i+1]>60&&rgba[i+1]>rgba[i]*1.2&&rgba[i+1]>rgba[i+2]*1.1)green++;return green;});
  await page.waitForTimeout(150);const warm=await canvas();await page.locator('#btn-floo-trigger').click();await page.waitForTimeout(900);const green=await canvas();const observed={width,warm,green,state:await page.evaluate(()=>({hidden:document.hidden,view:document.body.dataset.familyView,preference:DobbyChrome.preferences(),crossing:document.querySelector('[data-e06-main]')?.classList.contains('ritual-crossing'),canvas:{width:document.querySelector('#fireCanvas').width,height:document.querySelector('#fireCanvas').height}}))};fs.writeFileSync(path.join(out,'paint-observed-'+width+'.json'),JSON.stringify(observed,null,2)+'\n');await shot('enabled-observed');assert.ok(green>warm+100,'Green transition is painted in the real Canvas: '+JSON.stringify(observed));await shot('enabled-green');
  await page.waitForURL(/#onboarding-foyer(?:\?|$)/);await page.locator('#e06-local-entry').waitFor();assert.equal(await business(),signature,'Replay does not change members, missions or ledger');
  await ritual();await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await effects().getAttribute('aria-pressed'),'true','System reduction does not turn the choice OFF');
  const reducedStart=Date.now();await page.locator('#btn-floo-trigger').click();await page.waitForURL(/#onboarding-foyer(?:\?|$)/,{timeout:1800});assert.ok(Date.now()-reducedStart<1800);await page.locator('#e06-local-entry').waitFor();assert.equal(await native('return st.stitchPreferences.effects;'),true);assert.equal(await business(),signature);
  await ritual();await shot('reduced-on');await page.emulateMedia({reducedMotion:'no-preference'});
  // Interrupt a real in-progress transition, then ensure no late navigation.
  await page.locator('#btn-floo-trigger').click();await page.waitForTimeout(80);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  assert.match(await page.locator('.ritual-status').innerText(),/interrompue/);await page.waitForTimeout(2600);assert.equal(await page.evaluate(()=>document.body.dataset.familyView),'onboarding-ritual');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.locator('#btn-floo-trigger').isEnabled(),true);await page.locator('#e06-ritual-skip').click();await page.waitForURL(/#onboarding-foyer(?:\?|$)/);await page.locator('#e06-local-entry').waitFor();assert.equal(await business(),signature);
  assert.equal(await oldStored(),oldBefore,'The old published namespace and preference are untouched');assert.deepEqual(errors,[]);
  results.push({width,status:'PASS',preview,firstUse:fresh,historicalOff:storedOff,legacyFalseProvenance:'unknown; preserved',oldNamespaceUnchanged:true,explicitOffReload:true,sharedRoutes:2,greenCanvas:{warm,green},reducedChoicePreserved:true,replayBusinessUnchanged:true,interruptedNavigationCancelled:true});
  await context.close();console.log('INTEGRATED_EFFECTS_PASS',width,preview?'preview':'canonical','fresh ON, sound OFF; historical/explicit OFF preserved; replay/green/reduced/lifecycle; old namespace untouched');
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',origin,base,results,productCodeChanged:false},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});

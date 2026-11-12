/* Native Cheminette regression tests. All records are local to fresh browser
   contexts; external traffic is blocked. These checks do not certify auth. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.DOBBY_PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8819';
const base=process.env.DOBBY_NATIVE_PATH||'/essai-stitch-v7';
const evidence=process.env.DOBBY_STITCH_RITUAL_EVIDENCE||path.resolve(__dirname,'../../docs/dobby-v7/evidence/stitch19-20/ritual');
const key='dobby.e06.ritual.v1';
const results=[];
let browser;

async function fixture(options={}){
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'no-preference',locale:'fr-BE'});
 const external=[];
 await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():(external.push(new URL(r.request().url()).origin),r.abort()));
 let releaseHearth;
 if(options.deferHearth){const gate=new Promise(resolve=>{releaseHearth=resolve;});await context.route('**/ritual-hearth-original.png',async route=>{await gate;await route.continue();});}
 await context.addInitScript(()=>{
  if(window!==top)return;
  window.__ritualBrowser={audio:[],frames:new Set()};
  const Original=window.AudioContext||window.webkitAudioContext;
  if(Original){const Traced=class extends Original{constructor(...args){super(...args);window.__ritualBrowser.audio.push({context:this,ritual:new Error().stack.includes('ritual-effects.js'),openedAt:performance.now()});}close(){const row=window.__ritualBrowser.audio.find(row=>row.context===this);if(row)row.closedAt=performance.now();return super.close();}};if(window.AudioContext)window.AudioContext=Traced;else window.webkitAudioContext=Traced;}
  const request=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window);
  window.requestAnimationFrame=callback=>{const ritual=new Error().stack.includes('ritual-effects.js');let id;id=request(time=>{window.__ritualBrowser.frames.delete(id);callback(time);});if(ritual)window.__ritualBrowser.frames.add(id);return id;};
  window.cancelAnimationFrame=id=>{window.__ritualBrowser.frames.delete(id);cancel(id);};
 });
 const page=await context.newPage(),errors=[];
 page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+base+'/famille.html#onboarding-ritual',{waitUntil:options.deferHearth?'domcontentloaded':'load'});
 await page.waitForFunction(()=>window.DobbyStitchV7?.ready&&document.body.dataset.familyView==='onboarding-ritual');
 if(!options.deferHearth)await page.locator('#dobby-hearth-img').evaluate(i=>i.decode());
 const native=(code,values={})=>page.evaluate(({code,values})=>DobbyFamilyStitchEngine.evaluate(code,values),{code,values});
 const audio=()=>page.evaluate(()=>__ritualBrowser.audio.filter(row=>row.ritual).map(row=>row.context.state));
 const replay=async()=>{await page.evaluate(()=>DobbyFamilyStitch.open('onboarding-ritual',{record:'replay',person:null}));await page.locator('#dobby-hearth-img').evaluate(i=>i.decode());};
 const prefs=async(effects,sound)=>{await native('st.stitchPreferences={effects:p.effects,sound:p.sound};save();',{effects,sound});await page.evaluate(()=>DobbyChrome.mount());};
 return {context,page,native,audio,replay,prefs,external,errors,releaseHearth};
}

async function check(name,run,options){
 const f=await fixture(options);
 try{await run(f);assert.deepEqual(f.errors,[],'No browser exception');assert.equal(f.external.some(x=>/supabase/.test(x)),false,'No real family backend is contacted');results.push({name,status:'PASS'});console.log('PASS',name);}
 catch(error){results.push({name,status:'FAIL',message:error.message});console.error('FAIL',name,error.message);}
 finally{f.releaseHearth?.();await f.context.close();}
}

(async()=>{
 fs.mkdirSync(evidence,{recursive:true});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  await check('first single touch uses default ON and green flames',async({page,native,audio})=>{
   assert.equal(await native('return st.stitchPreferences;'),undefined,'Fresh context has no explicit effect preference');
   assert.equal(await page.locator('.ritual-preferences [data-e01-toggle="effects"]').getAttribute('aria-pressed'),'true');
   assert.deepEqual(await audio(),[],'No ritual sound before a gesture');
   let arrivals=0;page.on('framenavigated',frame=>{if(frame===page.mainFrame()&&/#onboarding-foyer(?:\?|$)/.test(frame.url()))arrivals++;});
   await page.locator('#btn-floo-trigger').tap();
   assert.equal(await page.locator('.ritual-crossing').count(),1,'The first touch starts the visible traversal');
   await page.waitForFunction(()=>{
    const canvas=document.querySelector('#fireCanvas');if(!canvas)return false;
    const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let green=0;for(let i=0;i<data.length;i+=4)if(data[i+3]>12&&data[i+1]>data[i]*1.1&&data[i+1]>data[i+2]*.9)green++;
    return green>8&&Number(getComputedStyle(document.querySelector('#floo-vortex-flash')).opacity)>.1;
   },{},{timeout:1800});
   await page.screenshot({path:path.join(evidence,'first-touch-green.png')});
   await page.waitForURL(/#onboarding-foyer(?:\?|$)/);
   await page.waitForFunction(()=>!DobbyRitual.active&&__ritualBrowser.frames.size===0);
   assert.equal(arrivals,1,'Exactly one navigation follows the single touch');
   assert.deepEqual(await audio(),[],'Default visual effects never enable sound');
  });

  for(const [effects,sound,reduced]of [[false,false,false],[false,true,false],[true,false,true],[true,true,true]]){
   await check(`effects ${effects} sound ${sound} reduced ${reduced}`,async({page,prefs,audio,native})=>{
    await prefs(effects,sound);if(reduced)await page.emulateMedia({reducedMotion:'reduce'});
    const started=Date.now();await page.locator('#btn-floo-trigger').tap();
    await page.waitForURL(/#onboarding-foyer(?:\?|$)/,{timeout:1800});
    assert.ok(Date.now()-started<1700,'OFF/reduced motion keeps navigation prompt');
    const states=await audio();
    if(sound&&await page.evaluate(()=>!!(window.AudioContext||window.webkitAudioContext)))assert.ok(states.length>0,'Sound ON starts the real ritual audio independently from animation');
    else assert.deepEqual(states,[],'Sound OFF never starts ritual audio');
    await page.waitForFunction(()=>__ritualBrowser.audio.filter(row=>row.ritual).every(row=>row.context.state==='closed')&&__ritualBrowser.frames.size===0);
    assert.deepEqual(await native('return st.stitchPreferences;'),{effects,sound},'The explicit preferences survive navigation');
   });
  }

  for(const [effects,reduced]of [[false,false],[true,true]]){
   await check(`late image decode preserves short sound with effects ${effects} reduced ${reduced}`,async({page,prefs,releaseHearth})=>{
    await prefs(effects,true);if(reduced)await page.emulateMedia({reducedMotion:'reduce'});
    await page.locator('#btn-floo-trigger').tap();
    await page.waitForTimeout(20);releaseHearth();
    await page.waitForURL(/#onboarding-foyer(?:\?|$)/,{timeout:1800});
    const sounds=await page.evaluate(()=>__ritualBrowser.audio.filter(row=>row.ritual).map(row=>({duration:row.closedAt-row.openedAt,state:row.context.state})));
    assert.ok(sounds.length>0,'The gesture starts the real ritual sound');
    assert.ok(sounds.every(row=>row.duration>=140),'Image decoding must not truncate the short sound: '+JSON.stringify(sounds));
    assert.ok(sounds.every(row=>row.state==='closed'),'The short sound is cleaned up after navigation');
   },{deferHearth:true});
  }

  await check('session entry bypasses seen intro and ends at Traverse',async({page,prefs,native})=>{
   await prefs(false,false);
   await page.evaluate(key=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.updateMeta(key,()=>({seen:true,suppressed:false,version:1})),key);
   const before=await native('return JSON.stringify({members:st.familyMembers,credits:st.runeCredits,planned:st.planned});');
   await page.goto(origin+base+'/famille.html#onboarding-ritual?entry=session');await page.reload();
   await page.waitForFunction(()=>window.DobbyStitchV7?.ready);
   assert.equal(await page.locator('#btn-floo-trigger').count(),1,'An existing session still receives its Cheminette');
   let arrivals=0;page.on('framenavigated',frame=>{if(frame===page.mainFrame()&&new URL(frame.url()).pathname.endsWith('/traverse.html'))arrivals++;});
   await page.locator('#btn-floo-trigger').tap();await page.waitForURL(/\/traverse\.html(?:[?#]|$)/);
   await page.waitForFunction(()=>window.DobbyStitchV7?.ready);
   assert.equal(arrivals,1);assert.equal(await native('return JSON.stringify({members:st.familyMembers,credits:st.runeCredits,planned:st.planned});'),before,'Session entry leaves member/mission/meal state intact');
   assert.equal(await page.locator('.e06-main').count(),0,'Completed users do not enter ceremonies');
  });

  await check('configured profile retains legacy bypass but session entry shows Cheminette',async({page,prefs,native})=>{
   await prefs(false,false);
   // A pre-existing local record is fixture input for the presentation gate.
   // No authenticated account, parental permission or remote write is forged.
   const id='test-stitch-ritual-complete';
   await native('st.familyMembers=[{id:p.id,name:"TEST — Cheminette complète",avatar:"👤",magicProfile:{ceremonyStatus:"complete"}}];save();',{id});
   await page.goto(origin+base+'/famille.html#onboarding-ritual?person='+encodeURIComponent(id));await page.reload();
   await page.waitForFunction(()=>window.DobbyStitchV7?.ready&&document.body.dataset.familyView==='onboarding-foyer');
   assert.equal(await page.locator('#btn-floo-trigger').count(),0,'The historical intro route still bypasses a configured profile');
   await page.goto(origin+base+'/famille.html#onboarding-ritual?entry=session&person='+encodeURIComponent(id));await page.reload();
   await page.waitForFunction(()=>window.DobbyStitchV7?.ready);
   assert.equal(await page.locator('#btn-floo-trigger').count(),1,'Session entry does not use the completed-profile bypass');
   await page.locator('#btn-floo-trigger').tap();await page.waitForURL(/\/traverse\.html(?:[?#]|$)/);
  });

  await check('leaving a running traversal closes audio and animation without late navigation',async({page,prefs,audio})=>{
   await prefs(true,true);await page.locator('#btn-floo-trigger').tap();
   await page.waitForFunction(()=>document.querySelector('.ritual-crossing'));
   assert.ok((await audio()).length>0);
   await page.evaluate(()=>DobbyFamilyStitch.open('salon'));
   await page.waitForFunction(()=>!DobbyRitual.active&&__ritualBrowser.frames.size===0&&__ritualBrowser.audio.filter(row=>row.ritual).every(row=>row.context.state==='closed'));
   await page.waitForTimeout(2700);
   assert.equal(await page.evaluate(()=>document.body.dataset.familyView),'salon','An abandoned timer cannot navigate later');
  });

  await check('hidden traversal can be retried without duplicate animation or audio',async({page,prefs,audio})=>{
   await prefs(true,true);await page.locator('#btn-floo-trigger').tap();
   await page.waitForFunction(()=>document.querySelector('.ritual-crossing'));
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
   await page.waitForFunction(()=>__ritualBrowser.frames.size===0&&__ritualBrowser.audio.filter(row=>row.ritual).every(row=>row.context.state==='closed'));
   assert.equal(await page.locator('#btn-floo-trigger').isEnabled(),true);
   assert.match(await page.locator('.ritual-status').innerText(),/interrompue/);
   await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
   await page.locator('#btn-floo-trigger').tap();await page.waitForTimeout(200);
   assert.equal((await audio()).filter(state=>state!=='closed').length,1,'Retry creates only one active ritual audio context');
   await page.waitForURL(/#onboarding-foyer(?:\?|$)/);
   await page.waitForFunction(()=>!DobbyRitual.active&&__ritualBrowser.frames.size===0&&__ritualBrowser.audio.filter(row=>row.ritual).every(row=>row.context.state==='closed'));
  });
 }finally{await browser.close();fs.writeFileSync(path.join(evidence,'results.json'),JSON.stringify({origin,base,realAccounts:false,externalBackend:'blocked',businessMocks:false,results},null,2)+'\n');}
 assert.equal(results.filter(row=>row.status==='FAIL').length,0,'Cheminette regressions: '+JSON.stringify(results.filter(row=>row.status==='FAIL')));
 console.log('STITCH_ENTRY_RITUAL_PASS default first touch/green flames; effects/sound/reduced independence; session/legacy entry; lifecycle cleanup');
})().catch(error=>{console.error(error);process.exitCode=1;});

/* Disposable native profiles; no real account or external traffic. */
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
const base=process.env.DOBBY_SEASONAL_BASE||origin+'/essai-stitch-v7/';
const out=process.env.DOBBY_SEASONAL_EVIDENCE||fs.mkdtempSync(path.join(os.tmpdir(),'dobby-seasonal-browser-'));
const ready=p=>p.waitForFunction(()=>window.DobbyStitchV7?.ready&&!document.documentElement.classList.contains('dv7-loading'));
const theme=(p,value)=>p.waitForFunction(expected=>document.documentElement.dataset.seasonalTheme===expected,value);
const prefs=p=>p.evaluate(()=>DobbyFamilyStitchEngine.read().state.stitchPreferences);
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const results=[];
 try{for(const width of [320,390,768,1440]){
  const ctx=await browser.newContext({viewport:{width,height:900},locale:'fr-BE',timezoneId:'America/Los_Angeles',reducedMotion:'no-preference',serviceWorkers:'block'});
  await ctx.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(12000);
  await p.clock.setFixedTime(new Date('2026-12-25T12:00Z'));await p.goto(base+'traverse.html');await ready(p);await theme(p,'christmas');
  const illustration=await p.locator('main img[alt*="Dobby"]').getAttribute('src');
  assert.equal(await p.locator('[data-seasonal-header]').count(),1);assert.equal(await p.locator('[data-seasonal-scene]').count(),1);
  const business=()=>p.evaluate(()=>DobbyFamilyStitchEngine.evaluate('return JSON.stringify({missions:st.manualMissions,meals:st.planned,contacts:st.famContacts,members:st.familyMembers});'));
  const before=await business();
  await p.screenshot({path:path.join(out,`christmas-${width}.png`),scale:'css'});
  const geometry=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth,width:innerWidth,pointers:[...document.querySelectorAll('[data-seasonal-decoration]')].map(el=>getComputedStyle(el).pointerEvents),particles:document.querySelectorAll('.e013-particle').length}));
  assert.equal(geometry.overflow,width);assert.ok(geometry.pointers.every(v=>v==='none'));assert.ok(geometry.particles<=24,'reuses bounded native population');
  await p.locator('[data-e011-shift="1"]').click();assert.equal(await p.locator('[data-e01-days]').getAttribute('data-e01-offset'),'1');
  // No native query-string date preview.
  await p.clock.setFixedTime(new Date('2026-09-15T12:00Z'));await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await theme(p,'autumn');
  if(width===390){
   const periods={'2026-01-15':'winter','2026-01-31':'magic','2026-02-13':'valentine','2027-02-08':'carnival','2026-04-01':'easter','2026-05-15':'spring','2026-06-15':'summer','2026-07-21':'belgium','2026-09-15':'autumn','2026-10-31':'halloween','2026-11-26':'thanksgiving','2026-12-05':'saint-nicholas','2026-12-25':'christmas','2026-12-31':'new-year'};
   for(const [date,id]of Object.entries(periods)){
    await p.clock.setFixedTime(new Date(date+'T12:00Z'));await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await theme(p,id);
    if(id==='magic'){
     await p.locator('[data-seasonal-burst]').waitFor();await p.screenshot({path:path.join(out,`magic-burst-${width}.png`),scale:'css'});await p.waitForTimeout(5300);assert.equal(await p.locator('[data-seasonal-burst]').count(),0);
     await p.evaluate(()=>{DobbyChrome.apply();window.dispatchEvent(new Event('focus'));});assert.equal(await p.locator('[data-seasonal-burst]').count(),0,'January 31 is not a loop');
     await p.reload();await ready(p);await theme(p,'magic');assert.equal(await p.locator('[data-seasonal-burst]').count(),0,'session marker survives reload');
    }
    await p.screenshot({path:path.join(out,`${id}-${width}.png`),scale:'css'});
   }
  }
  await p.clock.setFixedTime(new Date('2026-12-25T12:00Z'));await p.evaluate(()=>window.dispatchEvent(new Event('pageshow')));await theme(p,'christmas');
  await p.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await p.locator('[data-seasonal-header]').count(),1,'static identity remains');
  await p.waitForFunction(()=>!document.querySelector('#e013-ambience,#fam01-ambience,[data-seasonal-burst]'));
  assert.deepEqual(await p.evaluate(()=>document.getAnimations().filter(a=>a.animationName?.startsWith('seasonal-')).map(a=>a.playState)),[]);
  await p.screenshot({path:path.join(out,`reduced-${width}.png`),scale:'css'});await p.emulateMedia({reducedMotion:'no-preference'});
  await p.goto(base+'famille.html#settings-magic');await ready(p);await p.waitForFunction(()=>document.body.dataset.familyView==='settings-magic');
  const decor=p.getByRole('switch',{name:'Décorations saisonnières',exact:true}),effects=p.getByRole('switch',{name:'Effets magiques',exact:true}),sound=p.getByRole('switch',{name:'Sons',exact:true});
  assert.equal(await decor.getAttribute('aria-checked'),'true');
  await p.evaluate(()=>{
   const player=window.DobbyMagicAudio;
   window.__seasonalCues=[];
   // A trusted click can unlock Web Audio silently. Observe playback requests.
   window.DobbyMagicAudio={...player,play(name,event){window.__seasonalCues.push(name);return player.play(name,event);}};
  });
  await sound.click();assert.deepEqual(await p.evaluate(()=>window.__seasonalCues),['confirm'],'Sons ON previews the sound');
  await decor.click();assert.equal((await prefs(p)).seasonalDecorations,false);assert.equal(await p.locator('[data-seasonal-decoration]').count(),0);
  assert.deepEqual(await p.evaluate(()=>window.__seasonalCues),['confirm'],'decorations do not request playback even with sound ON');
  await effects.click();await decor.click();await p.locator('body>nav [data-e01-destination="0"]').click();await ready(p);await theme(p,'christmas');
  assert.equal(await p.locator('#e013-ambience,#fam01-ambience,[data-seasonal-burst]').count(),0,'effects OFF has no animated seasonal emitter');
  await p.screenshot({path:path.join(out,`effects-off-${width}.png`),scale:'css'});
  await p.goto(base+'famille.html#settings-magic');await ready(p);await p.waitForFunction(()=>document.body.dataset.familyView==='settings-magic');
  await decor.click();await p.reload();await ready(p);await p.goto(base+'famille.html#settings-magic');await ready(p);await p.waitForFunction(()=>document.body.dataset.familyView==='settings-magic');
  assert.equal(await decor.getAttribute('aria-checked'),'false');assert.equal(await effects.getAttribute('aria-checked'),'false');assert.equal(await sound.getAttribute('aria-checked'),'true');
  await p.screenshot({path:path.join(out,`settings-${width}.png`),fullPage:true});
  await decor.click();await effects.click();await p.locator('body>nav [data-e01-destination="0"]').click();await ready(p);
  await p.evaluate(()=>{DobbyFamilyStitchEngine.evaluate('st.stitchPreferences.seasonalDecorations=false;save();');DobbyChrome.apply();});
  await p.screenshot({path:path.join(out,`baseline-${width}.png`),scale:'css'});
  assert.equal(await p.locator('[data-seasonal-decoration]').count(),0);assert.equal(await p.locator('#e013-ambience').count(),1,'gold ambience remains when only decorations OFF');
  await p.evaluate(()=>{DobbyFamilyStitchEngine.evaluate('st.stitchPreferences.seasonalDecorations=true;save();');DobbyChrome.apply();});
  await ctx.setOffline(true);await p.clock.setFixedTime(new Date('2026-12-27T12:00Z'));await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await theme(p,'new-year');
  await ctx.setOffline(false);
  assert.equal(await p.locator('main img[alt*="Dobby"]').getAttribute('src'),illustration);assert.equal(await business(),before,'no business record changed');
  assert.equal(await p.locator('body>header').count(),1);assert.equal(await p.locator('body>nav').count(),1);assert.deepEqual(errors,[]);
  results.push({width,status:'PASS',offline:true,persistence:true});await ctx.close();console.log('SEASONAL_BROWSER_PASS',width);
 }
 // Next-day timer must work without navigation or focus.
 const ctx=await browser.newContext({serviceWorkers:'block'});await ctx.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());const p=await ctx.newPage();
 await p.clock.install({time:new Date('2026-12-06T22:59:50Z')});await p.goto(base+'traverse.html');await ready(p);await theme(p,'saint-nicholas');await p.clock.fastForward(11000);await theme(p,'christmas');
 await p.clock.setSystemTime(new Date('2026-12-31T22:59:59Z'));await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await theme(p,'new-year');await p.clock.fastForward(2000);assert.equal(await p.locator('html').getAttribute('data-seasonal-date'),'2027-01-01');
 await p.clock.setSystemTime(new Date('2027-01-01T22:59:59Z'));await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await p.clock.fastForward(2000);await theme(p,'winter');
 await p.goto(base+'traverse.html?seasonal-date=2026-12-25');await ready(p);await theme(p,'winter');assert.equal(await p.locator('[data-seasonal-review]').count(),0,'native application has no date preview');
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.ok(await p.locator('html').evaluate(el=>el.classList.contains('seasonal-paused')));
 await p.clock.setSystemTime(new Date('2027-07-21T12:00Z'));await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await theme(p,'belgium');
 await p.evaluate(()=>{for(let i=0;i<20;i++)DobbyChrome.apply();});assert.equal(await p.locator('[data-seasonal-header]').count(),1);assert.equal(await p.locator('[data-seasonal-scene]').count(),1);
 await ctx.close();console.log('SEASONAL_MIDNIGHT_AND_LIFECYCLE_PASS');
 }finally{await browser.close();}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({base,realAccounts:false,externalTraffic:'blocked',results},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});

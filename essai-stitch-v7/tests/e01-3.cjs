/* E01.3: actual CSS motion in isolated profiles; no household records injected. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium,webkit,devices}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765',engine=process.env.DOBBY_E013_BROWSER||'chromium';
const out=path.resolve(__dirname,'../../docs/dobby-v7/evidence/e01-3');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await (engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{}:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const results=[];
 try{for(const width of [390,1440]){
  const context=await browser.newContext({...width===390?devices['iPhone 13']:{},viewport:{width,height:844},locale:'fr-BE',timezoneId:'Europe/Paris',reducedMotion:'no-preference'});
  await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const ready=()=>page.waitForFunction(()=>window.DobbyStitchV7?.ready);
  const star=()=>page.locator('[data-e01-toggle=effects]');const toggle=()=>width===390?star().tap():star().click();
  const business=()=>page.evaluate(()=>DobbyFamilyStitchEngine.evaluate('return JSON.stringify({planned:st.planned||{},missions:st.manualMissions||[],auto:st.autoTasks||[],events:st.familyEvents||[],visits:st.sharedHealthVisits||[],recipes:st.customRecipes||[]});'));
  await page.goto(origin+'/essai-stitch-v7/traverse.html');await ready();await page.locator('main img[alt*="Dobby"]').evaluate(img=>img.decode());
  const original=await business(),image=await page.locator('main img[alt*="Dobby"]').getAttribute('src');
  const cards=await page.locator('[data-e01-meal]').evaluate(el=>el.outerHTML);
  assert.equal(await star().getAttribute('aria-pressed'),'false');
  await page.screenshot({path:path.join(out,`${engine}-off-${width}.png`),scale:'css'});
  const start=Date.now();await toggle();
  await page.locator('#e013-ambience .e013-particle').first().waitFor({state:'visible',timeout:1900});
  const activationMs=Date.now()-start;assert.ok(activationMs<2000,'visible activation in less than two seconds');
  const count=await page.locator('.e013-particle').count();assert.ok(count>=12&&count<=24,'bounded, noticeable density');
  const sample=()=>page.evaluate(()=>({particles:[...document.querySelectorAll('.e013-particle')].map(el=>({transform:getComputedStyle(el).transform,opacity:getComputedStyle(el).opacity})),halo:getComputedStyle(document.querySelector('.e013-scene'),'::before').opacity}));
  const first=await sample();await sleep(350);const second=await sample();
  assert.notDeepEqual(first.particles,second.particles,'particles really move/fade over time');assert.notEqual(first.halo,second.halo,'lantern light really evolves');
  assert.ok(second.particles.filter(p=>Number(p.opacity)>.15).length>=5,'visible particles, not merely present DOM');
  const properties=await page.evaluate(()=>document.getAnimations().filter(a=>a.animationName?.startsWith('e013-')).flatMap(a=>a.effect.getKeyframes().flatMap(frame=>Object.keys(frame))));
  for(const key of properties)assert.ok(['transform','opacity','offset','computedOffset','easing','composite'].includes(key),'compositor-friendly property '+key);
  const geometry=await page.evaluate(()=>{const layer=document.getElementById('e013-ambience'),r=layer.getBoundingClientRect(),body=document.body.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth,pointer:getComputedStyle(layer).pointerEvents,left:r.left,right:r.right,bodyLeft:body.left,bodyRight:body.right};});
  assert.equal(geometry.overflow,width);assert.equal(geometry.pointer,'none');assert.ok(geometry.left>=geometry.bodyLeft-.5&&geometry.right<=geometry.bodyRight+.5);
  await page.screenshot({path:path.join(out,`${engine}-on-${width}.png`),scale:'css'});
  assert.equal(await page.locator('main img[alt*="Dobby"]').getAttribute('src'),image);assert.equal(await page.locator('[data-e01-meal]').evaluate(el=>el.outerHTML),cards,'cards untouched');
  await page.locator('[data-e011-shift="1"]').click();assert.equal(await page.locator('[data-e01-days]').getAttribute('data-e01-offset'),'1','overlay never intercepts clicks');await page.locator('[data-e011-today]').click();if(engine==='webkit'&&width===390)await page.evaluate(()=>scrollTo(0,350));else{await page.mouse.move(width/2,440);await page.mouse.wheel(0,350);}await page.waitForFunction(()=>scrollY>100);await page.evaluate(()=>scrollTo(0,0));
  // Every source refresh reuses the same fixed population.
  await page.evaluate(()=>{for(let i=0;i<15;i++)DobbyStitchV7.refresh();});assert.equal(await page.locator('#e013-ambience').count(),1);assert.equal(await page.locator('.e013-particle').count(),count);
  for(let i=0;i<8;i++){await toggle();assert.equal(await page.locator('#e013-ambience,.e013-scene,.magical-ripple,.magic-sparkle-dot').count(),0,'OFF removes all owned effects immediately');await toggle();}
  await sleep(750);assert.equal(await page.locator('.e013-particle').count(),count);assert.equal(await page.locator('.magical-ripple,.magic-sparkle-dot').count(),0,'temporary effects cleaned');
  // Deterministic lifecycle event, including a paused CSS timeline (not just a class).
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  const paused=await page.evaluate(async()=>{const animations=document.getAnimations().filter(a=>a.animationName?.startsWith('e013-'));await Promise.all(animations.map(a=>a.ready));return animations.map(a=>({state:a.playState,time:a.currentTime}));});
  assert.ok(paused.length>=count&&paused.every(a=>a.state==='paused'));await sleep(200);
  const frozen=await page.evaluate(()=>document.getAnimations().filter(a=>a.animationName?.startsWith('e013-')).map(a=>a.currentTime));assert.deepEqual(frozen,paused.map(a=>a.time));
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.locator('body').getAttribute('data-e013-state'),'on');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.body.dataset.e013State==='reduced');assert.equal(await page.locator('#e013-ambience,.e013-scene,.magical-ripple,.magic-sparkle-dot').count(),0);assert.equal(await star().getAttribute('aria-pressed'),'true');assert.notEqual(await star().evaluate(el=>getComputedStyle(el).boxShadow),'none','static indicator retained');assert.match(await star().getAttribute('aria-description'),/réduites/);
  await page.screenshot({path:path.join(out,`${engine}-reduced-${width}.png`),scale:'css'});await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#e013-ambience').waitFor();assert.doesNotMatch(await star().getAttribute('aria-description'),/réduites/);
  // Sound API calls are observable, while the original audio path stays real.
  await page.evaluate(()=>{window.__e013Audio={tones:0,vibrations:0};Object.defineProperty(navigator,'vibrate',{configurable:true,value:()=>{window.__e013Audio.vibrations++;return false;}});const Original=window.AudioContext||window.webkitAudioContext;window.AudioContext=function(...args){const ctx=new Original(...args),original=ctx.createOscillator.bind(ctx);ctx.createOscillator=(...a)=>{window.__e013Audio.tones++;return original(...a);};return ctx;};});
  await page.locator('[data-e01-toggle=sound]').click();const sounds=await page.evaluate(()=>({...window.__e013Audio}));assert.ok(sounds.tones>0&&sounds.vibrations>0,'sound control has its own feedback');
  await toggle();await toggle();assert.deepEqual(await page.evaluate(()=>window.__e013Audio),sounds,'star never invokes sound or vibration, even when sound is ON');
  await page.reload();await ready();assert.equal(await star().getAttribute('aria-pressed'),'true');await page.locator('#e013-ambience').waitFor();
  for(const destination of [1,2,3,4]){await page.locator(`[data-e01-destination="${destination}"]`).click();await page.waitForURL(url=>url.href.endsWith(['','missions.html','index.html','famille.html','famille.html#menu'][destination]));await page.waitForFunction(()=>DobbyStitchV7?.ready);assert.equal(await star().getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#e013-ambience,.e013-scene').count(),0,'no ambient deployment to secondary pages');await page.locator('[data-e01-destination="0"]').click();await page.waitForURL(/traverse.html/);await ready();await page.locator('#e013-ambience').waitFor();}
  assert.equal(await business(),original,'only existing preferences changed; household data intact');
  const cadence=await page.evaluate(()=>new Promise(resolve=>{const gaps=[];let start=performance.now(),last=start;function tick(now){gaps.push(now-last);last=now;if(now-start<1200)requestAnimationFrame(tick);else{const sorted=gaps.slice(1).sort((a,b)=>a-b);resolve({frames:sorted.length,medianMs:sorted[Math.floor(sorted.length/2)],over50ms:sorted.filter(n=>n>50).length});}}requestAnimationFrame(tick);}));
  await toggle();assert.equal(await page.locator('#e013-ambience,.e013-scene,.magical-ripple,.magic-sparkle-dot').count(),0);await page.reload();await ready();assert.equal(await star().getAttribute('aria-pressed'),'false');
  assert.deepEqual(errors,[]);results.push({engine,browserVersion:browser.version(),width,profile:width===390?'iPhone 13 emulated':'desktop',activationMs,particles:count,cadence,visibilityTest:'simulated visibilitychange; paused timelines measured',scrollTest:engine==='webkit'&&width===390?'programmatic; native wheel unavailable in mobile WebKit':'native wheel',touchInput:width===390,result:'PASS'});await context.close();console.log('E013_PASS',engine,width);
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(out,`checks-${engine}.json`),JSON.stringify(results,null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1});

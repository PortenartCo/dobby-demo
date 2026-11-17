/* Static visual acceptance: no label, animation, real account or remote service needed. */
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765',base=process.env.DOBBY_SEASONAL_BASE||origin+'/essai-stitch-v7/';
const reference=process.argv.includes('--reference'),stage=reference?'before':'after';
const out=process.env.DOBBY_SEASONAL_VISUAL_EVIDENCE||path.resolve(__dirname,'../../docs/dobby-v7/seasonal/visual-review');
const periods={christmas:'2026-12-25',halloween:'2026-10-31','new-year':'2026-12-31',valentine:'2027-02-14'};
(async()=>{fs.mkdirSync(path.join(out,stage),{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const results=[];
try{for(const width of [320,390,768,1440]){
 const originals=reference?Object.fromEntries(['seasonal-effects.js','seasonal-effects.css'].map(file=>[file,execFileSync('git',['show','fa37fd2967b84b2e3caf50198f75391d41370afd:essai-stitch-v7/'+file],{cwd:path.resolve(__dirname,'../..')})])):null;
 const ctx=await browser.newContext({viewport:{width,height:960},locale:'fr-BE',timezoneId:'Europe/Brussels',reducedMotion:'no-preference'});await ctx.route('**/*',r=>{const file=new URL(r.request().url()).pathname.split('/').pop();return originals?.[file]?r.fulfill({body:originals[file],contentType:file.endsWith('.css')?'text/css':'text/javascript'}):r.request().url().startsWith(origin+'/')?r.continue():r.abort();});const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.clock.setFixedTime(new Date('2026-12-25T12:00Z'));await p.goto(base+'traverse.html');await p.waitForFunction(()=>window.DobbyStitchV7?.ready&&!document.documentElement.classList.contains('dv7-loading'));await p.locator('main img[alt*="Dobby"]').evaluate(img=>img.decode());
 const image=await p.locator('main img[alt*="Dobby"]').getAttribute('src'),header=await p.locator('body>header').boundingBox(),dock=await p.locator('body>nav').boundingBox();
 await p.evaluate(()=>{DobbyFamilyStitchEngine.evaluate('st.stitchPreferences={...st.stitchPreferences,effects:false,sound:false,seasonalDecorations:true};save();');DobbyChrome.apply();});
 for(const [id,date]of Object.entries(periods)){
  await p.clock.setFixedTime(new Date(date+'T12:00Z'));await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await p.waitForFunction(theme=>document.documentElement.dataset.seasonalTheme===theme,id);
  await p.screenshot({path:path.join(out,stage,`${id}-${width}.png`),scale:'css'});
  if(!reference){
   assert.ok(await p.locator('[data-seasonal-header] svg').count()>0,'structured SVG header');assert.ok(await p.locator('[data-seasonal-scene] svg').count()>0,'illustrated scene framing');
   if(id!=='valentine')assert.equal(await p.locator('[data-seasonal-welcome]').count(),1,'major events decorate the welcome panel');
   const metric=await p.evaluate(()=>({width:document.documentElement.scrollWidth,pointers:[...document.querySelectorAll('[data-seasonal-decoration], [data-seasonal-decoration] *')].every(el=>getComputedStyle(el).pointerEvents==='none'),nodes:document.querySelectorAll('[data-seasonal-decoration], [data-seasonal-decoration] *').length,animated:document.getAnimations().filter(a=>a.animationName?.startsWith('seasonal-')).length}));
   assert.equal(metric.width,width);assert.ok(metric.pointers);assert.ok(metric.nodes<420,'bounded static vector budget');assert.equal(metric.animated,0,'effects OFF is completely static');
   assert.deepEqual(await p.locator('body>header').boundingBox(),header,'permanent header geometry retained');assert.deepEqual(await p.locator('body>nav').boundingBox(),dock);
   const hide=await p.addStyleTag({content:'.seasonal-caption{visibility:hidden!important}'});await p.screenshot({path:path.join(out,stage,`${id}-unlabelled-${width}.png`),scale:'css'});await hide.evaluate(n=>n.remove());
  }
  assert.equal(await p.locator('main img[alt*="Dobby"]').getAttribute('src'),image);
 }
 if(width===390||width===1440)for(const [id,date]of Object.entries({winter:'2026-01-15',spring:'2026-05-15',summer:'2026-06-15',autumn:'2026-09-15'})){
  await p.clock.setFixedTime(new Date(date+'T12:00Z'));await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await p.waitForFunction(id=>document.documentElement.dataset.seasonalTheme===id,id);assert.equal(await p.locator('[data-seasonal-scene] svg,[data-seasonal-welcome]').count(),0,'seasons keep the quiet native composition');assert.equal(await p.locator('[data-seasonal-scene] .seasonal-caption').evaluate(n=>getComputedStyle(n).fontSize),'11px','season typography stays native at desktop widths');await p.locator('main img[alt*="Dobby"]').evaluate(img=>img.decode());await p.locator('main img[alt*="Dobby"]').locator('..').screenshot({path:path.join(out,stage,`season-${id}-${width}.png`)});
 }
 if(!reference){
  await p.locator('[data-e011-shift="1"]').click();assert.equal(await p.locator('[data-e01-days]').getAttribute('data-e01-offset'),'1');await p.locator('[data-e011-today]').click();
  for(const [id,date]of Object.entries({magic:'2027-01-31',easter:'2027-03-28',carnival:'2027-02-08','saint-nicholas':'2026-12-05',thanksgiving:'2026-11-26',belgium:'2026-07-21'})){
   await p.clock.setFixedTime(new Date(date+'T12:00Z'));await p.evaluate(()=>window.dispatchEvent(new Event('focus')));await p.waitForFunction(id=>document.documentElement.dataset.seasonalTheme===id,id);assert.ok(await p.locator('[data-seasonal-scene] svg').count()>0,id+' has a tangible motif');if(width===390)await p.screenshot({path:path.join(out,stage,`${id}-${width}.png`),scale:'css'});
  }
  await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.locator('[data-seasonal-burst]').count(),0);
  await p.evaluate(()=>{DobbyFamilyStitchEngine.evaluate('st.stitchPreferences.seasonalDecorations=false;save();');DobbyChrome.apply();});assert.equal(await p.locator('[data-seasonal-decoration],[data-seasonal-panel-host]').count(),0,'OFF restores all ordinary surfaces');
 }
 assert.deepEqual(errors,[]);results.push({width,status:'PASS'});await ctx.close();console.log('SEASONAL_VISUAL_'+stage.toUpperCase()+'_PASS',width);
}}finally{await browser.close();}fs.writeFileSync(path.join(out,stage+'-results.json'),JSON.stringify({stage,base,effects:false,originalIllustration:true,results},null,2)+'\n');})().catch(e=>{console.error(e);process.exitCode=1;});

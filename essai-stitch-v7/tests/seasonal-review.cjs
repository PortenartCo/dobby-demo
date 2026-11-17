/* Verify the generated review envelope, date isolation and manifest bytes. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
const directory=process.env.DOBBY_SEASONAL_REVIEW_DIR||path.resolve(__dirname,'../../.tmp/seasonal-dev');
const base=process.env.DOBBY_SEASONAL_REVIEW_BASE||origin+'/.tmp/seasonal-dev/';
const out=process.env.DOBBY_SEASONAL_EVIDENCE||path.resolve(__dirname,'../../docs/dobby-v7/seasonal/evidence');
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(directory,'review-manifest.json')));
 assert.equal(manifest.version,'V7-SEASONAL');assert.equal(manifest.seasonal.timezone,'Europe/Brussels');assert.equal(manifest.realBackend,false);
 assert.match(manifest.storageNamespace,/dobby-review-v7-seasonal-/);
 for(const row of manifest.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(directory,row.path))).digest('hex'),row.sha256,row.path);
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox'],headless:true});
 try{
 const ctx=await browser.newContext({viewport:{width:390,height:900},locale:'fr-BE',timezoneId:'Pacific/Honolulu',reducedMotion:'no-preference'});
 await ctx.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 await ctx.addInitScript(()=>{window.__autoAudio=0;window.AudioContext=class{constructor(){window.__autoAudio++;throw Error('probe');}};});
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.clock.setFixedTime(new Date('2026-11-17T12:00Z'));await p.goto(base+manifest.entry);await p.waitForFunction(()=>window.DobbyStitchV7?.ready);
 const date=()=>p.evaluate(()=>({now:Date.now(),engine:DobbyFamilyStitchEngine.win().Date.now()}));
 const actual=await date();
 const details=p.locator('[data-seasonal-review]');await details.locator('summary').click();
 const input=details.locator('input'),preset=details.locator('select');
 await preset.selectOption('2026-12-25');await p.waitForFunction(()=>document.documentElement.dataset.seasonalTheme==='christmas');
 assert.equal((await date()).now,actual.now);assert.ok(Math.abs((await date()).engine-actual.engine)<10000,'engine business clock remains real');
 fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,'review-controls-390.png')});
 await input.fill('2021-02-14');await input.dispatchEvent('change');await p.waitForFunction(()=>document.documentElement.dataset.seasonalTheme==='valentine');
 for(const year of [2026,2027]){await input.fill(year+'-01-31');await input.dispatchEvent('change');await p.waitForFunction(expected=>document.documentElement.dataset.seasonalDate===expected,year+'-01-31');assert.equal(await p.locator('[data-seasonal-burst]').count(),1,'one burst when changing the preview year');}
 await p.waitForTimeout(5200);assert.equal(await p.locator('[data-seasonal-burst]').count(),0,'all rune nodes are reclaimed');
 await input.fill('2021-02-14');await input.dispatchEvent('change');await p.waitForFunction(()=>document.documentElement.dataset.seasonalTheme==='valentine');
 await details.locator('summary').click();await p.locator('body>nav [data-e01-destination="5"]').click();
 await p.waitForFunction(()=>document.body?.dataset.familyView==='menu');assert.equal(await p.locator('html').getAttribute('data-seasonal-theme'),'valentine');
 await p.reload();await p.waitForFunction(()=>window.DobbyStitchV7?.ready);assert.equal(await p.locator('html').getAttribute('data-seasonal-theme'),'valentine');
 await p.locator('[data-seasonal-review] summary').click();await p.locator('[data-seasonal-review] button').click();await p.waitForFunction(()=>document.documentElement.dataset.seasonalTheme==='autumn');
 assert.equal(await p.evaluate(()=>window.__autoAudio),0);assert.deepEqual(errors,[]);
 await ctx.close();
 }finally{await browser.close();}
 console.log('SEASONAL_REVIEW_PASS',manifest.sourceSha,manifest.files.length,'verified files');
})().catch(e=>{console.error(e);process.exitCode=1;});

/* Real browser, disposable profiles and fictional fixtures only. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
const base=process.env.DOBBY_SETTINGS_BASE||origin+'/essai-stitch-v7/';
const out=process.env.DOBBY_SETTINGS_EVIDENCE||path.resolve(__dirname,'../../docs/dobby-v7/settings/evidence');
const wait=(page,view)=>page.waitForFunction(expected=>window.DobbyFamilyStitch?.ready&&(!expected||DobbyFamilyStitch.view===expected&&document.body.dataset.familyView===expected)&&!document.documentElement.classList.contains('dv7-loading'),view);
async function open(page,view,values={}){await page.evaluate(({view,values})=>DobbyFamilyStitch.open(view,values),{view,values});await wait(page,view);}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const results=[];
 try{for(const width of [320,390,768,1440]){
  const ctx=await browser.newContext({viewport:{width,height:900},locale:'fr-BE',reducedMotion:'reduce'});
  await ctx.route('**/*',r=>new URL(r.request().url()).origin===new URL(origin).origin?r.continue():r.abort());
  await ctx.addInitScript(()=>{window.testSounds=0;window.AudioContext=class {constructor(){window.testSounds++;throw Error('test audio probe');}};});
  const p=await ctx.newPage();p.setDefaultTimeout(15000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'famille.html#menu');await wait(p,'menu');
  await p.getByRole('link',{name:'Paramètres',exact:true}).click();await wait(p,'settings');
  assert.equal(await p.locator('main h1').innerText(),'Paramètres');
  assert.deepEqual(await p.locator('[data-settings-card] .rg-menu-label').allTextContents(),['Ambiance magique','Gestion du foyer','Données et sauvegardes']);
  assert.equal(await p.locator('main img').count(),0);
  assert.ok(!/Retour au Menu|Options de la liste|Synchroniser le foyer|articles de courses/.test(await p.locator('main').innerText()));
  assert.equal(await p.locator('body>header').count(),1);assert.equal(await p.locator('body>nav').count(),1);
  assert.deepEqual(await p.locator('body>nav a').evaluateAll(xs=>xs.map(s=>s.getAttribute('aria-label'))),['Accueil','Tâches','Repas','Courses','Famille','Menu']);
  assert.equal(await p.locator('header [data-e01-account]').count(),1);
  const dimensions=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,font:parseFloat(getComputedStyle(document.querySelector('.rg-settings-description')).fontSize)}));
  assert.ok(dimensions.scroll<=width+1);assert.ok(dimensions.font>=16);
  await p.screenshot({path:path.join(out,'settings-'+width+'.png'),fullPage:true});
  await p.locator('[data-settings-card="settings-magic"]').focus();await p.keyboard.press('Enter');await wait(p,'settings-magic');
  const effects=p.getByRole('switch',{name:'Effets magiques',exact:true}),sound=p.getByRole('switch',{name:'Sons',exact:true});
  assert.equal(await effects.getAttribute('aria-checked'),'true');assert.equal(await sound.getAttribute('aria-checked'),'false');
  await p.evaluate(()=>{window.testSounds=0;window.AudioContext=class {constructor(){window.testSounds++;throw Error('test audio probe');}};});
  await effects.focus();await p.keyboard.press('Space');assert.equal(await effects.getAttribute('aria-checked'),'false');
  assert.equal(await p.evaluate(()=>window.testSounds),0,'Effects control never plays a sound');
  assert.equal(await p.locator('header [data-e01-toggle="effects"]').getAttribute('aria-pressed'),'false');
  await sound.click();assert.equal(await sound.getAttribute('aria-checked'),'true');
  await p.locator('header [data-e01-toggle="sound"]').click();assert.equal(await sound.getAttribute('aria-checked'),'false');
  await p.locator('header [data-e01-toggle="effects"]').click();assert.equal(await effects.getAttribute('aria-checked'),'true');
  await effects.click();await sound.click();
  await p.reload();await wait(p,'settings-magic');
  assert.equal(await effects.getAttribute('aria-checked'),'false');assert.equal(await sound.getAttribute('aria-checked'),'true');assert.equal(await p.evaluate(()=>window.testSounds),0,'Reload does not play sound even when enabled');
  assert.equal(await p.evaluate(()=>DobbyFamilyStitchEngine.read().state.stitchPreferences.effects),false);
  await sound.click();await p.screenshot({path:path.join(out,'ambience-'+width+'.png'),fullPage:true});
  await p.getByRole('button',{name:'Retour aux paramètres',exact:true}).click();await wait(p,'settings');
  await p.locator('[data-settings-card="members"]').click();await wait(p,'members');assert.equal(await p.evaluate(()=>DobbyFamilyStitch.view),'members');
  assert.equal(await p.locator('#invite-member-btn').count(),1);await p.locator('#search-input').fill('test');assert.equal(await p.locator('.fam-members-back').getAttribute('data-fa-action'),'settings','Search retains the return to settings');assert.equal(await p.locator('#add-member-btn').isDisabled(),true,'Native unauthenticated permissions retained');
  await p.getByRole('button',{name:'Retour aux paramètres',exact:true}).click();await wait(p,'settings');
  await p.locator('body>nav [data-e01-destination="4"]').click();await wait(p,'salon');await p.getByRole('button',{name:'Gérer les membres',exact:true}).click();await wait(p,'members');assert.equal(await p.locator('.fam-members-back').getAttribute('data-fa-action'),'salon','Family navigation retains its own return');await open(p,'settings');
  await p.locator('[data-settings-card="backup"]').click();await wait(p,'backup');assert.equal(await p.evaluate(()=>DobbyFamilyStitch.view),'backup');
  await open(p,'settings');
  await ctx.setOffline(true);await p.evaluate(()=>window.dispatchEvent(new Event('offline')));
  assert.match(await p.locator('[data-settings-sync]').innerText(),/Hors ligne/);
  assert.equal(await p.locator('[data-fa-action="rg-settings-sync"]').count(),0,'Offline is not fake success and offers no unusable retry');
  await ctx.setOffline(false);await p.evaluate(()=>window.dispatchEvent(new Event('online')));
  assert.equal(await p.locator('[data-settings-sync]').count(),0,'No connection chatter for a local profile');
  if(width===320){
   await p.evaluate(()=>{const w=DobbyFamilyStitchEngine.win();window.testNativeAPI=w.DobbyFamilyUI;w.DobbyFamilyUI={...w.DobbyFamilyUI,getContext:()=>({householdId:'TEST'}),getModuleStatus:()=> 'Partagé · à jour',grocery:{...w.DobbyFamilyUI.grocery,read:()=>({error:'TEST network failure'})}};});
   await open(p,'settings');assert.match(await p.locator('[data-settings-sync]').innerText(),/Connexion du foyer à vérifier/);assert.doesNotMatch(await p.locator('[data-settings-sync]').innerText(),/à jour/);assert.equal(await p.locator('[data-fa-action="rg-settings-sync"]').count(),1);
   await p.evaluate(()=>{DobbyFamilyStitchEngine.win().DobbyFamilyUI=window.testNativeAPI;delete window.testNativeAPI;});await open(p,'settings');
  }
  assert.deepEqual(errors,[]);results.push({width,status:'PASS'});await ctx.close();console.log('SETTINGS_PASS',width);
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(out,'settings-results.json'),JSON.stringify({browser:'Chromium',base,externalRequests:'blocked',realAccounts:false,results},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});

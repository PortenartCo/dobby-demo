/* Isolated local browser fixture: actual V7 engine, drafts and native writer. No backend calls. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8775';
const evidence=process.env.DOBBY_CEREMONY_EVIDENCE||path.resolve(__dirname,'../../docs/dobby-v7/evidence/stitch19-20/ceremonies');
const widths=(process.env.DOBBY_CEREMONY_WIDTHS||'320,390,768,1024,1440,1920').split(',').map(Number);
assert.ok(fs.existsSync(require('node:path').join(__dirname,'../ceremonies.js')),'Native Traverse ceremony modal exists');
(async()=>{
 fs.mkdirSync(evidence,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const width of widths){
   const context=await browser.newContext({viewport:{width,height:760},hasTouch:true,reducedMotion:'reduce'});
   await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(origin+'/essai-stitch-v7/traverse.html');
   await page.waitForFunction(()=>window.DobbyStitchV7?.ready);
   const install=async()=>{
    await page.evaluate(()=>DobbyFamilyStitchEngine.evaluate('window.DobbyReview={demoMemberId:"ceremony-test"};st.familyMembers=[{id:"ceremony-test",name:"TEST Cérémonie",memberCategory:"parent",avatar:"👤"}];save();'));
    if(!await page.evaluate(()=>!!window.DobbyCeremonies))await page.addScriptTag({url:origin+'/essai-stitch-v7/ceremonies.js'});
    await page.addStyleTag({url:origin+'/essai-stitch-v7/ceremonies.css'});
   };
   await install();
   await page.evaluate(()=>DobbyCeremonies.open({memberId:'ceremony-test',kind:'house',auto:true}));
   if(width===390){
    await page.getByRole('button',{name:'Passer le test',exact:true}).click();
    await page.getByRole('radio').first().check();
    await page.getByRole('button',{name:'Continuer',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#dobby-ceremony-title')?.textContent==='Une invitation inattendue');
    await page.getByRole('button',{name:'Reprendre plus tard',exact:true}).click();
    await page.reload();await page.waitForFunction(()=>window.DobbyStitchV7?.ready);await install();
    await page.evaluate(()=>DobbyCeremonies.open({memberId:'ceremony-test',auto:true}));
    assert.equal(await page.locator('#dobby-ceremony-title').innerText(),'Une invitation inattendue','Interrupted native draft resumes after reload');
    await page.getByRole('button',{name:'Retour',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#dobby-ceremony-title')?.textContent==="L'horloge oubliée");
    await page.getByRole('button',{name:'Retour',exact:true}).click();
    await page.getByRole('button',{name:'Choisir directement',exact:true}).waitFor();
   }
   await page.getByRole('button',{name:'Choisir directement',exact:true}).click();
   await page.locator('[data-ceremony-choice]').first().waitFor();
   assert.equal(await page.locator('[data-ceremony-choice]').count(),4);
   await page.locator('[data-ceremony-choice="ravenclaw"]').click();
   await page.getByRole('button',{name:'Confirmer ma Maison',exact:true}).click();
   await page.getByRole('button',{name:'Choisir directement',exact:true}).waitFor();
   assert.match(await page.locator('#dobby-ceremony-title').innerText(),/Patronus/);
   await page.getByRole('button',{name:'Choisir directement',exact:true}).click();
   await page.locator('[data-ceremony-choice="dolphin"]').waitFor();
   assert.equal(await page.locator('[data-ceremony-choice]').count(),12);
   const dialog=page.locator('#dobby-ceremonies'),bounds=await dialog.boundingBox();
   await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
   await page.mouse.wheel(0,420);
   await page.waitForFunction(()=>document.querySelector('#dobby-ceremonies').scrollTop>20);
   await dialog.evaluate(node=>node.scrollTop=0);
   const touch=await context.newCDPSession(page),x=bounds.x+bounds.width/2,y=bounds.y+bounds.height*.75;
   await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let step=1;step<=6;step++)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-step*45}]});
   await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForFunction(()=>document.querySelector('#dobby-ceremonies').scrollTop>20);
   const art=await page.locator('[data-ceremony-choice="dolphin"] .mp-patronus-sprite').boundingBox();
   assert.ok(Math.abs(art.width/art.height-.75)<.01,'Patronus keeps full 3:4 cell: '+JSON.stringify(art));
   await page.locator('[data-ceremony-choice="dolphin"]').scrollIntoViewIfNeeded();
   await page.locator('[data-ceremony-choice="dolphin"]').click();
   await page.getByRole('button',{name:'Confirmer mon Patronus',exact:true}).click();
   await page.waitForFunction(()=>!document.querySelector('#dobby-ceremonies'));
   const saved=await page.evaluate(()=>DobbyFamilyStitchEngine.read().members[0].magicProfile);
   assert.equal(saved.houseId,'ravenclaw');assert.equal(saved.patronusId,'dolphin');assert.equal(saved.houseSelectionSource,'manual');assert.equal(saved.ceremonyStatus,'complete');
   assert.equal(await page.evaluate(()=>DobbyCeremonies.open({memberId:'ceremony-test',auto:true})),false,'Completed profile is never repeated');
   await page.evaluate(()=>DobbyCeremonies.open({memberId:'ceremony-test',kind:'house'}));
   await page.getByRole('button',{name:'Passer le test',exact:true}).click();
   await page.locator('#dobby-ceremony-prompt').waitFor();
   assert.equal(await page.locator('#dobby-ceremony-prompt').innerText(),"Une vieille horloge du château s'arrête mystérieusement chaque nuit à 23 h 17. Tu as une heure pour découvrir pourquoi. Que fais-tu en premier ?");
   await page.getByRole('radio').nth(0).check();
   await page.getByRole('button',{name:'Continuer',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('#dobby-ceremony-title')?.textContent==='Une invitation inattendue');
   assert.equal(await page.locator('#dobby-ceremony-title').innerText(),'Une invitation inattendue');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
   if(width===390){
    for(let index=1;index<6;index++){
     await page.getByRole('radio').first().check();
     await page.getByRole('button',{name:'Continuer',exact:true}).click();
     if(index<5)await page.waitForFunction(expected=>document.querySelector('.dc-progress')?.textContent==='Question '+expected+' sur 6',index+2);
    }
    await page.getByRole('button',{name:'Confirmer ma Maison',exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('#dobby-ceremonies'));
    const mixed=await page.evaluate(()=>DobbyFamilyStitchEngine.read().members[0].magicProfile);
    assert.equal(mixed.houseSelectionSource,'calculated');assert.equal(mixed.houseAlgorithmVersion,'e06-v1');
    assert.equal(mixed.patronusSelectionSource,'manual');assert.equal(mixed.patronusId,'dolphin');assert.equal(mixed.ceremonyStatus,'complete');
   }else{
    await page.getByRole('button',{name:'Reprendre plus tard',exact:true}).click();
    assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().members[0].magicProfile.houseId),'ravenclaw','Unconfirmed retest preserves current preference');
   }
   if(width===390){
    // Exercise the actual personal-profile call site, whose first native refresh
    // occurs while the ceremony writer still owns the registration lock.
    await page.goto(origin+'/essai-stitch-v7/famille.html#personal?person=ceremony-test');
    await page.waitForFunction(()=>window.DobbyStitchV7?.ready&&window.DobbyFamilyStitch?.ready);
    await page.evaluate(()=>DobbyFamilyStitchEngine.evaluate('window.DobbyReview={demoMemberId:"ceremony-test"};'));
    await page.evaluate(async()=>{await DobbyFamilyStitchEngine.saveMagicChoice('ceremony-test','house','gryffindor');await DobbyFamilyStitch.open('personal',{person:'ceremony-test'});});
    await page.locator('.mp-house h3').waitFor();assert.equal(await page.locator('.mp-house h3').innerText(),'Gryffondor');
    await page.evaluate(()=>document.addEventListener('dobby:ceremony-confirmed',event=>{window.__confirmedProfile={registerBusy:DobbyRegister.busy,display:document.querySelector('.mp-house h3')?.textContent,...event.detail};},{once:true}));
    await page.locator('.mp-house').getByRole('button',{name:'Refaire le test',exact:true}).click();
    await page.getByRole('button',{name:'Choisir directement',exact:true}).click();
    await page.locator('[data-ceremony-choice="ravenclaw"]').click();
    await page.getByRole('button',{name:'Confirmer ma Maison',exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('#dobby-ceremonies')&&!DobbyRegister.busy);
    const after=await page.evaluate(()=>({canonical:DobbyFamilyStitchEngine.read().members.find(row=>row.id==='ceremony-test').magicProfile.houseId,display:document.querySelector('.mp-house h3')?.textContent,registerBusy:DobbyRegister.busy,bodyInert:document.querySelector('body>main').inert}));
    fs.writeFileSync(path.join(evidence,'personal-house-immediate.json'),JSON.stringify(after,null,2)+'\n');
    await page.screenshot({path:path.join(evidence,'personal-house-immediate.png'),fullPage:true});
    assert.equal(after.canonical,'ravenclaw','The native member saved the confirmed House');
    await page.waitForFunction(()=>document.querySelector('.mp-house h3')?.textContent==='Serdaigle',{},{timeout:2000});
    assert.equal(await page.locator('.mp-house h3').innerText(),'Serdaigle','The visible personal profile refreshes immediately after the write lock settles');
    await page.waitForFunction(()=>!!window.__confirmedProfile);
    assert.deepEqual(await page.evaluate(()=>window.__confirmedProfile),{registerBusy:false,display:'Serdaigle',memberId:'ceremony-test',kind:'house'},'The confirmation event follows both unlock and profile refresh');
    assert.equal(after.registerBusy,false);assert.equal(after.bodyInert,false);
   }
   if(width===320){
    await page.evaluate(()=>DobbyCeremonies.open({memberId:'ceremony-test',kind:'house'}));
    await page.evaluate(()=>{const w=DobbyFamilyStitchEngine.win(),old=w.DobbyFamilyUI,state=old.connectionState();w.DobbyFamilyUI={...old,connectionState:()=>({...state,epoch:(state.epoch||0)+1})};});
    await page.getByRole('button',{name:'Choisir directement',exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('#dobby-ceremonies'));
   }
   assert.deepEqual(errors,[]);
   await context.close();
   console.log('CEREMONIES_MODAL_PASS',width);
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

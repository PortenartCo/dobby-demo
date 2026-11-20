/* Real V7 profile and native summary. A fictional transport confirms entries. */
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const width of [320,390,1440]){
   const context=await browser.newContext({viewport:{width,height:900},locale:'fr-BE'});
   await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(origin+'/essai-stitch-v7/famille.html');
   await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready&&DobbyFamilyStitchEngine.win().DobbyFamilyMissions?.available);
   await page.evaluate(()=>{
    const E=DobbyFamilyStitchEngine,w=E.win();
    E.evaluate(`st.familyMembers=[{id:'a',name:'TEST Parent',memberCategory:'parent'},{id:'b',name:'TEST Enfant',memberCategory:'child'}];
     st.runeCredits=[];st.runeRequests=[];window.__runeResolve=null;`);
    w.__parent=true;
    w.DobbySharedRunesV3={...w.DobbySharedRunesV3,canManageRunes:()=>w.__parent,recordRunes:intent=>new Promise(resolve=>{
     w.__lastRuneIntent=intent;
     w.__runeResolve=()=>{E.evaluate(`const {expectedAmount,...entry}=p;
       st.runeCredits=[...st.runeCredits,{...entry,...(entry.kind==='correction'?{previousAmount:expectedAmount}:{}),
        eventId:'rune:'+crypto.randomUUID(),actorMemberId:'a',revision:st.runeCredits.length+1,date:new Date().toISOString()}];`,intent);resolve();};
    })};
    window.DobbyFamilyStitch.open('personal',{person:'b'});
   });
   const profile=page.locator('[data-rune-profile=b]'),dialog=page.locator('dialog.dobby-rune-entry-form');
   await profile.getByText('Accorder un bonus exceptionnel',{exact:true}).click();
   await dialog.getByLabel('Montant du bonus en Runes').fill('55');
   await dialog.getByLabel('Motif',{exact:true}).fill('Aide exceptionnelle');
   const grant=dialog.getByRole('button',{name:'Accorder le bonus',exact:true});
   await grant.click();
   assert.equal(await grant.isDisabled(),true);
   assert.equal(await profile.locator('.dobby-rune-total').textContent(),'0 runes');
   await page.evaluate(()=>DobbyFamilyStitchEngine.win().__runeResolve());
   await profile.getByText('Bonus accordé.',{exact:true}).waitFor();
   assert.equal(await profile.locator('.dobby-rune-total').textContent(),'55 runes');
   await profile.getByText('Historique des gains et annulations',{exact:true}).click();
   await profile.getByText('Corriger cette attribution',{exact:true}).click();
   await dialog.getByLabel('Montant correct en Runes').fill('15');
   await dialog.getByLabel('Motif',{exact:true}).fill('Erreur de montant');
   await dialog.getByRole('button',{name:'Enregistrer la correction',exact:true}).click();
   assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.win().__lastRuneIntent.expectedAmount),55);
   await page.evaluate(()=>DobbyFamilyStitchEngine.win().__runeResolve());
   await profile.getByText('Correction enregistrée.',{exact:true}).waitFor();
   assert.equal(await profile.locator('.dobby-rune-total').textContent(),'15 runes');
   await profile.getByText('Historique des gains et annulations',{exact:true}).click();
   assert.match(await profile.locator('ul').textContent(),/55 → 15 runes/);
   assert.match(await profile.locator('ul').textContent(),/Erreur de montant · TEST Parent/);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.evaluate(()=>{
    const E=DobbyFamilyStitchEngine;E.win().__parent=false;
    document.querySelector('[data-rune-profile=b]').replaceWith(DobbyMemberAvatar.profile(E.read().members.find(m=>m.id==='b')));
   });
   assert.equal(await profile.locator('.dobby-rune-entry-action').count(),0);
   assert.equal(await profile.locator('li[data-rune-event]').count(),2);
   assert.deepEqual(errors,[]);
   console.log('RUNES_LOT1_UI_PASS',width);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

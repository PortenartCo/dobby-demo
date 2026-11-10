/* Real native family client + V7 shopping controls against an in-memory HTTP fixture.
   No real account, external network request, or family data is used. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const evidence=path.resolve(__dirname,'../../docs/dobby-v7/evidence/cuisine/after');fs.mkdirSync(evidence,{recursive:true});
const {chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
const hh='00000000-0000-4000-8000-000000000010',uid='00000000-0000-4000-8000-000000000001';
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const rows=new Map(),writes=[];let offline=false;
  async function eventually(test){const until=Date.now()+8000;while(!test()&&Date.now()<until)await new Promise(r=>setTimeout(r,30));assert.ok(test(),'Native sync reaches the HTTP fixture');}
  try{
    for(const width of [320,390]){
    rows.clear();writes.length=0;offline=false;
    const context=await browser.newContext({viewport:{width,height:844},locale:'fr-BE',reducedMotion:'reduce'});
    await context.route('**/*',async route=>{
      const req=route.request(),url=new URL(req.url());
      if(req.url().startsWith(origin+'/'))return route.continue();
      if(!url.pathname.startsWith('/auth/v1/')&&!url.pathname.startsWith('/rest/v1/'))return route.abort();
      if(offline)return route.abort();
      const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
      if(url.pathname.includes('/auth/v1/token'))return fulfill({access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,user:{id:uid,email:'fixture@example.test'}});
      if(url.pathname.includes('dobby_v2_memberships'))return fulfill([{household_id:hh,active:true,user_id:uid}]);
      if(url.pathname.includes('dobby_v2_households'))return fulfill([{id:hh}]);
      if(!url.pathname.includes('dobby_v2_grocery'))return fulfill({code:'PGRST205',message:'Optional modules absent in this grocery fixture'},404);
      const id=(url.searchParams.get('id')||'').replace(/^eq\./,''),method=req.method();
      if(method==='GET')return fulfill(id?[rows.get(id)].filter(Boolean):[...rows.values()]);
      const body=req.postDataJSON();writes.push({method,id,body});
      if(method==='POST'){rows.set(body.id,{...body,revision:1});return fulfill([rows.get(body.id)],201);}
      if(method==='PATCH'){
        const old=rows.get(id);if(!old||String(old.revision)!==(url.searchParams.get('revision')||'').replace(/^eq\./,''))return fulfill([]);
        rows.set(id,{...old,...body,revision:old.revision+1});return fulfill([rows.get(id)]);
      }
      throw Error('Unexpected grocery request '+method);
    });
    const page=await context.newPage();page.setDefaultTimeout(12000);page.on('dialog',d=>d.accept());
    await page.goto(origin+'/essai-stitch-v7/');await page.waitForFunction(()=>window.DobbyCuisine?.ready);
    await page.evaluate(()=>{DobbyCuisineEngine.evaluate('st.shopFinal=null;st.planned={"2026-11-09-soir":{id:"pasta",adult:2,children:1,childFactor:.65,status:"prévu"}};save();');return DobbyCuisine.open('shop');});
    assert.ok((await page.locator('#cu-shared').textContent()).includes('Non connecté'));
    await page.locator('#cu-shared [data-cu-action="account"]').click();
    const engine=page.frameLocator('#dv7-engine');
    await engine.locator('#fv2LoginForm [name="key"]').fill('sb_publishable_fixture_only_123456789');
    await engine.locator('#fv2LoginForm [name="email"]').fill('fixture@example.test');
    await engine.locator('#fv2LoginForm [name="password"]').fill('fixture-only-password');
    await engine.locator('#fv2LoginForm button[type="submit"]').click();
    await page.waitForFunction(()=>DobbyCuisineEngine.win().DobbyFamilyUI.getContext()?.householdId);
    await page.locator('#dv7-close').click();
    // A validated meal list is not automatically published to the grocery store.
    await page.locator('#btn-submit-cart').click();await page.waitForFunction(()=>DobbyCuisine.view==='shop-final');
    assert.equal(rows.size,0,'No automatic grocery publication on validation');
    assert.equal(writes.filter(x=>x.method==='POST').length,0);
    await page.locator('[data-cu-action="edit-shop"]').first().click();await page.waitForFunction(()=>DobbyCuisine.view==='shop');
    await page.locator('#cu-family-title').fill('TEST — Article commun');await page.locator('#cu-family-quantity').fill('0.5');await page.locator('#cu-family-unit').fill('kg');
    await page.locator('#cu-family-add button[type="submit"]').click();
    await page.waitForFunction(()=>document.querySelector('#cu-shared')?.textContent.includes('TEST — Article commun'));
    await eventually(()=>[...rows.values()][0]?.quantity===0.5);
    assert.equal([...rows.values()][0]?.quantity,0.5,'Fractional quantity survives the real family form');
    await page.locator('[data-cu-action="family-edit"]').first().click();
    await page.locator('#cu-edit-title').fill('TEST — Article modifié');await page.locator('#cu-family-edit button[type="submit"]').click();
    await page.waitForFunction(()=>document.querySelector('#cu-shared')?.textContent.includes('TEST — Article modifié'));
    await eventually(()=>[...rows.values()][0]?.title==='TEST — Article modifié');
    await page.screenshot({path:path.join(evidence,`shop-connected-${width}.png`),fullPage:true});
    offline=true;
    await page.locator('[data-cu-family-check]').first().check();
    await page.waitForFunction(()=>DobbyCuisineEngine.read().shared.items[0]?.checked);
    assert.ok((await page.locator('#cu-shared').textContent()).includes('Article acheté'));
    await page.screenshot({path:path.join(evidence,`shop-offline-${width}.png`),fullPage:true});
    await page.reload();await page.waitForFunction(()=>DobbyCuisine?.ready);
    await page.waitForFunction(()=>DobbyCuisineEngine.read().shared?.items[0]?.checked===true);
    assert.equal(await page.locator('[data-cu-family-check]').first().isChecked(),true,'Offline grocery checkbox survives reload');
    const shared=[...rows.values()][0];rows.set(shared.id,{...shared,title:'TEST — Modification concurrente',revision:shared.revision+1});
    offline=false;await page.locator('[data-cu-action="family-sync"]').click();
    await page.locator('[data-cu-action="family-conflict-local"]').first().waitFor();
    await page.screenshot({path:path.join(evidence,`shop-conflict-${width}.png`),fullPage:true});
    assert.equal(await page.locator('[data-cu-family-check]').first().isDisabled(),true);
    await page.locator('[data-cu-action="family-conflict-local"]').first().click();
    await eventually(()=>[...rows.values()][0]?.checked===true);
    assert.equal([...rows.values()][0].checked,true,'Offline edit reaches the in-memory server through native sync');
    assert.ok(writes.some(x=>x.method==='POST')&&writes.some(x=>x.method==='PATCH'));
    assert.ok(writes.every(x=>x.method!=='POST'||x.body.household_id===hh));
    assert.equal(rows.size,1,'Resync/conflict changes the existing item without duplicates');
    // Native validation archives meal coverage; import uses a genuinely new pending meal.
    await page.evaluate(()=>{DobbyCuisineEngine.evaluate('st.planned["2026-11-10-soir"]={id:"pasta",adult:2,children:1,childFactor:.65,status:"prévu"};save();');return DobbyCuisine.open('shop');});
    await page.locator('[data-cu-action="family-import"]').click();await eventually(()=>rows.size>1);
    console.log('CUISINE_FAMILY_PASS '+width+'px native connection, add, fractional quantity, edit, offline check, conflict resolution, resync and recipe import (HTTP fixture only)');
    await context.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

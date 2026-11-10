/* Real native family client + V7 shopping controls against an in-memory HTTP fixture.
   No real account, external network request, or family data is used. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const evidence=path.resolve(__dirname,'../../docs/dobby-v7/evidence/e07-2/family');fs.mkdirSync(evidence,{recursive:true});
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
    assert.match(await page.locator('.e07-scope').innerText(),/Sur cet appareil/);
    await page.locator('[data-cu-action="account"]').filter({hasText:'Connecter mon foyer'}).click();
    const engine=page.frameLocator('#dv7-engine');
    await engine.locator('#fv2LoginForm [name="key"]').fill('sb_publishable_fixture_only_123456789');
    await engine.locator('#fv2LoginForm [name="email"]').fill('fixture@example.test');
    await engine.locator('#fv2LoginForm [name="password"]').fill('fixture-only-password');
    await engine.locator('#fv2LoginForm button[type="submit"]').click();
    await page.waitForFunction(()=>DobbyCuisineEngine.win().DobbyFamilyUI.getContext()?.householdId);
    await page.locator('#dv7-close').click();await page.evaluate(()=>DobbyCuisine.refresh());
    assert.equal(await page.locator('#cu-shared').count(),0,'Only the active family list is visible');
    assert.equal(rows.size,0,'Planning and opening shop never publish ingredients');
    assert.equal(writes.filter(x=>x.method==='POST').length,0);
    const add=async(name,qty='0.5',unit='kg')=>{await page.locator('[data-cu-action=e072-add]').click();await page.locator('#e072-name').fill(name);await page.locator('#e072-qty').fill(qty);await page.locator('#e072-unit').fill(unit);await page.locator('[data-cu-action=e072-save]').click();};
    await add('TEST — Article commun');await eventually(()=>[...rows.values()][0]?.quantity===0.5);
    await page.locator('[data-cu-action=e072-edit]').first().click();await page.locator('#e072-name').fill('TEST — Article modifié');await page.locator('[data-cu-action=e072-save]').click();await eventually(()=>[...rows.values()][0]?.title==='TEST — Article modifié');
    await page.screenshot({path:path.join(evidence,`shop-connected-${width}.png`),fullPage:true});
    offline=true;await page.locator('[data-cu-action=e072-check]').first().click();await page.waitForFunction(()=>DobbyCuisineEngine.win().DobbyFamilyUI.grocery.read().items[0]?.checked);
    await page.screenshot({path:path.join(evidence,`shop-offline-${width}.png`),fullPage:true});await page.reload();await page.waitForFunction(()=>DobbyCuisine?.ready);await page.waitForFunction(()=>DobbyCuisineEngine.win().DobbyFamilyUI.grocery.read().items[0]?.checked);
    assert.equal(await page.locator('[data-e072-purchased] [data-e072-item]').count(),1,'Offline check persists');assert.match(await page.locator('.e07-scope').innerText(),/attente|Hors ligne|locale/);
    const shared=[...rows.values()][0];rows.set(shared.id,{...shared,title:'TEST — Modification concurrente',revision:shared.revision+1});offline=false;await page.locator('[data-cu-action=e072-sync]').click();await page.locator('[data-cu-action=e072-conflict-local]').first().waitFor();await page.screenshot({path:path.join(evidence,`shop-conflict-${width}.png`),fullPage:true});assert.equal(await page.locator('[data-cu-action=e072-check]').first().isDisabled(),true);await page.locator('[data-cu-action=e072-conflict-local]').first().click();await eventually(()=>[...rows.values()][0]?.checked===true);assert.equal(rows.size,1);
    await page.locator('[data-cu-action=e072-check]').first().click();await eventually(()=>[...rows.values()][0]?.checked===false);
    await page.locator('[data-cu-action=e072-preview]').click();const noImportPosts=writes.filter(x=>x.method==='POST').length;await page.locator('[data-cu-action=e072-cancel]').click();assert.equal(writes.filter(x=>x.method==='POST').length,noImportPosts);
    await page.locator('[data-cu-action=e072-preview]').click();await page.locator('[data-cu-action=e072-confirm]').click();await page.locator('[data-e072-dialog]').waitFor({state:'detached'});await page.waitForFunction(()=>DobbyCuisineEngine.win().DobbyFamilyUI.grocery.read().items.every(x=>x.syncState==='clean'));const size=rows.size;await page.reload();await page.waitForFunction(()=>DobbyCuisine?.ready);await page.locator('[data-cu-action=e072-preview]').click();assert.equal(await page.locator('[data-e072-token]').count(),0,'Repeated consultation does not offer already imported contributions');await page.locator('[data-cu-action=e072-cancel]').click();assert.equal(rows.size,size,'Repeated confirmation/reload does not duplicate family imports');
    await page.evaluate(()=>{DobbyCuisineEngine.evaluate('st.planned["2026-11-09-soir"].adult=3;save();');return DobbyCuisine.refresh();});await page.locator('[data-cu-action=e072-preview]').click();await page.locator('[data-e072-token]').first().uncheck();await page.locator('main h1').click();await page.evaluate(()=>DobbyCuisineEngine.win().DobbyFamilyUI.grocery.sync());await page.evaluate(()=>DobbyCuisine.refresh());assert.equal(await page.locator('[data-e072-token]').first().isChecked(),false,'Native sync preserves ingredient exclusions');await page.locator('[data-cu-action=e072-confirm]').click();await page.waitForFunction(()=>DobbyCuisineEngine.win().DobbyFamilyUI.grocery.read().items.every(x=>x.syncState==='clean'));assert.equal(rows.size,size,'Portion changes update imported rows instead of adding another full contribution');assert.equal([...rows.values()].find(x=>x.title==='Pâtes sèches').quantity,212,'Excluded ingredient remains unchanged');await page.locator('[data-cu-action=e072-preview]').click();await page.locator('[data-cu-action=e072-confirm]').click();await eventually(()=>[...rows.values()].find(x=>x.title==='Pâtes sèches').quantity===292);assert.equal(rows.size,size);

    // Explicit local transfer, repeated on the same device, preserves manual family rows.
    await page.evaluate(()=>{DobbyCuisineEngine.evaluate("st.extras=['TEST — Local conservé'];save();");return DobbyCuisine.refresh();});await page.locator('[data-cu-action=e072-transfer]').click();await page.locator('[data-cu-action=e072-cancel]').click();assert.equal(rows.size,size);await page.locator('[data-cu-action=e072-transfer]').click();await page.locator('[data-cu-action=e072-confirm-transfer]').click();await eventually(()=>[...rows.values()].some(x=>x.title==='TEST — Local conservé'));const afterTransfer=rows.size;await page.locator('[data-cu-action=e072-transfer]').click();await page.locator('[data-cu-action=e072-confirm-transfer]').click();assert.equal(rows.size,afterTransfer);
    await page.locator('[data-cu-action=e072-check]').first().click();await page.locator('[data-cu-action=e072-finish]').click();await page.locator('[data-cu-action=e072-confirm-finish]').click();await eventually(()=>[...rows.values()].some(x=>x.deleted_at));assert.ok([...rows.values()].some(x=>!x.deleted_at),'Unbought family rows survive ending');
    await add('TEST — Retrait volontaire');const toRemove=page.locator('[data-e072-item]').filter({hasText:'TEST — Retrait volontaire'});await toRemove.locator('[data-cu-action=e072-edit]').click();await page.locator('[data-cu-action=e072-delete]').click();await page.locator('[data-cu-action=e072-confirm-delete]').click();await eventually(()=>[...rows.values()].some(x=>x.title==='TEST — Retrait volontaire'&&x.deleted_at));
    assert.ok(writes.some(x=>x.method==='POST')&&writes.some(x=>x.method==='PATCH'));assert.ok(writes.every(x=>x.method!=='POST'||x.body.household_id===hh));
    console.log('CUISINE_FAMILY_PASS '+width+'px unique verified-family list, native CRUD, fractional qty, offline/reload, conflicts, explicit menu/local imports, deduplication and partial archive (HTTP fixture only)');
    await context.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

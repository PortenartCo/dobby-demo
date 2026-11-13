/* Real native family client + V7 shopping controls against an in-memory HTTP fixture.
   No real account, external network request, or family data is used. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const evidence=path.resolve(process.env.DOBBY_E07_EVIDENCE||path.resolve(__dirname,'../../docs/dobby-v7/evidence/e07-2'),'family');fs.mkdirSync(evidence,{recursive:true});
const {chromium}=require('playwright');
const {canonicalGroceryFixture,assertCanonicalGroceryIdentity}=require(path.join(__dirname,'helpers/canonical-grocery-fixture.cjs'));
const {checkCanonicalGrocerySnapshot}=require('./canonical-grocery-fixture.test.cjs');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
const hh='00000000-0000-4000-8000-000000000010',uid='00000000-0000-4000-8000-000000000001';
const canonical=canonicalGroceryFixture(hh,{A:uid});
// Exercise the production Settings mount with the native fixture engine.
async function shoppingSettings(page,copy=false){if(copy){await page.waitForFunction(()=>{const api=DobbyCuisineEngine.win().DobbyFamilyUI,read=api.grocery.read();return api.access.state().verified===true&&api.getContext()?.identityVerified===true&&!api.connectionState().verifying&&/à jour/.test(read.status)&&!read.error&&read.items.every(x=>x.syncState==='clean');});await assertCanonicalGroceryIdentity(page,canonical.context('A'));}await page.evaluate(()=>{let target=document.querySelector('#shopping-settings-fixture');if(!target){target=document.createElement('section');target.id='shopping-settings-fixture';document.body.append(target);}window.__shoppingSettingsCleanup?.();window.__shoppingSettingsCleanup=DobbyShoppingUI.mountSettings(target);});}
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const rows=new Map(),writes=[];let offline=false;
  async function eventually(test){const until=Date.now()+8000;while(!test()&&Date.now()<until)await new Promise(r=>setTimeout(r,30));assert.ok(test(),'Native sync reaches the HTTP fixture');}
  try{
    console.log('CANONICAL_GROCERY_SNAPSHOT_PASS '+await checkCanonicalGrocerySnapshot(browser)+' cases');
    for(const width of [390]){
    rows.clear();writes.length=0;offline=false;
    const context=await browser.newContext({viewport:{width,height:844},locale:'fr-BE',reducedMotion:'reduce'});
    await context.route('**/*',async route=>{
      const req=route.request(),url=new URL(req.url());
      if(req.url().startsWith(origin+'/'))return route.continue();
      if(!url.pathname.startsWith('/auth/v1/')&&!url.pathname.startsWith('/rest/v1/'))return route.abort();
      if(offline)return route.abort();
      const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
      if(url.pathname.includes('/auth/v1/token'))return fulfill({access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,user:{id:uid,email:'fixture@example.test'}});
      if(url.pathname.includes('dobby_v2_memberships'))return fulfill([{household_id:hh,active:true,user_id:uid,role:'owner'}]);
      if(url.pathname.includes('dobby_v2_households'))return fulfill([{id:hh}]);
      if(url.pathname.endsWith('/rpc/dobby_v7_context'))return fulfill(canonical.context('A'));
      if(url.pathname.endsWith('/dobby_v2_modules')){assert.equal(req.method(),'GET','Grocery fixture does not mutate the canonical family registry');return fulfill(url.searchParams.get('module')==='eq.family'?[canonical.familyRow]:url.searchParams.has('module')?[]:[{module:'family'}]);}
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
    await page.evaluate(()=>{DobbyCuisineEngine.evaluate('st.shopFinal=null;st.planned={[todayISO()+"-soir"]:{id:"pasta",adult:2,children:1,childFactor:.65,status:"prévu"}};save();');return DobbyCuisine.open('shop');});
    assert.match(await page.locator('.e07-scope').innerText(),/Sur cet appareil/);
    await page.locator('[data-cu-action="account"]').filter({hasText:'Connecter mon foyer'}).click();
    const engine=page.frameLocator('#dv7-engine');
    await engine.locator('#fv2LoginForm [name="key"]').fill('sb_publishable_fixture_only_123456789');
    await engine.locator('#fv2LoginForm [name="email"]').fill('fixture@example.test');
    await engine.locator('#fv2LoginForm [name="password"]').fill('fixture-only-password');
    await engine.locator('#fv2LoginForm button[type="submit"]').click();
    await page.waitForFunction(()=>DobbyCuisineEngine.win().DobbyFamilyUI.getContext()?.identityVerified===true);
    await assertCanonicalGroceryIdentity(page,canonical.context('A'));
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
    const shared=[...rows.values()][0];rows.set(shared.id,{...shared,title:'TEST — Modification concurrente',revision:shared.revision+1});offline=false;await shoppingSettings(page);await page.locator('[data-shopping-setting=sync]').click();await page.waitForFunction(()=>DobbyCuisineEngine.win().DobbyFamilyUI.getContext()?.identityVerified===true);await assertCanonicalGroceryIdentity(page,canonical.context('A'));await page.locator('[data-cu-action=e072-conflict-local]').first().waitFor();await page.screenshot({path:path.join(evidence,`shop-conflict-${width}.png`),fullPage:true});assert.equal(await page.locator('[data-cu-action=e072-check]').first().isDisabled(),true);await page.locator('[data-cu-action=e072-conflict-local]').first().click();await eventually(()=>[...rows.values()][0]?.checked===true);assert.equal(rows.size,1);
    await page.locator('[data-cu-action=e072-check]').first().click();await eventually(()=>[...rows.values()][0]?.checked===false);
    await page.locator('[data-cu-action=e072-preview]').click();const noImportPosts=writes.filter(x=>x.method==='POST').length;await page.locator('[data-cu-action=e072-cancel]').click();assert.equal(writes.filter(x=>x.method==='POST').length,noImportPosts);
    await page.locator('[data-cu-action=e072-preview]').click();await page.locator('[data-cu-action=e072-confirm]').click();await page.locator('[data-e072-dialog]').waitFor({state:'detached'});await page.waitForFunction(()=>DobbyCuisineEngine.win().DobbyFamilyUI.grocery.read().items.every(x=>x.syncState==='clean'));const size=rows.size;await page.reload();await page.waitForFunction(()=>DobbyCuisine?.ready);await shoppingSettings(page);await page.locator('[data-shopping-setting=sync]').click();await page.waitForFunction(()=>DobbyCuisineEngine.win().DobbyFamilyUI.getContext()?.identityVerified===true);await assertCanonicalGroceryIdentity(page,canonical.context('A'));await page.evaluate(()=>DobbyCuisine.refresh());await page.locator('[data-cu-action=e072-preview]').click();assert.equal(await page.locator('[data-e072-token]').count(),0,'Repeated consultation does not offer already imported contributions');await page.locator('[data-cu-action=e072-cancel]').click();assert.equal(rows.size,size,'Repeated confirmation/reload does not duplicate family imports');
    await page.evaluate(()=>{DobbyCuisineEngine.evaluate('st.planned[todayISO()+"-soir"].adult=3;save();');return DobbyCuisine.refresh();});await page.locator('[data-cu-action=e072-preview]').click();await page.locator('[data-e072-token]').first().uncheck();await page.locator('[data-e072-dialog] h2').click();await page.evaluate(()=>DobbyCuisineEngine.win().DobbyFamilyUI.grocery.sync());await page.evaluate(()=>DobbyCuisine.refresh());assert.equal(await page.locator('[data-e072-token]').first().isChecked(),false,'Native sync preserves ingredient exclusions');await page.locator('[data-cu-action=e072-confirm]').click();await page.waitForFunction(()=>DobbyCuisineEngine.win().DobbyFamilyUI.grocery.read().items.every(x=>x.syncState==='clean'));assert.equal(rows.size,size,'Portion changes update imported rows instead of adding another full contribution');assert.equal([...rows.values()].find(x=>x.title==='Pâtes sèches').quantity,212,'Excluded ingredient remains unchanged');await page.locator('[data-cu-action=e072-preview]').click();await page.locator('[data-cu-action=e072-confirm]').click();await eventually(()=>[...rows.values()].find(x=>x.title==='Pâtes sèches').quantity===292);assert.equal(rows.size,size);

    // Explicit local transfer, repeated on the same device, preserves manual family rows.
    await page.evaluate(()=>{DobbyCuisineEngine.evaluate("st.extras=['TEST — Local conservé'];save();");return DobbyCuisine.refresh();});await shoppingSettings(page,true);await page.locator('[data-shopping-setting=transfer]').click();assert.equal(await page.locator('[data-shopping-setting=cancel]').count(),1,'Transfer confirmation: '+await page.evaluate(()=>{const api=DobbyCuisineEngine.win().DobbyFamilyUI;return JSON.stringify({settings:document.querySelector('#shopping-settings-fixture')?.textContent,access:api.access.state(),binding:api.getContext(),connection:api.connectionState()});}));await page.locator('[data-shopping-setting=cancel]').click();assert.equal(rows.size,size);await shoppingSettings(page,true);await page.locator('[data-shopping-setting=transfer]').click();await page.locator('[data-shopping-setting=confirm-transfer]').click();await eventually(()=>[...rows.values()].some(x=>x.title==='TEST — Local conservé'));const afterTransfer=rows.size;await shoppingSettings(page,true);await page.locator('[data-shopping-setting=transfer]').click();await page.locator('[data-shopping-setting=confirm-transfer]').click();assert.equal(rows.size,afterTransfer);
    await page.locator('[data-cu-action=e072-check]').first().click();await page.locator('[data-cu-action=e072-finish]').click();await page.locator('[data-cu-action=e072-confirm-finish]').click();await eventually(()=>[...rows.values()].some(x=>x.deleted_at));assert.ok([...rows.values()].some(x=>!x.deleted_at),'Unbought family rows survive ending');
    await add('TEST — Retrait volontaire');const toRemove=page.locator('[data-e072-item]').filter({hasText:'TEST — Retrait volontaire'});await toRemove.locator('[data-cu-action=e072-edit]').click();await page.locator('[data-e072-dialog] [data-cu-action=e072-delete]').click();await page.locator('[data-cu-action=e072-confirm-delete]').click();await eventually(()=>[...rows.values()].some(x=>x.title==='TEST — Retrait volontaire'&&x.deleted_at));
    // Same native writer: two recipe sources, a manual article and reload.
    await page.evaluate(()=>{DobbyCuisineEngine.evaluate(`custom=[{id:'p02a',name:'Soupe',servings:2,ingredients:[['TEST — Carottes',200,'g']],steps:['Cuire']},{id:'p02b',name:'Gratin',servings:2,ingredients:[['TEST — Carottes',.3,'kg']],steps:['Cuire']}];st.customRecipes=custom;st.planned={[st.day+'-midi']:{id:'p02a',adult:2},[st.day+'-soir']:{id:'p02b',adult:2}};save();`);return DobbyCuisine.refresh();});
    await add('TEST — Carottes','200','g');await eventually(()=>[...rows.values()].some(x=>x.title==='TEST — Carottes'&&x.quantity===200));await page.waitForFunction(()=>DobbyCuisineEngine.win().DobbyFamilyUI.grocery.read().items.every(x=>x.syncState==='clean'));
    const call=(method,...args)=>page.evaluate(({method,args})=>DobbyCuisineList[method](DobbyCuisineEngine,...args),{method,args});
    const proposal=await call('preview');assert.equal(proposal.rows.length,1);assert.equal(proposal.rows[0].qty,300);assert.equal(proposal.rows[0].toBuyQty,500);await call('confirmImport',proposal);
    await page.waitForFunction(()=>DobbyCuisineEngine.win().DobbyFamilyUI.grocery.read().items.every(x=>x.syncState==='clean'));let item=(await call('snapshot')).items.find(x=>x.name==='TEST — Carottes');assert.equal(item.qty,500);await page.reload();await page.waitForFunction(()=>DobbyCuisine?.ready);await shoppingSettings(page);await page.locator('[data-shopping-setting=sync]').click();await page.waitForFunction(()=>DobbyCuisineEngine.win().DobbyFamilyUI.getContext()?.identityVerified===true);await assertCanonicalGroceryIdentity(page,canonical.context('A'));await page.waitForFunction(()=>DobbyCuisineEngine.win().DobbyFamilyUI.grocery.read().items.every(x=>x.syncState==='clean'));assert.equal((await call('preview')).rows.length,0,'Recipe receipts remain idempotent after remote normalization/reload');
    // home() confirms the local IDB edit, then starts the HTTP sync in the
    // background. Wait for its acknowledgement before the next independent
    // scenario, so that acknowledgement cannot stale the next summary's CAS.
    const settleHome=()=>page.waitForFunction(()=>{const api=DobbyCuisineEngine.win().DobbyFamilyUI,read=api.grocery.read();return !api.connectionState().verifying&&!read.error&&/à jour/.test(read.status)&&read.items.length>0&&read.items.every(x=>x.syncState==='clean');});
    item=(await call('snapshot')).items.find(x=>x.name==='TEST — Carottes');await settleHome();
    await call('home',item.id,150);assert.equal((await call('snapshot')).items.find(x=>x.id===item.id).qty,350);await settleHome();
    await call('home',item.id,500);assert.equal((await call('snapshot')).items.find(x=>x.id===item.id).done,false);await settleHome();
    await call('home',item.id,0);assert.equal((await call('snapshot')).items.find(x=>x.id===item.id).qty,500);await settleHome();
    assert.ok(writes.some(x=>x.method==='POST')&&writes.some(x=>x.method==='PATCH'));assert.ok(writes.every(x=>x.method!=='POST'||x.body.household_id===hh));
    console.log('CUISINE_FAMILY_PASS '+width+'px unique verified-family list, native CRUD, fractional qty, offline/reload, conflicts, explicit menu/local imports, deduplication and partial archive (HTTP fixture only)');
    await context.close();
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

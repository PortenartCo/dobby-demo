/* Native ZIP, IndexedDB, module sync and rendering in two separate browser profiles.
   The HTTP routes are fictional. The matching server authorization is tested in PostgreSQL. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {chromium}=require('playwright');
const {canonicalGroceryFixture,assertCanonicalGroceryIdentity}=require('./helpers/canonical-grocery-fixture.cjs');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8773',out=process.env.DOBBY_CATALOGUE_EVIDENCE;
const registry=process.env.DOBBY_CATALOGUE_FIXTURE;
const hh='00000000-0000-4000-8000-000000000010',users={A:'00000000-0000-4000-8000-000000000001',B:'00000000-0000-4000-8000-000000000002'};
const identity=canonicalGroceryFixture(hh,users);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const zip=[...fs.readFileSync(path.join(__dirname,'fixtures/e07-4/steps.zip'))];
const eventually=async check=>{for(let i=0;i<150;i++){if(check())return;await new Promise(r=>setTimeout(r,60));}assert.ok(check(),'Transport fixture did not converge');};
async function mount(browser,width,device,remote){
 const context=await browser.newContext({viewport:{width,height:900},locale:'fr-BE',reducedMotion:'reduce'});
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url()),endpoint=u.pathname.split('/').at(-1);
  if(req.url().startsWith(origin+'/')){
   const dir='/essai-stitch-v5-famille/catalogue/';
   if(registry&&u.pathname.startsWith(dir))return route.fulfill({path:path.join(registry,u.pathname.slice(dir.length))});
   return route.continue();
  }
  if(!/^\/(auth|rest)\/v1\//.test(u.pathname)||req.method()==='OPTIONS')return route.abort();
  const fulfill=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
  const missing=()=>fulfill({code:'PGRST202',message:'Optional function unavailable'},404);
  if(endpoint==='token')return fulfill({access_token:'fixture-'+device,refresh_token:'fixture-refresh-'+device,expires_in:3600,user:{id:users[device],email:'parent@example.test'}});
  assert.equal(req.headers().authorization,'Bearer fixture-'+device);
  if(endpoint==='dobby_v2_memberships')return fulfill([{household_id:hh,active:true,user_id:users[device],role:'owner'}]);
  if(endpoint==='dobby_v2_households')return fulfill([{id:hh}]);
  if(endpoint==='dobby_v7_context')return fulfill(identity.context(device));
  if(endpoint==='dobby_v2_grocery')return fulfill([]);
  if(endpoint==='dobby_v2_modules'){
   if(req.method()==='GET'){
    const module=u.searchParams.get('module');
    if(module==='eq.family')return fulfill([identity.familyRow]);
    if(module==='eq.recipes')return fulfill([remote.recipe].filter(Boolean));
    if(!module)return fulfill([{module:'family'},...(remote.recipe?[{module:'recipes'}]:[])]);
    return fulfill([]);
   }
   const packet=req.postDataJSON(),previous=remote.recipe;
   assert.equal(device,'A');
   if(req.method()==='POST'){
    assert.equal(packet.household_id,hh);assert.equal(packet.module,'recipes');assert.equal(previous,null);
   }else{
    assert.equal(req.method(),'PATCH');
    assert.equal(u.searchParams.get('module'),'eq.recipes');
    assert.equal(u.searchParams.get('revision'),'eq.'+previous.revision);
   }
   const payload=packet.payload;
   for(const match of JSON.stringify(payload).matchAll(/recipe-media-([a-f0-9]{64})/g))assert.ok(remote.staged.has(match[1]),'CAS waits for the image');
   remote.recipe={module:'recipes',household_id:hh,revision:(previous?.revision||0)+1,payload};
   remote.writes++;
   return fulfill([remote.recipe]);
  }
  if(endpoint==='dobby_recipe_media_missing'){
   assert.equal(u.searchParams.get('p_household'),hh);
   return fulfill(u.searchParams.get('p_hashes').slice(1,-1).split(',').filter(s=>!remote.staged.has(s)));
  }
  if(endpoint==='dobby_recipe_media_stage'){
   const p=req.postDataJSON();assert.equal(device,'A');assert.equal(p.p_household,hh);
   assert.equal(hash(Buffer.from(p.p_base64,'base64')),p.p_sha256);
   remote.staged.set(p.p_sha256,{type:p.p_mime,base64:p.p_base64});return fulfill(true);
  }
  if(endpoint==='dobby_recipe_media_read'){
   const key=u.searchParams.get('p_sha256');assert.equal(u.searchParams.get('p_household'),hh);
   assert.ok(JSON.stringify(remote.recipe?.payload).includes('recipe-media-'+key));
   remote.reads.add(device);return fulfill(remote.staged.get(key)||null);
  }
  return missing();
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(origin+'/essai-stitch-v7/');await page.waitForFunction(()=>window.DobbyCuisine?.ready);
 await page.evaluate(()=>DobbyCuisine.open('shop'));
 await page.locator('[data-cu-action="account"]').filter({hasText:'Connecter mon foyer'}).click();
 const engine=page.frameLocator('#dv7-engine');
 await engine.locator('#fv2LoginForm [name="key"]').fill('sb_publishable_fixture_only_123456789');
 await engine.locator('#fv2LoginForm [name="email"]').fill('parent@example.test');
 await engine.locator('#fv2LoginForm [name="password"]').fill('fixture-only-password');
 await engine.locator('#fv2LoginForm button[type="submit"]').click();
 await assertCanonicalGroceryIdentity(page,identity.context(device));
 await engine.locator('[data-fm-action="activate"][data-module="recipes"]').click();
 await page.waitForFunction(()=>DobbyCuisineEngine.win().DobbyFamilyUI.isModuleActive('recipes'));
 await page.locator('#dv7-close').click();
 return {page,context,errors};
}
async function checkImage(locator){
 await locator.waitFor();
 assert.ok(await locator.evaluate(img=>img.complete&&img.naturalWidth>0 || new Promise(done=>{
  img.addEventListener('load',()=>done(true),{once:true});img.addEventListener('error',()=>done(false),{once:true});setTimeout(()=>done(false),4000);
 })));
 const bytes=await locator.evaluate(async img=>[...new Uint8Array(await (await fetch(img.src)).arrayBuffer())]);
 return hash(Buffer.from(bytes));
}
async function screenshot(page,name){
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name);
 if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});}
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const width of [320,390,1440]){
   const remote={recipe:null,staged:new Map(),writes:0,reads:new Set()};
   const A=await mount(browser,width,'A',remote);
   const entry=await A.page.evaluate(async bytes=>{
    const E=DobbyCuisineEngine,file=new File([new Uint8Array(bytes)],'steps.zip');
    const candidate=await DobbyRecipeImport.prepare(file,{E});
    if(candidate.entries[0].errors.length)throw Error(candidate.entries[0].errors.join(' '));
    const {ids:[id]}=await DobbyRecipeImport.commit(candidate,{0:'add'},{E});
    const repeated=await DobbyRecipeImport.prepare(file,{E});
    return {id,already:repeated.entries[0].existingId};
   },zip);
   assert.equal(entry.id,entry.already);
   await eventually(()=>remote.writes===2);
   assert.equal(remote.staged.size,3);
   const imported=remote.recipe.payload.customRecipes.find(x=>x.id===entry.id);
   const B=await mount(browser,width,'B',remote);
   const localImage=await B.page.evaluate(key=>DobbyCuisineEngine.win().houseRead(key),imported.localMedia.key);
   assert.equal(localImage,undefined);
   await assertCanonicalGroceryIdentity(B.page,identity.context('B'));
   await B.page.evaluate(id=>DobbyCuisine.open('recipe',{id}),entry.id);
   assert.equal(await checkImage(B.page.locator('.e074-cover img')),imported.localMedia.sha256);
   await screenshot(B.page,'second-appareil-fiche-'+width);
   await B.page.locator('#mode-trad-btn').click();
   await B.page.evaluate(()=>DobbyCuisine.open('cook'));
   const hero=B.page.locator('[data-e074-step-hero]');
   assert.equal(await checkImage(hero.locator('img')),imported.importDetails.stepDetails[0].images[0].sha256);
   await screenshot(B.page,'second-appareil-etape-'+width);
   await B.page.locator('[data-cu-action="e074-cook-jump"][data-index="1"]').click();
   await hero.getByText('Étape 2/3').waitFor();
   assert.equal(await hero.locator('img').count(),0);
   await B.page.locator('[data-cu-action="e074-cook-jump"][data-index="2"]').click();
   assert.equal(await checkImage(hero.locator('img')),imported.importDetails.stepDetails[1].images[0].sha256);
   await B.page.evaluate(id=>DobbyCuisine.open('recipe',{id}),entry.id);
   await B.page.reload();
   await B.page.waitForFunction(()=>DobbyCuisine?.ready&&DobbyCuisineEngine.win().DobbyFamilyUI.isModuleActive('recipes'));
   await assertCanonicalGroceryIdentity(B.page,identity.context('B'));
   assert.equal(await checkImage(B.page.locator('.e074-cover img')),imported.localMedia.sha256);
   assert.ok(remote.reads.has('B'));
   assert.equal(remote.writes,2);
   if(registry){
    await B.page.evaluate(()=>DobbyCuisine.open('recipes'));
    await B.page.locator('#recipe-collection').selectOption('diet');
    await B.page.getByText('TEST — Catalogue diet',{exact:true}).waitFor();
    assert.equal(await B.page.getByText('TEST — Catalogue classic',{exact:true}).count(),0);
    const id='catalogue-test-classic';
    await B.page.evaluate(id=>DobbyCuisine.open('recipe',{id}),id);
    assert.ok(await checkImage(B.page.locator('.e074-cover img')));
    await B.page.locator('#mode-tm5-btn').click();
    await B.page.evaluate(()=>DobbyCuisine.open('cook'));
    assert.ok(await checkImage(hero.locator('img')));
    const native=await B.page.evaluate(async id=>{
      const E=DobbyCuisineEngine,r=E.read().recipes.find(x=>x.id===id);
      const date='2030-06-01';
      const planned=E.planRecipe({id,date,slot:'midi',adult:2,children:0,expectedMeal:null});
      const rice=(await DobbyCuisineList.preview(E,{start:date,end:date})).rows.find(row=>row.name==='Riz');
      return {servings:r.servings,recalc:E.amount(240,2,4),bundled:E.read().baseIds.includes(id),planned:planned.meal.id,rice:rice?.qty};
    },id);
    assert.deepEqual(native,{servings:4,recalc:'120',bundled:true,planned:id,rice:120});
   }
   assert.deepEqual(A.errors,[]);assert.deepEqual(B.errors,[]);
   await A.context.close();await B.context.close();
   console.log('CATALOGUE_LOT3_UI_PASS',width,'native CAS, second appareil, rechargement, étapes et catalogue fixture');
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

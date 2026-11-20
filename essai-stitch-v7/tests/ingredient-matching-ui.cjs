/* Product routes with real native writes and fictional data. No hosted calls. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {canonicalGroceryFixture,assertCanonicalGroceryIdentity}=require('./helpers/canonical-grocery-fixture.cjs');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8774',out=process.env.DOBBY_INGREDIENTS_EVIDENCE;
const registry=process.env.DOBBY_CATALOGUE_FIXTURE;
const hh='00000000-0000-4000-8000-000000000010',uid='00000000-0000-4000-8000-000000000001';
const canonical=canonicalGroceryFixture(hh,{A:uid});
const fixture={
 custom:[
  {id:'test-omelette',name:'TEST Omelette',category:'Plat',servings:4,minutes:15,ingredients:[['Œufs',4,'pièce'],['Fromage',80,'g'],['Sel fin',1,'g'],['Huile',1,'c. à s.']],steps:['Battre les œufs.','Cuire.']},
  {id:'test-missing',name:'TEST Poêlée',category:'Plat',servings:4,minutes:40,
   ingredients:[['Œuf',4,'pièce'],['Courgette',2,'pièce'],['Beurre',20,'g'],['Huile de sésame',1,'c. à s.']],
   steps:['Couper les courgettes.','Cuire.']},
  {id:'test-unknown',name:'TEST Incomplète',servings:4,ingredients:[['Œuf',null,'pièce']],steps:['Mélanger.']},
  {id:'test-foreign',name:'TEST Autre foyer',householdId:'not-this-household',servings:4,ingredients:[['Œuf',4,'pièce']],steps:['Mélanger.']}
 ],
 base:{id:'catalogue-fixture-lot4',name:'TEST Recette du catalogue',category:'Desserts',servings:4,minutes:10,
  catalogue:{collection:'diet',course:'dessert',difficulty:'facile'}, ingredients:[['Œufs',4,'pièce'],['Tomate',2,'pièce']],steps:['Procédure de test.']},
 adaptation:{verified:true,verifiedAt:'2026-11-20T09:00:00Z',steps:[{text:'TEST Cuire dans le bol.',time:'5 min',temp:'100 °C',speed:'1',reverse:false}]}
};
async function native(page,script,values={}){return page.evaluate(({script,values})=>DobbyCuisineEngine.evaluate(script,values),{script,values});}
const wait=async check=>{for(let i=0;i<130;i++){if(check())return;await new Promise(r=>setTimeout(r,60));}assert.ok(check(),'Expected native grocery mutation');};
async function mount(browser,width,shared){
 const context=await browser.newContext({viewport:{width,height:900},locale:'fr-BE',reducedMotion:'reduce'});
 const online=new Map(),writes=[];
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url()),endpoint=u.pathname.split('/').at(-1);
  if(req.url().startsWith(origin+'/')){
   const dir='/essai-stitch-v5-famille/catalogue/';
   if(registry&&u.pathname.startsWith(dir))return route.fulfill({path:path.join(registry,u.pathname.slice(dir.length))});
   return route.continue();
  }
  if(!shared||!/^\/(auth|rest)\/v1\//.test(u.pathname))return route.abort();
  const fulfill=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
  if(endpoint==='token')return fulfill({access_token:'fixture-only',refresh_token:'fixture-only-refresh',expires_in:3600,user:{id:uid,email:'parent@example.test'}});
  if(endpoint==='dobby_v2_memberships')return fulfill([{household_id:hh,active:true,user_id:uid,role:'owner'}]);
  if(endpoint==='dobby_v2_households')return fulfill([{id:hh}]);
  if(endpoint==='dobby_v7_context')return fulfill(canonical.context('A'));
  if(endpoint==='dobby_v2_modules'){
   assert.equal(req.method(),'GET');
   const module=u.searchParams.get('module');
   return fulfill(module==='eq.family'?[canonical.familyRow]:module?[]:[{module:'family'}]);
  }
  if(endpoint==='dobby_v2_grocery'){
   if(req.method()==='GET'){
    const id=u.searchParams.get('id')?.replace(/^eq\./,'');
    return fulfill(id?[online.get(id)].filter(Boolean):[...online.values()]);
   }
   assert.equal(req.method(),'POST');
   assert.equal(req.headers().authorization,'Bearer fixture-only');
   const item=req.postDataJSON();
   assert.equal(item.household_id,hh);
   assert.ok(!online.has(item.id),'Repeated confirmation does not post the same ingredient again');
   writes.push(item);
   const row={...item,revision:1};online.set(item.id,row);
   return fulfill([row],201);
  }
  return fulfill({code:'PGRST202',message:'Optional endpoints absent'},404);
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(origin+'/essai-stitch-v7/');await page.waitForFunction(()=>window.DobbyCuisine?.ready);
 if(shared){
  await page.evaluate(()=>DobbyCuisine.open('shop'));
  await page.locator('[data-cu-action=account]').filter({hasText:'Connecter mon foyer'}).click();
  const engine=page.frameLocator('#dv7-engine');
  await engine.locator('#fv2LoginForm [name="key"]').fill('sb_publishable_fixture_only_123456789');
  await engine.locator('#fv2LoginForm [name="email"]').fill('parent@example.test');
  await engine.locator('#fv2LoginForm [name="password"]').fill('fixture-only-password');
  await engine.locator('#fv2LoginForm button[type="submit"]').click();
  await assertCanonicalGroceryIdentity(page,canonical.context('A'));
  await page.locator('#dv7-close').click();
 }
 await native(page,`custom=p.custom;BASE.push(p.base);st.tmAdaptations={'test-missing':p.adaptation};st.planned={};st.demoInitialized=true;st.shopFinal=null;st.extras=[];st.shopHistory={};save();`,fixture);
 await page.evaluate(()=>DobbyCuisine.open('taverne'));
 return {page,context,errors,online,writes};
}
async function pick(page,name,term=name){
 const input=page.getByRole('searchbox',{name:'Rechercher un ingrédient'});
 await input.fill(term);
 const choice=page.getByRole('group',{name:'Ingrédients disponibles'}).getByRole('button',{name,exact:true});
 await choice.click();
 assert.equal(await choice.getAttribute('aria-pressed'),'true');
}
async function screenshot(page,name){
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,name+'.png')});}
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  for(const width of [320,390,1440]){
   const f=await mount(browser,width,width===390),{page}=f;
   const entry=page.getByRole('button',{name:'Que puis-je cuisiner ?'});
   if(width===1440){await entry.focus();await entry.press('Enter');}else await entry.click();
   await page.getByRole('heading',{name:'Avec mes ingrédients',exact:true}).waitFor();
   assert.equal(await page.locator('main input[type=number]').count(),0);
   assert.equal(await page.getByText('Affiner',{exact:true}).evaluate(el=>el.parentElement.open),false);
   await page.getByLabel('Catégorie',{exact:true}).selectOption('Protéines');
   await pick(page,'Œuf','œufs');
   await page.getByLabel('Catégorie',{exact:true}).selectOption('');
   for(const name of ['Fromage','Courgette','Tomate','Pomme de terre'])await pick(page,name);
   await page.getByRole('button',{name:'Retirer Pomme de terre'}).click();
   assert.equal(await page.getByRole('button',{name:'Retirer Pomme de terre'}).count(),0);
   await pick(page,'Pomme de terre');
   const groups=page.locator('[data-ingredient-group]');
   assert.deepEqual(await groups.evaluateAll(rows=>rows.map(row=>row.dataset.ingredientGroup)),['ready','almost']);
   const omelette=page.locator('[data-ingredient-group=ready] [data-ingredient-recipe=test-omelette]');
   await omelette.waitFor();
   assert.equal(await omelette.getByRole('button',{name:/aux courses/}).count(),0);
   await page.locator('[data-ingredient-group=ready] [data-ingredient-recipe=catalogue-fixture-lot4]').waitFor();
   assert.equal(await page.getByText('TEST Incomplète',{exact:true}).count(),0);
   assert.equal(await page.getByText('TEST Autre foyer',{exact:true}).count(),0);
   const fromTav=await groups.locator('h3').allTextContents();
   assert.equal(await native(page,'return st.shopFinal;'),null);
   assert.equal(f.writes.length,0);
   await page.getByRole('button',{name:'Retour à la Taverne ou au Grimoire'}).click();
   await page.getByRole('tab',{name:'Grimoire des recettes'}).click();
   await page.getByRole('button',{name:'Avec mes ingrédients',exact:true}).click();
   await page.locator('[data-ingredient-group=ready] [data-ingredient-recipe=test-omelette]').waitFor();
   assert.deepEqual(await groups.locator('h3').allTextContents(),fromTav);
   await screenshot(page,'recherche-'+width);
   await page.locator('[data-ingredient-group=almost] [data-ingredient-recipe=test-missing]').scrollIntoViewIfNeeded();
   await screenshot(page,'resultats-'+width);
   await page.getByText('Affiner',{exact:true}).click();
   await page.getByLabel('Collection',{exact:true}).selectOption('diet');
   assert.ok((await groups.locator('h3').allTextContents()).includes('TEST Recette du catalogue'));
   assert.equal(await groups.getByText('TEST Omelette',{exact:true}).count(),0);
   await page.getByLabel('Collection',{exact:true}).selectOption('');
   await page.getByLabel('Mode de préparation',{exact:true}).selectOption('tm5');
   assert.deepEqual(await groups.locator('h3').allTextContents(),registry?['TEST — Catalogue classic','TEST Poêlée']:['TEST Poêlée']);
   await page.getByLabel('Mode de préparation',{exact:true}).selectOption('');
   await page.getByText('Affiner',{exact:true}).click();

   const card=page.locator('[data-ingredient-group=almost] [data-ingredient-recipe=test-missing]');
   assert.match(await card.innerText(),/Ingrédients manquants : Beurre, Huile de sésame/);
   await omelette.getByRole('button',{name:'Voir la recette'}).click();
   await page.getByRole('heading',{name:'TEST Omelette',exact:true}).waitFor();
   assert.match(await page.locator('#ingredients-list').innerText(),/80 g/);
   await page.evaluate(()=>DobbyCuisine.open('ingredients'));
   await card.getByRole('button',{name:'Ajouter au planning'}).click();
   const calendar=page.getByRole('dialog',{name:'Calendrier de planification'});
   await calendar.getByText('Ingrédients manquants : Beurre, Huile de sésame.').waitFor();
   await screenshot(page,'planning-'+width);
   const slot=calendar.locator('[data-cu-action=e074-plan-slot]').first(),date=await slot.getAttribute('data-date'),name=await slot.getAttribute('data-slot');
   await slot.click();await calendar.getByRole('button',{name:'Confirmer ce repas'}).click();
   await calendar.waitFor({state:'detached'});
   const planned=await native(page,'return st.planned;');
   assert.equal(planned[date+'-'+name].id,'test-missing');
   assert.equal(Object.keys(planned).length,1);
   assert.equal(await native(page,'return st.shopFinal;'),null);
   assert.equal(f.writes.length,0);

   await page.evaluate(({date,name})=>DobbyCuisineEngine.cookAt('test-missing',null,'classic',{date,slot:name,component:'main'}),{date,name});
   await card.getByLabel('Méthode',{exact:true}).selectOption('tm5');
   await card.getByRole('button',{name:'Commencer à cuisiner'}).click();
   await page.getByText('TEST Cuire dans le bol.',{exact:false}).first().waitFor();
   assert.match(await page.locator('#cu-notice').innerText(),/Beurre, Huile de sésame/);
   assert.deepEqual(await native(page,'return {method:st.cookMethod,meal:st.cookMeal};'),{method:'tm5',meal:null});
   assert.deepEqual(await native(page,'return st.planned;'),planned);
   await page.evaluate(()=>DobbyCuisine.open('ingredients'));
   if(width===1440)await page.evaluate(()=>DobbyCuisineList.add(DobbyCuisineEngine,{name:'Huile de Sesame',qty:2,unit:'ml'}));
   const add=card.getByRole('button',{name:'Ajouter les ingrédients manquants aux courses'});
   await add.click();await add.click();
   if(width===390){
    await wait(()=>f.writes.length===2);
    assert.deepEqual(f.writes.map(x=>x.title).sort(),['Beurre','Huile de sésame']);
    assert.ok(f.writes.every(x=>x.quantity===null));
   }else{
    const items=await native(page,'return st.shopFinal.items;');
    if(width===1440){
     assert.deepEqual(items.map(x=>[x.name,x.qty]).sort(),[['Beurre',null],['Huile de Sesame',2]]);
    }else{
     assert.deepEqual(items.map(x=>x.name).sort(),['Beurre','Huile de sésame']);
     assert.ok(items.every(x=>x.qty===null));
    }
   }
   if(registry){
    await pick(page,'Riz');
    await page.locator('[data-ingredient-group=ready] [data-ingredient-recipe=catalogue-test-classic]').waitFor();
   }
   await page.reload();await page.waitForFunction(()=>DobbyCuisine?.ready);
   assert.equal(await page.getByRole('list',{name:'Ingrédients sélectionnés'}).locator('li').count(),0);
   assert.deepEqual(f.errors,[]);
   await f.context.close();
   console.log('INGREDIENT_MATCHING_UI_PASS',width,width===390?'courses du foyer via HTTP fictif':'courses locales');
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

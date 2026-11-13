/* PREP-01: real native clients; only auth/module/grocery HTTP boundaries are fixtures. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
const {canonicalGroceryFixture,assertCanonicalGroceryIdentity}=require('./helpers/canonical-grocery-fixture.cjs');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
const out=path.resolve(process.env.DOBBY_PREP_SYNC_EVIDENCE||path.join(__dirname,'../../docs/dobby-v7/evidence/prep01/sync-browser'));
const HH='00000000-0000-4000-8000-000000000010',user=index=>'00000000-0000-4000-8000-00000000000'+index;
const canonical=canonicalGroceryFixture(HH,{A:user(1),B:user(2)}),actor=index=>index===1?'A':'B';
const clone=value=>JSON.parse(JSON.stringify(value));
async function until(fn,label){const end=Date.now()+15000;while(!fn()&&Date.now()<end)await new Promise(resolve=>setTimeout(resolve,30));assert.ok(fn(),label);}
const read=page=>page.evaluate(()=>JSON.parse(JSON.stringify(DobbyFamilyStitchEngine.win().DobbyFamilyPreparations.read())));
const state=page=>page.evaluate(()=>DobbyFamilyStitchEngine.read().state);
const sync=page=>page.evaluate(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.grocery.sync());
async function expectRegistry(page,key,expected){await page.waitForFunction(({key,expected})=>JSON.stringify(DobbyFamilyStitchEngine.read().state[key])===JSON.stringify(expected),{key,expected});assert.deepEqual((await state(page))[key],expected);}

(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const modules=new Map([['family',clone(canonical.familyRow)]]),groceries=new Map(),writes=[],errors=[],unexpected=[],contexts=[];
 let offlineA=false,holdNextFamilyA=false,held=null;
 const report={realBackend:false,realAccounts:false,profiles:2,viewport:390,checks:[]};
 try{
  async function client(index){
   const context=await browser.newContext({viewport:{width:390,height:900},locale:'fr-BE',reducedMotion:'reduce'});contexts.push(context);
   await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url()),method=req.method();
    if(url.origin===origin)return route.continue();
    if(url.hostname!=='pqcdkrwljgvgagzwrcmg.supabase.co'||!/^\/(auth|rest)\/v1\//.test(url.pathname))return route.abort();
    if(index===1&&offlineA)return route.abort();
    const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(url.pathname==='/auth/v1/token')return reply({access_token:'fixture-prep-'+index,refresh_token:'fixture-prep-refresh-'+index,expires_in:3600,user:{id:user(index),email:'prep-'+index+'@fixture.example.test'}});
    if(url.pathname==='/rest/v1/dobby_v2_memberships')return reply([{household_id:HH,user_id:user(index),active:true,role:'owner'}]);
    if(url.pathname==='/rest/v1/dobby_v2_households')return reply([{id:HH}]);
    if(url.pathname==='/rest/v1/rpc/dobby_missions_v2_capabilities')return reply({});
    // Shared PREP writes require the real native client to verify a canonical
    // parent and adopt the existing family registry from the HTTP boundary.
    if(url.pathname==='/rest/v1/rpc/dobby_v7_context'){
     const verified=canonical.context(actor(index)),row=modules.get('family');
     return reply({...verified,profile:row.payload.familyMembers.find(member=>member.id===verified.memberId),familyRevision:row.revision});
    }
    const household=url.searchParams.get('household_id');if(household)assert.equal(household,'eq.'+HH,'Fixture requests stay in the one household');
    if(url.pathname==='/rest/v1/dobby_v2_grocery'){
     const id=(url.searchParams.get('id')||'').replace(/^eq\./,'');
     if(method==='GET')return reply(url.searchParams.get('limit')==='0'?[]:id?[groceries.get(id)].filter(Boolean):[...groceries.values()]);
     const body=req.postDataJSON(),write={kind:'grocery',client:index,method,id:body.id||id,body:clone(body),accepted:false};writes.push(write);
     if(method==='POST'){
      assert.equal(body.household_id,HH);if(groceries.has(body.id))return reply({code:'23505',message:'Duplicate fixture grocery'},409);
      const stamp='2026-11-12T10:00:00.000Z',row={created_at:stamp,updated_at:stamp,deleted_at:null,at_home_quantity:0,...body,revision:1};groceries.set(body.id,row);write.accepted=true;return reply([row],201);
     }
     if(method==='PATCH'){
      const before=groceries.get(id);if(!before||String(before.revision)!==(url.searchParams.get('revision')||'').replace(/^eq\./,''))return reply([]);
      const row={...before,...body,revision:before.revision+1};groceries.set(id,row);write.accepted=true;return reply([row]);
     }
    }
    if(url.pathname==='/rest/v1/dobby_v2_modules'){
     const module=(url.searchParams.get('module')||'').replace(/^eq\./,'');
     if(method==='GET')return reply(module?(modules.has(module)?[modules.get(module)]:[]):[...modules.values()].map(row=>({module:row.module})));
     const body=req.postDataJSON(),write={kind:'module',client:index,method,module:body.module||module,body:clone(body),accepted:false};writes.push(write);
     if(method==='POST'){
      assert.equal(body.household_id,HH);if(modules.has(body.module))return reply({code:'23505',message:'Duplicate fixture module'},409);
      const row={...body,revision:1};modules.set(body.module,row);write.accepted=true;return reply([row],201);
     }
     if(method==='PATCH'){
      if(module==='family'&&index===1&&holdNextFamilyA){holdNextFamilyA=false;await new Promise(resolve=>{held={release:resolve,write};});}
      const before=modules.get(module);if(!before||String(before.revision)!==(url.searchParams.get('revision')||'').replace(/^eq\./,''))return reply([]);
      const row={...before,...body,revision:before.revision+1};modules.set(module,row);write.accepted=true;return reply([row]);
     }
    }
    unexpected.push(method+' '+url.pathname);return route.abort();
   });
   const page=await context.newPage();page.setDefaultTimeout(15000);page.on('dialog',dialog=>dialog.accept());page.on('pageerror',error=>errors.push('client '+index+': '+error.message));
   await page.goto(origin+'/essai-stitch-v7/famille.html');await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready&&DobbyFamilyStitchEngine.win().DobbyFamilyPreparations?.available);
   await page.evaluate(()=>DobbyFamilyStitchEngine.evaluate('st.familyEvents=[];st.familyPreparationTemplates=[];st.familyEventPreparations=[];st.sharedFamilyNotes=[];save();'));
   await page.evaluate(()=>DobbyStitchV7.open('account'));
   const frame=page.frameLocator('#dv7-engine');await frame.locator('#fv2LoginForm [name=key]').fill('sb_publishable_fixture_only_123456789');await frame.locator('#fv2LoginForm [name=email]').fill('prep-'+index+'@fixture.example.test');await frame.locator('#fv2LoginForm [name=password]').fill('fixture-only');await frame.locator('#fv2LoginForm button[type=submit]').click();
   await assertCanonicalGroceryIdentity(page,canonical.context(actor(index)));
   assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.read().active),true,'Verified login adopts the existing shared family registry');
   await page.locator('#dv7-close').click();await page.evaluate(()=>DobbyFamilyStitch.open('salon'));return page;
  }
  const a=await client(1),b=await client(2);
  report.checks.push('Two native form logins verify distinct canonical parent profiles and adopt the existing shared family registry');
  const template=await a.evaluate(()=>{
   const api=DobbyFamilyStitchEngine.win().DobbyFamilyPreparations,result=api.saveTemplate(null,{name:'TEST — Escapade partagée',items:[{label:'TEST — Farine',qty:0.5,unit:'kg'},{label:'TEST — Lampe',qty:null,unit:''}]},api.read().snapshot);
   return result.templates.find(row=>row.id===result.savedId);
  });
  await sync(a);await until(()=>modules.get('family')?.payload.familyPreparationTemplates?.some(row=>row.id===template.id),'Native template reaches the family HTTP fixture');
  assert.deepEqual(modules.get('family').payload.familyPreparationTemplates,[template]);assert.equal(modules.get('family').payload.familyPreparationsVersion,1);
  await sync(b);await expectRegistry(b,'familyPreparationTemplates',[template]);report.checks.push('A native template write reaches B with exact IDs, order, quantities, units and version');

  const event=await a.evaluate(templateId=>{
   const E=DobbyFamilyStitchEngine;E.saveEvent(null,{title:'TEST — Sortie familiale PREP',date:'2026-12-12',time:'10:30',category:'Famille',person:'Foyer',location:'TEST — Parc',note:'Fixture PREP sans donnée réelle',preparationTemplateId:templateId});
   return E.read().state.familyEvents.find(row=>row.title==='TEST — Sortie familiale PREP');
  },template.id);
  assert.ok(event?.id,'The real native event writer assigns a stable event ID');
  const eventPrep=(await read(a)).eventPreparations.find(row=>row.eventId===event.id);assert.ok(eventPrep);assert.equal(eventPrep.id,event.id);assert.equal(eventPrep.templateId,template.id);
  assert.deepEqual(eventPrep.items.map(({id,...row})=>row),template.items.map(({id,...row})=>row));assert.notEqual(eventPrep.items[0].id,template.items[0].id);
  await sync(a);await until(()=>modules.get('family').payload.familyEventPreparations?.some(row=>row.eventId===event.id),'Associated preparation snapshot reaches the fixture');
  await sync(b);await expectRegistry(b,'familyEventPreparations',[eventPrep]);await expectRegistry(b,'familyEvents',[event]);report.checks.push('Native event association preserves stable event ID and copies independent preparation item IDs');
  await b.evaluate(id=>DobbyFamilyStitch.open('preparation-event',{record:id}),event.id);
  await b.locator('[data-fa-action=prep-toggle][data-item="'+eventPrep.items[1].id+'"]').click();
  const toggled=(await read(b)).eventPreparations[0];assert.equal(toggled.items[1].done,true);assert.equal((await read(b)).templates[0].items[1].done,false);
  await sync(b);await until(()=>modules.get('family').payload.familyEventPreparations[0].items[1].done,'B checkbox reaches the fixture');await sync(a);await expectRegistry(a,'familyEventPreparations',[toggled]);report.checks.push('B UI checkbox reaches A without checking the reusable template');

  const source=toggled.items[0],courseToken='prep:'+event.id+':'+source.id;
  const addCourse=()=>a.evaluate(async({source,courseToken})=>{
   const E=DobbyFamilyStitchEngine,values={name:source.label,qty:source.qty,unit:source.unit};return Promise.all([DobbyCuisineList.addOnce(E,values,courseToken),DobbyCuisineList.addOnce(E,values,courseToken)]);
  },{source,courseToken});
  const receipts=await addCourse();assert.equal(receipts[0].id,receipts[1].id);assert.equal(receipts[0].shared,true);
  await sync(a);await until(()=>groceries.size===1&&[...groceries.values()][0].quantity===0.5,'One native shared grocery effect reaches the HTTP fixture');
  const groceryId=receipts[0].id;assert.equal(groceries.get(groceryId).unit,'kg');assert.equal(groceries.get(groceryId).checked,false);assert.equal((await read(a)).eventPreparations[0].items[0].done,false);
  await a.reload();await a.waitForFunction(()=>window.DobbyFamilyStitch?.ready&&DobbyFamilyStitchEngine.win().DobbyFamilyUI?.grocery.read().context);
  await addCourse();await sync(a);assert.equal(groceries.size,1);assert.equal(writes.filter(row=>row.kind==='grocery'&&row.method==='POST'&&row.accepted).length,1);
  await sync(b);await b.waitForFunction(id=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.grocery.read().items.some(row=>row.id===id&&row.quantity===0.5&&row.unit==='kg'),groceryId);
  report.checks.push('Concurrent Courses sends plus reload/replay produce one native shared row and preserve preparation state');

  const remoteBeforeOffline=clone(modules.get('family').payload.familyEventPreparations);offlineA=true;
  const offlinePrep=await a.evaluate(id=>{
   const api=DobbyFamilyStitchEngine.win().DobbyFamilyPreparations,data=api.read(),old=data.eventPreparations.find(row=>row.eventId===id);
   return api.saveEventItems(id,[...old.items,{label:'TEST — Trousse hors ligne',qty:2,unit:'pièces',done:false}],data.snapshot).eventPreparations.find(row=>row.eventId===id);
  },event.id);
  await sync(a);await a.reload();await a.waitForFunction(()=>window.DobbyFamilyStitch?.ready&&DobbyFamilyStitchEngine.win().DobbyFamilyPreparations?.available);
  assert.deepEqual((await read(a)).eventPreparations,[offlinePrep]);assert.deepEqual(modules.get('family').payload.familyEventPreparations,remoteBeforeOffline);
  await a.evaluate(id=>DobbyFamilyStitch.open('preparation-event',{record:id}),event.id);await a.screenshot({path:path.join(out,'offline-reload-390.png'),fullPage:true});
  offlineA=false;await sync(a);await until(()=>modules.get('family').payload.familyEventPreparations[0].items.length===3,'Offline native preparation edit reaches fixture after reconnect');
  await sync(b);await expectRegistry(b,'familyEventPreparations',[offlinePrep]);await b.evaluate(id=>DobbyFamilyStitch.open('preparation-event',{record:id}),event.id);await b.screenshot({path:path.join(out,'peer-after-reconnect-390.png'),fullPage:true});
  report.checks.push('A offline native edit survives full page reload, reconnects through the native queue and reaches B exactly');

  // Hold an actual A CAS request, let B win the same revision, then release A.
  holdNextFamilyA=true;
  const localTemplate=await a.evaluate(id=>{const api=DobbyFamilyStitchEngine.win().DobbyFamilyPreparations,data=api.read(),row=data.templates.find(row=>row.id===id);return api.saveTemplate(id,{...row,name:'TEST — Variante A en attente'},data.snapshot).templates[0];},template.id);
  const pendingSync=sync(a);await until(()=>held!==null,'A family PATCH is held at its real HTTP boundary');
  const confirmedTemplate=await b.evaluate(id=>{const api=DobbyFamilyStitchEngine.win().DobbyFamilyPreparations,data=api.read(),row=data.templates.find(row=>row.id===id);return api.saveTemplate(id,{...row,name:'TEST — Variante B confirmée'},data.snapshot).templates[0];},template.id);
  await sync(b);await until(()=>modules.get('family').payload.familyPreparationTemplates[0].name===confirmedTemplate.name,'B wins the competing native CAS revision');
  held.release();await pendingSync;
  await a.waitForFunction(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.getModuleStatus('family')==='Conflit à résoudre');assert.equal(held.write.accepted,false,'The stale A CAS write is rejected');
  assert.deepEqual((await read(a)).templates,[localTemplate]);assert.deepEqual(modules.get('family').payload.familyPreparationTemplates,[confirmedTemplate]);
  const conflict=await a.evaluate(async()=>{const api=DobbyFamilyStitchEngine.win().DobbyFamilyUI,c=api.getContext();return(await api.meta('v2-module-state:'+c.userId+'|'+c.householdId)).family.conflict;});
  assert.deepEqual(conflict.remote.payload.familyPreparationTemplates,[confirmedTemplate]);
  await a.reload();await a.waitForFunction(()=>window.DobbyFamilyStitch?.ready&&DobbyFamilyStitchEngine.win().DobbyFamilyUI.getModuleStatus('family')==='Conflit à résoudre');
  assert.deepEqual((await read(a)).templates,[localTemplate]);assert.deepEqual((await read(a)).eventPreparations,[offlinePrep]);assert.deepEqual(modules.get('family').payload.familyPreparationTemplates,[confirmedTemplate]);
  await a.evaluate(()=>DobbyFamilyStitch.open('preparation-models'));await a.screenshot({path:path.join(out,'cas-conflict-local-retained-390.png'),fullPage:true});
  report.checks.push('A real A/B CAS race retains A local pending content and B confirmed content across reload without silent resolution');
  await sync(a);await assertCanonicalGroceryIdentity(a,canonical.context('A'));
  assert.equal(await a.evaluate(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.getModuleStatus('family')),'Conflit à résoudre','Identity recovery alone never resolves a pending CAS conflict');
  assert.deepEqual((await read(a)).templates,[localTemplate]);assert.deepEqual(modules.get('family').payload.familyPreparationTemplates,[confirmedTemplate]);
  await a.evaluate(()=>DobbyStitchV7.open('account'));
  await a.frameLocator('#dv7-engine').locator('[data-fm-action=local][data-module=family]').click();
  await until(()=>modules.get('family').payload.familyPreparationTemplates[0].name===localTemplate.name,'The explicit native keep-local choice resolves the recovered conflict');
  await sync(b);await expectRegistry(b,'familyPreparationTemplates',[localTemplate]);
  report.checks.push('Fresh canonical verification after reload retains the conflict until the existing explicit native parent choice resolves it');
  assert.deepEqual(modules.get('family').payload.familyMembers,canonical.familyRow.payload.familyMembers,'PREP writes preserve both canonical profiles');
  assert.deepEqual(unexpected,[]);assert.deepEqual(errors,[]);
  Object.assign(report,{status:'PASS',familyRevision:modules.get('family').revision,acceptedGroceryCreates:writes.filter(row=>row.kind==='grocery'&&row.method==='POST'&&row.accepted).length,rejectedFamilyCAS:writes.filter(row=>row.kind==='module'&&row.method==='PATCH'&&!row.accepted).length,errors,unexpected,limits:['HTTP server boundaries are simulated; no live backend or real accounts','One Chromium viewport; no physical iPhone','The native keep-local conflict choice is exercised; keep-server is not exercised']});
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n');console.log('PREP_SYNC_PASS native A/B exact arrays, event snapshot, UI toggle, offline reload/reconnect, shared Courses idempotence and preserved CAS conflict');
 }finally{held?.release();for(const context of contexts)await context.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

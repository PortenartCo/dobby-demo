/* Two independent native family clients against an isolated HTTP fixture.
   No real accounts, external requests, test-only model getters or alternate writer. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const evidence=path.resolve(process.env.DOBBY_E07_SHARED_HOME_EVIDENCE||path.join(__dirname,'../../docs/dobby-v7/evidence/e07-p02-shared-home'));
fs.mkdirSync(evidence,{recursive:true});
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
const hh='00000000-0000-4000-8000-000000000010';
const users={A:'00000000-0000-4000-8000-000000000001',B:'00000000-0000-4000-8000-000000000002',legacy:'00000000-0000-4000-8000-000000000003'};
const carrot='00000000-0000-4000-8000-000000000101';
const title='TEST — Disponibilité commune';
const report={fixture:'Two isolated browsers, distinct users, same household, HTTP only',checks:[],requests:[]};
// Replay the pre-change production files only when explicitly collecting RED.
const baseline=process.env.DOBBY_SHARED_HOME_BASELINE==='1'?new Map(['essai-stitch-v7/cuisine-list.js','essai-stitch-v5-famille/family-core.mjs','essai-stitch-v5-famille/family-v2.js'].map(file=>['/'+file,require('node:child_process').execFileSync('git',['show','HEAD:'+file],{cwd:path.resolve(__dirname,'../..'),encoding:'utf8'})])):null;
report.production=baseline?'HEAD baseline':'working tree';
const record=name=>{report.checks.push(name);console.log('SHARED_HOME_OK '+name);};
const waitFor=async(test,message)=>{const until=Date.now()+12000;while(!await test()&&Date.now()<until)await new Promise(r=>setTimeout(r,30));assert.ok(await test(),message);};
const model=(page,method,...args)=>page.evaluate(({method,args})=>DobbyCuisineList[method](DobbyCuisineEngine,...args),{method,args});
const native=(page,method,...args)=>page.evaluate(({method,args})=>DobbyCuisineEngine.win().DobbyFamilyUI.grocery[method](...args),{method,args});
const item=async(page,name=title)=>(await model(page,'snapshot')).items.find(x=>x.name===name);
async function settle(page){
  await native(page,'sync');
  // Pending tombstones are absent from read().items; native status includes them.
  await page.waitForFunction(()=>{const r=DobbyCuisineEngine.win().DobbyFamilyUI.grocery.read();return r.ready&&/à jour/.test(r.status)&&r.items.every(x=>x.syncState==='clean');});
}
async function amount(page,home,needed,name=title){const x=await item(page,name);assert.ok(x,'Shared item exists: '+name);assert.equal(x.atHomeQty,home,name+' available at home');assert.equal(x.qty,needed,name+' remaining to buy');return x;}
async function shot(page,name){await page.evaluate(()=>DobbyCuisine.refresh());await page.screenshot({path:path.join(evidence,name+'.png'),fullPage:true});}
function fixture({supportsHome=true}={}){
  const rows=new Map(),writes=[],clients=new Map();let gate=null;
  const row=(id,name,quantity,unit='g')=>({id,household_id:hh,title:name,quantity,unit,checked:false,deleted_at:null,created_at:'2026-11-12T10:00:00.000Z',updated_at:'2026-11-12T10:00:00.000Z',revision:1,...(supportsHome?{at_home_quantity:0}:{})});
  rows.set(carrot,row(carrot,title,500));
  return {rows,writes,clients,
    holdPatch(label,id){let reach,release;const reached=new Promise(r=>reach=r),released=new Promise(r=>release=r);gate={label,id,reach,released,hit:false};return{reached,release(){release();}};},
    async attach(context,label){
      const state={offline:false};clients.set(label,state);
      await context.route('**/*',async route=>{
        const req=route.request(),url=new URL(req.url()),method=req.method();
        if(req.url().startsWith(origin+'/'))return baseline?.has(url.pathname)?route.fulfill({contentType:'text/javascript',body:baseline.get(url.pathname)}):route.continue();
        if(!url.pathname.startsWith('/auth/v1/')&&!url.pathname.startsWith('/rest/v1/'))return route.abort();
        if(state.offline)return route.abort();
        const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
        if(url.pathname.includes('/auth/v1/token'))return fulfill({access_token:'fixture-access-'+label,refresh_token:'fixture-refresh-'+label,expires_in:3600,user:{id:users[label],email:label.toLowerCase()+'@fixture.example.test'}});
        if(url.pathname.includes('dobby_v2_memberships'))return fulfill([{household_id:hh,active:true,user_id:users[label]}]);
        if(url.pathname.includes('dobby_v2_households'))return fulfill([{id:hh}]);
        if(!url.pathname.includes('dobby_v2_grocery'))return fulfill({code:'PGRST205',message:'Optional modules absent in this grocery fixture'},404);
        const id=(url.searchParams.get('id')||'').replace(/^eq\./,'');
        assert.equal((url.searchParams.get('household_id')||'eq.'+hh).replace(/^eq\./,''),hh,'All grocery reads and writes stay inside the fixture household');
        report.requests.push({label,method,path:url.pathname,query:url.search});
        if(method==='GET'){
          const select=url.searchParams.get('select')||'*';
          if(!supportsHome&&select.split(',').includes('at_home_quantity'))return fulfill({code:'42703',message:'column dobby_v2_grocery.at_home_quantity does not exist'},400);
          if(url.searchParams.get('limit')==='0')return fulfill([]);
          // New-schema rows always expose the real column with its SQL default.
          return fulfill((id?[rows.get(id)].filter(Boolean):[...rows.values()]).map(x=>({...x,...(supportsHome?{at_home_quantity:x.at_home_quantity??0}:{})})));
        }
        const body=req.postDataJSON(),attempt={label,method,id:id||body.id,body,baseRevision:Number((url.searchParams.get('revision')||'eq.0').replace(/^eq\./,'')),accepted:false};writes.push(attempt);
        if(!supportsHome&&Object.hasOwn(body,'at_home_quantity'))return fulfill({code:'PGRST204',message:'Missing at_home_quantity column'},400);
        if(method==='POST'){
          assert.equal(body.household_id,hh);if(rows.has(body.id))return fulfill({code:'23505',message:'Duplicate fixture row'},409);
          rows.set(body.id,{...row(body.id,body.title,body.quantity,body.unit),...body,revision:1});attempt.accepted=true;return fulfill([rows.get(body.id)],201);
        }
        if(method==='PATCH'){
          if(gate&&gate.label===label&&gate.id===id&&!gate.hit){const held=gate;held.hit=true;held.reach();await held.released;if(gate===held)gate=null;}
          const old=rows.get(id);if(!old||old.revision!==attempt.baseRevision)return fulfill([]);
          rows.set(id,{...old,...body,revision:old.revision+1});attempt.accepted=true;return fulfill([rows.get(id)]);
        }
        throw Error('Unexpected grocery request '+method);
      });
      return state;
    }
  };
}
async function login(browser,server,label){
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'fr-BE',reducedMotion:'reduce'});
  const state=await server.attach(context,label),page=await context.newPage();page.setDefaultTimeout(15000);page.on('dialog',d=>d.accept());
  await page.goto(origin+'/essai-stitch-v7/');await page.waitForFunction(()=>window.DobbyCuisine?.ready);
  await page.evaluate(()=>{DobbyCuisineEngine.evaluate('st.shopFinal={e072:true,id:"fixture-list",items:[],imports:[],meals:[]};st.planned={};st.extras=[];save();');return DobbyCuisine.open('shop');});
  await page.locator('[data-cu-action="account"]').filter({hasText:'Connecter mon foyer'}).click();
  const engine=page.frameLocator('#dv7-engine');
  await engine.locator('#fv2LoginForm [name="key"]').fill('sb_publishable_fixture_only_123456789');
  await engine.locator('#fv2LoginForm [name="email"]').fill(label.toLowerCase()+'@fixture.example.test');
  await engine.locator('#fv2LoginForm [name="password"]').fill('fixture-only-password');
  await engine.locator('#fv2LoginForm button[type="submit"]').click();
  await page.waitForFunction(()=>DobbyCuisineEngine.win().DobbyFamilyUI.getContext()?.householdId);
  await page.locator('#dv7-close').click();await settle(page);await page.evaluate(()=>DobbyCuisine.refresh());
  assert.equal(await page.evaluate(()=>DobbyCuisineEngine.win().DobbyFamilyUI.getContext().userId),users[label]);
  return{context,page,state};
}
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const server=fixture();let A,B,old;
  try{
    A=await login(browser,server,'A');B=await login(browser,server,'B');
    assert.notEqual((await model(A.page,'snapshot')).scope,(await model(B.page,'snapshot')).scope,'Separate users have separate native caches');
    await amount(A.page,0,500);await amount(B.page,0,500);
    const initial=await item(A.page);
    await model(A.page,'home',initial.id,200);await settle(A.page);await settle(B.page);
    const observed={A:await item(A.page),B:await item(B.page),remote:server.rows.get(carrot)};
    fs.writeFileSync(path.join(evidence,'first-two-client-observation.json'),JSON.stringify(observed,null,2));
    await shot(A.page,'01-client-a-home-200');await shot(B.page,'02-client-b-home-200');
    await amount(A.page,200,300);await amount(B.page,200,300);
    assert.equal(server.rows.get(carrot).at_home_quantity,200,'Availability is persisted by the native family HTTP writer');
    assert.equal((await native(A.page,'read')).homeSupported,true);
    record('A declares 200 g of 500 g; B reads 200 g available and 300 g to buy');

    await model(B.page,'home',(await item(B.page)).id,125);await settle(B.page);await settle(A.page);await amount(A.page,125,375);
    await B.page.evaluate(()=>DobbyCuisine.refresh());const beforeCancel=server.writes.length;
    await B.page.locator('[data-cu-action=e072-home]').first().click();await B.page.locator('[data-cu-action=e072-home-partial]').click();await B.page.locator('#e072-home-qty').fill('99');await B.page.locator('[data-cu-action=e072-cancel]').click();
    await amount(B.page,125,375);assert.equal(server.writes.length,beforeCancel,'Cancelling the availability editor never submits a write');
    await model(B.page,'home',(await item(B.page)).id,0);await settle(B.page);await settle(A.page);await amount(A.page,0,500);
    record('B modifies and cancels the shared declaration');

    A.state.offline=true;await model(A.page,'home',(await item(A.page)).id,180);
    await A.page.waitForFunction(()=>DobbyCuisineEngine.win().DobbyFamilyUI.grocery.read().items.some(x=>x.syncState==='pending'));
    assert.equal(server.rows.get(carrot).at_home_quantity,0);await amount(A.page,180,320);
    await A.page.reload();await A.page.waitForFunction(()=>window.DobbyCuisine?.ready);
    await A.page.waitForFunction(()=>DobbyCuisineEngine.win().DobbyFamilyUI.grocery.read().items.some(x=>x.syncState==='pending'));
    await amount(A.page,180,320);
    await model(A.page,'home',(await item(A.page)).id,210);await amount(A.page,210,290);
    assert.equal((await native(A.page,'read')).items.find(x=>x.id===carrot).syncState,'pending','A second offline declaration after reload stays in the native pending queue');
    assert.equal(server.rows.get(carrot).at_home_quantity,0,'Offline redeclaration cannot reach the HTTP fixture');
    await A.page.evaluate(()=>DobbyCuisine.open('shop'));await shot(A.page,'03-offline-reloaded-pending');
    A.state.offline=false;await settle(A.page);await settle(B.page);await amount(B.page,210,290);
    record('Offline availability can be changed again after reload, stays pending, and reaches B with its latest value');

    const beforeSemantic='TEST — Disponibilité avant changement',afterSemantic='TEST — Article à la pièce';
    await model(A.page,'add',{name:beforeSemantic,qty:500,unit:'g'});await settle(A.page);
    const semanticId=(await item(A.page,beforeSemantic)).id;await model(A.page,'home',semanticId,200);await settle(A.page);
    A.state.offline=true;await A.page.reload();await A.page.waitForFunction(()=>window.DobbyCuisine?.ready);
    await A.page.waitForFunction(id=>DobbyCuisineEngine.win().DobbyFamilyUI.grocery.read().items.some(x=>x.id===id),semanticId);
    await model(A.page,'edit',semanticId,{name:afterSemantic,qty:2,unit:'pièce'});await amount(A.page,0,2,afterSemantic);
    let semantic=(await native(A.page,'read')).items.find(x=>x.id===semanticId);assert.equal(semantic.at_home_quantity,0);assert.equal(semantic.syncState,'pending');
    assert.equal(server.rows.get(semanticId).at_home_quantity,200);assert.equal(server.rows.get(semanticId).unit,'g');
    await A.page.reload();await A.page.waitForFunction(()=>window.DobbyCuisine?.ready);
    await A.page.waitForFunction(id=>DobbyCuisineEngine.win().DobbyFamilyUI.grocery.read().items.find(x=>x.id===id)?.syncState==='pending',semanticId);
    await amount(A.page,0,2,afterSemantic);A.state.offline=false;await settle(A.page);await settle(B.page);await amount(B.page,0,2,afterSemantic);
    assert.equal(server.rows.get(semanticId).at_home_quantity,0);assert.equal(server.rows.get(semanticId).unit,'pièce');
    await model(A.page,'remove',semanticId);await settle(A.page);await settle(B.page);
    record('An incompatible name/unit edit after offline reload resets availability in the durable queue and on B');

    async function concurrent(localValue,remoteValue,resolution){
      await settle(A.page);await settle(B.page);
      const held=server.holdPatch('A',carrot),from=server.writes.length;
      await model(A.page,'home',(await item(A.page)).id,localValue);
      let gateTimeout;try{await Promise.race([held.reached,new Promise((_,reject)=>{gateTimeout=setTimeout(()=>reject(Error('A never reached the held CAS PATCH')),12000);})]);}finally{clearTimeout(gateTimeout);}
      try{
        await model(B.page,'home',(await item(B.page)).id,remoteValue);await settle(B.page);
        assert.equal(server.rows.get(carrot).at_home_quantity,remoteValue,'B commits while A still holds the stale revision');
      }finally{held.release();}
      await A.page.waitForFunction(id=>DobbyCuisineEngine.win().DobbyFamilyUI.grocery.read().items.find(x=>x.id===id)?.syncState==='conflict',carrot);
      const attempts=server.writes.slice(from),a=attempts.find(x=>x.label==='A'&&x.method==='PATCH'),b=attempts.find(x=>x.label==='B'&&x.accepted);
      assert.ok(a&&!a.accepted,'A stale CAS PATCH is rejected');assert.equal(a.baseRevision,b.baseRevision,'Two real clients wrote from the same revision');
      assert.equal(server.rows.get(carrot).at_home_quantity,remoteValue,'Conflict detection never silently overwrites B');
      await assert.rejects(model(A.page,'home',carrot,10),/indisponible|conflit/i);
      await shot(A.page,'04-conflict-'+resolution);
      await native(A.page,'resolve',carrot,resolution);await settle(A.page);await settle(B.page);
      const accepted=resolution==='server'?remoteValue:localValue;await amount(A.page,accepted,500-accepted);await amount(B.page,accepted,500-accepted);
      assert.equal(server.rows.get(carrot).at_home_quantity,accepted);
    }
    await concurrent(220,260,'server');await concurrent(300,340,'local');
    record('Concurrent revision CAS rejects the stale PATCH; explicit server and local resolutions converge');

    const scope=(await model(A.page,'snapshot')).scope,groupKey=(await item(A.page)).groupKey;
    await A.page.evaluate(({scope,groupKey,id})=>DobbyCuisineEngine.evaluate('st.shopFinal.items=[{id:"legacy-local",name:"TEST — Ancien local",qty:500,unit:"g",done:false}];st.shopFinal.homeByScope={local:{"[\\"legacy-local\\"]":{qty:75,ids:["legacy-local"]}},[p.scope]:{[p.groupKey]:{qty:475,ids:[p.id]}}};save();',{scope,groupKey,id}),{scope,groupKey,id:carrot});
    const legacyNotes=await A.page.evaluate(()=>DobbyCuisineEngine.evaluate('return JSON.stringify(st.shopFinal.homeByScope);'));
    const postsBefore=server.writes.filter(x=>x.method==='POST').length;
    await amount(A.page,300,200);await model(A.page,'home',(await item(A.page)).id,200);await settle(A.page);
    await A.page.reload();await A.page.waitForFunction(()=>window.DobbyCuisine?.ready);await settle(A.page);await settle(B.page);await amount(A.page,200,300);await amount(B.page,200,300);
    assert.equal(await A.page.evaluate(()=>DobbyCuisineEngine.evaluate('return JSON.stringify(st.shopFinal.homeByScope);')),legacyNotes,'Shared availability never rewrites legacy local homeByScope');
    assert.equal(server.writes.filter(x=>x.method==='POST').length,postsBefore,'Legacy local rows and notes are never published automatically');
    assert.equal(server.rows.get(carrot).at_home_quantity,200,'A stale local note cannot become remote availability on reload');
    record('Legacy homeByScope stays intact, ignored by shared snapshots, and never auto-published');

    const mixed='TEST — Groupe g et kg';
    await native(A.page,'add',{title:mixed,quantity:200,unit:'g'});await native(A.page,'add',{title:mixed,quantity:.3,unit:'kg'});await settle(A.page);
    let grouped=await item(A.page,mixed);assert.equal(grouped.ids.length,2);assert.equal(grouped.requiredQty,500);
    const originals=grouped.sources,groupScope=(await model(A.page,'snapshot')).scope,beforeRejected=server.writes.length;
    await assert.rejects(native(A.page,'editGroup',originals.map((source,i)=>({id:source.id,expected:{...source,clientRev:source.clientRev+(i===1?1:0)},values:{at_home_quantity:i?0:.1}})),groupScope),/changé/i);
    // A rejected second row must also roll back the first row in native IndexedDB.
    A.state.offline=true;await A.page.reload();await A.page.waitForFunction(()=>window.DobbyCuisine?.ready);
    await A.page.waitForFunction(name=>DobbyCuisineList.snapshot(DobbyCuisineEngine).items.some(x=>x.name===name),mixed);
    const restored=(await native(A.page,'read')).items;
    for(const source of originals){const actual=restored.find(x=>x.id===source.id);assert.equal(actual.at_home_quantity,source.at_home_quantity);assert.equal(actual.clientRev,source.clientRev);assert.equal(actual.syncState,'clean');}
    assert.equal(server.writes.length,beforeRejected);A.state.offline=false;await settle(A.page);
    grouped=await item(A.page,mixed);
    await model(A.page,'home',grouped.id,251);await settle(A.page);await settle(B.page);await amount(B.page,251,249,mixed);
    let remaining=251;
    for(const id of grouped.ids.slice().sort()){
      const raw=server.rows.get(id),factor=raw.unit==='kg'?1000:1,assigned=Math.min(raw.quantity*factor,remaining);
      assert.equal(raw.at_home_quantity,assigned/factor,'Grouped availability is deterministically distributed in each raw row unit');remaining-=assigned;
    }
    assert.equal(remaining,0);
    await model(A.page,'edit',grouped.id,{name:mixed,qty:.8,unit:'kg'});await settle(A.page);await settle(B.page);
    grouped=await amount(B.page,251,549,mixed);assert.equal(grouped.requiredQty,800);assert.equal(grouped.unit,'g');
    record('Grouped edits roll back atomically on a stale row; g/kg availability retains gram precision and survives compatible editing');

    // The public simple writer accepts the new field too; it uses the same CAS path.
    await native(A.page,'edit',carrot,{at_home_quantity:100});await settle(A.page);await settle(B.page);await amount(B.page,100,400);
    await model(A.page,'remove',(await item(A.page,mixed)).id);await settle(A.page);await settle(B.page);
    assert.equal(await item(B.page,mixed),undefined);assert.ok(grouped.ids.every(id=>server.rows.get(id).deleted_at));
    await model(A.page,'add',{name:mixed,qty:500,unit:'g'});await settle(A.page);await amount(A.page,0,500,mixed);
    grouped=await item(A.page,mixed);await model(A.page,'home',grouped.id,100);await model(A.page,'check',grouped.id,true);await settle(A.page);
    assert.equal(await model(A.page,'archive',[grouped.id]),1);await settle(A.page);await settle(B.page);assert.equal(await item(B.page,mixed),undefined);
    await model(A.page,'add',{name:mixed,qty:500,unit:'g'});await settle(A.page);await settle(B.page);await amount(B.page,0,500,mixed);
    await model(A.page,'remove',(await item(A.page)).id);await settle(A.page);await settle(B.page);assert.equal(await item(B.page),undefined);
    assert.equal(server.rows.get(carrot).at_home_quantity,0,'Deleting a raw article clears its shared declaration');
    await model(A.page,'add',{name:title,qty:500,unit:'g'});await settle(A.page);await settle(B.page);await amount(B.page,0,500);
    assert.equal(await A.page.evaluate(()=>DobbyCuisineEngine.evaluate('return JSON.stringify(st.shopFinal.homeByScope);')),legacyNotes,'Even deleting an article with a legacy note leaves local notes intact');
    record('Simple native edits share availability; delete/archive and re-add leave no residual declaration');

    await A.page.evaluate(()=>DobbyCuisineEngine.evaluate('custom=[{id:"shared-home-recipe-a",name:"Soupe test",servings:2,ingredients:[["TEST — Import maison",200,"g"]],steps:["Cuire"]},{id:"shared-home-recipe-b",name:"Gratin test",servings:2,ingredients:[["TEST — Import maison",.3,"kg"]],steps:["Cuire"]}];st.customRecipes=custom;st.planned={[st.day+"-midi"]:{id:"shared-home-recipe-a",adult:2},[st.day+"-soir"]:{id:"shared-home-recipe-b",adult:2}};save();'));
    let proposal=await model(A.page,'preview');assert.equal(proposal.rows.length,1);assert.equal(proposal.rows[0].qty,500);await model(A.page,'confirmImport',proposal);await settle(A.page);await settle(B.page);
    const imported=await item(A.page,'TEST — Import maison');await model(A.page,'home',imported.id,200);await settle(A.page);await settle(B.page);await amount(B.page,200,300,'TEST — Import maison');
    const size=server.rows.size;assert.equal((await model(A.page,'preview')).rows.length,0);
    await A.page.reload();await A.page.waitForFunction(()=>window.DobbyCuisine?.ready);await settle(A.page);proposal=await model(A.page,'preview');assert.equal(proposal.rows.length,0);await model(A.page,'confirmImport',proposal);assert.equal(server.rows.size,size);
    await model(A.page,'check',(await item(A.page,'TEST — Import maison')).id,true);await settle(A.page);await settle(B.page);assert.equal((await item(B.page,'TEST — Import maison')).done,true);
    await model(B.page,'check',(await item(B.page,'TEST — Import maison')).id,false);await settle(B.page);await settle(A.page);await amount(A.page,200,300,'TEST — Import maison');assert.equal(server.rows.size,size);
    await shot(A.page,'05-shared-import-home-retained');
    record('Repeated import/reload remains idempotent and checking/unchecking preserves availability');

    const legacyServer=fixture({supportsHome:false});old=await login(browser,legacyServer,'legacy');
    assert.equal((await native(old.page,'read')).homeSupported,false);
    await old.page.evaluate(()=>DobbyCuisine.refresh());assert.match(await old.page.locator('[data-e072-backend-gate]').innerText(),/mise à jour de la base requise/);await old.page.locator('[data-cu-action=e072-home]').first().click();assert.equal(await old.page.locator('[data-cu-action=e072-home-all]').count(),0,'Unsupported backend never offers a false-success write');assert.match(await old.page.locator('[data-e072-dialog] [role=alert]').innerText(),/mise à jour/);await old.page.locator('[data-cu-action=e072-close]').click();
    const before=await old.page.evaluate(()=>DobbyCuisineEngine.evaluate('return JSON.stringify(st.shopFinal.homeByScope??null);'));
    await assert.rejects(model(old.page,'home',(await item(old.page)).id,200),/migration/i);
    assert.equal(await old.page.evaluate(()=>DobbyCuisineEngine.evaluate('return JSON.stringify(st.shopFinal.homeByScope??null);')),before,'Unsupported schema never stores a local false success');
    await amount(old.page,0,500);await model(old.page,'edit',(await item(old.page)).id,{name:title,qty:600,unit:'g'});await settle(old.page);
    await model(old.page,'check',(await item(old.page)).id,true);await settle(old.page);await model(old.page,'add',{name:'TEST — Legacy CRUD',qty:1,unit:'pièce'});await settle(old.page);
    assert.ok(legacyServer.writes.length>=3);assert.ok(legacyServer.writes.every(x=>!Object.hasOwn(x.body,'at_home_quantity')),'Existing CRUD on old schema never sends an unavailable column');
    assert.equal(legacyServer.rows.get(carrot).quantity,600);assert.equal(legacyServer.rows.get(carrot).checked,true);
    record('Old schema supports ordinary CRUD and fails availability with migration guidance and no false local success');
    report.status='PASS';report.writes=server.writes;report.legacyWrites=legacyServer.writes;
    console.log('CUISINE_SHARED_HOME_PASS two clients, shared availability, offline/reload, actual CAS conflicts, grouped units, legacy schema and import/check regression (HTTP fixture only)');
  }catch(error){
    report.status='FAIL';report.error=error.stack;report.writes=server.writes;
    for(const [label,client]of [['A',A],['B',B]])if(client){try{report[label]={snapshot:await model(client.page,'snapshot'),native:await native(client.page,'read')};}catch{}}
    throw error;
  }finally{
    fs.writeFileSync(path.join(evidence,'shared-home-results.json'),JSON.stringify(report,null,2));
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});

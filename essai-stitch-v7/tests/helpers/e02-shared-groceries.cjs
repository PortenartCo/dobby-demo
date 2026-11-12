/* Real E02 UI and native family cache; only external HTTP is simulated. */
const assert=require('node:assert/strict');

module.exports=async function sharedGroceries(browser,origin){
  const household='00000000-0000-4000-8000-000000000010';
  const user='00000000-0000-4000-8000-000000000001';
  const existing='TEST — Courses déjà partagées';
  const added='lait TEST E02 PARTAGÉ';
  const sentinel='LOCAL SENTINEL';
  const archive={items:[{id:'local-archive-item',name:'TEST — Archive locale',detail:'1',done:true}],validatedAt:'2026-11-11T10:00:00.000Z',meals:[]};
  const rows=new Map(),unexpected=[],failures=[];
  const context=await browser.newContext({viewport:{width:390,height:900},locale:'fr-BE',reducedMotion:'reduce'});
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url()),method=request.method();
    if(request.url().startsWith(origin+'/'))return route.continue();
    if(url.hostname!=='pqcdkrwljgvgagzwrcmg.supabase.co'||!/^\/(?:auth|rest)\/v1\//.test(url.pathname))return route.abort();
    const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(url.pathname==='/auth/v1/token')return reply({access_token:'fixture-e02-access',refresh_token:'fixture-e02-refresh',expires_in:3600,user:{id:user,email:'e02@fixture.example.test'}});
    if(url.pathname==='/rest/v1/dobby_v2_memberships')return reply([{household_id:household,active:true,user_id:user}]);
    if(url.pathname==='/rest/v1/dobby_v2_households')return reply([{id:household}]);
    if(url.pathname!=='/rest/v1/dobby_v2_grocery')return reply({code:'PGRST205',message:'Optional modules absent in this grocery fixture'},404);
    const id=(url.searchParams.get('id')||'').replace(/^eq\./,'');
    assert.equal((url.searchParams.get('household_id')||'eq.'+household).replace(/^eq\./,''),household);
    if(method==='GET')return reply(url.searchParams.get('limit')==='0'?[]:id?[rows.get(id)].filter(Boolean):[...rows.values()]);
    const body=request.postDataJSON();
    if(method==='POST'){
      assert.equal(body.household_id,household);
      if(rows.has(body.id))return reply({code:'23505',message:'Duplicate fixture row'},409);
      const stamp='2026-11-12T10:00:00.000Z';
      rows.set(body.id,{created_at:stamp,updated_at:stamp,deleted_at:null,at_home_quantity:0,...body,revision:1});
      return reply([rows.get(body.id)],201);
    }
    if(method==='PATCH'){
      const before=rows.get(id),revision=(url.searchParams.get('revision')||'').replace(/^eq\./,'');
      if(!before||String(before.revision)!==revision)return reply([]);
      rows.set(id,{...before,...body,revision:before.revision+1});return reply([rows.get(id)]);
    }
    unexpected.push(method+' '+request.url());return route.abort();
  });
  try{
    const page=await context.newPage();page.setDefaultTimeout(15000);
    const native=code=>page.evaluate(code=>DobbyFamilyStitchEngine.evaluate(code),code);
    const ready=()=>page.waitForFunction(()=>window.DobbyFamilyStitch?.ready&&DobbyFamilyStitchEngine.win().DobbyFamilyUI?.grocery.read().ready&&!document.querySelector('#user-input')?.disabled);
    const grocery=()=>page.evaluate(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.grocery.read());
    const settle=async()=>{
      await page.evaluate(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.grocery.sync());
      await page.waitForFunction(()=>{const list=DobbyFamilyStitchEngine.win().DobbyFamilyUI.grocery.read();return /à jour/.test(list.status)&&list.items.every(row=>row.syncState==='clean');});
    };
    const send=async text=>{
      await page.locator('#user-input').fill(text);await page.locator('[data-fa-action=rg-chat-send]').click();
      await page.waitForFunction(()=>!DobbyChat.busy);
      return page.locator('[data-e02-message=dobby]').last().textContent();
    };
    const check=(condition,message)=>{if(!condition)failures.push(message);};
    await page.goto(origin+'/essai-stitch-v7/famille.html#chat');await ready();
    await native(`st.shopFinal=null;st.extras=['LOCAL SENTINEL'];st.planned={};st.shopHistory={localArchive:${JSON.stringify(archive)}};save();`);
    await page.evaluate(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.putMeta('publicKey','sb_publishable_e02_fixture_only_123456789'));
    await page.reload();await ready();
    await page.evaluate(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.signIn('e02@fixture.example.test','fixture-only-password'));
    await page.waitForFunction(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.connectionState().verified);
    await page.evaluate(()=>DobbyFamilyStitch.open('chat'));await ready();
    assert.ok((await grocery()).context,'The real grocery cache has an authenticated fixture household');
    await page.evaluate(title=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.grocery.add({title,quantity:null,unit:''}),existing);
    await settle();
    await page.waitForFunction(title=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.grocery.read().items.some(row=>row.title===title&&row.syncState==='clean'),existing);
    assert.equal(await native('return st.shopFinal;'),null,'Starting chat and native family writes do not initialize the local E07 list');

    // Add before any list snapshot: a fresh chat must choose the shared writer.
    await send('acheter du '+added);
    await settle();
    const afterAdd=await grocery(),localAfterAdd=await native('return JSON.parse(JSON.stringify({extras:st.extras,final:st.shopFinal,history:st.shopHistory}));');
    check(afterAdd.items.filter(row=>row.title===added).length===1,'A direct E02 add before opening Courses must reach the native shared cache');
    check([...rows.values()].filter(row=>row.title===added&&!row.deleted_at).length===1,'The direct E02 add must reach the shared HTTP fixture');
    check(!localAfterAdd.extras.includes(added)&&!(localAfterAdd.final?.items||[]).some(row=>row.name===added),'A shared E02 addition must not create a local fallback item');
    await send('acheter du '+added);
    await settle();
    check((await grocery()).items.filter(row=>row.title===added).length===1,'Repeating the E02 command must leave one shared item');
    check([...rows.values()].filter(row=>row.title===added&&!row.deleted_at).length===1,'Repeating the E02 command must not duplicate the persisted shared item');

    const answer=await send('quelles sont les courses');
    check(answer.includes(existing)&&answer.includes(added)&&!answer.includes(sentinel),'The Courses answer must use shared cache contents and exclude local preparation');
    await page.reload();await ready();
    await page.waitForFunction(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.connectionState().verified);
    const reloaded=await send('quelles sont les courses');
    check(reloaded.includes(existing)&&reloaded.includes(added)&&!reloaded.includes(sentinel),'Reloaded E02 must still read the authoritative shared Courses cache');
    const beforeUnavailable=await native('return JSON.stringify({extras:st.extras,final:st.shopFinal,history:st.shopHistory});');
    const messagesBefore=await page.locator('[data-e02-message=user]').count();
    await page.evaluate(()=>{window.__e02SharedList=DobbyCuisineList;delete window.DobbyCuisineList;});
    await send('acheter TEST ADAPTATEUR ABSENT');
    check(await page.locator('[data-e02-message=user]').count()===messagesBefore,'An unavailable shared adapter must not create a success exchange');
    check(/indisponible/i.test(await page.locator('[data-e02-status]').textContent()),'An unavailable shared adapter must report its failure');
    check(await native('return JSON.stringify({extras:st.extras,final:st.shopFinal,history:st.shopHistory});')===beforeUnavailable,'An unavailable shared adapter must preserve local preparation and archives');
    check(!(await grocery()).items.some(row=>row.title==='TEST ADAPTATEUR ABSENT'),'An unavailable shared adapter must not add a shared item');
    await page.evaluate(()=>{window.DobbyCuisineList=window.__e02SharedList;delete window.__e02SharedList;});
    assert.deepEqual(await native('return st.shopHistory;'),{localArchive:archive},'Shared chat actions preserve local archives');
    assert.deepEqual(unexpected,[],'The intercepted fixture receives only supported data operations');
    if(failures.length)console.error('E02_SHARED_GROCERY_DIAGNOSTIC',JSON.stringify({failures,shared:afterAdd.items.map(row=>row.title),local:localAfterAdd,answer,reloaded}));
    assert.deepEqual(failures,[],'E02 reads and writes the one native shared Courses list');
    console.log('E02_SHARED_GROCERY_PASS direct chat add before E07 initialization, authoritative shared reads, deduplication, reload, local archive preservation (HTTP fixture only)');
  }finally{await context.close();}
};

/* Real native member operations in Chromium. Fictional state, isolated browser,
 * localhost assets only; every external request is aborted before dispatch. */
const test=require('node:test'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8893';
const cfg=require('../../essai-stitch-v7/data/onboarding-scoring-v1.json');
const qa=require('../../design/e06/references/scoring/qa-results.json');
test('FAM native form guards, model compatibility and child E06 confirmation use the existing writer',async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext(),attempts=[];
  await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():(attempts.push(route.request().url()),route.abort()));
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
  await page.goto(origin+'/essai-stitch-v7/famille.html');await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);
  const native=code=>page.evaluate(code=>DobbyFamilyStitchEngine.evaluate(code),code);
  await native(`st.familyMembers=[{id:'test-parent-a',name:'TEST Parent A',memberCategory:'parent',avatar:'👩'},{id:'test-parent-b',name:'TEST Parent B',memberCategory:'parent',avatar:'👨'},{id:'test-child',name:'TEST Enfant',memberCategory:'child',avatar:'🐉',opaque:{keep:true}},{id:'test-baby',name:'TEST Bébé',memberCategory:'baby',avatar:'👶'},{id:'test-pet',name:'TEST Animal',memberCategory:'pet',avatar:'🐈'},{id:'test-legacy',name:'TEST Nom ancien indivisible',avatar:'🦉',future:{keep:true}}];st.famHealth=[];st.runeCredits=[];st.runeRequests=[];save();`);
  const directSave=(id,values)=>page.evaluate(({id,values})=>{const E=DobbyFamilyStitchEngine;E.memberForm(id);const form=E.win().document.getElementById('v23MemberForm');for(const[key,value]of Object.entries(values)){let input=form.elements.namedItem(key);if(!input){input=E.win().document.createElement('input');input.type='hidden';input.name=key;form.append(input);}input.value=value;}form.requestSubmit();return E.read().members;},{id,values});
  const directDelete=id=>native(`v23MemberAction({dataset:{v23Member:'delete',id:${JSON.stringify(id)}}});`);
  const before=await native('return st.familyMembers;');
  await directSave('test-child',{name:'TEST Refus réel',notes:'TEST'});await directDelete('test-child');assert.deepEqual(await native('return st.familyMembers;'),before,'Real native writes and deletes fail closed');
  await native(`window.__testPersona='test-parent-a';window.DobbyReview=Object.freeze({root:location.origin+'/',get demoMemberId(){return window.__testPersona;}});`);
  assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.memberPermissions('test-child').canEdit),true);
  const childId=await page.evaluate(()=>DobbyFamilyStitchEngine.saveMember('test-child',{firstName:'TEST Camille',lastName:'Fictive',nickname:'TEST Lutin',memberCategory:'child',notes:'TEST Mémoire gardée',species:'',birthdate:'2017-05-06'}));
  assert.equal(childId,'test-child');let saved=await native(`return st.familyMembers.find(m=>m.id==='test-child');`);assert.equal(saved.name,'TEST Camille Fictive');assert.equal(saved.avatar,'🐉');assert.equal(saved.opaque.keep,true);assert.equal(saved.notes,'TEST Mémoire gardée');
  const canonical=await native('return st.familyMembers;');assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.memberPermissions('test-parent-b').canEdit),true,'V7 parent manages the full current household');
  for(const id of ['test-parent-a','test-child'])for(const values of [{magicHouseId:'slytherin',magicHouseAlgorithm:'e06-v1'},{magicPatronusId:'otter'},{magicCeremony:'complete'}]){await directSave(id,values);assert.deepEqual(await native('return st.familyMembers;'),canonical,'Parent cannot assign manual magical results to any profile');}
  const newId=await page.evaluate(()=>DobbyFamilyStitchEngine.saveMember(null,{firstName:'TEST Chaton',lastName:'',memberCategory:'pet',species:'chat',nickname:'TEST Moustache',notes:'TEST Rituel'}));assert.ok(newId);assert.equal((await native(`return st.familyMembers.find(m=>m.id===${JSON.stringify(newId)});`)).species,'chat');
  await page.evaluate(id=>DobbyFamilyStitchEngine.deleteMember(id),newId);
  await native(`window.__testPersona='test-child';`);
  const childBefore=await native(`return st.familyMembers.find(m=>m.id==='test-child');`);
  await directSave('test-child',{name:childBefore.name,magicHouseId:'slytherin',magicHouseAlgorithm:'e06-v1'});await directDelete('test-child');assert.deepEqual(await native(`return st.familyMembers.find(m=>m.id==='test-child');`),childBefore,'Child cannot forge algorithm metadata or delete itself');
  for(const kind of ['house','patronus']){
   const example=qa[kind].one_reachable_example_each[kind==='house'?'serdaigle':'renard'],picks=example[kind==='house'?'q1_to_q6':'q1_to_q5'],extra=example[kind==='house'?'q7':'q6'];
   const answers=picks.map((index,q)=>cfg[kind].questions[q].answers[index].id);if(extra!==null)answers.push(cfg[kind].questions[picks.length].answers[extra].id);
   await page.evaluate(async({kind,answers})=>{const G=DobbyOnboardingEngine;await G.restart(kind,'test-child');for(let index=0;index<answers.length;index++)await G.answer(kind,index,answers[index]);await G.confirm(kind);},{kind,answers});
  }
  await page.evaluate(()=>DobbyOnboardingEngine.finish());saved=await native(`return st.familyMembers.find(m=>m.id==='test-child');`);
  assert.equal(saved.magicProfile.houseId,'ravenclaw');assert.equal(saved.magicProfile.patronusId,'fox');assert.equal(saved.magicProfile.houseAlgorithmVersion,'e06-v1');assert.equal(saved.magicProfile.patronusAlgorithmVersion,'e06-v1');assert.equal(saved.magicProfile.ceremonyStatus,'complete');assert.equal(saved.avatar,'🐉');assert.equal(saved.notes,'TEST Mémoire gardée');assert.equal(saved.opaque.keep,true);
  await assert.rejects(page.evaluate(()=>DobbyFamilyStitchEngine.saveMagicResult('test-parent-a','house',[])),/enfant|questionnaires/);
  await assert.rejects(page.evaluate(()=>DobbyFamilyStitchEngine.saveMagicResult('test-child','house',[])),/incomplet/);
  await native(`window.__testPersona='test-baby';`);assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.memberPermissions('test-baby').canMagic),false);
  await native(`window.__testPersona='test-pet';`);assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.memberPermissions('test-pet').canCreate),false);
  assert.deepEqual(await native('return st.runeCredits;'),[]);assert.deepEqual(await native('return st.runeRequests;'),[]);
  await page.reload();await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready);saved=await native(`return st.familyMembers.find(m=>m.id==='test-child');`);assert.equal(saved.magicProfile.houseId,'ravenclaw');assert.equal(saved.notes,'TEST Mémoire gardée');assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.memberPermissions('test-child').canEdit),false,'Demo test persona is never persisted as a real authorization');
  assert.deepEqual(errors,[]);assert.equal(attempts.some(url=>/supabase|auth\/v1|rest\/v1/.test(url)),false);await context.close();
 }finally{await browser.close();}
});

test('FAM15 native local and shared medical operations enforce actor and old/new attribution',async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext();await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  // Exercise the shared native handler without a backend or fake auth. Only
  // the module activation check is local-fixtured; native actor policy is real.
  await context.addInitScript(()=>{let api;Object.defineProperty(window,'DobbyFamilyUI',{configurable:true,get:()=>api,set:value=>{api=Object.freeze({...value,isModuleActive:module=>module==='family'});}});});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
  await page.goto(origin+'/essai-stitch-v7/famille.html');await page.waitForFunction(()=>window.DobbyFamilyStitch?.ready&&DobbyFamilyStitchEngine.win().DobbyFamilyHealth?.available);
  const native=code=>page.evaluate(code=>DobbyFamilyStitchEngine.evaluate(code),code);
  await native(`st.familyMembers=[{id:'test-parent-a',name:'TEST Parent A',memberCategory:'parent'},{id:'test-parent-b',name:'TEST Parent B',memberCategory:'parent'},{id:'test-child',name:'TEST Enfant',memberCategory:'child'},{id:'test-baby',name:'TEST Bébé',memberCategory:'baby'},{id:'test-pet',name:'TEST Animal',memberCategory:'pet'}];st.famHealth=['test-parent-a','test-parent-b','test-child'].map(personId=>({id:'local-'+personId,personId,person:st.familyMembers.find(m=>m.id===personId).name,name:'TEST Rendez-vous local',date:'2026-12-01',note:'TEST privé'}));st.sharedHealthVisits=['test-parent-a','test-parent-b','test-child'].map(personId=>({id:'shared-'+personId,personId,person:st.familyMembers.find(m=>m.id===personId).name,title:'TEST Rendez-vous partagé',date:'2026-12-01',time:'10:00',note:'TEST partagé'}));st.sharedHealthVisits.push({id:'shared-foyer',personId:'',person:'Foyer',title:'TEST Foyer',date:'2026-12-01'});save();`);
  const snapshot=()=>native('return JSON.parse(JSON.stringify({local:st.famHealth,shared:st.sharedHealthVisits}));');
  const submit=(scope,id,personId,extra={})=>page.evaluate(({scope,id,personId,extra})=>{const E=DobbyFamilyStitchEngine;if(scope==='shared')E.sharedForm(id);else E.localForm(id,personId);const form=E.win().document.getElementById(scope==='shared'?'fhForm':'xHealthForm');for(const[key,value]of Object.entries({personId,...extra})){const input=form.elements.namedItem(key);if(input)input.value=value;}form.requestSubmit();},{scope,id,personId,extra});
  const remove=(scope,id)=>page.evaluate(({scope,id})=>{try{DobbyFamilyStitchEngine.deleteVisit(scope,id);}catch{}},{scope,id});
  const allBefore=await snapshot();for(const scope of ['local','shared']){await submit(scope,scope+'-test-child','test-child',{note:'TEST refus réel'});await remove(scope,scope+'-test-child');}assert.deepEqual(await snapshot(),allBefore,'Unknown real identity cannot edit or delete medical records');
  await native(`window.__testPersona='test-child';window.DobbyReview=Object.freeze({root:location.origin+'/',get demoMemberId(){return window.__testPersona;}});`);
  for(const actor of ['test-child','test-baby','test-pet']){await native('window.__testPersona='+JSON.stringify(actor)+';');for(const scope of ['local','shared']){await submit(scope,scope+'-test-child','test-child',{note:'TEST refus enfant'});await remove(scope,scope+'-test-child');}}assert.deepEqual(await snapshot(),allBefore,'Child, baby and pet cannot mutate local/shared medical records');
  await native(`window.__testPersona='test-parent-a';`);
  assert.equal(await page.evaluate(()=>DobbyFamilyStitchEngine.memberPermissions('test-parent-b').canEdit),true,'V7 parent may manage other members of this household');
  for(const scope of ['local','shared'])for(const id of ['test-parent-a','test-parent-b','test-child'])await submit(scope,scope+'-'+id,id,{note:'TEST modification autorisée'});
  const allowed=await snapshot();for(const rows of [allowed.local,allowed.shared])for(const id of ['test-parent-a','test-parent-b','test-child'])assert.equal(rows.find(row=>row.id.endsWith(id)).note,'TEST modification autorisée');
  await submit('shared','shared-foyer','',{note:'TEST foyer autorisé'});assert.equal((await snapshot()).shared.find(row=>row.id==='shared-foyer').note,'TEST foyer autorisé');
  await native(`window.__testPersona='test-child';`);const foyerBefore=await snapshot();await submit('shared','shared-foyer','',{note:'TEST refus foyer enfant'});assert.deepEqual(await snapshot(),foyerBefore);
  await native(`window.__testPersona='test-parent-a';`);for(const scope of ['local','shared'])await remove(scope,scope+'-test-child');const removed=await snapshot();assert.equal(removed.local.some(row=>row.personId==='test-child'),false);assert.equal(removed.shared.some(row=>row.personId==='test-child'),false);assert.equal(removed.local.find(row=>row.personId==='test-parent-b').note,'TEST modification autorisée');
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

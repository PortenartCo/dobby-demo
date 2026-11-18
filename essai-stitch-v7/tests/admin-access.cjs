/* Full-page Lot 4 browser proof. Real GoTrue/PostgREST/SMTP + shipped Edge.
 * No Auth mocks, no application route interception, no hosted contact. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID,createHash}=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const proof=require('../../tests/private-access/lot4/browser-proof.cjs');
const root=path.resolve(__dirname,'../..');
const out=process.env.DOBBY_LOT4_EVIDENCE||path.join(root,'docs/dobby-v7/evidence/lot-4/browser');
const id=number=>`00000000-0000-4000-8000-${String(number).padStart(12,'0')}`;
const q=value=>"'"+String(value).replaceAll("'","''")+"'";
const views=['admin-access','admin-invite','admin-requests','admin-status','admin-history'];
const sourcePaths=['essai-stitch-v5-famille/family-v2.js','essai-stitch-v5-famille/family-access.mjs','essai-stitch-v5-famille/family-core.mjs','essai-stitch-v7/admin-access.js','essai-stitch-v7/admin-access.css','essai-stitch-v7/access.js','essai-stitch-v7/access.css','essai-stitch-v7/family.js','essai-stitch-v7/chrome.js','essai-stitch-v7/tools-register.js','essai-stitch-v7/family-members-review.js','essai-stitch-v7/family-member-detail.js','essai-stitch-v7/famille.html','essai-stitch-v7/traverse.html','essai-stitch-v7/missions.html','essai-stitch-v7/index.html','supabase/functions/_shared/dobby-admin-handler.ts','supabase/functions/_shared/dobby-auth-admin.ts','supabase/functions/_shared/dobby-admin-validation.ts','essai-stitch-v7/tests/admin-access.cjs','tests/private-access/lot4/preview-server.mjs','tests/private-access/lot4/preview-bootstrap.js','tests/private-access/lot4/browser-proof.cjs'];
const fingerprints=()=>Object.fromEntries(sourcePaths.map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));

function mailCallback(message,origin){
 const markup=String(message.HTML??message.Html??message.Text??'');
 const links=[...markup.matchAll(/href="([^"]+)"/g)].map(match=>match[1].replaceAll('&amp;','&'));
 const selected=links.find(value=>{try{const url=new URL(value);return url.origin===origin&&url.searchParams.has('admission_id')&&url.searchParams.has('token_hash');}catch{return false;}});
 assert.ok(selected,'Actual local SMTP message contains bounded recipient callback');return selected;
}
async function command(page,command,payload={}){return proof.native(page,'admin',command,payload);}
async function ownRow(page,userId){const result=await command(page,'listAccess',{});return result.items.find(row=>row.userId===userId);}
async function pendingRows(page){return(await command(page,'listAccess',{})).requests;}
async function status(page,userId,next){const row=await ownRow(page,userId);assert.ok(row);return command(page,'setStatus',{userId,status:next,expectedRevision:row.revision,operationId:randomUUID(),confirmed:true});}
async function confirmUI(page){const dialog=page.locator('[data-admin-confirmation]');await dialog.waitFor();assert.equal(await dialog.locator('[data-admin-confirm]').isDisabled(),true);await dialog.locator('input[name=confirmed]').check();assert.equal(await dialog.locator('[data-admin-confirm]').isDisabled(),false);await dialog.locator('[data-admin-confirm]').click();await dialog.waitFor({state:'detached'});}
async function statusUI(current,userId,next){await proof.view(current,'admin-status');await current.page.locator('select[name=userId]').selectOption(userId);await current.page.locator(`[data-admin-status-action="${next}"]`).click();await confirmUI(current.page);await current.page.locator('[data-admin-status]').getByText(next==='active'?/Réactivation confirmée/:/Suspension confirmée/).waitFor();}
async function signInUI(current,email,password){
 await current.page.evaluate(()=>DobbyFamilyStitch.open('access-auth',{mode:'login'}));
 await current.page.locator('main input[name=email]').fill(email);await current.page.locator('main input[name=password]').fill(password);
 await current.page.getByRole('button',{name:'Se connecter',exact:true}).click();
 await current.page.waitForURL(url=>!url.hash.startsWith('#access-auth'),{waitUntil:'domcontentloaded'});await proof.ready(current.page);
 return proof.native(current.page,'state');
}
async function durableItems(page){return page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('dobby-v5-household-preview-v2',1);request.onsuccess=()=>{const db=request.result,tx=db.transaction('items'),items=tx.objectStore('items').getAll();items.onsuccess=()=>{resolve(items.result);db.close();};items.onerror=()=>reject(items.error);};request.onerror=()=>reject(request.error);}));}

(async()=>{
 const {startLot4Preview}=await import(pathToFileURL(path.join(root,'tests/private-access/lot4/preview-server.mjs')).href);
 let fixture,browser,browserServer;const results=[],captures=[],sourcesBefore=fingerprints();
 const closeContext=async context=>{const timer=setTimeout(()=>void browserServer?.kill().catch(()=>{}),8000);timer.unref();try{await context.close().catch(()=>{});}finally{clearTimeout(timer);}};
 fs.mkdirSync(out,{recursive:true});
 try{
  fixture=await startLot4Preview();
  for(const privatePath of ['/essai-stitch-v7/..%2Ftests/private-access/lot4/preview-server.mjs','/essai-stitch-v7/%2e%2e%2Fsupabase/functions/_shared/dobby-admin-handler.ts','/tests/private-access/lot4/preview-server.mjs']){
   const response=await fetch(fixture.origin+privatePath);assert.ok([403,404].includes(response.status),'Preview must not serve private source through traversal');
   assert.ok((await response.text()).length<100,'No private source is returned');
  }
  results.push({scenario:'preview-private-source-traversal-denied',status:'PASS',encodedSeparatorsDenied:true});
  browserServer=await chromium.launchServer({host:'127.0.0.1',executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  browser=await chromium.connect(browserServer.wsEndpoint());
  // All five views are exercised at all required widths in actual famille.html.
  for(const width of (process.env.DOBBY_LOT4_WIDTHS||'320,390,768,1440').split(',').map(Number)){
   const current=await proof.createPage(browser,fixture.origin,width);
   try{
    await proof.open(current);
    const state=await proof.native(current.page,'state');assert.equal(state.privateAccess.isOwner,true);assert.equal(state.userId,id(1));
    for(const name of views){
     await proof.view(current,name);
     assert.equal(await current.page.locator('[data-admin-tab]').count(),5,'Five console views');
     assert.equal(await current.page.locator('[data-e01-destination]').count(),6);
     if(name==='admin-access'||width===390)captures.push(await proof.capture(current,out,name));
     if(name==='admin-invite'){
      await current.page.locator('input[name=email]').fill(`cancelled-width-${width}@example.invalid`);
      await current.page.getByRole('button',{name:'Préparer le récapitulatif',exact:true}).click();
      const dialog=current.page.locator('[data-admin-confirmation]');await dialog.waitFor();
      assert.equal(await dialog.locator('[data-admin-confirm]').isDisabled(),true);
      await dialog.locator('input[name=confirmed]').check();assert.equal(await dialog.locator('[data-admin-confirm]').isDisabled(),false);
      if(width===320)captures.push(await proof.capture(current,out,'invite-confirmation'));
      await dialog.getByRole('button',{name:'Annuler',exact:true}).click();
     }
     if(name==='admin-status'){
      await current.page.locator('select[name=userId]').selectOption(id(2));
      await current.page.locator('[data-admin-status-action=suspended]').click();
      const dialog=current.page.locator('[data-admin-confirmation]');await dialog.waitFor();
      assert.equal(await dialog.locator('[data-admin-confirm]').isDisabled(),true);
      await dialog.getByRole('button',{name:'Annuler',exact:true}).click();
     }
    }
    if(width===390){
     await current.page.evaluate(()=>DobbyFamilyStitch.open('menu'));await current.page.locator('[data-admin-entry]').waitFor();
     assert.equal(await current.page.locator('[data-admin-entry]').count(),1,'Distinct owner entry is in Menu');
     captures.push(await proof.capture(current,out,'owner-menu'));
    }
    await proof.view(current,'admin-requests');
    assert.equal(await current.page.locator('[data-admin-request]').count(),0,'Empty request list is real, before fixture requests');
    if(width===390)captures.push(await proof.capture(current,out,'empty-requests'));
    proof.assertClean(current);results.push({scenario:'complete-v7-five-views',width,status:'PASS',header:true,dockDestinations:6,externalRequests:0});
    console.log('LOT4_BROWSER_WIDTH_PASS',width);
   }finally{await closeContext(current.context);}
  }
  const owner=await proof.createPage(browser,fixture.origin,390),parent=await proof.createPage(browser,fixture.origin,390);
  try{
   await proof.open(owner);await proof.open(parent,'salon',3);
   // A normal Parent uses the actual nominative Famille dialog and real RPC.
   await parent.page.evaluate(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.access.refresh());
   await parent.page.evaluate(()=>DobbyFamilyStitch.open('members'));
   await parent.page.locator('#invite-member-btn[aria-haspopup=dialog]').waitFor();
   await parent.page.locator('#invite-member-btn').click();
   await parent.page.locator('#access-invite-dialog input[name=email]').fill('browser-parent-request@example.invalid');
   await parent.page.getByRole('button',{name:'Enregistrer la demande',exact:true}).click();
   await parent.page.locator('#access-invite-dialog').getByText(/Demande enregistrée/).waitFor();
   let request=(await pendingRows(owner.page)).find(row=>row.email==='browser-parent-request@example.invalid');assert.ok(request);assert.equal(request.purpose,'family-parent');assert.equal(request.householdId,id(102));
   console.log('LOT4_BROWSER_PHASE_PASS','normal Parent request');
   assert.equal(fixture.auth.sql("SELECT count(*) FROM auth.users WHERE email='browser-parent-request@example.invalid';"),'0','Parent request creates no Auth identity');
   await parent.page.locator('#access-invite-dialog').getByRole('button',{name:/Fermer|Annuler/}).first().click();
   // Ordinary account cannot enter administration even with a forged direct URL.
   await parent.page.goto(fixture.origin+'/fixture-3/essai-stitch-v7/famille.html#admin-access');await proof.ready(parent.page);
   await parent.page.waitForFunction(()=>!document.querySelector('[data-admin-loading]'));
   assert.equal(await parent.page.locator('[data-admin-account]').count(),0);assert.equal(await parent.page.locator('[data-admin-entry]').count(),0);
   const parentSession=await fixture.auth.getLogin(3);
   const denied=await parent.page.evaluate(async token=>{const response=await fetch('/functions/v1/dobby-access-admin',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({command:'listAccess',payload:{}})});return response.status;},parentSession.access_token);
   assert.equal(denied,403);assert.equal((await proof.native(parent.page,'state')).verified,true,'Refused admin probe preserves normal family identity');
   results.push({scenario:'T12-owner-only-and-forged-url',status:'PASS',realEdgeDenialHTTP:403,normalParentPreserved:true});

   // Approval uses the genuine handler; the recipient consumes the genuine SMTP
   // callback in a separate full V7 page and completes required profile fields.
   await proof.view(owner,'admin-requests');
   await owner.page.locator(`[data-admin-request="${request.id}"]`).getByRole('button',{name:'Approuver',exact:true}).click();
   await confirmUI(owner.page);await owner.page.locator('[data-admin-status]').getByText(/Envoi confirmé/).waitFor();
   console.log('LOT4_BROWSER_PHASE_PASS','owner UI approval and confirmed delivery');
   const callback=mailCallback(await fixture.auth.inbox.waitFor('browser-parent-request@example.invalid'),fixture.origin);
   const recipient=await proof.createPage(browser,fixture.origin,390);
   try{
    try{await recipient.page.goto(callback);}catch{throw Error('Full V7 recipient callback navigation failed');}
    await recipient.page.getByRole('button',{name:'Accepter et continuer',exact:true}).waitFor();
    assert.equal(new URL(recipient.page.url()).search,'','Callback bearer is removed before resource navigation');
    const before=fixture.auth.sql(`SELECT state FROM dobby_access_private.admissions WHERE id=${q(request.id)};`);assert.equal(before,'sent');
    await recipient.page.getByRole('button',{name:'Accepter et continuer',exact:true}).click();
    await recipient.page.getByRole('heading',{name:'Confirmer votre admission',exact:true}).waitFor();
    console.log('LOT4_BROWSER_PHASE_PASS','recipient explicit Auth confirmation');
    assert.equal(fixture.auth.sql(`SELECT state FROM dobby_access_private.admissions WHERE id=${q(request.id)};`),'sent','Auth confirmation alone does not consume admission');
    await recipient.page.locator('input[name=firstName]').fill('Adulte');await recipient.page.locator('input[name=lastName]').fill('Fictif');
    assert.equal(await recipient.page.locator('[data-access-avatar]').count(),24);
    await recipient.page.getByRole('button',{name:'Confirmer mon admission',exact:true}).click();
    console.log('LOT4_BROWSER_PHASE_PASS','recipient profile submitted');
    await recipient.page.waitForURL(url=>!url.hash.startsWith('#access-confirmation'),{waitUntil:'domcontentloaded'});
    await proof.ready(recipient.page);
    const accepted=await proof.native(recipient.page,'state');assert.equal(accepted.householdId,id(102));assert.equal(accepted.profile.firstName,'Adulte');assert.equal(accepted.profile.memberCategory,'parent');
    assert.equal(fixture.auth.sql(`SELECT state FROM dobby_access_private.admissions WHERE id=${q(request.id)};`),'accepted');
    captures.push(await proof.capture(recipient,out,'adult-admitted'));proof.assertClean(recipient);
    results.push({scenario:'T03-actual-v7-adult-admission',status:'PASS',separateBrowser:true,explicitAuthConfirmation:true,profileBeforeAtomicAccept:true,household:'fictional-H2'});
    console.log('LOT4_BROWSER_PHASE_PASS','T03 adult admission');
   }catch(error){console.error('LOT4_BROWSER_RECIPIENT_FAILURE',error.message);console.error('LOT4_BROWSER_RECIPIENT_LOCATION',new URL(recipient.page.url()).pathname+new URL(recipient.page.url()).hash);throw error;}
   finally{await closeContext(recipient.context);}

   // Closed production child gates preserve the existing canonical child JSON,
   // magic, mission credit and family revision in the actual backend.
   const childSnapshot=()=>fixture.auth.sql(`SELECT jsonb_agg(jsonb_build_object('module',module,'payload',payload,'revision',revision) ORDER BY module)::text FROM public.dobby_v2_modules WHERE household_id=${q(id(102))};`);
   const childBefore=childSnapshot();
   const child=await proof.native(parent.page,'requestFamilyAccount',{email:'fixture-4@example.invalid',kind:'family-child',memberId:'TEST_CHILD',operationId:randomUUID()});
   let childRefused=false;try{await command(owner.page,'decide',{admissionId:child.admission.id,decision:'approve',expectedRevision:child.admission.revision,operationId:randomUUID()});}catch{childRefused=true;}
   assert.equal(childRefused,true);assert.equal(childSnapshot(),childBefore);assert.equal(fixture.auth.sql('SELECT child_delivery_enabled FROM dobby_access_private.settings;'),'f');
   await proof.view(owner,'admin-requests');
   const childCard=owner.page.locator(`[data-admin-request="${child.admission.id}"]`);
   assert.equal(await childCard.getByRole('button',{name:'Approuver',exact:true}).isDisabled(),true);
   await childCard.getByRole('button',{name:'Refuser',exact:true}).click();await confirmUI(owner.page);
   await owner.page.locator('[data-admin-status]').getByText(/Refus enregistré/).waitFor();
   await proof.view(owner,'admin-history');await owner.page.locator('[data-admin-decision]').filter({hasText:child.admission.id}).waitFor();
   assert.equal(childSnapshot(),childBefore);
   results.push({scenario:'closed-child-gates-canonical-preservation',status:'PASS',existingChild:'TEST_CHILD',canonicalPayloadsAndRevisionsPreserved:true,childDeliveryEnabled:false});
   console.log('LOT4_BROWSER_PHASE_PASS','closed child gates and refusal history');

   await proof.view(owner,'admin-invite');await owner.page.locator('input[name=email]').fill('browser-new-household@example.invalid');
   await owner.page.getByRole('button',{name:'Préparer le récapitulatif',exact:true}).click();await confirmUI(owner.page);
   await owner.page.locator('[data-admin-status]').getByText(/Décision enregistrée.*Envoi confirmé/).waitFor();
   assert.equal(fixture.auth.sql("SELECT count(*) FROM auth.users WHERE email='browser-new-household@example.invalid';"),'1');
   results.push({scenario:'actual-console-invite-approval-delivery',status:'PASS',checkboxConfirmationRequired:true,deliveryConfirmed:true,admissionConsumed:false});
   await proof.view(owner,'admin-invite');await owner.page.locator('input[name=email]').fill('browser-uncertain@example.invalid');
   fixture.control.fault='delivery-record';
   await owner.page.getByRole('button',{name:'Préparer le récapitulatif',exact:true}).click();await confirmUI(owner.page);
   await owner.page.locator('[data-admin-status][data-error=true]').getByText(/Livraison.*incertaine.*aucun envoi confirmé/i).waitFor();
   captures.push(await proof.capture(owner,out,'delivery-uncertain'));fixture.control.fault=null;
   results.push({scenario:'actual-smtp-delivery-confirmation-lost',status:'PASS',realLocalSmtpAttempt:true,uncertaintyDisplayed:true,falseSuccess:false});

   // Requests pagination uses only real admission projections, with no family
   // JSON/credits. The 27 extra records have strictly fictional addresses.
   for(let index=0;index<27;index++)await proof.native(parent.page,'requestFamilyAccount',{email:`long-browser-${index}@example.invalid`,kind:'family-parent',memberId:null,operationId:randomUUID()});
   await proof.view(owner,'admin-requests');assert.ok(await owner.page.locator('[data-admin-request]').count()>0);
   const firstCount=await owner.page.locator('[data-admin-request]').count();
   await owner.page.locator('[data-admin-more=requests]').click();await owner.page.waitForFunction(count=>document.querySelectorAll('[data-admin-request]').length>count,firstCount);
   captures.push(await proof.capture(owner,out,'long-requests'));
   const projection=JSON.stringify(await command(owner.page,'listAccess',{limit:10}));assert.doesNotMatch(projection,/familyMembers|magicProfile|runeCredits|TEST_LEDGER/);
   results.push({scenario:'real-long-list-and-metadata-only-projection',status:'PASS',extraFictionalRequests:27,paginationGrowsList:true,projectionContainsFamilyPayload:false});
   console.log('LOT4_BROWSER_PHASE_PASS','long lists and metadata');

   // Explicit injected transport error must be displayed as an error and must
   // never render success or expose stale privileged records.
   fixture.control.fault='network';await proof.view(owner,'admin-access');
   await owner.page.locator('[data-admin-status]').getByText(/indisponible|confirm|connexion|réseau|impossible/i).waitFor();
   captures.push(await proof.capture(owner,out,'network-error'));fixture.control.fault=null;
   await proof.view(owner,'admin-access');

   // Same-household account switch + in-flight response guard + durable queue.
   const knownPassword='Browser!'+randomUUID()+'9a';
   const changed=await fixture.auth.requestAuth('/admin/users/'+id(2),{method:'PUT',headers:{authorization:'Bearer '+fixture.auth.serviceToken,'content-type':'application/json'},body:JSON.stringify({password:knownPassword})});assert.equal(changed.status,200);
   fixture.control.businessWritesOffline=true;
   await owner.page.evaluate(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.grocery.add({title:'DÉMO — Brouillon non synchronisé',quantity:2,unit:'L'}));
   await owner.page.waitForFunction(()=>/indisponible|réseau|erreur/i.test(DobbyFamilyStitchEngine.win().DobbyFamilyUI.grocery.read().error||''));
   const pendingBefore=await durableItems(owner.page);assert.ok(pendingBefore.some(row=>row.title==='DÉMO — Brouillon non synchronisé'&&row.syncState==='pending'));
   const originalPending=pendingBefore.find(row=>row.title==='DÉMO — Brouillon non synchronisé');
   const sibling=await owner.context.newPage();
   await sibling.goto(fixture.origin+'/fixture-1/essai-stitch-v7/famille.html#salon');await proof.ready(sibling);
   assert.equal(await sibling.evaluate(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.access.state().userId),id(1));
   fixture.control.delayMs=200;
   const inflight=owner.page.evaluate(()=>{const api=DobbyFamilyStitchEngine.win().DobbyFamilyUI;window.__lot4Inflight=api.access.admin('listAccess',{}).then(()=>({accepted:true}),()=>({accepted:false}));});await inflight;
   await sibling.evaluate(()=>{window.__lot4Inflight=DobbyFamilyStitchEngine.win().DobbyFamilyUI.access.admin('listAccess',{}).then(()=>({accepted:true}),()=>({accepted:false}));});
   await owner.page.evaluate(()=>DobbyAccess.logout());
   assert.equal(await owner.page.evaluate(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.access.state().verified),false);
   await sibling.waitForFunction(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.access.state().verified===false);
   assert.equal((await owner.page.evaluate(()=>window.__lot4Inflight)).accepted,false);
   assert.equal((await sibling.evaluate(()=>window.__lot4Inflight)).accepted,false,'A real storage event invalidates the other tab and rejects its late result');fixture.control.delayMs=0;
   const switched=await signInUI(owner,'fixture-2@example.invalid',knownPassword);assert.equal(switched.userId,id(2));assert.equal(switched.privateAccess.isOwner,false);
   assert.deepEqual((await durableItems(owner.page)).find(row=>row.id===originalPending.id),originalPending,'Account switch preserves the exact first account pending edits');
   assert.equal(await sibling.evaluate(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.access.state().verified),false,'Old tab stays invalid after another tab signs in');
   results.push({scenario:'T10-T11-account-switch-inflight-cache',status:'PASS',preservedExistingUUIDs:[id(1),id(2)],actualSharedStorageTabs:2,naturalStorageEvent:true,oldOwnerResultsRejected:true,unsyncedDurableDataPreserved:true});
   await sibling.close();
   await owner.page.evaluate(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.grocery.add({title:'DÉMO — Brouillon Parent B',quantity:1,unit:'L'}));
   await owner.page.waitForFunction(()=>/indisponible|réseau|erreur/i.test(DobbyFamilyStitchEngine.win().DobbyFamilyUI.grocery.read().error||''));

   // Owner suspends existing Parent B, then reactivates. An old session remains
   // blocked; only an explicit new GoTrue login restores verified identity.
   const admin=await proof.createPage(browser,fixture.origin,390);
   try{
    await proof.open(admin);await statusUI(admin,id(2),'suspended');
    await owner.page.evaluate(async()=>{try{await DobbyFamilyStitchEngine.win().DobbyFamilyUI.access.refresh();}catch{}});
    let suspended=await proof.native(owner.page,'state');assert.equal(suspended.verified,false);assert.equal(suspended.phase,'rejected');
    fixture.control.businessWritesOffline=false;
    assert.ok((await durableItems(owner.page)).some(row=>row.title==='DÉMO — Brouillon non synchronisé'));
    await owner.page.goto(fixture.origin+'/fixture-1/essai-stitch-v7/famille.html#settings');await proof.ready(owner.page,{verified:false});
    await owner.page.locator('[data-settings-sync][data-transmission-hold=true]').waitFor();
    assert.equal(await owner.page.getByRole('button',{name:'Reprendre les envois en attente',exact:true}).count(),0,'A revoked identity offers no blind queue resume');
    captures.push(await proof.capture(owner,out,'suspended-queue-preserved'));
    await statusUI(admin,id(2),'active');
    await owner.page.evaluate(async()=>{try{await DobbyFamilyStitchEngine.win().DobbyFamilyUI.access.refresh();}catch{}});assert.equal((await proof.native(owner.page,'state')).verified,false);
    const renewed=await signInUI(owner,'fixture-2@example.invalid',knownPassword);assert.equal(renewed.userId,id(2));assert.equal(renewed.verified,true);
    await owner.page.goto(fixture.origin+'/fixture-1/essai-stitch-v7/famille.html#settings');await proof.ready(owner.page);
    assert.equal(fixture.auth.sql("SELECT count(*) FROM public.dobby_v2_grocery WHERE title='DÉMO — Brouillon Parent B';"),'0','Fresh login does not automatically send a held queue');
    await owner.page.getByRole('button',{name:'Reprendre les envois en attente',exact:true}).click();
    await owner.page.waitForFunction(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.grocery.read().items.some(row=>row.title==='DÉMO — Brouillon Parent B'&&row.syncState==='clean'));
    assert.equal(fixture.auth.sql("SELECT count(*) FROM public.dobby_v2_grocery WHERE title='DÉMO — Brouillon Parent B';"),'1','Only explicit verified manual resume transmits the pending row');
    assert.deepEqual((await durableItems(owner.page)).find(row=>row.id===originalPending.id),originalPending,'Manual resume of Parent B does not send or change the former account pending edits');
    results.push({scenario:'T05-T11-suspend-reactivate-new-real-session',status:'PASS',oldSessionRemainsDenied:true,newSessionVerified:true,durableDataPreserved:true,noAutomaticQueuedTransmission:true,explicitVerifiedResumeConfirmed:true});
    proof.assertClean(admin);
   }finally{await closeContext(admin.context);}
   proof.assertClean(owner);proof.assertClean(parent);
  }finally{await closeContext(owner.context);await closeContext(parent.context);}
  const unapproved=await proof.createPage(browser,fixture.origin,320);
  try{
   await proof.open(unapproved,'access',4);await unapproved.page.getByText(/pas encore invité/).first().waitFor();
   await unapproved.page.evaluate(()=>DobbyFamilyStitch.open('access-auth',{mode:'signup'}));
   await unapproved.page.locator('form').waitFor();assert.equal(await unapproved.page.getByRole('button',{name:/Créer un compte|S’inscrire|S'inscrire/}).count(),0);
   assert.ok(await unapproved.page.getByRole('button',{name:/connexion|connecter/i}).count()>0);
   await unapproved.page.evaluate(()=>{window.DobbyReview={demoMemberId:'TEST_PARENT_A'};DobbyFamilyStitchEngine.evaluate('st.familyMembers=[{id:"TEST_PARENT_A",name:"DÉMO — Faux propriétaire local",memberCategory:"parent",role:"owner",isOwner:true}];');const forged=document.createElement('button');forged.dataset.adminEntry='';forged.textContent='Administration DOBBY';forged.onclick=()=>DobbyFamilyStitch.open('admin-access');document.body.append(forged);forged.click();forged.remove();});
   await unapproved.page.locator('main[data-admin-view=admin-access]').waitFor();assert.equal(await unapproved.page.locator('[data-admin-account]').count(),0);
   const anonymousDenied=await unapproved.page.evaluate(async()=>{const response=await fetch('/functions/v1/dobby-access-admin',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({command:'listAccess',payload:{}})});return response.status;});assert.equal(anonymousDenied,401);
   proof.assertClean(unapproved);
   results.push({scenario:'T12-unapproved-local-owner-forgery-public-signup-removed',status:'PASS',forgedSignupNormalizedToLogin:true,localOwnerButtonGrantsNoAccess:true,anonymousEdgeHTTP:401});
  }finally{await closeContext(unapproved.context);}
  const sourcesAfter=fingerprints();assert.deepEqual(sourcesAfter,sourcesBefore,'Browser proof requires an immutable source set throughout the complete run');
  const artifact={scope:'local fictional full V7 only',runtime:{node:process.version,chromium:browser.version(),playwrightInterception:false},sources:{unchangedDuringRun:true,sha256:sourcesAfter},fixture:fixture.info,results,captures:captures.map(row=>({...row,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,row.file))).digest('hex')})),network:{hostedRequests:0,journalEntries:fixture.journal.length,paths:[...new Set(fixture.journal.map(row=>row.path))].sort()},notEstablished:['hosted Auth/RLS session capability','pre-issued Storage signed bearer extinction','production child release','hosted deployment']};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(artifact,null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',scenarios:results.length,captures:captures.length,evidence:path.relative(root,out),hostedRequests:0},null,2));
 }finally{if(browserServer){const timer=setTimeout(()=>void browserServer.kill().catch(()=>{}),8000);timer.unref();try{if(browser)await browser.close().catch(()=>{});await browserServer.close().catch(()=>{});}finally{clearTimeout(timer);}}if(fixture)await fixture.close();}
})().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});

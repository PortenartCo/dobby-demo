/* Responsive companion: real complete V7 + owned local Lot 3 services.
 * Each state is created once, then resized. No Auth/Storage campaign replay. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {randomUUID,createHash}=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const proof=require('./browser-proof.cjs');
const root=path.resolve(__dirname,'../../..');
const out=process.env.DOBBY_LOT4_RESPONSIVE_EVIDENCE||path.join(root,'docs/dobby-v7/evidence/lot-4/responsive-states');
const widths=[320,390,768,1440];
const id=number=>`00000000-0000-4000-8000-${String(number).padStart(12,'0')}`;
const sourcePaths=['tests/private-access/lot4/responsive-states.cjs','tests/private-access/lot4/browser-proof.cjs','tests/private-access/lot4/preview-server.mjs','tests/private-access/lot4/preview-bootstrap.js','essai-stitch-v5-famille/family-v2.js','essai-stitch-v5-famille/family-access.mjs','essai-stitch-v5-famille/family-core.mjs','essai-stitch-v7/admin-access.js','essai-stitch-v7/admin-access.css','essai-stitch-v7/access.js','essai-stitch-v7/access.css','essai-stitch-v7/family.js','essai-stitch-v7/chrome.js','essai-stitch-v7/tools-register.js','essai-stitch-v7/famille.html','essai-stitch-v7/traverse.html','supabase/functions/_shared/dobby-admin-handler.ts'];
const fingerprints=()=>Object.fromEntries(sourcePaths.map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));

async function capture(current,name,{scrollBottom=false}={}){
 if(scrollBottom)await current.page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
 else await current.page.evaluate(()=>window.scrollTo(0,0));
 await current.page.evaluate(()=>document.fonts.ready);
 const geometry=await current.page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollY,header:document.querySelector('body>header[data-e01-chrome]')?.getBoundingClientRect().toJSON(),banner:document.querySelector('[data-lot4-fixture-banner]')?.getBoundingClientRect().toJSON(),dock:document.querySelector('body>nav[data-e01-chrome]')?.getBoundingClientRect().toJSON()}));
 assert.ok(geometry.scrollWidth<=geometry.width,'No horizontal overflow in '+name+' at '+current.width);
 assert.ok(geometry.header&&geometry.banner&&geometry.header.top>=geometry.banner.bottom,'Full V7 header is visible below fixture banner');
 assert.ok(geometry.dock&&geometry.dock.bottom<=geometry.height+1,'Permanent dock fits the viewport');
 assert.equal(await current.page.locator('[data-e01-destination]').count(),6,'Six permanent destinations');
 const file=name+'-'+current.width+'.png';
 await current.page.screenshot({path:path.join(out,file),fullPage:false});
 return {file,state:name,width:current.width,geometry};
}
async function matrix(current,state,verify,{scrollBottom=false}={}){
 const records=[];
 for(const width of widths){
  current.width=width;await current.page.setViewportSize({width,height:900});
  await verify(current.page,width);
  records.push(await capture(current,state,{scrollBottom}));
  console.log('LOT4_RESPONSIVE_PASS '+state+' '+width);
 }
 return records;
}

(async()=>{
 const {startLot4Preview}=await import(pathToFileURL(path.join(root,'tests/private-access/lot4/preview-server.mjs')).href);
 const before=fingerprints(),captures=[],results=[],revalidations=[];
 let fixture,browser,browserServer,current;
 fs.mkdirSync(out,{recursive:true});
 try{
  fixture=await startLot4Preview();
  browserServer=await chromium.launchServer({host:'127.0.0.1',executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  browser=await chromium.connect(browserServer.wsEndpoint());
  current=await proof.createPage(browser,fixture.origin,390);
  await proof.open(current);await proof.view(current,'admin-requests');

  captures.push(...await matrix(current,'empty-requests',async page=>{
   assert.equal(await page.locator('[data-admin-request]').count(),0,'Actual empty server list');
   assert.ok(await page.locator('[data-admin-empty]').count()>0);
  }));
  results.push({state:'empty-requests',widths,status:'PASS',actualServerProjection:true});

  // These requests create metadata only; no approval/Auth account/SMTP send.
  for(let index=0;index<27;index++){
   const response=await fixture.auth.requestRpc('dobby_access_request_family_account',{p_email:`responsive-${String(index).padStart(3,'0')}@example.invalid`,p_kind:'family-parent',p_member_id:null,p_operation_id:randomUUID()},fixture.parent.access_token);
   assert.equal(response.status,200,'Seed a real fictional nominative request');
  }
  await proof.view(current,'admin-requests');
  assert.equal(await current.page.locator('[data-admin-request]').count(),25);
  await current.page.locator('[data-admin-more=requests]').click();
  await current.page.waitForFunction(()=>document.querySelectorAll('[data-admin-request]').length===27);
  captures.push(...await matrix(current,'long-requests',async page=>{
   assert.equal(await page.locator('[data-admin-request]').count(),27);
   assert.equal(await page.locator('[data-admin-more=requests]').count(),0,'Real final page reached');
  }));
  captures.push(...await matrix(current,'long-requests-bottom',async page=>{
   const last=page.locator('[data-admin-request]').last();await last.scrollIntoViewIfNeeded();
   assert.equal(await last.isVisible(),true,'Last record remains reachable');
  },{scrollBottom:true}));
  results.push({state:'long-requests',widths,status:'PASS',actualRequests:27,paginationReachedEnd:true,lastRecordReachable:true});

  await current.page.locator('[data-admin-request]').first().getByRole('button',{name:'Approuver',exact:true}).click();
  await current.page.locator('[data-admin-confirmation]').waitFor();
  captures.push(...await matrix(current,'confirmation',async(page,width)=>{
   const dialog=page.locator('[data-admin-confirmation]'),confirm=dialog.locator('[data-admin-confirm]');
   assert.equal(await confirm.isDisabled(),true,'Confirmation remains mandatory at '+width);
   const bounds=await dialog.boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=901,'Confirmation fits viewport');
   await dialog.locator('input[name=confirmed]').check();await confirm.click({trial:true});
   await dialog.locator('input[name=confirmed]').uncheck();
   await dialog.getByRole('button',{name:'Annuler',exact:true}).click({trial:true});
  }));
  await current.page.locator('[data-admin-confirmation]').getByRole('button',{name:'Annuler',exact:true}).click();
  results.push({state:'confirmation',widths,status:'PASS',mandatoryCheckbox:true,cancelReachable:true,mutationSubmitted:false});

  fixture.control.fault='network';await proof.view(current,'admin-access');
  captures.push(...await matrix(current,'network-error',async page=>{
   assert.equal(await page.locator('[data-admin-account]').count(),0,'No stale owner data after transport refusal');
   assert.match(await page.locator('main').innerText(),/indisponible|confirm|connexion|réseau/i);
  }));
  fixture.control.fault=null;
  results.push({state:'network-error',widths,status:'PASS',controlledHTTP503:true,stalePrivilegedRows:0});

  // One real UI account switch, then layout checks of the resulting owner denial.
  await proof.view(current,'admin-access');
  const password='Responsive!'+randomUUID()+'9a';
  const changed=await fixture.auth.requestAuth('/admin/users/'+id(2),{method:'PUT',headers:{authorization:'Bearer '+fixture.auth.serviceToken,'content-type':'application/json'},body:JSON.stringify({password})});
  assert.equal(changed.status,200);
  await current.page.evaluate(()=>DobbyAccess.logout());
  await current.page.evaluate(()=>DobbyFamilyStitch.open('access-auth',{mode:'login'}));
  await current.page.locator('main input[name=email]').fill('fixture-2@example.invalid');
  await current.page.locator('main input[name=password]').fill(password);
  await current.page.getByRole('button',{name:'Se connecter',exact:true}).click();
  await current.page.waitForURL(url=>!url.hash.startsWith('#access-auth'),{waitUntil:'domcontentloaded'});await proof.ready(current.page);
  const switched=await proof.native(current.page,'state');assert.equal(switched.userId,id(2));assert.equal(switched.privateAccess.isOwner,false);
  if(!new URL(current.page.url()).pathname.endsWith('/famille.html')){
   await current.page.goto(fixture.origin+'/fixture-1/essai-stitch-v7/famille.html#salon');await proof.ready(current.page);
  }
  const switchedEpoch=await current.page.evaluate(()=>DobbyFamilyStitchEngine.win().DobbyFamilyUI.connectionState().epoch);
  await proof.view(current,'admin-access');
  captures.push(...await matrix(current,'account-switch-owner-denied',async(page,width)=>{
   assert.equal(await page.locator('[data-admin-account],[data-admin-entry]').count(),0);
   assert.match(await page.locator('main').innerText(),/propriétaire.*pas.*confirmé|propriétaire.*confirm|indisponible/i);
   const observed=await page.evaluate(()=>{const api=DobbyFamilyStitchEngine.win().DobbyFamilyUI,state=api.access.state(),native=api.connectionState();return{userId:state.userId,phase:state.phase,verified:state.verified,status:state.privateAccess?.status||null,epoch:native.epoch,verifying:native.verifying};});
   assert.equal(observed.userId,id(2));
   assert.equal(observed.epoch,switchedEpoch,'Owner refusal does not revoke the ordinary Auth session');
   assert.notEqual(observed.phase,'rejected');assert.notEqual(observed.status,'suspended');
   if(!observed.verified){revalidations.push({width,observed});console.log('LOT4_RESPONSIVE_REVALIDATION '+JSON.stringify({width,...observed}));}
   // Periodic family verification may temporarily withdraw the binding. It
   // must settle without another login; a real denial cannot satisfy this.
   await page.waitForFunction(expected=>{const api=DobbyFamilyStitchEngine.win().DobbyFamilyUI,state=api.access.state(),native=api.connectionState();return state.userId===expected.userId&&native.epoch===expected.epoch&&state.phase==='active'&&state.privateAccess?.status==='active'&&state.verified===true&&!native.verifying;},{userId:id(2),epoch:switchedEpoch});
   const state=await proof.native(page,'state');assert.equal(state.userId,id(2));assert.equal(state.privateAccess.status,'active');assert.equal(state.verified,true,'Normal Parent identity survives owner denial');
  }));
  results.push({state:'account-switch-owner-denied',widths,status:'PASS',realPasswordUiLogin:true,formerOwnerRows:0,normalParentIdentityPreserved:true});

  proof.assertClean(current);
  const after=fingerprints();assert.deepEqual(after,before,'Responsive proof requires immutable product and fixture sources');
  const artifact={scope:'responsive states on actual full V7 with real local Auth/PostgREST/Edge; no hosted contact',runtime:{node:process.version,chromium:browser.version(),playwrightInterception:false},widths,results,revalidations,sources:{unchangedDuringRun:true,sha256:after},captures:captures.map(item=>({...item,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,item.file))).digest('hex')})),network:{hostedRequests:0},notRepeated:['SMTP/admission consumption','deep two-tab security proof','suspension/reactivation campaign','Storage campaign']};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(artifact,null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',states:results.length,widths,captures:captures.length,hostedRequests:0}));
 }finally{
  if(browserServer){const timer=setTimeout(()=>void browserServer.kill().catch(()=>{}),8000);timer.unref();try{if(browser)await browser.close().catch(()=>{});await browserServer.close().catch(()=>{});}finally{clearTimeout(timer);}}
  if(fixture)await fixture.close();
 }
})().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});

/* Targeted layout comparison on the real complete V7 and disposable local
 * services. Run once at the reviewed base, then press Enter after the CSS
 * correction is ready. Only the baseline CSS asset is replayed; no API
 * interception or mutation confirmation is used. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const readline=require('node:readline');
const {once}=require('node:events');
const {pathToFileURL}=require('node:url');
const {createHash}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const proof=require('./browser-proof.cjs');
const root=path.resolve(__dirname,'../../..');
const out=process.env.DOBBY_LOT4_FINISH_EVIDENCE||path.join(root,'docs/dobby-v7/evidence/lot-4/responsive-finish');
const widths=[320,390,768,1440];
const sourcePaths=['essai-stitch-v7/admin-access.css','essai-stitch-v7/admin-access.js','essai-stitch-v7/chrome.css','essai-stitch-v7/chrome.js','essai-stitch-v7/consolidation.css','essai-stitch-v7/responsive.css','essai-stitch-v7/famille.html','tests/private-access/lot4/responsive-finish.cjs','tests/private-access/lot4/browser-proof.cjs','tests/private-access/lot4/preview-server.mjs','tests/private-access/lot4/preview-bootstrap.js','essai-stitch-v5-famille/family-v2.js','essai-stitch-v5-famille/family-access.mjs','supabase/functions/_shared/dobby-admin-handler.ts'];
const fingerprint=bytes=>createHash('sha256').update(bytes).digest('hex');
const snapshot=()=>Object.fromEntries(sourcePaths.map(file=>[file,fs.readFileSync(path.join(root,file))]));
const hashes=source=>Object.fromEntries(Object.entries(source).map(([file,bytes])=>[file,fingerprint(bytes)]));
const write=(file,value)=>fs.writeFileSync(path.join(out,file),JSON.stringify(value,null,2)+'\n');
const baseSha='2efb3c8d5417a1bca750993838520019b2ff82eb';
const cssPath='essai-stitch-v7/admin-access.css';
const baselineCss=execFileSync('git',['show',baseSha+':'+cssPath],{cwd:root});

async function geometry(page){
 return page.evaluate(()=>{
  const bounds=node=>node?node.getBoundingClientRect().toJSON():null;
  const main=document.querySelector('main.admin-main'),subtitle=document.querySelector('[data-e01-subtitle]'),section=subtitle?.querySelector('.e011-band-section');
  const first=main.querySelector('[data-admin-account],[data-admin-request],[data-admin-decision],.admin-field,[data-admin-empty]');
  const mainStyle=getComputedStyle(main);
  const tabs=[...main.querySelectorAll('[data-admin-tab]')];
  const lastRequest=main.querySelector('[data-admin-request]:last-of-type');
  return {width:innerWidth,layoutWidth:document.documentElement.clientWidth,visualWidth:visualViewport.width,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollY,bodyView:document.body.dataset.familyView,
   body:bounds(document.body),main:bounds(main),mainMaxWidth:mainStyle.maxWidth,mainGrid:mainStyle.gridTemplateColumns,hero:bounds(main.querySelector('.admin-hero')),nav:bounds(main.querySelector('.admin-tabs')),
   tabs:tabs.map(node=>({label:node.textContent,bounds:bounds(node),scrollWidth:node.scrollWidth,clientWidth:node.clientWidth})),
   business:bounds(first),businessSelector:first?.hasAttribute('data-admin-account')?'account':first?.hasAttribute('data-admin-request')?'request':first?.hasAttribute('data-admin-decision')?'decision':first?.classList.contains('admin-field')?'field':'empty',
   header:bounds(document.querySelector('body>header[data-e01-chrome]')),banner:bounds(document.querySelector('[data-lot4-fixture-banner]')),
   dock:bounds(document.querySelector('body>nav[data-e01-chrome]')),subtitle:subtitle?{text:subtitle.textContent,bounds:bounds(subtitle),clientWidth:subtitle.clientWidth,scrollWidth:subtitle.scrollWidth,clientHeight:subtitle.clientHeight,scrollHeight:subtitle.scrollHeight,section:bounds(section),sectionText:section?.textContent,sectionClientWidth:section?.clientWidth,sectionScrollWidth:section?.scrollWidth,sectionClientHeight:section?.clientHeight,sectionScrollHeight:section?.scrollHeight}:null,
   accountCount:main.querySelectorAll('[data-admin-account]').length,requestCount:main.querySelectorAll('[data-admin-request]').length,decisionCount:main.querySelectorAll('[data-admin-decision]').length,
   firstCards:[...main.querySelectorAll('.admin-section>.admin-card')].slice(0,3).map(bounds),lastRequest:bounds(lastRequest),lastRequestControl:bounds(lastRequest?.querySelector('.admin-actions')?.lastElementChild),
   dialog:bounds(document.querySelector('[data-admin-confirmation]'))};
 });
}
async function capture(current,phase,state,{bottom=false,dialog=false}={}){
 const page=current.page;
 if(!dialog)await page.evaluate(bottom=>scrollTo(0,bottom?document.documentElement.scrollHeight:0),bottom);
 await page.evaluate(()=>document.fonts.ready);
 const value=await geometry(page);
 assert.ok(value.scrollWidth<=value.width,'No horizontal overflow: '+phase+'/'+state+'/'+current.width);
 assert.ok(value.header.top>=value.banner.bottom,'Shared header below explicit fictional banner');
 assert.equal(await page.locator('[data-e01-destination]').count(),6,'Six shared dock destinations');
 assert.equal(value.tabs.length,5,'Five visible administrative destinations');
 assert.ok(value.tabs.every(tab=>tab.bounds.width>0&&tab.scrollWidth<=tab.clientWidth),'Navigation labels remain visible');
 if(phase==='after'&&!bottom&&!dialog){
  assert.ok(value.business&&value.business.top+Math.min(72,value.business.height)<value.dock.top,'Useful data appears above the fixed dock: '+state+'/'+current.width);
  assert.ok(value.nav.top>=value.header.bottom&&value.nav.bottom<=value.dock.top,'All five destinations fit between header and dock');
  if(current.width>=768)assert.ok(value.main.width>480,'Console uses tablet/desktop width: '+JSON.stringify({state,width:current.width,main:value.main,body:value.body,bodyView:value.bodyView,maxWidth:value.mainMaxWidth}));
  if(current.width===1440&&value.accountCount>1&&state==='access')assert.ok(value.firstCards[0].y===value.firstCards[1].y,'Desktop account cards share a row');
  if(current.width===320){
   assert.ok(value.subtitle.clientHeight>=value.subtitle.scrollHeight,'Shared subtitle has no vertical clipping');
   assert.ok(value.subtitle.clientWidth>=value.subtitle.scrollWidth,'Shared subtitle has no horizontal clipping');
   assert.ok(value.subtitle.sectionClientHeight>=value.subtitle.sectionScrollHeight,'Section name has no vertical clipping');
   assert.ok(value.subtitle.sectionClientWidth>=value.subtitle.sectionScrollWidth,'Section name has no horizontal clipping');
   assert.ok(value.subtitle.section.bottom<=value.header.bottom,'Complete subtitle stays inside the shared header');
  }
 }
 if(bottom){
  assert.ok(value.lastRequest&&value.lastRequest.bottom<=value.dock.top,'Last request remains above the dock after scrolling');
  assert.ok(value.lastRequestControl&&value.lastRequestControl.top>=value.header.bottom&&value.lastRequestControl.bottom<=value.dock.top,'Last request action stays reachable between the shared bars');
 }
 if(dialog){
  const box=value.dialog;
  assert.ok(box.x>=0&&box.y>=0&&box.right<=current.width+1&&box.bottom<=901,'Confirmation fits viewport');
 }
 const file=phase+'/'+state+'-'+current.width+'.png';
 await page.screenshot({path:path.join(out,file),fullPage:false});
 return {file,state,width:current.width,sha256:fingerprint(fs.readFileSync(path.join(out,file))),geometry:value};
}
async function matrix(current,phase,state,verify=async()=>{},options={}){
 const records=[];
 for(const width of widths){
  current.width=width;await current.page.setViewportSize({width,height:900});
  // The viewport protocol acknowledgement can precede the renderer's next
  // layout, especially on the full 27-card page. Measure the settled layout.
  await current.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await current.page.waitForFunction(expected=>innerWidth===expected&&document.documentElement.clientWidth===expected,width);
  await verify(current.page,width);records.push(await capture(current,phase,state,options));
  console.log('LOT4_FINISH_CAPTURE '+phase+' '+state+' '+width);
 }
 return records;
}
async function phase(browser,fixture,name){
 fs.mkdirSync(path.join(out,name),{recursive:true});
 const servedHashes=()=>{const result=hashes(snapshot());if(name==='before')result[cssPath]=fingerprint(baselineCss);return result;};
 const start=servedHashes(),current=await proof.createPage(browser,fixture.origin,390),captures=[];
 try{
  // A single exact base asset may be replayed while the editor updates CSS.
  // Every page, script and Auth/PostgREST/Edge HTTP exchange stays real.
  if(name==='before')await current.context.route('**/admin-access.css',route=>route.fulfill({status:200,contentType:'text/css; charset=utf-8',body:baselineCss}));
  await proof.open(current,'admin-access');
  await current.page.waitForFunction(()=>document.querySelectorAll('[data-admin-account]').length>1&&!document.querySelector('[data-admin-loading]'));
  captures.push(...await matrix(current,name,'access'));
  await proof.view(current,'admin-invite');captures.push(...await matrix(current,name,'invite'));
  await proof.view(current,'admin-requests');
  assert.equal(await current.page.locator('[data-admin-request]').count(),25,'Real paginated first page');
  captures.push(...await matrix(current,name,'requests'));
  await current.page.locator('[data-admin-more=requests]').click();
  await current.page.waitForFunction(()=>document.querySelectorAll('[data-admin-request]').length===27);
  captures.push(...await matrix(current,name,'long-requests',async page=>assert.equal(await page.locator('[data-admin-request]').count(),27)));
  captures.push(...await matrix(current,name,'long-requests-bottom',async page=>{
   const last=page.locator('[data-admin-request]').last();await last.scrollIntoViewIfNeeded();assert.ok(await last.isVisible());
  },{bottom:true}));
  await current.page.evaluate(()=>scrollTo(0,0));
  await current.page.locator('[data-admin-request]').first().getByRole('button',{name:'Approuver',exact:true}).click();
  await current.page.locator('[data-admin-confirmation]').waitFor();
  captures.push(...await matrix(current,name,'confirmation',async page=>{
   const dialog=page.locator('[data-admin-confirmation]'),confirm=dialog.locator('[data-admin-confirm]');
   assert.ok(await confirm.isDisabled(),'Explicit mandatory confirmation remains');
   await dialog.locator('input[name=confirmed]').check();await confirm.click({trial:true});await dialog.locator('input[name=confirmed]').uncheck();
   await dialog.getByRole('button',{name:'Annuler',exact:true}).click({trial:true});
  },{dialog:true}));
  await current.page.locator('[data-admin-confirmation]').getByRole('button',{name:'Annuler',exact:true}).click();
  await current.page.locator('[data-admin-confirmation]').waitFor({state:'detached'});
  await proof.view(current,'admin-history');
  assert.ok(await current.page.locator('[data-admin-decision]').count()>1,'Real server journal projection includes fictitious test records');
  captures.push(...await matrix(current,name,'history'));
  proof.assertClean(current);
  assert.deepEqual(servedHashes(),start,'Served sources stay immutable during each capture phase');
  const result={phase:name,sources:start,captures,hostedRequests:0,pageErrors:current.errors,requests:current.requests.length,actualLocalHttp:true,apiInterception:false,staticAssetReplay:name==='before'?{file:cssPath,gitSha:baseSha,sha256:fingerprint(baselineCss)}:null};
  write(name+'.json',result);return result;
 }finally{await current.context.close();}
}

(async()=>{
 fs.mkdirSync(out,{recursive:true});
 let fixture,browser,browserServer;
 const input=readline.createInterface({input:process.stdin,output:process.stdout,terminal:false});
 try{
  const {startLot4Preview}=await import(pathToFileURL(path.join(root,'tests/private-access/lot4/preview-server.mjs')).href);
  fixture=await startLot4Preview({longRequests:27});
  // Disposable fictional journal data only: no account, authorization, child
  // gate, admission transition, SMTP or application cache is changed here.
  fixture.auth.sql(`INSERT INTO dobby_access_private.decisions(id,actor_user_id,target_user_id,action,operation_id,request_digest,decided_at)
   SELECT ('00000000-0000-4000-8000-'||lpad((9100+i)::text,12,'0'))::uuid,
    '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','reject',
    ('00000000-0000-4000-8000-'||lpad((9200+i)::text,12,'0'))::uuid,decode(repeat('ab',32),'hex'),'2026-11-19 09:00:00+00'::timestamptz+i*interval '1 minute'
   FROM generate_series(1,3) i;`);
  browserServer=await chromium.launchServer({host:'127.0.0.1',executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  browser=await chromium.connect(browserServer.wsEndpoint());
  const before=await phase(browser,fixture,'before');
  console.log('LOT4_FINISH_BASELINE_READY Press Enter only after the responsive correction is ready.');
  await once(input,'line');
  const after=await phase(browser,fixture,'after');
  const comparisons=after.captures.map(item=>{
   const previous=before.captures.find(record=>record.state===item.state&&record.width===item.width);
   return {state:item.state,width:item.width,before:previous.file,after:item.file,
    heroHeight:{before:previous.geometry.hero.height,after:item.geometry.hero.height},
    navHeight:{before:previous.geometry.nav.height,after:item.geometry.nav.height},
    businessTop:{before:previous.geometry.business?.top,after:item.geometry.business?.top},
    consoleWidth:{before:previous.geometry.main.width,after:item.geometry.main.width},
    dockTop:item.geometry.dock.top};
  });
  write('results.json',{status:'PASS',scope:'Targeted responsive finish; real full V7 and real owned local Auth/PostgREST/Edge; no hosted service',widths,viewportHeight:900,runtime:{node:process.version,chromium:browser.version()},before:{file:'before.json',sources:before.sources},after:{file:'after.json',sources:after.sources},comparisons,captures:before.captures.length+after.captures.length,hostedRequests:0,mutationSubmitted:false,fixture:{fictitiousRequests:27,fictitiousJournalRowsAdded:3},notRepeated:['Auth security campaign','Storage campaign','SMTP/admission campaign','SQL migration/rollback campaign']});
  console.log('LOT4_FINISH_PASS '+JSON.stringify({comparisons:comparisons.length,captures:before.captures.length+after.captures.length,hostedRequests:0,mutationSubmitted:false}));
 }finally{
  input.close();
  if(browserServer){const timer=setTimeout(()=>void browserServer.kill().catch(()=>{}),8000);timer.unref();try{if(browser)await browser.close().catch(()=>{});await browserServer.close().catch(()=>{});}finally{clearTimeout(timer);}}
  if(fixture)await fixture.close();
 }
})().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});

// Physical Chromium contexts + real pinned GoTrue/PostgREST/SMTP. The small
// local HTML fixture loads the shipped callback parser/controller/core. It is
// not an application page, a mock Auth service, or a Lot 4 administration UI.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {chromium} from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {startAuth,stopAuth} from './local-auth.mjs';
import {businessCatalog,installAdministration} from './business-catalog.mjs';
import {createAdminHandler} from '../../../supabase/functions/_shared/dobby-admin-handler.ts';

const root=new URL('../../../',import.meta.url);
const files=new Map([
 ['/access-entry.js','essai-stitch-v7/access-entry.js'],
 ['/family-access.mjs','essai-stitch-v5-famille/family-access.mjs'],
 ['/family-core.mjs','essai-stitch-v5-famille/family-core.mjs'],
 ['/family-mission-intents.mjs','essai-stitch-v5-famille/family-mission-intents.mjs'],
 ['/family-runes-core.mjs','essai-stitch-v5-famille/family-runes-core.mjs'],
]);
const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><script src="/access-entry.js"></script></head><body>
<button id="confirm" disabled>Accepter le lien reçu</button><button id="accept" disabled>Confirmer mon admission</button><output id="status">loading</output>
<script type="module">
import {createFamilyAccess} from '/family-access.mjs';
import {assertAdmissionRPC} from '/family-core.mjs';
const incoming=window.DobbyAccessEntry.consume(),native={ready:true,configured:true,userId:null,householdId:null,epoch:0,verified:false};
const metadata=new Map(JSON.parse(localStorage.getItem('fictional-callback-metadata')||'[]'));let session=null,bounded=null;
const persistMetadata=()=>localStorage.setItem('fictional-callback-metadata',JSON.stringify([...metadata]));
window.callbackCalls=[];
async function request(path,body,authenticated=false){
 window.callbackCalls.push(path);
 const response=await fetch(path,{method:'POST',headers:{'content-type':'application/json',...(authenticated?{authorization:'Bearer '+session.access_token}:{})},body:JSON.stringify(body)});
 if(!response.ok){const body=await response.json().catch(()=>({}));window.lastServiceFailure={path,status:response.status,code:typeof body.code==='string'&&/^(?:[A-Z0-9]{5,12})$/.test(body.code)?body.code:null};throw Error('Local service refused operation: '+response.status);}
 return response.json();
}
const driver={crypto:window.crypto,now:Date.now,snapshot:()=>({...native}),meta:async key=>metadata.get(key)??null,putMeta:async(key,value)=>{metadata.set(key,value);persistMetadata();},delMeta:async key=>{metadata.delete(key);persistMetadata();},updateMeta:async(key,change)=>{metadata.set(key,change(metadata.get(key)??null));persistMetadata();},
 auth:(path,method,body)=>request(path,body),
 rpc:(name,body,options={})=>{
  if(bounded){if(options.admission!==true)throw Error('Family access before admission');assertAdmissionRPC({name,body,admissionId:bounded});}
  return request('/rest/v1/rpc/'+name,body,true);
 },
 installSession:async(result,before,options={})=>{if(before.epoch!==native.epoch||before.userId!==native.userId)throw Error('Actor changed');session=result;native.userId=result.user.id;native.epoch++;bounded=options.admissionId??null;},
 clearBinding:()=>{native.verified=false;native.householdId=null;},
 bind:async context=>{native.householdId=context.householdId;native.verified=true;window.adoptedIdentity={userId:context.userId,householdId:context.householdId,memberId:context.memberId};},
 completeAdmission:async(before,id)=>{if(before.epoch!==native.epoch||id!==bounded)throw Error('Admission changed');bounded=null;},
 logout:async()=>{session=null;bounded=null;native.userId=null;native.epoch++;},notify:()=>{},
};
window.access=createFamilyAccess(driver);
window.harnessInfo=()=>({state:access.state(),metadataKeys:[...metadata.keys()],bounded:Boolean(bounded),hasSession:Boolean(session)});
const status=document.querySelector('#status'),confirm=document.querySelector('#confirm'),accept=document.querySelector('#accept');
const show=()=>{status.textContent=access.state().phase;confirm.disabled=access.state().phase!=='admission-confirmation';accept.disabled=access.state().phase!=='admission';};
confirm.onclick=async()=>{confirm.disabled=true;try{await access.confirmAdmission();show();}catch(error){window.lastControllerFailure={stage:'confirmation',message:error.message};status.textContent='confirmation-error';}};
accept.onclick=async()=>{accept.disabled=true;try{await access.admit({profile:{firstName:'TEST Browser',lastName:'Recipient',avatarId:'portrait-1'}});show();}catch(error){window.lastControllerFailure={stage:'acceptance',message:error.message};status.textContent='acceptance-error';}};
try{if(incoming?.callbackURL)await access.confirmFromURL(incoming.callbackURL);show();window.harnessReady=true;}catch{status.textContent='callback-error';window.harnessReady=true;}
</script></body></html>`;

async function localHarness(auth){
 let admin,origin;const requests=[];
 const server=createServer(async(incoming,outgoing)=>{
  try{
   const target=new URL(incoming.url,origin??'http://127.0.0.1');
   // Retain only request paths, never callback bearers, JWTs or mail bodies.
   requests.push(target.pathname);
   if(target.pathname==='/callback'||target.pathname==='/owner'){
    outgoing.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer'});outgoing.end(html);return;
   }
   if(files.has(target.pathname)){
    outgoing.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'});outgoing.end(readFileSync(new URL(files.get(target.pathname),root)));return;
   }
   if(target.pathname.startsWith('/auth/v1/')||target.pathname.startsWith('/rest/v1/')||target.pathname==='/admin'){
    const chunks=[];for await(const chunk of incoming)chunks.push(chunk);const body=Buffer.concat(chunks);
    const headers=new Headers();for(const[key,value]of Object.entries(incoming.headers))if(!['host','connection','content-length'].includes(key))headers.set(key,String(value));
    const response=target.pathname==='/admin'
     ?await admin(new Request(target.href,{method:incoming.method,headers,body}))
     :await fetch(new URL(target.pathname+target.search,auth.url),{method:incoming.method,headers,body:body.length?body:undefined,redirect:'manual'});
    outgoing.writeHead(response.status,Object.fromEntries([...response.headers].filter(([key])=>!['content-length','transfer-encoding','connection','content-encoding'].includes(key))));outgoing.end(Buffer.from(await response.arrayBuffer()));return;
   }
   outgoing.writeHead(404);outgoing.end();
  }catch{outgoing.writeHead(500,{'content-type':'text/plain'});outgoing.end('Local callback fixture failed');}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});origin=`http://127.0.0.1:${server.address().port}`;
 admin=createAdminHandler({supabaseUrl:auth.url,anonKey:auth.anonToken,serviceRoleKey:auth.serviceToken,allowedOrigins:[origin],redirectTo:origin+'/callback'});
 return{origin,requests,async close(){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
async function installBrowserCatalog(auth){
 await businessCatalog(auth);
 await installAdministration(auth);
 auth.reloadRest();
 const owner=await auth.getLogin(1),deadline=Date.now()+5000;
 while(Date.now()<deadline){const response=await auth.requestRpc('dobby_access_context',{},owner.access_token);if(response.ok&&Object.hasOwn(await response.json(),'admission'))return owner;await new Promise(resolve=>setTimeout(resolve,50));}
 throw Error('PostgREST did not expose local administration schema');
}
async function browserJson(page,path,body,token){
 return page.evaluate(async({path,body,token})=>{const response=await fetch(path,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify(body)});return{status:response.status,body:await response.json()};},{path,body,token});
}
function mailCallback(message,origin){
 const html=String(message.HTML??message.Html??''),plain=String(message.Text??'');
 const links=[...html.matchAll(/href="([^"]+)"/g)].map(match=>match[1].replaceAll('&amp;','&'));
 links.push(...(plain.match(/http:\/\/127\.0\.0\.1:[^\s<>]+/g)??[]));
 const link=links.find(value=>{try{const url=new URL(value);return url.origin===origin&&url.pathname==='/callback'&&url.searchParams.has('token_hash');}catch{return false;}});
 assert.ok(link,'Actual SMTP message must include the trusted hash callback');return link;
}

test('actual GoTrue links require explicit confirmation in a separate isolated Chromium context',async t=>{
 assert.ok(existsSync('/usr/bin/chromium'),'A physical local Chromium is required');
 const auth=await startAuth();let browser,harness;
 t.after(async()=>{if(browser)await browser.close();if(harness)await harness.close();await stopAuth();});
 const owner=await installBrowserCatalog(auth);harness=await localHarness(auth);
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const originator=await browser.newContext(),ownerPage=await originator.newPage();
 await ownerPage.goto(harness.origin+'/owner');await ownerPage.waitForFunction(()=>window.harnessReady);
 await ownerPage.evaluate(()=>sessionStorage.setItem('fixture-originator','first-browser-only'));
 const newEmail=`browser-${randomUUID()}@example.invalid`;
 const requested=await browserJson(ownerPage,'/rest/v1/rpc/dobby_access_request_family_account',{p_email:newEmail,p_kind:'family-parent',p_member_id:null,p_operation_id:randomUUID()},owner.access_token);
 assert.equal(requested.status,200,'Real Parent creates only a nominative request');
 const delivered=await browserJson(ownerPage,'/admin',{command:'decide',payload:{admissionId:requested.body.admission.id,decision:'approve',expectedRevision:requested.body.admission.revision,operationId:randomUUID()}},owner.access_token);
 assert.equal(delivered.status,200,'Real owner approval and Auth delivery must succeed');assert.equal(delivered.body.result.delivery.outcome,'sent');
 const firstLink=mailCallback(await auth.inbox.waitFor(newEmail),harness.origin);
 const proofs=[];
 for(const[scenario,email,link,expectedPhase]of [['new-auth-family-parent',newEmail,firstLink,'active'],['existing-auth-magiclink',auth.seedUsers[4].email,null,'household']]){
  let callback=link;
  if(!callback){
   const result=await browserJson(ownerPage,'/admin',{command:'invite',payload:{email,purpose:'new-household',operationId:randomUUID()}},owner.access_token);
   assert.equal(result.status,200);assert.equal(result.body.result.delivery.outcome,'sent');callback=mailCallback(await auth.inbox.waitFor(email),harness.origin);
  }
  const recipient=await browser.newContext(),page=await recipient.newPage(),network=[];
  page.on('request',request=>{const target=new URL(request.url());network.push({path:target.pathname,referrerHasBearer:/token_hash=|access_token=|refresh_token=/.test(request.headers().referer??'')});});
  // Do not leak bearer URLs in a Playwright navigation diagnostic.
  try{await page.goto(callback);await page.waitForFunction(()=>window.harnessReady);}catch{throw Error('Physical callback browser did not initialize');}
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('fixture-originator')),null,'Second context has no originator browser storage');
  assert.equal(await page.locator('#status').textContent(),'admission-confirmation');
  assert.equal(new URL(page.url()).search,'');assert.equal(new URL(page.url()).hash,'#access');
  const before=await page.evaluate(()=>({calls:window.callbackCalls,info:window.harnessInfo(),storage:JSON.stringify({...localStorage,...sessionStorage})}));
  assert.deepEqual(before.calls,[],'Page initialization must not consume an Auth link or read family context');assert.equal(before.info.hasSession,false);assert.deepEqual(before.info.metadataKeys,[]);
  assert.doesNotMatch(before.storage,/token_hash|code_verifier|access_token|refresh_token/);
  assert.equal(network.some(request=>request.referrerHasBearer),false,'Assets must not retain callback secrets in their referrer');
  assert.equal(network.some(request=>request.path==='/auth/v1/verify'),false);
  await page.locator('#confirm').click();await page.waitForFunction(()=>['admission','confirmation-error'].includes(document.querySelector('#status').textContent));
  assert.equal(await page.locator('#status').textContent(),'admission',JSON.stringify(await page.evaluate(()=>({service:window.lastServiceFailure,controller:window.lastControllerFailure}))));
  const staged=await page.evaluate(()=>({calls:window.callbackCalls,info:window.harnessInfo()}));
  assert.deepEqual(staged.calls,['/auth/v1/verify','/rest/v1/rpc/dobby_access_context']);assert.equal(staged.info.bounded,true);assert.equal(staged.info.state.verified,false);assert.equal(staged.info.state.memberId,null);
  assert.equal(staged.info.state.admission.id,new URL(callback).searchParams.get('admission_id'));
  assert.equal(auth.sql(`SELECT count(*) FROM dobby_access_private.admissions WHERE id='${staged.info.state.admission.id}' AND state='accepted';`),'0','Auth confirmation alone grants no DB authorization');
  let ordinaryPasswordResume=false;
  if(scenario==='new-auth-family-parent'){
   // Only this newly created fictional recipient receives a test password.
   // No password or elevated token crosses into the page source or logs.
   const password='Browser!'+randomUUID()+'9a';
   const passwordResponse=await auth.requestAuth('/admin/users/'+staged.info.state.userId,{method:'PUT',headers:{authorization:'Bearer '+auth.serviceToken,'content-type':'application/json'},body:JSON.stringify({password})});
   assert.equal(passwordResponse.status,200);
   await page.reload();await page.waitForFunction(()=>window.harnessReady);
   const reloaded=await page.evaluate(()=>window.harnessInfo());assert.equal(reloaded.hasSession,false);assert.equal(reloaded.state.authenticated,false);
   assert.equal(reloaded.metadataKeys.includes('v7-admission-resume'),true);
   const resumed=await page.evaluate(async({email,password,admissionId})=>{const state=await window.access.signIn(email,password,{admissionId});document.querySelector('#status').textContent=state.phase;document.querySelector('#accept').disabled=false;return state;},{email,password,admissionId:staged.info.state.admission.id});
   assert.equal(resumed.phase,'admission');assert.equal(resumed.verified,false);
   assert.deepEqual(await page.evaluate(()=>window.callbackCalls),['/auth/v1/token?grant_type=password','/rest/v1/rpc/dobby_access_context']);
   ordinaryPasswordResume=true;
  }
  await page.locator('#accept').click();await page.waitForFunction(phase=>[phase,'acceptance-error'].includes(document.querySelector('#status').textContent),expectedPhase);
  assert.equal(await page.locator('#status').textContent(),expectedPhase,JSON.stringify(await page.evaluate(()=>({service:window.lastServiceFailure,controller:window.lastControllerFailure}))));
  const final=await page.evaluate(()=>({calls:window.callbackCalls,info:window.harnessInfo(),adopted:window.adoptedIdentity??null}));
  assert.deepEqual(final.calls,[ordinaryPasswordResume?'/auth/v1/token?grant_type=password':'/auth/v1/verify','/rest/v1/rpc/dobby_access_context','/rest/v1/rpc/dobby_access_accept','/rest/v1/rpc/dobby_v7_context']);
  assert.equal(final.info.bounded,false);assert.equal(final.info.state.phase,expectedPhase);
  assert.equal(auth.sql(`SELECT count(*) FROM dobby_access_private.admissions WHERE id='${staged.info.state.admission.id}' AND state='accepted';`),'1');
  if(expectedPhase==='active'){
   assert.equal(final.info.state.verified,true);assert.equal(final.adopted.memberId,final.info.state.memberId);assert.equal(final.adopted.userId,final.info.state.userId);
   assert.equal(auth.sql(`SELECT count(*) FROM dobby_v7_private.account_links WHERE user_id='${final.info.state.userId}' AND member_id='${final.info.state.memberId}';`),'1');
  }
  proofs.push({scenario,secondBrowser:true,explicitVerify:true,boundedAdmission:true,ordinaryPasswordResume,atomicAcceptBeforeContext:true,finalPhase:expectedPhase});
  await recipient.close();
 }
 t.diagnostic(JSON.stringify({browser:browser.version(),playwright:'1.62.1',auth:auth.info.auth.version,rest:auth.info.rest.version,smtp:auth.info.smtp.version,proofs}));
 await originator.close();
});

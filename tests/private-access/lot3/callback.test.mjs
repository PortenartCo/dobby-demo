import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
import * as accessModule from '../../../essai-stitch-v5-famille/family-access.mjs';
import * as core from '../../../essai-stitch-v5-famille/family-core.mjs';
import * as flow from '../../../essai-stitch-v7/access-flow.mjs';

// These tests exercise client behavior with fictional transports. Real GoTrue
// and inbox integration is covered separately; no Auth compatibility claim here.
const require=createRequire(import.meta.url),entry=require('../../../essai-stitch-v7/access-entry.js');
const USER='00000000-0000-4000-8000-000000000001',OTHER='00000000-0000-4000-8000-000000000002';
const ADMISSION='00000000-0000-4000-8000-000000000020',OP='00000000-0000-4000-8000-000000000030',HH='00000000-0000-4000-8000-000000000040';
const HASH='a'.repeat(64),callback=(type='invite')=>`https://example.test/dobby/?token_hash=${HASH}&type=${type}&admission_id=${ADMISSION}`;
const metadata=()=>({protocol:1,status:'unapproved',isOwner:false,canCreateHousehold:false,revision:0,admission:{id:ADMISSION,purpose:'family-parent',state:'sent',expiresAt:'2099-01-01T00:00:00Z',householdId:HH,memberId:null,requiresProfile:true}});
const active=()=>({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'canonical-TEXT-member',profile:{id:'canonical-TEXT-member',firstName:'TEST',memberCategory:'parent'},permissions:{canEdit:true},familyRevision:1});
function fixture(){
 const native={ready:true,configured:true,userId:null,householdId:null,epoch:0,verified:false},calls=[],meta=new Map();let response=metadata(),familyContext=active(),authResult={access_token:'TEST-access',refresh_token:'TEST-refresh',user:{id:USER}};
 const driver={crypto:webcrypto,now:()=>Date.now(),snapshot:()=>({...native}),meta:async key=>meta.get(key)??null,putMeta:async(key,value)=>meta.set(key,structuredClone(value)),delMeta:async key=>meta.delete(key),updateMeta:async(key,fn)=>meta.set(key,fn(meta.get(key)??null)),
  auth:async(path,method,body)=>{calls.push({path,method,body});return authResult;},
  rpc:async(name,body,options)=>{calls.push({name,body,options});return name==='dobby_access_context'?response:name==='dobby_access_accept'?{protocol:1,accepted:true,admissionId:ADMISSION}:familyContext;},
  installSession:async(result,before,options)=>{calls.push({install:true,options});native.userId=result.user.id;native.epoch++;native.verified=false;native.householdId=null;},
  beginAdmission:()=>{},completeAdmission:async()=>{calls.push({complete:true});},clearBinding:()=>{},bind:async value=>{calls.push({bind:true});native.verified=true;native.householdId=value.householdId;},logout:async()=>{native.userId=null;native.epoch++;},notify:()=>{}};
 return{api:accessModule.createFamilyAccess(driver),driver,native,calls,meta,setContext:value=>response=value,setFamilyContext:value=>familyContext=value,setAuth:value=>authResult=value};
}

test('entry captures token_hash and admission UUID, strips every bearer before assets, and consumes once',()=>{
 const url=callback()+'&access_token=PRIVATE-JWT&refresh_token=PRIVATE-REFRESH#token_hash=PRIVATE-HASH&type=invite';
 const captured=entry.capture(url);
 assert.equal(captured.callbackURL,url);assert.doesNotMatch(captured.cleanURL,/token_hash|admission_id|access_token|refresh_token|PRIVATE|type=/);
 const source=fs.readFileSync(new URL('../../../essai-stitch-v7/access-entry.js',import.meta.url),'utf8');let replaced;
 const sandbox={URL,URLSearchParams,window:{location:{href:url},history:{replaceState:(_,__,value)=>replaced=value}}};vm.runInNewContext(source,sandbox);
 assert.equal(replaced,captured.cleanURL);assert.equal(sandbox.window.DobbyAccessEntry.consume().callbackURL,url);assert.equal(sandbox.window.DobbyAccessEntry.consume(),null);
});
test('URL cleaner removes callbacks nested in a native route fragment',()=>{
 const value='https://example.test/dobby/famille.html#access?token_hash='+HASH;
 assert.doesNotMatch(accessModule.cleanAuthURL(value),/token_hash|admission_id|type=|a{64}/);
});
test('token_hash capture needs no PKCE verifier and is inert until explicit confirmation',async()=>{
 const f=fixture(),result=await f.api.confirmFromURL(callback());
 assert.equal(result.phase,'admission-confirmation');assert.equal(f.calls.length,0);assert.equal(f.meta.size,0);
 assert.doesNotMatch(JSON.stringify(result)+JSON.stringify(f.api.state()),new RegExp(HASH));
 assert.equal(flow.destination(result),'access-confirmation');
 await f.api.confirmAdmission();
 assert.deepEqual(f.calls.filter(x=>x.path).map(x=>[x.path,x.body]),[['/auth/v1/verify',{token_hash:HASH,type:'invite'}]]);
 assert.equal(f.calls.find(x=>x.install).options.admissionId,ADMISSION);
 assert.equal(f.api.state().phase,'admission');assert.equal(f.api.state().verified,false);assert.equal(f.api.state().memberId,null);
 assert.deepEqual(f.calls.filter(x=>x.name).map(x=>x.name),['dobby_access_context']);
 assert.deepEqual(f.calls.find(x=>x.name).body,{p_admission_id:ADMISSION});
 await assert.rejects(f.api.confirmAdmission(),/lien|confirmation/i);
});
test('explicit password login can resume its known admission without a business refresh',async()=>{
 const f=fixture();await f.api.signIn('fictional@example.invalid','TEST-password',{admissionId:ADMISSION});
 assert.equal(f.api.state().phase,'admission');assert.equal(f.calls.find(x=>x.install).options.admissionId,ADMISSION);
 assert.deepEqual(f.calls.filter(x=>x.name).map(x=>x.name),['dobby_access_context']);
 assert.deepEqual(f.meta.get('v7-admission-resume'),{admissionId:ADMISSION,userId:USER});
 const before=f.calls.length;await assert.rejects(f.api.signIn('fictional@example.invalid','TEST-password',{admissionId:'bad'}));assert.equal(f.calls.length,before);
});
test('a saved admission resume record cannot switch an unrelated authenticated user into that admission',async()=>{
 const f=fixture();f.setAuth({access_token:'TEST-other',refresh_token:'TEST-other-refresh',user:{id:OTHER}});
 await assert.rejects(f.api.signIn('other@example.invalid','TEST-password',{admissionId:ADMISSION,expectedUserId:USER}),/compte|admission/i);
 assert.equal(f.calls.some(x=>x.install||x.name),false);
});
test('magiclink is accepted explicitly; unsupported or ambiguous Auth callbacks never reach verify',async t=>{
 const magic=fixture();await magic.api.confirmFromURL(callback('magiclink'));await magic.api.confirmAdmission();assert.equal(magic.calls.find(x=>x.path).body.type,'magiclink');
 for(const url of [callback('recovery'),callback('signup'),callback('email'),callback('sms'),callback().replace(ADMISSION,'not-a-uuid'),callback().replace('&admission_id='+ADMISSION,''),callback()+'&type=magiclink',callback()+'&code=ambiguous',callback()+'#access_token=PRIVATE'])await t.test(url.replace(HASH,'HASH'),async()=>{
  const f=fixture();await assert.rejects(f.api.confirmFromURL(url));assert.equal(f.calls.length,0);
 });
});
test('bounded admission refresh uses only access context and disallows premature family mutation',async()=>{
 const f=fixture();await f.api.confirmFromURL(callback());await f.api.confirmAdmission();f.calls.length=0;
 await f.api.refresh();assert.deepEqual(f.calls.map(x=>x.name),['dobby_access_context']);
 for(const action of [()=>f.api.saveProfile({firstName:'TEST'}),()=>f.api.createHousehold('TEST'),()=>f.api.acceptInvitation('opaque-test-invitation'),()=>f.api.previewInvitation('opaque-test-invitation')])await assert.rejects(action(),/admission|confirmation|autorisé/i);
 assert.equal(f.calls.some(x=>x.name==='dobby_v7_context'),false);assert.equal(f.calls.some(x=>x.bind),false);
});
test('admission transport allowlist rejects every generic read/write and malformed packet',()=>{
 assert.doesNotThrow(()=>core.assertAdmissionRPC({name:'dobby_access_context',admissionId:ADMISSION,body:{p_admission_id:ADMISSION}}));
 assert.doesNotThrow(()=>core.assertAdmissionRPC({name:'dobby_access_accept',admissionId:ADMISSION,body:{p_admission_id:ADMISSION,p_profile:null,p_operation_id:OP}}));
 for(const packet of [
  {name:'dobby_v7_context',body:{}},{name:'dobby_v7_update_profile',body:{p_profile:{firstName:'TEST'}}},
  {name:'dobby_access_context?select=*',body:{p_admission_id:ADMISSION}},
  {name:'dobby_access_context',body:{p_admission_id:OTHER}},
  {name:'dobby_access_context',body:{p_admission_id:ADMISSION,p_admin:true}},
  {name:'dobby_access_accept',body:{p_admission_id:ADMISSION,p_profile:null,p_operation_id:'bad'}},
 ])assert.throws(()=>core.assertAdmissionRPC({...packet,admissionId:ADMISSION}));
 assert.throws(()=>core.assertSharedWrite({method:'POST',query:'rpc/dobby_access_accept',body:{p_admission_id:ADMISSION,p_profile:null,p_operation_id:OP},access:{phase:'admission',authenticated:true,verified:false,userId:USER}}));
});
test('adult acceptance validates profile then atomically accepts before family refresh and adoption',async()=>{
 const f=fixture();await f.api.confirmFromURL(callback());await f.api.confirmAdmission();f.calls.length=0;
 await assert.rejects(f.api.admit({admissionId:ADMISSION,profile:{firstName:'TEST',admin:true},operationId:OP}));assert.equal(f.calls.length,0);
 await f.api.admit({admissionId:ADMISSION,profile:{firstName:' TEST ',avatarId:'portrait-1'},operationId:OP});
 assert.deepEqual(f.calls[0],{name:'dobby_access_accept',body:{p_admission_id:ADMISSION,p_profile:{firstName:'TEST',avatarId:'portrait-1'},p_operation_id:OP},options:{admission:true}});
 assert.deepEqual(f.calls.map(x=>x.name||Object.keys(x).find(k=>x[k]===true)),['dobby_access_accept','complete','dobby_v7_context','bind']);
 assert.equal(f.api.state().verified,true);
});
test('child admission sends no replacement profile and leaves production child gates closed',async()=>{
 const f=fixture();f.setContext({...metadata(),admission:{...metadata().admission,purpose:'family-child',memberId:'existing-child',requiresProfile:false}});
 f.setFamilyContext({...active(),memberId:'existing-child',profile:{id:'existing-child',firstName:'TEST Child',memberCategory:'child'}});
 await f.api.confirmFromURL(callback());await f.api.confirmAdmission();
 await assert.rejects(f.api.admit({admissionId:ADMISSION,profile:{firstName:'Replacement'},operationId:OP}));
 await f.api.admit({admissionId:ADMISSION,operationId:OP});
 assert.equal(f.calls.find(x=>x.name==='dobby_access_accept').body.p_profile,null);
 assert.equal(f.api.state().capabilities.childAccountLinkReady,false);
});
test('fresh context after child admission must still identify the same canonical child and household',async()=>{
 const f=fixture();f.setContext({...metadata(),admission:{...metadata().admission,purpose:'family-child',memberId:'existing-child',requiresProfile:false}});
 await f.api.confirmFromURL(callback());await f.api.confirmAdmission();
 await assert.rejects(f.api.admit({admissionId:ADMISSION,operationId:OP}),/profil|confirmé/i);
 assert.equal(f.calls.some(x=>x.bind),false);assert.equal(f.api.state().verified,false);
});
test('a child admission without a precise existing target never proceeds to acceptance',async()=>{
 const f=fixture();f.setContext({...metadata(),admission:{...metadata().admission,purpose:'family-child',requiresProfile:false,memberId:null,householdId:null}});
 await f.api.confirmFromURL(callback());await assert.rejects(f.api.confirmAdmission(),/admission|incohérente/i);
 assert.equal(f.calls.some(x=>x.name==='dobby_access_accept'||x.name==='dobby_v7_context'),false);
});
test('adult admission adoption is restricted to the approved household',async()=>{
 const f=fixture();f.setFamilyContext({...active(),householdId:OTHER});await f.api.confirmFromURL(callback());await f.api.confirmAdmission();
 await assert.rejects(f.api.admit({admissionId:ADMISSION,profile:{firstName:'TEST'},operationId:OP}),/profil|confirmé/i);assert.equal(f.calls.some(x=>x.bind),false);
});
test('an invalid transaction acknowledgement cannot unlock the family transport',async()=>{
 const f=fixture();await f.api.confirmFromURL(callback());await f.api.confirmAdmission();const rpc=f.driver.rpc;
 f.driver.rpc=(name,...args)=>name==='dobby_access_accept'?Promise.resolve({accepted:true,admissionId:OTHER}):rpc(name,...args);
 await assert.rejects(f.api.admit({admissionId:ADMISSION,profile:{firstName:'TEST'},operationId:OP}));
 assert.equal(f.api.state().phase,'admission');assert.equal(f.calls.some(x=>x.complete||x.bind||x.name==='dobby_v7_context'),false);
});
test('replacement immediately after session installation cannot become the admission owner',async()=>{
 const f=fixture();await f.api.confirmFromURL(callback());const install=f.driver.installSession;
 f.driver.installSession=async(...args)=>{await install(...args);f.native.userId=OTHER;f.native.epoch++;};
 await assert.rejects(f.api.confirmAdmission(),/compte|chang/i);assert.equal(f.calls.some(x=>x.name),false);
});
test('failed accept stays bounded and reuses one operation UUID without a family read',async()=>{
 const f=fixture();await f.api.confirmFromURL(callback());await f.api.confirmAdmission();const rpc=f.driver.rpc;let fail=true;
 f.driver.rpc=async(name,body,options)=>{if(name==='dobby_access_accept'&&fail){f.calls.push({name,body,options});throw TypeError('offline');}return rpc(name,body,options);};
 await assert.rejects(f.api.admit({admissionId:ADMISSION,profile:{firstName:'TEST'}}));assert.equal(f.api.state().phase,'admission');assert.equal(f.calls.some(x=>x.name==='dobby_v7_context'),false);
 fail=false;await f.api.admit({admissionId:ADMISSION,profile:{firstName:'TEST'}});
 const attempts=f.calls.filter(x=>x.name==='dobby_access_accept');assert.equal(attempts[0].body.p_operation_id,attempts[1].body.p_operation_id);
});
test('late Auth and access-context responses cannot claim a replacement native session',async t=>{
 for(const stage of ['auth','context'])await t.test(stage,async()=>{
  const f=fixture();await f.api.confirmFromURL(callback());let release;
  if(stage==='auth')f.driver.auth=()=>new Promise(resolve=>release=resolve);else f.driver.rpc=()=>new Promise(resolve=>release=resolve);
  const pending=f.api.confirmAdmission();while(!release)await new Promise(resolve=>setImmediate(resolve));
  f.native.userId=OTHER;f.native.epoch++;release(stage==='auth'?{access_token:'TEST-late',refresh_token:'TEST-late',user:{id:USER}}:metadata());
  await assert.rejects(pending,/compte|chang/i);assert.equal(f.native.userId,OTHER);assert.equal(f.calls.some(x=>x.bind),false);
 });
});

test('access initialization stages a hash callback without verify or ordinary context refresh',async()=>{
 const f=fixture(),source=fs.readFileSync(new URL('../../../essai-stitch-v7/access.js',import.meta.url),'utf8').replace("import('./access-flow.mjs')",'Promise.resolve(__flow)');
 const api={access:f.api,connectionState:()=>({ready:true}),meta:f.driver.meta,putMeta:f.driver.putMeta,updateMeta:f.driver.updateMeta};
 const sandbox={__flow:flow,location:{href:'https://example.test/dobby/essai-stitch-v7/famille.html#access'},URL,URLSearchParams,document:{body:{dataset:{}}},window:{DobbyFamilyStitchEngine:{win:()=>({DobbyFamilyUI:api})},DobbyAccessEntry:{consume:()=>entry.capture(callback())},DobbyRegister:{until:async predicate=>assert.equal(predicate(),true)},addEventListener(){}}};
 vm.runInNewContext(source,sandbox);await sandbox.window.DobbyAccess.prepare('access');
 assert.equal(f.api.state().phase,'admission-confirmation');assert.equal(f.calls.length,0);
});
test('the explicit resume form passes its verified account-bound admission UUID to password login',async()=>{
 const f=fixture();f.meta.set('v7-admission-resume',{admissionId:ADMISSION,userId:USER});
 const nodes=[],navigation=[];
 function node(tag){const value={tagName:tag.toUpperCase(),children:[],dataset:{},style:{},isConnected:true,classList:{add(){}},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},setAttribute(){},removeAttribute(){},addEventListener(){},closest:()=>null,querySelector:()=>null,querySelectorAll:()=>[],reportValidity:()=>true};nodes.push(value);return value;}
 const api={access:f.api,connectionState:()=>({ready:true}),meta:f.driver.meta,putMeta:f.driver.putMeta,updateMeta:f.driver.updateMeta};
 const sandbox={__flow:flow,location:{href:'https://example.test/dobby/essai-stitch-v7/famille.html#access',replace:value=>navigation.push(value)},URL,URLSearchParams,document:{createElement:node,body:{dataset:{}}},window:{DobbyFamilyStitchEngine:{win:()=>({DobbyFamilyUI:api})},DobbyAccessEntry:{consume:()=>null},DobbyFamilyStitch:{ready:true,open:async(view,values)=>navigation.push({view,...values})},DobbyRegister:{until:async()=>{}},addEventListener(){}}};
 const source=fs.readFileSync(new URL('../../../essai-stitch-v7/access.js',import.meta.url),'utf8').replace("import('./access-flow.mjs')",'Promise.resolve(__flow)');vm.runInNewContext(source,sandbox);
 await sandbox.window.DobbyAccess.prepare('access-welcome');const main=node('main');sandbox.window.DobbyAccess.render({main,ui:{view:'access-welcome'}});
 const resume=nodes.find(n=>n.tagName==='BUTTON'&&n.textContent==='Reprendre mon admission');assert.ok(resume);
 resume.onclick({preventDefault(){},currentTarget:resume});while(sandbox.window.DobbyAccess.busy)await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(JSON.parse(JSON.stringify(navigation[0])),{view:'access-auth',mode:'admission'});
 nodes.length=0;sandbox.window.DobbyAccess.render({main,ui:{view:'access-auth',accessMode:'admission'}});
 nodes.find(n=>n.name==='email').value='fictional@example.invalid';nodes.find(n=>n.name==='password').value='TEST-password';
 const form=nodes.find(n=>n.tagName==='FORM');form.onsubmit({preventDefault(){},stopImmediatePropagation(){}});while(sandbox.window.DobbyAccess.busy)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.calls.find(x=>x.install).options.admissionId,ADMISSION);assert.equal(f.api.state().phase,'admission');assert.equal(f.calls.some(x=>x.name==='dobby_v7_context'),false);
});

function nativeFixture(){
 const rows=new Map(),requests=[];let accepted=false;
 const db={transaction(){const tx={};tx.objectStore=()=>{const request=fn=>{const req={};queueMicrotask(()=>{req.result=fn();req.onsuccess?.();tx.oncomplete?.();});return req;};return{get:key=>request(()=>rows.get(key)),put:row=>request(()=>rows.set(row.id,row)),delete:key=>request(()=>rows.delete(key)),getAll:()=>request(()=>[])};};return tx;}};
 const node=()=>({dataset:{},append(){},remove(){},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],style:{},elements:[],hidden:true});
 const sandbox={__access:accessModule,st:{page:'home'},save(){},render(){},drawShop:()=>'',queueMicrotask,setInterval:()=>0,setTimeout,clearTimeout,crypto:webcrypto,TextEncoder,URL,URLSearchParams,btoa,
  document:{getElementById:()=>null,addEventListener(){},createElement:node,body:{append(){}}},window:{addEventListener(){},dispatchEvent(){}},CustomEvent:class{},navigator:{onLine:true},localStorage:{getItem:()=>null,setItem(){}},
  fetch:async(url,options)=>{const path=new URL(url).pathname;requests.push({path,options});let body=[];
   if(path==='/auth/v1/verify')body={access_token:'TEST-admission-JWT',refresh_token:'TEST-admission-refresh',expires_in:3600,user:{id:USER}};
   if(path.endsWith('/dobby_access_context'))body=metadata();
   if(path.endsWith('/dobby_access_accept')){accepted=true;body={protocol:1,accepted:true,admissionId:ADMISSION};}
   if(path.endsWith('/dobby_v7_context')){assert.equal(accepted,true);body=active();}
   if(path.endsWith('/dobby_v2_memberships'))body=[{household_id:HH}];if(path.endsWith('/dobby_v2_households'))body=[{id:HH}];
   return{ok:true,status:200,text:async()=>JSON.stringify(body)};
  }};
 const source=fs.readFileSync(new URL('../../../essai-stitch-v5-famille/family-v2.js',import.meta.url),'utf8').replace("import('./family-access.mjs')",'Promise.resolve(__access)').replace(/void boot\(\);\s*\}\)\(\);\s*$/,'window.__native={f,authorized,sync};})();');vm.runInNewContext(source,sandbox);
 const f=sandbox.window.__native.f;Object.assign(f,{db,ready:true,key:'sb_publishable_fictional',core,provider:{reset(){},adoptVerifiedFamily:async()=>{},html:()=>'',sync:async()=>{}}});
 return{f,rows,requests,api:sandbox.window.DobbyFamilyUI,transport:sandbox.window.__native};
}
test('actual native driver has a session-bound admission-only path despite shared-write guard',async()=>{
 const n=nativeFixture();await n.api.access.ready;await n.api.access.confirmFromURL(callback());await n.api.access.confirmAdmission();
 assert.equal(n.requests.filter(x=>x.path.startsWith('/rest/')).every(x=>x.path.endsWith('/dobby_access_context')),true);
 assert.equal(n.rows.has('session'),false,'Admission JWT is memory-only before acceptance');
 await n.transport.sync();assert.equal(n.f.error,'','Background family synchronization waits quietly for atomic admission');
 await assert.rejects(n.transport.authorized('GET','dobby_v2_memberships?select=*'),/admission|confirmation/i);
 await assert.rejects(n.transport.authorized('POST','rpc/dobby_v7_update_profile',{p_profile:{firstName:'TEST'}}),/admission|confirmation/i);
 await assert.rejects(n.transport.authorized('POST','rpc/dobby_access_accept',{p_admission_id:ADMISSION,p_profile:null,p_operation_id:OP}),/admission|confirmation/i);
 await n.api.access.admit({admissionId:ADMISSION,profile:{firstName:'TEST'},operationId:OP});assert.equal(n.api.access.state().verified,true);assert.equal(n.rows.get('session').value.user_id,USER);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import * as accessModule from '../family-access.mjs';
import * as familyCore from '../family-core.mjs';
const USER='00000000-0000-4000-8000-000000000001',HH='00000000-0000-4000-8000-000000000010';
function database(){const rows=new Map();return{rows,transaction(){const tx={};tx.objectStore=()=>{const request=produce=>{const req={};queueMicrotask(()=>{try{req.result=produce();req.onsuccess?.();tx.oncomplete?.();}catch(error){tx.error=error;tx.onerror?.();}});return req;};return{get:key=>request(()=>rows.get(key)),put:row=>request(()=>rows.set(row.id,row)),delete:key=>request(()=>rows.delete(key)),getAll:()=>request(()=>[])};};return tx;}};}
function native({httpFailures={}}={}){
 const db=database(),requests=[];let members=[],context={protocol:1,phase:'profile',userId:USER,profile:null},releaseAuth=null;
 const node=()=>({dataset:{},append(){},remove(){},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],style:{},elements:[],hidden:true});
 const sandbox={__accessModule:accessModule,st:{page:'home'},save(){},render(){},drawShop:()=>'',queueMicrotask,setInterval:()=>0,setTimeout,clearTimeout,crypto:webcrypto,TextEncoder,URL,URLSearchParams,btoa,
  document:{getElementById:()=>null,addEventListener(){},createElement:node,body:{append(){}}},window:{addEventListener(){},dispatchEvent(){}},CustomEvent:class{},navigator:{onLine:true},localStorage:{getItem:()=>null,setItem(){}},
  FormData:class{constructor(form){this.values=new Map(form.children.map(x=>[x.name,x.value]));}get(key){return this.values.get(key);}},
  fetch:async(url,options={})=>{const u=new URL(url);requests.push({path:u.pathname,query:u.search,options});const failure=httpFailures[u.pathname];if(failure)return{ok:false,status:failure.status,text:async()=>JSON.stringify(failure.body)};let body=[];if(u.pathname==='/auth/v1/token'){if(releaseAuth)await new Promise(resolve=>{releaseAuth.resolve=resolve;});body={access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,user:{id:USER,email:'fixture@example.test'}};}else if(u.pathname.endsWith('/dobby_v7_context'))body=context;else if(u.pathname.endsWith('/dobby_v2_memberships'))body=members;else if(u.pathname.endsWith('/dobby_v2_households'))body=[{id:HH}];return{ok:true,status:200,text:async()=>JSON.stringify(body)};}};
 sandbox.document.createElement=tag=>tag==='form'?{children:[],append(child){this.children.push(child);}}:node();
 const source=fs.readFileSync(new URL('../family-v2.js',import.meta.url),'utf8').replace("import('./family-access.mjs')",'Promise.resolve(__accessModule)').replace(/void boot\(\);\s*\}\)\(\);\s*$/,'window.__native={f,logout,...(typeof loadPublicKey===\"function\"?{loadPublicKey}:{})};})();');vm.runInNewContext(source,sandbox);
 const f=sandbox.window.__native.f;f.db=db;f.ready=true;f.key='sb_publishable_native_fixture_only';f.provider={start:async()=>{},reset(){},adoptVerifiedFamily:async value=>{assert.equal(value.memberId,'local-person');},html:()=>'',sync:async()=>{}};
 return{state:sandbox.st,api:sandbox.window.DobbyFamilyUI,f,db,requests,window:sandbox.window,loadPublicKey:sandbox.window.__native.loadPublicKey,setMembers:rows=>{members=rows;},setContext:value=>{context=value;},holdAuth:()=>{releaseAuth={resolve:null};return releaseAuth;},logout:()=>sandbox.window.__native.logout()};
}
test('native access keeps an unassigned authenticated session while legacy login still refuses it',async()=>{
 const f=native();assert.ok(f.api.access,'Native facade exposes access');await f.api.access.ready;await f.api.access.signIn('fixture@example.test','fixture-password');assert.equal(f.f.session.user_id,USER);assert.equal(f.api.access.state().phase,'profile');assert.equal(f.api.getContext(),null);assert.ok(f.db.rows.get('session'));
 const legacy=native();await assert.rejects(legacy.api.signIn('fixture@example.test','fixture-password'),/seul foyer/);assert.equal(legacy.f.session,null);assert.equal(legacy.db.rows.has('session'),false);
});
test('native verified identity requires membership verification and canonical adoption',async()=>{
 const f=native();assert.ok(f.api.access);f.setMembers([{household_id:HH}]);f.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'Camille'},permissions:{canEdit:true,canMagic:true},pendingCeremony:true});await f.api.access.ready;await f.api.access.signIn('fixture@example.test','fixture-password');
 assert.equal(f.api.connectionState().identityVerified,true);assert.equal(f.api.getContext().memberId,'local-person');assert.equal(f.api.getContext().permissions.canMagic,true);assert.equal(f.db.rows.get('deviceHouseholdId').value,HH);assert.doesNotMatch(JSON.stringify(f.api.getContext()),/fixture-access|fixture-refresh/);
 await f.logout();assert.equal(f.api.connectionState().memberId,null);assert.equal(f.api.getContext(),null);assert.equal(f.api.access.state().phase,'signed-out');
});
test('new access cannot bypass the existing browser household guard',async()=>{
 const f=native();assert.ok(f.api.access);f.db.rows.set('deviceHouseholdId',{id:'deviceHouseholdId',value:'other-household'});f.setMembers([{household_id:HH}]);f.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'Camille'},permissions:{canEdit:true}});await f.api.access.ready;await assert.rejects(f.api.access.signIn('fixture@example.test','fixture-password'),/navigateur|foyer/);assert.equal(f.api.connectionState().identityVerified,false);assert.equal(f.db.rows.get('deviceHouseholdId').value,'other-household');
});
test('an auth response arriving after logout cannot recreate a native session',async()=>{
 const f=native();assert.ok(f.api.access);await f.api.access.ready;const gate=f.holdAuth(),pending=f.api.access.signIn('fixture@example.test','fixture-password');while(!gate.resolve)await Promise.resolve();await f.logout();gate.resolve();await assert.rejects(pending,/compte.*chang/i);assert.equal(f.f.session,null);assert.equal(f.db.rows.has('session'),false);
});
test('native logout notifies access subscribers and unsubscribe prevents later delivery',async()=>{
 const f=native();await f.api.access.ready;assert.equal(typeof f.api.access.subscribe,'function');let events=0;const unsubscribe=f.api.access.subscribe(()=>events++);await f.api.access.signIn('fixture@example.test','fixture-password');const before=events;await f.logout();await Promise.resolve();assert.ok(events>before);unsubscribe();const after=events;await f.api.access.refresh();assert.equal(events,after);
});
test('public configuration accepts only this project publishable keys and preserves existing device configuration',async()=>{
 const f=native();assert.equal(typeof f.loadPublicKey,'function');f.window.DobbyPublicConfig={publicKey:'sb_publishable_configured_fixture_only',projectRef:'pqcdkrwljgvgagzwrcmg'};assert.equal(await f.loadPublicKey(),'sb_publishable_configured_fixture_only');f.db.rows.set('publicKey',{id:'publicKey',value:'sb_publishable_existing_device_fixture'});assert.equal(await f.loadPublicKey(),'sb_publishable_existing_device_fixture');f.db.rows.delete('publicKey');f.window.DobbyPublicConfig={publicKey:'sb_secret_forbidden_fixture'};assert.equal(await f.loadPublicKey(),null);f.window.DobbyPublicConfig={publicKey:'sb_publishable_configured_fixture_only',projectRef:'wrong-project'};assert.equal(await f.loadPublicKey(),null);
});

test('native Auth errors retain GoTrue error_code without exposing the raw response',async()=>{
 const f=native({httpFailures:{'/auth/v1/token':{status:403,body:{error_code:'user_banned',msg:'PRIVATE_RESPONSE fixture@example.test fixture-access'}}}});
 await assert.rejects(f.api.access.signIn('fixture@example.test','fixture-password'),error=>{
  assert.equal(error.stage,'auth');assert.equal(error.status,403);assert.equal(error.code,'user_banned');
  assert.doesNotMatch(error.message+JSON.stringify(error),/PRIVATE_RESPONSE|fixture@example|fixture-access/);return true;
 });
 assert.equal(f.f.session,null);assert.equal(f.api.access.state().authenticated,false);
});

test('native GoTrue numeric HTTP codes do not hide the specific authentication reason',async()=>{
 const f=native({httpFailures:{'/auth/v1/token':{status:400,body:{code:400,error_code:'invalid_credentials',msg:'PRIVATE_RESPONSE fixture@example.test'}}}});
 await assert.rejects(f.api.access.signIn('fixture@example.test','fixture-password'),error=>{
  assert.equal(error.code,'invalid_credentials');assert.equal(error.stage,'auth');assert.equal(error.status,400);
  assert.doesNotMatch(error.message+JSON.stringify(error),/PRIVATE_RESPONSE|fixture@example/);return true;
 });
 assert.equal(f.f.session,null);assert.equal(f.api.access.state().authenticated,false);
});

test('native context refusals retain SQLSTATE and leave the accepted Auth session unverified',async()=>{
 const f=native({httpFailures:{'/rest/v1/rpc/dobby_v7_context':{status:403,body:{code:'42501',error_code:'ignored_fallback',message:'PRIVATE_RESPONSE fixture@example.test'}}}});
 await assert.rejects(f.api.access.signIn('fixture@example.test','fixture-password'),error=>{
  assert.equal(error.stage,'context');assert.equal(error.status,403);assert.equal(error.code,'42501');
  assert.doesNotMatch(error.message+JSON.stringify(error),/PRIVATE_RESPONSE|fixture@example/);return true;
 });
 assert.equal(f.f.session.user_id,USER);assert.equal(f.api.access.state().authenticated,false);assert.equal(f.api.access.state().verified,false);assert.equal(f.api.access.state().phase,'rejected');
});

test('native REST guard uses canonical child category even when client grants claim parent editing',async()=>{
 const fixture=native();fixture.f.core=familyCore;fixture.setMembers([{household_id:HH}]);
 fixture.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'TEST Child'},permissions:{canEdit:true,canMagic:true}});
 await fixture.api.access.ready;await fixture.api.access.signIn('fixture@example.test','fixture-password');
 fixture.state.familyMembers=[{id:'local-person',memberCategory:'child'}];
 const before=fixture.requests.length;
 await assert.rejects(fixture.api.authorized('PATCH','dobby_v2_modules?module=eq.recipes',{payload:{}}),/lecture seule/);
 await assert.rejects(fixture.api.authorized('POST','dobby_v2_grocery',{title:'TEST Forbidden'}),/lecture seule/);
 assert.equal(fixture.requests.length,before,'Forbidden writes never reach transport');
 await fixture.api.authorized('GET','dobby_v2_modules');
 assert.equal(fixture.requests.length,before+1,'Child shared read remains available');
});

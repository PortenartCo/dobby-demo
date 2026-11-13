import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import * as accessModule from '../family-access.mjs';
import * as familyCore from '../family-core.mjs';

// Execute the actual native transport/projection with fictional local services.
const USER='00000000-0000-4000-8000-000000000001',OTHER='00000000-0000-4000-8000-000000000002',HH='00000000-0000-4000-8000-000000000010',HH2='00000000-0000-4000-8000-000000000020';
const MEMBER='local-same-TEXT-member',CHILD='local-existing-child',TOKEN='c'.repeat(64);
const caps=()=>({protocol:2,installed:true,familyRolesAvailable:true,childAccountLinkAvailable:true,familyRolesVerified:true,childAccountLinkVerified:true,storagePoliciesVerified:true});
const active=()=>({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:MEMBER,profile:{id:MEMBER,name:'TEST Parent',memberCategory:'parent'},permissions:{canEdit:true,canMagic:true,canCreate:true,canInvite:true,canManageDependents:false,canManageHousehold:true},familyRevision:3});
function database(){
 const rows=new Map();return{rows,transaction(){const tx={pending:0,aborted:false,abort(){tx.aborted=true;queueMicrotask(()=>tx.onabort?.());}};
  tx.objectStore=()=>{const request=produce=>{const req={};tx.pending++;queueMicrotask(()=>{if(tx.aborted)return;try{req.result=produce();req.onsuccess?.();}catch(error){tx.error=error;tx.onerror?.();}finally{tx.pending--;if(tx.pending===0&&!tx.aborted)queueMicrotask(()=>tx.oncomplete?.());}});return req;};return{get:key=>request(()=>rows.get(key)),put:row=>request(()=>rows.set(row.id,row)),delete:key=>request(()=>rows.delete(key)),getAll:()=>request(()=>[])};};return tx;}};
}
function native({futureFeatures=false}={}){
 const db=database(),requests=[];let context=active(),capabilities=caps(),interceptor=null;
 const node=()=>({dataset:{},append(){},remove(){},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],style:{},elements:[],hidden:true});
 const module={...accessModule,createFamilyAccess:driver=>accessModule.createFamilyAccess(driver,futureFeatures?{release:{familyRoles:true,childAccountLink:true}}:{})};
 const sandbox={__accessModule:module,st:{page:'home',familyMembers:[{id:MEMBER,name:'TEST Parent',memberCategory:'parent'},{id:CHILD,name:'TEST Child',memberCategory:'child'}]},save(){},render(){},drawShop:()=>'',queueMicrotask,setInterval:()=>0,setTimeout,clearTimeout,crypto:webcrypto,TextEncoder,URL,URLSearchParams,btoa,
  document:{getElementById:()=>null,addEventListener(){},createElement:node,body:{append(){}}},window:{addEventListener(){},dispatchEvent(){}},CustomEvent:class{},navigator:{onLine:true},localStorage:{getItem:()=>null,setItem(){}},
  FormData:class{constructor(form){this.values=new Map(form.children.map(x=>[x.name,x.value]));}get(key){return this.values.get(key);}},
  fetch:async(url,options={})=>{const u=new URL(url),request={path:u.pathname,query:u.search,options};requests.push(request);if(interceptor){const response=await interceptor(request);if(response)return response;}
   let body=[];if(u.pathname==='/auth/v1/token')body={access_token:'TEST-access-refreshed',refresh_token:'TEST-refresh-refreshed',expires_in:3600,user:{id:USER}};
   else if(u.pathname.endsWith('/dobby_v7_context'))body=context;
   else if(u.pathname.endsWith('/dobby_v7_family_capabilities'))body=capabilities;
   else if(u.pathname.endsWith('/dobby_v2_memberships'))body=[{household_id:HH}];
   else if(u.pathname.endsWith('/dobby_v2_households'))body=[{id:HH}];
   return{ok:true,status:200,text:async()=>JSON.stringify(body)};
  }};
 sandbox.document.createElement=tag=>tag==='form'?{children:[],append(child){this.children.push(child);}}:node();
 const source=fs.readFileSync(new URL('../family-v2.js',import.meta.url),'utf8').replace("import('./family-access.mjs')",'Promise.resolve(__accessModule)').replace(/void boot\(\);\s*\}\)\(\);\s*$/,'window.__native={f,authorized,token,refreshToken,storageFetch};})();');
 vm.runInNewContext(source,sandbox);const f=sandbox.window.__native.f;f.db=db;f.ready=true;f.key='sb_publishable_test_native_only';f.core=familyCore;f.provider={start:async()=>{},reset(){},adoptVerifiedFamily:async()=>{},html:()=>'',sync:async()=>{}};
 const session=(userId=USER)=>({access_token:'TEST-access-'+userId,refresh_token:'TEST-refresh-'+userId,user_id:userId,expires_at:Math.floor(Date.now()/1000)+3600});
 const establish=()=>{f.session=session();f.householdId=HH;f.context=HH+':'+USER;f.verifiedContext=f.context;db.rows.set('session',{id:'session',value:structuredClone(f.session)});};
 const switchAccount=({userId=OTHER,householdId=HH2,epoch=true}={})=>{f.session=session(userId);f.householdId=householdId;f.context=householdId+':'+userId;f.verifiedContext=f.context;if(epoch)f.epoch++;db.rows.set('session',{id:'session',value:structuredClone(f.session)});};
 return{f,db,requests,sandbox,api:sandbox.window.DobbyFamilyUI,transport:sandbox.window.__native,establish,switchAccount,intercept:fn=>interceptor=fn,setCapabilities:value=>capabilities=value,setContext:value=>context=value,
  readNativeMemberPermissions(id){vm.runInNewContext(fs.readFileSync(new URL('../family-member-policy.js',import.meta.url),'utf8'),sandbox);const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),start=html.indexOf('const v23Members='),end=html.indexOf('function v23HealthPermissions',start);vm.runInNewContext(html.slice(start,end)+'\nwindow.__memberPermissions=v23MemberPermissions;',sandbox);return sandbox.window.__memberPermissions(id);}};
}
function replaceWhenTokenReturns(f,replacement){let armed=true;Object.defineProperty(f.f.session,'access_token',{configurable:true,get(){if(armed){armed=false;queueMicrotask(()=>f.switchAccount(replacement));}return'TEST-access-original';}});}
const mutationRequests=f=>f.requests.filter(request=>request.path==='/rest/v1/rpc/dobby_v7_update_member');

test('the actual authorized transport rejects an account, epoch or household switch after token resolution',async t=>{
 for(const[label,replacement]of [['account',{userId:OTHER,householdId:HH2}],['epoch',{userId:USER,householdId:HH}],['household',{userId:USER,householdId:HH2,epoch:false}]])await t.test(label,async()=>{
  const f=native();f.establish();replaceWhenTokenReturns(f,replacement);
  await assert.rejects(f.api.authorized('POST','rpc/dobby_v7_update_member',{p_member_id:MEMBER,p_values:{notes:'TEST'}}),/compte|foyer/i);
  assert.equal(mutationRequests(f).length,0);assert.equal(f.requests.length,0);
 });
});

test('a 401 from the original actor cannot refresh or retry under a replacement account',async()=>{
 const f=native();f.establish();f.intercept(request=>request.path.startsWith('/rest/v1/')?{ok:false,status:401,text:async()=>{queueMicrotask(()=>f.switchAccount());return'{}';}}:null);
 await assert.rejects(f.api.authorized('POST','rpc/dobby_v7_update_member',{p_member_id:MEMBER}),/compte|foyer/i);
 assert.equal(mutationRequests(f).length,1);assert.equal(f.requests.some(request=>request.path==='/auth/v1/token'),false);
});

test('a late refresh response cannot overwrite the replacement account or send its pending mutation',async()=>{
 const f=native();f.establish();f.f.session.expires_at=0;let release;
 f.intercept(request=>request.path==='/auth/v1/token'?new Promise(resolve=>release=resolve):null);
 const pending=f.api.authorized('POST','rpc/dobby_v7_update_member',{p_member_id:MEMBER});while(!release)await new Promise(resolve=>setImmediate(resolve));
 f.switchAccount();release({ok:true,status:200,text:async()=>JSON.stringify({access_token:'TEST-stale-A',refresh_token:'TEST-stale-refresh-A',expires_in:3600,user:{id:USER}})});
 await assert.rejects(pending,/compte|foyer/i);assert.equal(f.f.session.user_id,OTHER);assert.equal(f.db.rows.get('session').value.user_id,OTHER);assert.equal(mutationRequests(f).length,0);
});

test('a refresh response for another Auth user is refused even when the local actor did not change',async()=>{
 const f=native();f.establish();f.f.session.expires_at=0;
 f.intercept(request=>request.path==='/auth/v1/token'?{ok:true,status:200,text:async()=>JSON.stringify({access_token:'TEST-wrong-user',refresh_token:'TEST-wrong-refresh',expires_in:3600,user:{id:OTHER}})}:null);
 await assert.rejects(f.api.authorized('POST','rpc/dobby_v7_update_member',{p_member_id:MEMBER}),/compte|identit/i);
 assert.equal(f.f.session.user_id,USER);assert.equal(f.db.rows.get('session').value.user_id,USER);assert.equal(mutationRequests(f).length,0);
});

test('a legitimate refresh of the same actor keeps its epoch and household and uses its new token',async()=>{
 const f=native();f.establish();const epoch=f.f.epoch;f.f.session.expires_at=0;
 await f.api.authorized('POST','rpc/dobby_v7_update_member',{p_member_id:MEMBER});
 assert.equal(f.f.session.user_id,USER);assert.equal(f.f.householdId,HH);assert.equal(f.f.epoch,epoch);assert.equal(f.db.rows.get('session').value.access_token,'TEST-access-refreshed');assert.equal(mutationRequests(f).length,1);assert.equal(mutationRequests(f)[0].options.headers.Authorization,'Bearer TEST-access-refreshed');
});

test('a same-actor 401 refresh retries with the refreshed token',async()=>{
 const f=native();f.establish();let attempts=0;f.intercept(request=>request.path.startsWith('/rest/v1/')&&attempts++===0?{ok:false,status:401,text:async()=>'{}'}:null);
 await f.api.authorized('POST','rpc/dobby_v7_update_member',{p_member_id:MEMBER});assert.equal(mutationRequests(f).length,2);assert.equal(mutationRequests(f)[1].options.headers.Authorization,'Bearer TEST-access-refreshed');
});

test('authenticated password updates and storage mutations share the same token-boundary guard',async t=>{
 for(const route of ['password','storage'])await t.test(route,async()=>{
  const f=native();f.establish();await f.api.access.ready;replaceWhenTokenReturns(f,{});
  const pending=route==='password'?f.api.access.updatePassword('TEST-new-fixture-password'):f.transport.storageFetch('DELETE',HH+'/00000000-0000-4000-8000-000000000099.pdf');
  await assert.rejects(pending,route==='password'?/indisponible|compte|foyer/i:/compte|foyer/i);assert.equal(f.requests.length,0);
 });
});

test('a storage 401 cannot refresh or resend the old file operation after an account replacement',async()=>{
 const f=native();f.establish();f.intercept(request=>request.path.startsWith('/storage/v1/')?{ok:false,status:401,json:async()=>{queueMicrotask(()=>f.switchAccount());return{};}}:null);
 await assert.rejects(f.transport.storageFetch('DELETE',HH+'/00000000-0000-4000-8000-000000000099.pdf'),/compte|foyer/i);
 assert.equal(f.requests.filter(request=>request.path.startsWith('/storage/v1/')).length,1);assert.equal(f.requests.some(request=>request.path==='/auth/v1/token'),false);
});

test('native account, connection and member permission projections all close together after capability verification is withdrawn',async()=>{
 const f=native({futureFeatures:true});await f.api.access.ready;await f.api.access.signIn('fixture@example.test','TEST-fixture-password');
 assert.equal(f.api.access.state().permissions.canLinkExistingChild,true);assert.equal(f.api.getContext().permissions.canLinkExistingChild,true);assert.equal(f.api.connectionState().permissions.canLinkExistingChild,true);assert.equal(f.readNativeMemberPermissions(CHILD).canLinkExistingChild,true);
 const registryBefore=JSON.stringify(f.sandbox.st),metadataBefore=JSON.stringify([...f.db.rows]);f.setCapabilities({...caps(),familyRolesVerified:false});
 assert.equal((await f.api.access.previewChildInvitation(TOKEN)).status,'unavailable');
 assert.equal(f.api.access.state().permissions.canLinkExistingChild,false);assert.equal(f.api.getContext().permissions.canLinkExistingChild,false);assert.equal(f.api.connectionState().permissions.canLinkExistingChild,false);
 // The native v23 function is loaded once above; use that actual projection.
 assert.equal(f.sandbox.window.__memberPermissions(CHILD).canLinkExistingChild,false);
 assert.equal(JSON.stringify(f.sandbox.st),registryBefore);assert.equal(JSON.stringify([...f.db.rows]),metadataBefore);
});

test('a native binding for another TEXT member cannot borrow the current controller permissions',async()=>{
 const f=native({futureFeatures:true});await f.api.access.ready;await f.api.access.signIn('fixture@example.test','TEST-fixture-password');
 f.f.accessContext={...f.f.accessContext,memberId:'local-other-member'};
 assert.equal(f.api.connectionState().identityVerified,false);assert.equal(Object.keys(f.api.connectionState().permissions).length,0);
 assert.equal(f.api.getContext().identityVerified,undefined);assert.equal(f.api.getContext().permissions,undefined);
});

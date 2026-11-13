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
 const db=database(),requests=[];let members=[],context={protocol:1,phase:'profile',userId:USER,profile:null},releaseAuth=null,releaseContext=null;
 const node=()=>({dataset:{},append(){},remove(){},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],style:{},elements:[],hidden:true});
 const sandbox={__accessModule:accessModule,st:{page:'home'},save(){},render(){},drawShop:()=>'',queueMicrotask,setInterval:()=>0,setTimeout,clearTimeout,crypto:webcrypto,TextEncoder,URL,URLSearchParams,btoa,
  document:{getElementById:()=>null,addEventListener(){},createElement:node,body:{append(){}}},window:{addEventListener(){},dispatchEvent(){}},CustomEvent:class{},navigator:{onLine:true},localStorage:{getItem:()=>null,setItem(){}},
  FormData:class{constructor(form){this.values=new Map(form.children.map(x=>[x.name,x.value]));}get(key){return this.values.get(key);}},
  fetch:async(url,options={})=>{const u=new URL(url);requests.push({path:u.pathname,query:u.search,options});const failure=httpFailures[u.pathname];if(failure)return{ok:false,status:failure.status,text:async()=>JSON.stringify(failure.body)};let body=[];if(u.pathname==='/auth/v1/token'){if(releaseAuth)await new Promise(resolve=>{releaseAuth.resolve=resolve;});body={access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,user:{id:USER,email:'fixture@example.test'}};}else if(u.pathname.endsWith('/dobby_v7_context')){const response=context;if(releaseContext)await new Promise(resolve=>releaseContext.releases.push(resolve));body=response;}else if(u.pathname.endsWith('/dobby_v2_memberships'))body=members;else if(u.pathname.endsWith('/dobby_v2_households'))body=[{id:HH}];return{ok:true,status:200,text:async()=>JSON.stringify(body)};}};
 sandbox.document.createElement=tag=>tag==='form'?{children:[],append(child){this.children.push(child);}}:node();
 const source=fs.readFileSync(new URL('../family-v2.js',import.meta.url),'utf8').replace("import('./family-access.mjs')",'Promise.resolve(__accessModule)').replace(/void boot\(\);\s*\}\)\(\);\s*$/,'window.__native={f,logout,...(typeof loadPublicKey===\"function\"?{loadPublicKey}:{})};})();');vm.runInNewContext(source,sandbox);
 const f=sandbox.window.__native.f;f.db=db;f.ready=true;f.key='sb_publishable_native_fixture_only';f.provider={start:async()=>{},reset(){},adoptVerifiedFamily:async value=>{assert.equal(value.memberId,'local-person');},html:()=>'',sync:async()=>{}};
 return{state:sandbox.st,api:sandbox.window.DobbyFamilyUI,f,db,requests,window:sandbox.window,loadPublicKey:sandbox.window.__native.loadPublicKey,setMembers:rows=>{members=rows;},setContext:value=>{context=value;},holdAuth:()=>{releaseAuth={resolve:null};return releaseAuth;},holdContext:()=>{releaseContext={releases:[]};return releaseContext;},releaseContext:()=>{const gate=releaseContext;releaseContext=null;for(const resolve of gate?.releases||[])resolve();},logout:()=>sandbox.window.__native.logout()};
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
 fixture.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'TEST Child',memberCategory:'child'},permissions:{canEdit:true,canMagic:true}});
 await fixture.api.access.ready;await fixture.api.access.signIn('fixture@example.test','fixture-password');
 fixture.state.familyMembers=[{id:'local-person',memberCategory:'child'}];
 const before=fixture.requests.length;
 await assert.rejects(fixture.api.authorized('PATCH','dobby_v2_modules?module=eq.recipes',{payload:{}}),/lecture seule/);
 await assert.rejects(fixture.api.authorized('POST','dobby_v2_grocery',{title:'TEST Forbidden'}),/lecture seule/);
 assert.equal(fixture.requests.length,before,'Forbidden writes never reach transport');
 await fixture.api.authorized('GET','dobby_v2_modules');
 assert.equal(fixture.requests.length,before+1,'Child shared read remains available');
});

test('reserves: canonical child role survives parsing and a locally promoted or missing registry row cannot authorize transport',async()=>{
 const fixture=native();fixture.f.core=familyCore;fixture.setMembers([{household_id:HH}]);
 fixture.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'TEST Child',memberCategory:'child'},permissions:{canEdit:true,canMagic:true}});
 await fixture.api.access.ready;await fixture.api.access.signIn('fixture@example.test','fixture-password');
 assert.equal(fixture.api.access.state().profile.memberCategory,'child','Server category is retained as canonical metadata');
 for(const members of [[{id:'local-person',memberCategory:'parent'}],[]]){
  fixture.state.familyMembers=members;const before=fixture.requests.length;
  await assert.rejects(fixture.api.authorized('PATCH','dobby_v2_modules?module=eq.recipes',{payload:{}}),/lecture seule|catégorie|vérifi/i);
  assert.equal(fixture.requests.length,before,'No request leaves transport after local role mutation or missing row');
 }
});

test('reserves: verified canonical parent is not demoted by a stale local child row',async()=>{
 const fixture=native();fixture.f.core=familyCore;fixture.setMembers([{household_id:HH}]);
 fixture.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'TEST Parent',memberCategory:'parent'},permissions:{canEdit:true,canMagic:true}});
 await fixture.api.access.ready;await fixture.api.access.signIn('fixture@example.test','fixture-password');
 fixture.state.familyMembers=[{id:'local-person',memberCategory:'child'}];const before=fixture.requests.length;
 await fixture.api.authorized('PATCH','dobby_v2_modules?module=eq.recipes',{payload:{}});
 assert.equal(fixture.requests.length,before+1);
});

test('reserves: an authenticated context without a category stays connected but cannot write shared data',async()=>{
 const fixture=native();fixture.f.core=familyCore;fixture.setMembers([{household_id:HH}]);
 fixture.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'TEST Legacy'},permissions:{canEdit:true}});
 await fixture.api.access.ready;await fixture.api.access.signIn('fixture@example.test','fixture-password');
 assert.equal(fixture.api.access.state().verified,true);assert.equal(fixture.f.session.user_id,USER);
 fixture.state.familyMembers=[{id:'local-person',memberCategory:'parent'}];const before=fixture.requests.length;
 await assert.rejects(fixture.api.authorized('PATCH','dobby_v2_modules?module=eq.family',{payload:{}}),/lecture seule|catégorie|vérifi/);assert.equal(fixture.requests.length,before);
});
test('reserves: malformed server category cannot become a canonical parent capability',async()=>{
 const fixture=native();fixture.f.core=familyCore;fixture.setMembers([{household_id:HH}]);
 fixture.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'TEST Invalid',memberCategory:'owner'},permissions:{canEdit:true}});
 await fixture.api.access.ready;await assert.rejects(fixture.api.access.signIn('fixture@example.test','fixture-password'),/catégorie|invalide/i);
 assert.equal(fixture.api.access.state().verified,false);assert.equal(fixture.f.session.user_id,USER,'Auth session is retained; only invalid canonical capability is refused');
});

test('reserves: transport rechecks canonical rights after awaiting a bearer token',async()=>{
 const fixture=native();fixture.f.core=familyCore;fixture.setMembers([{household_id:HH}]);
 fixture.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'TEST Parent',memberCategory:'parent'},permissions:{canEdit:true}});
 await fixture.api.access.ready;await fixture.api.access.signIn('fixture@example.test','fixture-password');
 const before=fixture.requests.length,pending=fixture.api.authorized('PATCH','dobby_v2_modules?module=eq.family',{payload:{}});
 fixture.f.verifiedContext=null;
 await assert.rejects(pending,/lecture seule|vérifi|catégorie/);assert.equal(fixture.requests.length,before,'Revoked identity cannot dispatch a write queued before await token');
});

test('reserves: file transport also rechecks role after awaiting its bearer',async()=>{
 const fixture=native();fixture.f.core=familyCore;fixture.setMembers([{household_id:HH}]);
 fixture.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'TEST Parent',memberCategory:'parent'},permissions:{canEdit:true}});
 await fixture.api.access.ready;await fixture.api.access.signIn('fixture@example.test','fixture-password');
 const before=fixture.requests.length,pending=fixture.api.storageFetch('DELETE',HH+'/00000000-0000-4000-8000-000000000099.pdf');fixture.f.verifiedContext=null;
 await assert.rejects(pending,/lecture seule|vérifi|catégorie/);assert.equal(fixture.requests.length,before,'Revoked role cannot dispatch a file deletion');
});

test('reserves: a queued request cannot reuse its old parent bearer after an account epoch switch',async()=>{
 for(const file of [false,true]){
  const fixture=native();fixture.f.core=familyCore;fixture.setMembers([{household_id:HH}]);
  fixture.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'TEST Parent',memberCategory:'parent'},permissions:{canEdit:true}});
  await fixture.api.access.ready;await fixture.api.access.signIn('fixture@example.test','fixture-password');const before=fixture.requests.length;
  const pending=file?fixture.api.storageFetch('DELETE',HH+'/00000000-0000-4000-8000-000000000099.pdf'):fixture.api.authorized('PATCH','dobby_v2_modules?module=eq.family',{payload:{}});
  fixture.f.epoch++;fixture.f.session={...fixture.f.session,user_id:'TEST-REPLACEMENT'};
  await assert.rejects(pending,/compte|foyer|contexte/);assert.equal(fixture.requests.length,before,'Old bearer never dispatches after account change');
 }
});

test('reserves: a replacement native Auth session cannot borrow the local fallback before V7 context refresh',async()=>{
 const fixture=native();fixture.f.core=familyCore;fixture.setMembers([{household_id:HH}]);
 fixture.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'TEST Parent',memberCategory:'parent'},permissions:{canEdit:true}});
 await fixture.api.access.ready;await fixture.api.access.signIn('fixture@example.test','fixture-password');
 fixture.f.epoch++;fixture.f.session={...fixture.f.session,user_id:'TEST-NEW-ACCOUNT',access_token:'fixture-new-account-token'};fixture.f.context=null;fixture.f.householdId=null;fixture.f.accessContext=null;fixture.f.verifiedContext=null;
 assert.equal(fixture.api.access.state().phase,'signed-out');assert.equal(fixture.api.access.state().userId,null,'Old V7 state is blank while the native session already has another authenticated user');
 const before=fixture.requests.length;
 for(const [query,body] of [['dobby_v2_grocery?household_id=eq.'+HH,{title:'TEST-unverified'}],['dobby_v2_modules?module=eq.family',{payload:{}}],['rpc/dobby_v7_update_profile',{p_profile:{firstName:'TEST not-yet-verified'}}]])
  await assert.rejects(fixture.api.authorized(query.startsWith('rpc/')?'POST':'PATCH',query,body),/lecture seule|vérifi|catégorie/);
 assert.equal(fixture.requests.length,before,'A fresh request captures the new epoch but still cannot dispatch without canonical context');
 for(const name of ['dobby_v7_context','dobby_v7_preview_invitation','dobby_missions_v2_capabilities'])await fixture.api.authorized('POST','rpc/'+name,{});
 assert.equal(fixture.requests.length,before+3,'Read-only RPCs remain available even in the new-session blank-context window');assert.equal(fixture.api.access.state().verified,false);
});

test('reserves: native role adaptation preserves context reads and authenticated pre-household setup',async()=>{
 const fixture=native();fixture.f.core=familyCore;await fixture.api.access.ready;await fixture.api.access.signIn('fixture@example.test','fixture-password');
 for(const name of ['dobby_v7_context','dobby_v7_preview_invitation','dobby_missions_v2_capabilities'])await fixture.api.authorized('POST','rpc/'+name,{});
 await fixture.api.access.saveProfile({firstName:'TEST Draft'});
 assert.equal(fixture.requests.filter(r=>r.path.endsWith('/dobby_v7_update_profile')).length,1);
 fixture.setContext({protocol:1,phase:'household',userId:USER,profile:{firstName:'TEST Draft',name:'TEST Draft'}});await fixture.api.access.refresh();
 await fixture.api.access.createHousehold('TEST New Household');await fixture.api.access.acceptInvitation('opaque-fixture-invitation');
 assert.equal(fixture.requests.filter(r=>r.path.endsWith('/dobby_v7_create_household')).length,1);assert.equal(fixture.requests.filter(r=>r.path.endsWith('/dobby_v7_accept_invitation')).length,1);
});

test('reserves: native parent write grants remain authoritative and do not depend on family member creation',async()=>{
 for(const canEdit of [false,undefined,true]){
  const fixture=native();fixture.f.core=familyCore;fixture.setMembers([{household_id:HH}]);
  fixture.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'TEST Parent',memberCategory:'parent'},permissions:{...(canEdit===undefined?{}:{canEdit}),canMagic:true,canCreate:false}});
  await fixture.api.access.ready;await fixture.api.access.signIn('fixture@example.test','fixture-password');const before=fixture.requests.length;
  const pending=fixture.api.authorized('POST','dobby_v2_grocery',{title:'TEST New Article'});
  if(canEdit===true){await pending;assert.equal(fixture.requests.length,before+1);}else{await assert.rejects(pending,/lecture seule|vérifi/);assert.equal(fixture.requests.length,before);}
 }
});
test('reserves: native own-magic RPC requires the server magic grant rather than a parent or child label',async()=>{
 for(const category of ['parent','child'])for(const canMagic of [false,undefined,true]){
  const fixture=native();fixture.f.core=familyCore;fixture.setMembers([{household_id:HH}]);
  fixture.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'TEST Magic',memberCategory:category},permissions:{canEdit:category==='parent',...(canMagic===undefined?{}:{canMagic})}});
  await fixture.api.access.ready;await fixture.api.access.signIn('fixture@example.test','fixture-password');const before=fixture.requests.length;
  const pending=fixture.api.authorized('POST','rpc/dobby_v7_update_magic',{p_member_id:'local-person',p_values:{magicHouseId:'ravenclaw'}});
  if(canMagic===true){await pending;assert.equal(fixture.requests.length,before+1);}else{await assert.rejects(pending,/lecture seule|vérifi/);assert.equal(fixture.requests.length,before);}
 }
});

test('reserves: visible legacy login refreshes the same canonical V7 parent context without another Auth or data mutation',async()=>{
 const fixture=native();fixture.f.core=familyCore;fixture.setMembers([{household_id:HH}]);
 fixture.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'TEST Parent',memberCategory:'parent'},permissions:{canEdit:true,canMagic:true,canCreate:false},familyRevision:1});
 await fixture.api.signIn('fixture@example.test','fixture-password');
 assert.equal(fixture.api.access.state().verified,true,'The existing legacy form must adopt the confirmed V7 identity');assert.equal(fixture.api.getContext().memberId,'local-person');
 assert.equal(fixture.requests.filter(r=>r.path==='/auth/v1/token').length,1,'Canonical refresh does not repeat credential Auth');
 assert.equal(fixture.requests.filter(r=>r.options.method!=='GET'&&!['/auth/v1/token','/rest/v1/rpc/dobby_v7_context'].includes(r.path)).length,0,'Bridge only reads context and family; no new business mutation');
 const before=fixture.requests.length;await fixture.api.authorized('PATCH','dobby_v2_grocery?household_id=eq.'+HH,{title:'TEST authorized'});assert.equal(fixture.requests.length,before+1);
});
test('reserves: legacy login keeps its session and reads when V7 is absent or refused, but remains readonly',async()=>{
 for(const status of [404,403]){
 const fixture=native({httpFailures:{'/rest/v1/rpc/dobby_v7_context':{status,body:{code:status===404?'PGRST202':'42501',message:'TEST unavailable V7'}}}});fixture.f.core=familyCore;fixture.setMembers([{household_id:HH}]);
 await fixture.api.signIn('fixture@example.test','fixture-password');
 assert.equal(fixture.f.session.user_id,USER);assert.equal(fixture.api.getContext().householdId,HH);assert.equal(fixture.api.access.state().verified,false);
 assert.equal(fixture.requests.filter(r=>r.path==='/rest/v1/rpc/dobby_v7_context').length,1,'Legacy login attempts the canonical read even when unavailable');
 assert.match(fixture.api.grocery.read().status,/lecture seule|droits.*vérifi/i,'Unavailable canonical rights are reported honestly');
 await fixture.api.authorized('GET','dobby_v2_grocery?household_id=eq.'+HH);const before=fixture.requests.length;
 await assert.rejects(fixture.api.authorized('PATCH','dobby_v2_grocery?household_id=eq.'+HH,{title:'TEST forbidden'}),/lecture seule|vérifi/);assert.equal(fixture.requests.length,before);
 }
});

test('reserves: native Sync revalidates a cached session before restoring shared writes',async()=>{
 const fixture=native();fixture.f.core=familyCore;fixture.setMembers([{household_id:HH}]);
 fixture.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'TEST Parent',memberCategory:'parent'},permissions:{canEdit:true,canMagic:true},familyRevision:1});
 await fixture.api.access.ready;await fixture.api.access.signIn('fixture@example.test','fixture-password');fixture.f.accessContext=null;fixture.f.verifiedContext=null;
 assert.equal(fixture.api.access.state().verified,false);const before=fixture.requests.filter(r=>r.path==='/rest/v1/rpc/dobby_v7_context').length;
 await fixture.api.grocery.sync();
 assert.equal(fixture.api.access.state().verified,true,'Sync must re-read and adopt canonical context after the ephemeral binding is lost');assert.equal(fixture.requests.filter(r=>r.path==='/rest/v1/rpc/dobby_v7_context').length,before+1);
 assert.equal(fixture.requests.filter(r=>r.path==='/auth/v1/token').length,1,'A valid cached session does not repeat credential Auth');
});
test('reserves: Sync remains readonly while V7 is unavailable and only a confirmed canonical response restores writes',async()=>{
 const failures={'/rest/v1/rpc/dobby_v7_context':{status:404,body:{code:'PGRST202',message:'TEST missing V7'}}},fixture=native({httpFailures:failures});fixture.f.core=familyCore;fixture.setMembers([{household_id:HH}]);
 fixture.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'TEST Parent',memberCategory:'parent'},permissions:{canEdit:true,canMagic:true},familyRevision:1});
 await fixture.api.signIn('fixture@example.test','fixture-password');const before=fixture.requests.filter(r=>r.path==='/rest/v1/rpc/dobby_v7_context').length;
 await fixture.api.grocery.sync();assert.equal(fixture.requests.filter(r=>r.path==='/rest/v1/rpc/dobby_v7_context').length,before+1);assert.equal(fixture.api.access.state().verified,false);
 await assert.rejects(fixture.api.authorized('PATCH','dobby_v2_grocery?household_id=eq.'+HH,{title:'TEST still forbidden'}),/lecture seule|vérifi/);
 delete failures['/rest/v1/rpc/dobby_v7_context'];await fixture.api.grocery.sync();assert.equal(fixture.api.access.state().verified,true);const count=fixture.requests.length;
 await fixture.api.authorized('PATCH','dobby_v2_grocery?household_id=eq.'+HH,{title:'TEST confirmed'});assert.equal(fixture.requests.length,count+1);assert.equal(fixture.requests.filter(r=>r.path==='/auth/v1/token').length,1);
});


test('reserves: Sync waits for a canonical bootstrap refresh already in progress before draining',async()=>{
 const fixture=native();fixture.f.core=familyCore;fixture.setMembers([{household_id:HH}]);
 fixture.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'TEST Parent',memberCategory:'parent'},permissions:{canEdit:true,canMagic:true},familyRevision:1});
 await fixture.api.access.ready;await fixture.api.access.signIn('fixture@example.test','fixture-password');fixture.f.accessContext=null;fixture.f.verifiedContext=null;
 const count=()=>fixture.requests.filter(r=>r.path==='/rest/v1/rpc/dobby_v7_context').length,before=count(),gate=fixture.holdContext(),refresh=fixture.api.access.refresh();
 while(!gate.releases.length)await Promise.resolve();const syncing=fixture.api.grocery.sync(),outcome=Promise.allSettled([refresh,syncing]);
 for(let tick=0;tick<100;tick++)await Promise.resolve();const inFlight=count()-before;fixture.releaseContext();const results=await outcome;
 assert.equal(inFlight,1,'Bootstrap and Sync must not invalidate the same canonical binding concurrently');assert.ok(results.every(result=>result.status==='fulfilled'));assert.equal(fixture.api.access.state().verified,true);assert.equal(count()-before,1);
});
test('reserves: public canonical refresh waits for the current Sync drain and still makes a fresh read',async()=>{
 const fixture=native();fixture.f.core=familyCore;fixture.setMembers([{household_id:HH}]);
 fixture.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'TEST Parent',memberCategory:'parent'},permissions:{canEdit:true,canMagic:true},familyRevision:1});
 await fixture.api.access.ready;await fixture.api.access.signIn('fixture@example.test','fixture-password');fixture.f.accessContext=null;fixture.f.verifiedContext=null;
 const count=()=>fixture.requests.filter(r=>r.path==='/rest/v1/rpc/dobby_v7_context').length,before=count(),gate=fixture.holdContext(),syncing=fixture.api.grocery.sync();
 while(!gate.releases.length)await Promise.resolve();const refresh=fixture.api.access.refresh(),outcome=Promise.allSettled([syncing,refresh]);
 for(let tick=0;tick<100;tick++)await Promise.resolve();const inFlight=count()-before;fixture.releaseContext();const results=await outcome;
 assert.equal(inFlight,1,'A public refresh cannot clear identity while Sync is validating/draining');assert.ok(results.every(result=>result.status==='fulfilled'));assert.equal(count()-before,2,'The public refresh performs a new read after Sync rather than returning a cached GET');
 assert.equal(fixture.api.access.state().verified,true);
});


test('reserves: queued public refresh makes a fresh GET after an earlier context response',async()=>{
 const fixture=native();fixture.f.core=familyCore;fixture.setMembers([{household_id:HH}]);
 const current={protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'TEST Before',memberCategory:'parent'},permissions:{canEdit:true,canMagic:true},familyRevision:1};fixture.setContext(current);
 await fixture.api.access.ready;await fixture.api.access.signIn('fixture@example.test','fixture-password');const gate=fixture.holdContext(),first=fixture.api.access.refresh();
 while(!gate.releases.length)await Promise.resolve();const second=fixture.api.access.refresh(),outcome=Promise.all([first,second]);fixture.setContext({...current,familyRevision:2,profile:{...current.profile,name:'TEST After Confirmed Update'}});
 for(let tick=0;tick<50;tick++)await Promise.resolve();assert.equal(gate.releases.length,1,'Later refresh waits rather than borrowing or racing the earlier GET');fixture.releaseContext();const [oldRead,freshRead]=await outcome;
 assert.equal(oldRead.familyRevision,1);assert.equal(freshRead.familyRevision,2);assert.equal(freshRead.profile.name,'TEST After Confirmed Update');
});
test('reserves: a context refresh queued behind Sync cannot cross an account epoch replacement',async()=>{
 const fixture=native();fixture.f.core=familyCore;fixture.setMembers([{household_id:HH}]);fixture.setContext({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:'local-person',profile:{id:'local-person',name:'TEST Parent',memberCategory:'parent'},permissions:{canEdit:true,canMagic:true},familyRevision:1});
 await fixture.api.access.ready;await fixture.api.access.signIn('fixture@example.test','fixture-password');fixture.f.accessContext=null;fixture.f.verifiedContext=null;const gate=fixture.holdContext(),syncing=fixture.api.grocery.sync();
 while(!gate.releases.length)await Promise.resolve();const refresh=fixture.api.access.refresh(),outcome=Promise.allSettled([syncing,refresh]),before=fixture.requests.length;
 fixture.f.epoch++;fixture.f.session={...fixture.f.session,user_id:'TEST-NEW-ACCOUNT'};fixture.f.householdId='TEST-OTHER-HOME';fixture.f.context=null;fixture.f.accessContext=null;fixture.f.verifiedContext=null;fixture.releaseContext();const results=await outcome;
 assert.equal(results[1].status,'rejected');assert.match(results[1].reason.message,/compte|foyer/);assert.equal(fixture.requests.length,before,'No queued read dispatches with the replacement owner');assert.equal(fixture.f.session.user_id,'TEST-NEW-ACCOUNT');
});

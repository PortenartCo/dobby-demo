import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import * as accessModule from '../family-access.mjs';
import * as familyCore from '../family-core.mjs';
import * as runes from '../family-runes-core.mjs';

// Actual native transport + access controller + module provider. Only IndexedDB,
// DOM and the remote HTTP service are fictional; no active binding is mocked.
const USER='00000000-0000-4000-8000-000000000001',OTHER_USER='00000000-0000-4000-8000-000000000002',HH='00000000-0000-4000-8000-000000000010',MEMBER='local-parent-bootstrap';
const clone=value=>JSON.parse(JSON.stringify(value));
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const family=()=>({familyMembers:[{id:MEMBER,name:'TEST Parent A',memberCategory:'parent',magicProfile:{version:1,houseId:'ravenclaw',patronusId:'otter',ceremonyStatus:'complete'}},{id:'local-parent-b',name:'TEST Parent B',memberCategory:'parent'}],famContacts:[],famLists:[],familyEvents:[],sharedHealthVisits:[],sharedFamilyNotes:[],familyNotesVersion:1,familyPreparationTemplates:[],familyEventPreparations:[],familyPreparationsVersion:1,futureFamily:{keep:true}});
function gate(){let release,started;const began=new Promise(resolve=>started=resolve),pending=new Promise(resolve=>release=resolve);return{began,pending,started,release,used:false};}
function fixture(t){
 const rows=new Map(),items=new Map(),requests=[],metaGates=[],httpGates=[],backups=[];
 const payload=family(),row={household_id:HH,module:'family',payload,revision:4,updated_at:'2026-11-13T12:00:00Z'};
 const states={family:{active:true,revision:4,synced:JSON.stringify(canonical(payload)),conflict:false,familyProtocol:true,preparationsProtocol:true}};
 for(const[id,value]of [['publicKey','sb_publishable_bootstrap_fixture'],['session',{user_id:USER,access_token:'TEST-access',refresh_token:'TEST-refresh',expires_at:Math.floor(Date.now()/1000)+3600}],['verifiedContext',USER+'|'+HH],['deviceHouseholdId',HH],['v2-module-state:'+USER+'|'+HH,states],['unrelated-local-note',{keep:'TEST'}]])rows.set(id,{id,value:clone(value)});
 const db={objectStoreNames:{contains:()=>true},transaction(store){const tx={pending:0,aborted:false,abort(){tx.aborted=true;queueMicrotask(()=>tx.onabort?.());}};
  tx.objectStore=()=>{const call=(operation,key,produce)=>{const req={};tx.pending++;const perform=()=>{if(tx.aborted)return;try{req.result=produce();req.onsuccess?.();}catch(error){tx.error=error;tx.onerror?.();}finally{tx.pending--;if(!tx.pending&&!tx.aborted)queueMicrotask(()=>tx.oncomplete?.());}};
   queueMicrotask(()=>{const hold=store==='meta'&&operation==='get'?metaGates.find(g=>!g.used&&g.key===key):null;if(hold){hold.used=true;hold.started();void hold.pending.then(perform);}else perform();});return req;};const map=store==='meta'?rows:items;
   return{get:key=>call('get',key,()=>map.get(key)),put:value=>call('put',value.id,()=>map.set(value.id,clone(value))),delete:key=>call('delete',key,()=>map.delete(key)),getAll:()=>call('getAll',null,()=>[...map.values()])};};return tx;}};
 const node=()=>({dataset:{},append(){},remove(){},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],style:{},elements:[],hidden:true});
 const st={page:'family',planned:{},shopHistory:{},shopFinal:null,shopChoice:{},customRecipes:[],tmAdaptations:{},autoTasks:[],manualMissions:[],runeCredits:[],runeRequests:[],houseItems:[],houseLogs:[],familyDocs:[],famHealth:[],...clone(payload)};
 const sandbox={__accessModule:accessModule,__familyCore:familyCore,st,custom:st.customRecipes,save(){},render(){},drawShop:()=>'',queueMicrotask,setInterval:()=>0,setTimeout,clearTimeout,crypto:webcrypto,TextEncoder,URL,URLSearchParams,btoa,confirm:()=>false,console,
  document:{getElementById:()=>null,addEventListener(){},createElement:node,body:{append(){}}},window:{addEventListener(){},dispatchEvent(){},DobbyRunesReady:Promise.resolve(runes)},CustomEvent:class{},navigator:{onLine:true},localStorage:{getItem:()=>null,setItem:(key,value)=>backups.push({key,value})},
  indexedDB:{open(){const req={};queueMicrotask(()=>{req.result=db;req.onsuccess?.();});return req;}},
  fetch:async(url,options={})=>{const u=new URL(url);const request={path:u.pathname,query:u.search,method:options.method,householdAtSend:sandbox.window.__native.f.householdId};requests.push(request);
   const hold=httpGates.find(g=>!g.used&&g.match(request));if(hold){hold.used=true;hold.started();await hold.pending;}
   let body=[];
   if(u.pathname.endsWith('/token'))body={access_token:'TEST-other-access',refresh_token:'TEST-other-refresh',expires_in:3600,user:{id:OTHER_USER}};
   else if(u.pathname.endsWith('/dobby_v7_context')){const other=options.headers?.Authorization==='Bearer TEST-other-access',member=payload.familyMembers[other?1:0];body={protocol:1,phase:'active',userId:other?OTHER_USER:USER,householdId:HH,memberId:member.id,profile:clone(member),permissions:{canEdit:true,canMagic:true,canCreate:true,canManageDependents:true,canInvite:true},familyRevision:4,pendingCeremony:false};}
   else if(u.pathname.endsWith('/dobby_missions_v2_capabilities'))body={protocol:2,directWritesBlocked:true,maxPayloadBytes:262144};
   else if(u.pathname.endsWith('/dobby_v2_memberships'))body=[{household_id:HH}];
   else if(u.pathname.endsWith('/dobby_v2_households'))body=[{id:HH}];
   else if(u.pathname.endsWith('/dobby_v2_modules'))body=u.searchParams.has('module')?[clone(row)]:[{module:'family'}];
   if(options.method!=='GET'&&!u.pathname.endsWith('/dobby_v7_context')&&!u.pathname.endsWith('/token'))throw Error('Unexpected business write in bootstrap fixture');
   return{ok:true,status:200,text:async()=>JSON.stringify(body)};
  }};
 const nativeSource=fs.readFileSync(new URL('../family-v2.js',import.meta.url),'utf8').replace("import('./family-access.mjs')",'Promise.resolve(__accessModule)').replace("await import('./family-core.mjs')",'await Promise.resolve(__familyCore)').replace(/void boot\(\);\s*\}\)\(\);\s*$/,'window.__native={f,boot,sync,requireHousehold,restoreCachedHousehold};})();');
 const context=vm.createContext(sandbox);vm.runInContext(nativeSource,context);
 vm.runInContext(fs.readFileSync(new URL('../family-modules.js',import.meta.url),'utf8'),context);
 const native=sandbox.window.__native,api=sandbox.window.DobbyFamilyUI;
 t.after(()=>native.f.provider?.reset());
 return{native,api,rows,requests,st,backups,row,
  holdMeta(key){const g={...gate(),key};metaGates.push(g);return g;},holdHttp(match){const g={...gate(),match};httpGates.push(g);return g;},
  restoreWithoutBoot(){native.f.db=db;native.f.key='sb_publishable_bootstrap_fixture';native.f.session=clone(rows.get('session').value);native.f.ready=true;return native.restoreCachedHousehold();}};
}

test('native readiness waits for cached-household restoration before automatic access refresh',async t=>{
 const f=fixture(t),restore=f.holdMeta('verifiedContext'),rpc=f.holdHttp(r=>r.path.endsWith('/dobby_v7_context'));
 const boot=f.native.boot();await restore.began;
 const readyBeforeRestore=f.api.connectionState().ready;
 let refresh;
 if(readyBeforeRestore){refresh=f.api.access.refresh();await rpc.began;}
 restore.release();await boot;
 if(!refresh){refresh=f.api.access.refresh();await rpc.began;}
 rpc.release();let error;await refresh.catch(value=>error=value);
 await f.native.sync();
 assert.equal(error,undefined,'cached restoration must not invalidate the first context request');
 assert.equal(readyBeforeRestore,false,'ready must not expose a session while its cached household is still being restored');
 assert.equal(f.api.access.state().phase,'active');assert.equal(f.api.access.state().verified,true);assert.equal(f.api.getContext().memberId,MEMBER);
 assert.equal(f.requests.find(r=>r.path.endsWith('/dobby_v7_context')).householdAtSend,HH);
 assert.equal(f.rows.get('unrelated-local-note').value.keep,'TEST');assert.equal(f.row.revision,4);
});

test('overlapping native membership verification cannot invalidate the provider while access adopts the restored family',async t=>{
 const f=fixture(t);await f.restoreWithoutBoot();
 const restore=f.holdMeta('v2-module-state:'+USER+'|'+HH),refresh=f.api.access.refresh();await restore.began;
 const membership=f.holdHttp(r=>r.path.endsWith('/dobby_v2_memberships'));
 const background=f.native.sync();
 // Public sync/read serialization must prevent a second membership check
 // from clearing verifiedContext while the provider restores cached state.
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(membership.used,false,'background verification waits until the current canonical read has finished');
 restore.release();let error;await refresh.catch(value=>error=value);
 membership.release();await background;
 assert.equal(error,undefined,'a concurrent membership read must not abort canonical adoption');
 assert.equal(f.api.access.state().verified,true);assert.equal(f.api.getContext().memberId,MEMBER);
 assert.deepEqual(clone(f.st.familyMembers),family().familyMembers);assert.equal(f.row.revision,4);
});

test('an old household flight cannot be reused by or clear the binding of a newly signed-in actor',async t=>{
 const f=fixture(t);await f.restoreWithoutBoot();
 f.rows.set('v2-module-state:'+OTHER_USER+'|'+HH,{id:'v2-module-state:'+OTHER_USER+'|'+HH,value:clone(f.rows.get('v2-module-state:'+USER+'|'+HH).value)});
 const membership=f.holdHttp(r=>r.path.endsWith('/dobby_v2_memberships'));
 const oldRefresh=f.api.access.refresh().catch(error=>error);await membership.began;
 const signedIn=await f.api.access.signIn('test-other@example.invalid','TEST-fixture-password');
 assert.equal(signedIn.verified,true);assert.equal(signedIn.userId,OTHER_USER);assert.equal(signedIn.memberId,'local-parent-b');
 membership.release();const stale=await oldRefresh;
 assert.match(stale.message,/changé|remplacée/);
 assert.equal(f.api.access.state().userId,OTHER_USER);assert.equal(f.api.access.state().verified,true);
 assert.equal(f.api.getContext().memberId,'local-parent-b');assert.equal(f.rows.get('session').value.user_id,OTHER_USER);
 assert.equal(f.rows.get('verifiedContext').value,OTHER_USER+'|'+HH);
 assert.equal(f.requests.filter(r=>r.path.endsWith('/dobby_v2_memberships')).length,2);
});

test('bootstrap revalidates the existing canonical profile without adopting over pending local family edits',async t=>{
 const f=fixture(t);await f.restoreWithoutBoot();
 const stored=clone(f.rows.get('v2-module-state:'+USER+'|'+HH));
 f.st.familyMembers[0].name='TEST local edit awaiting sync';
 const access=await f.api.access.refresh();
 assert.equal(access.verified,true,'canonical identity may be revalidated while native edits remain pending');
 assert.equal(f.st.familyMembers[0].name,'TEST local edit awaiting sync');
 assert.deepEqual(f.rows.get('v2-module-state:'+USER+'|'+HH),stored);
 assert.equal(f.row.revision,4);assert.equal(f.backups.length,0,'revalidation does not replace the local registry');
});

test('bootstrap still refuses a device marker belonging to another household',async t=>{
 const f=fixture(t);await f.restoreWithoutBoot();
 const marker='00000000-0000-4000-8000-000000000099';f.rows.set('deviceHouseholdId',{id:'deviceHouseholdId',value:marker});
 const before=clone(f.st.familyMembers);
 await assert.rejects(f.api.access.refresh(),/données locales d’un autre foyer/);
 assert.equal(f.rows.get('deviceHouseholdId').value,marker);assert.deepEqual(clone(f.st.familyMembers),before);
 assert.equal(f.api.access.state().verified,false);assert.equal(f.requests.some(r=>r.path.endsWith('/dobby_v2_modules')),false);
});

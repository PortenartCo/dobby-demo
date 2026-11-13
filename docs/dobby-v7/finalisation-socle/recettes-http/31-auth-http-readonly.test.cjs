const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {run}=require('./31-auth-http-readonly.js');

const USER='TEST_PRIVATE_AUTH_A',HH='TEST_PRIVATE_HOUSEHOLD',MEMBER='TEST_PRIVATE_TEXT_MEMBER',TOKEN='TEST_PRIVATE_ACCESS_TOKEN',KEY='sb_publishable_TEST_PUBLIC_KEY';
function fixture({unbound=false,parentB=false}={}){
 const owner={epoch:4,userId:parentB?'TEST_PRIVATE_AUTH_B':USER,householdId:unbound?null:HH,memberId:unbound?null:MEMBER};
 const account={phase:unbound?'profile':'active',authenticated:true,verified:!unbound,...owner,profile:unbound?null:{id:MEMBER,name:'TEST_PRIVATE_PERSON_NAME',memberCategory:'parent'},permissions:{canEdit:!unbound,canManageHousehold:false,canLinkExistingChild:false,canInvite:!parentB},capabilities:{protocol:2,familyRolesReady:false,childAccountLinkReady:false}};
 const context=()=>unbound?{protocol:1,phase:'profile',userId:owner.userId,profile:null}:{protocol:1,phase:'active',userId:owner.userId,householdId:owner.householdId,memberId:owner.memberId,category:'parent',profile:{id:owner.memberId,memberCategory:'parent',name:'TEST_PRIVATE_PERSON_NAME',magicProfile:{opaque:'TEST_PRIVATE_HISTORY'}}};
 const family={protocol:2,installed:true,familyRolesAvailable:true,childAccountLinkAvailable:true,storagePoliciesPresent:true,canonicalIdentity:!unbound,familyRolesVerified:false,childAccountLinkVerified:false,storagePoliciesVerified:false,missionsV3Verified:false};
 const missions={protocol:3,contract:'dobby-missions-intents-v3-1',intentVersion:1,participantVersion:1,ledgerVersions:[1,2,3],maxPayloadBytes:262144,directWritesBlocked:true,atomicAllocations:true,canonicalAuthorization:true,clientVerified:false};
 const metadata={session:{user_id:owner.userId,access_token:TOKEN,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'TEST_PRIVATE_REFRESH_TOKEN',email:'private-fixture@example.invalid'},publicKey:KEY};
 const calls=[];let rpcIntercept=null,fetchIntercept=null,metaIntercept=null;
 const api={connectionState:()=>({...owner,ready:true,configured:true,verifying:false}),access:{state:()=>structuredClone({...account,userId:owner.userId,memberId:owner.memberId})},getContext:()=>unbound?null:{...owner,identityVerified:true},
  authorized(){throw Error('FORBIDDEN_AUTHORIZED_MAY_REFRESH');},
  putMeta(){throw Error('FORBIDDEN_METADATA_WRITE');},updateMeta(){throw Error('FORBIDDEN_METADATA_WRITE');},
  meta:async key=>{calls.push({kind:'meta',key});assert.ok(['session','publicKey'].includes(key));if(metaIntercept){const value=await metaIntercept(key);if(value!==undefined)return value;}return structuredClone(metadata[key]);}};
 const native={location:{origin:'https://portenartco.github.io',pathname:'/dobby-demo/essai-stitch-v5-famille/index.html'},DobbyFamilyUI:api,AbortController,
  fetch:async(url,options)=>{const parsed=new URL(url),path=parsed.pathname.replace('/rest/v1/','');calls.push({kind:'fetch',url,path,options});assert.equal(parsed.origin,'https://pqcdkrwljgvgagzwrcmg.supabase.co');assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,'Bearer '+TOKEN);assert.equal(options.headers.apikey,KEY);assert.equal(options.body,undefined);assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');
   const response=body=>({ok:true,status:200,json:async()=>structuredClone(body)});
   if(path.startsWith('rpc/')){assert.ok(['rpc/dobby_v7_context','rpc/dobby_v7_family_capabilities','rpc/dobby_missions_v3_capabilities'].includes(path));if(rpcIntercept){const body=await rpcIntercept(path);if(body!==undefined)return typeof body?.json==='function'?body:response(body);}
    if(path==='rpc/dobby_v7_context')return response(context());if(path==='rpc/dobby_v7_family_capabilities')return response(family);assert.equal(parsed.searchParams.get('p_household_id'),HH);assert.deepEqual([...parsed.searchParams.keys()],['p_household_id']);return response(missions);}
   assert.equal(parsed.pathname,'/auth/v1/user');assert.equal(parsed.search,'');if(fetchIntercept)return fetchIntercept(url,options);return response({id:owner.userId,email:'private-fixture@example.invalid',email_confirmed_at:'2026-11-13T12:00:00Z',is_anonymous:false,private:'TEST_PRIVATE_AUTH_PAYLOAD'});}};
 const host={location:{origin:'https://portenartco.github.io',pathname:'/dobby-demo/essai-stitch-v7/famille.html'},DobbyPublicConfig:{projectRef:'pqcdkrwljgvgagzwrcmg'},DobbyFamilyStitchEngine:{win:()=>native}};
 return{host,native,api,owner,account,family,missions,metadata,calls,rpc:fn=>rpcIntercept=fn,http:fn=>fetchIntercept=fn,meta:fn=>metaIntercept=fn};
}
function assertPrivate(report){const text=JSON.stringify(report);for(const value of [USER,HH,MEMBER,TOKEN,KEY,'TEST_PRIVATE_AUTH_B','TEST_PRIVATE_REFRESH_TOKEN','TEST_PRIVATE_PERSON_NAME','TEST_PRIVATE_HISTORY','TEST_PRIVATE_AUTH_PAYLOAD','private-fixture@example.invalid'])assert.equal(text.includes(value),false,value);}

test('Parent A and B use exactly four direct GET reads, without native authorized, refresh or metadata writes',async t=>{
 for(const parentB of [false,true])await t.test(parentB?'B':'A',async()=>{
  const f=fixture({parentB}),before=JSON.stringify({owner:f.owner,account:f.account,metadata:f.metadata});const report=await run({hostWindow:f.host});
  assert.equal(report.result,'PASS');assert.equal(report.actorClass,'parent-linked');assert.equal(report.authUserHttpVerified,true);assert.equal(report.passwordGrantObservedByProbe,false);assert.equal(report.checks.serverPublicationProofFlagsClosed,true);
  assert.equal(f.calls.filter(call=>call.kind==='fetch'&&call.path.startsWith('rpc/')).length,3);assert.equal(f.calls.filter(call=>call.kind==='fetch').length,4);assert.equal(report.automaticRefreshRequested,false);assert.equal(report.localMetadataWritesRequested,false);assert.equal(before,JSON.stringify({owner:f.owner,account:f.account,metadata:f.metadata}));assertPrivate(report);
 });
});
test('the third Auth has no profile/household created and never probes Missions with a guessed ID',async()=>{
 const f=fixture({unbound:true}),before=JSON.stringify(f.metadata),report=await run({hostWindow:f.host});
 assert.equal(report.result,'PASS');assert.equal(report.actorClass,'confirmed-auth-without-profile-or-household');assert.equal(report.missionsCapabilityProbe,'not-applicable-before-household-binding');assert.equal(f.calls.some(call=>call.path==='rpc/dobby_missions_v3_capabilities'),false);assert.equal(f.account.profile,null);assert.equal(f.owner.householdId,null);assert.equal(before,JSON.stringify(f.metadata));assertPrivate(report);
});
test('opened proof flags or an incomplete capability contract fail without opening or repairing anything',async()=>{
 const f=fixture();f.family.familyRolesVerified=true;f.missions.atomicAllocations=false;const report=await run({hostWindow:f.host});
 assert.equal(report.result,'FAIL');assert.equal(report.checks.serverPublicationProofFlagsClosed,false);assert.equal(report.checks.missionsCapabilityContract,false);assert.equal(f.family.familyRolesVerified,true);assertPrivate(report);
});
test('the script rejects another site or project before any request',async t=>{
 for(const kind of ['site','project'])await t.test(kind,async()=>{const f=fixture();if(kind==='site')f.host.location.origin='https://another.invalid';else f.host.DobbyPublicConfig.projectRef='professional-project-not-allowed';const report=await run({hostWindow:f.host});assert.equal(report.result,'FAIL');assert.equal(f.calls.length,0);assertPrivate(report);});
});
test('native readiness reports only booleans and a fixed phase before each local readiness refusal',async t=>{
 const cases=[
  ['ready',c=>({...c,ready:false}),null,'ready'],
  ['configured',c=>({...c,configured:false}),null,'configured'],
  ['verifying',c=>({...c,verifying:true}),null,'verifying'],
  ['hasUserId',c=>({...c,userId:null}),null,'hasUserId'],
  ['accessAuthenticated',null,a=>({...a,authenticated:false}),'accessAuthenticated'],
  ['accessAuthenticatedAbsent',null,a=>{const copy={...a};delete copy.authenticated;return copy;},'accessAuthenticated'],
  ['sessionMatchesAccess',null,a=>({...a,userId:'TEST_PRIVATE_AUTH_B'}),'sessionMatchesAccess'],
  ['epochInteger',c=>({...c,epoch:undefined}),null,'epochInteger'],
  ['unknownPhase',c=>({...c,ready:false}),a=>({...a,phase:TOKEN}),'ready']
 ];
 for(const[name,changeConnection,changeAccount,field]of cases)await t.test(name,async()=>{
  const f=fixture(),connection=f.api.connectionState,state=f.api.access.state;
  if(changeConnection)f.api.connectionState=()=>changeConnection(connection());if(changeAccount)f.api.access.state=()=>changeAccount(state());
  const report=await run({hostWindow:f.host});assert.equal(report.result,'FAIL');assert.equal(report.reference,'SESSION_NON_PRETE');assert.equal(report.stage,'native-interface');assert.equal(report.actorClass,null);assert.deepEqual(report.checks,{});assert.equal(f.calls.length,0);
  const readiness=report.nativeReadiness;assert.equal(readiness[field],field==='verifying');
  assert.deepEqual(Object.keys(readiness),['ready','configured','verifying','hasUserId','accessAuthenticated','hasAccessAuthenticatedField','sessionMatchesAccess','epochInteger','accessPhase']);
  for(const[key,value]of Object.entries(readiness))assert.equal(typeof value,key==='accessPhase'?'string':'boolean');
  assert.equal(readiness.hasAccessAuthenticatedField,name!=='accessAuthenticatedAbsent');assert.equal(readiness.accessPhase,name==='unknownPhase'?'unknown':'active');assertPrivate(report);
 });
});
test('actual family-v2 exports distinguish boot readiness, unloaded access controller and loaded blank controller without HTTP',async t=>{
 const productRoot=process.env.DOBBY_SOURCE_ROOT||process.cwd(),accessModule=await import(pathToFileURL(productRoot+'/essai-stitch-v5-famille/family-access.mjs').href);
 const source=fs.readFileSync(productRoot+'/essai-stitch-v5-famille/family-v2.js','utf8').replace("import('./family-access.mjs')",'Promise.resolve(__accessModule)').replace(/void boot\(\);\s*\}\)\(\);\s*$/,'window.__native={f};})();');
 for(const phase of ['boot-not-ready','controller-unloaded','controller-loaded-blank'])await t.test(phase,async()=>{
  let requests=0;const node=()=>({dataset:{},append(){},remove(){},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],style:{},elements:[],hidden:true});
  const sandbox={__accessModule:accessModule,st:{page:'home'},save(){},render(){},drawShop:()=>'',queueMicrotask,setInterval:()=>0,setTimeout,clearTimeout,crypto:webcrypto,TextEncoder,URL,URLSearchParams,btoa,document:{getElementById:()=>null,addEventListener(){},createElement:node,body:{append(){}}},window:{addEventListener(){},dispatchEvent(){}},CustomEvent:class{},navigator:{onLine:true},localStorage:{getItem:()=>null,setItem(){}},fetch:async()=>{requests++;throw Error('NATIVE_HTTP_FORBIDDEN');}};
  vm.runInNewContext(source,sandbox);const native=sandbox.window,model=native.__native.f;native.location={origin:'https://portenartco.github.io',pathname:'/dobby-demo/essai-stitch-v5-famille/index.html'};native.fetch=sandbox.fetch;native.AbortController=AbortController;
  if(phase!=='boot-not-ready'){model.ready=true;model.key=KEY;model.session={user_id:USER};}
  if(phase==='controller-loaded-blank')await native.DobbyFamilyUI.access.ready;
  const host={location:{origin:'https://portenartco.github.io',pathname:'/dobby-demo/essai-stitch-v7/famille.html'},DobbyPublicConfig:{projectRef:'pqcdkrwljgvgagzwrcmg'},DobbyFamilyStitchEngine:{win:()=>native}};
  const report=await run({hostWindow:host}),r=report.nativeReadiness;assert.equal(report.reference,'SESSION_NON_PRETE');assert.equal(requests,0);assert.equal(r.epochInteger,true);assert.equal(r.accessAuthenticated,false);
  if(phase==='boot-not-ready'){assert.equal(r.ready,false);assert.equal(r.configured,false);assert.equal(r.hasUserId,false);assert.equal(r.hasAccessAuthenticatedField,false);assert.equal(r.accessPhase,'signed-out');}
  if(phase==='controller-unloaded'){assert.equal(r.ready,true);assert.equal(r.configured,true);assert.equal(r.hasUserId,true);assert.equal(r.hasAccessAuthenticatedField,false);assert.equal(r.sessionMatchesAccess,true);assert.equal(r.accessPhase,'unavailable');}
  if(phase==='controller-loaded-blank'){assert.equal(r.ready,true);assert.equal(r.hasUserId,true);assert.equal(r.hasAccessAuthenticatedField,true);assert.equal(r.sessionMatchesAccess,false);assert.equal(r.accessPhase,'signed-out');}
  assertPrivate(report);
 });
});
test('a raw RPC error is reduced to a fixed stage and numeric HTTP status only',async()=>{
 const f=fixture();f.rpc(()=>{throw Object.assign(Error('TEST_PRIVATE_ACCESS_TOKEN private-fixture@example.invalid'),{status:403,code:USER,cause:{secret:TOKEN}});});
 const report=await run({hostWindow:f.host});assert.equal(report.result,'FAIL');assert.equal(report.stage,'postgrest-context');assert.equal(report.httpStatus,403);assert.equal(report.reference,'LECTURE_HTTP_NON_CONFIRMEE');assertPrivate(report);
});
test('an account or household switch stops before the next request, even with the same TEXT member ID',async t=>{
 for(const change of ['account','household'])await t.test(change,async()=>{const f=fixture();f.rpc(path=>{if(path==='rpc/dobby_v7_context'){const old={protocol:1,phase:'active',userId:f.owner.userId,householdId:HH,memberId:MEMBER,category:'parent',profile:{id:MEMBER,memberCategory:'parent'}};if(change==='account'){f.owner.userId='TEST_PRIVATE_AUTH_B';f.owner.epoch++;}else f.owner.householdId='TEST_PRIVATE_OTHER_HH';return old;}});const report=await run({hostWindow:f.host});assert.equal(report.result,'FAIL');assert.equal(report.reference,'SESSION_CHANGEANTE');assert.equal(f.calls.filter(call=>call.kind==='fetch').length,1);assertPrivate(report);});
});
test('a persisted session for another account is never sent to Auth',async()=>{
 const f=fixture();f.metadata.session.user_id='TEST_PRIVATE_AUTH_B';const report=await run({hostWindow:f.host});assert.equal(report.result,'FAIL');assert.equal(report.reference,'SESSION_STOCKEE_INCOHERENTE');assert.equal(f.calls.some(call=>call.kind==='fetch'),false);assertPrivate(report);
});
test('Auth HTTP refusal and a mismatched Auth user never expose their response bodies',async t=>{
 for(const bad of ['http','subject'])await t.test(bad,async()=>{const f=fixture();f.http(()=>bad==='http'?{ok:false,status:401,json:async()=>{throw Error(TOKEN);}}:{ok:true,status:200,json:async()=>({id:'TEST_PRIVATE_AUTH_B',email:'private-fixture@example.invalid',email_confirmed_at:'2026-11-13',secret:TOKEN})});const report=await run({hostWindow:f.host});assert.equal(report.result,'FAIL');assert.equal(report.authUserHttpVerified,false);assertPrivate(report);});
});
test('expired, near-expiry or missing expiry sessions cause no HTTP request and no refresh attempt',async t=>{
 for(const ttl of [0,89,119,null])await t.test(String(ttl),async()=>{const f=fixture();if(ttl===null)delete f.metadata.session.expires_at;else f.metadata.session.expires_at=Math.floor(Date.now()/1000)+ttl;const report=await run({hostWindow:f.host});assert.equal(report.result,'FAIL');assert.equal(report.reference,'SESSION_A_RECONNECTER');assert.equal(report.reconnectNormallyRequired,true);assert.equal(f.calls.some(call=>call.kind==='fetch'),false);assertPrivate(report);});
});
test('a PostgREST 401 or unsupported GET is refused without refresh, retry or POST fallback',async t=>{
 for(const status of [401,405])await t.test(String(status),async()=>{const f=fixture();f.rpc(()=>({ok:false,status,json:async()=>{throw Error(TOKEN);}}));const report=await run({hostWindow:f.host});assert.equal(report.result,'FAIL');assert.equal(report.httpStatus,status);assert.equal(report.reconnectNormallyRequired,status===401);const http=f.calls.filter(call=>call.kind==='fetch');assert.equal(http.length,1);assert.equal(http[0].options.method,'GET');assert.equal(http[0].path,'rpc/dobby_v7_context');assertPrivate(report);});
});
test('client capabilities are read again after the final Auth response await',async()=>{
 const f=fixture();f.http(()=>({ok:true,status:200,json:async()=>{await Promise.resolve();f.account.permissions.canManageHousehold=true;f.account.capabilities.familyRolesReady=true;return{id:f.owner.userId,email_confirmed_at:'2026-11-13',is_anonymous:false};}}));
 const report=await run({hostWindow:f.host});assert.equal(report.result,'FAIL');assert.equal(report.checks.clientCapabilitiesRemainClosed,false);assert.equal(report.authUserHttpVerified,true);assertPrivate(report);
});
test('redirect responses cannot cause another destination or expose its URL',async()=>{
 const f=fixture();f.rpc(()=>({ok:false,status:302,headers:{location:'https://other.invalid/?private='+TOKEN},json:async()=>{throw Error(TOKEN);}}));const report=await run({hostWindow:f.host});assert.equal(report.result,'FAIL');assert.equal(report.httpStatus,302);const http=f.calls.filter(call=>call.kind==='fetch');assert.equal(http.length,1);assert.equal(http[0].options.redirect,'error');assert.equal(http[0].options.credentials,'omit');assertPrivate(report);assert.equal(JSON.stringify(report).includes('other.invalid'),false);
});
test('a stalled read times out with a fixed reference',async()=>{
 const f=fixture();f.rpc(()=>new Promise(()=>{}));const report=await run({hostWindow:f.host,timeoutMs:5});assert.equal(report.result,'FAIL');assert.equal(report.reference,'DELAI_DEPASSE');assert.equal(f.calls.filter(call=>call.kind==='fetch').length,1);assertPrivate(report);
});

test('the exact console entry prints only one aggregate JSON and exports no session object',async()=>{
 const f=fixture(),printed=[];f.host.console={log:value=>printed.push(value)};
 const result=vm.runInNewContext(fs.readFileSync(__dirname+'/31-auth-http-readonly.js','utf8'),{window:f.host,setTimeout,clearTimeout,AbortController,URL});
 assert.equal(result,undefined);while(!printed.length)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(printed.length,1);const report=JSON.parse(printed[0]);assert.equal(report.result,'PASS');assertPrivate(report);
 assert.equal(f.host.session,undefined);assert.equal(f.host.access_token,undefined);assert.equal(f.host.DobbyHttpReadOnlyProbe,undefined);
});

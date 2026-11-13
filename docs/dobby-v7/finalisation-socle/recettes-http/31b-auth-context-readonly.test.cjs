const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');const {pathToFileURL}=require('node:url');
const {run}=require('./31b-auth-context-readonly.js');
const USER='PRIVATE_AUTH_A',HH='PRIVATE_HH',MEMBER='PRIVATE_MEMBER',TOKEN='PRIVATE_ACCESS_TOKEN',KEY='sb_publishable_PRIVATE_KEY';
function fixture(){
 const c={ready:true,configured:true,verifying:false,userId:USER,householdId:HH,epoch:7},a={phase:'unavailable',authenticated:false,userId:USER,verified:false,memberId:null};
 const metadata={session:{user_id:USER,access_token:TOKEN,expires_at:Math.floor(Date.now()/1000)+3600},publicKey:KEY,deviceHouseholdId:HH},calls=[];let httpHook=null,metaHook=null;
 const api={connectionState:()=>({...c}),access:{state:()=>structuredClone(a),get ready(){throw Error('FORBIDDEN_READY');},refresh(){throw Error('FORBIDDEN_REFRESH');}},authorized(){throw Error('FORBIDDEN_AUTHORIZED');},putMeta(){throw Error('FORBIDDEN_WRITE');},updateMeta(){throw Error('FORBIDDEN_WRITE');},
  meta:async key=>{calls.push({kind:'meta',key});if(metaHook)metaHook(key);return structuredClone(metadata[key]);}};
 const native={location:{origin:'https://portenartco.github.io',pathname:'/dobby-demo/essai-stitch-v5-famille/index.html'},DobbyFamilyUI:api,AbortController,
  fetch:async(url,options)=>{calls.push({kind:'http',url,options});assert.equal(options.method,'GET');assert.equal(options.body,undefined);assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');assert.equal(options.headers.Authorization,'Bearer '+TOKEN);assert.equal(options.headers.apikey,KEY);
   const parsed=new URL(url);assert.equal(parsed.origin,'https://pqcdkrwljgvgagzwrcmg.supabase.co');assert.equal(parsed.search,'');assert.ok(['/auth/v1/user','/rest/v1/rpc/dobby_v7_context'].includes(parsed.pathname));if(httpHook){const r=await httpHook(parsed.pathname);if(r)return r;}
   const body=parsed.pathname==='/auth/v1/user'?{id:USER,email:'PRIVATE_EMAIL@example.invalid',email_confirmed_at:'2026-11-13',is_anonymous:false}:{protocol:1,phase:'active',userId:USER,householdId:HH,memberId:MEMBER,category:'parent',profile:{id:MEMBER,memberCategory:'parent',name:'PRIVATE_NAME'}};
   return{ok:true,status:200,json:async()=>body};}};
 const host={location:{origin:'https://portenartco.github.io',pathname:'/dobby-demo/essai-stitch-v7/famille.html'},DobbyPublicConfig:{projectRef:'pqcdkrwljgvgagzwrcmg'},DobbyFamilyStitchEngine:{win:()=>native}};
 return{host,native,api,c,a,metadata,calls,http:hook=>httpHook=hook,meta:hook=>metaHook=hook};
}
const http=f=>f.calls.filter(x=>x.kind==='http');
function privateReport(r){const text=JSON.stringify(r);for(const value of [USER,HH,MEMBER,TOKEN,KEY,'PRIVATE_NAME','PRIVATE_EMAIL@example.invalid','PRIVATE_ERROR_MESSAGE','https://'])assert.equal(text.includes(value),false,value);}
test('the exact observed unavailable state permits Auth GET then context GET, without validating 31 or adopting locally',async()=>{
 const f=fixture(),before=JSON.stringify({c:f.c,a:f.a,metadata:f.metadata}),r=await run({hostWindow:f.host});
 assert.equal(r.result,'DIAGNOSTIC_COMPLETE');assert.equal(r.diagnosis,'AUTH_AND_CONTEXT_ACTIVE_NATIVE_ACCESS_UNAVAILABLE');assert.equal(r.nativeAccessVerified,false);assert.equal(r.contextPhase,'active');assert.equal(r.contextCategory,'parent');assert.equal(r.authUserHttpStatus,200);assert.equal(r.contextHttpStatus,200);assert.equal(r.checks.authSubjectMatchesNativeAndStoredSession,true);assert.equal(r.nativeError.available,false);
 assert.deepEqual(http(f).map(x=>new URL(x.url).pathname),['/auth/v1/user','/rest/v1/rpc/dobby_v7_context']);assert.equal(before,JSON.stringify({c:f.c,a:f.a,metadata:f.metadata}));privateReport(r);
});
test('all other native phases, fallback without authenticated field and active sessions are refused before metadata/HTTP',async t=>{
 for(const variant of ['active','profile','fallback','verifying'])await t.test(variant,async()=>{const f=fixture();if(variant==='fallback')delete f.a.authenticated;else if(variant==='verifying')f.c.verifying=true;else{f.a.phase=variant;f.a.authenticated=true;}const r=await run({hostWindow:f.host});assert.equal(r.reference,'ETAT_NATIF_NON_ATTENDU');assert.equal(f.calls.length,0);privateReport(r);});
});
test('Auth refusal, unknown HTTP and subject mismatch stop before the context GET',async t=>{
 for(const variant of ['401','500','subject'])await t.test(variant,async()=>{const f=fixture();f.http(()=>variant==='subject'?{ok:true,status:200,json:async()=>({id:'PRIVATE_OTHER_AUTH',email_confirmed_at:'2026-11-13'})}:{ok:false,status:Number(variant),json:async()=>{throw Error(TOKEN);}});const r=await run({hostWindow:f.host});assert.equal(r.result,'FAIL');assert.equal(http(f).length,1);assert.equal(r.contextHttpStatus,null);assert.equal(r.checks.contextSubjectMatchesVerifiedAuth,undefined);privateReport(r);});
});
test('context HTTP failure is distinct from Auth failure and raw error bodies are never read',async()=>{
 const f=fixture();f.http(path=>path.startsWith('/rest/')?{ok:false,status:403,json:async()=>{throw Error(TOKEN);}}:null);const r=await run({hostWindow:f.host});assert.equal(r.authUserHttpStatus,200);assert.equal(r.contextHttpStatus,403);assert.equal(r.diagnosis,'AUTH_OK_CONTEXT_HTTP_NOT_CONFIRMED');assert.equal(r.stage,'postgrest-context');privateReport(r);
});
test('server profile/rejected phases remain diagnostic codes, never a successful local adoption',async t=>{
 for(const phase of ['profile','rejected'])await t.test(phase,async()=>{const f=fixture();f.http(path=>path.startsWith('/rest/')?{ok:true,status:200,json:async()=>({protocol:1,phase,userId:USER,profile:null})}:null);const r=await run({hostWindow:f.host});assert.equal(r.result,'DIAGNOSTIC_COMPLETE');assert.equal(r.contextPhase,phase);assert.equal(r.nativeAccessVerified,false);privateReport(r);});
});
test('known local error messages become fixed codes; unknown strings/code values are discarded',async t=>{
 const cases=[['Ce navigateur conserve les données locales d’un autre foyer. Utilisez un profil de navigateur distinct.','FOYER_LOCAL_AUTRE'],['Un registre familial local existe déjà. Comparez et sauvegardez ses données avant de rejoindre le foyer.','FOYER_LOCAL_EXISTANT'],['Le registre familial contient des modifications locales en attente ou un conflit.','FOYER_LOCAL_ATTENTE'],['PRIVATE_ERROR_MESSAGE',null]];
 for(const[message,code]of cases)await t.test(code||'unknown',async()=>{const f=fixture();f.a.error={message,status:403,code:code?'42501':TOKEN};const r=await run({hostWindow:f.host});assert.equal(r.nativeError.available,true);assert.equal(r.nativeError.localBlockerCode,code);assert.equal(r.nativeError.httpStatus,403);assert.equal(r.nativeError.code,code?'42501':null);privateReport(r);});
});
test('expired/stored-other sessions and actor/household replacement cannot reach a context GET',async t=>{
 for(const variant of ['expiry','stored-other','actor','household'])await t.test(variant,async()=>{const f=fixture();if(variant==='expiry')f.metadata.session.expires_at=0;else if(variant==='stored-other')f.metadata.session.user_id='PRIVATE_OTHER_AUTH';else f.http(()=>{if(variant==='actor'){f.c.userId='PRIVATE_OTHER_AUTH';f.a.userId=f.c.userId;f.c.epoch++;}else f.c.householdId='PRIVATE_OTHER_HH';return{ok:true,status:200,json:async()=>({id:USER,email_confirmed_at:'2026-11-13'})};});const r=await run({hostWindow:f.host});assert.equal(r.result,'FAIL');assert.equal(http(f).length,variant==='actor'||variant==='household'?1:0);assert.equal(r.contextHttpStatus,null);privateReport(r);});
});
test('the confirmed deviceHouseholdId key yields only presence/match booleans without changing it',async t=>{
 for(const variant of ['same','different','absent'])await t.test(variant,async()=>{const f=fixture();if(variant==='different')f.metadata.deviceHouseholdId='PRIVATE_OTHER_HH';if(variant==='absent')delete f.metadata.deviceHouseholdId;const before=JSON.stringify(f.metadata),r=await run({hostWindow:f.host});assert.equal(r.result,'DIAGNOSTIC_COMPLETE');assert.equal(r.deviceHouseholdMarkerPresent,variant!=='absent');assert.equal(r.markerMatchesServer,variant==='absent'?null:variant==='same');assert.equal(http(f).length,2);assert.equal(before,JSON.stringify(f.metadata));privateReport(r);assert.equal(JSON.stringify(r).includes('PRIVATE_OTHER_HH'),false);});
});
test('actual loaded controller refresh failure reproduces the observed state and permits only the two direct diagnostic GETs',async()=>{
 const root=process.env.DOBBY_SOURCE_ROOT||process.cwd(),module=await import(pathToFileURL(root+'/essai-stitch-v5-famille/family-access.mjs').href),f=fixture();
 const model={ready:true,configured:true,userId:USER,householdId:HH,epoch:7,verified:false};
 const controller=module.createFamilyAccess({crypto:webcrypto,snapshot:()=>({...model}),clearBinding(){},notify(){},rpc:async()=>({protocol:1,phase:'active',userId:USER,householdId:HH,memberId:MEMBER,profile:{id:MEMBER,memberCategory:'parent'},permissions:{canEdit:true},familyRevision:3}),bind:async()=>{throw Error('Un registre familial local existe déjà. Comparez et sauvegardez ses données avant de rejoindre le foyer.');}});
 await assert.rejects(controller.refresh());f.api.access={state:controller.state,ready:Promise.resolve(),refresh(){throw Error('FORBIDDEN_REFRESH');}};
 const r=await run({hostWindow:f.host});assert.equal(r.nativeReadiness.hasAccessAuthenticatedField,true);assert.equal(r.nativeReadiness.accessAuthenticated,false);assert.equal(r.nativeReadiness.sessionMatchesAccess,true);assert.equal(r.nativeError.available,false);assert.equal(r.result,'DIAGNOSTIC_COMPLETE');assert.equal(http(f).length,2);privateReport(r);
});
test('the exact console entry prints one aggregate JSON and no private objects',async()=>{
 const f=fixture(),printed=[];f.host.console={log:text=>printed.push(text)};assert.equal(vm.runInNewContext(fs.readFileSync(__dirname+'/31b-auth-context-readonly.js','utf8'),{window:f.host,setTimeout,clearTimeout,URL,AbortController}),undefined);while(!printed.length)await new Promise(resolve=>setImmediate(resolve));assert.equal(printed.length,1);const r=JSON.parse(printed[0]);assert.equal(r.result,'DIAGNOSTIC_COMPLETE');privateReport(r);
});

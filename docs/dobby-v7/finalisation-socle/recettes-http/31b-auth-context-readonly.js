/* Diagnostic privé distinct du contrôle 31. État unavailable uniquement.
 * Deux GET directs au maximum : Auth /user, puis contexte PostgREST.
 * Aucun ready/refresh/authorized/retry, aucune écriture locale ou serveur.
 */
(function(root,factory){'use strict';const probe=factory();if(typeof module==='object'&&module.exports){module.exports=probe;return;}void probe.run({hostWindow:root}).then(report=>root.console.log(JSON.stringify(report,null,2)));})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const SITE='https://portenartco.github.io',PREFIX='/dobby-demo/',FAMILY='https://pqcdkrwljgvgagzwrcmg.supabase.co',REF='pqcdkrwljgvgagzwrcmg';
 const phases=new Set(['signed-out','email-confirmation','profile','household','active','rejected','unavailable']);
 const codes=new Set(['42501','40001','23514','22023','PGRST202','PGRST301','invalid_credentials','email_not_confirmed','bad_jwt','session_not_found']);
 const localMessages=new Map([
  ['Ce navigateur conserve les données locales d’un autre foyer. Utilisez un profil de navigateur distinct.','FOYER_LOCAL_AUTRE'],
  ['Un registre familial local existe déjà. Comparez et sauvegardez ses données avant de rejoindre le foyer.','FOYER_LOCAL_EXISTANT'],
  ['Le registre familial contient des modifications locales en attente ou un conflit.','FOYER_LOCAL_ATTENTE']
 ]);
 const references=new Set(['SITE_INATTENDU','INTERFACE_NATIVE_ABSENTE','ETAT_NATIF_NON_ATTENDU','SESSION_CHANGEANTE','SESSION_STOCKEE_INCOHERENTE','SESSION_A_RECONNECTER','CONFIGURATION_PUBLIQUE_INCOHERENTE','AUTH_SUJET_INCOHERENT','CONTEXTE_INCOHERENT','DELAI_DEPASSE']);
 const object=v=>Boolean(v&&typeof v==='object'&&!Array.isArray(v)),id=v=>typeof v==='string'&&v.length>0&&v.length<=120;
 const status=v=>Number.isInteger(v)&&v>=100&&v<=599?v:null;
 const fail=reference=>{const e=Error(reference);e.probeReference=reference;throw e;};
 async function run({hostWindow,timeoutMs=15000}={}){
  const report={verification:'dobby-socle-auth-context-readonly-v1',scope:'personal-family-project-only',result:'FAIL',diagnosis:'NOT_COMPLETED',checks:{},authUserHttpStatus:null,contextHttpStatus:null,contextPhase:'not-read',contextCategory:'not-read',deviceHouseholdMarkerPresent:null,markerMatchesServer:null,nativeAccessVerified:false,readOnly:true,automaticRefreshRequested:false,localMetadataWritesRequested:false,publicationFlagsModified:false};
  let stage='native-interface',session=null;
  try{
   if(hostWindow?.location?.origin!==SITE||!hostWindow.location.pathname.startsWith(PREFIX))fail('SITE_INATTENDU');
   const native=hostWindow.DobbyFamilyStitchEngine?.win?.()||hostWindow.document?.getElementById('dv7-engine')?.contentWindow||(hostWindow.DobbyFamilyUI?hostWindow:null);
   if(native?.location?.origin!==SITE||!native.location.pathname.startsWith(PREFIX))fail('INTERFACE_NATIVE_ABSENTE');
   const api=native.DobbyFamilyUI,configuration=native.DobbyPublicConfig||hostWindow.DobbyPublicConfig;
   if(typeof api?.connectionState!=='function'||typeof api?.access?.state!=='function'||typeof api?.meta!=='function'||typeof native.fetch!=='function')fail('INTERFACE_NATIVE_ABSENTE');
   if(configuration?.projectRef!==REF)fail('CONFIGURATION_PUBLIQUE_INCOHERENTE');
   const snapshot=()=>{
    const c=api.connectionState(),a=api.access.state(),error=a?.error;
    report.nativeReadiness={ready:c?.ready===true,configured:c?.configured===true,verifying:Boolean(c?.verifying),hasUserId:id(c?.userId),accessAuthenticated:a?.authenticated===true,hasAccessAuthenticatedField:object(a)&&Object.hasOwn(a,'authenticated'),sessionMatchesAccess:id(c?.userId)&&a?.userId===c.userId,epochInteger:Number.isSafeInteger(c?.epoch),accessPhase:phases.has(a?.phase)?a.phase:'unknown'};
    report.nativeError={available:error!==undefined&&error!==null,httpStatus:status(error?.status),code:codes.has(error?.code)?error.code:null,localBlockerCode:localMessages.get(typeof error==='string'?error:error?.message)||null};
    const r=report.nativeReadiness;
    if(!r.ready||!r.configured||r.verifying||!r.hasUserId||r.accessAuthenticated||!r.hasAccessAuthenticatedField||!r.sessionMatchesAccess||!r.epochInteger||r.accessPhase!=='unavailable'||a.authenticated!==false||a.verified===true)fail('ETAT_NATIF_NON_ATTENDU');
    return{userId:c.userId,epoch:c.epoch,householdId:c.householdId||null,memberId:a.memberId||null};
   };
   const owner=snapshot(),guard=()=>{const live=snapshot();if(Object.keys(owner).some(key=>owner[key]!==live[key]))fail('SESSION_CHANGEANTE');};
   const timed=promise=>{let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>{const e=Error('DELAI_DEPASSE');e.probeReference='DELAI_DEPASSE';reject(e);},timeoutMs);})]).finally(()=>clearTimeout(timer));};
   stage='private-session-read';guard();session=await timed(api.meta('session'));guard();
   report.checks.storedSessionMatchesNative=object(session)&&session.user_id===owner.userId&&typeof session.access_token==='string'&&Boolean(session.access_token);
   if(!report.checks.storedSessionMatchesNative)fail('SESSION_STOCKEE_INCOHERENTE');
   const guardRead=()=>{guard();report.checks.sessionExpiryMarginValid=Number.isSafeInteger(session?.expires_at)&&session.expires_at-Math.floor(Date.now()/1000)>=120;if(!report.checks.sessionExpiryMarginValid)fail('SESSION_A_RECONNECTER');};
   guardRead();const key=await timed(api.meta('publicKey'));guardRead();
   if(typeof key!=='string'||!key.startsWith('sb_publishable_'))fail('CONFIGURATION_PUBLIQUE_INCOHERENTE');
   const get=async path=>{
    if(path!=='/auth/v1/user'&&path!=='/rest/v1/rpc/dobby_v7_context')fail('CONFIGURATION_PUBLIQUE_INCOHERENTE');
    const Controller=native.AbortController||globalThis.AbortController,controller=new Controller();let expired=false;
    const timer=setTimeout(()=>{expired=true;controller.abort();},timeoutMs);
    try{
     guardRead();const response=await timed(native.fetch(FAMILY+path,{method:'GET',headers:{apikey:key,Authorization:'Bearer '+session.access_token,Accept:'application/json'},credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal}));guardRead();
     report[path==='/auth/v1/user'?'authUserHttpStatus':'contextHttpStatus']=status(response.status);
     if(!response.ok||response.status!==200){report.diagnosis=path==='/auth/v1/user'?'AUTH_HTTP_NOT_CONFIRMED':'AUTH_OK_CONTEXT_HTTP_NOT_CONFIRMED';const e=Error('HTTP_NON_CONFIRME');e.status=response.status;if(response.status===401)e.probeReference='SESSION_A_RECONNECTER';throw e;}
     guardRead();const data=await timed(response.json());guardRead();return data;
    }catch(e){if(expired)fail('DELAI_DEPASSE');throw e;}finally{clearTimeout(timer);controller.abort();}
   };
   stage='auth-user-http';guardRead();const user=await get('/auth/v1/user');guardRead();
   report.checks.authSubjectMatchesNativeAndStoredSession=object(user)&&user.id===owner.userId&&user.id===session.user_id;
   if(!report.checks.authSubjectMatchesNativeAndStoredSession)fail('AUTH_SUJET_INCOHERENT');
   report.checks.authEmailConfirmed=Boolean(user.email_confirmed_at)&&user.is_anonymous!==true;
   if(!report.checks.authEmailConfirmed)fail('AUTH_SUJET_INCOHERENT');
   // Auth subject is verified before the sole PostgREST context request.
   stage='postgrest-context';guardRead();const context=await get('/rest/v1/rpc/dobby_v7_context');guardRead();
   report.checks.contextSubjectMatchesVerifiedAuth=object(context)&&context.protocol===1&&context.userId===owner.userId;
   if(!report.checks.contextSubjectMatchesVerifiedAuth||!phases.has(context.phase))fail('CONTEXTE_INCOHERENT');
   report.contextPhase=context.phase;
   report.contextCategory=['parent','child'].includes(context.category)?context.category:'not-active';
   if(context.phase==='active'){
    report.checks.canonicalServerProfileConsistent=id(context.householdId)&&id(context.memberId)&&context.profile?.id===context.memberId&&['parent','child'].includes(context.category)&&context.profile?.memberCategory===context.category;
    if(!report.checks.canonicalServerProfileConsistent)fail('CONTEXTE_INCOHERENT');
    report.checks.nativeHouseholdPresent=Boolean(owner.householdId);
    report.checks.nativeHouseholdMatchesServer=owner.householdId===context.householdId;
    guardRead();const marker=await timed(api.meta('deviceHouseholdId'));guardRead();
    report.deviceHouseholdMarkerPresent=Boolean(marker);
    report.markerMatchesServer=marker?marker===context.householdId:null;
    report.diagnosis='AUTH_AND_CONTEXT_ACTIVE_NATIVE_ACCESS_UNAVAILABLE';
   }else report.diagnosis=context.phase==='rejected'?'AUTH_OK_CONTEXT_REJECTED':'AUTH_OK_CONTEXT_NOT_ACTIVE';
   report.result='DIAGNOSTIC_COMPLETE';report.stage='completed';
  }catch(e){report.stage=stage;report.reference=references.has(e?.probeReference)?e.probeReference:'LECTURE_HTTP_NON_CONFIRMEE';report.httpStatus=status(e?.status);}
  finally{session=null;}
  report.limits=['Diagnostic uniquement : ne valide pas le contrôle 31 ni l’adoption locale et ne débloque aucun parcours.',
   'Aucun ready, refresh, authorized, retry, écriture locale ou mutation Famille/Missions/Storage.',
   'L’erreur du contrôleur peut ne pas être conservée ; aucun message absent n’est reconstitué.',
   'Les sujets Auth et contexte sont comparés seulement en mémoire ; aucune identité, adresse, session ou URL n’est retournée.'];
  return report;
 }
 return Object.freeze({run});
});

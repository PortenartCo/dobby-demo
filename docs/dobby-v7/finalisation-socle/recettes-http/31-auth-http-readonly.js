/* Contrôle privé exécuté uniquement par l'utilisateur dans sa console DOBBY.
 * GET directs des trois RPC STABLE et GET Auth /user uniquement, sans retry,
 * refresh Auth ni écriture de métadonnées. api.authorized n'est pas appelé.
 * Aucune identité, adresse, clé ou session n'est retournée dans le rapport.
 * Les valeurs de session restent dans cette closure et servent au seul projet
 * familial fixe ; aucune valeur n'est à remplacer et aucun flag n'est modifié.
 */
(function (root, factory) {
  'use strict';
  const probe=factory();
  if(typeof module==='object'&&module.exports){module.exports=probe;return;}
  void probe.run({hostWindow:root}).then(report=>root.console.log(JSON.stringify(report,null,2)));
})(typeof window==='undefined'?null:window,function () {
  'use strict';
  const SITE_ORIGIN='https://portenartco.github.io';
  const SITE_PATH='/dobby-demo/';
  const FAMILY_ORIGIN='https://pqcdkrwljgvgagzwrcmg.supabase.co';
  const AUTH_USER_URL=FAMILY_ORIGIN+'/auth/v1/user';
  const PROJECT_REF='pqcdkrwljgvgagzwrcmg';
  const MIN_SESSION_TTL_SECONDS=120;
  const id=value=>typeof value==='string'&&value.length>0&&value.length<=120;
  const object=value=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
  const fail=reference=>{const error=Error(reference);error.probeReference=reference;throw error;};
  const fixedReference=new Set(['SITE_INATTENDU','INTERFACE_NATIVE_ABSENTE','SESSION_NON_PRETE','SESSION_CHANGEANTE','CONTEXTE_INCOHERENT','ACTEUR_INATTENDU','CONFIGURATION_PUBLIQUE_INCOHERENTE','SESSION_STOCKEE_INCOHERENTE','SESSION_A_RECONNECTER','REPONSE_AUTH_INCOHERENTE','DELAI_DEPASSE']);
  async function run({hostWindow,timeoutMs=15000}={}) {
    const report={verification:'dobby-socle-auth-http-readonly-v1',scope:'personal-family-project-only',result:'FAIL',
      actorClass:null,checks:{},businessMutationRequested:false,publicationFlagsModified:false,
      transport:'direct-get-only',automaticRefreshRequested:false,localMetadataWritesRequested:false,
      passwordGrantObservedByProbe:false,childInvitationOrAcceptanceTested:false,
      storagePhysicalUploadTested:false,storageDeleteTested:false,multiSessionConcurrencyTested:false};
    let stage='native-interface',session=null;
    try {
      if(!hostWindow?.location||hostWindow.location.origin!==SITE_ORIGIN||!hostWindow.location.pathname.startsWith(SITE_PATH))fail('SITE_INATTENDU');
      const native=hostWindow.DobbyFamilyStitchEngine?.win?.()||hostWindow.document?.getElementById('dv7-engine')?.contentWindow||(hostWindow.DobbyFamilyUI?hostWindow:null);
      if(!native?.location||native.location.origin!==SITE_ORIGIN||!native.location.pathname.startsWith(SITE_PATH))fail('INTERFACE_NATIVE_ABSENTE');
      const api=native.DobbyFamilyUI;
      if(typeof native.fetch!=='function'||typeof api?.meta!=='function'||typeof api?.access?.state!=='function'||typeof api?.connectionState!=='function'||typeof api?.getContext!=='function')fail('INTERFACE_NATIVE_ABSENTE');
      const configuration=native.DobbyPublicConfig||hostWindow.DobbyPublicConfig;
      if(configuration?.projectRef!==PROJECT_REF)fail('CONFIGURATION_PUBLIQUE_INCOHERENTE');
      const snapshot=()=>{
        const connection=api.connectionState(),account=api.access.state();
        if(connection.ready!==true||connection.configured!==true||connection.verifying||!id(connection.userId)||account.authenticated!==true||account.userId!==connection.userId||!Number.isSafeInteger(connection.epoch))fail('SESSION_NON_PRETE');
        return{epoch:connection.epoch,userId:connection.userId,householdId:connection.householdId||null,memberId:account.memberId||null};
      };
      const owner=snapshot();
      const guard=()=>{const live=snapshot();if(Object.keys(owner).some(key=>owner[key]!==live[key]))fail('SESSION_CHANGEANTE');};
      const timed=promise=>{
        let timer;
        return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>{const error=Error('DELAI_DEPASSE');error.probeReference='DELAI_DEPASSE';reject(error);},timeoutMs);})]).finally(()=>clearTimeout(timer));
      };
      stage='private-session-read';
      guard();session=await timed(api.meta('session'));guard();
      if(!object(session)||session.user_id!==owner.userId||typeof session.access_token!=='string'||!session.access_token)fail('SESSION_STOCKEE_INCOHERENTE');
      const guardRead=()=>{guard();if(!Number.isSafeInteger(session?.expires_at)||session.expires_at-Math.floor(Date.now()/1000)<MIN_SESSION_TTL_SECONDS)fail('SESSION_A_RECONNECTER');};
      guardRead();const publicKey=await timed(api.meta('publicKey'));guardRead();
      if(typeof publicKey!=='string'||!publicKey.startsWith('sb_publishable_'))fail('CONFIGURATION_PUBLIQUE_INCOHERENTE');
      const readJson=async value=>{
        const url=new URL(value),allowed=new Set(['/auth/v1/user','/rest/v1/rpc/dobby_v7_context','/rest/v1/rpc/dobby_v7_family_capabilities','/rest/v1/rpc/dobby_missions_v3_capabilities']);
        if(url.origin!==FAMILY_ORIGIN||url.username||url.password||url.hash||!allowed.has(url.pathname)||[...url.searchParams.keys()].some(key=>url.pathname!=='/rest/v1/rpc/dobby_missions_v3_capabilities'||key!=='p_household_id'))fail('CONFIGURATION_PUBLIQUE_INCOHERENTE');
        const Controller=native.AbortController||globalThis.AbortController,controller=new Controller();let expired=false;
        const timer=setTimeout(()=>{expired=true;controller.abort();},timeoutMs);
        try{
          guardRead();
          const response=await timed(native.fetch(url.href,{method:'GET',headers:{apikey:publicKey,Authorization:'Bearer '+session.access_token,Accept:'application/json'},cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal}));guardRead();
          if(!response.ok||response.status!==200){const error=Error('LECTURE_HTTP_REFUSEE');error.status=response.status;if(response.status===401)error.probeReference='SESSION_A_RECONNECTER';throw error;}
          guardRead();const result=await timed(response.json());guardRead();return result;
        }catch(error){if(expired)fail('DELAI_DEPASSE');throw error;}finally{clearTimeout(timer);controller.abort();}
      };
      report.checks.nativeAuthenticatedSession=true;
      stage='postgrest-context';
      guardRead();const context=await readJson(FAMILY_ORIGIN+'/rest/v1/rpc/dobby_v7_context');guardRead();
      if(!object(context)||context.protocol!==1||context.userId!==owner.userId)fail('CONTEXTE_INCOHERENT');
      const account=api.access.state(),binding=api.getContext();
      if(context.phase==='active'&&context.category==='parent'&&context.profile?.memberCategory==='parent'){
        if(!id(context.householdId)||!id(context.memberId)||context.householdId!==owner.householdId||context.memberId!==owner.memberId||context.profile.id!==context.memberId||account.verified!==true||binding?.identityVerified!==true||binding.userId!==owner.userId||binding.householdId!==context.householdId||binding.memberId!==context.memberId)fail('CONTEXTE_INCOHERENT');
        report.actorClass='parent-linked';
        report.checks.canonicalParentBindingMatchesNative=true;
      }else if(context.phase==='profile'&&context.profile===null&&!context.householdId&&!context.memberId&&account.phase==='profile'&&account.profile===null&&!owner.householdId&&!owner.memberId&&!binding?.identityVerified){
        report.actorClass='confirmed-auth-without-profile-or-household';
        report.checks.unboundAccountHasNoPendingProfileOrHousehold=true;
      }else fail('ACTEUR_INATTENDU');
      report.checks.authenticatedContextEndpoint=true;
      stage='postgrest-family-capabilities';
      guardRead();const family=await readJson(FAMILY_ORIGIN+'/rest/v1/rpc/dobby_v7_family_capabilities');guardRead();
      report.checks.familyCapabilityContract=object(family)&&family.protocol===2&&family.installed===true&&family.familyRolesAvailable===true&&family.childAccountLinkAvailable===true;
      report.checks.storagePoliciesPresent=family?.storagePoliciesPresent===true;
      report.checks.familyCanonicalIdentityMatchesActor=family?.canonicalIdentity===(report.actorClass==='parent-linked');
      report.checks.serverPublicationProofFlagsClosed=family?.familyRolesVerified===false&&family?.childAccountLinkVerified===false&&family?.storagePoliciesVerified===false&&family?.missionsV3Verified===false;
      if(report.actorClass==='parent-linked'){
        stage='postgrest-missions-capabilities';
        const missionsURL=new URL(FAMILY_ORIGIN+'/rest/v1/rpc/dobby_missions_v3_capabilities');missionsURL.searchParams.set('p_household_id',context.householdId);
        guardRead();const missions=await readJson(missionsURL.href);guardRead();
        report.missionsCapabilityProbe='executed';
        report.checks.missionsCapabilityContract=object(missions)&&missions.protocol===3&&missions.contract==='dobby-missions-intents-v3-1'&&missions.intentVersion===1&&missions.participantVersion===1&&JSON.stringify(missions.ledgerVersions)==='[1,2,3]'&&missions.maxPayloadBytes===262144&&missions.directWritesBlocked===true&&missions.atomicAllocations===true&&missions.canonicalAuthorization===true;
        report.checks.missionsClientProofFlagClosed=missions?.clientVerified===false;
      }else report.missionsCapabilityProbe='not-applicable-before-household-binding';
      stage='auth-user-http';
      guardRead();const user=await readJson(AUTH_USER_URL);guardRead();report.authUserHttpStatus=200;
      if(!object(user)||user.id!==owner.userId||!user.email_confirmed_at||user.is_anonymous===true)fail('REPONSE_AUTH_INCOHERENTE');
      report.checks.authUserEndpointHttp200=true;
      report.checks.authUserMatchesNativeAndContext=true;
      report.checks.authEmailConfirmed=true;
      // Read current client grants after the final HTTP await, never a stale
      // account object captured before the capabilities requests.
      guardRead();const finalAccount=api.access.state();
      report.checks.clientCapabilitiesRemainClosed=finalAccount.permissions?.canManageHousehold!==true&&finalAccount.permissions?.canLinkExistingChild!==true&&finalAccount.capabilities?.familyRolesReady!==true&&finalAccount.capabilities?.childAccountLinkReady!==true;
      session=null;
      report.result=Object.values(report.checks).every(value=>value===true)?'PASS':'FAIL';
      report.authUserHttpVerified=report.checks.authUserEndpointHttp200===true&&report.checks.authUserMatchesNativeAndContext===true;
      report.stage='completed';
    }catch(error){
      report.stage=stage;
      report.reference=fixedReference.has(error?.probeReference)?error.probeReference:'LECTURE_HTTP_NON_CONFIRMEE';
      report.reconnectNormallyRequired=report.reference==='SESSION_A_RECONNECTER';
      report.httpStatus=Number.isInteger(error?.status)&&error.status>=100&&error.status<=599?error.status:null;
      report.authUserHttpVerified=false;
    }finally{
      session=null;
    }
    report.limits=['GET directs uniquement ; aucun refresh, retry, appel authorized, écriture de métadonnées ou modification de gate.',
      'Session proche expiration ou HTTP 401 : se reconnecter normalement hors du script, puis relancer ce contrôle.',
      'GET Auth /user vérifie la session HTTP actuelle, pas le mot de passe saisi, un e-mail ou sa délivrance.',
      'Aucune invitation enfant, upload/suppression Storage ou concurrence multi-session exercée.',
      'La session et la clé publique servent aux requêtes internes ; aucune identité, adresse ou valeur de session n’est retournée.'];
    return report;
  }
  return Object.freeze({run});
});

/* Native account-access controller; transport/session/cache belong to family-v2.
 * Proposed server contract (deployment requires manual schema verification):
 * dobby_v7_context => {protocol:1,phase:profile|household|active|rejected,
 *   userId,householdId?,memberId?:TEXT,profile?,permissions?,pendingCeremony?}.
 * dobby_v7_update_profile({p_profile,p_expected_revision?}), dobby_v7_create_household({p_name,
 * p_operation_id}), dobby_v7_preview_invitation({p_token}),
 * dobby_v7_accept_invitation({p_token,p_operation_id}). Mutation responses never
 * establish identity: a fresh authenticated context and native adoption do.
 * state() is available synchronously; ready resolves without network requests.
 */
const clone=value=>JSON.parse(JSON.stringify(value));
const object=value=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
const permissionKeys=['canEdit','canMagic','canCreate','canManageDependents','canInvite'];
// Published builds keep both additions closed until the manual server recipe.
// Neither URL parameters, local storage nor Available alone can open them.
export const FAMILY_FEATURE_RELEASE=Object.freeze({familyRoles:false,childAccountLink:false});
export function verifiedFamilyCapabilities(raw,release=FAMILY_FEATURE_RELEASE){
 const installed=object(raw)&&raw.protocol===2&&raw.installed===true;
 const familyRolesReady=installed&&release.familyRoles===true&&raw.familyRolesAvailable===true&&raw.familyRolesVerified===true&&raw.storagePoliciesVerified===true;
 return{protocol:2,installed:Boolean(installed),familyRolesReady:Boolean(familyRolesReady),childAccountLinkReady:Boolean(familyRolesReady&&release.childAccountLink===true&&raw.childAccountLinkAvailable===true&&raw.childAccountLinkVerified===true)};
}
const sensitive=['invite','invitation','admission_id','code','dobby_flow','access_token','refresh_token','token','token_hash','type','expires_in','expires_at','token_type','error','error_description','error_code'];
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function cleanAuthURL(value){const url=new URL(value);for(const key of sensitive)url.searchParams.delete(key);const fragment=url.hash.slice(1),split=fragment.indexOf('?'),hash=new URLSearchParams(split<0?fragment:fragment.slice(split+1));if(sensitive.some(key=>hash.has(key)))url.hash='';return url.href;}
export function createFamilyAccess(driver,{release=FAMILY_FEATURE_RELEASE}={}){
 const crypto=driver.crypto||globalThis.crypto;
 const features=Object.freeze({familyRoles:release.familyRoles===true,childAccountLink:release.childAccountLink===true});
 const blank=()=>({phase:'signed-out',userId:null,householdId:null,memberId:null,profile:null,permissions:{},capabilities:verifiedFamilyCapabilities(null,features),configured:Boolean(driver.snapshot().configured),authenticated:false,verified:false,pendingCeremony:false,familyRevision:null});
 let value=blank(),owner=null,generation=0,childPreview=null,pendingAdmission=null,admissionSession=null,confirmationFlight=null,admissionFlight=null;
 const signature=s=>JSON.stringify([s.userId||null,s.epoch]);
 const current=()=>driver.snapshot();
 const guard=s=>{if(signature(current())!==signature(s))throw Error('Le compte a changé pendant cette opération.');};
 const guardMutation=s=>{guard(s);if((current().householdId||null)!==(s.householdId||null))throw Error('Le foyer a changé pendant cette opération.');};
 const publish=next=>{value={...blank(),...next};owner=signature(current());driver.notify?.();return state();};
 const clear=()=>driver.clearBinding();
 function state(){const native=current();if(owner!==null&&owner!==signature(native))return blank();const live={...value,permissions:{...value.permissions},configured:Boolean(native.configured)};if(live.verified&&!native.verified)Object.assign(live,{phase:native.rejected?'rejected':'unavailable',verified:false,memberId:null,permissions:{},pendingCeremony:false,familyRevision:null});if(Object.hasOwn(live.permissions,'familyRolesVerified')){live.permissions.familyRolesVerified=live.capabilities.familyRolesReady;live.permissions.canManageHousehold=live.permissions.canManageHousehold===true&&live.capabilities.familyRolesReady;live.permissions.canLinkExistingChild=live.permissions.canLinkExistingChild===true&&live.permissions.canManageHousehold&&live.capabilities.childAccountLinkReady;}return clone(live);}
 function requireConfigured(){const native=current();if(!native.ready)throw Error('La connexion native est en cours d’initialisation.');if(!native.configured)throw Error('Configuration publique indisponible pour la connexion.');return native;}
 function requireSession(allowAdmission=false){const native=requireConfigured();if(!native.userId)throw Error('Connexion requise.');if(!allowAdmission&&(pendingAdmission||admissionSession&&admissionSession.owner===signature(native)))throw Error('Confirmez votre admission avant toute opération familiale.');return native;}
 function failure(error,stage='service'){const result=Error(error?.status===401||error?.status===403?'Accès refusé par le serveur familial.':error instanceof TypeError?'Réseau indisponible. Réessayez sans recréer votre compte.':'Service familial indisponible. Les capacités serveur doivent être vérifiées.');result.status=error?.status;result.code=error?.code;result.stage=stage;return result;}
 async function rpc(name,body={},options={}){if(admissionSession?.owner===signature(current())&&options.admission!==true)throw Error('Confirmez votre admission avant tout accès familial.');try{return await driver.rpc(name,body,options);}catch(error){throw failure(error,name==='dobby_v7_context'?'context':'service');}}
 function profile(raw){if(raw===null||raw===undefined)return null;if(!object(raw))throw Error('Profil serveur invalide.');const result={};for(const key of ['id','name','firstName','lastName','birthdate','avatar','avatarId'])if(raw[key]!==undefined){if(typeof raw[key]!=='string'||raw[key].length>200)throw Error('Profil serveur invalide.');result[key]=raw[key];}if(raw.memberCategory!==undefined){if(!['parent','child','baby','pet'].includes(raw.memberCategory))throw Error('Catégorie du profil serveur invalide.');result.memberCategory=raw.memberCategory;}if(raw.magicProfile!==undefined){if(!object(raw.magicProfile))throw Error('Profil magique serveur invalide.');result.magicProfile=clone(raw.magicProfile);}return result;}
 async function capabilities(native){
  if(!features.familyRoles&&!features.childAccountLink)return verifiedFamilyCapabilities(null,features);
  try{const raw=await rpc('dobby_v7_family_capabilities',{},native.userId?{}:{public:true});guard(native);return verifiedFamilyCapabilities(raw,features);}catch(error){guard(native);return verifiedFamilyCapabilities(null,features);}
 }
 function context(raw,native,capabilities){
  if(!object(raw)||raw.protocol!==1||raw.userId!==native.userId||!['profile','household','active','rejected'].includes(raw.phase))throw Error('Contexte d’identité serveur incohérent.');
  const next={phase:raw.phase,userId:native.userId,profile:profile(raw.profile),authenticated:true,capabilities};
  if(raw.reason==='existing_member_link_required')next.reason=raw.reason;
  if(raw.phase==='active'){
   if(typeof raw.householdId!=='string'||!raw.householdId||raw.householdId.length>120||typeof raw.memberId!=='string'||!raw.memberId||raw.memberId.length>120||!object(raw.permissions)||!next.profile||next.profile.id!==undefined&&next.profile.id!==raw.memberId)throw Error('Liaison canonique du profil invalide.');
   next.householdId=raw.householdId;next.memberId=raw.memberId;next.permissions={};for(const key of permissionKeys)next.permissions[key]=raw.permissions[key]===true;
   const category=next.profile.memberCategory;
   next.permissions.familyRolesVerified=capabilities.familyRolesReady;
   next.permissions.canManageHousehold=category==='parent'&&capabilities.familyRolesReady&&raw.permissions.canManageHousehold===true;
   next.permissions.canLinkExistingChild=next.permissions.canManageHousehold&&capabilities.childAccountLinkReady;
   next.permissions.canCompleteMissionsV3=['parent','child'].includes(category)&&raw.permissions.canCompleteMissionsV3===true;
   if(category==='child')for(const key of ['canEdit','canCreate','canManageDependents','canInvite','canManageHousehold','canLinkExistingChild'])next.permissions[key]=false;
   if(category==='baby'||category==='pet')for(const key of [...permissionKeys,'canManageHousehold','canLinkExistingChild'])next.permissions[key]=false;
   next.pendingCeremony=raw.pendingCeremony===true;
   if(raw.familyRevision!==undefined){if(!Number.isSafeInteger(raw.familyRevision)||raw.familyRevision<1)throw Error('Révision familiale serveur invalide.');next.familyRevision=raw.familyRevision;}
  }
  return next;
 }
 async function refresh(expected={}){
  if(pendingAdmission)return state();
  if(admissionSession?.owner===signature(current()))return inspectAdmission(admissionSession.id);
  const ticket=++generation,native=current();clear();
  if(!native.ready)return publish({phase:'unavailable'});
  if(!native.userId){const pending=await driver.meta('v7-auth-pending');guard(native);return publish({phase:pending&&driver.now()-pending.createdAt<86400000?'email-confirmation':'signed-out'});}
  publish({phase:'unavailable',userId:native.userId});
  try{const raw=await rpc('dobby_v7_context'),caps=await capabilities(native),next=context(raw,native,caps);guard(native);if(ticket!==generation)throw Error('Le contexte d’identité a changé.');
   if(expected.householdId&&(next.phase!=='active'||next.householdId!==expected.householdId||expected.memberId&&next.memberId!==expected.memberId||next.profile?.memberCategory!==expected.category))throw Error('Le profil existant n’a pas été confirmé. Aucun profil local n’a été remplacé.');
   if(next.phase==='active'){await driver.bind(next,native);guard(native);if(ticket!==generation)throw Error('Le contexte d’identité a changé.');next.verified=true;}
   return publish(next);
  }catch(error){if(ticket===generation&&signature(current())===signature(native)){clear();publish({phase:error.status===401||error.status===403?'rejected':'unavailable',userId:native.userId});}if(error.code==='PGRST202'||error.status===404)return state();throw error;}
 }
 function credentials(email,password){if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email.trim())||email.length>254)throw Error('Indiquez une adresse e-mail valide.');if(typeof password!=='string'||!password||password.length>4096)throw Error('Indiquez votre mot de passe.');return{email:email.trim(),password};}
 async function forgetAuthFlow(id){if(!id)return false;let matched=false;await driver.updateMeta('v7-auth-pending',pending=>{if(pending?.id!==id)return pending;matched=true;return null;});await driver.delMeta('v7-auth-flow:'+id);return matched;}
 async function install(result,before,pendingFlowId){guard(before);if(!result?.access_token||!result?.refresh_token||!result.user?.id)throw Error('Réponse de connexion incomplète.');await driver.installSession(result,before);pendingAdmission=null;admissionSession=null;await forgetAuthFlow(pendingFlowId);return refresh();}
 async function signIn(email,password,{admissionId,expectedUserId}={}){const before=requireConfigured(),body=credentials(email,password);if(admissionId!==undefined&&!uuid(admissionId)||expectedUserId!==undefined&&!uuid(expectedUserId))throw Error('Identifiant d’admission ou de compte invalide.');const pending=await driver.meta('v7-auth-pending');guard(before);let result;try{result=await driver.auth('/auth/v1/token?grant_type=password','POST',body);}catch(error){throw failure(error,'auth');}if(admissionId){if(expectedUserId&&result?.user?.id!==expectedUserId)throw Error('Ce compte ne correspond pas à l’admission à reprendre.');return installAdmissionSession(result,before,admissionId,pending?.id);}return install(result,before,pending?.id);}
 const base64=bytes=>{let text='';for(const byte of bytes)text+=String.fromCharCode(byte);return btoa(text).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
 async function digest(text){return base64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))));}
 async function startFlow(type,redirectTo){
  if(!crypto?.subtle||!crypto?.getRandomValues)throw Error('Le navigateur doit disposer d’un contexte HTTPS sécurisé.');
  const redirect=new URL(redirectTo);if(redirect.username||redirect.password||!(redirect.protocol==='https:'||redirect.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(redirect.hostname)))throw Error('Adresse de retour sécurisée requise.');
  if(redirect.search||redirect.hash)throw Error('Une adresse de retour exacte, sans paramètre ni fragment, est requise.');
  // Exact production redirect: the latest browser flow owns the verifier. A code
  // from an older email cannot match the newer verifier at the Auth server.
  const previous=await driver.meta('v7-auth-pending');
  const id=crypto.randomUUID(),verifier=base64(crypto.getRandomValues(new Uint8Array(48))),createdAt=driver.now(),userId=current().userId||null;
  if(previous?.id)await driver.delMeta('v7-auth-flow:'+previous.id);
  await driver.putMeta('v7-auth-flow:'+id,{type,verifier,createdAt,userId,redirectTo:redirect.href});await driver.putMeta('v7-auth-pending',{id,type,createdAt});
  return{id,path:'?redirect_to='+encodeURIComponent(redirect.href),body:{code_challenge:await digest(verifier),code_challenge_method:'s256'}};
 }
 async function signUp(email,password,{redirectTo}={}){const before=requireConfigured(),body=credentials(email,password),flow=await startFlow('signup',redirectTo);guard(before);let result;try{result=await driver.auth('/auth/v1/signup'+flow.path,'POST',{...body,...flow.body});}catch(error){throw failure(error);}guard(before);if(result?.access_token){if(!await forgetAuthFlow(flow.id))throw Error('Ce parcours de confirmation a été remplacé. Utilisez le dernier lien demandé.');return install(result,before);}return publish({phase:'email-confirmation'});}
 async function recover(email,{redirectTo}={}){const before=requireConfigured(),body=credentials(email,'unused'),flow=await startFlow('recovery',redirectTo);guard(before);try{await driver.auth('/auth/v1/recover'+flow.path,'POST',{email:body.email,...flow.body});}catch(error){throw failure(error);}guard(before);return publish({phase:'email-confirmation',userId:before.userId||null});}
 async function confirmFromURL(value){
  const url=new URL(value),cleanURL=cleanAuthURL(value),before=requireConfigured();
  const fragment=url.hash.slice(1),split=fragment.indexOf('?'),hash=new URLSearchParams(split<0?fragment:fragment.slice(split+1));
  if(url.searchParams.has('error')||hash.has('error'))throw Object.assign(Error('Le lien de confirmation a expiré ou a été refusé.'),{cleanURL});
  if(url.searchParams.has('token_hash')||hash.has('token_hash')){
   pendingAdmission=null;
   const values=key=>[...url.searchParams.getAll(key),...hash.getAll(key)],tokens=values('token_hash'),types=values('type'),ids=values('admission_id');
   if(tokens.length!==1||!/^[A-Za-z0-9_-]{16,512}$/.test(tokens[0])||types.length!==1||!['invite','magiclink'].includes(types[0])||ids.length!==1||!uuid(ids[0])||['code','access_token','refresh_token','token','dobby_flow'].some(key=>values(key).length))throw Object.assign(Error('Lien d’admission invalide ou ambigu.'),{cleanURL});
   // The bearer is kept only in this one-shot closure. Merely opening a page
   // must never consume an Admin invitation or a login link.
   pendingAdmission={tokenHash:tokens[0],type:types[0],id:ids[0],owner:signature(before),createdAt:driver.now()};
   clear();return{...publish({phase:'admission-confirmation',userId:before.userId||null,admissionId:ids[0]}),cleanURL};
  }
  const code=url.searchParams.get('code');if(!code)return{...state(),cleanURL};
  const pending=await driver.meta('v7-auth-pending');guard(before);
  const id=pending?.id,explicitId=url.searchParams.get('dobby_flow');if(!id||!(/^[a-zA-Z0-9-]{16,80}$/).test(id)||explicitId&&explicitId!==id)throw Object.assign(Error('Confirmation introuvable dans ce navigateur. Connectez-vous après validation de votre e-mail.'),{cleanURL});
  const flow=await driver.meta('v7-auth-flow:'+id);guard(before);
  if(!flow?.verifier||!['signup','recovery'].includes(flow.type)||!Number.isFinite(flow.createdAt)||driver.now()-flow.createdAt<0||driver.now()-flow.createdAt>86400000||(flow.userId||null)!==(before.userId||null)||new URL(flow.redirectTo).origin!==url.origin||new URL(flow.redirectTo).pathname!==url.pathname)throw Object.assign(Error('Confirmation introuvable dans ce navigateur. Connectez-vous après validation de votre e-mail.'),{cleanURL});
  let result;try{result=await driver.auth('/auth/v1/token?grant_type=pkce','POST',{auth_code:code,code_verifier:flow.verifier});}catch(error){throw Object.assign(failure(error),{cleanURL});}
  guard(before);if(!await forgetAuthFlow(id))throw Object.assign(Error('Ce parcours de confirmation a été remplacé. Utilisez le dernier lien demandé.'),{cleanURL});
  await install(result,before);if(flow.type==='recovery')publish({...state(),recovery:true});return{...state(),cleanURL};
 }
 function boundedAdmission(id){const before=requireSession(true);if(!admissionSession||admissionSession.id!==id||admissionSession.owner!==signature(before)||driver.now()-admissionSession.createdAt<0||driver.now()-admissionSession.createdAt>600000)throw Error('Cette session d’admission a expiré. Ouvrez un nouveau lien de confirmation.');return before;}
 async function installAdmissionSession(result,before,admissionId,pendingFlowId){
  guard(before);if(!result?.access_token||!result?.refresh_token||!uuid(result.user?.id))throw Error('Réponse de confirmation incomplète.');
  const saved=await driver.meta('v7-admission-resume');guard(before);
  ++generation;await driver.installSession(result,before,{admissionId});
  const native=requireSession(true);if(native.userId!==result.user.id||native.epoch!==before.epoch+1)throw Error('Le compte a changé pendant la confirmation.');
  pendingAdmission=null;admissionSession={id:admissionId,owner:signature(native),createdAt:driver.now(),operationId:saved?.admissionId===admissionId&&saved.userId===native.userId&&uuid(saved.operationId)?saved.operationId:null};
  publish({phase:'admission',userId:native.userId,authenticated:true,admission:null,admissionId});
  // A UUID is not a bearer. Remember it only after verified Auth so a reload
  // can explicitly resume with the same account and operation, without a JWT.
  await driver.putMeta('v7-admission-resume',{admissionId,userId:native.userId,...(admissionSession.operationId?{operationId:admissionSession.operationId}:{})});guard(native);
  await forgetAuthFlow(pendingFlowId);guard(native);return inspectAdmission(admissionId);
 }
 async function confirmAdmission(){
  if(confirmationFlight)return confirmationFlight;
  const pending=pendingAdmission;pendingAdmission=null;
  if(!pending||pending.owner!==signature(current())||driver.now()-pending.createdAt<0||driver.now()-pending.createdAt>600000)throw Error('Ce lien de confirmation n’est plus disponible. Demandez un nouveau lien.');
  confirmationFlight=(async()=>{
   const before=requireConfigured();let result;
   try{result=await driver.auth('/auth/v1/verify','POST',{token_hash:pending.tokenHash,type:pending.type});}catch(error){throw failure(error,'auth');}
   return installAdmissionSession(result,before,pending.id);
  })().finally(()=>confirmationFlight=null);
  return confirmationFlight;
 }
 function admissionDescriptor(raw,id){
  if(raw===null)return null;
  if(!object(raw)||raw.id!==id||!['new-household','family-parent','family-child'].includes(raw.purpose)||!['requested','approved','delivering','sent','accepted','rejected','revoked','expired'].includes(raw.state)||typeof raw.expiresAt!=='string'||!Number.isFinite(Date.parse(raw.expiresAt))||raw.requiresProfile!==(raw.purpose!=='family-child')||raw.householdId!==null&&!uuid(raw.householdId)||raw.memberId!==null&&(typeof raw.memberId!=='string'||!raw.memberId||raw.memberId.length>120))throw Error('Admission serveur incohérente.');
  if(raw.purpose==='new-household'?(raw.householdId!==null||raw.memberId!==null):!uuid(raw.householdId)||raw.purpose==='family-child'&&!raw.memberId)throw Error('La cible de l’admission est incohérente.');
  return{id:raw.id,purpose:raw.purpose,state:raw.state,expiresAt:raw.expiresAt,requiresProfile:raw.requiresProfile,householdId:raw.householdId,memberId:raw.memberId};
 }
 async function inspectAdmission(input=admissionSession?.id){
  const id=object(input)?input.admissionId:input;if(!uuid(id))throw Error('Identifiant d’admission invalide.');
  if(!admissionSession||admissionSession.owner!==signature(current())){
   const native=requireSession(true);driver.beginAdmission?.(id,native);const fresh=requireSession(true);
   ++generation;clear();admissionSession={id,owner:signature(fresh),createdAt:driver.now(),operationId:null};
  }
  const before=boundedAdmission(id),ticket=++generation;publish({phase:'admission',userId:before.userId,authenticated:true,admission:null,admissionId:id});
  const raw=await rpc('dobby_access_context',{p_admission_id:id},{admission:true});guard(before);
  if(ticket!==generation)throw Error('Le contexte d’admission a changé.');
  if(!object(raw)||raw.protocol!==1||!['unapproved','active','suspended'].includes(raw.status))throw Error('Contexte d’admission incohérent.');
  const admission=admissionDescriptor(raw.admission,id);
  return publish({phase:raw.status==='suspended'?'rejected':'admission',userId:before.userId,authenticated:true,admission,admissionId:id});
 }
 async function admit({admissionId=admissionSession?.id,profile:values,operationId}={}){
  if(admissionFlight)return admissionFlight;
  if(!uuid(admissionId))throw Error('Identifiant d’admission invalide.');
  const before=boundedAdmission(admissionId),live=state(),admission=live.admission;
  if(live.phase!=='admission'||!admission||admission.id!==admissionId)throw Error('Vérifiez votre admission avant de la confirmer.');
  let personal=null;if(admission.requiresProfile)personal=validateProfile(values);else if(values!==undefined&&values!==null)throw Error('Le profil enfant existant ne peut pas être remplacé.');
  const id=operationId||admissionSession.operationId||crypto.randomUUID();if(!uuid(id))throw Error('Identifiant d’opération invalide.');admissionSession.operationId=id;
  const ticket=++generation;admissionFlight=(async()=>{
   await driver.putMeta('v7-admission-resume',{admissionId,userId:before.userId,operationId:id});guard(before);
   const result=await rpc('dobby_access_accept',{p_admission_id:admissionId,p_profile:personal,p_operation_id:id},{admission:true});guard(before);
   if(ticket!==generation)throw Error('Le contexte d’admission a changé.');
   if(!object(result)||result.protocol!==1||result.accepted!==true||result.admissionId!==admissionId)throw Error('La confirmation transactionnelle de l’admission est indisponible.');
   await driver.updateMeta('v7-admission-resume',saved=>{guard(before);return saved?.admissionId===admissionId&&saved.userId===before.userId?null:saved;});guard(before);
   await driver.completeAdmission?.(before,admissionId);guard(before);admissionSession=null;
   return refresh(admission.purpose==='new-household'?{}:{householdId:admission.householdId,memberId:admission.purpose==='family-child'?admission.memberId:result.memberId,category:admission.purpose==='family-child'?'child':'parent'});
  })().finally(()=>admissionFlight=null);return admissionFlight;
 }
 async function updatePassword(password){const before=requireSession();credentials('valid@example.test',password);try{await driver.auth('/auth/v1/user','PUT',{password},{authenticated:true});}catch(error){throw failure(error);}guard(before);return publish({...state(),recovery:false});}
 function validateProfile(values){if(!object(values))throw Error('Profil invalide.');const allowed=['firstName','lastName','birthdate','avatarId'];if(Object.keys(values).some(key=>!allowed.includes(key)))throw Error('Champ de profil non autorisé.');const result={};for(const key of allowed)if(values[key]!==undefined){if(typeof values[key]!=='string'||values[key].length>80)throw Error('Champ de profil invalide.');result[key]=values[key].trim();}if(!result.firstName||[result.firstName,result.lastName].filter(Boolean).join(' ').length>80)throw Error('Indiquez un prénom et un nom de 80 caractères maximum.');if(result.birthdate&&!/^\d{4}-\d{2}-\d{2}$/.test(result.birthdate))throw Error('Date de naissance invalide.');if(result.avatarId&&!/^portrait-([1-9]|1\d|2[0-4])$/.test(result.avatarId))throw Error('Portrait invalide.');return result;}
 async function mutate(name,body,before=requireSession()){guardMutation(before);await rpc(name,body);guard(before);return refresh();}
 async function saveProfile(values,{expectedRevision}={}){const live=state(),body={p_profile:validateProfile(values)};if(live.phase==='active'){if(!live.verified||live.permissions.canEdit!==true)throw Error('Modification de ce profil non autorisée.');const revision=expectedRevision===undefined?live.familyRevision:expectedRevision;if(!Number.isSafeInteger(revision)||revision<1)throw Error('Révision familiale à vérifier avant de modifier le profil.');body.p_expected_revision=revision;}return mutate('dobby_v7_update_profile',body);}
 async function operation(kind,scope=''){const before=requireSession(),key='v7-operation:'+before.userId+':'+kind+(scope?':'+await digest(scope):'');guard(before);let id=await driver.meta(key);guard(before);if(!id){id=crypto.randomUUID();await driver.putMeta(key,id);guard(before);}return id;}
 async function createHousehold(name){const before=requireSession();if(typeof name!=='string'||!name.trim()||name.trim().length>100)throw Error('Indiquez un nom de foyer de 1 à 100 caractères.');const id=await operation('create-household');guardMutation(before);return mutate('dobby_v7_create_household',{p_name:name.trim(),p_operation_id:id},before);}
 function invitationToken(token){if(typeof token!=='string'||token.trim().length<8||token.length>512||/\s/.test(token.trim()))throw Error('Code d’invitation invalide.');return token.trim();}
 async function previewInvitation(token){const before=requireConfigured(),raw=await rpc('dobby_v7_preview_invitation',{p_token:invitationToken(token)},{public:true});guard(before);if(!object(raw)||!['valid','expired','invalid'].includes(raw.status))throw Error('État de l’invitation indisponible.');let invitation={status:raw.status};if(raw.status==='valid'){if(!object(raw.household)||typeof raw.household.id!=='string'||typeof raw.household.name!=='string'||!raw.household.name.trim()||!object(raw.inviter)||typeof raw.inviter.name!=='string'||!raw.inviter.name.trim())throw Error('Invitation serveur incomplète.');invitation={...invitation,household:{id:raw.household.id,name:raw.household.name.slice(0,100)},inviter:{name:raw.inviter.name.slice(0,100)},...(typeof raw.expiresAt==='string'?{expiresAt:raw.expiresAt}:{})};}publish({...state(),invitation});return clone(invitation);}
 async function acceptInvitation(token){const before=requireSession(),clean=invitationToken(token),id=await operation('accept-invitation',clean);guardMutation(before);return mutate('dobby_v7_accept_invitation',{p_token:clean,p_operation_id:id},before);}
 async function createInvitation({expiresInHours=168,operationId}={}){const before=requireSession(),live=state();if(!live.verified||live.permissions.canInvite!==true)throw Error('Ce compte n’est pas autorisé à inviter un membre.');if(!Number.isInteger(expiresInHours)||expiresInHours<1||expiresInHours>720)throw Error('Durée de l’invitation invalide.');const id=operationId||await operation('create-invitation',String(expiresInHours));guardMutation(before);const raw=await rpc('dobby_v7_create_invitation',{p_expires_in_hours:expiresInHours,p_operation_id:id});guard(before);if(!object(raw)||raw.protocol!==1||typeof raw.token!=='string'||raw.token.length<8||raw.token.length>512||!object(raw.household)||raw.household.id!==live.householdId||typeof raw.household.name!=='string'||!object(raw.inviter)||typeof raw.inviter.name!=='string'||typeof raw.expiresAt!=='string')throw Error('Invitation créée sans confirmation serveur exploitable.');return{protocol:1,token:raw.token,expiresAt:raw.expiresAt,household:{id:raw.household.id,name:raw.household.name},inviter:{name:raw.inviter.name}};}
 function childInvitation(raw){
  if(!object(raw)||!['valid','expired','invalid','unavailable'].includes(raw.status))throw Error('État de l’invitation enfant indisponible.');
  const result={status:raw.status,kind:'child-account'};
  if(raw.status!=='valid')return result;
  if(raw.kind!=='child-account'||typeof raw.targetMemberId!=='string'||!raw.targetMemberId||raw.targetMemberId.length>120||!object(raw.household)||typeof raw.household.id!=='string'||!raw.household.id||typeof raw.household.name!=='string'||!raw.household.name.trim()||!object(raw.inviter)||typeof raw.inviter.name!=='string'||!raw.inviter.name.trim()||typeof raw.expiresAt!=='string')throw Error('Invitation enfant serveur incomplète.');
  return{...result,targetMemberId:raw.targetMemberId,household:{id:raw.household.id,name:raw.household.name.slice(0,100)},inviter:{name:raw.inviter.name.slice(0,100)},expiresAt:raw.expiresAt};
 }
 async function previewChildInvitation(token){
  const before=requireConfigured(),clean=invitationToken(token),caps=await capabilities(before);guard(before);
  const invitation=caps.childAccountLinkReady?childInvitation(await rpc('dobby_v7_preview_child_invitation',{p_token:clean},{public:true})):{status:'unavailable',kind:'child-account'};guard(before);
  childPreview=invitation.status==='valid'?{token:clean,owner:signature(before),invitation:clone(invitation)}:null;
  publish({...state(),capabilities:caps,invitation});return clone(invitation);
 }
 async function createChildInvitation({memberId,expiresInHours=168,operationId}={}){
  const before=requireSession(),live=state();
  if(!live.verified||!live.capabilities.childAccountLinkReady||live.permissions.canManageHousehold!==true||live.permissions.canLinkExistingChild!==true)throw Error('Le rattachement sécurisé d’un compte enfant n’est pas encore disponible.');
  if(typeof memberId!=='string'||!memberId.trim()||memberId.length>120)throw Error('Profil enfant existant requis.');
  if(!Number.isInteger(expiresInHours)||expiresInHours<1||expiresInHours>720)throw Error('Durée de l’invitation invalide.');
  const id=operationId||await operation('create-child-invitation',JSON.stringify([memberId,expiresInHours]));
  guardMutation(before);
  const raw=await rpc('dobby_v7_create_child_invitation',{p_member_id:memberId,p_expires_in_hours:expiresInHours,p_operation_id:id});guard(before);
  if(!object(raw)||raw.protocol!==1||typeof raw.token!=='string')throw Error('Invitation enfant créée sans confirmation serveur exploitable.');
  const invitation=childInvitation({...raw,status:'valid'});
  if(invitation.targetMemberId!==memberId||invitation.household.id!==live.householdId)throw Error('La cible de l’invitation enfant n’a pas été confirmée.');
  return{protocol:1,...invitation,token:invitationToken(raw.token)};
 }
 async function acceptChildInvitation(token){
  const before=requireSession(),live=state(),clean=invitationToken(token);
  if(!live.capabilities.childAccountLinkReady||!['profile','household','active'].includes(live.phase)||live.phase==='active'&&!live.verified)throw Error('Le rattachement sécurisé d’un compte enfant n’est pas encore disponible.');
  const preview=childPreview?.token===clean&&childPreview.owner===signature(before)?childPreview.invitation:await previewChildInvitation(clean);guard(before);
  if(preview.status!=='valid')throw Error('Cette invitation enfant n’est pas valide ou n’est plus disponible.');
  if(live.phase==='active'&&(live.profile?.memberCategory!=='child'||live.profile.id!==live.memberId||
    live.memberId!==preview.targetMemberId||live.householdId!==preview.household.id))
   throw Error('Le rejeu de cette invitation est réservé au même profil enfant canonique et au même foyer.');
  const id=await operation('accept-child-invitation',clean);
  guardMutation(before);
  await rpc('dobby_v7_accept_child_invitation',{p_token:clean,p_operation_id:id});guard(before);
  // Never save/copy an onboarding profile. The fresh context must still name
  // the exact existing child; a mutation response cannot establish identity.
  return refresh({householdId:preview.household.id,memberId:preview.targetMemberId,category:'child'});
 }
 async function updateMagic({memberId,values,expectedRevision,operationId}={}){const before=requireSession(),live=state();if(!live.verified||live.permissions.canMagic!==true||memberId!==live.memberId&&(live.profile?.memberCategory==='child'||live.permissions.canManageDependents!==true&&live.permissions.canManageHousehold!==true))throw Error('Modification de ce membre non autorisée.');if(!object(values)||!Object.keys(values).length||Object.keys(values).some(key=>!['magicHouseId','magicHouseAlgorithm','magicPatronusId','magicPatronusAlgorithm','magicCeremony'].includes(key)))throw Error('Valeurs du profil magique invalides.');if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)throw Error('Révision familiale à vérifier avant de modifier le profil.');const id=operationId||await operation('update-magic',JSON.stringify([memberId,expectedRevision,values]));guardMutation(before);return mutate('dobby_v7_update_magic',{p_member_id:memberId,p_values:clone(values),p_expected_revision:expectedRevision,p_operation_id:id},before);}
 async function updateMember({memberId,values,expectedRevision,operationId}={}){const before=requireSession(),live=state();if(!live.verified||live.profile?.memberCategory==='child'||live.permissions.canEdit!==true||memberId!==live.memberId&&live.permissions.canManageDependents!==true&&live.permissions.canManageHousehold!==true)throw Error('Modification de ce membre non autorisée.');const fields=['name','firstName','lastName','profileFirstName','profileLastName','birthdate','avatar','magicAvatarId','nickname','notes','species','memberCategory','clearBirthdate'];if(!object(values)||!Object.keys(values).length||Object.keys(values).some(key=>!fields.includes(key)||typeof values[key]!=='string'))throw Error('Champ du profil non autorisé.');if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)throw Error('Révision familiale à vérifier avant de modifier le profil.');const id=operationId||await operation('update-member',JSON.stringify([memberId,expectedRevision,values]));guardMutation(before);await mutate('dobby_v7_update_member',{p_member_id:memberId,p_values:clone(values),p_expected_revision:expectedRevision,p_operation_id:id},before);return memberId;}
 async function logout(){++generation;childPreview=null;pendingAdmission=null;admissionSession=null;const pending=await driver.meta('v7-auth-pending');await driver.logout();await forgetAuthFlow(pending?.id);clear();return publish(blank());}
 return Object.freeze({ready:Promise.resolve(),state,refresh,signIn,signUp,recover,confirmFromURL,confirmAdmission,inspectAdmission,admit,updatePassword,saveProfile,previewInvitation,createHousehold,acceptInvitation,createInvitation,previewChildInvitation,createChildInvitation,acceptChildInvitation,updateMagic,updateMember,logout,cleanURL:cleanAuthURL});
}

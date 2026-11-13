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
const sensitive=['code','dobby_flow','access_token','refresh_token','token','token_hash','type','expires_in','expires_at','token_type','error','error_description','error_code'];
export function cleanAuthURL(value){const url=new URL(value);for(const key of sensitive)url.searchParams.delete(key);const hash=new URLSearchParams(url.hash.slice(1));if(sensitive.some(key=>hash.has(key)))url.hash='';return url.href;}
export function createFamilyAccess(driver){
 const crypto=driver.crypto||globalThis.crypto;
 const blank=()=>({phase:'signed-out',userId:null,householdId:null,memberId:null,profile:null,permissions:{},configured:Boolean(driver.snapshot().configured),authenticated:false,verified:false,pendingCeremony:false,familyRevision:null});
 let value=blank(),owner=null,generation=0;
 const signature=s=>JSON.stringify([s.userId||null,s.epoch]);
 const current=()=>driver.snapshot();
 const guard=s=>{if(signature(current())!==signature(s))throw Error('Le compte a changé pendant cette opération.');};
 const publish=next=>{value={...blank(),...next};owner=signature(current());driver.notify?.();return state();};
 const clear=()=>driver.clearBinding();
 function state(){const native=current();if(owner!==null&&owner!==signature(native))return blank();const live={...value,configured:Boolean(native.configured)};if(live.verified&&!native.verified)Object.assign(live,{phase:native.rejected?'rejected':'unavailable',verified:false,memberId:null,permissions:{},pendingCeremony:false,familyRevision:null});return clone(live);}
 function requireConfigured(){const native=current();if(!native.ready)throw Error('La connexion native est en cours d’initialisation.');if(!native.configured)throw Error('Configuration publique indisponible pour la connexion.');return native;}
 function requireSession(){const native=requireConfigured();if(!native.userId)throw Error('Connexion requise.');return native;}
 function failure(error,stage='service'){const result=Error(error?.status===401||error?.status===403?'Accès refusé par le serveur familial.':error instanceof TypeError?'Réseau indisponible. Réessayez sans recréer votre compte.':'Service familial indisponible. Les capacités serveur doivent être vérifiées.');result.status=error?.status;result.code=error?.code;result.stage=stage;return result;}
 async function rpc(name,body={},options={}){try{return await driver.rpc(name,body,options);}catch(error){throw failure(error,name==='dobby_v7_context'?'context':'service');}}
 function profile(raw){if(raw===null||raw===undefined)return null;if(!object(raw))throw Error('Profil serveur invalide.');const result={};for(const key of ['id','name','firstName','lastName','birthdate','avatar','avatarId'])if(raw[key]!==undefined){if(typeof raw[key]!=='string'||raw[key].length>200)throw Error('Profil serveur invalide.');result[key]=raw[key];}if(raw.memberCategory!==undefined){if(!['parent','child','baby','pet'].includes(raw.memberCategory))throw Error('Catégorie du profil serveur invalide.');result.memberCategory=raw.memberCategory;}if(raw.magicProfile!==undefined){if(!object(raw.magicProfile))throw Error('Profil magique serveur invalide.');result.magicProfile=clone(raw.magicProfile);}return result;}
 function context(raw,native){
  if(!object(raw)||raw.protocol!==1||raw.userId!==native.userId||!['profile','household','active','rejected'].includes(raw.phase))throw Error('Contexte d’identité serveur incohérent.');
  const next={phase:raw.phase,userId:native.userId,profile:profile(raw.profile),authenticated:true};
  if(raw.reason==='existing_member_link_required')next.reason=raw.reason;
  if(raw.phase==='active'){
   if(typeof raw.householdId!=='string'||!raw.householdId||raw.householdId.length>120||typeof raw.memberId!=='string'||!raw.memberId||raw.memberId.length>120||!object(raw.permissions)||!next.profile||next.profile.id!==undefined&&next.profile.id!==raw.memberId)throw Error('Liaison canonique du profil invalide.');
   next.householdId=raw.householdId;next.memberId=raw.memberId;next.permissions={};for(const key of permissionKeys)next.permissions[key]=raw.permissions[key]===true;
   next.pendingCeremony=raw.pendingCeremony===true;
   if(raw.familyRevision!==undefined){if(!Number.isSafeInteger(raw.familyRevision)||raw.familyRevision<1)throw Error('Révision familiale serveur invalide.');next.familyRevision=raw.familyRevision;}
  }
  return next;
 }
 async function refresh(){
  const ticket=++generation,native=current();clear();
  if(!native.ready)return publish({phase:'unavailable'});
  if(!native.userId){const pending=await driver.meta('v7-auth-pending');guard(native);return publish({phase:pending&&driver.now()-pending.createdAt<86400000?'email-confirmation':'signed-out'});}
  publish({phase:'unavailable',userId:native.userId});
  try{const next=context(await rpc('dobby_v7_context'),native);guard(native);if(ticket!==generation)throw Error('Le contexte d’identité a changé.');
   if(next.phase==='active'){await driver.bind(next,native);guard(native);if(ticket!==generation)throw Error('Le contexte d’identité a changé.');next.verified=true;}
   return publish(next);
  }catch(error){if(ticket===generation&&signature(current())===signature(native)){clear();publish({phase:error.status===401||error.status===403?'rejected':'unavailable',userId:native.userId});}if(error.code==='PGRST202'||error.status===404)return state();throw error;}
 }
 function credentials(email,password){if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email.trim())||email.length>254)throw Error('Indiquez une adresse e-mail valide.');if(typeof password!=='string'||!password||password.length>4096)throw Error('Indiquez votre mot de passe.');return{email:email.trim(),password};}
 async function forgetAuthFlow(id){if(!id)return false;let matched=false;await driver.updateMeta('v7-auth-pending',pending=>{if(pending?.id!==id)return pending;matched=true;return null;});await driver.delMeta('v7-auth-flow:'+id);return matched;}
 async function install(result,before,pendingFlowId){guard(before);if(!result?.access_token||!result?.refresh_token||!result.user?.id)throw Error('Réponse de connexion incomplète.');await driver.installSession(result,before);await forgetAuthFlow(pendingFlowId);return refresh();}
 async function signIn(email,password){const before=requireConfigured(),body=credentials(email,password),pending=await driver.meta('v7-auth-pending');guard(before);let result;try{result=await driver.auth('/auth/v1/token?grant_type=password','POST',body);}catch(error){throw failure(error,'auth');}return install(result,before,pending?.id);}
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
  if(url.searchParams.has('error')||new URLSearchParams(url.hash.slice(1)).has('error'))throw Object.assign(Error('Le lien de confirmation a expiré ou a été refusé.'),{cleanURL});
  const code=url.searchParams.get('code');if(!code)return{...state(),cleanURL};
  const pending=await driver.meta('v7-auth-pending');guard(before);
  const id=pending?.id,explicitId=url.searchParams.get('dobby_flow');if(!id||!(/^[a-zA-Z0-9-]{16,80}$/).test(id)||explicitId&&explicitId!==id)throw Object.assign(Error('Confirmation introuvable dans ce navigateur. Connectez-vous après validation de votre e-mail.'),{cleanURL});
  const flow=await driver.meta('v7-auth-flow:'+id);guard(before);
  if(!flow?.verifier||!['signup','recovery'].includes(flow.type)||!Number.isFinite(flow.createdAt)||driver.now()-flow.createdAt<0||driver.now()-flow.createdAt>86400000||(flow.userId||null)!==(before.userId||null)||new URL(flow.redirectTo).origin!==url.origin||new URL(flow.redirectTo).pathname!==url.pathname)throw Object.assign(Error('Confirmation introuvable dans ce navigateur. Connectez-vous après validation de votre e-mail.'),{cleanURL});
  let result;try{result=await driver.auth('/auth/v1/token?grant_type=pkce','POST',{auth_code:code,code_verifier:flow.verifier});}catch(error){throw Object.assign(failure(error),{cleanURL});}
  guard(before);if(!await forgetAuthFlow(id))throw Object.assign(Error('Ce parcours de confirmation a été remplacé. Utilisez le dernier lien demandé.'),{cleanURL});
  await install(result,before);if(flow.type==='recovery')publish({...state(),recovery:true});return{...state(),cleanURL};
 }
 async function updatePassword(password){const before=requireSession();credentials('valid@example.test',password);try{await driver.auth('/auth/v1/user','PUT',{password},{authenticated:true});}catch(error){throw failure(error);}guard(before);return publish({...state(),recovery:false});}
 function validateProfile(values){if(!object(values))throw Error('Profil invalide.');const allowed=['firstName','lastName','birthdate','avatarId'];if(Object.keys(values).some(key=>!allowed.includes(key)))throw Error('Champ de profil non autorisé.');const result={};for(const key of allowed)if(values[key]!==undefined){if(typeof values[key]!=='string'||values[key].length>80)throw Error('Champ de profil invalide.');result[key]=values[key].trim();}if(!result.firstName||[result.firstName,result.lastName].filter(Boolean).join(' ').length>80)throw Error('Indiquez un prénom et un nom de 80 caractères maximum.');if(result.birthdate&&!/^\d{4}-\d{2}-\d{2}$/.test(result.birthdate))throw Error('Date de naissance invalide.');if(result.avatarId&&!/^portrait-([1-9]|1\d|2[0-4])$/.test(result.avatarId))throw Error('Portrait invalide.');return result;}
 async function mutate(name,body){const before=requireSession();await rpc(name,body);guard(before);return refresh();}
 async function saveProfile(values,{expectedRevision}={}){const live=state(),body={p_profile:validateProfile(values)};if(live.phase==='active'){if(!live.verified||live.permissions.canEdit!==true)throw Error('Modification de ce profil non autorisée.');const revision=expectedRevision===undefined?live.familyRevision:expectedRevision;if(!Number.isSafeInteger(revision)||revision<1)throw Error('Révision familiale à vérifier avant de modifier le profil.');body.p_expected_revision=revision;}return mutate('dobby_v7_update_profile',body);}
 async function operation(kind,scope=''){const before=requireSession(),key='v7-operation:'+before.userId+':'+kind+(scope?':'+await digest(scope):'');guard(before);let id=await driver.meta(key);guard(before);if(!id){id=crypto.randomUUID();await driver.putMeta(key,id);guard(before);}return id;}
 async function createHousehold(name){requireSession();if(typeof name!=='string'||!name.trim()||name.trim().length>100)throw Error('Indiquez un nom de foyer de 1 à 100 caractères.');const id=await operation('create-household');return mutate('dobby_v7_create_household',{p_name:name.trim(),p_operation_id:id});}
 function invitationToken(token){if(typeof token!=='string'||token.trim().length<8||token.length>512||/\s/.test(token.trim()))throw Error('Code d’invitation invalide.');return token.trim();}
 async function previewInvitation(token){const before=requireConfigured(),raw=await rpc('dobby_v7_preview_invitation',{p_token:invitationToken(token)},{public:true});guard(before);if(!object(raw)||!['valid','expired','invalid'].includes(raw.status))throw Error('État de l’invitation indisponible.');let invitation={status:raw.status};if(raw.status==='valid'){if(!object(raw.household)||typeof raw.household.id!=='string'||typeof raw.household.name!=='string'||!raw.household.name.trim()||!object(raw.inviter)||typeof raw.inviter.name!=='string'||!raw.inviter.name.trim())throw Error('Invitation serveur incomplète.');invitation={...invitation,household:{id:raw.household.id,name:raw.household.name.slice(0,100)},inviter:{name:raw.inviter.name.slice(0,100)},...(typeof raw.expiresAt==='string'?{expiresAt:raw.expiresAt}:{})};}publish({...state(),invitation});return clone(invitation);}
 async function acceptInvitation(token){requireSession();const clean=invitationToken(token),id=await operation('accept-invitation',clean);return mutate('dobby_v7_accept_invitation',{p_token:clean,p_operation_id:id});}
 async function createInvitation({expiresInHours=168,operationId}={}){const before=requireSession(),live=state();if(!live.verified||live.permissions.canInvite!==true)throw Error('Ce compte n’est pas autorisé à inviter un membre.');if(!Number.isInteger(expiresInHours)||expiresInHours<1||expiresInHours>720)throw Error('Durée de l’invitation invalide.');const id=operationId||await operation('create-invitation',String(expiresInHours));const raw=await rpc('dobby_v7_create_invitation',{p_expires_in_hours:expiresInHours,p_operation_id:id});guard(before);if(!object(raw)||raw.protocol!==1||typeof raw.token!=='string'||raw.token.length<8||raw.token.length>512||!object(raw.household)||raw.household.id!==live.householdId||typeof raw.household.name!=='string'||!object(raw.inviter)||typeof raw.inviter.name!=='string'||typeof raw.expiresAt!=='string')throw Error('Invitation créée sans confirmation serveur exploitable.');return{protocol:1,token:raw.token,expiresAt:raw.expiresAt,household:{id:raw.household.id,name:raw.household.name},inviter:{name:raw.inviter.name}};}
 async function updateMagic({memberId,values,expectedRevision,operationId}={}){requireSession();const live=state();if(!live.verified||live.permissions.canMagic!==true||memberId!==live.memberId&&live.permissions.canManageDependents!==true)throw Error('Modification de ce membre non autorisée.');if(!object(values)||!Object.keys(values).length||Object.keys(values).some(key=>!['magicHouseId','magicHouseAlgorithm','magicPatronusId','magicPatronusAlgorithm','magicCeremony'].includes(key)))throw Error('Valeurs du profil magique invalides.');if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)throw Error('Révision familiale à vérifier avant de modifier le profil.');const id=operationId||await operation('update-magic',JSON.stringify([memberId,expectedRevision,values]));return mutate('dobby_v7_update_magic',{p_member_id:memberId,p_values:clone(values),p_expected_revision:expectedRevision,p_operation_id:id});}
 async function updateMember({memberId,values,expectedRevision,operationId}={}){requireSession();const live=state();if(!live.verified||live.permissions.canEdit!==true||memberId!==live.memberId&&live.permissions.canManageDependents!==true)throw Error('Modification de ce membre non autorisée.');const fields=['name','firstName','lastName','profileFirstName','profileLastName','birthdate','avatar','magicAvatarId','nickname','notes','species','memberCategory','clearBirthdate'];if(!object(values)||!Object.keys(values).length||Object.keys(values).some(key=>!fields.includes(key)||typeof values[key]!=='string'))throw Error('Champ du profil non autorisé.');if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)throw Error('Révision familiale à vérifier avant de modifier le profil.');const id=operationId||await operation('update-member',JSON.stringify([memberId,expectedRevision,values]));await mutate('dobby_v7_update_member',{p_member_id:memberId,p_values:clone(values),p_expected_revision:expectedRevision,p_operation_id:id});return memberId;}
 async function logout(){++generation;const pending=await driver.meta('v7-auth-pending');await driver.logout();await forgetAuthFlow(pending?.id);clear();return publish(blank());}
 return Object.freeze({ready:Promise.resolve(),state,refresh,signIn,signUp,recover,confirmFromURL,updatePassword,saveProfile,previewInvitation,createHousehold,acceptInvitation,createInvitation,updateMagic,updateMember,logout,cleanURL:cleanAuthURL});
}

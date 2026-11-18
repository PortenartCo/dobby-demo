import { createAuthAdmin } from './dobby-auth-admin.ts';
import type { AuthAdminConfig } from './dobby-auth-admin.ts';
import { AdminError,isUuid,normalizedEmail,readAdminRequest } from './dobby-admin-validation.ts';
import type { AdminPayload } from './dobby-admin-validation.ts';

export interface AdminHandlerConfig extends AuthAdminConfig {
 allowedOrigins:string[];
 redirectTo:string;
}
type JsonObject=Record<string,any>;

function configuredUrl(value:string){
 const parsed=new URL(value);
 if(parsed.username||parsed.password||parsed.hash||!['http:','https:'].includes(parsed.protocol))throw new Error('Invalid admin server configuration');
 if(parsed.protocol!=='https:'&&!['127.0.0.1','localhost','[::1]'].includes(parsed.hostname))throw new Error('Invalid admin server configuration');
 return parsed;
}
async function childOperation(operationId:string,phase:string):Promise<string>{
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`dobby-admin-v1:${operationId}:${phase}`))).slice(0,16);
 bytes[6]=(bytes[6]&15)|128;bytes[8]=(bytes[8]&63)|128;
 const hex=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

/** Native fetch only; safe to import without starting a server under Node or Deno. */
export function createAdminHandler(config:AdminHandlerConfig):(request:Request)=>Promise<Response>{
 const base=configuredUrl(config.supabaseUrl);
 if(base.search||base.pathname!=='/')throw new Error('Invalid admin server configuration');
 const redirect=configuredUrl(config.redirectTo);
 if(redirect.searchParams.has('token')||redirect.searchParams.has('token_hash')||redirect.searchParams.has('code'))throw new Error('Invalid admin server configuration');
 const origins=new Set(config.allowedOrigins.map(origin=>{
  const parsed=configuredUrl(origin);if(parsed.origin!==origin)throw new Error('Invalid admin server configuration');return origin;
 }));
 if(!origins.size||!config.anonKey||!config.serviceRoleKey)throw new Error('Invalid admin server configuration');
 const nativeFetch=config.fetch??globalThis.fetch;
 const auth=createAuthAdmin(config);
 const restBase=base.origin+'/rest/v1/rpc/';

 async function rpc(name:'dobby_access_context'|'dobby_access_admin',token:string,body:JsonObject):Promise<JsonObject>{
  let response:Response;
  try{response=await nativeFetch(restBase+name,{method:'POST',headers:{apikey:config.anonKey,authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(10000)});}catch{throw new AdminError(503,'database_unavailable');}
  if(!response.ok){
   if(response.status===401)throw new AdminError(401,'invalid_session');
   if(response.status===403)throw new AdminError(403,'owner_required');
   // SQL messages/hints can contain identifiers or payloads. Never forward them.
   throw new AdminError(response.status>=500?503:409,response.status>=500?'database_unavailable':'operation_conflict');
  }
  try{const result=await response.json();if(!result||typeof result!=='object'||Array.isArray(result))throw new Error();return result;}catch{throw new AdminError(503,'database_unavailable');}
 }
 const adminRpc=(token:string,command:string,payload:AdminPayload)=>rpc('dobby_access_admin',token,{p_command:command,p_payload:payload});
 async function owner(token:string){
  let response:Response;
  try{response=await nativeFetch(base.origin+'/auth/v1/user',{method:'GET',headers:{apikey:config.anonKey,authorization:`Bearer ${token}`},redirect:'error',signal:AbortSignal.timeout(10000)});}catch{throw new AdminError(503,'auth_unavailable');}
  if(!response.ok)throw new AdminError(response.status===401||response.status===403?401:503,response.status===401||response.status===403?'invalid_session':'auth_unavailable');
  let user:JsonObject;try{user=await response.json();}catch{throw new AdminError(401,'invalid_session');}
  if(!isUuid(user?.id))throw new AdminError(401,'invalid_session');
  const context=await rpc('dobby_access_context',token,{});
  if(context.isOwner!==true||context.status!=='active')throw new AdminError(403,'owner_required');
 }
 async function deliver(token:string,descriptor:JsonObject,operationId:string,explicitResume=false):Promise<JsonObject>{
  const admission=descriptor.admission;const delivery=descriptor.delivery;
  if(!admission||!delivery||!isUuid(admission.id)||!isUuid(delivery.id)||typeof admission.email!=='string')throw new AdminError(503,'database_unavailable');
  if(admission.state==='sent'||admission.state==='accepted')return {...descriptor,delivery:{...delivery,outcome:'sent',requiresResume:false}};
  if(delivery.requiresResume!==false)return {...descriptor,delivery:{...delivery,outcome:'uncertain',requiresResume:true}};
  try{
   const email=normalizedEmail(admission.email);
   const target=await auth.findByEmail(email);
   if(admission.targetUserId && (!target||target.id!==admission.targetUserId))throw new AdminError(409,'auth_identity_mismatch');
   const callback=new URL(redirect);callback.searchParams.set('admission_id',admission.id);
   let identity=target;
   if(identity){
    if(explicitResume&&identity.invited&&identity.confirmation==='unconfirmed')identity=await auth.reinvite(identity,callback.href);
    else await auth.magicLink(email,callback.href);
   }else identity=await auth.invite(email,callback.href);
   const recorded=await adminRpc(token,'recordDelivery',{admissionId:admission.id,deliveryId:delivery.id,targetUserId:identity.id,operationId:await childOperation(operationId,'record')});
   return {...recorded,delivery:{...recorded.delivery,outcome:'sent'}};
  }catch{
   // Sending and recording are separate transactions. Even an ambiguous failure
   // requires the owner's explicit resume command; never resend automatically.
   let failed=descriptor;
   try{failed=await adminRpc(token,'failDelivery',{admissionId:admission.id,deliveryId:delivery.id,operationId:await childOperation(operationId,'fail'),uncertain:true});}catch{/* Persisted attempting still blocks automatic replay. */}
   return {...failed,delivery:{...failed.delivery,outcome:'uncertain',requiresResume:true}};
  }
 }
 return async(request:Request):Promise<Response>=>{
  const origin=request.headers.get('origin');
  const headers=new Headers({'content-type':'application/json','cache-control':'no-store',vary:'Origin','x-content-type-options':'nosniff'});
  const respond=(status:number,value:unknown)=>new Response(value===null?null:JSON.stringify(value),{status,headers});
  try{
   if(origin!==null){if(!origins.has(origin))throw new AdminError(403,'origin_forbidden');headers.set('access-control-allow-origin',origin);}
   if(request.method==='OPTIONS'){
    const requestedMethod=request.headers.get('access-control-request-method');
    const requestedHeaders=request.headers.get('access-control-request-headers')?.split(',').map(value=>value.trim().toLowerCase())??[];
    if(!origin||requestedMethod!=='POST'||requestedHeaders.some(value=>!['authorization','content-type','apikey','x-client-info'].includes(value)))throw new AdminError(403,'origin_forbidden');
    headers.set('access-control-allow-methods','POST');headers.set('access-control-allow-headers','authorization, content-type, apikey, x-client-info');headers.set('access-control-max-age','600');
    return respond(204,null);
   }
   if(request.method!=='POST'){headers.set('allow','POST, OPTIONS');throw new AdminError(405,'method_not_allowed');}
   const {command,payload}=await readAdminRequest(request);
   const authorization=request.headers.get('authorization')??'';
   const match=/^Bearer ([A-Za-z0-9._~-]+)$/i.exec(authorization);
   if(!match||match[1].length>8192)throw new AdminError(401,'invalid_session');
   const token=match[1];await owner(token);
   let result=await adminRpc(token,command,payload);
   if(command==='setStatus'&&result.status==='active'&&result.sessionBoundaryPending===true){
    if(!Number.isSafeInteger(result.revision))throw new AdminError(503,'database_unavailable');
    // Phase 1 must commit before the session cutoff. Replaying the same public
    // command after a crash reads pending=true and safely completes phase 2.
    result=await adminRpc(token,'finalizeReactivation',{userId:payload.userId,expectedRevision:result.revision});
    if(result.status!=='active'||result.sessionBoundaryPending!==false)throw new AdminError(503,'database_unavailable');
   }
   else if(command==='resumeDelivery')result=await deliver(token,result,String(payload.operationId),true);
   else if(command==='invite'||(command==='decide'&&payload.decision==='approve')){
    if(result.admission?.state==='sent'||result.admission?.state==='accepted')return respond(200,{ok:true,result});
    if(result.replayed===true){
     // SQL returns the current admission on replay. Its revision may have moved
     // since the original claim; never reuse the child operation with new CAS
     // input or silently start delivery after an interrupted original request.
     if(['approved','delivering'].includes(result.admission?.state))result={...result,delivery:{outcome:'uncertain',requiresResume:true}};
     return respond(200,{ok:true,result});
    }
    if(!isUuid(result.admission?.id)||!Number.isSafeInteger(result.admission?.revision))throw new AdminError(503,'database_unavailable');
    const descriptor=await adminRpc(token,'claimDelivery',{admissionId:result.admission.id,expectedRevision:result.admission.revision,operationId:await childOperation(String(payload.operationId),'claim')});
    result=await deliver(token,descriptor,String(payload.operationId));
   }
   return respond(200,{ok:true,result});
  }catch(error){
   return respond(error instanceof AdminError?error.status:500,{ok:false,error:{code:error instanceof AdminError?error.code:'internal_error'}});
  }
 };
}

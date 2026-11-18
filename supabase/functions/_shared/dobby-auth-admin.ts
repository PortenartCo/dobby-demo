import { AdminError,isUuid,normalizedEmail } from './dobby-admin-validation.ts';

export interface AuthAdminConfig {
 supabaseUrl:string;
 anonKey:string;
 serviceRoleKey:string;
 fetch?:typeof fetch;
}
export interface AuthIdentity {
 id:string;
 email:string;
 confirmation:'confirmed'|'unconfirmed'|'unknown';
 invited:boolean;
}

/** No DB client or arbitrary URL/proxy method is exposed by this capability. */
export function createAuthAdmin(config:AuthAdminConfig){
 const nativeFetch=config.fetch??globalThis.fetch;
 const base=config.supabaseUrl.replace(/\/$/,'')+'/auth/v1';
 async function authRequest(path:string,method:string,body:unknown,elevated=true){
  let response:Response;
  try{
   response=await nativeFetch(base+path,{method,headers:{apikey:elevated?config.serviceRoleKey:config.anonKey,authorization:`Bearer ${elevated?config.serviceRoleKey:config.anonKey}`,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error',signal:AbortSignal.timeout(10000)});
  }catch{throw new AdminError(502,'auth_unavailable');}
  if(!response.ok)throw new AdminError(502,'auth_unavailable');
  try{return await response.json();}catch{throw new AdminError(502,'auth_unavailable');}
 }
 function identity(value:unknown,email:string):AuthIdentity{
  if(!value||typeof value!=='object')throw new AdminError(502,'auth_unavailable');
  const user=value as Record<string,unknown>;
  if(!isUuid(user.id)||typeof user.email!=='string'||normalizedEmail(user.email)!==email)throw new AdminError(502,'auth_identity_mismatch');
  const invited=typeof user.invited_at==='string'&&user.invited_at.length>0;
  return {id:user.id,email,
   // Actual GoTrue admin lists omit the nullable confirmation timestamp for
   // an unconfirmed invitation, while retaining its invited_at timestamp.
   confirmation:typeof user.email_confirmed_at==='string'&&user.email_confirmed_at.length>0?'confirmed':user.email_confirmed_at===null||(invited&&user.email_confirmed_at===undefined)?'unconfirmed':'unknown',
   invited};
 }
 return Object.freeze({
  async findByEmail(email:string):Promise<AuthIdentity|null>{
   // A full page never proves absence. A bounded incomplete scan fails closed.
   const perPage=100;const maxPages=10;
   for(let page=1;page<=maxPages;page++){
    const result=await authRequest(`/admin/users?page=${page}&per_page=${perPage}`,'GET',undefined);
    if(!result||!Array.isArray(result.users)||result.users.length>perPage)throw new AdminError(502,'auth_unavailable');
    const matches=result.users.filter((user:Record<string,unknown>)=>typeof user?.email==='string'&&user.email.trim().toLowerCase()===email);
    if(matches.length>1)throw new AdminError(502,'auth_identity_mismatch');
    if(matches.length===1)return identity(matches[0],email);
    if(result.users.length<perPage)return null;
    if(Number.isSafeInteger(result.last_page)&&result.last_page>=page&&result.last_page===page)return null;
   }
   throw new AdminError(502,'auth_scan_incomplete');
  },
  async invite(email:string,redirectTo:string):Promise<AuthIdentity>{
   const result=await authRequest(`/invite?redirect_to=${encodeURIComponent(redirectTo)}`,'POST',{email});
   return identity(result.user??result,email);
  },
  async reinvite(target:AuthIdentity,redirectTo:string):Promise<AuthIdentity>{
   // GoTrue v2.197.0 can resend an unconfirmed Admin invitation with signup
   // disabled. This is used only by an explicit owner resume, and its UUID
   // must remain the exact existing account rather than creating a replacement.
   if(!target.invited||target.confirmation!=='unconfirmed')throw new AdminError(409,'auth_identity_mismatch');
   const result=await authRequest(`/invite?redirect_to=${encodeURIComponent(redirectTo)}`,'POST',{email:target.email});
   const sent=identity(result.user??result,target.email);
   if(sent.id!==target.id)throw new AdminError(502,'auth_identity_mismatch');
   return sent;
  },
  async magicLink(email:string,redirectTo:string):Promise<void>{
   // Existing accounts only: no signup, account deletion/recreation or generate_link.
   await authRequest(`/otp?redirect_to=${encodeURIComponent(redirectTo)}`,'POST',{email,create_user:false},false);
  },
 });
}

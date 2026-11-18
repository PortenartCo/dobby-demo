/** Strict public Edge protocol. The unified SQL RPC repeats authorization/CAS. */
export class AdminError extends Error {
 status: number;
 code: string;
 constructor(status: number,code: string) { super(code);this.status=status;this.code=code; }
}
export type AdminPayload = Record<string,unknown>;
export type AdminCommand = 'listAccess'|'listDecisions'|'invite'|'decide'|'setStatus'|'revokeAdmission'|'resumeDelivery';
export interface AdminRequest { command: AdminCommand; payload: AdminPayload }
export const MAX_REQUEST_BYTES=16384;
export const isUuid=(value:unknown):value is string=>typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function normalizedEmail(value:unknown):string {
 if(typeof value!=='string')throw new AdminError(400,'invalid_request');
 const email=value.trim().toLowerCase();
 if(email.length>254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email))throw new AdminError(400,'invalid_request');
 return email;
}
function object(value:unknown):value is AdminPayload { return value!==null && typeof value==='object' && !Array.isArray(value); }
function keys(value:AdminPayload,required:string[],optional:string[]=[]) {
 if(required.some(key=>!Object.hasOwn(value,key)) || Object.keys(value).some(key=>!required.includes(key)&&!optional.includes(key)))throw new AdminError(400,'invalid_request');
}
function uuid(value:unknown){if(!isUuid(value))throw new AdminError(400,'invalid_request');}
function revision(value:unknown,minimum=1){if(!Number.isSafeInteger(value)||Number(value)<minimum)throw new AdminError(400,'invalid_request');}
export function validateAdminRequest(value:unknown):AdminRequest {
 if(!object(value))throw new AdminError(400,'invalid_request');
 keys(value,['command','payload']);
 if(typeof value.command!=='string'||!object(value.payload))throw new AdminError(400,'invalid_request');
 const p={...value.payload};
 switch(value.command){
  case 'listAccess':case 'listDecisions':
   keys(p,[],value.command==='listAccess'?['cursor','requestsCursor','limit']:['cursor','limit']);
   if(p.cursor!==undefined&&p.cursor!==null)uuid(p.cursor);
   if(p.requestsCursor!==undefined&&p.requestsCursor!==null)uuid(p.requestsCursor);
   if(p.limit!==undefined&&(!Number.isInteger(p.limit)||Number(p.limit)<1||Number(p.limit)>100))throw new AdminError(400,'invalid_request');
   p.limit??=25;break;
  case 'invite':
   keys(p,['email','purpose','operationId']);p.email=normalizedEmail(p.email);uuid(p.operationId);
   if(p.purpose!=='new-household')throw new AdminError(400,'invalid_request');break;
  case 'decide':
   keys(p,['admissionId','decision','expectedRevision','operationId']);uuid(p.admissionId);uuid(p.operationId);revision(p.expectedRevision);
   if(p.decision!=='approve'&&p.decision!=='reject')throw new AdminError(400,'invalid_request');break;
  case 'setStatus':
   keys(p,['userId','status','expectedRevision','operationId','confirmed']);uuid(p.userId);uuid(p.operationId);revision(p.expectedRevision,0);
   if((p.status!=='active'&&p.status!=='suspended')||p.confirmed!==true)throw new AdminError(400,'invalid_request');break;
  case 'revokeAdmission':
   keys(p,['admissionId','expectedRevision','operationId']);uuid(p.admissionId);uuid(p.operationId);revision(p.expectedRevision);break;
  case 'resumeDelivery':
   keys(p,['admissionId','expectedRevision','operationId','confirmed']);uuid(p.admissionId);uuid(p.operationId);revision(p.expectedRevision);
   if(p.confirmed!==true)throw new AdminError(400,'invalid_request');break;
  default:throw new AdminError(400,'invalid_request');
 }
 return {command:value.command as AdminCommand,payload:p};
}
export async function readAdminRequest(request:Request):Promise<AdminRequest> {
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new AdminError(415,'json_required');
 const length=request.headers.get('content-length');
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>MAX_REQUEST_BYTES))throw new AdminError(413,'request_too_large');
 if(!request.body)throw new AdminError(400,'invalid_request');
 const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;
 try {
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_REQUEST_BYTES){await reader.cancel();throw new AdminError(413,'request_too_large');}chunks.push(value);}
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 let value:unknown;
 try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new AdminError(400,'invalid_request');}
 return validateAdminRequest(value);
}

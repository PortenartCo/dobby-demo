// Injection unit tests. These prove the Edge boundary and HTTP request contract;
// real GoTrue/PostgREST/SMTP behavior requires the separate physical Auth suite.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminHandler } from '../../../supabase/functions/_shared/dobby-admin-handler.ts';

const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const email = 'recipient@example.invalid';
const json = (value,status=200) => new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
function fixture(options={}) {
 const calls=[];
 const admission={id:uuid(20),email,purpose:'new-household',revision:2,state:'delivering',targetUserId:null,expiresAt:'2030-01-01T00:00:00Z'};
 const descriptor={admission,delivery:{id:uuid(30),attemptId:uuid(31),requiresResume:false}};
 const handler=createAdminHandler({supabaseUrl:'http://127.0.0.1:9999',anonKey:'public-local',serviceRoleKey:'private-local',allowedOrigins:['https://dobby.example.invalid'],redirectTo:'https://dobby.example.invalid/access.html',fetch:async(url,init={})=>{
  const target=new URL(url);const body=init.body?JSON.parse(init.body):undefined;
  calls.push({url:target,method:init.method??'GET',headers:new Headers(init.headers),body});
  if(target.pathname==='/auth/v1/user')return json({id:uuid(1)},options.invalidJwt?401:200);
  if(target.pathname.endsWith('/rpc/dobby_access_context'))return json({protocol:1,status:options.status??'active',isOwner:options.owner??true});
  if(target.pathname.endsWith('/rpc/dobby_access_admin')){
   if(body.p_command==='claimDelivery'||body.p_command==='resumeDelivery')return json({...descriptor,admission:{...admission,state:options.deliverySent?'sent':admission.state},delivery:{...descriptor.delivery,requiresResume:options.requiresResume??false}});
   if(body.p_command==='recordDelivery'){
    if(options.recordFailure)return json({message:'sensitive database payload'},503);
    return json({...descriptor,admission:{...admission,state:'sent',revision:3}});
   }
   if(body.p_command==='failDelivery')return json({...descriptor,delivery:{...descriptor.delivery,requiresResume:true}});
   if(body.p_command==='setStatus')return json({status:body.p_payload.status,revision:5,replayed:false,sessionBoundaryPending:body.p_payload.status==='active'});
   if(body.p_command==='finalizeReactivation')return options.finalizeFailure?json({message:'sensitive finalizer failure'},503):json({status:'active',revision:5,replayed:false,sessionBoundaryPending:false});
   if(body.p_command==='invite'||body.p_command==='decide')return json({admission:{...admission,state:'approved',revision:options.replayed?6:2},replayed:options.replayed??false});
   return json({protocol:1,items:[],nextCursor:null});
  }
  if(target.pathname==='/auth/v1/admin/users'){
   if(options.lookupFailure)return json({message:'sensitive Auth payload'},500);
   if(options.truncated)return json({users:Array.from({length:100},(_,n)=>({id:uuid(n+100),email:`other${n}@example.invalid`}))});
   // GoTrue v2.197.0 omits email_confirmed_at for an unconfirmed invitation.
   return json({users:options.existing?[{id:uuid(40),email,...(options.invitedUnconfirmed?{invited_at:'2026-01-01T00:00:00Z'}:{email_confirmed_at:'2026-01-01T00:00:00Z'})}]:[]});
  }
  if(target.pathname==='/auth/v1/invite'){
   if(options.sendFailure)throw new Error('secret transport diagnostic');
   return json({id:options.mismatchInviteUuid?uuid(41):uuid(40),email});
  }
  if(target.pathname==='/auth/v1/otp')return json({});
  throw new Error(`Unexpected unit HTTP path ${target.pathname}`);
 }});
 const request=(body,extra={})=>handler(new Request('https://edge.example.invalid/dobby-access-admin',{method:'POST',headers:{authorization:'Bearer caller-local-token',origin:'https://dobby.example.invalid','content-type':'application/json',...extra.headers},body:JSON.stringify(body),...extra}));
 return {handler,request,calls};
}
const invite={command:'invite',payload:{email,purpose:'new-household',operationId:uuid(50)}};

test('verifies JWT and active owner before exposing Auth Admin capability',async()=>{
 for(const options of [{owner:false},{status:'suspended'},{invalidJwt:true}]){
  const {request,calls}=fixture(options);const response=await request(invite);
  assert.equal(response.status,options.invalidJwt?401:403);
  assert.equal(calls.some(call=>call.headers.get('apikey')==='private-local'),false);
  assert.equal(calls.some(call=>call.body?.p_command==='invite'),false);
 }
});
test('strict commands reject invalid UUID, extra fields, purpose and pagination',async()=>{
 const {request,calls}=fixture();
 for(const value of [
  {...invite,extra:true},
  {...invite,payload:{...invite.payload,operationId:'not-a-uuid'}},
  {...invite,payload:{...invite.payload,purpose:'family-child'}},
  {...invite,payload:{...invite.payload,redirectTo:'https://evil.example.invalid'}},
  {command:'claimDelivery',payload:{}},
  {command:'listAccess',payload:{limit:101}},
  {command:'setStatus',payload:{userId:uuid(2),status:'active',expectedRevision:1,operationId:uuid(51)}},
  {command:'setStatus',payload:{userId:uuid(2),status:['active'],expectedRevision:1,operationId:uuid(51),confirmed:true}},
  {command:'decide',payload:{admissionId:uuid(20),decision:'approve',expectedRevision:0,operationId:uuid(51)}},
  {command:'revokeAdmission',payload:{admissionId:uuid(20),expectedRevision:0,operationId:uuid(51)}},
  {command:'resumeDelivery',payload:{admissionId:uuid(20),expectedRevision:0,operationId:uuid(51),confirmed:true}},
 ])assert.equal((await request(value)).status,400);
 assert.equal(calls.length,0);
});
test('CORS is exact, POST JSON only, bounded streamed input and no reflected origin',async()=>{
 const {handler,calls}=fixture();
 const denied=await handler(new Request('https://edge.example.invalid',{method:'OPTIONS',headers:{origin:'https://evil.example.invalid'}}));
 assert.equal(denied.status,403);assert.equal(denied.headers.get('access-control-allow-origin'),null);
 const preflight=await handler(new Request('https://edge.example.invalid',{method:'OPTIONS',headers:{origin:'https://dobby.example.invalid','access-control-request-method':'POST','access-control-request-headers':'authorization,content-type,apikey'}}));
 assert.equal(preflight.status,204);
 assert.equal((await handler(new Request('https://edge.example.invalid'))).status,405);
 assert.equal((await handler(new Request('https://edge.example.invalid',{method:'POST',headers:{'content-type':'text/plain'},body:'{}'}))).status,415);
 assert.equal((await handler(new Request('https://edge.example.invalid',{method:'POST',headers:{'content-type':'application/json'},body:' '.repeat(17000)}))).status,413);
 assert.equal(calls.length,0);
});
test('new recipient persists delivery before Auth invite, uses trusted redirect and binds exact UUID',async()=>{
 const {request,calls}=fixture();const response=await request(invite);
 assert.equal(response.status,200);
 assert.deepEqual(calls.map(call=>call.body?.p_command??call.url.pathname),['/auth/v1/user','/rest/v1/rpc/dobby_access_context','invite','claimDelivery','/auth/v1/admin/users','/auth/v1/invite','recordDelivery']);
 const send=calls.find(call=>call.url.pathname==='/auth/v1/invite');
 assert.equal(send.headers.get('authorization'),'Bearer private-local');
 const redirect=new URL(send.url.searchParams.get('redirect_to'));
 assert.equal(redirect.origin,'https://dobby.example.invalid');assert.equal(redirect.searchParams.get('admission_id'),uuid(20));
 assert.deepEqual(send.body,{email});
 const record=calls.find(call=>call.body?.p_command==='recordDelivery');
 assert.equal(record.body.p_payload.targetUserId,uuid(40));
 for(const call of calls.filter(call=>call.url.pathname.startsWith('/rest/'))){
  assert.equal(call.headers.get('authorization'),'Bearer caller-local-token');assert.equal(call.headers.get('apikey'),'public-local');
 }
});
test('existing recipient uses OTP create_user false and never invokes invite',async()=>{
 const {request,calls}=fixture({existing:true});assert.equal((await request(invite)).status,200);
 assert.deepEqual(calls.find(call=>call.url.pathname==='/auth/v1/otp').body,{email,create_user:false});
 assert.equal(calls.some(call=>call.url.pathname==='/auth/v1/invite'),false);
});
test('bounded incomplete Auth listing cannot be mistaken for recipient absence',async()=>{
 const {request,calls}=fixture({truncated:true});const response=await request(invite);
 assert.equal(response.status,200);
 assert.equal((await response.json()).result.delivery.outcome,'uncertain');
 assert.equal(calls.filter(call=>call.url.pathname==='/auth/v1/admin/users').length,10);
 assert.equal(calls.some(call=>['/auth/v1/invite','/auth/v1/otp'].includes(call.url.pathname)),false);
 assert.equal(calls.at(-1).body.p_command,'failDelivery');
});
test('persisted attempt replay returns uncertain without automatic Auth request',async()=>{
 const {request,calls}=fixture({requiresResume:true});const response=await request(invite);
 assert.equal((await response.json()).result.delivery.outcome,'uncertain');
 assert.equal(calls.some(call=>call.headers.get('apikey')==='private-local'),false);
});
test('replayed admission decision never reclaims a changed revision with an old child operation',async()=>{
 const {request,calls}=fixture({replayed:true});const response=await request(invite);
 assert.equal(response.status,200);assert.equal((await response.json()).result.delivery.outcome,'uncertain');
 assert.equal(calls.some(call=>call.body?.p_command==='claimDelivery'),false);
 assert.equal(calls.some(call=>call.headers.get('apikey')==='private-local'),false);
});
test('Auth timeout and DB confirmation failure preserve uncertain status without disclosing diagnostics',async()=>{
 for(const options of [{sendFailure:true},{recordFailure:true},{lookupFailure:true}]){
  const {request,calls}=fixture(options);const response=await request(invite);const value=await response.json();
  assert.equal(response.status,200);assert.equal(value.result.delivery.outcome,'uncertain');
  assert.equal(calls.at(-1).body.p_command,'failDelivery');
  assert.equal(calls.at(-1).body.p_payload.uncertain,true);
  assert.equal(JSON.stringify(value).includes('sensitive'),false);assert.equal(JSON.stringify(value).includes('secret transport'),false);
 }
});
test('explicit confirmed resume records new attempt and reconciles existing Auth user',async()=>{
 const {request,calls}=fixture({existing:true});
 assert.equal((await request({command:'resumeDelivery',payload:{admissionId:uuid(20),expectedRevision:2,operationId:uuid(52),confirmed:true}})).status,200);
 assert.equal(calls.find(call=>call.body?.p_command==='resumeDelivery').body.p_payload.confirmed,true);
 assert.equal(calls.some(call=>call.url.pathname==='/auth/v1/otp'),true);
});
test('explicit resume reinvites the same unconfirmed invited Auth UUID without OTP signup',async()=>{
 const {request,calls}=fixture({existing:true,invitedUnconfirmed:true});
 const response=await request({command:'resumeDelivery',payload:{admissionId:uuid(20),expectedRevision:2,operationId:uuid(52),confirmed:true}});
 assert.equal((await response.json()).result.delivery.outcome,'sent');
 assert.equal(calls.some(call=>call.url.pathname==='/auth/v1/otp'),false);
 assert.equal(calls.filter(call=>call.url.pathname==='/auth/v1/invite').length,1);
 assert.equal(calls.find(call=>call.body?.p_command==='recordDelivery').body.p_payload.targetUserId,uuid(40));
});
test('explicit reinvitation refuses any unexpected change of Auth UUID',async()=>{
 const {request,calls}=fixture({existing:true,invitedUnconfirmed:true,mismatchInviteUuid:true});
 const response=await request({command:'resumeDelivery',payload:{admissionId:uuid(20),expectedRevision:2,operationId:uuid(52),confirmed:true}});
 assert.equal((await response.json()).result.delivery.outcome,'uncertain');
 assert.equal(calls.some(call=>call.body?.p_command==='recordDelivery'),false);
});
test('an initial admission does not automatically reinvite an existing unconfirmed account',async()=>{
 const {request,calls}=fixture({existing:true,invitedUnconfirmed:true});
 await request(invite);
 assert.equal(calls.some(call=>call.url.pathname==='/auth/v1/otp'),true);
 assert.equal(calls.some(call=>call.url.pathname==='/auth/v1/invite'),false);
});
test('an approved pending target can be suspended at revision zero without Auth mutation',async()=>{
 const {request,calls}=fixture();
 const response=await request({command:'setStatus',payload:{userId:uuid(40),status:'suspended',expectedRevision:0,operationId:uuid(58),confirmed:true}});
 assert.equal(response.status,200);
 assert.equal(calls.find(call=>call.body?.p_command==='setStatus').body.p_payload.expectedRevision,0);
 assert.equal(calls.some(call=>call.headers.get('apikey')==='private-local'),false);
});
test('replaying a completed resume reports sent without another Auth request',async()=>{
 const {request,calls}=fixture({deliverySent:true,requiresResume:true});
 const response=await request({command:'resumeDelivery',payload:{admissionId:uuid(20),expectedRevision:2,operationId:uuid(52),confirmed:true}});
 const result=(await response.json()).result;
 assert.equal(result.delivery.outcome,'sent');assert.equal(result.delivery.requiresResume,false);
 assert.equal(calls.some(call=>call.headers.get('apikey')==='private-local'),false);
});
test('reactivation finalizes session boundary in a second caller JWT transaction',async()=>{
 const {request,calls}=fixture();
 const response=await request({command:'setStatus',payload:{userId:uuid(2),status:'active',expectedRevision:4,operationId:uuid(55),confirmed:true}});
 assert.equal(response.status,200);assert.equal((await response.json()).result.sessionBoundaryPending,false);
 const operations=calls.filter(call=>call.body?.p_command);
 assert.deepEqual(operations.map(call=>call.body.p_command),['setStatus','finalizeReactivation']);
 assert.deepEqual(operations[1].body.p_payload,{userId:uuid(2),expectedRevision:5});
 assert.equal(operations[1].headers.get('authorization'),'Bearer caller-local-token');
});
test('failure to finalize reactivation reports failure while the DB remains fail closed',async()=>{
 const {request}=fixture({finalizeFailure:true});
 const response=await request({command:'setStatus',payload:{userId:uuid(2),status:'active',expectedRevision:4,operationId:uuid(56),confirmed:true}});
 assert.equal(response.status,503);assert.deepEqual(await response.json(),{ok:false,error:{code:'database_unavailable'}});
});

test('pending requests have their own validated cursor independent of account pagination',async()=>{
 const {request,calls}=fixture();
 const response=await request({command:'listAccess',payload:{cursor:uuid(100),requestsCursor:uuid(200),limit:2}});
 assert.equal(response.status,200);
 const sent=calls.find(call=>call.body?.p_command==='listAccess');
 assert.deepEqual(sent.body.p_payload,{cursor:uuid(100),requestsCursor:uuid(200),limit:2});
 assert.equal((await request({command:'listAccess',payload:{requestsCursor:'invalid'}})).status,400);
 assert.equal((await request({command:'listDecisions',payload:{requestsCursor:uuid(200)}})).status,400);
 assert.equal((await request({command:'listAccess',payload:{cursor:null,requestsCursor:null}})).status,200);
});

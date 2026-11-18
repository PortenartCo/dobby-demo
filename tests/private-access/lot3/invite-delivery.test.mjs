// Physical local GoTrue, PostgREST and SMTP evidence. No mocked Auth responses.
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { startAuth, stopAuth } from './local-auth.mjs';
import { businessCatalog, installAdministration } from './business-catalog.mjs';
import { createAdminHandler } from '../../../supabase/functions/dobby-access-admin/index.ts';
import { root, id, q } from '../local-db.mjs';

let auth, server, edgeUrl, handler, owner, parent, wrong, fault=null;
const proofs=[];
const profile={firstName:'Fictif',lastName:'Invitation',avatarId:'portrait-1'};
const jsonHeaders={'content-type':'application/json'};
const uid=()=>randomUUID();
const success=(response,label)=>{assert.ok(response.ok,`${label}: HTTP ${response.status}`);return response;};
async function rpc(name,args,token,{deny=false}={}){
 const r=await auth.requestRpc(name,args,token);
 if(deny){assert.ok([400,401,403,404,409].includes(r.status),`${name}: expected authorization/state refusal, HTTP ${r.status}`);return r;}
 success(r,name);return r.json();
}
async function command(command,payload,token=owner.access_token,{deny=false}={}){
 const r=await fetch(edgeUrl,{method:'POST',headers:{...jsonHeaders,origin:auth.url,authorization:`Bearer ${token}`},body:JSON.stringify({command,payload})});
 if(deny){assert.ok([400,401,403,404,409].includes(r.status),`${command}: expected authorization/state refusal, HTTP ${r.status}`);return r;}
 success(r,command);const data=await r.json();assert.equal(data.ok,true);return data.result;
}
const currentAdmission=admissionId=>JSON.parse(auth.sql(`SELECT json_build_object('id',id,'revision',revision,'state',state,'targetUserId',target_user_id) FROM dobby_access_private.admissions WHERE id=${q(admissionId)};`));
const userCount=email=>Number(auth.sql(`SELECT count(*) FROM auth.users WHERE lower(email)=${q(email)};`));
async function emailLink(email){
 const mail=await auth.inbox.waitFor(email);
 const html=mail.HTML??mail.Html??mail.Text??'';
 const links=[...html.matchAll(/(?:href=["'])([^"']+)["']/g)].map(m=>m[1].replaceAll('&amp;','&'));
 const selected=links.find(value=>value.includes('token_hash='))??links.find(value=>value.includes('token='));
 assert.ok(selected,'Fictional SMTP message contains a usable Auth link');return new URL(selected);
}
async function verify(link,{deny=false}={}){
 const hash=link.searchParams.get('token_hash')??link.searchParams.get('token');
 const type=link.searchParams.get('type');assert.ok(hash&&type,'Auth link includes hash and type');
 const r=await auth.requestAuth('/verify',{method:'POST',headers:jsonHeaders,body:JSON.stringify({token_hash:hash,type})});
 if(deny){assert.ok(!r.ok,`Expired/consumed link refused: HTTP ${r.status}`);return r;}
 success(r,'Real Auth verify');const session=await r.json();assert.ok(session.access_token&&session.user?.id,'Auth produces a real session');return session;
}
async function invite(email){
 await auth.inbox.clear();
 const operationId=uid();const result=await command('invite',{email,purpose:'new-household',operationId});
 assert.ok(result.admission?.id,'Owner invitation returns admission');
 return {email,operationId,result,admissionId:result.admission.id,link:await emailLink(email)};
}
async function requestFamily(email,kind='family-parent',member=null){
 return rpc('dobby_access_request_family_account',{p_email:email,p_kind:kind,p_member_id:member,p_operation_id:uid()},parent.access_token);
}
async function approve(request){
 await auth.inbox.clear();
 return command('decide',{admissionId:request.admission.id,decision:'approve',expectedRevision:request.admission.revision,operationId:uid()});
}
async function accept(flow,session,p=profile,operationId=uid(),deny=false){
 return rpc('dobby_access_accept',{p_admission_id:flow.admissionId,p_profile:p,p_operation_id:operationId},session.access_token,{deny});
}

before(async()=>{
 auth=await startAuth();await businessCatalog(auth);await installAdministration(auth);
 owner=await auth.getLogin(1);parent=await auth.getLogin(3);wrong=await auth.getLogin(6);
 handler=createAdminHandler({supabaseUrl:auth.url,anonKey:auth.anonToken,serviceRoleKey:auth.serviceToken,allowedOrigins:[auth.url],redirectTo:auth.url+'/callback',fetch:async(url,options)=>{
  let command;try{command=JSON.parse(options?.body??'null')?.p_command;}catch{}
  if(fault==='before-record'&&command==='recordDelivery')throw new TypeError('Injected local interruption before DB confirmation');
  if(fault==='crash'&&['recordDelivery','failDelivery'].includes(command))throw new TypeError('Injected local process interruption');
  const response=await fetch(url,options);
  if(fault==='lost-record'&&command==='recordDelivery')throw new TypeError('Injected local response loss after DB commit');
  return response;
 }});
 server=createServer(async(req,res)=>{
  try{const chunks=[];for await(const c of req)chunks.push(c);
   const response=await handler(new Request(edgeUrl,{method:req.method,headers:req.headers,body:Buffer.concat(chunks)}));
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500);res.end('{"error":"local_test_transport"}');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));edgeUrl=`http://127.0.0.1:${server.address().port}/functions/v1/dobby-access-admin`;
},{timeout:180000});
after(async()=>{
 try{
  if(auth&&process.env.DOBBY_EVIDENCE_DIR){mkdirSync(process.env.DOBBY_EVIDENCE_DIR,{recursive:true});writeFileSync(resolve(process.env.DOBBY_EVIDENCE_DIR,'auth-integration.json'),JSON.stringify({runtime:auth.info,proofs,notEstablished:['hosted Auth permissions','real emails/accounts','hosted deployment','extinction of pre-issued Storage bearers']},null,2)+'\n');}
 }finally{if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await stopAuth();}
});

test('T02/T12 real signup open gives no business access; closed signup preserves old logins',async()=>{
 const email='public-open@example.invalid',password=randomBytes(24).toString('base64url');await auth.inbox.clear();
 success(await auth.requestAuth('/signup',{method:'POST',headers:jsonHeaders,body:JSON.stringify({email,password})}),'Open signup');
 const session=await verify(await emailLink(email));
 assert.equal((await rpc('dobby_access_context',{},session.access_token)).status,'unapproved');
 await rpc('dobby_v7_context',{},session.access_token,{deny:true});
 await auth.setSignupDisabled(true);
 const closed=await auth.requestAuth('/signup',{method:'POST',headers:jsonHeaders,body:JSON.stringify({email:'public-closed@example.invalid',password})});
 assert.equal(closed.status,422);assert.equal(userCount('public-closed@example.invalid'),0);
 assert.equal((await auth.getLogin(1)).user.id,id(1));assert.equal((await auth.getLogin(2)).user.id,id(2));
 const refreshed=await auth.requestAuth('/token?grant_type=refresh_token',{method:'POST',headers:jsonHeaders,body:JSON.stringify({refresh_token:owner.refresh_token})});
 success(refreshed,'Existing account real refresh with signup closed');owner=await refreshed.json();assert.equal(owner.user.id,id(1));
 proofs.push({scenario:'signup-open-closed',refreshHTTPStatus:200,result:'open Auth signup remains unapproved; closed signup 422; original fictional account UUIDs, login and real refresh preserved'});
});

test('T12 owner checks apply at Edge and direct SQL RPC and expose no family content',async()=>{
 const ordinary=await auth.getLogin(2);
 await command('listAccess',{},ordinary.access_token,{deny:true});
 await rpc('dobby_access_admin',{p_command:'listAccess',p_payload:{}},ordinary.access_token,{deny:true});
 const response=await fetch(edgeUrl,{method:'POST',headers:{...jsonHeaders,origin:auth.url},body:JSON.stringify({command:'listAccess',payload:{}})});assert.equal(response.status,401);
 const listing=await command('listAccess',{});const text=JSON.stringify(listing);
 assert.ok(!/familyMembers|magicProfile|runeCredits|TEST_LEDGER/.test(text));
 const foreign=await fetch(auth.restUrl+`/dobby_v2_modules?household_id=eq.${id(102)}&module=eq.family&select=payload`,{headers:{authorization:`Bearer ${owner.access_token}`}});
 success(foreign,'Owner foreign-family RLS');assert.deepEqual(await foreign.json(),[]);
 proofs.push({scenario:'owner-isolation',result:'non-owner/anonymous denied; direct RPC denied; admin projections exclude payloads; global owner sees no H2 business rows'});
});

test('native Deno handler serves the same owner-only API against real local Auth and PostgreSQL',async()=>{
 const directory=mkdtempSync(resolve(tmpdir(),'dobby-lot3-deno-')),entry=resolve(directory,'edge.ts');
 writeFileSync(entry,`import { createAdminHandler } from ${JSON.stringify(pathToFileURL(resolve(root,'supabase/functions/dobby-access-admin/index.ts')).href)};\nconst config=JSON.parse(Deno.env.get('DOBBY_LOCAL_TEST_EDGE_CONFIG')!);\nDeno.serve({hostname:'127.0.0.1',port:0,onListen:({port})=>console.log('DOBBY_DENO_PORT='+port)},createAdminHandler(config));\n`);
 const child=spawn('npx',['--yes','deno@2.9.6','run','--no-remote','--allow-env=DOBBY_LOCAL_TEST_EDGE_CONFIG','--allow-net=127.0.0.1',entry],{detached:true,env:{...process.env,DOBBY_LOCAL_TEST_EDGE_CONFIG:JSON.stringify({supabaseUrl:auth.url,anonKey:auth.anonToken,serviceRoleKey:auth.serviceToken,allowedOrigins:[auth.url],redirectTo:auth.url+'/callback'})},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',part=>{output+=part;});child.stderr.on('data',()=>{});
 const closed=new Promise(resolve=>child.once('close',resolve));
 try{
  const deadline=Date.now()+30000;let port;
  while(Date.now()<deadline){port=/DOBBY_DENO_PORT=(\d+)/.exec(output)?.[1];if(port)break;assert.equal(child.exitCode,null,'Local Deno worker must remain alive');await new Promise(r=>setTimeout(r,25));}
  assert.ok(port,'Local Deno handler readiness');
  for(const [session,expected] of [[owner,200],[parent,403]]){
   const response=await fetch(`http://127.0.0.1:${port}`,{method:'POST',headers:{...jsonHeaders,origin:auth.url,authorization:`Bearer ${session.access_token}`},body:JSON.stringify({command:'listAccess',payload:{}})});
   assert.equal(response.status,expected);
   if(expected===200)assert.equal((await response.json()).ok,true);
  }
  proofs.push({scenario:'native-deno-api',result:'Deno2.9.6 executes shipped TypeScript handler factory over local HTTP with real GoTrue and PostgREST; owner200/non-owner403; no hosted Edge deployment or worker certification claimed'});
 }finally{
  try{process.kill(-child.pid,'SIGTERM');}catch(error){if(error.code!=='ESRCH')throw error;}
  await closed;rmSync(directory,{recursive:true});
 }
});

test('T03 new nominative invitation is not active before accept; concurrent double-click and replay create one household',async()=>{
 const flow=await invite('new-household@example.invalid');assert.equal(userCount(flow.email),1);
 assert.equal(flow.link.searchParams.get('admission_id'),flow.admissionId);assert.equal(flow.link.searchParams.get('type'),'invite');
 const session=await verify(flow.link);await verify(flow.link,{deny:true});
 await rpc('dobby_v7_context',{},session.access_token,{deny:true});
 await accept(flow,wrong,profile,uid(),true);
 const op=uid();const results=await Promise.all([accept(flow,session,profile,op),accept(flow,session,profile,op)]);
 assert.equal(results.filter(x=>x.replayed===false).length,1);assert.equal(results.filter(x=>x.replayed===true).length,1);
 await accept(flow,session,profile,uid(),true);
 const createOp=uid();const first=await rpc('dobby_v7_create_household',{p_name:'Foyer entièrement fictif',p_operation_id:createOp},session.access_token);
 const replay=await rpc('dobby_v7_create_household',{p_name:'Foyer entièrement fictif',p_operation_id:createOp},session.access_token);
 assert.equal(replay.householdId,first.householdId);
 assert.equal(Number(auth.sql(`SELECT count(*) FROM dobby_v7_private.account_links WHERE user_id=${q(session.user.id)};`)),1);
 proofs.push({scenario:'nominative-new-household',result:'real invite and one-use Auth hash; wrong UUID rejected; no access before transaction; two simultaneous accepts yield one commit plus replay; one canonical household'});
});

test('T04 rejection causes no Auth delivery; existing adult joins only the requested family without duplicate account',async()=>{
 const rejected=await requestFamily('rejected@example.invalid');assert.equal(userCount('rejected@example.invalid'),0);
 await command('decide',{admissionId:rejected.admission.id,decision:'reject',expectedRevision:rejected.admission.revision,operationId:uid()});
 assert.equal(currentAdmission(rejected.admission.id).state,'rejected');assert.equal(userCount('rejected@example.invalid'),0);
 const requested=await requestFamily('fixture-6@example.invalid');const result=await approve(requested);
 const flow={admissionId:requested.admission.id};const link=await emailLink('fixture-6@example.invalid');assert.equal(link.searchParams.get('type'),'magiclink');
 const session=await verify(link);assert.equal(session.user.id,id(6));assert.equal(userCount('fixture-6@example.invalid'),1);
 await accept(flow,session);const context=await rpc('dobby_v7_context',{},session.access_token);
 assert.equal(context.householdId,id(102));assert.equal(context.profile.memberCategory,'parent');assert.ok(result.admission.state==='sent');
 proofs.push({scenario:'parent-request-and-existing-adult',result:'parent creates only request; rejected request sends nothing; approved existing Auth UUID joins sole requested family; no duplicate account'});
});

test('T04 child remains blocked by production gates; fixture-only release links existing canonical profile unchanged',async()=>{
 const request=await requestFamily('child-new@example.invalid','family-child','TEST_CHILD');
 await approve(request).then(()=>{},()=>{});assert.equal(userCount('child-new@example.invalid'),0);
 auth.sql('UPDATE dobby_access_private.settings SET child_delivery_enabled=true; UPDATE dobby_socle_private.install_state SET family_api_enabled=true,family_client_verified=true,storage_client_verified=true,child_link_client_verified=true;');
 const snapshot=()=>auth.sql(`SELECT jsonb_agg(jsonb_build_object('module',module,'payload',payload,'revision',revision) ORDER BY module) FROM public.dobby_v2_modules WHERE household_id=${q(id(102))};`);
 const before=snapshot();assert.ok(before.includes('TEST_CHILD_CREDIT')&&before.includes('otter'),'Fixture includes meaningful child credit and magic data');
 await auth.inbox.clear();const row=currentAdmission(request.admission.id);
 if(row.state==='requested')await command('decide',{admissionId:row.id,expectedRevision:row.revision,decision:'approve',operationId:uid()});
 else await command('resumeDelivery',{admissionId:row.id,expectedRevision:row.revision,operationId:uid(),confirmed:true});
 const child=await verify(await emailLink('child-new@example.invalid'));
 await accept({admissionId:row.id},child,null);
 const after=snapshot();assert.equal(after,before);
 const context=await rpc('dobby_v7_context',{},child.access_token);assert.equal(context.memberId,'TEST_CHILD');assert.equal(context.profile.memberCategory,'child');
 await rpc('dobby_access_request_family_account',{p_email:'child-forbidden@example.invalid',p_kind:'family-parent',p_member_id:null,p_operation_id:uid()},child.access_token,{deny:true});
 auth.sql('UPDATE dobby_access_private.settings SET child_delivery_enabled=false; UPDATE dobby_socle_private.install_state SET family_client_verified=false,storage_client_verified=false,child_link_client_verified=false;');
 proofs.push({scenario:'canonical-child',result:'default production gates block delivery; only fictional test gates opened; existing TEXT member id/payload/revision unchanged after real Auth invitation and transaction; no pending replacement profile'});
});

test('T04 live child invitation blocks another delivery; expired invitation is closed before replacement',async()=>{
 auth.sql('UPDATE dobby_access_private.settings SET child_delivery_enabled=true; UPDATE dobby_socle_private.install_state SET family_api_enabled=true,family_client_verified=true,storage_client_verified=true,child_link_client_verified=true;');
 try{
  const first=await requestFamily('child-expiring-first@example.invalid','family-child','TEST_EXPIRING_CHILD');await approve(first);
  const oldInvitation=auth.sql(`SELECT id FROM dobby_v7_private.invitations WHERE admission_id=${q(first.admission.id)};`);assert.ok(oldInvitation);
  const blocked=await requestFamily('child-live-blocked@example.invalid','family-child','TEST_EXPIRING_CHILD');await auth.inbox.clear();
  await command('decide',{admissionId:blocked.admission.id,expectedRevision:blocked.admission.revision,decision:'approve',operationId:uid()},owner.access_token,{deny:true});
  assert.equal(userCount('child-live-blocked@example.invalid'),0);assert.equal((await auth.inbox.list()).total,0,'Live target conflict must be rejected before any Auth email');
  const b=currentAdmission(blocked.admission.id);await command('revokeAdmission',{admissionId:b.id,expectedRevision:b.revision,operationId:uid()});
  // Explicit local expiry-clock fixture; no claim of an elapsed 24-hour wait.
  auth.sql(`UPDATE dobby_v7_private.invitations SET expires_at=clock_timestamp()-interval '1 second' WHERE id=${q(oldInvitation)}; UPDATE dobby_access_private.admissions SET expires_at=clock_timestamp()-interval '1 second' WHERE id=${q(first.admission.id)};`);
  const before=auth.sql(`SELECT payload::text||'|'||revision FROM public.dobby_v2_modules WHERE household_id=${q(id(102))} AND module='family';`);
  const second=await requestFamily('child-expiring-second@example.invalid','family-child','TEST_EXPIRING_CHILD');await approve(second);
  assert.equal(auth.sql(`SELECT revoked_at IS NOT NULL FROM dobby_v7_private.invitations WHERE id=${q(oldInvitation)};`),'t');
  const session=await verify(await emailLink('child-expiring-second@example.invalid'));await accept({admissionId:second.admission.id},session,null);
  assert.equal(auth.sql(`SELECT payload::text||'|'||revision FROM public.dobby_v2_modules WHERE household_id=${q(id(102))} AND module='family';`),before);
  proofs.push({scenario:'child-expiry-and-live-target',result:'live pending child invitation prevents a second Auth send; only expiry clock injected locally; expired row revoked preserving history; replacement SMTP/Auth/canonical accept succeeds without profile mutation'});
 }finally{auth.sql('UPDATE dobby_access_private.settings SET child_delivery_enabled=false; UPDATE dobby_socle_private.install_state SET family_client_verified=false,storage_client_verified=false,child_link_client_verified=false;');}
});

test('T13 interruption after Auth before DB confirmation leaves no access and requires explicit recovery',async()=>{
 await auth.inbox.clear();fault='before-record';let result;const operationId=uid(),email='uncertain-send@example.invalid';
 try{result=await command('invite',{email,purpose:'new-household',operationId});}finally{fault=null;}
 assert.equal(result.delivery.outcome,'uncertain');assert.equal(userCount(email),1);
 const before=(await auth.inbox.list()).total;
 const replay=await command('invite',{email,purpose:'new-household',operationId});assert.equal(replay.delivery.requiresResume,true);assert.equal((await auth.inbox.list()).total,before);
 assert.equal(Number(auth.sql(`SELECT count(*) FROM dobby_access_private.authorizations a JOIN auth.users u ON u.id=a.user_id WHERE u.email=${q(email)};`)),0);
 await auth.inbox.clear();const row=currentAdmission(result.admission.id);
 const resumed=await command('resumeDelivery',{admissionId:row.id,expectedRevision:row.revision,operationId:uid(),confirmed:true});
 assert.equal(resumed.admission.state,'sent');assert.equal(userCount(email),1);
 proofs.push({scenario:'auth-db-saga',result:'actual Auth creation/mail before injected DB interruption; no provisional active row; replay sends no duplicate; explicit owner resume reuses one Auth UUID'});
});

test('T13 committed DB result loss and orphan delivery are recoverable without silent resend',async()=>{
 await auth.inbox.clear();fault='lost-record';let sent;const email='lost-record@example.invalid',op=uid();
 try{sent=await command('invite',{email,purpose:'new-household',operationId:op});}finally{fault=null;}
 assert.equal(currentAdmission(sent.admission.id).state,'sent');const count=(await auth.inbox.list()).total;
 const replay=await command('invite',{email,purpose:'new-household',operationId:op});assert.equal(replay.admission.state,'sent');assert.equal((await auth.inbox.list()).total,count);
 await auth.inbox.clear();fault='crash';let crashed;
 try{crashed=await command('invite',{email:'crashed-send@example.invalid',purpose:'new-household',operationId:uid()});}finally{fault=null;}
 const row=currentAdmission(crashed.admission.id);assert.equal(row.state,'delivering');
 // Inject only the local lease clock to avoid a three-minute test delay. This
 // is not evidence that actual elapsed time has passed.
 auth.sql(`UPDATE dobby_access_private.deliveries SET created_at=clock_timestamp()-interval '5 minutes',updated_at=clock_timestamp()-interval '5 minutes' WHERE admission_id=${q(row.id)};`);
 const resumed=await command('resumeDelivery',{admissionId:row.id,expectedRevision:row.revision,operationId:uid(),confirmed:true});assert.equal(resumed.admission.state,'sent');
 proofs.push({scenario:'lost-results-and-crash',result:'committed record replay sends nothing; orphan attempting lease aged only in local clock fixture; explicit confirmed owner recovery completes without duplicate Auth'});
});

test('T05/T13 an unbound old approval cannot cross target suspension and reactivation',async()=>{
 auth.sql(`INSERT INTO dobby_access_private.authorizations(user_id,status,approved_by) VALUES(${q(id(5))},'active',${q(id(1))});`);
 await auth.inbox.clear();fault='before-record';let pending;
 try{pending=await command('invite',{email:'fixture-5@example.invalid',purpose:'new-household',operationId:uid()});}finally{fault=null;}
 assert.equal(currentAdmission(pending.admission.id).targetUserId,null);
 await command('setStatus',{userId:id(5),status:'suspended',expectedRevision:1,operationId:uid(),confirmed:true});
 await command('setStatus',{userId:id(5),status:'active',expectedRevision:2,operationId:uid(),confirmed:true});
 const row=currentAdmission(pending.admission.id);
 const resumed=await command('resumeDelivery',{admissionId:row.id,expectedRevision:row.revision,operationId:uid(),confirmed:true});
 assert.equal(resumed.delivery.requiresResume,true,'Old approval must never become sent/accepted in the new generation');
 assert.notEqual(currentAdmission(row.id).state,'sent');assert.equal(auth.sql(`SELECT can_create_household FROM dobby_access_private.authorizations WHERE user_id=${q(id(5))};`),'f');
 const blocked=currentAdmission(row.id);await command('revokeAdmission',{admissionId:row.id,expectedRevision:blocked.revision,operationId:uid()});
 const fresh=await invite('fixture-5@example.invalid'),session=await verify(fresh.link);await accept(fresh,session);
 assert.equal(auth.sql(`SELECT can_create_household FROM dobby_access_private.authorizations WHERE user_id=${q(id(5))};`),'t');
 proofs.push({scenario:'unbound-approval-generation',result:'actual delivery interrupted before UUID binding; target suspended/reactivated; old explicit recovery grants nothing; only new owner approval with newer immutable timestamp can be consumed'});
});

test('T03 revoked, expired and email-changed admissions refuse current actual sessions',async()=>{
 for(const mode of ['revoked','expired','email-changed']){
  const flow=await invite(`${mode}@example.invalid`),session=await verify(flow.link);
  if(mode==='revoked'){const row=currentAdmission(flow.admissionId);await command('revokeAdmission',{admissionId:row.id,expectedRevision:row.revision,operationId:uid()});}
  if(mode==='expired')auth.sql(`UPDATE dobby_access_private.admissions SET expires_at=clock_timestamp()-interval '1 second' WHERE id=${q(flow.admissionId)};`);
  if(mode==='email-changed')success(await auth.requestAuth(`/admin/users/${session.user.id}`,{method:'PUT',headers:{...jsonHeaders,authorization:`Bearer ${auth.serviceToken}`},body:JSON.stringify({email:'changed-canonical@example.invalid',email_confirm:true})}),'Fixture canonical Auth email update');
  await accept(flow,session,profile,uid(),true);
 }
 proofs.push({scenario:'admission-identity-expiry-revocation',result:'real JWT sessions cannot consume revoked/clock-expired admissions or an admission for a different current Auth email; DB expiry uses explicit fixture clock injection'});
});

test('T05 pending target suspension and reactivation never restore its old admission or session',async()=>{
 const flow=await invite('pending-suspend@example.invalid');const target=flow.result.admission.targetUserId;
 assert.ok(target,'Bound actual Auth UUID returned');
 await command('setStatus',{userId:target,status:'suspended',expectedRevision:0,operationId:uid(),confirmed:true});
 const session=await verify(flow.link);await accept(flow,session,profile,uid(),true);
 const row=JSON.parse(auth.sql(`SELECT json_build_object('revision',revision,'status',status,'canCreate',can_create_household) FROM dobby_access_private.authorizations WHERE user_id=${q(target)};`));
 const active=await command('setStatus',{userId:target,status:'active',expectedRevision:row.revision,operationId:uid(),confirmed:true});
 assert.equal(active.sessionBoundaryPending,false);assert.equal(currentAdmission(flow.admissionId).state,'revoked');
 await accept(flow,session,profile,uid(),true);
 const refreshed=await auth.requestAuth('/token?grant_type=refresh_token',{method:'POST',headers:jsonHeaders,body:JSON.stringify({refresh_token:session.refresh_token})});
 assert.ok([200,400,401,403].includes(refreshed.status),'Old refresh must not encounter an unrelated server failure');
 if(refreshed.ok){const stale=await refreshed.json();const blocked=await rpc('dobby_v7_context',{},stale.access_token,{deny:true});assert.equal(blocked.status,403);}
 assert.equal(auth.sql(`SELECT can_create_household FROM dobby_access_private.authorizations WHERE user_id=${q(target)};`),'f');
 const fresh=await invite('pending-suspend@example.invalid');
 const newSession=await verify(fresh.link);assert.equal(newSession.user.id,target);
 await accept(fresh,newSession);
 assert.equal(auth.sql(`SELECT can_create_household FROM dobby_access_private.authorizations WHERE user_id=${q(target)};`),'t','Only a fresh explicit approval can grant the first household quota');
 assert.equal(currentAdmission(flow.admissionId).state,'revoked');
 proofs.push({scenario:'pending-suspension-reactivation',oldRefreshHTTPStatus:refreshed.status,result:'pending bound target suspended with closed row, admission revoked atomically; explicit two-transaction reactivation restores no old admission/quota/session; a real refresh of the old session still cannot access business RPCs; only a new explicit approval grants first quota'});
});

test('T04 requester suspension after approval prevents acceptance and remains revoked after explicit reactivation',async()=>{
 const request=await requestFamily('requester-inactive@example.invalid');await approve(request);
 const session=await verify(await emailLink('requester-inactive@example.invalid'));
 const revision=Number(auth.sql(`SELECT revision FROM dobby_access_private.authorizations WHERE user_id=${q(id(3))};`));
 await command('setStatus',{userId:id(3),status:'suspended',expectedRevision:revision,operationId:uid(),confirmed:true});
 await accept({admissionId:request.admission.id},session,profile,uid(),true);
 await command('setStatus',{userId:id(3),status:'active',expectedRevision:revision+1,operationId:uid(),confirmed:true});
 await rpc('dobby_v7_context',{},parent.access_token,{deny:true});parent=await auth.getLogin(3);
 assert.equal((await rpc('dobby_v7_context',{},parent.access_token)).householdId,id(102));
 assert.equal(currentAdmission(request.admission.id).state,'revoked');await accept({admissionId:request.admission.id},session,profile,uid(),true);
 proofs.push({scenario:'inactive-requester',result:'approval never survives requester suspension; old requester session stays refused after real re-login; admission remains revoked'});
});

test('T03 real short GoTrue OTP expiry is observed, not simulated by a mocked response',async()=>{
 await auth.setOtpExpiry(2);const flow=await invite('real-otp-expiry@example.invalid');
 await new Promise(r=>setTimeout(r,3100));const expired=await verify(flow.link,{deny:true});assert.equal(expired.status,403);
 const body=await expired.json();assert.equal(body.error_code,'otp_expired');await auth.setOtpExpiry(3600);
 proofs.push({scenario:'real-otp-expiry',result:'configured actual GoTrue OTP2s; elapsed wait3100ms; physical verify403 otp_expired; default restored'});
});

test('T10/T13 existing account PKCE recovery and password login work while signup is closed',async()=>{
 await auth.inbox.clear();const verifier=randomBytes(48).toString('base64url'),challenge=createHash('sha256').update(verifier).digest('base64url');
 success(await auth.requestAuth('/recover?redirect_to='+encodeURIComponent(auth.url+'/callback'),{method:'POST',headers:jsonHeaders,body:JSON.stringify({email:'fixture-2@example.invalid',code_challenge:challenge,code_challenge_method:'s256'})}),'PKCE recovery request');
 const link=await emailLink('fixture-2@example.invalid');const redirect=await fetch(link,{redirect:'manual'});assert.equal(redirect.status,303);
 const callback=new URL(redirect.headers.get('location'));const code=callback.searchParams.get('code');assert.ok(code,'Recovery returns a PKCE code');
 const exchange=await auth.requestAuth('/token?grant_type=pkce',{method:'POST',headers:jsonHeaders,body:JSON.stringify({auth_code:code,code_verifier:verifier})});success(exchange,'Real PKCE exchange');const session=await exchange.json();assert.equal(session.user.id,id(2));
 const password=randomBytes(24).toString('base64url');success(await auth.requestAuth('/user',{method:'PUT',headers:{...jsonHeaders,authorization:`Bearer ${session.access_token}`},body:JSON.stringify({password})}),'Fictional password recovery');
 const login=await auth.requestAuth('/token?grant_type=password',{method:'POST',headers:jsonHeaders,body:JSON.stringify({email:'fixture-2@example.invalid',password})});success(login,'Recovered existing login');assert.equal((await login.json()).user.id,id(2));
 proofs.push({scenario:'legacy-account-recovery',result:'real SMTP recovery, GoTrue verify redirect, PKCE verifier exchange, password reset and login preserve existing fictitious UUID with signup disabled'});
});

test('rollback disables new administration while retaining guards, decisions and old member access',async()=>{
 const file=readdirSync(resolve(root,'supabase/rollbacks')).find(x=>x.endsWith('_dobby_private_access_administration.sql'));assert.ok(file);
 const before=auth.sql('SELECT count(*) FROM dobby_access_private.decisions;');
 auth.sql('SET ROLE postgres;'+readFileSync(resolve(root,'supabase/rollbacks',file),'utf8'));
 await command('listAccess',{},owner.access_token,{deny:true});
 assert.equal(auth.sql('SELECT count(*) FROM dobby_access_private.decisions;'),before);
 assert.equal((await rpc('dobby_v7_context',{},owner.access_token)).householdId,id(101));
 await rpc('dobby_v7_create_invitation',{p_expires_in_hours:24,p_operation_id:uid()},owner.access_token,{deny:true});
 proofs.push({scenario:'conservative-rollback',result:'new admin disabled; decisions retained; old fictional owner family remains accessible; free invitation creators remain closed'});
});

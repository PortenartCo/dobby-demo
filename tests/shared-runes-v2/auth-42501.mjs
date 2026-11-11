/* In-place auth 42501 regression proof. Only the exact new local fixture is allowed. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {repo,container,users,guard,execute,value,asUser,asValue,authSQL,freshHousehold,readModule,wholeState,quote,sqlJSON,rpc,rpcSQL} from './pg-harness.mjs';
import {completionRequest,memberSummary} from '../../essai-stitch-v5-famille/family-runes-core.mjs';

const expectedContainer='dobby-runes-v2-test-20261111-auth-42501';
assert.equal(container,expectedContainer,'This regression test may reset only the new auth-42501 fixture');
const baseCommit='0a8e1ed',patchPath='sql-proposals/dobby-shared-runes-v2-auth-42501.sql',checksPath='sql-proposals/dobby-shared-runes-v2-auth-42501-checks.sql';
const evidence=resolve(repo,process.env.DOBBY_RUNES_AUTH_EVIDENCE||'docs/dobby-v7/evidence/shared-runes-v2/auth-42501');
const started=new Date().toISOString(),results=[];
const otherModules=['menus','recipes','house','family','contracts'];
const date='2026-11-11T12:00:00Z';
const mission=(id='mission-auth-42501',fields={})=>({id,title:'Mission fictive auth 42501',status:'open',category:'Famille',due:'2026-11-11',assigneeId:'member-a',effort:'light',rewardVersion:1,...fields});
const payload=(missions=[],fields={})=>({autoTasks:[],manualMissions:missions,runeCredits:[],runeRequests:[],runeLedgerVersion:2,...fields});
const hash=text=>createHash('sha256').update(text).digest('hex');
const booleanValue=expression=>value(`SELECT to_json(${expression});`);
function immutableSQL(path){const out=spawnSync('git',['show',`${baseCommit}:${path}`],{cwd:repo,encoding:'utf8',maxBuffer:4*1024*1024});assert.equal(out.status,0,out.stderr);return out.stdout;}
const baselineModules=immutableSQL('sql-proposals/dobby-v2-modules.sql');
const baselineRunes=immutableSQL('sql-proposals/dobby-shared-runes-v2.sql');
let environment,patch,checks,initialState,initialPrivileges,initialDefinitions,legacyHouse,legacyPayload,legacyOperation,legacyWrite,newHouse,inactiveHouse,foreignHouse;

function dataSnapshot(){return value(`SELECT json_build_object(
 'users',(SELECT json_agg(to_jsonb(t) ORDER BY id) FROM auth.users t),
 'households',(SELECT json_agg(to_jsonb(t) ORDER BY id) FROM public.dobby_v2_households t),
 'memberships',(SELECT json_agg(to_jsonb(t) ORDER BY household_id,user_id) FROM public.dobby_v2_memberships t),
 'modules',(SELECT json_agg(to_jsonb(t) ORDER BY household_id,module) FROM public.dobby_v2_modules t),
 'receipts',(SELECT json_agg(to_jsonb(t) ORDER BY household_id,operation_id) FROM dobby_runes_private.operations t));`);}
function privilegeSnapshot({includeHelper=false}={}){return value(`SELECT json_build_object(
 'roles',(SELECT json_agg(to_jsonb(t) ORDER BY rolname) FROM (SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit,rolvaliduntil,rolconfig FROM pg_roles WHERE rolname NOT LIKE 'pg_%')t),
 'memberships',(SELECT json_agg(to_jsonb(t) ORDER BY roleid,member,grantor) FROM pg_auth_members t),
 'schemas',(SELECT json_agg(to_jsonb(t) ORDER BY name) FROM (SELECT nspname AS name,pg_get_userbyid(nspowner) AS owner,(SELECT json_agg(to_jsonb(a) ORDER BY grantor,grantee,privilege_type,is_grantable) FROM aclexplode(COALESCE(nspacl,acldefault('n',nspowner)))a) AS acl FROM pg_namespace WHERE nspname IN ('public','auth','dobby_runes_private'))t),
 'relations',(SELECT json_agg(to_jsonb(t) ORDER BY schema,name) FROM (SELECT n.nspname AS schema,c.relname AS name,pg_get_userbyid(c.relowner) AS owner,c.relrowsecurity,c.relforcerowsecurity,(SELECT json_agg(to_jsonb(a) ORDER BY grantor,grantee,privilege_type,is_grantable) FROM aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner)))a) AS acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','dobby_runes_private') AND c.relkind='r')t),
 'functions',(SELECT json_agg(to_jsonb(t) ORDER BY signature) FROM (SELECT n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' AS signature,pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.provolatile,p.proconfig,(SELECT json_agg(to_jsonb(a) ORDER BY grantor,grantee,privilege_type,is_grantable) FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner)))a) AS acl FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','auth','dobby_runes_private') ${includeHelper?'':"AND NOT(n.nspname='dobby_runes_private' AND p.proname='request_user_id' AND p.pronargs=0)"})t));`);}
function definitions(){return value(`SELECT json_build_object(
 'functions',(SELECT json_agg(to_jsonb(t) ORDER BY signature) FROM (SELECT n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' AS signature,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','auth','dobby_runes_private'))t),
 'policies',(SELECT json_agg(to_jsonb(t) ORDER BY schemaname,tablename,policyname) FROM pg_policies t WHERE schemaname IN ('public','dobby_runes_private')),
 'triggers',(SELECT json_agg(to_jsonb(t) ORDER BY name,definition) FROM (SELECT tgname AS name,pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE NOT tgisinternal)t));`);}
function writerBoundary(){return value(`SELECT json_build_object(
 'auth_usage',has_schema_privilege('dobby_missions_v2_writer','auth','USAGE'),
 'auth_uid_execute',has_function_privilege('dobby_missions_v2_writer','auth.uid()','EXECUTE'),
 'authenticated_member',pg_has_role('dobby_missions_v2_writer','authenticated','MEMBER'),
 'client_member',pg_has_role('authenticated','dobby_missions_v2_writer','MEMBER'),
 'anon_member',pg_has_role('anon','dobby_missions_v2_writer','MEMBER'),
 'authenticator_member',pg_has_role('dobby_fixture_authenticator','dobby_missions_v2_writer','MEMBER'),
 'superuser',(SELECT rolsuper FROM pg_roles WHERE rolname='dobby_missions_v2_writer'),
 'bypassrls',(SELECT rolbypassrls FROM pg_roles WHERE rolname='dobby_missions_v2_writer'),
 'owns_storage',EXISTS(SELECT FROM pg_class WHERE oid IN ('public.dobby_v2_modules'::regclass,'public.dobby_v2_memberships'::regclass,'dobby_runes_private.operations'::regclass) AND pg_get_userbyid(relowner)='dobby_missions_v2_writer'),
 'storage_rls',NOT EXISTS(SELECT FROM pg_class WHERE oid IN ('public.dobby_v2_modules'::regclass,'public.dobby_v2_memberships'::regclass,'dobby_runes_private.operations'::regclass) AND NOT relrowsecurity),
 'membership_update',has_table_privilege('dobby_missions_v2_writer','public.dobby_v2_memberships','UPDATE'),
 'receipt_update',has_table_privilege('dobby_missions_v2_writer','dobby_runes_private.operations','UPDATE'),
 'receipt_delete',has_table_privilege('dobby_missions_v2_writer','dobby_runes_private.operations','DELETE'),
 'public_create',has_schema_privilege('dobby_missions_v2_writer','public','CREATE'));
`);}
function assertBoundary(){const boundary=writerBoundary();for(const [key,result] of Object.entries(boundary))assert.equal(result,key==='storage_rls',key);return boundary;}
function refuse(sql,{code='42501',...options}={}){const before=dataSnapshot(),out=asUser(sql,{...options,allowFailure:true});assert.notEqual(out.status,0,'Expected a PostgreSQL refusal');assert.match(out.stderr,new RegExp('\\b'+code+'\\b'),out.stderr);assert.deepEqual(dataSnapshot(),before,'Refusal must preserve every fixture row and receipt');return {sqlstate:code,message:out.stderr.split('\n')[0]};}
function capabilitySQL(household){return `SELECT public.dobby_missions_v2_capabilities(${quote(household)}::uuid)::text;`;}
async function scenario(name,fn){const now=Date.now();try{const detail=await fn();results.push({name,status:'PASS',milliseconds:Date.now()-now,...(detail===undefined?{}:{detail})});console.log('PASS '+name);}catch(error){results.push({name,status:'FAIL',milliseconds:Date.now()-now,error:error.stack});console.error('FAIL '+name+'\n'+error.stack);throw error;}}

try{
 environment=guard();
 await scenario('immutable baseline installation and native V1 history generate a real prior receipt',()=>{
  execute(readFileSync(resolve(repo,'tests/shared-runes-v2/bootstrap.sql'),'utf8'));
  execute(baselineModules);
  legacyHouse=freshHousehold();newHouse=freshHousehold();inactiveHouse=freshHousehold();foreignHouse=randomUUID();
  execute(`UPDATE public.dobby_v2_memberships SET active=false WHERE household_id=${quote(inactiveHouse)} AND user_id=${quote(users.a)}; INSERT INTO public.dobby_v2_households(id) VALUES(${quote(foreignHouse)}); INSERT INTO public.dobby_v2_memberships(household_id,user_id) VALUES(${quote(foreignHouse)},${quote(users.outsider)});`);
  const grant={missionId:'legacy-auth-42501',memberId:'member-a',effort:'light',amount:10,date,title:'Gain V1 original',revision:0};
  legacyPayload=payload([mission('legacy-auth-42501',{status:'done'})],{runeCredits:[grant],runeLedgerVersion:1});
  asUser(`INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES(${quote(legacyHouse)},'missions',${sqlJSON(legacyPayload)});`);
  for(const module of otherModules)asUser(`INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES(${quote(legacyHouse)},${quote(module)},${sqlJSON({fixture:module,original:true})});`);
  execute(baselineRunes);
  legacyOperation=randomUUID();legacyWrite=rpc(legacyHouse,1,legacyPayload,{operation:legacyOperation});
  assert.equal(legacyWrite.module.revision,2);assert.deepEqual(legacyWrite.module.payload.runeCredits,[grant]);
  assert.equal(wholeState(legacyHouse).receipts.length,1);
  return {baselineCommit:baseCommit,modulesSHA256:hash(baselineModules),runesSHA256:hash(baselineRunes),legacyRevision:2,legacyEvents:1,priorReceipts:1};
 });
 await scenario('restricted writer reproduces auth 42501 before the patch without changing data',()=>{
  // Remove PUBLIC's default function grant as well: otherwise EXECUTE remains effective.
  execute('REVOKE USAGE ON SCHEMA auth FROM dobby_missions_v2_writer; REVOKE EXECUTE ON FUNCTION auth.uid() FROM PUBLIC,dobby_missions_v2_writer;');
  const boundary=assertBoundary(),capability=refuse(capabilitySQL(legacyHouse));
  const write=refuse(rpcSQL(legacyHouse,2,randomUUID(),legacyWrite.module.payload));
  assert.match(capability.message,/permission denied for schema auth/i);assert.match(write.message,/permission denied for schema auth/i);
  initialState=dataSnapshot();initialPrivileges=privilegeSnapshot();initialDefinitions=definitions();
  assert.equal(booleanValue("to_regprocedure('dobby_runes_private.request_user_id()') IS NULL"),true);
  return {boundary,capability,write};
 });
 patch=readFileSync(resolve(repo,patchPath),'utf8');
 await scenario('pre-existing helper definer, writer owner, body or public ACL drift refuses with no replacement',()=>{
  const canonical=patch.match(/CREATE OR REPLACE FUNCTION dobby_runes_private\.request_user_id\(\)[\s\S]*?\$\$;/)?.[0];assert.ok(canonical,'Standalone patch must contain its complete helper definition');
  const acl="REVOKE ALL ON FUNCTION dobby_runes_private.request_user_id() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION dobby_runes_private.request_user_id() TO dobby_missions_v2_writer;";
  const variants=[
   {name:'SECURITY DEFINER',create:canonical.replace('SECURITY INVOKER','SECURITY DEFINER'),after:acl},
   {name:'writer owner',create:canonical,after:acl+' ALTER FUNCTION dobby_runes_private.request_user_id() OWNER TO dobby_missions_v2_writer;'},
   {name:'different body',create:"CREATE FUNCTION dobby_runes_private.request_user_id() RETURNS uuid LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$BEGIN RETURN NULL; END;$$;",after:acl},
   {name:'PUBLIC execution',create:canonical,after:'GRANT EXECUTE ON FUNCTION dobby_runes_private.request_user_id() TO dobby_missions_v2_writer;'}
  ];
  for(const variant of variants){execute(variant.create+'\n'+variant.after);try{const before={definitions:definitions(),privileges:privilegeSnapshot({includeHelper:true}),data:dataSnapshot()},out=execute(patch,{allowFailure:true});assert.notEqual(out.status,0,variant.name+' must be refused');assert.match(out.stderr,/helper|request_user_id|claims/i,out.stderr);assert.deepEqual({definitions:definitions(),privileges:privilegeSnapshot({includeHelper:true}),data:dataSnapshot()},before,variant.name+' must not be silently repaired or replaced');}finally{execute('DROP FUNCTION dobby_runes_private.request_user_id();');}}
  assert.deepEqual(definitions(),initialDefinitions);assert.deepEqual(privilegeSnapshot(),initialPrivileges);assert.deepEqual(dataSnapshot(),initialState);assertBoundary();
  return {refusedVariants:variants.map(v=>v.name),divergentHelperUnchanged:true};
 });
 await scenario('an additional condition on a known writer policy is preserved by refusing the patch',()=>{
  const original=initialDefinitions.policies.find(p=>p.policyname==='dobby_missions_writer_membership');assert.ok(original);
  execute(`ALTER POLICY dobby_missions_writer_membership ON public.dobby_v2_memberships USING((${original.qual}) AND user_id<>${quote(users.b)}::uuid);`);
  try{const before={definitions:definitions(),privileges:privilegeSnapshot({includeHelper:true}),data:dataSnapshot()},out=execute(patch,{allowFailure:true});assert.notEqual(out.status,0);assert.match(out.stderr,/policy|expression/i,out.stderr);assert.deepEqual({definitions:definitions(),privileges:privilegeSnapshot({includeHelper:true}),data:dataSnapshot()},before,'A local restriction must never be overwritten');assert.equal(booleanValue("to_regprocedure('dobby_runes_private.request_user_id()') IS NULL"),true);}finally{execute(`ALTER POLICY dobby_missions_writer_membership ON public.dobby_v2_memberships USING(${original.qual});`);}
  assert.deepEqual(definitions(),initialDefinitions);assert.deepEqual(privilegeSnapshot(),initialPrivileges);assert.deepEqual(dataSnapshot(),initialState);
  return {knownPolicy:'dobby_missions_writer_membership',additionalCondition:'user_id excludes member B',restrictionOverwritten:false};
 });
 await scenario('unexpected installed function or effective auth policy refuses the patch atomically',()=>{
  const originalStamp=initialDefinitions.functions.find(f=>f.signature==='public.dobby_v2_modules_stamp()').definition;
  const changedStamp=originalStamp.replace('NEW.updated_at := clock_timestamp();','-- Fixture-only body drift\n  NEW.updated_at := clock_timestamp();');assert.notEqual(changedStamp,originalStamp);
  execute(changedStamp);
  try{const before=definitions(),out=execute(patch,{allowFailure:true});assert.notEqual(out.status,0);assert.match(out.stderr,/Installed function differs from the reviewed original\/fix/);assert.deepEqual(definitions(),before);assert.deepEqual(dataSnapshot(),initialState);assert.deepEqual(privilegeSnapshot(),initialPrivileges);}finally{execute(originalStamp);}
  execute('CREATE POLICY fixture_additional_auth_policy ON public.dobby_v2_modules FOR SELECT TO PUBLIC USING(auth.uid() IS NOT NULL);');
  try{const before=definitions(),out=execute(patch,{allowFailure:true});assert.notEqual(out.status,0);assert.match(out.stderr,/Additional auth-dependent writer policy/);assert.deepEqual(definitions(),before);assert.deepEqual(dataSnapshot(),initialState);assert.deepEqual(privilegeSnapshot(),initialPrivileges);assert.equal(booleanValue("to_regprocedure('dobby_runes_private.request_user_id()') IS NULL"),true);}finally{execute('DROP POLICY fixture_additional_auth_policy ON public.dobby_v2_modules;');}
  assert.deepEqual(definitions(),initialDefinitions);assertBoundary();
  return {unexpectedFunctionBody:'refused before changes',additionalPublicAuthPolicy:'refused with full rollback'};
 });
 await scenario('standalone patch DDL and ACL roll back atomically when the transaction fails',()=>{
  assert.equal((patch.match(/\bCOMMIT\s*;/gi)||[]).length,1,'Fixture injection requires exactly one final commit');
  const failed=patch.replace(/\bCOMMIT\s*;/i,"DO $fixture_abort$ BEGIN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='Fixture requested atomic patch rollback'; END $fixture_abort$;\nCOMMIT;");
  const out=execute(failed,{allowFailure:true});assert.notEqual(out.status,0);assert.match(out.stderr,/P0001/);assert.match(out.stderr,/Fixture requested atomic patch rollback/);
  assert.deepEqual(dataSnapshot(),initialState);assert.deepEqual(privilegeSnapshot(),initialPrivileges);assert.deepEqual(definitions(),initialDefinitions);
  assert.equal(booleanValue("to_regprocedure('dobby_runes_private.request_user_id()') IS NULL"),true);assertBoundary();
  return {sqlstate:'P0001',allDDLAndACLRestored:true,newHelperAbsent:true};
 });
 await scenario('exact standalone patch installs in place and preserves existing rows, receipts, roles and grants',()=>{
  execute(patch);assert.deepEqual(dataSnapshot(),initialState);assert.deepEqual(privilegeSnapshot(),initialPrivileges);assertBoundary();
  const changed=definitions();
  assert.deepEqual(changed.triggers,initialDefinitions.triggers,'No trigger is recreated or reconfigured');
  for(const before of initialDefinitions.functions){const after=changed.functions.find(f=>f.signature===before.signature);assert.ok(after);if(!/^(public\.(dobby_missions_v2_(capabilities|write)|dobby_v2_modules_stamp)|dobby_runes_private\.lock_active_membership)\(/.test(before.signature))assert.equal(after.definition,before.definition,`${before.signature} changed outside scope`);}
  for(const policy of changed.policies.filter(p=>p.roles.includes('dobby_missions_v2_writer')))assert.doesNotMatch((policy.qual||'')+' '+(policy.with_check||''),/auth\.uid\s*\(/,'Writer policy retains auth dependency');
  for(const before of initialDefinitions.policies.filter(p=>!p.roles.includes('dobby_missions_v2_writer')))assert.deepEqual(changed.policies.find(p=>p.schemaname===before.schemaname&&p.tablename===before.tablename&&p.policyname===before.policyname),before,'Non-writer RLS changed');
  assert.equal(changed.policies.filter(p=>p.roles.includes('dobby_missions_v2_writer')).length,6);
  return {patch:patchPath,patchSHA256:hash(patch),allRowsAndReceiptsUnchanged:true,existingPrivilegesUnchanged:true,writerPolicies:6};
 });
 await scenario('a second exact application is idempotent for definitions, ACL, data and receipts',()=>{
  const before={data:dataSnapshot(),privileges:privilegeSnapshot({includeHelper:true}),definitions:definitions()};
  execute(patch);assert.deepEqual({data:dataSnapshot(),privileges:privilegeSnapshot({includeHelper:true}),definitions:definitions()},before);assertBoundary();
  return {applications:2};
 });
 await scenario('private helper and all security contexts retain their least-privilege boundary',()=>{
  const metadata=value(`SELECT json_agg(to_jsonb(t) ORDER BY signature) FROM (SELECT p.oid::regprocedure::text AS signature,pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.provolatile,p.proconfig,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='dobby_runes_private' AND p.proname IN ('request_user_id','lock_active_membership','guard_missions')) OR (n.nspname='public' AND p.proname IN ('dobby_v2_modules_stamp','dobby_missions_v2_capabilities','dobby_missions_v2_write')))t;`);
  assert.equal(metadata.length,6);
  for(const fn of metadata){assert.ok(fn.proconfig.includes('search_path=""'),fn.signature);if(/dobby_missions_v2_(write|capabilities)/.test(fn.signature)){assert.equal(fn.owner,'dobby_missions_v2_writer');assert.equal(fn.prosecdef,true);}else if(/lock_active_membership/.test(fn.signature)){assert.notEqual(fn.owner,'dobby_missions_v2_writer');assert.equal(fn.prosecdef,true);}else assert.equal(fn.prosecdef,false);if(!/dobby_v2_modules_stamp/.test(fn.signature))assert.doesNotMatch(fn.definition,/auth\./,fn.signature);}
  const helper=metadata.find(f=>f.signature.includes('request_user_id'));assert.equal(helper.provolatile,'s');assert.ok(!['anon','authenticated','dobby_missions_v2_writer'].includes(helper.owner),'Helper must remain owned by the migration operator');
  for(const role of ['PUBLIC','anon','authenticated']){if(role!=='PUBLIC')assert.equal(booleanValue(`has_schema_privilege(${quote(role)},'dobby_runes_private','USAGE')`),false);const acl=booleanValue(`EXISTS(SELECT FROM pg_proc p,aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner)))a WHERE p.oid='dobby_runes_private.request_user_id()'::regprocedure AND a.privilege_type='EXECUTE' AND a.grantee=${role==='PUBLIC'?'0':`(SELECT oid FROM pg_roles WHERE rolname=${quote(role)})`})`);assert.equal(acl,false,role);}
  assert.equal(booleanValue("has_function_privilege('dobby_missions_v2_writer','dobby_runes_private.request_user_id()','EXECUTE')"),true);
  const noClaims=value("BEGIN; SET LOCAL ROLE dobby_missions_v2_writer; SELECT json_build_object('actor',dobby_runes_private.request_user_id()); COMMIT;");assert.equal(noClaims.actor,null);
  const blocked=execute('BEGIN; SET LOCAL ROLE dobby_missions_v2_writer; SELECT auth.uid(); COMMIT;',{allowFailure:true});assert.notEqual(blocked.status,0);assert.match(blocked.stderr,/42501/);assert.match(blocked.stderr,/permission denied for schema auth/i);
  return {helperStable:true,helperInvoker:true,stampInvoker:true,writerStillCannotCallAuth:true};
 });
 await scenario('missing, empty, malformed and non-string modern sub refuse despite a valid legacy sub',()=>{
  const malformed=['','not-json','{','null','[]','"scalar"','42','true','{}',JSON.stringify({sub:null}),JSON.stringify({sub:''}),JSON.stringify({sub:7}),JSON.stringify({sub:{id:users.a}}),JSON.stringify({sub:[]}),JSON.stringify({sub:'invalid-uuid'})];
  for(const claims of malformed){refuse(capabilitySQL(legacyHouse),{claims});refuse(rpcSQL(legacyHouse,2,randomUUID(),legacyWrite.module.payload),{claims});}
  for(const sql of [capabilitySQL(legacyHouse),rpcSQL(legacyHouse,2,randomUUID(),legacyWrite.module.payload)]){const before=dataSnapshot(),out=execute(`BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub',${quote(users.a)},true); ${sql} COMMIT;`,{client:true,allowFailure:true});assert.notEqual(out.status,0);assert.match(out.stderr,/42501/);assert.deepEqual(dataSnapshot(),before);}
  return {malformedModernCases:malformed.length,missingModernSettingCases:2,legacyFallback:false};
 });
 await scenario('anonymous, nonmember, other-household and inactive actors remain refused',()=>{
  const denied=[{role:'anon'},{user:users.outsider},{household:foreignHouse},{household:inactiveHouse},{claims:JSON.stringify({sub:users.outsider,role:'dobby_missions_v2_writer'}),legacyUser:users.a}];
  for(const {household=legacyHouse,...options} of denied){refuse(capabilitySQL(household),options);refuse(rpcSQL(household,2,randomUUID(),legacyWrite.module.payload),options);}
  return {refusedVariants:denied.length};
 });
 await scenario('active member capability and first native write work without access to auth',()=>{
  const capability=asValue(capabilitySQL(newHouse));assert.equal(capability.protocol,2);assert.equal(capability.directWritesBlocked,true);
  const initial=rpc(newHouse,0,payload([mission()]));assert.equal(initial.module.revision,1);assert.equal(readModule(newHouse).updated_by,users.a);assert.equal(wholeState(newHouse).receipts.at(-1).actor_id,users.a);
  assertBoundary();return {capability,firstRevision:1,updatedBy:users.a};
 });
 await scenario('modern verified sub determines the receipt actor and invoker stamp independently of legacy',()=>{
  const state=readModule(newHouse),next=structuredClone(state.payload),m=next.manualMissions[0];
  const request=completionRequest(m,[{id:'member-a'}],next.runeCredits,[],date);assert.ok(request);m.status='done';next.runeRequests=[request];
  const options={claims:JSON.stringify({sub:users.b,role:'authenticated'}),legacyUser:users.a};
  assert.equal(asValue(capabilitySQL(newHouse),options).protocol,2);
  const operation=randomUUID(),response=rpc(newHouse,state.revision,next,{...options,operation});
  assert.equal(response.module.revision,2);assert.equal(readModule(newHouse).updated_by,users.b);assert.equal(memberSummary('member-a',response.module.payload.runeCredits).total,10);
  const receipt=wholeState(newHouse).receipts.find(r=>r.operation_id===operation);assert.equal(receipt.actor_id,users.b);
  const before=wholeState(newHouse),replay=rpc(newHouse,state.revision,next,{...options,operation});assert.equal(replay.replayed,true);assert.deepEqual(replay.operation,response.operation);assert.deepEqual(wholeState(newHouse),before);
  refuse(rpcSQL(newHouse,state.revision,operation,next),{code:'22023'});
  refuse(rpcSQL(newHouse,state.revision,randomUUID(),next),{...options,code:'40001'});
  refuse(rpcSQL(newHouse,state.revision,operation,{...next,autoTasks:[{fixture:'different'}]}),{...options,code:'22023'});
  return {modernSub:users.b,contradictoryLegacySub:users.a,actorAndStamp:users.b,nativeBalance:10,replayWithoutMutation:true,staleCAS:'40001',contradictoryOperation:'22023'};
 });
 await scenario('a receipt created by the immutable original migration still replays after the patch',()=>{
  const before=wholeState(legacyHouse),replay=rpc(legacyHouse,1,legacyPayload,{operation:legacyOperation});assert.equal(replay.replayed,true);assert.deepEqual(replay.operation,legacyWrite.operation);assert.deepEqual(wholeState(legacyHouse),before);assert.equal(replay.module.payload.runeCredits[0].date,date);assert.equal(replay.module.payload.runeCredits[0].revision,0);
  return {originalReceiptRetained:true,originalDate:date,originalEventRevision:0};
 });
 await scenario('all five other modules keep INSERT, UPDATE, revision and legacy auth.uid stamp behavior',()=>{
  const options={claims:JSON.stringify({sub:users.b,role:'authenticated'}),legacyUser:users.a};
  for(const module of otherModules){const insert=asValue(`INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES(${quote(newHouse)},${quote(module)},${sqlJSON({fixture:module,stage:'insert'})}) RETURNING row_to_json(dobby_v2_modules);`,options);assert.equal(insert.revision,1);assert.equal(insert.updated_by,users.a);
   const update=asValue(`UPDATE public.dobby_v2_modules SET payload=${sqlJSON({fixture:module,stage:'update'})} WHERE household_id=${quote(newHouse)} AND module=${quote(module)} RETURNING row_to_json(dobby_v2_modules);`,options);assert.equal(update.revision,2);assert.equal(update.updated_by,users.a);assert.equal(update.created_at,insert.created_at);assert.deepEqual(update.payload,{fixture:module,stage:'update'});
   const before=dataSnapshot();assert.equal(asValue(`SELECT row_to_json(t) FROM public.dobby_v2_modules t WHERE household_id=${quote(newHouse)} AND module=${quote(module)};`,{user:users.outsider}),null);assert.equal(asValue(`UPDATE public.dobby_v2_modules SET payload='{}' WHERE household_id=${quote(newHouse)} AND module=${quote(module)} RETURNING row_to_json(dobby_v2_modules);`,{user:users.outsider}),null);assert.deepEqual(dataSnapshot(),before);
   refuse(`INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES(${quote(foreignHouse)},${quote(module)},'{}');`);
  }
  return {modules:otherModules,insertRevision:1,updateRevision:2,legacyStampUnchanged:users.a,otherHouseholdRLS:true};
 });
 await scenario('legacy direct Missions writes and arbitrary writer flags remain blocked',()=>{
  const before=wholeState(newHouse);refuse(`UPDATE public.dobby_v2_modules SET payload='{}' WHERE household_id=${quote(newHouse)} AND module='missions';`);
  refuse(`INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES(${quote(inactiveHouse)},'missions','{}');`,{user:users.b});
  refuse(`INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES(${quote(newHouse)},'missions','{}') ON CONFLICT(household_id,module) DO UPDATE SET payload=EXCLUDED.payload;`);
  for(const setting of ['dobby.missions_v2_writer','dobby.runes_v2','app.dobby_missions_v2','app.bypass_runes_guard'])refuse(`SELECT set_config(${quote(setting)},'true',true); UPDATE public.dobby_v2_modules SET payload='{}' WHERE household_id=${quote(newHouse)} AND module='missions';`);
  refuse(`UPDATE public.dobby_v2_modules SET payload='{}' WHERE household_id=${quote(newHouse)} AND module='missions';`,{claims:JSON.stringify({sub:users.a,role:'dobby_missions_v2_writer'})});assert.deepEqual(wholeState(newHouse),before);
  return {guardStillInvoker:true,blockedDirectVariants:8};
 });
 await scenario('clients cannot call the private helper, read receipts or become the writer',()=>{
  for(const role of ['authenticated','anon'])for(const sql of ['SELECT dobby_runes_private.request_user_id();','SELECT * FROM dobby_runes_private.operations;','SET LOCAL ROLE dobby_missions_v2_writer;',"SELECT set_config('role','dobby_missions_v2_writer',true);"])refuse(sql,{role});
  assert.equal(asValue('SELECT json_build_object(\'uid\',auth.uid());').uid,users.a);assertBoundary();
  return {privateAccessVariants:8,ordinaryAuthUIDUnchanged:true,boundary:writerBoundary()};
 });
 await scenario('the complete operator catalog-check file executes read only without changing state',()=>{
  checks=readFileSync(resolve(repo,checksPath),'utf8');
  const before={data:dataSnapshot(),privileges:privilegeSnapshot({includeHelper:true}),definitions:definitions()};
  const out=execute('SET default_transaction_read_only=on;\n'+checks);assert.equal(out.status,0);assert.deepEqual({data:dataSnapshot(),privileges:privilegeSnapshot({includeHelper:true}),definitions:definitions()},before);
  mkdirSync(evidence,{recursive:true});writeFileSync(resolve(evidence,'checks.log'),out.stdout+'\n');
  return {checks:checksPath,checksSHA256:hash(checks),readOnly:true,entireFileExecuted:true};
 });
 await scenario('a pre-existing SQL editor operator reapplies the patch without superuser, BYPASSRLS or role administration',()=>{
  // Fixture preparation only. These owner transfers and role grant are never part of the patch.
  const operator='dobby_fixture_sql_editor';
  execute(`DO $operator$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname=${quote(operator)}) THEN CREATE ROLE ${operator}; END IF; END $operator$;
   ALTER ROLE ${operator} NOLOGIN INHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
   GRANT dobby_missions_v2_writer TO ${operator};
   ALTER SCHEMA public OWNER TO ${operator}; ALTER SCHEMA dobby_runes_private OWNER TO ${operator};
   ALTER TABLE public.dobby_v2_modules OWNER TO ${operator}; ALTER TABLE public.dobby_v2_memberships OWNER TO ${operator}; ALTER TABLE dobby_runes_private.operations OWNER TO ${operator};
   ALTER FUNCTION dobby_runes_private.lock_active_membership(uuid) OWNER TO ${operator}; ALTER FUNCTION public.dobby_v2_modules_stamp() OWNER TO ${operator}; ALTER FUNCTION dobby_runes_private.request_user_id() OWNER TO ${operator};`);
  const before={data:dataSnapshot(),privileges:privilegeSnapshot({includeHelper:true}),definitions:definitions()};
  const out=execute(`SET ROLE ${operator};\n${patch}\nSELECT json_build_object('role',CURRENT_USER,'superuser',(SELECT rolsuper FROM pg_roles WHERE rolname=CURRENT_USER),'bypassrls',(SELECT rolbypassrls FROM pg_roles WHERE rolname=CURRENT_USER),'createrole',(SELECT rolcreaterole FROM pg_roles WHERE rolname=CURRENT_USER),'writer_member',pg_has_role(CURRENT_USER,'dobby_missions_v2_writer','MEMBER'),'authenticated_member',pg_has_role(CURRENT_USER,'authenticated','MEMBER'),'auth_usage',has_schema_privilege(CURRENT_USER,'auth','USAGE'));`);
  const identity=JSON.parse(out.stdout.split('\n').at(-1));assert.deepEqual(identity,{role:operator,superuser:false,bypassrls:false,createrole:false,writer_member:true,authenticated_member:false,auth_usage:false});
  assert.deepEqual({data:dataSnapshot(),privileges:privilegeSnapshot({includeHelper:true}),definitions:definitions()},before);assertBoundary();
  assert.equal(asValue(capabilitySQL(newHouse)).protocol,2);const state=readModule(newHouse),response=rpc(newHouse,state.revision,state.payload);assert.equal(response.module.revision,state.revision+1);assert.equal(readModule(newHouse).updated_by,users.a);
  return {operator:identity,fixtureOwnershipPreparedBeforePatch:true,patchReappliedWithoutPrivilegeChanges:true,capabilityAndWriteAfterOperatorReapply:true};
 });
 assert.equal(hash(readFileSync(resolve(repo,patchPath),'utf8')),hash(patch),'Patch changed during proof; rerun against a single artifact');
 assert.equal(hash(readFileSync(resolve(repo,checksPath),'utf8')),hash(checks),'Catalog checks changed during proof; rerun against a single artifact');
}catch(error){process.exitCode=1;if(!results.some(r=>r.status==='FAIL')){results.push({name:'fixture setup',status:'FAIL',error:error.stack});console.error(error.stack);}}
finally{
 mkdirSync(evidence,{recursive:true});
 const report={started,finished:new Date().toISOString(),environment,baselineCommit:baseCommit,baselineModulesSHA256:hash(baselineModules),baselineRunesSHA256:hash(baselineRunes),patch:patchPath,patchSHA256:patch?hash(patch):null,checks:checksPath,checksSHA256:checks?hash(checks):null,fixtureOnly:true,realSupabaseTouched:false,originalContainerTouched:false,summary:{pass:results.filter(r=>r.status==='PASS').length,fail:results.filter(r=>r.status==='FAIL').length,total:results.length},results};
 writeFileSync(resolve(evidence,'results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));
}

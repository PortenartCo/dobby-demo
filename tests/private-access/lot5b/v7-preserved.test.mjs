import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { catalog } from '../lot2a/catalog.mjs';
import { run, raw, stop, as, id, q, prepare, interactive } from '../local-db.mjs';
import { buildArtifacts } from '../../../supabase/compatibility/lot5b/build-variants.mjs';
import {restAvailable,startLocalRest} from './local-rest.mjs';

const variantPath=new URL('../../../supabase/compatibility/lot5b/v7-preserved.candidate.sql',import.meta.url);
const candidate=()=>existsSync(variantPath)?readFileSync(variantPath,'utf8'):buildArtifacts()['lot2a-compatible.candidate.sql'];
// The complete private Missions fixture is unavailable. Omit ONLY its metadata
// gate in memory; these V7 paths use the complete published family dependencies.
const partial=()=>candidate().replace(buildArtifacts()['missions.preflight.sql'],'-- TEST ONLY: missing Missions metadata gate omitted; no private stub.');
const stripOuter=sql=>sql.replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'');
let functions,privileges,initialFunctionOids,rest;
const originals=()=>run(`SELECT jsonb_agg(jsonb_build_array(oid,md5(pg_get_functiondef(oid)),proowner,proacl::text) ORDER BY oid) FROM pg_proc WHERE proowner='dobby_v7_writer'::regrole;`);
const privilegeSnapshot=()=>run(`SELECT jsonb_build_object(
 'role',(SELECT jsonb_build_array(rolcanlogin,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolinherit) FROM pg_roles WHERE rolname='dobby_v7_writer'),
 'memberships',(SELECT jsonb_agg(to_jsonb(m) ORDER BY roleid,member,grantor) FROM pg_auth_members m WHERE roleid='dobby_v7_writer'::regrole OR member='dobby_v7_writer'::regrole),
 'schema',(SELECT jsonb_agg(jsonb_build_array(n.oid,a.grantor,a.privilege_type,a.is_grantable) ORDER BY n.oid,a.grantor,a.privilege_type) FROM pg_namespace n CROSS JOIN LATERAL aclexplode(n.nspacl) a WHERE a.grantee='dobby_v7_writer'::regrole),
 'table',(SELECT jsonb_agg(jsonb_build_array(c.oid,a.grantor,a.privilege_type,a.is_grantable) ORDER BY c.oid,a.grantor,a.privilege_type) FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE a.grantee='dobby_v7_writer'::regrole),
 'column',(SELECT jsonb_agg(jsonb_build_array(c.attrelid,c.attnum,a.grantor,a.privilege_type,a.is_grantable) ORDER BY c.attrelid,c.attnum,a.grantor,a.privilege_type) FROM pg_attribute c CROSS JOIN LATERAL aclexplode(c.attacl) a WHERE a.grantee='dobby_v7_writer'::regrole),
 'function',(SELECT jsonb_agg(jsonb_build_array(p.oid,a.grantor,a.privilege_type,a.is_grantable) ORDER BY p.oid,a.grantor,a.privilege_type) FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) a WHERE a.grantee='dobby_v7_writer'::regrole));`);
const rows=()=>run(`SELECT md5(jsonb_build_array(${['public.dobby_v2_households','public.dobby_v2_memberships','public.dobby_v2_modules','dobby_v7_private.account_links','dobby_v7_private.pending_profiles','dobby_v7_private.operations','dobby_access_private.authorizations'].map(t=>`(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM ${t} x)`).join(',')})::text);`);
const approve=`INSERT INTO dobby_access_private.authorizations(user_id,status,approved_by,can_create_household) VALUES(${q(id(3))},'active',${q(id(1))},false),(${q(id(4))},'active',${q(id(1))},false),(${q(id(6))},'active',${q(id(1))},true);`;
const reject=(sql,user=2,mutation='',code='42501')=>{
 const before=rows(); const result=raw('BEGIN;'+mutation+as(user)+sql+'ROLLBACK;');
 assert.notEqual(result.status,0,'Unexpected successful call');assert.match(result.stderr,new RegExp('ERROR:  '+code+'\\b'),result.stderr);assert.equal(rows(),before);
};
const profile=`SELECT public.dobby_v7_update_profile('{"firstName":"FICTIONAL"}')->>'phase';`;
const creation=`SELECT public.dobby_v7_create_household('FICTIONAL HOME',${q(id(950))})->>'replayed';`;
function onlyGateDelta(){
 const before=JSON.parse(privileges),after=JSON.parse(privilegeSnapshot());
 const ns=Number(run("SELECT 'dobby_access_v7_gate'::regnamespace::oid;"));
 const fn=Number(run("SELECT 'dobby_access_v7_gate.check_access()'::regprocedure::oid;"));
 const pg=Number(run("SELECT 'postgres'::regrole::oid;")),owner=Number(run("SELECT 'dobby_access_writer'::regrole::oid;"));
 const normalize=rows=>rows.map(row=>[Number(row[0]),Number(row[1]),row[2],row[3]]);
 assert.deepEqual(normalize(after.schema.filter(row=>Number(row[0])===ns)),[[ns,pg,'USAGE',false]]);
 assert.deepEqual(normalize(after.function.filter(row=>Number(row[0])===fn)),[[fn,owner,'EXECUTE',false]]);
 after.schema=after.schema.filter(row=>Number(row[0])!==ns);after.function=after.function.filter(row=>Number(row[0])!==fn);
 assert.deepEqual(after,before,'Only new schema USAGE and one function EXECUTE may differ');
}
before(()=>{const info=catalog();run('REVOKE dobby_v7_writer FROM postgres; CREATE ROLE v7_indirect_canary NOLOGIN; GRANT dobby_v7_writer TO v7_indirect_canary WITH INHERIT TRUE,SET FALSE;');functions=originals();privileges=privilegeSnapshot();initialFunctionOids=run('SELECT string_agg(oid::text,\',\') FROM pg_proc;');console.log('LOT5B_V7_DIRECT_RUNTIME '+info.version);});
after(()=>{try{rest?.close();}finally{stop();}});
test('missing Missions definitions or standalone fragment refuse atomically before installation',()=>{
 for(const source of [candidate(),readFileSync(new URL('../../../supabase/compatibility/lot5b/v7-preserved.guards.sql',import.meta.url),'utf8')]){
  const refused=raw('SET ROLE postgres;'+source);assert.notEqual(refused.status,0);assert.match(refused.stderr,/Missing or unapproved private Missions|Use the complete V7 preservation/);
  const continued=raw('\\set ON_ERROR_STOP 0\nSET ROLE postgres;'+source);
  assert.match(continued.stderr,/Missing or unapproved private Missions|Use the complete V7 preservation/);
  assert.equal(run("SELECT to_regnamespace('dobby_access_legacy') IS NULL;"),'t');
  assert.equal(originals(),functions);assert.equal(privilegeSnapshot(),privileges);
 }
});
test('owner-only creator defaults permit an atomic installation',()=>{
 const result=raw(`BEGIN; ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC; SET ROLE postgres; ${stripOuter(partial())} ROLLBACK;`);
 assert.equal(result.status,0,result.stderr);assert.equal(originals(),functions);assert.equal(privilegeSnapshot(),privileges);
});
test('a temporarily opened administration writer must not inherit V7',()=>{
 const result=raw(`BEGIN; GRANT dobby_v7_writer TO dobby_access_writer WITH INHERIT TRUE,SET TRUE; SET ROLE postgres; ${stripOuter(partial())} ROLLBACK;`);
 assert.notEqual(result.status,0,'Temporary access-writer opening unexpectedly conferred V7 authority');assert.match(result.stderr,/V7.*isolation|V7 role/);
 assert.equal(originals(),functions);assert.equal(privilegeSnapshot(),privileges);
});
test('direct guard installs with no V7 membership and exactly the two authorized new grants',()=>{
 const result=raw('SET ROLE postgres;'+partial());
 assert.equal(result.status,0,result.stderr);
 assert.equal(originals(),functions);
 onlyGateDelta();
 assert.equal(run(`SELECT pg_has_role('postgres','dobby_v7_writer','MEMBER'),pg_has_role('postgres','dobby_v7_writer','USAGE'),pg_has_role('postgres','dobby_v7_writer','SET');`),'f|f|f');
 run(prepare()+approve+'COMMIT;');
 const result2=run('BEGIN;'+as(2)+`SELECT public.dobby_v7_update_profile('{"firstName":"FICTIONAL"}',7)->>'memberId'; ROLLBACK;`);
 assert.equal(result2,'TEST_PARENT_B');
});
test('initial pending profile, household, quota and replay preserve native identities and idempotence',()=>{
 const before=rows();
 const out=run('BEGIN;'+as(6)+profile+creation+creation+`RESET ROLE;
 SELECT can_create_household FROM dobby_access_private.authorizations WHERE user_id=${q(id(6))};
 SELECT count(*) FROM dobby_v7_private.account_links WHERE user_id=${q(id(6))};
 SELECT count(*) FROM public.dobby_v2_households; ROLLBACK;`);
 assert.equal(out,'household\nfalse\ntrue\nf\n1\n3');assert.equal(rows(),before);
 const reused=raw('BEGIN;'+as(6)+profile+creation+`SELECT public.dobby_v7_create_household('DIFFERENT FICTIONAL REQUEST',${q(id(950))}); ROLLBACK;`);
 assert.notEqual(reused.status,0);assert.match(reused.stderr,/ERROR:  22023\b/);assert.equal(rows(),before);
});
test('unapproved and suspended accounts cannot use either old RPC arity with the old session claims',()=>{
 for(const call of [profile,`SELECT public.dobby_v7_update_profile('{"firstName":"FICTIONAL"}',NULL);`,creation]) {
  reject(call,5);
  reject(call,2,`UPDATE dobby_access_private.authorizations SET status='suspended' WHERE user_id=${q(id(2))};`);
 }
});
test('live-session existence and reactivation cutoff override the unchanged old JWT claims',()=>{
 for(const mutation of [
  `DELETE FROM auth.sessions WHERE id=${q(id(1002))};`,
  `UPDATE dobby_access_private.authorizations SET sessions_valid_after=clock_timestamp() WHERE user_id=${q(id(2))};`
 ]) reject(`SELECT public.dobby_v7_update_profile('{"firstName":"FICTIONAL"}',7);`,2,mutation);
});
test('no household can be created without the explicit initial quota',()=>{
 const before=rows();const result=raw('BEGIN;'+`UPDATE dobby_access_private.authorizations SET can_create_household=false WHERE user_id=${q(id(6))};`+as(6)+profile+creation+'ROLLBACK;');
 assert.notEqual(result.status,0);assert.match(result.stderr,/ERROR:  42501\b/);assert.equal(rows(),before);
});
test('native profile CAS, parent/child and household separation remain enforced',()=>{
 reject(`SELECT public.dobby_v7_update_profile('{"firstName":"FICTIONAL"}',6);`,2,'','40001');
 reject(`SELECT public.dobby_v7_update_profile('{"firstName":"FICTIONAL"}',9);`,4);
 assert.equal(run('BEGIN;'+as(2)+`WITH changed AS (UPDATE public.dobby_v2_modules SET payload='{}' WHERE household_id=${q(id(102))} RETURNING 1) SELECT count(*) FROM changed; ROLLBACK;`),'0');
});
test('direct restrictive policies and role-conditioned triggers target only V7',()=>{
 assert.equal(run(`SELECT count(*),bool_and(NOT polpermissive AND polroles=ARRAY['dobby_v7_writer'::regrole::oid]) FROM pg_policy WHERE polname='dobby_access_v7_preserved';`),'6|t');
 assert.equal(run(`SELECT count(*) FROM pg_trigger WHERE tgname='dobby_access_00_v7_guard';`),'6');
 assert.equal(run(`SELECT has_function_privilege('dobby_v7_writer','dobby_access_private.guard_v7_preserved()','EXECUTE'),has_schema_privilege('dobby_v7_writer','dobby_access_private','USAGE');`),'f|f');
 assert.equal(originals(),functions);onlyGateDelta();
});
test('unexpected global and per-schema creator defaults are refused before any write',()=>{
 const changes=[
  'ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS TO dobby_v7_writer;',
  'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;',
  'ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT USAGE ON SCHEMAS TO anon;',
  'ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT SELECT ON TABLES TO service_role;',
  'ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS TO anon WITH GRANT OPTION;'
 ];
 for(const mutation of changes){
  const before=rows();const result=raw(`BEGIN; ${mutation} SET ROLE postgres; ${stripOuter(candidate())} ROLLBACK;`);
  assert.notEqual(result.status,0);assert.match(result.stderr,/Unexpected creator default ACL/);assert.equal(rows(),before);onlyGateDelta();
 }
});
test('anon authenticated and service_role gain no access to new functions or schemas',()=>{
 for(const role of ['anon','authenticated','service_role']){
  assert.equal(run(`SELECT count(*) FROM pg_proc WHERE oid NOT IN(${initialFunctionOids}) AND has_function_privilege('${role}',oid,'EXECUTE');`),'0');
  assert.equal(run(`SELECT has_schema_privilege('${role}','dobby_access_v7_gate','USAGE,CREATE'),has_schema_privilege('${role}','dobby_access_legacy','USAGE,CREATE');`),'f|f');
  const denied=raw(`BEGIN; SET LOCAL ROLE ${role}; SELECT dobby_access_v7_gate.check_access(); ROLLBACK;`);
  assert.notEqual(denied.status,0);assert.match(denied.stderr,/ERROR:  42501\b/);
 }
 assert.equal(run(`SELECT has_schema_privilege('dobby_v7_writer','dobby_access_v7_gate','CREATE,USAGE WITH GRANT OPTION'),has_function_privilege('dobby_v7_writer','dobby_access_v7_gate.check_access()','EXECUTE WITH GRANT OPTION'),has_column_privilege('dobby_v7_writer','auth.sessions','id','SELECT');`),'f|f|f');
 const adopted=raw('SET ROLE dobby_v7_writer;','dobby_fixture_client');assert.notEqual(adopted.status,0);assert.match(adopted.stderr,/ERROR:  42501\b/);
 onlyGateDelta();
});
test('the one private guard has a closed search_path and a non-login non-bypass owner',()=>{
 assert.equal(run(`SELECT p.prosecdef,p.provolatile,p.pronargs,p.prorettype='boolean'::regtype,p.proconfig=ARRAY['search_path=""']::text[],r.rolname,r.rolcanlogin,r.rolsuper,r.rolbypassrls,r.rolcreaterole FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner WHERE p.oid='dobby_access_v7_gate.check_access()'::regprocedure;`),'t|v|0|t|t|dobby_access_writer|f|f|f|f');
 assert.equal(run("SELECT count(*) FROM pg_proc WHERE pronamespace='dobby_access_v7_gate'::regnamespace;"),'1');
 assert.equal(run('BEGIN;'+as(2)+`SET LOCAL ROLE dobby_v7_writer; SELECT dobby_access_v7_gate.check_access(); ROLLBACK;`),'t');
});
test('forged active metadata never overrides the registry suspension',()=>{
 const before=rows();
 const result=raw(`BEGIN; UPDATE dobby_access_private.authorizations SET status='suspended' WHERE user_id=${q(id(2))};
 ${as(2,1002,{user_metadata:{status:'active'},app_metadata:{status:'active'}})} SELECT public.dobby_v7_update_profile('{"firstName":"FICTIONAL"}',7); ROLLBACK;`);
 assert.notEqual(result.status,0);assert.match(result.stderr,/ERROR:  42501\b/);assert.equal(rows(),before);
});
test('replay holds authorization SHARE until completion and rejects a subsequent suspension',async()=>{
 const operation=id(951);run(`INSERT INTO dobby_v7_private.operations(actor_id,operation_id,kind,request_digest,result) VALUES(${q(id(2))},${q(operation)},'create_household',sha256(convert_to('{"name": "FICTIONAL REPLAY"}'::jsonb::text,'UTF8')),jsonb_build_object('householdId',${q(id(101))}));`);
 const call=`SELECT public.dobby_v7_create_household('FICTIONAL REPLAY',${q(operation)})->>'replayed';`;
 const reader=interactive();
 try {
  reader.send('BEGIN;'+as(2)+call+'\n\\echo REPLAY_LOCK_HELD');await reader.waitFor('REPLAY_LOCK_HELD');
  const contender=raw(`BEGIN; SET LOCAL lock_timeout='250ms'; UPDATE dobby_access_private.authorizations SET status='suspended' WHERE user_id=${q(id(2))}; ROLLBACK;`);
  assert.notEqual(contender.status,0);assert.match(contender.stderr,/ERROR:  55P03\b/);
 } finally {const ended=await reader.finish();assert.equal(ended.code,0,ended.errors);}
 reject(call,2,`UPDATE dobby_access_private.authorizations SET status='suspended' WHERE user_id=${q(id(2))};`);
 run(`DELETE FROM dobby_v7_private.operations WHERE operation_id=${q(operation)};`);
});
test('quota upgrade contention is a retryable 40001 with no data or quota changes',async()=>{
 const reader=interactive();const before=rows();
 try {
  reader.send(`BEGIN; SELECT 1 FROM dobby_access_private.authorizations WHERE user_id=${q(id(6))} FOR SHARE;\n\\echo QUOTA_READER_HELD`);await reader.waitFor('QUOTA_READER_HELD');
  const contender=raw('BEGIN; SET LOCAL statement_timeout=\'2s\';'+as(6)+profile+creation+'ROLLBACK;');
  assert.notEqual(contender.status,0);assert.match(contender.stderr,/ERROR:  40001\b/);assert.equal(rows(),before);
 } finally {const ended=await reader.finish();assert.equal(ended.code,0,ended.errors);}
});
test('preservation preflight keeps every other writer ADMIN check',()=>{
 const roles=readFileSync(new URL('../../../supabase/compatibility/lot5b/v7-preserved.roles.preflight.sql',import.meta.url),'utf8');
 const plan=`CREATE TEMP TABLE access_2a_manifest(signature text,kind text); ALTER TABLE access_2a_manifest OWNER TO postgres; INSERT INTO access_2a_manifest VALUES('public.dobby_v7_update_profile(jsonb,bigint)','v7-preserved-profile'),('public.dobby_v7_create_household(text,uuid)','v7-preserved-create');`;
 for(const writer of ['dobby_socle_writer','dobby_missions_v2_writer','dobby_access_writer']){
  // Fictional transaction only: discard dependent temporary memberships too.
  const result=raw(`BEGIN; ${plan} REVOKE ADMIN OPTION FOR ${writer} FROM postgres CASCADE; SET ROLE postgres; ${roles} ROLLBACK;`);
  assert.notEqual(result.status,0);assert.match(result.stderr,/closed ADMIN/);
 }
});
test('preservation preflight refuses a mixed SET then INHERIT path to untouched V7',()=>{
 const roles=readFileSync(new URL('../../../supabase/compatibility/lot5b/v7-preserved.roles.preflight.sql',import.meta.url),'utf8');
 const result=raw(`BEGIN;
  CREATE TEMP TABLE access_2a_manifest(signature text,kind text); ALTER TABLE access_2a_manifest OWNER TO postgres; INSERT INTO access_2a_manifest VALUES('public.dobby_v7_update_profile(jsonb,bigint)','v7-preserved-profile'),('public.dobby_v7_create_household(text,uuid)','v7-preserved-create');
  CREATE ROLE v7_mixed_canary NOLOGIN; GRANT dobby_v7_writer TO v7_mixed_canary WITH INHERIT TRUE,SET FALSE;
  GRANT v7_mixed_canary TO postgres WITH INHERIT FALSE,SET TRUE;
  SET ROLE postgres; ${roles} ROLLBACK;`);
 assert.notEqual(result.status,0,'Mixed V7 authority was accepted');assert.match(result.stderr,/V7.*authority|V7 role/);
});
test('read-only invitation previews preserve valid, invalid and STABLE contracts',()=>{
 // Entirely fictional invitation fixtures; no hosted child gate or account.
 run(`UPDATE dobby_socle_private.install_state SET family_api_enabled=true WHERE singleton;
 UPDATE public.dobby_v2_modules SET payload=jsonb_set(payload,'{familyMembers}',payload->'familyMembers'||'[{"id":"TEST_PENDING_CHILD","memberCategory":"child"}]'::jsonb) WHERE household_id=${q(id(101))} AND module='family';
 INSERT INTO dobby_v7_private.invitations(id,household_id,created_by,token_hash,expires_at,invitation_kind,target_member_id) VALUES
 (${q(id(960))},${q(id(101))},${q(id(1))},sha256(convert_to(repeat('a',64),'UTF8')),now()+interval '1 day','member',NULL),
 (${q(id(961))},${q(id(101))},${q(id(1))},sha256(convert_to(repeat('b',64),'UTF8')),now()+interval '1 day','child-account','TEST_PENDING_CHILD');`);
 for(const [name,token] of [['dobby_v7_preview_invitation','a'],['dobby_v7_preview_child_invitation','b']]){
  for(const [value,status]of[[token.repeat(64),'valid'],['bad','invalid']]){
   const result=raw('BEGIN READ ONLY;'+as(2)+`SELECT public.${name}(${q(value)})->>'status'; ROLLBACK;`);
   assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),status);
  }
 }
 assert.equal(run(`SELECT bool_and(provolatile='s') FROM pg_proc WHERE oid IN ('public.dobby_v7_context()'::regprocedure,'public.dobby_v7_preview_invitation(text)'::regprocedure,'public.dobby_v7_preview_child_invitation(text)'::regprocedure);`),'t');
 assert.equal(run('BEGIN READ ONLY;'+as(2)+`SELECT public.dobby_v7_context()->>'phase'; ROLLBACK;`),'active');
});
function httpReadContracts(){
 let requests=0;
 for(const[name,token]of[['dobby_v7_preview_invitation','a'],['dobby_v7_preview_child_invitation','b']]){
  for(const[value,status]of[[token.repeat(64),'valid'],['bad','invalid']]){
   for(const method of ['GET','POST']){
    const path='/rpc/'+name+(method==='GET'?'?p_token='+encodeURIComponent(value):'');
    const result=rest.request(method,path,method==='POST'?{p_token:value}:null);
    assert.equal(result.status,200,JSON.stringify(result.json));assert.equal(result.json.status,status);
    if(status==='valid')assert.equal(result.json.household.id,id(101));else assert.deepEqual(result.json,{status:'invalid'});
    requests++;
   }
  }
 }
 for(const method of ['GET','POST']){const result=rest.request(method,'/rpc/dobby_v7_context',method==='POST'?{}:null);assert.equal(result.status,200,JSON.stringify(result.json));assert.equal(result.json.phase,'active');requests++;}
 return requests;
}
test('real local PostgREST GET and POST preserve all three STABLE read contracts',t=>{
 if(!restAvailable()){t.skip('No cached isolated PostgREST image; SQL READ ONLY tests still run');return;}
 // Fictional gateway client only; no role or account in a hosted project.
 run('GRANT anon TO dobby_fixture_client WITH INHERIT FALSE,SET TRUE;');
 rest=startLocalRest('dobby-access-lot1-'+process.pid);
 assert.equal(httpReadContracts(),10);
 assert.equal(rest.request('POST','/rpc/check_access',{}).status,404);
 const revision=Number(run(`SELECT revision FROM public.dobby_v2_modules WHERE household_id=${q(id(101))} AND module='family';`));
 const changed=rest.request('POST','/rpc/dobby_v7_update_profile',{p_profile:{firstName:'HTTP_FICTIONAL'},p_expected_revision:revision});
 assert.equal(changed.status,200,JSON.stringify(changed.json));assert.equal(changed.json.memberId,'TEST_PARENT_B');assert.equal(changed.json.familyRevision,revision+1);
 assert.equal(run(`SELECT updated_by=${q(id(2))} FROM public.dobby_v2_modules WHERE household_id=${q(id(101))} AND module='family';`),'t');
 console.log('LOT5B_V7_HTTP_BEFORE_ROLLBACK GET_POST_STABLE 10/10; private guard unexposed');
 console.log('LOT5B_V7_HTTP_AUTHORIZED_PROFILE 1/1');
});
test('real PostgREST retains denial after suspension or session invalidation',t=>{
 if(!rest){t.skip('Isolated local PostgREST not available');return;}
 for(const mutation of [
  `UPDATE dobby_access_private.authorizations SET status='suspended' WHERE user_id=${q(id(2))};`,
  `UPDATE auth.sessions SET not_after=clock_timestamp()-interval '1 minute' WHERE id=${q(id(1002))};`
 ]){
  try{
   run(mutation);
   const denied=rest.request('POST','/rpc/dobby_v7_update_profile',{p_profile:{firstName:'FICTIONAL'},p_expected_revision:8});
   assert.equal(denied.status,403,JSON.stringify(denied.json));assert.equal(denied.json.code,'42501');
   const preview=rest.request('GET','/rpc/dobby_v7_preview_invitation?p_token='+('a'.repeat(64)));
   assert.equal(preview.status,200);assert.deepEqual(preview.json,{status:'invalid'});
  }finally{run(`UPDATE dobby_access_private.authorizations SET status='active' WHERE user_id=${q(id(2))}; UPDATE auth.sessions SET not_after=NULL WHERE id=${q(id(1002))};`);}
 }
 console.log('LOT5B_V7_HTTP_SESSION_DENIAL 4/4');
});
test('rollback refuses role coupling disabled RLS or untrusted journal metadata before any change',()=>{
 const rollback=readFileSync(new URL('../../../supabase/compatibility/lot5b/v7-preserved.rollback.sql',import.meta.url),'utf8');
 const cases=[
  ['indirect-role-coupling','GRANT v7_indirect_canary TO dobby_socle_writer WITH INHERIT TRUE,SET FALSE;',''],
  ['business-rls-disabled','ALTER TABLE dobby_v7_private.pending_profiles DISABLE ROW LEVEL SECURITY;',as(6)+profile],
  ['journal-rls-disabled','ALTER TABLE dobby_access_legacy.v7_gate_state DISABLE ROW LEVEL SECURITY;',''],
  ['journal-acl-opened','GRANT SELECT ON dobby_access_legacy.v7_gate_state TO service_role;','']
 ];
 const before=rows(),results=[];
 for(const[name,mutation,tail]of cases){
  const result=raw(`BEGIN; ${mutation} SET ROLE postgres; ${stripOuter(rollback)} ${tail} ROLLBACK;`);
  results.push({name,status:result.status,output:result.stdout.trim(),stderr:result.stderr});
  assert.equal(rows(),before);
 }
 console.log('V7_ROLLBACK_DRIFT_RESULTS '+JSON.stringify(results.map(({name,status,output})=>({name,status,output}))));
 for(const result of results){assert.notEqual(result.status,0,'Rollback accepted '+result.name);assert.match(result.stderr,/V7.*isolation|V7.*relation|V7.*journal/);}
 onlyGateDelta();
});
test('full guard rollback restores previews, removes both grants and retains the V7 write fence',()=>{
 const before=rows();
 const rollback=readFileSync(new URL('../../../supabase/compatibility/lot5b/v7-preserved.rollback.sql',import.meta.url),'utf8');
 const modified=raw(`BEGIN; ALTER POLICY dobby_access_v7_preserved ON public.dobby_v2_households USING(true);
  SET ROLE postgres; ${rollback.replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'')} ROLLBACK;`);
 assert.notEqual(modified.status,0);assert.match(modified.stderr,/Unexpected V7/);assert.equal(rows(),before);
 for(const mutation of [
  'GRANT EXECUTE ON FUNCTION dobby_access_v7_gate.check_access() TO anon;',
  'GRANT EXECUTE ON FUNCTION dobby_access_v7_gate.check_access() TO dobby_v7_writer WITH GRANT OPTION;',
  "CREATE OR REPLACE FUNCTION dobby_access_v7_gate.check_access() RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$ BEGIN RETURN true; END $$;"
 ]){
  const changed=raw(`BEGIN; ${mutation} SET ROLE postgres; ${stripOuter(rollback)} ROLLBACK;`);
  assert.notEqual(changed.status,0);assert.match(changed.stderr,/Unexpected V7/);assert.equal(rows(),before);onlyGateDelta();
 }
 const result=raw('SET ROLE postgres;'+rollback);assert.equal(result.status,0,result.stderr);
 assert.equal(rows(),before);assert.equal(originals(),functions);assert.equal(privilegeSnapshot(),privileges);
 assert.equal(run(`SELECT count(*) FROM pg_policy WHERE polname='dobby_access_v7_preserved' AND pg_get_expr(polqual,polrelid)='false' AND pg_get_expr(polwithcheck,polrelid)='false';`),'6');
 reject(profile,6);reject(`SELECT public.dobby_v7_update_profile('{"firstName":"FICTIONAL"}',7);`);
 // Native authenticated membership policy exposes the caller's own row only.
 assert.equal(run('BEGIN;'+as(2)+`SELECT count(*) FROM public.dobby_v2_memberships WHERE household_id=${q(id(101))}; ROLLBACK;`),'1');
 assert.equal(run("SELECT to_regnamespace('dobby_access_v7_gate') IS NULL,to_regprocedure('dobby_access_private.guard_v7_preserved()') IS NULL,to_regprocedure('dobby_access_private.consume_v7_preserved_creation()') IS NULL;"),'t|t|t');
 for(const[name,token]of[['dobby_v7_preview_invitation','a'],['dobby_v7_preview_child_invitation','b']]){
  for(const[value,status]of[[token.repeat(64),'valid'],['bad','invalid']]){
   const read=raw('BEGIN READ ONLY;'+as(2)+`SELECT public.${name}(${q(value)})->>'status'; SELECT public.dobby_v7_context()->>'phase'; ROLLBACK;`);
   assert.equal(read.status,0,read.stderr);assert.equal(read.stdout.trim(),status+'\nactive');
  }
 }
 if(rest){assert.equal(httpReadContracts(),10);const denied=rest.request('POST','/rpc/dobby_v7_update_profile',{p_profile:{firstName:'FICTIONAL'},p_expected_revision:8});assert.equal(denied.status,403);assert.equal(denied.json.code,'42501');console.log('LOT5B_V7_HTTP_AFTER_ROLLBACK GET_POST_STABLE 10/10; writes remain denied');}
});

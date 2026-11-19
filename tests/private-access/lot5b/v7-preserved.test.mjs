import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { catalog } from '../lot2a/catalog.mjs';
import { run, raw, stop, as, id, q, prepare, interactive } from '../local-db.mjs';
import { buildArtifacts } from '../../../supabase/compatibility/lot5b/build-variants.mjs';
import { blockingGate } from '../../../supabase/compatibility/lot5b/build-v7-preserved.mjs';

const variantPath=new URL('../../../supabase/compatibility/lot5b/v7-preserved.candidate.sql',import.meta.url);
const candidate=()=>existsSync(variantPath)?readFileSync(variantPath,'utf8'):buildArtifacts()['lot2a-compatible.candidate.sql'];
// Never used by an installer: two exact guards removed IN MEMORY for diagnosis.
const partial=()=>candidate().replace(blockingGate,'-- TEST ONLY: investigate the blocked prototype.').replace(buildArtifacts()['missions.preflight.sql'],'-- TEST ONLY: missing Missions gate omitted; no private stub; V7 path dependencies are public.');
let functions,privileges;
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
before(()=>{const info=catalog();run('REVOKE dobby_v7_writer FROM postgres;');functions=originals();privileges=privilegeSnapshot();console.log('LOT5B_V7_PRESERVED_RUNTIME '+info.version);});
after(stop);
test('shipped experiment aborts before DDL, including a client without ON_ERROR_STOP',()=>{
 for(const source of [candidate(),readFileSync(new URL('../../../supabase/compatibility/lot5b/v7-preserved.guards.sql',import.meta.url),'utf8')]){
  const refused=raw('SET ROLE postgres;'+source);assert.notEqual(refused.status,0);assert.match(refused.stderr,/ERROR:  0A000.*BLOCKED/);
  const continued=raw('\\set ON_ERROR_STOP 0\nSET ROLE postgres;'+source);
  assert.match(continued.stderr,/ERROR:  0A000.*BLOCKED/);
  assert.equal(run("SELECT to_regnamespace('dobby_access_legacy') IS NULL;"),'t');
  assert.equal(originals(),functions);assert.equal(privilegeSnapshot(),privileges);
 }
});
test('explicit in-memory write prototype needs no V7 membership and retains all V7 functions and privileges in the clean fixture',()=>{
 const result=raw('SET ROLE postgres;'+partial());
 assert.equal(result.status,0,result.stderr);
 assert.equal(originals(),functions);
 assert.equal(privilegeSnapshot(),privileges);
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
test('V7 quarantine policies and guard attachments target only the preserved writer',()=>{
 assert.equal(run(`SELECT count(*),bool_and(NOT polpermissive AND polroles=ARRAY['dobby_v7_writer'::regrole::oid]) FROM pg_policy WHERE polname='dobby_access_v7_preserved';`),'6|t');
 assert.equal(run(`SELECT count(*) FROM pg_trigger WHERE tgname='dobby_access_00_v7_guard';`),'6');
 assert.equal(run(`SELECT has_function_privilege('dobby_v7_writer','dobby_access_private.guard_v7_preserved()','EXECUTE'),has_schema_privilege('dobby_v7_writer','dobby_access_private','USAGE');`),'f|f');
 assert.equal(originals(),functions);assert.equal(privilegeSnapshot(),privileges);
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
test('BLOCKED: both unchanged stable invitation previews fail 25006 through the locking context',()=>{
 for(const call of ["public.dobby_v7_preview_invitation('bad')","public.dobby_v7_preview_child_invitation('bad')"]){
  const result=raw('BEGIN READ ONLY;'+as(2)+`SELECT ${call}->>'status'; ROLLBACK;`);
  assert.notEqual(result.status,0);assert.match(result.stderr,/ERROR:  25006\b/);
  assert.match(result.stderr,/public.dobby_v7_context/);assert.match(result.stderr,/assert_active_nowait/);
 }
});
test('conservative rollback quarantines V7 without losing rows or broadening any V7 privilege',()=>{
 const before=rows();
 const rollback=readFileSync(new URL('../../../supabase/compatibility/lot5b/v7-preserved.rollback.sql',import.meta.url),'utf8');
 const modified=raw(`BEGIN; ALTER POLICY dobby_access_v7_preserved ON public.dobby_v2_households USING(true);
  SET ROLE postgres; ${rollback.replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'')} ROLLBACK;`);
 assert.notEqual(modified.status,0);assert.match(modified.stderr,/Unexpected V7 policy/);assert.equal(rows(),before);
 const result=raw('SET ROLE postgres;'+rollback);assert.equal(result.status,0,result.stderr);
 assert.equal(rows(),before);assert.equal(originals(),functions);assert.equal(privilegeSnapshot(),privileges);
 assert.equal(run(`SELECT count(*) FROM pg_policy WHERE polname='dobby_access_v7_preserved' AND pg_get_expr(polqual,polrelid)='false' AND pg_get_expr(polwithcheck,polrelid)='false';`),'6');
 reject(profile,6);reject(`SELECT public.dobby_v7_update_profile('{"firstName":"FICTIONAL"}',7);`);
 // Native authenticated membership policy exposes the caller's own row only.
 assert.equal(run('BEGIN;'+as(2)+`SELECT count(*) FROM public.dobby_v2_memberships WHERE household_id=${q(id(101))}; ROLLBACK;`),'1');
 // Quarantine does not repair the shared read-only regression: no full rollback claimed.
 const read=raw('BEGIN READ ONLY;'+as(2)+`SELECT public.dobby_v7_preview_invitation('bad'); ROLLBACK;`);
 assert.notEqual(read.status,0);assert.match(read.stderr,/ERROR:  25006\b/);
});

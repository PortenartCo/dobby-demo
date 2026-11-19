import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {catalog} from '../lot2a/catalog.mjs';
import {start,stop,run,raw,as,id,q,json,manifest} from '../local-db.mjs';
import {buildArtifacts} from '../../../supabase/compatibility/lot5b/build-variants.mjs';
import {stopGate,reviewAssembly} from '../../../supabase/integration/lot5c/build.mjs';
import {prepareStorage} from './storage-fixture.mjs';

const dir=new URL('../../../supabase/integration/lot5c/',import.meta.url);
const file=name=>readFileSync(new URL(name,dir),'utf8');
const body=source=>source.replace(/^BEGIN(?: READ ONLY)?;$/m,'').replace(/^COMMIT;$/m,'');
// No delivered option skips Missions. This named partial fixture omits only
// the exact metadata block because none of the 12 private bodies is available.
const partial=source=>source.replaceAll(buildArtifacts()['missions.preflight.sql'],'-- PARTIAL LOCAL TEST: Missions metadata omitted in memory; no stub.');
const profile=`SELECT public.dobby_v7_update_profile('{"firstName":"ASSEMBLY"}',7)->>'memberId';`;
let baselineV7,baselineRows;
const owned=()=>run("SELECT jsonb_agg(jsonb_build_array(oid,md5(pg_get_functiondef(oid)),proowner,proacl::text) ORDER BY oid) FROM pg_proc WHERE proowner='dobby_v7_writer'::regrole;");
const rows=()=>run(`SELECT md5(jsonb_build_array(${['public.dobby_v2_households','public.dobby_v2_memberships','public.dobby_v2_modules','dobby_v7_private.account_links','dobby_v7_private.pending_profiles','dobby_v7_private.operations','auth.users','auth.sessions'].map(t=>`(SELECT jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text) FROM ${t} x)`).join(',')})::text);`);

test('ordered package exists with one closed installation and separate activation',()=>{
 for(const name of ['00-preflight.sql','10-install.sql','20-activate.sql','30-postflight.sql','80-stop-admin.sql','90-close.sql','manifest.json'])assert.ok(existsSync(new URL(name,dir)),name+' missing');
 const m=JSON.parse(file('manifest.json'));
 assert.deepEqual(m.order,['00-preflight.sql','10-install.sql','30-postflight.sql','20-activate.sql','30-postflight.sql']);
 assert.equal(m.adminV7Required,false);
});

before(()=>{
 if(!existsSync(new URL('10-install.sql',dir)))return;
 catalog({startDatabase:()=>start({installFoundation:false})});
 run(`REVOKE dobby_v7_writer FROM postgres; ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY; ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;
 SET ROLE supabase_auth_admin; GRANT SELECT(id,email,email_confirmed_at) ON auth.users TO postgres;
 GRANT SELECT(id,user_id,created_at,not_after) ON auth.sessions TO postgres; RESET ROLE;`);
 baselineV7=owned();baselineRows=rows();
});
after(stop);

function input({approved=true,session=id(1002),open=false}={}){
 const m=JSON.parse(file('manifest.json'));
 return `CREATE TEMP TABLE dobby5c_input(manifest jsonb,operation_id uuid,project_ref text,package_id text,
 maintenance_confirmed boolean,backup_verified boolean,signed_storage_resolved boolean,open_administration boolean,
 probe_user uuid,probe_session uuid,probe_email_sha256 text);
 INSERT INTO dobby5c_input VALUES(${json(manifest)},${q(id(9500))},'pqcdkrwljgvgagzwrcmg',${q(m.packageId)},${approved},${approved},${approved},${open},
 ${q(id(2))},${q(session)},encode(sha256(convert_to('fixture-2@example.invalid','UTF8')),'hex'));`;
}
test('full preflight refuses missing private Missions without persistent DDL',()=>{
 for(const name of ['00-preflight.sql']){
  const r=raw('SET ROLE postgres;'+file(name));
  assert.notEqual(r.status,0);assert.match(r.stderr,/Missing or unapproved private Missions/);
  assert.equal(run("SELECT to_regnamespace('dobby_access_private') IS NULL;"),'t');
  assert.equal(owned(),baselineV7);assert.equal(rows(),baselineRows);
 }
});
test('every delivered writing entrypoint unconditionally aborts even if psql continues',()=>{
 for(const name of ['10-install.sql','20-activate.sql','80-stop-admin.sql','90-close.sql']){
  const r=raw('\\set ON_ERROR_STOP 0\nSET ROLE postgres;'+file(name));
  assert.match(r.stderr,/LOT5C NO-GO/);
  const tail=file(name).replace(/^--.*$/gm,'').replace(stopGate,'');
  assert.doesNotMatch(tail,/\b(CREATE|ALTER|GRANT|REVOKE|SELECT|INSERT|UPDATE|DELETE|DROP|CALL|COPY|NOTIFY|TRUNCATE)\b/i);
  assert.equal(run("SELECT to_regnamespace('dobby_access_private') IS NULL;"),'t');
  assert.equal(owned(),baselineV7);assert.equal(rows(),baselineRows);
 }
});
test('partial local assembly refuses missing human prerequisites before creating the foundation',()=>{
 const r=raw('SET ROLE postgres;'+input({approved:false})+partial(reviewAssembly()['10-install.sql']));
 assert.notEqual(r.status,0);assert.match(r.stderr,/maintenance|backup|signed|approved/i);
 assert.equal(run("SELECT to_regnamespace('dobby_access_private') IS NULL;"),'t');
});
test('partial assembly installs atomically with Auth bridge Storage and administration closed',()=>{
 prepareStorage();
 const r=raw('SET ROLE postgres;'+input()+partial(reviewAssembly()['10-install.sql']));
 assert.equal(r.status,0,r.stderr);
 assert.equal(owned(),baselineV7);assert.equal(rows(),baselineRows);
 assert.equal(run('SELECT session_guard_ready,identity_guard_ready,administration_enabled,child_delivery_enabled FROM dobby_access_private.settings;'),'f|f|f|f');
 assert.equal(run("SELECT pg_has_role('postgres','dobby_v7_writer','MEMBER');"),'f');
 const denied=raw('BEGIN;'+as(2)+profile+'ROLLBACK;');assert.notEqual(denied.status,0);assert.match(denied.stderr,/42501/);
 run('SET ROLE postgres;'+file('30-postflight.sql'));
});
test('activation refuses absent or invisible session and identity without partially opening flags',()=>{
 for(const mutation of [
  `DELETE FROM auth.sessions WHERE id=${q(id(1002))};`,
  'ALTER ROLE postgres NOBYPASSRLS;',
  'SET ROLE supabase_auth_admin; REVOKE SELECT(email) ON auth.users FROM postgres; RESET ROLE;'
 ]){
  const r=raw('BEGIN;'+mutation+'SET ROLE postgres;'+input({open:true})+body(reviewAssembly()['20-activate.sql'])+'ROLLBACK;');
  assert.notEqual(r.status,0);assert.match(r.stderr,/Controlled.*bridge probe required/);
  assert.equal(run('SELECT session_guard_ready,identity_guard_ready,administration_enabled FROM dobby_access_private.settings;'),'f|f|f');
 }
});
test('controlled positive activation uses bridged readers and preserves exactly two V7 rights',()=>{
 run('SET ROLE postgres;'+input({open:true})+reviewAssembly()['20-activate.sql']);
 assert.equal(run('SELECT session_guard_ready,identity_guard_ready,administration_enabled,child_delivery_enabled FROM dobby_access_private.settings;'),'t|t|t|f');
 assert.equal(owned(),baselineV7);
 for(const role of ['dobby_access_session_reader','dobby_access_identity_reader','dobby_v7_writer']){
  assert.equal(run(`SELECT has_schema_privilege(${q(role)},'auth','USAGE,CREATE'),has_any_column_privilege(${q(role)},'auth.sessions','SELECT'),has_any_column_privilege(${q(role)},'auth.users','SELECT');`),'f|f|f');
 }
 assert.equal(run(`SELECT has_schema_privilege('dobby_v7_writer','dobby_access_v7_gate','USAGE'),has_function_privilege('dobby_v7_writer','dobby_access_v7_gate.check_access()','EXECUTE'),has_function_privilege('dobby_v7_writer','dobby_access_v7_gate.check_access()','EXECUTE WITH GRANT OPTION');`),'t|t|f');
 assert.equal(run('BEGIN;'+as(2)+profile+'ROLLBACK;'),'TEST_PARENT_B');
 assert.equal(run('BEGIN READ ONLY;'+as(2)+"SELECT public.dobby_v7_preview_invitation('invalid')->>'status'; SELECT public.dobby_v7_preview_child_invitation('invalid')->>'status'; SELECT public.dobby_v7_context()->>'phase'; ROLLBACK;"),'invalid\ninvalid\nactive');
});
test('distributed quarantine contains no mutable continuation after savepoint error recovery',()=>{
 const flags='SELECT session_guard_ready,identity_guard_ready,administration_enabled,child_delivery_enabled FROM dobby_access_private.settings;';
 const before=run(flags);
 const recovered=file('90-close.sql').replace(/^BEGIN;$/m,'BEGIN; SAVEPOINT review_resume;')
  .replace(stopGate,stopGate+'\nROLLBACK TO SAVEPOINT review_resume;')
  .replace(/^COMMIT;$/m,flags+'\nROLLBACK;');
 const result=raw('\\set ON_ERROR_STOP 0\nSET ROLE postgres;'+recovered);
 assert.match(result.stderr,/LOT5C NO-GO/);
 assert.equal(result.stdout.trim(),before,'Recovering the error must not reach a quarantine mutation');
 assert.equal(run(flags),before);
});
test('assembled valid adult and child previews preserve READ ONLY contracts',()=>{
 const seed=`UPDATE dobby_access_private.settings SET child_delivery_enabled=true;
 UPDATE dobby_socle_private.install_state SET family_api_enabled=true,family_client_verified=true,storage_client_verified=true,child_link_client_verified=true;
 UPDATE public.dobby_v2_modules SET payload=jsonb_set(payload,'{familyMembers}',(payload->'familyMembers')||'[{"id":"TEST_PENDING_CHILD","memberCategory":"child"}]'::jsonb) WHERE household_id=${q(id(101))} AND module='family';
 ${[['family-parent','member',null,9701,'a'],['family-child','child-account','TEST_PENDING_CHILD',9702,'b']].map(([purpose,kind,member,n,token])=>`
 INSERT INTO dobby_access_private.admissions(id,email,purpose,household_id,member_id,requested_by,target_user_id,approved_by,state,expires_at,approved_at,invitation_id)
 VALUES(${q(id(n))},'fixture-2@example.invalid',${q(purpose)},${q(id(101))},${member?q(member):'NULL'},${q(id(1))},${q(id(2))},${q(id(1))},'sent',now()+interval '1 hour',now(),${q(id(n))});
 INSERT INTO dobby_v7_private.invitations(id,household_id,created_by,token_hash,expires_at,target_member_id,invitation_kind,admission_id,target_user_id)
 VALUES(${q(id(n))},${q(id(101))},${q(id(1))},sha256(convert_to(${q(token.repeat(64))},'UTF8')),now()+interval '1 hour',${member?q(member):'NULL'},${q(kind)},${q(id(n))},${q(id(2))});`).join('\n')}`;
 const results=[];
 // Entirely fictional committed seed allows separate READ ONLY transactions.
 run('BEGIN;'+seed+'COMMIT;');
 try{
  for(const[name,token]of [['dobby_v7_preview_invitation','a'],['dobby_v7_preview_child_invitation','b']]){
   const positive=raw('BEGIN;'+as(2)+`SELECT public.${name}(${q(token.repeat(64))})->>'status'; ROLLBACK;`);
   assert.equal(positive.status,0,positive.stderr);assert.equal(positive.stdout.trim(),'valid');
   const read=raw('BEGIN READ ONLY;'+as(2)+`SELECT public.${name}(${q(token.repeat(64))})->>'status'; ROLLBACK;`);
   results.push({name,status:read.status,stdout:read.stdout,stderr:read.stderr});
  }
 }finally{run(`DELETE FROM dobby_v7_private.invitations WHERE id IN (${q(id(9701))},${q(id(9702))}); DELETE FROM dobby_access_private.admissions WHERE id IN (${q(id(9701))},${q(id(9702))}); UPDATE dobby_access_private.settings SET child_delivery_enabled=false;`);}
 console.log('LOT5C_VALID_READONLY_RESULTS '+JSON.stringify(results));
 for(const r of results){assert.equal(r.status,0,r.stderr);assert.equal(r.stdout.trim(),'valid');}
});

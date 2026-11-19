import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {catalog} from '../lot2a/catalog.mjs';
import {start,stop,run,raw,as,id,q,json,manifest,interactive} from '../local-db.mjs';
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

const cases=[
 {kind:'member',purpose:'family-parent',user:5,admission:9801,rpc:'dobby_v7_preview_invitation',accept:'dobby_v7_accept_invitation',member:null},
 {kind:'child-account',purpose:'family-child',user:6,admission:9802,rpc:'dobby_v7_preview_child_invitation',accept:'dobby_v7_accept_child_invitation',member:'TEST_PENDING_CHILD'}
];
const tokenSQL=c=>`dobby_socle_private.invitation_token(${q(id(2))},${q(id(c.admission))})`;
const tokenVar=c=>`SELECT ${tokenSQL(c)} AS local_invitation_token \\gset\n`;
const profileValue={firstName:'Fictional',lastName:'Acceptance',avatarId:'portrait-1'};
const acceptSQL=(c,op=9901)=>`SELECT public.dobby_access_accept(${q(id(c.admission))},${c.member?'NULL':json(profileValue)},${q(id(op))});`;
function seedBoundInvitations(){
 run(`INSERT INTO dobby_access_private.authorizations(user_id,status,approved_by) VALUES(${q(id(5))},'active',${q(id(1))}),(${q(id(6))},'active',${q(id(1))});
 UPDATE dobby_access_private.settings SET child_delivery_enabled=true;
 UPDATE dobby_socle_private.install_state SET family_api_enabled=true,family_client_verified=true,storage_client_verified=true,child_link_client_verified=true;
 ${cases.map(c=>`
 INSERT INTO dobby_access_private.admissions(id,email,purpose,household_id,member_id,requested_by,target_user_id,approved_by,state,expires_at,approved_at,invitation_id)
 VALUES(${q(id(c.admission))},${q('fixture-'+c.user+'@example.invalid')},${q(c.purpose)},${q(id(101))},${c.member?q(c.member):'NULL'},${q(id(2))},${q(id(c.user))},${q(id(1))},'sent',now()+interval '1 hour',now(),${q(id(c.admission))});
 INSERT INTO dobby_v7_private.invitations(id,household_id,created_by,token_hash,expires_at,target_member_id,invitation_kind,admission_id,target_user_id)
 VALUES(${q(id(c.admission))},${q(id(101))},${q(id(2))},sha256(convert_to(${tokenSQL(c)},'UTF8')),now()+interval '1 hour',${c.member?q(c.member):'NULL'},${q(c.kind)},${q(id(c.admission))},${q(id(c.user))});`).join('\n')}`);
}
test('bound invitation reads deny invalid expired revoked mismatched or stale authorization without locks',()=>{
 seedBoundInvitations();let checked=0,legacyDenied=0,admissionDenied=0;
 for(const c of cases){
  const rows=[
   ['valid','','','valid'],
   ['invalid token','','','invalid',false],
   ['wrong recipient','','','invalid',true,2],
   ['expired admission',`UPDATE dobby_access_private.admissions SET expires_at=now()-interval '1 hour' WHERE id=${q(id(c.admission))};`,`UPDATE dobby_access_private.admissions SET expires_at=now()+interval '1 hour' WHERE id=${q(id(c.admission))};`,'invalid'],
   ['expired invitation',`UPDATE dobby_v7_private.invitations SET expires_at=now()-interval '1 hour' WHERE id=${q(id(c.admission))};`,`UPDATE dobby_v7_private.invitations SET expires_at=now()+interval '1 hour' WHERE id=${q(id(c.admission))};`,'expired'],
   ['revoked invitation',`UPDATE dobby_v7_private.invitations SET revoked_at=now() WHERE id=${q(id(c.admission))};`,`UPDATE dobby_v7_private.invitations SET revoked_at=NULL WHERE id=${q(id(c.admission))};`,'invalid'],
   ['revoked admission',`UPDATE dobby_access_private.admissions SET state='revoked' WHERE id=${q(id(c.admission))};`,`UPDATE dobby_access_private.admissions SET state='sent' WHERE id=${q(id(c.admission))};`,'invalid'],
   ['requester suspended',`UPDATE dobby_access_private.authorizations SET status='suspended' WHERE user_id=${q(id(2))};`,`UPDATE dobby_access_private.authorizations SET status='active' WHERE user_id=${q(id(2))};`,'invalid'],
   ['requester generation',`UPDATE dobby_access_private.authorizations SET generation=1 WHERE user_id=${q(id(2))};`,`UPDATE dobby_access_private.authorizations SET generation=0 WHERE user_id=${q(id(2))};`,'invalid'],
   ['recipient generation',`UPDATE dobby_access_private.authorizations SET generation=1 WHERE user_id=${q(id(c.user))};`,`UPDATE dobby_access_private.authorizations SET generation=0 WHERE user_id=${q(id(c.user))};`,'invalid'],
   ['recipient session',`UPDATE auth.sessions SET not_after=now()-interval '1 minute' WHERE id=${q(id(1000+c.user))};`,`UPDATE auth.sessions SET not_after=NULL WHERE id=${q(id(1000+c.user))};`,'invalid'],
   ['identity email',`UPDATE dobby_access_private.admissions SET email='wrong@example.invalid' WHERE id=${q(id(c.admission))};`,`UPDATE dobby_access_private.admissions SET email=${q('fixture-'+c.user+'@example.invalid')} WHERE id=${q(id(c.admission))};`,'invalid']
  ];
  if(c.member)rows.push(['child gates','UPDATE dobby_access_private.settings SET child_delivery_enabled=false;','UPDATE dobby_access_private.settings SET child_delivery_enabled=true;','invalid']);
  const confirmed=run(`SELECT email_confirmed_at::text FROM auth.users WHERE id=${q(id(c.user))};`);
  rows.push(['identity confirmation',`UPDATE auth.users SET email_confirmed_at=NULL WHERE id=${q(id(c.user))};`,`UPDATE auth.users SET email_confirmed_at=${q(confirmed)}::timestamptz WHERE id=${q(id(c.user))};`,'invalid']);
  for(const[label,mutation,restore,status,validToken=true,user=c.user]of rows){
   try{
    if(mutation)run(mutation);
    const r=raw(tokenVar(c)+'BEGIN READ ONLY;'+as(user)+`SELECT public.${c.rpc}(${validToken?":'local_invitation_token'":q('invalid')})->>'status'; ROLLBACK;`);
    assert.equal(r.status,0,label+': '+r.stderr);assert.equal(r.stdout.trim(),status,label);checked++;
    if(status!=='valid'){
     const pending=c.member||user!==c.user?'':`INSERT INTO dobby_v7_private.pending_profiles(user_id,profile) VALUES(${q(id(c.user))},${json(profileValue)});`;
     const legacy=raw(tokenVar(c)+'BEGIN;'+pending+as(user)+`SELECT public.${c.accept}(${validToken?":'local_invitation_token'":q('invalid')},${q(id(9910))}); ROLLBACK;`);
     assert.notEqual(legacy.status,0,label+' legacy acceptance');assert.match(legacy.stderr,/ERROR:  (42501|22023)\b/);legacyDenied++;
     if(validToken){
      const admission=raw('BEGIN;'+as(user)+acceptSQL(c,9911)+'ROLLBACK;');
      assert.notEqual(admission.status,0,label+' admission acceptance');assert.match(admission.stderr,/ERROR:  (42501|22023)\b/);admissionDenied++;
     }
    }
   }finally{if(restore)run(restore);}
  }
 }
 console.log('LOT5C_INVITATION_READ_MATRIX '+checked+' READ ONLY; '+legacyDenied+' legacy and '+admissionDenied+' admission refusals');
});
test('read validator remains private and acceptance keeps the original requester locking guard',()=>{
 const metadata=run("SELECT pg_get_userbyid(proowner),provolatile,prosecdef,proconfig::text FROM pg_proc WHERE oid=to_regprocedure('dobby_access_private.assert_invitation_admission_read(text,text)');");
 assert.equal(metadata,'dobby_access_writer|s|t|{\"search_path=\\\"\\\"\"}');
 for(const role of ['anon','authenticated','service_role','dobby_v7_writer'])assert.equal(run(`SELECT has_function_privilege(${q(role)},'dobby_access_private.assert_invitation_admission_read(text,text)','EXECUTE');`),'f');
 assert.equal(run("SELECT has_function_privilege('dobby_socle_writer','dobby_access_private.assert_invitation_admission_read(text,text)','EXECUTE'),has_function_privilege('dobby_socle_writer','dobby_access_private.assert_invitation_admission_read(text,text)','EXECUTE WITH GRANT OPTION');"),'t|f');
 const existing=readFileSync(new URL('../../../supabase/migrations/20261118120207_dobby_private_access_administration.sql',import.meta.url),'utf8');
 const requester=existing.match(/CREATE FUNCTION dobby_access_private\.assert_requester[\s\S]*?AS \$\$([\s\S]*?)\$\$;/)[1];
 assert.equal(run(`SELECT md5(prosrc)=md5(${q(requester)}) FROM pg_proc WHERE oid='dobby_access_private.assert_requester(uuid,bigint)'::regprocedure;`),'t');
 assert.equal(owned(),baselineV7);
});
test('adult and child acceptances preserve revisions replay receipts and household separation',()=>{
 for(const c of cases){
  const before=rows();
  const r=run(`BEGIN;
 SELECT revision AS rev_before FROM public.dobby_v2_modules WHERE household_id=${q(id(101))} AND module='family' \\gset
 SELECT md5(payload::text) AS missions_before FROM public.dobby_v2_modules WHERE household_id=${q(id(101))} AND module='missions' \\gset
 SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY module)::text) AS other_before FROM public.dobby_v2_modules t WHERE household_id=${q(id(102))} \\gset
 `+as(c.user)+acceptSQL(c)+`RESET ROLE;
 SELECT revision AS rev_first FROM public.dobby_v2_modules WHERE household_id=${q(id(101))} AND module='family' \\gset
 `+as(c.user)+acceptSQL(c)+`RESET ROLE;
 SELECT revision FROM dobby_access_private.admissions WHERE id=${q(id(c.admission))};
 SELECT (SELECT count(*) FROM dobby_v7_private.account_links WHERE user_id=${q(id(c.user))} AND household_id=${q(id(101))})=1;
 SELECT (SELECT count(*) FROM public.dobby_v2_memberships WHERE user_id=${q(id(c.user))} AND household_id=${q(id(102))})=0;
 SELECT revision-:'rev_before'::bigint=${c.member?0:1} AND revision=:'rev_first'::bigint FROM public.dobby_v2_modules WHERE household_id=${q(id(101))} AND module='family';
 SELECT md5(payload::text)=:'missions_before' FROM public.dobby_v2_modules WHERE household_id=${q(id(101))} AND module='missions';
 SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY module)::text)=:'other_before' FROM public.dobby_v2_modules t WHERE household_id=${q(id(102))};
 ROLLBACK;`).split('\n');
  const first=JSON.parse(r[0]),replay=JSON.parse(r[1]);
  assert.equal(first.accepted,true);assert.equal(first.replayed,false);assert.equal(replay.replayed,true);assert.equal(first.memberId,replay.memberId);
  assert.deepEqual(r.slice(2),['2','t','t','t','t','t']);assert.equal(rows(),before);
  const legacy=run('BEGIN;'+tokenVar(c)+(c.member?'':`INSERT INTO dobby_v7_private.pending_profiles(user_id,profile) VALUES(${q(id(c.user))},${json(profileValue)});`)+as(c.user)+
   `SELECT public.${c.accept}(:'local_invitation_token',${q(id(9902))})->>'replayed'; SELECT public.${c.accept}(:'local_invitation_token',${q(id(9902))})->>'replayed'; ROLLBACK;`);
  assert.equal(legacy,'false\ntrue');assert.equal(rows(),before);
 }
});
async function waitForLock(name){
 const end=Date.now()+10000;
 while(Date.now()<end){if(run(`SELECT count(*) FROM pg_stat_activity WHERE application_name=${q(name)} AND wait_event_type='Lock';`)==='1')return;await new Promise(r=>setTimeout(r,20));}
 assert.fail('Acceptance did not wait on its physical authorization lock');
}
function session(){
 const actor=interactive();let finished;
 // Expected SQL refusals keep psql alive for an explicit rollback and cleanup.
 actor.send('\\set ON_ERROR_STOP 0\n\\set VERBOSITY verbose');
 return {...actor,finish(sql){return finished??=actor.finish(sql);}};
}
test('concurrent requester suspension waits for acceptance and wins when committed first',async()=>{
 const c=cases[0],before=rows();let a=session();
 try{
  a.send('BEGIN;'+as(c.user)+acceptSQL(c)+"SELECT 'ACCEPT_READY';");await a.waitFor('ACCEPT_READY');
  const blocked=raw(`BEGIN; SET LOCAL lock_timeout='100ms'; UPDATE dobby_access_private.authorizations SET status='suspended' WHERE user_id=${q(id(2))}; ROLLBACK;`);
  assert.notEqual(blocked.status,0);assert.match(blocked.stderr,/55P03/);
 }finally{await a.finish();}
 const blocker=session();a=session();
 try{
  blocker.send(`BEGIN; UPDATE dobby_access_private.authorizations SET status='suspended',generation=1 WHERE user_id=${q(id(2))}; SELECT 'SUSPEND_READY';`);await blocker.waitFor('SUSPEND_READY');
  a.send("BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL application_name='lot5c_accept_suspension';"+as(c.user)+acceptSQL(c));
  await waitForLock('lot5c_accept_suspension');await blocker.finish('COMMIT;');
  const refused=await a.finish();assert.match(refused.errors,/ERROR:\s+42501/);assert.equal(rows(),before);
 }finally{
  await blocker.finish();await a.finish();
  run(`UPDATE dobby_access_private.authorizations SET status='active',generation=0 WHERE user_id=${q(id(2))};`);
 }
});
test('historical acceptance revalidates admission identity and session after waiting for authorization locks',async()=>{
 const c=cases[0];
 const confirmed=run(`SELECT email_confirmed_at::text FROM auth.users WHERE id=${q(id(c.user))};`);
 for(const[mutation,restore]of [
  [`UPDATE dobby_access_private.admissions SET state='revoked' WHERE id=${q(id(c.admission))};`,`UPDATE dobby_access_private.admissions SET state='sent' WHERE id=${q(id(c.admission))};`],
  [`UPDATE auth.users SET email_confirmed_at=NULL WHERE id=${q(id(c.user))};`,`UPDATE auth.users SET email_confirmed_at=${q(confirmed)}::timestamptz WHERE id=${q(id(c.user))};`],
  [`UPDATE auth.sessions SET not_after=now()-interval '1 minute' WHERE id=${q(id(1000+c.user))};`,`UPDATE auth.sessions SET not_after=NULL WHERE id=${q(id(1000+c.user))};`]
 ]){
  const before=rows(),blocker=session(),a=session();
  try{
   blocker.send(`BEGIN; SELECT 1 FROM dobby_access_private.authorizations WHERE user_id=${q(id(2))} FOR UPDATE; SELECT 'REQUESTER_LOCKED';`);await blocker.waitFor('REQUESTER_LOCKED');
   a.send("BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL application_name='lot5c_accept_recheck';"+tokenVar(c)+`INSERT INTO dobby_v7_private.pending_profiles(user_id,profile) VALUES(${q(id(c.user))},${json(profileValue)});`+as(c.user)+`SELECT public.${c.accept}(:'local_invitation_token',${q(id(9903))});`);
   await waitForLock('lot5c_accept_recheck');blocker.send(mutation);await blocker.finish('COMMIT;');
   const denied=await a.finish();assert.match(denied.errors,/ERROR:\s+42501/,'A stale pre-lock validation authorized acceptance');
  }finally{await blocker.finish();await a.finish();run(restore);}
  assert.equal(rows(),before);
 }
});

import { before,after,test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,existsSync } from 'node:fs';
import { createDatabase } from './local-db.mjs';

let db;
const candidate=new URL('../../../supabase/compatibility/lot5b/auth-bridge.candidate.sql',import.meta.url);
const rollback=new URL('../../../supabase/compatibility/lot5b/auth-bridge.rollback.sql',import.meta.url);
const user='00000000-0000-4000-8000-000000000001';
const second='00000000-0000-4000-8000-000000000002';
const session='00000000-0000-4000-8000-000000001001';
const visibility=`CREATE POLICY fixture_platform_sessions ON auth.sessions FOR SELECT TO postgres USING(true);
 CREATE POLICY fixture_platform_users ON auth.users FOR SELECT TO postgres USING(true);`;
// Keep every statement inside the caller's test transaction, replacing only
// the file's outer BEGIN/COMMIT with this equivalent owned transaction.
const body=file=>readFileSync(file,'utf8').replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,'');
const install=()=>existsSync(candidate)?body(candidate):'';
const undo=()=>body(rollback);
function exercise(sql,{visible=true,setup=''}={}){
 return db.raw(`BEGIN; ${visible?visibility:''} ${setup} SET ROLE postgres; ${install()} ${sql} ROLLBACK;`);
}
function passes(result){assert.equal(result.status,0,result.stderr);return result.stdout.trim();}
function refuses(result,code='42501'){assert.notEqual(result.status,0,'Expected a closed boundary');assert.match(result.stderr,new RegExp('ERROR:  '+code+'\\b'),result.stderr);}
const call=(u=user,s=session,boundary='NULL')=>`dobby_access_auth_bridge.session_is_live('${u}','${s}',${boundary})`;
function snapshot(){return db.run(`SELECT jsonb_build_object(
 'users',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM auth.users t),
 'sessions',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM auth.sessions t),
 'relations',(SELECT jsonb_agg(jsonb_build_array(c.relname,c.relowner,c.relacl,c.relrowsecurity,c.relforcerowsecurity) ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='auth' AND c.relkind='r'),
 'roles',(SELECT jsonb_agg(jsonb_build_array(rolname,rolsuper,rolbypassrls,rolcanlogin,rolcreaterole) ORDER BY rolname) FROM pg_roles WHERE rolname NOT LIKE 'pg_%'),
 'memberships',(SELECT jsonb_agg(jsonb_build_array(roleid,member,grantor,admin_option,inherit_option,set_option) ORDER BY roleid,member,grantor) FROM pg_auth_members));`);}
before(()=>{
 db=createDatabase();console.log('LOT5B_AUTH_BRIDGE_RUNTIME '+db.version);
 db.run(`CREATE ROLE supabase_auth_admin NOLOGIN NOBYPASSRLS; CREATE ROLE authenticator NOLOGIN;
 CREATE ROLE dobby_access_session_reader NOLOGIN NOINHERIT NOBYPASSRLS;
 CREATE ROLE dobby_access_identity_reader NOLOGIN NOINHERIT NOBYPASSRLS;
 GRANT CREATE ON DATABASE lot5b TO postgres;
 CREATE SCHEMA auth; REVOKE ALL ON SCHEMA auth FROM PUBLIC;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
 CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz,not_after timestamptz);
 ALTER TABLE auth.users OWNER TO supabase_auth_admin; ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;
 ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY; ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA auth TO postgres;
 GRANT SELECT(id,email,email_confirmed_at) ON auth.users TO postgres;
 GRANT SELECT(id,user_id,created_at,not_after) ON auth.sessions TO postgres;
 INSERT INTO auth.users VALUES('${user}','  FIXTURE-1@example.invalid  ',statement_timestamp()),('${second}','fixture-2@example.invalid',NULL);
 INSERT INTO auth.sessions VALUES('${session}','${user}','2000-01-02Z',NULL),
 ('00000000-0000-4000-8000-000000001002','${user}',statement_timestamp()+interval '1 day',NULL),
 ('00000000-0000-4000-8000-000000001003','${user}','2000-01-02Z',statement_timestamp()-interval '1 hour');`);
});
after(()=>db?.close());

test('bridge gives the closed session reader a narrow decision without direct Auth rights',()=>{
 const value=passes(exercise(`SET ROLE dobby_access_session_reader;
 SELECT ${call()}; RESET ROLE;
 SELECT has_schema_privilege('dobby_access_session_reader','auth','USAGE'),has_any_column_privilege('dobby_access_session_reader','auth.sessions','SELECT');`));
 assert.equal(value,'t\nf|f');
});
test('session lookup preserves subject, session id, time boundary, future-date and expiry checks',()=>{
 const value=passes(exercise(`SET ROLE dobby_access_session_reader;
 SELECT ${call(second)},${call(user,'00000000-0000-4000-8000-000000009999')},
 ${call(user,session,"'2000-01-02Z'::timestamptz")},${call(user,session,"'2000-01-01Z'::timestamptz")},
 ${call(user,'00000000-0000-4000-8000-000000001002')},${call(user,'00000000-0000-4000-8000-000000001003')};`));
 assert.equal(value,'f|f|f|t|f|f');
});
test('RLS with no applicable policy remains closed even through the bridge',()=>{
 assert.equal(passes(exercise(`SET ROLE dobby_access_session_reader; SELECT ${call()};`,{visible:false})),'f');
});
test('loss of installer Auth usage gives no positive session or identity',()=>{
 const value=passes(exercise(`RESET ROLE; REVOKE USAGE ON SCHEMA auth FROM postgres;
 SET ROLE dobby_access_session_reader; SELECT ${call()};
 SET ROLE dobby_access_identity_reader; SELECT dobby_access_auth_bridge.auth_identity('${user}') IS NULL;`));
 assert.equal(value,'f\nt');
});
test('identity reader gets only the three reviewed fields and has no Auth SELECT',()=>{
 const result=passes(exercise(`SET ROLE dobby_access_identity_reader;
 SELECT dobby_access_auth_bridge.auth_identity('${user}');
 RESET ROLE; SELECT has_schema_privilege('dobby_access_identity_reader','auth','USAGE'),has_any_column_privilege('dobby_access_identity_reader','auth.users','SELECT');`)).split('\n');
 assert.deepEqual(JSON.parse(result[0]),{id:user,email:'fixture-1@example.invalid',confirmed:true});assert.equal(result[1],'f|f');
});
test('identity pagination is bounded and retains the reviewed projection',()=>{
 const value=JSON.parse(passes(exercise(`SET ROLE dobby_access_identity_reader; SELECT dobby_access_auth_bridge.auth_identity_page('${user}',1);`)));
 assert.deepEqual(value,[{userId:second,email:'fixture-2@example.invalid',confirmed:false}]);
 refuses(exercise(`SET ROLE dobby_access_identity_reader; SELECT dobby_access_auth_bridge.auth_identity_page(NULL,101);`),'22023');
});
test('both readers remain separate and cannot call each others projections',()=>{
 refuses(exercise(`SET ROLE dobby_access_session_reader; SELECT dobby_access_auth_bridge.auth_identity('${user}');`));
 refuses(exercise(`SET ROLE dobby_access_identity_reader; SELECT ${call()};`));
});
for(const role of ['anon','authenticated','service_role','authenticator'])test(role+' cannot execute private Auth helpers',()=>{
 refuses(exercise(`SET ROLE ${role}; SELECT ${call()};`));
});
test('an exposed bridge schema or inherited browser reader refuses installation atomically',()=>{
 const before=snapshot();
 refuses(exercise('',{setup:"SET LOCAL pgrst.db_schemas='public,dobby_access_auth_bridge';"}));
 refuses(exercise('',{setup:'GRANT dobby_access_identity_reader TO authenticated;'}));
 assert.equal(snapshot(),before);
});
test('unexpected default function grants are refused rather than published',()=>{
 refuses(exercise('',{setup:'ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON FUNCTIONS TO fixture_grantor;'}));
});
test('review: inherited membership between the two readers refuses installation',()=>{
 for(const setup of [
  'GRANT dobby_access_identity_reader TO dobby_access_session_reader WITH INHERIT TRUE,SET FALSE;',
  'GRANT dobby_access_session_reader TO dobby_access_identity_reader WITH INHERIT TRUE,SET FALSE;',
  'CREATE ROLE fixture_reader_group NOLOGIN; GRANT dobby_access_identity_reader TO fixture_reader_group; GRANT fixture_reader_group TO dobby_access_session_reader;',
  'CREATE ROLE fixture_reader_group NOLOGIN; GRANT dobby_access_session_reader TO fixture_reader_group; GRANT fixture_reader_group TO dobby_access_identity_reader;'
 ])refuses(exercise('',{setup}));
});
test('review: schema default CREATE for a reader refuses installation',()=>{
 for(const reader of ['dobby_access_session_reader','dobby_access_identity_reader'])
  refuses(exercise('',{setup:'ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT CREATE ON SCHEMAS TO '+reader+';'}));
});
test('review: an existing Auth CREATE grant without USAGE refuses installation',()=>{
 for(const reader of ['dobby_access_session_reader','dobby_access_identity_reader'])
  refuses(exercise('',{setup:'GRANT CREATE ON SCHEMA auth TO '+reader+';'}));
});
test('candidate and rollback preserve Auth rows, owners, RLS, ACLs and role attributes',()=>{
 const before=snapshot();
 assert.equal(passes(exercise(`${undo()} SELECT to_regnamespace('dobby_access_auth_bridge') IS NULL;`)),'t');
 assert.equal(snapshot(),before);
});
test('rollback refuses a modified helper and preserves the schema on failure',()=>{
 const result=exercise(`CREATE OR REPLACE FUNCTION dobby_access_auth_bridge.session_is_live(p_user uuid,p_session uuid,p_after timestamptz) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ BEGIN RETURN true; END $$;
 SAVEPOINT before_undo;
 \\set ON_ERROR_STOP off
 ${undo()}
 \\set ON_ERROR_STOP on
 ROLLBACK TO before_undo;
 SELECT to_regnamespace('dobby_access_auth_bridge') IS NOT NULL,(SELECT count(*) FROM pg_proc WHERE pronamespace='dobby_access_auth_bridge'::regnamespace);`);
 assert.match(result.stderr,/ERROR:  42501\b/);assert.equal(passes(result),'t|3');
});
test('rollback uses RESTRICT and does not remove a dependent consumer',()=>{
 const result=exercise(`CREATE SCHEMA fixture_consumer;
 CREATE FUNCTION fixture_consumer.read_identity() RETURNS jsonb LANGUAGE sql RETURN dobby_access_auth_bridge.auth_identity_page(NULL,1);
 SAVEPOINT before_undo;
 \\set ON_ERROR_STOP off
 ${undo()}
 \\set ON_ERROR_STOP on
 ROLLBACK TO before_undo;
 SELECT to_regprocedure('fixture_consumer.read_identity()') IS NOT NULL,(SELECT count(*) FROM pg_proc WHERE pronamespace='dobby_access_auth_bridge'::regnamespace);`);
 assert.match(result.stderr,/ERROR:  2BP01\b/);assert.equal(passes(result),'t|3');
});

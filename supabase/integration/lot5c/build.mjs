// OFFLINE generator. No database/network/subprocess/credential discovery.
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {approved,buildArtifacts} from '../../compatibility/lot5b/build-variants.mjs';
import {buildV7Preserved} from '../../compatibility/lot5b/build-v7-preserved.mjs';
import {defaultAclCheck,verifyState} from '../../compatibility/lot5b/v7-preserved-state.mjs';
import {sessionBody,wiring} from './auth-wiring.mjs';
const dir=fileURLToPath(new URL('.',import.meta.url)),root=resolve(dir,'../../..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
const hash=v=>createHash('sha256').update(v).digest('hex');
const md5=v=>createHash('md5').update(v).digest('hex');
// Assembly stopped on a newly reproduced Lot3 read contract defect.
// No CLI/env switch. Every delivered writing entrypoint aborts before DDL/DML.
export const stopGate=`DO $lot5c_blocked$ BEGIN RAISE EXCEPTION USING ERRCODE='0A000',MESSAGE='LOT5C NO-GO: Lot3 invitation requester lock fails READ ONLY with 25006'; END $lot5c_blocked$;`;
const phase=sql=>sql.replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'');
function once(s,a,b){assert.equal(s.split(a).length,2,'Unique assembly anchor: '+a.slice(0,80));return s.replace(a,b);}
const historical={
 foundation:['20261117203208_dobby_private_access_foundation.sql','94465429f7f80315904634d6ca85f1a4723972324fe398bb560e9977e3f6c35a'],
 storage:['20261118112535_dobby_private_access_storage.sql','1ae625ba58d97fd43a18bfec7206e24401c73ca820e156e56e1fdb72a95fc466'],
 administration:['20261118120207_dobby_private_access_administration.sql','9e6ee7141898b0e00f7297353818f495d80bebb970030423b669e07413688ae5']};
function sources(){return Object.fromEntries(Object.entries(historical).map(([k,[name,digest]])=>{const sql=read('supabase/migrations/'+name);assert.equal(hash(sql),digest);return[k,sql];}));}
const businessRelations=['dobby_v7_private.pending_profiles','dobby_v7_private.account_links','dobby_v7_private.operations','public.dobby_v2_households','public.dobby_v2_memberships','public.dobby_v2_modules'];
const inputDDL=`-- Private operator file must create pg_temp.dobby5c_input in this same session.
-- No private values, paths, manifests or Auth identity are printed by this package.
DO $input$
BEGIN
 IF to_regclass('pg_temp.dobby5c_input') IS NULL THEN RAISE EXCEPTION 'Private approved input required'; END IF;
 IF (SELECT count(*) FROM pg_temp.dobby5c_input)<>1 OR EXISTS(SELECT 1 FROM pg_temp.dobby5c_input
  WHERE project_ref IS DISTINCT FROM 'pqcdkrwljgvgagzwrcmg' OR package_id IS DISTINCT FROM @PACKAGE@
   OR maintenance_confirmed IS DISTINCT FROM true OR backup_verified IS DISTINCT FROM true
   OR signed_storage_resolved IS DISTINCT FROM true) THEN RAISE EXCEPTION 'Approved maintenance, backup, signed Storage decision and exact package required'; END IF;
END $input$;`;
// Metadata snapshots never store business/Auth rows or source bodies.
const installed=`SELECT jsonb_agg(jsonb_build_array(p.oid,md5(pg_get_functiondef(p.oid)),p.proowner,p.proacl::text,p.provolatile,p.proconfig) ORDER BY p.oid)
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN
 ('dobby_access_private','dobby_access_legacy','dobby_access_lot3_legacy','dobby_access_auth_bridge','dobby_access_v7_gate')
 OR n.nspname='public' AND p.proname LIKE 'dobby_access_%'
 OR p.oid IN (${approved.functions.map(e=>'to_regprocedure('+quote(e.signature)+')').join(',')})
 OR n.nspname='dobby_socle_private' AND (p.proname LIKE 'access_%' OR p.proname IN ('accept_invitation','create_invitation','preview_invitation','add_pending_member'))`;
const stateCheck=`DO $state$
BEGIN
 IF current_user<>'postgres' OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('dobby_access_legacy.lot5c_state')
  AND relowner='postgres'::regrole AND relrowsecurity AND NOT relforcerowsecurity)
  OR EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
   WHERE c.oid='dobby_access_legacy.lot5c_state'::regclass AND (a.grantee<>'postgres'::regrole OR a.is_grantable))
  OR (SELECT count(*) FROM dobby_access_legacy.lot5c_state)<>1
  OR (${installed}) IS DISTINCT FROM (SELECT functions FROM dobby_access_legacy.lot5c_state WHERE singleton) THEN
  RAISE EXCEPTION 'Lot5C installed definition/owner/ACL drift or untrusted journal';
 END IF;
END $state$;
${verifyState}`;

// Review source only; not an install entrypoint or CLI unlock mode.
// Used by the local regression test to reproduce the failed composition.
export function reviewAssembly(){
 const src=sources(),old=buildArtifacts(),v7=buildV7Preserved();
 const inputPaths=[...Object.values(historical).map(([n])=>'supabase/migrations/'+n),
  'supabase/integration/lot5c/build.mjs','supabase/integration/lot5c/auth-wiring.mjs',
  ...['build-variants.mjs','build-v7-preserved.mjs','v7-preserved-state.mjs','v7-preserved.guards.sql','approved-catalogue.json','auth-bridge.candidate.sql','maintenance-roles.preflight.sql'].map(n=>'supabase/compatibility/lot5b/'+n)];
 const inputs=inputPaths.map(path=>({path,sha256:hash(read(path))}));
 const packageId='dobby-lot5c-'+hash(JSON.stringify(inputs));
 const input=inputDDL.replace('@PACKAGE@',quote(packageId));
 let roles=read('supabase/compatibility/lot5b/maintenance-roles.preflight.sql').replaceAll("'dobby_v7_writer',",'');
 const preliminary=`DO $preflight$
DECLARE r text; f record;
BEGIN
 IF current_user<>'postgres' OR current_setting('server_version_num')::int/10000<>17
  OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolsuper OR NOT rolcreaterole)) THEN RAISE EXCEPTION 'Existing non-superuser PostgreSQL17 postgres installer required'; END IF;
 IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname IN ('dobby_access_private','dobby_access_legacy','dobby_access_lot3_legacy','dobby_access_auth_bridge','dobby_access_v7_gate'))
  OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('dobby_access_writer','dobby_access_session_reader','dobby_access_identity_reader')) THEN RAISE EXCEPTION 'Fresh administration installation required; do not reset or reinstall'; END IF;
 FOREACH r IN ARRAY ARRAY[${businessRelations.map(quote).join(',')}] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(r) AND relowner='postgres'::regrole AND relrowsecurity) THEN RAISE EXCEPTION 'Owned RLS business relation required: %',r; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role','dobby_socle_writer','dobby_missions_v2_writer') AND pg_has_role(oid,'dobby_v7_writer','MEMBER')) THEN RAISE EXCEPTION 'V7 isolation required'; END IF;
 IF EXISTS(WITH RECURSIVE s(oid) AS(SELECT 'postgres'::regrole::oid UNION SELECT m.roleid FROM pg_auth_members m JOIN s ON s.oid=m.member WHERE m.set_option),u(oid) AS(SELECT oid FROM s UNION SELECT m.roleid FROM pg_auth_members m JOIN u ON u.oid=m.member WHERE m.inherit_option) SELECT 1 FROM u WHERE oid='dobby_v7_writer'::regrole) THEN RAISE EXCEPTION 'No usable V7 maintenance authority permitted'; END IF;
 FOREACH r IN ARRAY ARRAY['auth.users','auth.sessions'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(r) AND relrowsecurity) THEN RAISE EXCEPTION 'Existing RLS-enabled Auth required'; END IF;
 END LOOP;
 IF NOT has_schema_privilege('postgres','auth','USAGE') OR NOT has_column_privilege('postgres','auth.users','id','REFERENCES')
  OR EXISTS(SELECT 1 FROM (VALUES ('auth.users','id'),('auth.users','email'),('auth.users','email_confirmed_at'),('auth.sessions','id'),('auth.sessions','user_id'),('auth.sessions','created_at'),('auth.sessions','not_after')) a(rel,col) WHERE NOT has_column_privilege('postgres',a.rel,a.col,'SELECT')) THEN RAISE EXCEPTION 'Existing installer Auth projection/REFERENCES required; no Auth repair'; END IF;
 IF coalesce(current_setting('pgrst.db_schemas',true),'') ~ '(^|,)[[:space:]]*(dobby_access_private|dobby_access_legacy|dobby_access_auth_bridge|dobby_access_v7_gate)([[:space:]]*,|$)' THEN RAISE EXCEPTION 'Private schemas must not be exposed'; END IF;
END $preflight$;
${defaultAclCheck}
${roles}
${old['catalogue.preflight.sql']}${old['missions.preflight.sql']}
`;
 // The original administration private-helper preflight is READ ONLY too.
 const familyCheck=src.administration.slice(src.administration.indexOf(" IF EXISTS(SELECT 1 FROM (VALUES"),src.administration.indexOf(" IF EXISTS(SELECT 1 FROM pg_roles"));
 const storageRead=`DO $storage_read$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='dobby-family-files' AND NOT public)
  OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='storage.objects'::regclass AND relrowsecurity)
  OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='storage.buckets'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'Existing private RLS Storage required'; END IF;
 IF (SELECT count(*) FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname IN ('dobby_family_files_read','dobby_family_files_upload','dobby_family_files_delete','dobby_socle_parent_insert','dobby_socle_parent_update','dobby_socle_parent_delete','dobby_socle_canonical_read','dobby_socle_parent_update_allow'))<>8 THEN RAISE EXCEPTION 'Eight native Storage policies required'; END IF;
END $storage_read$;
${src.storage.slice(src.storage.indexOf('DO $storage_helpers$'),src.storage.indexOf('-- Parse the published policies'))}
`;
 const preflight=`-- READ ONLY metadata; no private bodies, user rows, file paths or credentials output.
BEGIN READ ONLY;
SET LOCAL search_path='';
SET LOCAL statement_timeout='30s';
${preliminary}
DO $family$ BEGIN ${familyCheck} END $family$;
${storageRead}
SELECT current_user,current_setting('server_version') AS postgres_version,
 (SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user) AS existing_installer_bypass,
 current_setting('pgrst.db_schemas',true) AS configured_exposed_schemas;
SELECT schemaname,tablename,policyname,md5(coalesce(qual,'')) AS using_md5,md5(coalesce(with_check,'')) AS check_md5 FROM pg_policies WHERE schemaname='auth' AND tablename IN ('users','sessions') ORDER BY tablename,policyname;
SELECT p.polname,p.polcmd,p.polpermissive,md5(pg_get_expr(p.polqual,p.polrelid)) AS using_md5,md5(pg_get_expr(p.polwithcheck,p.polrelid)) AS check_md5 FROM pg_policy p WHERE p.polrelid IN ('storage.objects'::regclass,'storage.buckets'::regclass) ORDER BY p.polname;
SELECT extname,extversion FROM pg_extension ORDER BY extname;
-- SQL cannot prove the platform project identity, SMTP, API schema config,
-- managed policy delegation, or positive Auth RLS visibility: operator evidence required.
COMMIT;
`;
 let administration=src.administration.replaceAll('dobby_access_writer,dobby_socle_writer,dobby_v7_writer','dobby_access_writer,dobby_socle_writer');
 administration=administration.replaceAll('dobby_access_writer,dobby_socle_writer,dobby_v7_writer,dobby_access_identity_reader','dobby_access_writer,dobby_socle_writer,dobby_access_identity_reader');
 const storage=once(src.storage,"'50c8a15b049d77355f9a81c930dc937c'",quote(md5(sessionBody)));
 const install=`-- SINGLE atomic installation. Closed until separate controlled activation.
BEGIN;
SET LOCAL search_path='';
${input}
${bodyOf(preflight)}
-- Historical catalogue compares regprocedure display names under public.
-- Runtime definers themselves retain their closed search_path.
SET LOCAL search_path=public;
-- 1 Foundation, exact historical source.
${phase(src.foundation)}
-- 2 Explicit private canonical owner/A/B bootstrap, no Auth/profile recreation.
DO $bootstrap$ DECLARE m jsonb; op uuid; BEGIN
 SELECT manifest,operation_id INTO m,op FROM pg_temp.dobby5c_input;
 IF (SELECT count(DISTINCT e->>'householdId') FROM jsonb_array_elements(m->'preservedAccounts') e)<>1 THEN RAISE EXCEPTION 'Both preserved accounts must have their verified common household'; END IF;
 PERFORM dobby_access_private.bootstrap(m,op);
END $bootstrap$;
-- 3 Exact preserved-V7 catalogue/Missions/roles and direct RLS guard.
${phase(v7['v7-preserved.candidate.sql'])}
-- 4 Administration; only unnecessary V7 maintenance grants removed.
${phase(administration)}
-- 5 Reviewed private Auth bridge, no direct Auth grants to readers.
${phase(read('supabase/compatibility/lot5b/auth-bridge.candidate.sql'))}
-- 6 Rewire existing private readers/activators; reader owners/ACL retained.
${wiring()}
-- 7 Native Storage; exact source-derived session-helper body fingerprint.
${phase(storage)}
-- No session/identity/administration or child-delivery activation on install.
UPDATE dobby_access_private.settings SET session_guard_ready=false,identity_guard_ready=false,administration_enabled=false,child_delivery_enabled=false WHERE singleton;
CREATE TABLE dobby_access_legacy.lot5c_state(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),package_id text NOT NULL,functions jsonb NOT NULL);
ALTER TABLE dobby_access_legacy.lot5c_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dobby_access_legacy.lot5c_state FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO dobby_access_legacy.lot5c_state(package_id,functions) SELECT ${quote(packageId)},(${installed});
${stateCheck}
NOTIFY pgrst,'reload schema';
COMMIT;
`;
 const activate=`-- Future human-approved controlled activation, not executed by the generator.
BEGIN;
SET LOCAL search_path='';
${input}
${stateCheck}
DO $probe$ DECLARE i record; BEGIN
 SELECT * INTO i FROM pg_temp.dobby5c_input;
 IF i.open_administration IS DISTINCT FROM true THEN RAISE EXCEPTION 'Explicit activation approval required'; END IF;
 PERFORM set_config('dobby5c.probe_user',i.probe_user::text,true);
 PERFORM set_config('dobby5c.probe_session',i.probe_session::text,true);
 PERFORM set_config('dobby5c.probe_email_sha256',i.probe_email_sha256,true);
 PERFORM dobby_access_private.enable_session_guard();
 PERFORM dobby_access_private.enable_identity_guard();
 UPDATE dobby_access_private.settings SET administration_enabled=true WHERE singleton;
END $probe$;
-- Child delivery and all pre-existing feature gates remain unchanged.
COMMIT;
`;
 const close=(full=false)=>`-- ${full?'CLOSED QUARANTINE; all authorization-dependent access remains closed.':'FUNCTIONAL ADMIN STOP; ordinary active family access retained.'}
-- Coordinate effective Edge/client/Storage ingress closure externally first.
BEGIN;
SET LOCAL search_path='';
SET LOCAL lock_timeout='5s';
${stateCheck}
UPDATE dobby_access_private.settings SET administration_enabled=false,child_delivery_enabled=false${full?',session_guard_ready=false,identity_guard_ready=false':''} WHERE singleton;
NOTIFY pgrst,'reload schema';
COMMIT;
`;
 const postflight=`BEGIN READ ONLY;
SET LOCAL search_path='';
${stateCheck}
SELECT 'LOT5C_METADATA_INTACT' AS result;
SELECT session_guard_ready,identity_guard_ready,administration_enabled,child_delivery_enabled FROM dobby_access_private.settings WHERE singleton;
COMMIT;
`;
 const outputs={'00-preflight.sql':preflight,'10-install.sql':install,'20-activate.sql':activate,'30-postflight.sql':postflight,'80-stop-admin.sql':close(),'90-close.sql':close(true)};
 outputs['manifest.json']=JSON.stringify({status:'BLOCKED_LOT3_READONLY_25006',packageId,phaseBase:'afb09873b39e533d433c72a436ab3cbcfc043bbc',projectRef:'pqcdkrwljgvgagzwrcmg',reportedHostedPostgres:'17.11',adminV7Required:false,order:['00-preflight.sql','10-install.sql','30-postflight.sql','20-activate.sql','30-postflight.sql'],rollback:['80-stop-admin.sql (sentinel only, unvalidated plan)','90-close.sql (sentinel only, unvalidated plan)'],inputs,missionsReferences:12,catalogueReferences:27,fullLocalMissionsAvailable:false,storageHelperBodyMD5:md5(sessionBody)},null,2)+'\n';
 return outputs;
}
export function buildPackage(){
 const outputs=reviewAssembly();
 for(const name of ['10-install.sql','20-activate.sql','80-stop-admin.sql','90-close.sql']){
  outputs[name]=`-- NO-GO SENTINEL ONLY. No mutable assembly follows this error.\n-- Review source and failed local contract: docs/dobby-v7/administration-privee/lot5c/RAPPORT.md\nBEGIN;\n${stopGate}\nCOMMIT;\n`;
 }
 const manifest=JSON.parse(outputs['manifest.json']);
 manifest.writingEntrypointsContainOnlySentinel=true;
 manifest.reviewSourceOnly='build.mjs reviewAssembly(), no CLI installer/unlock option';
 manifest.outputs=Object.entries(outputs).filter(([name])=>name!=='manifest.json').map(([path,sql])=>({path,sha256:hash(sql)}));
 outputs['manifest.json']=JSON.stringify(manifest,null,2)+'\n';
 return outputs;
}
function bodyOf(sql){return sql.replace(/^BEGIN READ ONLY;$/m,'').replace(/^COMMIT;$/m,'');}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 for(const[name,sql]of Object.entries(buildPackage())){
  if(process.argv.includes('--check'))assert.equal(readFileSync(resolve(dir,name),'utf8'),sql,'Stale integration package: '+name);
  else writeFileSync(resolve(dir,name),sql);
 }
}

// Local package construction only. No hosted connection or permission repair.
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {approved,buildArtifacts,renderCataloguePreflight} from './build-variants.mjs';
import {defaultAclCheck,privilegeQuery,ownedQuery,readerQuery,saveState,verifyState,principalIsolationCheck,relationSafetyCheck} from './v7-preserved-state.mjs';

const directory=fileURLToPath(new URL('.',import.meta.url));
const preserved=['public.dobby_v7_update_profile(jsonb,bigint)','public.dobby_v7_create_household(text,uuid)'];
function once(source,before,after){assert.equal(source.split(before).length,2,'Unique preservation anchor required: '+before.slice(0,90));return source.replace(before,after);}
export function buildV7Preserved(){
 const original=buildArtifacts();
 const oldRoles=readFileSync(resolve(directory,'maintenance-roles.preflight.sql'),'utf8');
 let roles=oldRoles.replaceAll("'dobby_v7_writer',",'');
 const preservationCheck=`
 -- ADMIN is waived only for this exact preservation plan, never an arbitrary patch.
 IF to_regclass('pg_temp.access_2a_manifest') IS NULL THEN RAISE EXCEPTION 'Exact V7 preservation plan required'; END IF;
 IF (SELECT count(*) FROM access_2a_manifest m JOIN pg_proc p ON p.oid=to_regprocedure(m.signature) WHERE p.proowner='dobby_v7_writer'::regrole)<>2
  OR EXISTS(SELECT 1 FROM access_2a_manifest m JOIN pg_proc p ON p.oid=to_regprocedure(m.signature)
   WHERE p.proowner='dobby_v7_writer'::regrole AND NOT(m.signature IN ('${preserved.join("','")}') AND m.kind IN ('v7-preserved-profile','v7-preserved-create'))) THEN
  RAISE EXCEPTION 'V7-owned function modification still requires ADMIN';
 END IF;
 ${principalIsolationCheck}
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='dobby_v7_writer' AND NOT(rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication)) THEN
  RAISE EXCEPTION 'Closed untouched V7 role required';
 END IF;
 -- No V7 membership is changed: reject all SET* then INHERIT* authority now.
 IF EXISTS(WITH RECURSIVE can_set(oid) AS (
  SELECT 'postgres'::regrole::oid UNION SELECT m.roleid FROM pg_auth_members m JOIN can_set s ON s.oid=m.member WHERE m.set_option
 ), can_use(oid) AS (
  SELECT oid FROM can_set UNION SELECT m.roleid FROM pg_auth_members m JOIN can_use s ON s.oid=m.member WHERE m.inherit_option
 ) SELECT 1 FROM can_use WHERE oid='dobby_v7_writer'::regrole) THEN
  RAISE EXCEPTION 'Unexpected V7 maintenance authority; preservation changes no memberships';
 END IF;
`;
 roles=once(roles,' SELECT oid INTO installer FROM pg_roles WHERE rolname=current_user;',preservationCheck+' SELECT oid INTO installer FROM pg_roles WHERE rolname=current_user;');
 let candidate=original['lot2a-compatible.candidate.sql'];
 candidate=once(candidate,"('public.dobby_v7_update_profile(jsonb,bigint)','write')","('public.dobby_v7_update_profile(jsonb,bigint)','v7-preserved-profile')");
 candidate=once(candidate,"('public.dobby_v7_create_household(text,uuid)','create')","('public.dobby_v7_create_household(text,uuid)','v7-preserved-create')");
 candidate=once(candidate,oldRoles,roles);
 candidate=candidate.replaceAll("ARRAY['dobby_v7_writer','dobby_socle_writer','dobby_missions_v2_writer','dobby_access_writer']","ARRAY['dobby_socle_writer','dobby_missions_v2_writer','dobby_access_writer']");
 candidate=candidate.replaceAll('dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer','dobby_socle_writer,dobby_missions_v2_writer');
 candidate=once(candidate,'GRANT EXECUTE ON FUNCTION dobby_access_private.lock_household_creation(),dobby_access_private.consume_household_creation() TO dobby_v7_writer;','-- V7 receives only the dedicated new guard; quota uses attached triggers.');
 candidate=once(candidate,"WHERE kind NOT IN ('closed','trigger','public-flags')","WHERE kind NOT IN ('closed','trigger','public-flags','v7-preserved-profile','v7-preserved-create')");
 candidate=once(candidate,'FROM access_2a_manifest m JOIN pg_proc p ON p.oid=to_regprocedure(m.signature);',"FROM access_2a_manifest m JOIN pg_proc p ON p.oid=to_regprocedure(m.signature) WHERE m.kind NOT LIKE 'v7-preserved-%';");
 candidate=once(candidate," IF current_user IN ('anon','authenticated','dobby_v7_writer','dobby_socle_writer','dobby_missions_v2_writer') THEN", " IF current_user='dobby_v7_writer' THEN RETURN NULL; -- Dedicated role-conditioned guard installed atomically below.\n ELSIF current_user IN ('anon','authenticated','dobby_socle_writer','dobby_missions_v2_writer') THEN");
 // No public reader is redirected to the locking guard or made VOLATILE.
 let guards=readFileSync(resolve(directory,'v7-preserved.guards.sql'),'utf8');
 guards=once(guards,'BEGIN;\n','').replace(/^COMMIT;$/m,'');
 const close='GRANT dobby_socle_writer,dobby_missions_v2_writer,dobby_access_writer TO postgres WITH INHERIT FALSE, SET FALSE;';
 candidate=once(candidate,close,guards+'\n'+close);
 // Attest all V7-owned routines, including private helpers, across installation.
 const snapshot=`CREATE TEMP TABLE access_v7_unchanged ON COMMIT DROP AS SELECT oid,md5(pg_get_functiondef(oid)) definition_md5,proowner,proacl FROM pg_proc WHERE proowner='dobby_v7_writer'::regrole;
CREATE TEMP TABLE access_v7_privileges ON COMMIT DROP AS SELECT (${privilegeQuery}) snapshot;
CREATE TEMP TABLE access_v7_owned_before ON COMMIT DROP AS SELECT (${ownedQuery}) snapshot;
`;
 candidate=once(candidate,'DO $preflight$',snapshot+'DO $preflight$');
 const unchanged=`DO $v7_unchanged$ BEGIN
 IF EXISTS((SELECT oid,md5(pg_get_functiondef(oid)),proowner,proacl FROM pg_proc WHERE proowner='dobby_v7_writer'::regrole EXCEPT SELECT * FROM access_v7_unchanged)
  UNION ALL (SELECT * FROM access_v7_unchanged EXCEPT SELECT oid,md5(pg_get_functiondef(oid)),proowner,proacl FROM pg_proc WHERE proowner='dobby_v7_writer'::regrole)) THEN
  RAISE EXCEPTION 'V7 function changed during preservation package';
 END IF;
END $v7_unchanged$;\n`;
 candidate=once(candidate,"NOTIFY pgrst,'reload schema';",unchanged+saveState+"NOTIFY pgrst,'reload schema';");
 candidate=once(candidate,'BEGIN;\n',`BEGIN;\n${defaultAclCheck}\n`);
 const rollback=`-- Complete removal of the dedicated guard and its two V7 grants.
-- Six false policies retain the V7 write fence; base Lot2A and its STABLE readers remain.
-- This does not reopen pre-administration APIs or alter a V7-owned function.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL search_path='';
${renderCataloguePreflight(approved.functions.filter(entry=>preserved.includes(entry.signature)))}
${verifyState}
CREATE TEMP TABLE access_v7_rollback_state ON COMMIT DROP AS SELECT * FROM dobby_access_legacy.v7_gate_state;
DO $v7_quarantine$
DECLARE relation text; object regclass; policy record;
BEGIN
 FOREACH relation IN ARRAY ARRAY['dobby_v7_private.pending_profiles','dobby_v7_private.account_links','dobby_v7_private.operations','public.dobby_v2_households','public.dobby_v2_memberships','public.dobby_v2_modules'] LOOP
  object:=to_regclass(relation);
  SELECT * INTO policy FROM pg_policy WHERE polrelid=object AND polname='dobby_access_v7_preserved';
  IF NOT FOUND OR policy.polpermissive OR policy.polcmd<>'*' OR policy.polroles<>ARRAY['dobby_v7_writer'::regrole::oid]
   OR pg_get_expr(policy.polqual,object) IS DISTINCT FROM 'dobby_access_v7_gate.check_access()'
   OR pg_get_expr(policy.polwithcheck,object) IS DISTINCT FROM 'dobby_access_v7_gate.check_access()' THEN
   RAISE EXCEPTION 'Unexpected V7 policy; no rollback mutation: %',relation;
  END IF;
 END LOOP;
 FOREACH relation IN ARRAY ARRAY['dobby_v7_private.pending_profiles','dobby_v7_private.account_links','dobby_v7_private.operations','public.dobby_v2_households','public.dobby_v2_memberships','public.dobby_v2_modules'] LOOP
  object:=to_regclass(relation);
  EXECUTE format('ALTER POLICY dobby_access_v7_preserved ON %s USING(false) WITH CHECK(false)',object);
  EXECUTE format('DROP TRIGGER dobby_access_00_v7_guard ON %s',object);
 END LOOP;
END $v7_quarantine$;
DROP TRIGGER dobby_access_v7_consume ON public.dobby_v2_households;
DROP FUNCTION dobby_access_private.guard_v7_preserved() RESTRICT;
DROP FUNCTION dobby_access_private.consume_v7_preserved_creation() RESTRICT;
DROP FUNCTION dobby_access_v7_gate.check_access() RESTRICT;
REVOKE USAGE ON SCHEMA dobby_access_v7_gate FROM dobby_v7_writer;
DROP TABLE dobby_access_legacy.v7_gate_state RESTRICT;
DROP SCHEMA dobby_access_v7_gate RESTRICT;
DO $v7_removed_verify$ BEGIN
 ${principalIsolationCheck}
 ${relationSafetyCheck}
 IF (${privilegeQuery}) IS DISTINCT FROM (SELECT snapshot FROM access_v7_rollback_state WHERE key='privileges_before')
  OR (${ownedQuery}) IS DISTINCT FROM (SELECT snapshot FROM access_v7_rollback_state WHERE key='owned_before')
  OR (${readerQuery}) IS DISTINCT FROM (SELECT snapshot FROM access_v7_rollback_state WHERE key='readers') THEN
  RAISE EXCEPTION 'Rollback must preserve original V7 privileges/functions and STABLE readers';
 END IF;
END $v7_removed_verify$;
NOTIFY pgrst,'reload schema';
COMMIT;
`;
 return {'v7-preserved.candidate.sql':'-- LOCAL CANDIDATE: direct private V7 guard; no ADMIN V7. Separate hosted approval required.\n'+candidate,'v7-preserved.roles.preflight.sql':roles,'v7-preserved.rollback.sql':rollback};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 for(const[name,source]of Object.entries(buildV7Preserved())){
  if(process.argv.includes('--check'))assert.equal(readFileSync(resolve(directory,name),'utf8'),source,'Stale V7 preservation artifact: '+name);
  else writeFileSync(resolve(directory,name),source);
 }
}

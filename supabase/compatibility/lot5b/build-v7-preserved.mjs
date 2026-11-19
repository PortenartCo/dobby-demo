// Local package construction only. No hosted connection or permission repair.
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {approved,buildArtifacts,renderCataloguePreflight} from './build-variants.mjs';

const directory=fileURLToPath(new URL('.',import.meta.url));
export const blockingGate=`DO $v7_blocked$ BEGIN
 RAISE EXCEPTION USING ERRCODE='0A000',MESSAGE='BLOCKED: shared locking context breaks existing READ ONLY invitation previews; experimental diagnosis only';
END $v7_blocked$;`;
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
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='dobby_v7_writer' AND NOT(rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication))
  OR pg_has_role('anon','dobby_v7_writer','MEMBER') OR pg_has_role('authenticated','dobby_v7_writer','MEMBER')
  OR pg_has_role('dobby_socle_writer','dobby_v7_writer','MEMBER') OR pg_has_role('dobby_missions_v2_writer','dobby_v7_writer','MEMBER') THEN
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
 candidate=once(candidate,'GRANT EXECUTE ON FUNCTION dobby_access_private.lock_household_creation(),dobby_access_private.consume_household_creation() TO dobby_v7_writer;','-- No new V7 function/schema privileges. Quota is consumed by an attached trigger.');
 candidate=once(candidate,"WHERE kind NOT IN ('closed','trigger','public-flags')","WHERE kind NOT IN ('closed','trigger','public-flags','v7-preserved-profile','v7-preserved-create')");
 candidate=once(candidate,'FROM access_2a_manifest m JOIN pg_proc p ON p.oid=to_regprocedure(m.signature);',"FROM access_2a_manifest m JOIN pg_proc p ON p.oid=to_regprocedure(m.signature) WHERE m.kind NOT LIKE 'v7-preserved-%';");
 candidate=once(candidate," IF current_user IN ('anon','authenticated','dobby_v7_writer','dobby_socle_writer','dobby_missions_v2_writer') THEN", " IF current_user='dobby_v7_writer' THEN RETURN NULL; -- Dedicated role-conditioned guard installed atomically below.\n ELSIF current_user IN ('anon','authenticated','dobby_socle_writer','dobby_missions_v2_writer') THEN");
 candidate=once(candidate,"  head:=replace(head,'LANGUAGE sql','LANGUAGE plpgsql');", "  head:=replace(head,'LANGUAGE sql','LANGUAGE plpgsql');\n  IF m.signature='public.dobby_v7_context()' THEN\n   head:=replace(head,'STABLE','VOLATILE');\n   body:='PERFORM dobby_access_private.assert_active_nowait();'||format(' RETURN %s(%s);',legacy,args);\n  END IF;");
 // PL/pgSQL bodies are resolved on invocation: helper is installed in this same transaction.
 let guards=readFileSync(resolve(directory,'v7-preserved.guards.sql'),'utf8');
 // The source fragment is also transactionally blocked when opened on its own.
 guards=once(guards,blockingGate,'-- Block is retained in the enclosing experimental candidate.');
 guards=once(guards,'BEGIN;\n','').replace(/^COMMIT;$/m,'');
 const close='GRANT dobby_socle_writer,dobby_missions_v2_writer,dobby_access_writer TO postgres WITH INHERIT FALSE, SET FALSE;';
 candidate=once(candidate,close,guards+'\n'+close);
 // Attest all V7-owned routines, including private helpers, across installation.
 const snapshot=`CREATE TEMP TABLE access_v7_unchanged ON COMMIT DROP AS SELECT oid,md5(pg_get_functiondef(oid)) definition_md5,proowner,proacl FROM pg_proc WHERE proowner='dobby_v7_writer'::regrole;\n`;
 candidate=once(candidate,'DO $preflight$',snapshot+'DO $preflight$');
 const unchanged=`DO $v7_unchanged$ BEGIN
 IF EXISTS((SELECT oid,md5(pg_get_functiondef(oid)),proowner,proacl FROM pg_proc WHERE proowner='dobby_v7_writer'::regrole EXCEPT SELECT * FROM access_v7_unchanged)
  UNION ALL (SELECT * FROM access_v7_unchanged EXCEPT SELECT oid,md5(pg_get_functiondef(oid)),proowner,proacl FROM pg_proc WHERE proowner='dobby_v7_writer'::regrole)) THEN
  RAISE EXCEPTION 'V7 function changed during preservation package';
 END IF;
END $v7_unchanged$;\n`;
 candidate=once(candidate,"NOTIFY pgrst,'reload schema';",unchanged+"NOTIFY pgrst,'reload schema';");
 candidate=once(candidate,'BEGIN;\n','BEGIN;\n'+blockingGate+'\n');
 const rollback=`-- EXPERIMENT ONLY. Conservative quarantine; not a full functional restoration.
-- Context/helper remain locking: the known READ ONLY regression is NOT repaired.
-- Conservative rollback: quarantine V7; retain native data and other Lot2A guards.
-- It does not restore open pre-administration APIs. No V7 grant or function change.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL search_path='';
${renderCataloguePreflight(approved.functions.filter(entry=>preserved.includes(entry.signature)))}
DO $v7_quarantine$
DECLARE relation text; object regclass; policy record;
BEGIN
 FOREACH relation IN ARRAY ARRAY['dobby_v7_private.pending_profiles','dobby_v7_private.account_links','dobby_v7_private.operations','public.dobby_v2_households','public.dobby_v2_memberships','public.dobby_v2_modules'] LOOP
  object:=to_regclass(relation);
  SELECT * INTO policy FROM pg_policy WHERE polrelid=object AND polname='dobby_access_v7_preserved';
  IF NOT FOUND OR policy.polpermissive OR policy.polcmd<>'*' OR policy.polroles<>ARRAY['dobby_v7_writer'::regrole::oid]
   OR pg_get_expr(policy.polqual,object) IS DISTINCT FROM '(public.dobby_v7_context() IS NOT NULL)'
   OR pg_get_expr(policy.polwithcheck,object) IS DISTINCT FROM '(public.dobby_v7_context() IS NOT NULL)' THEN
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
-- Context still serializes authorization for all readers/replays; keep its helper.
NOTIFY pgrst,'reload schema';
COMMIT;
`;
 return {'v7-preserved.candidate.sql':'-- BLOCKED EXPERIMENT / diagnostic only. Not an activable migration.\n'+candidate,'v7-preserved.roles.preflight.sql':roles,'v7-preserved.rollback.sql':rollback};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 for(const[name,source]of Object.entries(buildV7Preserved())){
  if(process.argv.includes('--check'))assert.equal(readFileSync(resolve(directory,name),'utf8'),source,'Stale V7 preservation artifact: '+name);
  else writeFileSync(resolve(directory,name),source);
 }
}

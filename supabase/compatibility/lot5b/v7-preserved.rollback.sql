-- Complete removal of the dedicated guard and its two V7 grants.
-- Six false policies retain the V7 write fence; base Lot2A and its STABLE readers remain.
-- This does not reopen pre-administration APIs or alter a V7-owned function.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL search_path='';
-- Exact approved pairs only; no lexical normalization or business write.
DO $catalogue_5b$
DECLARE e jsonb; f record; acl jsonb; expected_acl jsonb; profile text; acl_ok boolean;
BEGIN
 IF current_user <> 'postgres' OR current_setting('server_version_num')::int < 160000
  OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolsuper) THEN
  RAISE EXCEPTION 'Verified non-superuser postgres installer required for catalogue approval';
 END IF;
 FOR e IN SELECT value FROM jsonb_array_elements('[{"signature":"public.dobby_v7_update_profile(jsonb,bigint)","kind":"write","owner":"dobby_v7_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_profile jsonb, p_expected_revision bigint","anon":false,"authenticated":true,"aclProfiles":["{dobby_v7_writer=X/dobby_v7_writer,authenticated=X/dobby_v7_writer}"],"pairs":[{"bodyMD5":"c4915597121f2b1ea01bf2058987481a","definitionMD5":"478f617c98f746586465faa0a57caf99","source":"published-reference"},{"bodyMD5":"34be4ec3886d86b4f50227c55f9c18d1","definitionMD5":"e9cd180c42b172de4bb6e3087d35d2e0","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_create_household(text,uuid)","kind":"create","owner":"dobby_v7_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_name text, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_v7_writer=X/dobby_v7_writer,authenticated=X/dobby_v7_writer}"],"pairs":[{"bodyMD5":"05c28a810c14312cd1e85cf308ad9991","definitionMD5":"5b08f985d641c264395d212fdeefb08b","source":"published-reference"},{"bodyMD5":"54228b41c9101243098de608e9c36fba","definitionMD5":"4b92f7429be05ecae44e03965793958c","source":"ChatGPT-reported-lexical-review-20261119"}]}]'::jsonb) LOOP
  SELECT p.*,l.lanname,pg_get_userbyid(p.proowner) owner_name,
   md5(p.prosrc) body_md5,md5(pg_get_functiondef(p.oid)) definition_md5,
   pg_get_function_identity_arguments(p.oid) arguments
  INTO f FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang
  WHERE p.oid=to_regprocedure(e->>'signature');
  IF NOT FOUND THEN RAISE EXCEPTION 'Missing approved catalogue routine: %',e->>'signature'; END IF;
  IF f.owner_name IS DISTINCT FROM e->>'owner'
   OR f.prosecdef IS DISTINCT FROM (e->>'securityDefiner')::boolean
   OR f.lanname IS DISTINCT FROM e->>'language'
   OR f.provolatile::text IS DISTINCT FROM e->>'volatility'
   OR to_jsonb(f.proconfig) IS DISTINCT FROM e->'configuration'
   OR f.arguments IS DISTINCT FROM e->>'arguments'
   OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(e->'pairs') pair
    WHERE f.body_md5=pair->>'bodyMD5' AND f.definition_md5=pair->>'definitionMD5') THEN
   RAISE EXCEPTION 'Unapproved catalogue pair/owner/attribute drift: %',e->>'signature';
  END IF;
  SELECT jsonb_agg(jsonb_build_array(pg_get_userbyid(a.grantor),
    CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,a.is_grantable)
    ORDER BY a.grantor,a.grantee,a.privilege_type) INTO acl
   FROM aclexplode(coalesce(f.proacl,acldefault('f',f.proowner))) a;
  acl_ok:=false;
  FOR profile IN SELECT jsonb_array_elements_text(e->'aclProfiles') LOOP
   SELECT jsonb_agg(jsonb_build_array(pg_get_userbyid(a.grantor),
     CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,a.is_grantable)
     ORDER BY a.grantor,a.grantee,a.privilege_type) INTO expected_acl
    FROM aclexplode(profile::aclitem[]) a;
   IF acl IS NOT DISTINCT FROM expected_acl THEN acl_ok:=true; END IF;
  END LOOP;
  IF NOT acl_ok THEN RAISE EXCEPTION 'Unapproved catalogue execution ACL: %',e->>'signature'; END IF;
  IF e->>'signature'='public.dobby_sync_stamper()' THEN
   IF f.prorettype <> 'trigger'::regtype OR f.prosecdef OR NOT EXISTS(
    SELECT 1 FROM pg_trigger t WHERE t.tgfoid=f.oid AND NOT t.tgisinternal AND t.tgenabled IN ('O','A')) THEN
    RAISE EXCEPTION 'Approved stamper must remain an attached invoker trigger';
   END IF;
  ELSIF has_function_privilege('anon',f.oid,'EXECUTE') IS DISTINCT FROM (e->>'anon')::boolean
   OR has_function_privilege('authenticated',f.oid,'EXECUTE') IS DISTINCT FROM (e->>'authenticated')::boolean THEN
   RAISE EXCEPTION 'Unapproved inherited catalogue execution: %',e->>'signature';
  END IF;
 END LOOP;
END $catalogue_5b$;

DO $v7_defaults$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole='postgres'::regrole AND d.defaclobjtype IN ('f','n','r','S','T')
   AND a.grantee<>d.defaclrole
   AND NOT(a.grantee=0 AND NOT a.is_grantable AND (d.defaclobjtype='f' AND a.privilege_type='EXECUTE' OR d.defaclobjtype='T' AND a.privilege_type='USAGE'))) THEN
  RAISE EXCEPTION 'Unexpected creator default ACL; review before V7 installation or rollback';
 END IF;
END $v7_defaults$;
DO $v7_gate_acl$
DECLARE f record; n record; role_name text;
BEGIN
 IF EXISTS(SELECT 1 FROM (VALUES
 ('anon'),('authenticated'),('service_role'),('dobby_socle_writer'),('dobby_missions_v2_writer'),('dobby_access_writer')) principal(name)
 WHERE pg_has_role(principal.name,'dobby_v7_writer','MEMBER')) THEN
 RAISE EXCEPTION 'V7 role isolation required for readers and temporary maintenance writers';
END IF;
 IF (SELECT count(*) FROM pg_class WHERE oid IN('dobby_v7_private.pending_profiles'::regclass,'dobby_v7_private.account_links'::regclass,'dobby_v7_private.operations'::regclass,'public.dobby_v2_households'::regclass,'public.dobby_v2_memberships'::regclass,'public.dobby_v2_modules'::regclass))<>6
 OR EXISTS(SELECT 1 FROM pg_class WHERE oid IN('dobby_v7_private.pending_profiles'::regclass,'dobby_v7_private.account_links'::regclass,'dobby_v7_private.operations'::regclass,'public.dobby_v2_households'::regclass,'public.dobby_v2_memberships'::regclass,'public.dobby_v2_modules'::regclass) AND
  (relowner<>'postgres'::regrole OR NOT relrowsecurity OR pg_has_role('dobby_v7_writer',relowner,'USAGE'))) THEN
 RAISE EXCEPTION 'V7 relation owner and enabled RLS required for the write fence';
END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='dobby_access_legacy.v7_gate_state'::regclass
  AND relowner='postgres'::regrole AND relrowsecurity AND NOT relforcerowsecurity AND relkind='r')
  OR EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
   WHERE c.oid='dobby_access_legacy.v7_gate_state'::regclass AND(a.grantee<>'postgres'::regrole OR a.grantor<>'postgres'::regrole OR a.is_grantable))
  OR EXISTS(SELECT 1 FROM pg_attribute c CROSS JOIN LATERAL aclexplode(c.attacl) a
   WHERE c.attrelid='dobby_access_legacy.v7_gate_state'::regclass AND(a.grantee<>'postgres'::regrole OR a.grantor<>'postgres'::regrole OR a.is_grantable)) THEN
  RAISE EXCEPTION 'V7 journal must retain its private owner RLS and ACL';
 END IF;
 SELECT * INTO n FROM pg_namespace WHERE nspname='dobby_access_v7_gate';
 SELECT * INTO f FROM pg_proc WHERE oid='dobby_access_v7_gate.check_access()'::regprocedure;
 IF n.nspowner<>'postgres'::regrole OR f.proowner<>'dobby_access_writer'::regrole
  OR NOT f.prosecdef OR f.provolatile<>'v' OR f.prorettype<>'boolean'::regtype OR f.pronargs<>0 OR f.proretset
  OR f.proconfig IS DISTINCT FROM ARRAY['search_path=""']::text[]
  OR (SELECT count(*) FROM pg_proc WHERE pronamespace=n.oid)<>1
  OR EXISTS(SELECT 1 FROM pg_roles WHERE oid=f.proowner AND(rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication)) THEN
  RAISE EXCEPTION 'Unexpected V7 private guard owner/definition';
 END IF;
 IF EXISTS(SELECT 1 FROM aclexplode(n.nspacl) a WHERE a.grantor<>'postgres'::regrole OR a.is_grantable
  OR NOT(a.grantee='postgres'::regrole AND a.privilege_type IN('USAGE','CREATE')
   OR a.grantee IN('dobby_access_writer'::regrole,'dobby_v7_writer'::regrole) AND a.privilege_type='USAGE'))
  OR EXISTS(SELECT 1 FROM aclexplode(f.proacl) a WHERE a.grantor<>'dobby_access_writer'::regrole OR a.is_grantable
   OR a.grantee NOT IN('dobby_access_writer'::regrole,'dobby_v7_writer'::regrole) OR a.privilege_type<>'EXECUTE')
  OR NOT has_schema_privilege('dobby_v7_writer',n.oid,'USAGE')
  OR has_schema_privilege('dobby_v7_writer',n.oid,'CREATE,USAGE WITH GRANT OPTION')
  OR NOT has_function_privilege('dobby_v7_writer',f.oid,'EXECUTE')
  OR has_function_privilege('dobby_v7_writer',f.oid,'EXECUTE WITH GRANT OPTION')
  OR has_schema_privilege('dobby_access_writer',n.oid,'CREATE') THEN
  RAISE EXCEPTION 'Unexpected V7 guard ACL; only USAGE and one EXECUTE allowed';
 END IF;
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_schema_privilege(role_name,n.oid,'USAGE,CREATE') OR has_function_privilege(role_name,f.oid,'EXECUTE') THEN
   RAISE EXCEPTION 'Unexpected browser/service access to V7 guard';
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_class WHERE relnamespace=n.oid AND
  (has_any_column_privilege('dobby_v7_writer',oid,'SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege('dobby_v7_writer',oid,'DELETE,TRUNCATE,TRIGGER'))) THEN
  RAISE EXCEPTION 'No V7 table rights allowed in private guard schema';
 END IF;
 IF (SELECT count(*) FROM pg_proc WHERE oid IN('public.dobby_v7_context()'::regprocedure,'public.dobby_v7_preview_invitation(text)'::regprocedure,'public.dobby_v7_preview_child_invitation(text)'::regprocedure) AND provolatile='s')<>3 THEN
  RAISE EXCEPTION 'All three public readers must remain STABLE';
 END IF;
END $v7_gate_acl$;
DO $v7_restore_verify$ BEGIN
 IF (SELECT count(*) FROM dobby_access_legacy.v7_gate_state)<>7
  OR (SELECT jsonb_build_object(
 'role',(SELECT jsonb_build_array(rolcanlogin,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolinherit,rolreplication) FROM pg_roles WHERE rolname='dobby_v7_writer'),
 'memberships',(SELECT jsonb_agg(to_jsonb(m) ORDER BY roleid,member,grantor) FROM pg_auth_members m WHERE roleid='dobby_v7_writer'::regrole OR member='dobby_v7_writer'::regrole),
 'schemas',(SELECT jsonb_agg(jsonb_build_array(n.oid,a.grantor,a.privilege_type,a.is_grantable) ORDER BY n.oid,a.grantor,a.privilege_type) FROM pg_namespace n CROSS JOIN LATERAL aclexplode(n.nspacl) a WHERE a.grantee='dobby_v7_writer'::regrole AND n.nspname<>'dobby_access_v7_gate'),
 'tables',(SELECT jsonb_agg(jsonb_build_array(c.oid,a.grantor,a.privilege_type,a.is_grantable) ORDER BY c.oid,a.grantor,a.privilege_type) FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE a.grantee='dobby_v7_writer'::regrole),
 'columns',(SELECT jsonb_agg(jsonb_build_array(c.attrelid,c.attnum,a.grantor,a.privilege_type,a.is_grantable) ORDER BY c.attrelid,c.attnum,a.grantor,a.privilege_type) FROM pg_attribute c CROSS JOIN LATERAL aclexplode(c.attacl) a WHERE a.grantee='dobby_v7_writer'::regrole),
 'functions',(SELECT jsonb_agg(jsonb_build_array(p.oid,a.grantor,a.privilege_type,a.is_grantable) ORDER BY p.oid,a.grantor,a.privilege_type) FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) a JOIN pg_namespace n ON n.oid=p.pronamespace WHERE a.grantee='dobby_v7_writer'::regrole AND n.nspname<>'dobby_access_v7_gate'))) IS DISTINCT FROM (SELECT snapshot FROM dobby_access_legacy.v7_gate_state WHERE key='privileges_before')
  OR (SELECT jsonb_agg(jsonb_build_array(oid,md5(pg_get_functiondef(oid)),proowner,proacl::text) ORDER BY oid) FROM pg_proc WHERE proowner='dobby_v7_writer'::regrole) IS DISTINCT FROM (SELECT snapshot FROM dobby_access_legacy.v7_gate_state WHERE key='owned_before')
  OR (SELECT jsonb_agg(jsonb_build_array(oid,md5(pg_get_functiondef(oid)),proowner,proacl::text,provolatile) ORDER BY oid) FROM pg_proc WHERE oid IN ('public.dobby_v7_context()'::regprocedure,'public.dobby_v7_preview_invitation(text)'::regprocedure,'public.dobby_v7_preview_child_invitation(text)'::regprocedure)) IS DISTINCT FROM (SELECT snapshot FROM dobby_access_legacy.v7_gate_state WHERE key='readers')
  OR (SELECT jsonb_agg(jsonb_build_array(oid,md5(pg_get_functiondef(oid)),proowner,proacl::text) ORDER BY oid) FROM pg_proc WHERE oid IN ('dobby_access_v7_gate.check_access()'::regprocedure,'dobby_access_private.guard_v7_preserved()'::regprocedure,'dobby_access_private.consume_v7_preserved_creation()'::regprocedure)) IS DISTINCT FROM (SELECT snapshot FROM dobby_access_legacy.v7_gate_state WHERE key='objects')
  OR (SELECT jsonb_agg(jsonb_build_array(polrelid,polname,polpermissive,polcmd,polroles,pg_get_expr(polqual,polrelid),pg_get_expr(polwithcheck,polrelid)) ORDER BY polrelid) FROM pg_policy WHERE polname='dobby_access_v7_preserved') IS DISTINCT FROM (SELECT snapshot FROM dobby_access_legacy.v7_gate_state WHERE key='policies')
  OR (SELECT jsonb_agg(jsonb_build_array(tgrelid,tgname,tgenabled,tgtype,tgfoid,pg_get_triggerdef(oid)) ORDER BY tgrelid,tgname) FROM pg_trigger WHERE tgname IN ('dobby_access_00_v7_guard','dobby_access_v7_consume')) IS DISTINCT FROM (SELECT snapshot FROM dobby_access_legacy.v7_gate_state WHERE key='triggers')
  OR (SELECT jsonb_agg(jsonb_build_array(oid,relowner,relrowsecurity,relforcerowsecurity) ORDER BY oid) FROM pg_class WHERE oid IN('dobby_v7_private.pending_profiles'::regclass,'dobby_v7_private.account_links'::regclass,'dobby_v7_private.operations'::regclass,'public.dobby_v2_households'::regclass,'public.dobby_v2_memberships'::regclass,'public.dobby_v2_modules'::regclass)) IS DISTINCT FROM (SELECT snapshot FROM dobby_access_legacy.v7_gate_state WHERE key='relations') THEN
  RAISE EXCEPTION 'Unexpected V7 installed state; no rollback mutation';
 END IF;
END $v7_restore_verify$;
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
 IF EXISTS(SELECT 1 FROM (VALUES
 ('anon'),('authenticated'),('service_role'),('dobby_socle_writer'),('dobby_missions_v2_writer'),('dobby_access_writer')) principal(name)
 WHERE pg_has_role(principal.name,'dobby_v7_writer','MEMBER')) THEN
 RAISE EXCEPTION 'V7 role isolation required for readers and temporary maintenance writers';
END IF;
 IF (SELECT count(*) FROM pg_class WHERE oid IN('dobby_v7_private.pending_profiles'::regclass,'dobby_v7_private.account_links'::regclass,'dobby_v7_private.operations'::regclass,'public.dobby_v2_households'::regclass,'public.dobby_v2_memberships'::regclass,'public.dobby_v2_modules'::regclass))<>6
 OR EXISTS(SELECT 1 FROM pg_class WHERE oid IN('dobby_v7_private.pending_profiles'::regclass,'dobby_v7_private.account_links'::regclass,'dobby_v7_private.operations'::regclass,'public.dobby_v2_households'::regclass,'public.dobby_v2_memberships'::regclass,'public.dobby_v2_modules'::regclass) AND
  (relowner<>'postgres'::regrole OR NOT relrowsecurity OR pg_has_role('dobby_v7_writer',relowner,'USAGE'))) THEN
 RAISE EXCEPTION 'V7 relation owner and enabled RLS required for the write fence';
END IF;
 IF (SELECT jsonb_build_object(
 'role',(SELECT jsonb_build_array(rolcanlogin,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolinherit,rolreplication) FROM pg_roles WHERE rolname='dobby_v7_writer'),
 'memberships',(SELECT jsonb_agg(to_jsonb(m) ORDER BY roleid,member,grantor) FROM pg_auth_members m WHERE roleid='dobby_v7_writer'::regrole OR member='dobby_v7_writer'::regrole),
 'schemas',(SELECT jsonb_agg(jsonb_build_array(n.oid,a.grantor,a.privilege_type,a.is_grantable) ORDER BY n.oid,a.grantor,a.privilege_type) FROM pg_namespace n CROSS JOIN LATERAL aclexplode(n.nspacl) a WHERE a.grantee='dobby_v7_writer'::regrole AND n.nspname<>'dobby_access_v7_gate'),
 'tables',(SELECT jsonb_agg(jsonb_build_array(c.oid,a.grantor,a.privilege_type,a.is_grantable) ORDER BY c.oid,a.grantor,a.privilege_type) FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE a.grantee='dobby_v7_writer'::regrole),
 'columns',(SELECT jsonb_agg(jsonb_build_array(c.attrelid,c.attnum,a.grantor,a.privilege_type,a.is_grantable) ORDER BY c.attrelid,c.attnum,a.grantor,a.privilege_type) FROM pg_attribute c CROSS JOIN LATERAL aclexplode(c.attacl) a WHERE a.grantee='dobby_v7_writer'::regrole),
 'functions',(SELECT jsonb_agg(jsonb_build_array(p.oid,a.grantor,a.privilege_type,a.is_grantable) ORDER BY p.oid,a.grantor,a.privilege_type) FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) a JOIN pg_namespace n ON n.oid=p.pronamespace WHERE a.grantee='dobby_v7_writer'::regrole AND n.nspname<>'dobby_access_v7_gate'))) IS DISTINCT FROM (SELECT snapshot FROM access_v7_rollback_state WHERE key='privileges_before')
  OR (SELECT jsonb_agg(jsonb_build_array(oid,md5(pg_get_functiondef(oid)),proowner,proacl::text) ORDER BY oid) FROM pg_proc WHERE proowner='dobby_v7_writer'::regrole) IS DISTINCT FROM (SELECT snapshot FROM access_v7_rollback_state WHERE key='owned_before')
  OR (SELECT jsonb_agg(jsonb_build_array(oid,md5(pg_get_functiondef(oid)),proowner,proacl::text,provolatile) ORDER BY oid) FROM pg_proc WHERE oid IN ('public.dobby_v7_context()'::regprocedure,'public.dobby_v7_preview_invitation(text)'::regprocedure,'public.dobby_v7_preview_child_invitation(text)'::regprocedure)) IS DISTINCT FROM (SELECT snapshot FROM access_v7_rollback_state WHERE key='readers') THEN
  RAISE EXCEPTION 'Rollback must preserve original V7 privileges/functions and STABLE readers';
 END IF;
END $v7_removed_verify$;
NOTIFY pgrst,'reload schema';
COMMIT;

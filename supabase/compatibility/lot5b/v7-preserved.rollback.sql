-- EXPERIMENT ONLY. Conservative quarantine; not a full functional restoration.
-- Context/helper remain locking: the known READ ONLY regression is NOT repaired.
-- Conservative rollback: quarantine V7; retain native data and other Lot2A guards.
-- It does not restore open pre-administration APIs. No V7 grant or function change.
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

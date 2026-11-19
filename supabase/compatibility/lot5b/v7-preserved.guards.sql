-- Package fragment; the two explicit grants are on new guard objects only.
-- Standalone use without its core preservation transaction is refused.
BEGIN;
DO $v7_fragment$ BEGIN
 IF current_user<>'postgres' OR to_regclass('pg_temp.access_v7_unchanged') IS NULL
  OR to_regclass('dobby_access_legacy.function_backups') IS NULL THEN
  RAISE EXCEPTION USING ERRCODE='0A000',MESSAGE='Use the complete V7 preservation package';
 END IF;
 IF to_regnamespace('dobby_access_v7_gate') IS NOT NULL THEN RAISE EXCEPTION 'V7 gate schema already exists'; END IF;
END $v7_fragment$;
CREATE SCHEMA dobby_access_v7_gate;
REVOKE ALL ON SCHEMA dobby_access_v7_gate FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE,CREATE ON SCHEMA dobby_access_v7_gate TO dobby_access_writer;
CREATE TABLE dobby_access_legacy.v7_gate_state(key text PRIMARY KEY,snapshot jsonb NOT NULL);
ALTER TABLE dobby_access_legacy.v7_gate_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dobby_access_legacy.v7_gate_state FROM PUBLIC,anon,authenticated,service_role;

-- The guard is called directly by V7 policies. Public readers keep STABLE.
GRANT CREATE ON SCHEMA dobby_access_private TO dobby_access_writer;
CREATE FUNCTION dobby_access_v7_gate.check_access() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $v7_active$
DECLARE who jsonb:=dobby_access_private.request_identity(); a dobby_access_private.authorizations%ROWTYPE;
BEGIN
 IF who IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Active authorized session required'; END IF;
 SELECT * INTO a FROM dobby_access_private.authorizations WHERE user_id=(who->>'userId')::uuid FOR SHARE NOWAIT;
 IF NOT FOUND OR a.status<>'active' OR a.session_boundary_pending THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Active authorized session required';
 END IF;
 PERFORM dobby_access_private.assert_active();
 RETURN true;
EXCEPTION WHEN lock_not_available THEN
 RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Authorization is changing; retry transaction';
END $v7_active$;
CREATE FUNCTION dobby_access_private.guard_v7_preserved() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $v7_statement$
DECLARE who jsonb:=dobby_access_private.request_identity(); a dobby_access_private.authorizations%ROWTYPE;
BEGIN
 IF TG_LEVEL<>'STATEMENT' OR TG_TABLE_SCHEMA NOT IN ('public','dobby_v7_private')
  OR TG_TABLE_NAME NOT IN ('dobby_v2_households','dobby_v2_memberships','dobby_v2_modules','pending_profiles','account_links','operations') THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unexpected V7 guard attachment';
 END IF;
 IF TG_TABLE_SCHEMA='public' AND TG_TABLE_NAME='dobby_v2_households' AND TG_OP='INSERT' THEN
  IF who IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Active authorized session required'; END IF;
  SELECT * INTO a FROM dobby_access_private.authorizations WHERE user_id=(who->>'userId')::uuid FOR UPDATE NOWAIT;
  IF NOT FOUND OR a.status<>'active' OR a.session_boundary_pending OR NOT a.can_create_household THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Owner-approved household creation required';
  END IF;
 END IF;
 PERFORM dobby_access_v7_gate.check_access();
 RETURN NULL;
EXCEPTION WHEN lock_not_available THEN
 RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Authorization is changing; retry transaction';
END $v7_statement$;
CREATE FUNCTION dobby_access_private.consume_v7_preserved_creation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $v7_consume$
BEGIN
 IF TG_LEVEL<>'ROW' OR TG_OP<>'INSERT' OR TG_TABLE_SCHEMA<>'public' OR TG_TABLE_NAME<>'dobby_v2_households' THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unexpected V7 quota attachment';
 END IF;
 PERFORM dobby_access_private.consume_household_creation();
 RETURN NEW;
END $v7_consume$;
ALTER FUNCTION dobby_access_v7_gate.check_access() OWNER TO dobby_access_writer;
ALTER FUNCTION dobby_access_private.guard_v7_preserved() OWNER TO dobby_access_writer;
ALTER FUNCTION dobby_access_private.consume_v7_preserved_creation() OWNER TO dobby_access_writer;
REVOKE ALL ON FUNCTION dobby_access_v7_gate.check_access(),dobby_access_private.guard_v7_preserved(),dobby_access_private.consume_v7_preserved_creation() FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA dobby_access_v7_gate TO dobby_v7_writer;
GRANT EXECUTE ON FUNCTION dobby_access_v7_gate.check_access() TO dobby_v7_writer;
REVOKE CREATE ON SCHEMA dobby_access_v7_gate FROM dobby_access_writer;
REVOKE CREATE ON SCHEMA dobby_access_private FROM dobby_access_writer;

DO $v7_policies$
DECLARE relation text; object regclass;
BEGIN
 FOREACH relation IN ARRAY ARRAY['dobby_v7_private.pending_profiles','dobby_v7_private.account_links','dobby_v7_private.operations',
  'public.dobby_v2_households','public.dobby_v2_memberships','public.dobby_v2_modules'] LOOP
  object:=to_regclass(relation);
  IF object IS NULL OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=object AND relowner='postgres'::regrole AND relrowsecurity)
   OR pg_has_role('dobby_v7_writer',(SELECT relowner FROM pg_class WHERE oid=object),'USAGE') THEN
   RAISE EXCEPTION 'Owned RLS table required for V7 preservation: %',relation;
  END IF;
  EXECUTE format('CREATE POLICY dobby_access_v7_preserved ON %s AS RESTRICTIVE FOR ALL TO dobby_v7_writer USING(dobby_access_v7_gate.check_access()) WITH CHECK(dobby_access_v7_gate.check_access())',object);
  EXECUTE format('CREATE TRIGGER dobby_access_00_v7_guard BEFORE INSERT OR UPDATE OR DELETE ON %s FOR EACH STATEMENT WHEN(current_user=''dobby_v7_writer'') EXECUTE FUNCTION dobby_access_private.guard_v7_preserved()',object);
 END LOOP;
END $v7_policies$;
CREATE TRIGGER dobby_access_v7_consume AFTER INSERT ON public.dobby_v2_households
 FOR EACH ROW WHEN(current_user='dobby_v7_writer') EXECUTE FUNCTION dobby_access_private.consume_v7_preserved_creation();
COMMIT;

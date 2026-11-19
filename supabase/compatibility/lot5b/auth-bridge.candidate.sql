-- Independent LOCAL candidate, following Supabase's documented private-definer
-- pattern. No Auth grants/policies/owners or role attributes are changed.
-- NOT wired into Lot 1/3 guards; activation/fingerprints need a reviewed package.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $preflight$
DECLARE reader text;
BEGIN
 IF current_user<>'postgres' OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolsuper)
  OR to_regnamespace('dobby_access_auth_bridge') IS NOT NULL THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Verified non-superuser installer and absent bridge required';
 END IF;
 IF coalesce(current_setting('pgrst.db_schemas',true),'') ~ '(^|,)[[:space:]]*dobby_access_auth_bridge([[:space:]]*,|$)' THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Auth bridge must not be exposed by the Data API';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('auth.sessions') AND relrowsecurity)
  OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('auth.users') AND relrowsecurity) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Existing RLS-enabled Auth relations required';
 END IF;
 FOREACH reader IN ARRAY ARRAY['dobby_access_session_reader','dobby_access_identity_reader'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=reader AND NOT rolcanlogin AND NOT rolsuper
    AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication)
   OR pg_has_role('anon',reader,'MEMBER') OR pg_has_role('authenticated',reader,'MEMBER')
   OR pg_has_role('service_role',reader,'MEMBER')
   OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticator' AND pg_has_role(oid,reader,'MEMBER')) THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Closed, separate Auth readers required';
  END IF;
  IF has_schema_privilege(reader,'auth','USAGE')
   OR has_any_column_privilege(reader,'auth.sessions','SELECT,INSERT,UPDATE,REFERENCES')
   OR has_any_column_privilege(reader,'auth.users','SELECT,INSERT,UPDATE,REFERENCES')
   OR has_table_privilege(reader,'auth.sessions','DELETE,TRUNCATE,TRIGGER')
   OR has_table_privilege(reader,'auth.users','DELETE,TRUNCATE,TRIGGER') THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Bridge readers must not have direct Auth privileges';
  END IF;
 END LOOP;
END $preflight$;
CREATE SCHEMA dobby_access_auth_bridge AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA dobby_access_auth_bridge FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION dobby_access_auth_bridge.session_is_live(p_user uuid,p_session uuid,p_after timestamptz)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $body$
BEGIN
 RETURN EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id=p_session AND s.user_id=p_user
  AND s.created_at<=statement_timestamp()
  AND (p_after IS NULL OR s.created_at>p_after)
  AND (s.not_after IS NULL OR s.not_after>statement_timestamp()));
EXCEPTION WHEN insufficient_privilege OR undefined_table OR undefined_column THEN
 RETURN false;
END
$body$;
CREATE FUNCTION dobby_access_auth_bridge.auth_identity(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $body$
DECLARE result jsonb;
BEGIN
 SELECT jsonb_build_object('id',id,'email',lower(btrim(email)),'confirmed',email_confirmed_at IS NOT NULL)
 INTO result FROM auth.users WHERE id=p_user;
 RETURN result;
EXCEPTION WHEN insufficient_privilege OR undefined_table OR undefined_column THEN
 RETURN NULL;
END
$body$;
CREATE FUNCTION dobby_access_auth_bridge.auth_identity_page(p_after uuid,p_limit integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $body$
DECLARE result jsonb;
BEGIN
 IF p_limit IS NULL OR p_limit<1 OR p_limit>100 THEN
  RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Identity page limit must be between 1 and 100';
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('userId',id,'email',lower(btrim(email)),
  'confirmed',email_confirmed_at IS NOT NULL) ORDER BY id),'[]'::jsonb) INTO result
 FROM (SELECT id,email,email_confirmed_at FROM auth.users
  WHERE p_after IS NULL OR id>p_after ORDER BY id LIMIT p_limit) page;
 RETURN result;
EXCEPTION WHEN insufficient_privilege OR undefined_table OR undefined_column THEN
 RETURN '[]'::jsonb;
END
$body$;
REVOKE ALL ON FUNCTION dobby_access_auth_bridge.session_is_live(uuid,uuid,timestamptz),
 dobby_access_auth_bridge.auth_identity(uuid),dobby_access_auth_bridge.auth_identity_page(uuid,integer)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA dobby_access_auth_bridge TO dobby_access_session_reader,dobby_access_identity_reader;
GRANT EXECUTE ON FUNCTION dobby_access_auth_bridge.session_is_live(uuid,uuid,timestamptz) TO dobby_access_session_reader;
GRANT EXECUTE ON FUNCTION dobby_access_auth_bridge.auth_identity(uuid),
 dobby_access_auth_bridge.auth_identity_page(uuid,integer) TO dobby_access_identity_reader;
DO $acl$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  WHERE p.pronamespace='dobby_access_auth_bridge'::regnamespace
   AND (p.proowner<>'postgres'::regrole OR a.grantee NOT IN ('postgres'::regrole,
    CASE WHEN p.proname='session_is_live' THEN 'dobby_access_session_reader'::regrole ELSE 'dobby_access_identity_reader'::regrole END)
    OR (a.grantee<>'postgres'::regrole AND a.is_grantable))) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unexpected Auth bridge default/function privileges';
 END IF;
END $acl$;
COMMIT;

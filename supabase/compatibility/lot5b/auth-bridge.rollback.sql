-- LOCAL rollback candidate. Does not reopen Auth grants or application guards.
BEGIN;
SET LOCAL lock_timeout='3s';
DO $verify$
BEGIN
 IF current_user<>'postgres' OR to_regnamespace('dobby_access_auth_bridge') IS NULL
  OR NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='dobby_access_auth_bridge' AND nspowner='postgres'::regrole) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Verified installer and intact Auth bridge required';
 END IF;
 IF (SELECT count(*) FROM pg_proc WHERE pronamespace='dobby_access_auth_bridge'::regnamespace)<>3
  OR EXISTS(SELECT 1 FROM (VALUES ('session_is_live','8ea8b6c9e75ce8f8353e72246a6790c8'),('auth_identity','43d496b36a7a1e098b96541539ffb192'),('auth_identity_page','6da2fbc60434e7406ed72d46bf9442e2')) expected(name,body_md5)
   LEFT JOIN pg_proc p ON p.pronamespace='dobby_access_auth_bridge'::regnamespace AND p.proname=expected.name
   WHERE p.oid IS NULL OR md5(p.prosrc)<>expected.body_md5 OR p.proowner<>'postgres'::regrole
    OR NOT p.prosecdef OR p.provolatile<>'s' OR p.proconfig IS DISTINCT FROM ARRAY['search_path=""']::text[]) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Auth bridge definition drift; rollback refused';
 END IF;
END $verify$;
DROP FUNCTION dobby_access_auth_bridge.session_is_live(uuid,uuid,timestamptz) RESTRICT;
DROP FUNCTION dobby_access_auth_bridge.auth_identity(uuid) RESTRICT;
DROP FUNCTION dobby_access_auth_bridge.auth_identity_page(uuid,integer) RESTRICT;
DROP SCHEMA dobby_access_auth_bridge RESTRICT;
COMMIT;

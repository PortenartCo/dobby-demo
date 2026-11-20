-- The resolver owner runs this phase with its existing authority.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
DECLARE resolver oid;
BEGIN
  SELECT p.oid INTO resolver FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'dobby_socle_private' AND p.proname = 'actor_context'
    AND pg_catalog.oidvectortypes(p.proargtypes) = 'uuid, boolean';
  IF resolver IS NULL OR NOT EXISTS (
    SELECT FROM pg_proc WHERE oid = resolver AND proowner = current_user::regrole AND prosecdef
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Santé 01 délégation exige le propriétaire effectif du résolveur Socle Famille';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dobby_health_writer' AND NOT rolcanlogin AND NOT rolbypassrls)
     OR EXISTS (SELECT FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.roleid
                WHERE r.rolname = 'dobby_health_writer' AND (m.inherit_option OR m.set_option)) THEN
    RAISE EXCEPTION 'Santé 01 délégation exige le writer fermé préparé par 00-role.sql.';
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION dobby_socle_private.actor_context(uuid,boolean) TO dobby_health_writer;
COMMIT;

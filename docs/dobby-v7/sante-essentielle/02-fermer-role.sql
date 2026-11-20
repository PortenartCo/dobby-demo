-- Run as the platform's existing bootstrap grantor of the role membership.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
DECLARE writer oid := to_regrole('dobby_health_writer');
BEGIN
  IF writer IS NULL OR NOT EXISTS (
    SELECT FROM pg_auth_members WHERE roleid = writer AND member = 'postgres'::regrole
      AND grantor = current_user::regrole AND admin_option AND NOT inherit_option AND NOT set_option
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Santé 02 exige le rôle de plateforme qui a octroyé ADMIN au créateur du writer';
  END IF;
  IF to_regclass('dobby_health_private.install_state') IS NULL THEN
    RAISE EXCEPTION 'Santé 02 exige que les objets applicatifs Santé soient installés.';
  END IF;
  IF NOT EXISTS (SELECT FROM dobby_health_private.install_state WHERE singleton AND NOT enabled AND NOT legacy_closed)
     OR NOT EXISTS (SELECT FROM pg_trigger WHERE tgrelid = 'dobby_health_private.install_state'::regclass
                    AND tgname = 'dobby_health_legacy_activation_guard' AND tgenabled = 'A')
     OR NOT EXISTS (SELECT FROM pg_trigger WHERE tgrelid = 'public.dobby_v2_modules'::regclass
                    AND tgname = 'dobby_health_legacy_snapshot_guard' AND tgenabled = 'A')
     OR (SELECT count(*) FROM pg_auth_members WHERE roleid = writer OR member = writer) <> 1 THEN
    RAISE EXCEPTION 'Santé 02 exige l’application fermée avec ses gardes historiques et une seule délégation ADMIN de création.';
  END IF;
END $$;

REVOKE dobby_health_writer FROM postgres GRANTED BY CURRENT_USER;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_auth_members WHERE roleid = 'dobby_health_writer'::regrole OR member = 'dobby_health_writer'::regrole) THEN
    RAISE EXCEPTION 'Santé 02 a laissé une délégation ou une appartenance au writer.';
  END IF;
END $$;
COMMIT;

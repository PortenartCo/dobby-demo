-- LOCAL rollback drill / candidate only. Hosted execution needs distinct approval.
-- Reopens the native pre-Lot-2A APIs: a maintenance outage/closed ingress is a
-- prerequisite. Keep Lot 1, its decisions and all business rows intact.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
 IF current_user<>'postgres' OR to_regclass('dobby_access_legacy.function_backups') IS NULL THEN
  RAISE EXCEPTION 'Verified installer and intact Lot 2A backups required';
 END IF;
END $$;
GRANT dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer,dobby_access_writer TO postgres WITH INHERIT TRUE, SET TRUE;
DO $restore$
DECLARE f record; t text; recipient text;
BEGIN
 FOR f IN SELECT * FROM dobby_access_legacy.function_backups ORDER BY signature LOOP
  IF md5(f.definition)<>f.definition_md5 THEN RAISE EXCEPTION 'Changed backup: %',f.signature; END IF;
  EXECUTE f.definition;
 END LOOP;
 FOREACH t IN ARRAY ARRAY['dobby_v2_households','dobby_v2_memberships','dobby_v2_grocery','dobby_v2_modules','dobby_sync_members'] LOOP
  EXECUTE format('DROP POLICY dobby_access_active ON public.%I',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['dobby_v2_households','dobby_v2_memberships','dobby_v2_grocery','dobby_v2_modules','dobby_sync_members','dobby_sync_grocery_items'] LOOP
  EXECUTE format('DROP TRIGGER dobby_access_statement_guard ON public.%I',t);
 END LOOP;
 FOR f IN SELECT * FROM dobby_access_legacy.v1_acl_backups LOOP
  recipient:=CASE WHEN f.grantee_name='PUBLIC' THEN 'PUBLIC' ELSE quote_ident(f.grantee_name) END;
  EXECUTE format('GRANT %s%s ON public.dobby_sync_grocery_items TO %s%s',f.privilege_type,
   CASE WHEN f.column_name IS NULL THEN '' ELSE format('(%I)',f.column_name) END,recipient,
   CASE WHEN f.grantable THEN ' WITH GRANT OPTION' ELSE '' END);
 END LOOP;
END $restore$;
DROP FUNCTION dobby_access_private.guard_business_statement() RESTRICT;
DROP FUNCTION dobby_access_private.lock_household_creation() RESTRICT;
DROP FUNCTION dobby_access_private.consume_household_creation() RESTRICT;
-- Explicit closed-body list, no CASCADE that could remove business objects.
DO $drop_bodies$
DECLARE f record;
BEGIN
 FOR f IN SELECT p.oid::regprocedure sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='dobby_access_legacy' LOOP
  EXECUTE format('DROP FUNCTION %s RESTRICT',f.sig);
 END LOOP;
END $drop_bodies$;
DROP TABLE dobby_access_legacy.function_backups,dobby_access_legacy.v1_acl_backups RESTRICT;
REVOKE USAGE ON SCHEMA dobby_access_private FROM dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer;
REVOKE EXECUTE ON FUNCTION dobby_access_private.is_active(),dobby_access_private.assert_active() FROM dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer;
DROP SCHEMA dobby_access_legacy RESTRICT;
GRANT dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer,dobby_access_writer TO postgres WITH INHERIT FALSE, SET FALSE;
NOTIFY pgrst,'reload schema';
COMMIT;

-- Run under the existing Storage owners' delegated administration.
-- All constraints, grants, and creation of the private bucket commit together.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
DECLARE
  writer oid := to_regrole('dobby_health_writer');
  health_schema oid := to_regnamespace('dobby_health_private');
BEGIN
  IF current_user <> 'supabase_storage_admin' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Santé 03 exige le propriétaire effectif Storage';
  END IF;
  IF NOT EXISTS (
    SELECT FROM pg_class WHERE oid = to_regclass('storage.objects')
      AND relowner = current_user::regrole AND relrowsecurity
  ) OR NOT EXISTS (
    SELECT FROM pg_class WHERE oid = to_regclass('storage.buckets')
      AND relowner = current_user::regrole AND relrowsecurity
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Santé 03 exige le propriétaire effectif des tables Storage avec RLS actif';
  END IF;
  IF health_schema IS NULL OR NOT has_schema_privilege(health_schema, 'USAGE') THEN
    RAISE EXCEPTION 'Santé 03 exige les objets et la délégation de schéma de 01-proposition.sql.';
  END IF;
  IF to_regprocedure('dobby_health_private.storage_allowed(text,boolean)') IS NULL
     OR to_regprocedure('storage.allow_only_operation(text)') IS NULL
     OR NOT EXISTS (SELECT FROM pg_roles WHERE oid = writer AND NOT rolcanlogin
                    AND NOT rolbypassrls AND NOT rolsuper AND NOT rolcreaterole)
     OR EXISTS (SELECT FROM pg_auth_members WHERE roleid = writer OR member = writer) THEN
    RAISE EXCEPTION 'Santé 03 exige les objets Santé et le writer fermé par 02-fermer-role.sql.';
  END IF;
  IF NOT has_schema_privilege('dobby_health_writer', 'storage', 'USAGE') THEN
    IF NOT has_schema_privilege('storage', 'USAGE WITH GRANT OPTION') THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Santé 03 exige USAGE sur storage accordé au writer par le propriétaire du schéma';
    END IF;
    GRANT USAGE ON SCHEMA storage TO dobby_health_writer;
  END IF;
  IF EXISTS (SELECT FROM storage.buckets WHERE id = 'dobby-health-files' OR name = 'dobby-health-files') THEN
    RAISE EXCEPTION 'Le bucket Santé existe déjà. Vérifier le catalogue, les politiques et la configuration.';
  END IF;
END $$;

GRANT SELECT (id, public, file_size_limit, allowed_mime_types) ON storage.buckets TO dobby_health_writer;
CREATE POLICY dobby_health_bucket_read ON storage.buckets FOR SELECT TO dobby_health_writer
  USING (id = 'dobby-health-files');
CREATE POLICY dobby_health_bucket_scope ON storage.buckets AS RESTRICTIVE FOR SELECT TO dobby_health_writer
  USING (id = 'dobby-health-files');
CREATE POLICY dobby_health_bucket_isolate_insert ON storage.buckets AS RESTRICTIVE FOR INSERT TO PUBLIC
  WITH CHECK (id <> 'dobby-health-files');
CREATE POLICY dobby_health_bucket_isolate_update ON storage.buckets AS RESTRICTIVE FOR UPDATE TO PUBLIC
  USING (id <> 'dobby-health-files') WITH CHECK (id <> 'dobby-health-files');
CREATE POLICY dobby_health_bucket_isolate_delete ON storage.buckets AS RESTRICTIVE FOR DELETE TO PUBLIC
  USING (id <> 'dobby-health-files');
GRANT SELECT (bucket_id, name, metadata) ON storage.objects TO dobby_health_writer;
CREATE POLICY dobby_health_finalize_object ON storage.objects FOR SELECT TO dobby_health_writer
  USING (bucket_id = 'dobby-health-files');
CREATE POLICY dobby_health_finalize_scope ON storage.objects AS RESTRICTIVE FOR SELECT TO dobby_health_writer
  USING (bucket_id = 'dobby-health-files');

-- Restrictive policies protect this bucket even in the presence of broader
-- permissive policies. Signed URLs and listing have no matching operation.
CREATE POLICY dobby_health_isolate_read ON storage.objects AS RESTRICTIVE FOR SELECT TO PUBLIC
  USING (bucket_id <> 'dobby-health-files' OR current_user IN ('authenticated','dobby_health_writer'));
CREATE POLICY dobby_health_authorize_read ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated
  USING (CASE WHEN bucket_id = 'dobby-health-files' THEN
    storage.allow_only_operation('storage.object.get_authenticated') AND
    dobby_health_private.storage_allowed(name, false)
  ELSE true END);
CREATE POLICY dobby_health_isolate_upload ON storage.objects AS RESTRICTIVE FOR INSERT TO PUBLIC
  WITH CHECK (bucket_id <> 'dobby-health-files' OR current_user = 'authenticated');
CREATE POLICY dobby_health_authorize_upload ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (CASE WHEN bucket_id = 'dobby-health-files' THEN
    storage.allow_only_operation('storage.object.upload') AND dobby_health_private.storage_allowed(name, true)
  ELSE true END);
CREATE POLICY dobby_health_isolate_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO PUBLIC
  USING (bucket_id <> 'dobby-health-files') WITH CHECK (bucket_id <> 'dobby-health-files');
CREATE POLICY dobby_health_isolate_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO PUBLIC
  USING (bucket_id <> 'dobby-health-files');

CREATE POLICY dobby_health_storage_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dobby-health-files');
CREATE POLICY dobby_health_storage_upload ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dobby-health-files');

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('dobby-health-files', 'dobby-health-files', false, 10485760,
        ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
COMMIT;

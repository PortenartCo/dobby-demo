-- Lot 2B LOCAL rollback drill. Hosted rollback requires separate approval and
-- closed application ingress: removing this policy reopens native signing.
-- Preserve Lot 1/Lot 2A, all eight native policies, ACLs, buckets and bytes.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
SET LOCAL search_path='';
-- Hold before fingerprint verification, not only at the eventual DROP.
LOCK TABLE storage.objects IN SHARE ROW EXCLUSIVE MODE;
DO $installer$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND
  (rolsuper OR rolname='postgres' OR oid=(SELECT relowner FROM pg_class WHERE oid=to_regclass('storage.objects')))) THEN
  RAISE EXCEPTION 'Verified existing Storage installer required';
 END IF;
END $installer$;
CREATE TEMP TABLE access_2b_rollback_reference(bucket_id text,name text) ON COMMIT DROP;
CREATE POLICY dobby_access_storage_native ON pg_temp.access_2b_rollback_reference AS RESTRICTIVE FOR ALL TO authenticated
USING(bucket_id<>'dobby-family-files' OR (dobby_access_private.is_active() AND storage.allow_any_operation(ARRAY[
 'storage.object.get_authenticated','storage.object.list',
 'object.get_authenticated_info','object.head_authenticated_info',
 'storage.object.upload','storage.object.upload_update','storage.object.copy',
 'storage.object.move','storage.object.delete','storage.object.delete_many']::text[])))
WITH CHECK(bucket_id<>'dobby-family-files' OR (dobby_access_private.is_active() AND storage.allow_any_operation(ARRAY[
 'storage.object.get_authenticated','storage.object.list',
 'object.get_authenticated_info','object.head_authenticated_info',
 'storage.object.upload','storage.object.upload_update','storage.object.copy',
 'storage.object.move','storage.object.delete','storage.object.delete_many']::text[])));
DO $verify$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_policy actual CROSS JOIN pg_policy expected
  WHERE actual.polrelid='storage.objects'::regclass AND actual.polname='dobby_access_storage_native'
   AND expected.polrelid='pg_temp.access_2b_rollback_reference'::regclass
   AND md5(jsonb_build_array(actual.polcmd,actual.polpermissive,actual.polroles::text,pg_get_expr(actual.polqual,actual.polrelid),pg_get_expr(actual.polwithcheck,actual.polrelid))::text)
    =md5(jsonb_build_array(expected.polcmd,expected.polpermissive,expected.polroles::text,pg_get_expr(expected.polqual,expected.polrelid),pg_get_expr(expected.polwithcheck,expected.polrelid))::text)) THEN
  RAISE EXCEPTION 'Lot 2B policy absent or changed; refuse rollback';
 END IF;
END $verify$;
DROP POLICY dobby_access_storage_native ON storage.objects;
COMMIT;

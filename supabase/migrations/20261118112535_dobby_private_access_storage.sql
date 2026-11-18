-- Lot 2B LOCAL candidate. Hosted execution requires separately approved
-- catalog/installer/session-RLS verification and extinction of old signed
-- download/upload capabilities. No Auth, owner, role or bucket repair here.
-- Native requests started after suspension are checked against the registry;
-- this policy does not cancel responses or mutations already in flight.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
SET LOCAL search_path='';
SET LOCAL standard_conforming_strings=on;
-- Serialize policy catalog verification with CREATE/ALTER/DROP POLICY.
-- This existing maintenance capability is not granted by this candidate.
LOCK TABLE storage.objects, storage.buckets IN SHARE ROW EXCLUSIVE MODE;

DO $prerequisites$
DECLARE objects_owner oid;
BEGIN
 SELECT relowner INTO objects_owner FROM pg_class
  WHERE oid=to_regclass('storage.objects') AND relkind='r' AND relrowsecurity;
 IF objects_owner IS NULL OR NOT EXISTS(SELECT 1 FROM pg_roles
  WHERE rolname=current_user AND (rolsuper OR oid=objects_owner OR rolname='postgres')) THEN
  RAISE EXCEPTION 'Verified existing installer and RLS-enabled Storage objects required';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated')
  AND (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication))
  OR pg_has_role('authenticated',objects_owner,'MEMBER')
  OR pg_has_role('anon',objects_owner,'MEMBER') THEN
  RAISE EXCEPTION 'Browser roles must not bypass RLS or own Storage objects';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('storage.buckets') AND relrowsecurity AND relowner=objects_owner) THEN
  RAISE EXCEPTION 'RLS-enabled bucket metadata required';
 END IF;
 PERFORM 1 FROM storage.buckets WHERE id='dobby-family-files' AND public=false FOR SHARE;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Existing private family bucket required; no bucket repair';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname='dobby_access_storage_native') THEN
  RAISE EXCEPTION 'Lot 2B already present; verify, do not reinstall';
 END IF;
 IF to_regnamespace('dobby_access_legacy') IS NULL
  OR to_regprocedure('storage.allow_any_operation(text[])') IS NULL
  OR to_regprocedure('storage.operation()') IS NULL THEN
  RAISE EXCEPTION 'Lot 1, Lot 2A and reviewed operation-aware Storage required';
 END IF;
 IF has_schema_privilege('anon','dobby_access_legacy','USAGE')
  OR has_schema_privilege('authenticated','dobby_access_legacy','USAGE')
  OR has_schema_privilege('anon','storage','CREATE')
  OR has_schema_privilege('authenticated','storage','CREATE')
  OR has_schema_privilege('anon','dobby_access_private','CREATE')
  OR has_schema_privilege('authenticated','dobby_access_private','CREATE')
  OR has_function_privilege('anon','dobby_access_private.session_is_live(uuid,uuid,timestamptz)','EXECUTE')
  OR has_function_privilege('authenticated','dobby_access_private.session_is_live(uuid,uuid,timestamptz)','EXECUTE')
  OR has_function_privilege('anon','dobby_access_private.request_identity()','EXECUTE')
  OR has_function_privilege('authenticated','dobby_access_private.request_identity()','EXECUTE') THEN
  RAISE EXCEPTION 'Unexpected browser privileges on private authorization helpers';
 END IF;
 IF coalesce(current_setting('pgrst.db_schemas',true),'') ~ '(^|,)[[:space:]]*(dobby_access_private|dobby_access_legacy|dobby_socle_private)([[:space:]]*,|$)' THEN
  RAISE EXCEPTION 'Private helper schema must not be exposed by PostgREST';
 END IF;
 IF NOT has_function_privilege('authenticated','dobby_access_private.is_active()','EXECUTE')
  OR NOT has_schema_privilege('authenticated','dobby_access_private','USAGE') THEN
  RAISE EXCEPTION 'Existing authorization predicate privileges required';
 END IF;
END $prerequisites$;

-- Body fingerprints derive from the immutable published Lot 1 migration and
-- Lot 2A wrapper generator/reference manifest, not the observed target catalog.
CREATE TEMP TABLE access_2b_helpers(signature text PRIMARY KEY,body_md5 text,owner_name name,definer boolean,volatility "char") ON COMMIT DROP;
INSERT INTO pg_temp.access_2b_helpers VALUES
 ('dobby_access_private.request_identity()','45ab5b25e8db10fbb2badfd5dccff947','dobby_access_writer',false,'s'),
 ('dobby_access_private.session_is_live(uuid,uuid,timestamptz)','50c8a15b049d77355f9a81c930dc937c','dobby_access_session_reader',true,'s'),
 ('dobby_access_private.is_active()','7f3830f9d660d937f6cc0b3442d81f54','dobby_access_writer',true,'s'),
 ('dobby_socle_private.is_parent(uuid)','e208a01d61f3fa8f35e9e899586644b3','dobby_socle_writer',true,'s'),
 ('dobby_socle_private.can_read(uuid)','41639062e2d0e094665240c7f7ccc2db','dobby_socle_writer',true,'s'),
 ('dobby_socle_private.actor_context(uuid,boolean)','fbc6a5ae19869669809bcb4a65eeec02','dobby_socle_writer',true,'v'),
 ('dobby_access_legacy.dobby_socle_private__is_parent(uuid)','38dc1537cf6c738321f205db9e27f571','dobby_socle_writer',true,'s'),
 ('dobby_access_legacy.dobby_socle_private__can_read(uuid)','05141408bf4ae637b333a2e6a5aafcd2','dobby_socle_writer',true,'s'),
 ('dobby_access_legacy.dobby_socle_private__actor_context(uuid,boolean)','d48e72bb46e5864d2bb39bde451da3dc','dobby_socle_writer',true,'v');
DO $helpers$
DECLARE r text;
BEGIN
 IF EXISTS(SELECT 1 FROM pg_temp.access_2b_helpers h LEFT JOIN pg_proc p ON p.oid=to_regprocedure(h.signature)
  WHERE p.oid IS NULL OR md5(p.prosrc)<>h.body_md5 OR pg_get_userbyid(p.proowner)<>h.owner_name
   OR p.prosecdef<>h.definer OR p.provolatile<>h.volatility OR p.proconfig IS DISTINCT FROM ARRAY['search_path=""']::text[]
   OR p.prorettype NOT IN ('boolean'::regtype,'uuid'::regtype,'jsonb'::regtype)) THEN
  RAISE EXCEPTION 'Published authorization/family helper definition drift; review required';
 END IF;
 FOREACH r IN ARRAY ARRAY['dobby_access_writer','dobby_access_session_reader','dobby_socle_writer'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication))
   OR pg_has_role('anon',r,'MEMBER') OR pg_has_role('authenticated',r,'MEMBER') THEN
   RAISE EXCEPTION 'Existing closed helper role required: %',r;
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='dobby_access_legacy'
   AND (has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE'))) THEN
  RAISE EXCEPTION 'Native family copies must remain closed';
 END IF;
END $helpers$;

-- Exact reviewed Supabase Storage v1.89.12 sources: tenant migrations
-- 0024-operation-function.sql and 0058-operation-ergonomics.sql.
DO $storage_helpers$
DECLARE expected_operation text:=$source$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$source$;
 expected_any text:=$source$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$source$;
BEGIN
 IF EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid IN ('storage.operation()'::regprocedure,'storage.allow_any_operation(text[])'::regprocedure)
  AND (p.prosecdef OR p.provolatile<>'s' OR p.proconfig IS NOT NULL
   OR p.proowner<>(SELECT relowner FROM pg_class WHERE oid='storage.objects'::regclass)
   OR p.prorettype<>CASE WHEN p.oid='storage.operation()'::regprocedure THEN 'text'::regtype ELSE 'boolean'::regtype END
   OR md5(p.prosrc)<>md5(CASE WHEN p.oid='storage.operation()'::regprocedure THEN expected_operation ELSE expected_any END))) THEN
  RAISE EXCEPTION 'Reviewed Storage operation helper definition required';
 END IF;
END $storage_helpers$;

-- Current foldername comes from the pinned image's tenant migration 0060,
-- which replaces 0002. Every family policy depends on this path parser.
DO $path_helper$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang
  WHERE p.oid=to_regprocedure('storage.foldername(text)')
   AND md5(p.prosrc)='d74c9ac376970bf5b265ecb58e855df9'
   AND l.lanname='plpgsql' AND p.prorettype='text[]'::regtype
   AND p.proowner=(SELECT relowner FROM pg_class WHERE oid='storage.objects'::regclass)
   AND NOT p.prosecdef AND p.provolatile='i' AND p.proconfig IS NULL
   AND p.proargnames=ARRAY['name']::text[] AND p.pronargdefaults=0
   AND NOT p.proretset AND NOT p.proisstrict AND p.proparallel='u') THEN
  RAISE EXCEPTION 'Reviewed Storage foldername helper definition required';
 END IF;
END $path_helper$;

-- Parse the published policies on a temporary mirror, then compare canonical
-- catalog fingerprints. This is source-derived and independent of target
-- whitespace, pretty printing or the observed policy definitions.
CREATE TEMP TABLE objects(bucket_id text,name text) ON COMMIT DROP;
CREATE POLICY dobby_family_files_read ON pg_temp.objects FOR SELECT TO authenticated
USING(bucket_id='dobby-family-files' AND EXISTS(SELECT 1 FROM public.dobby_v2_memberships m WHERE m.active=true AND m.user_id=(SELECT auth.uid()) AND m.household_id::text=(storage.foldername(name))[1]));
CREATE POLICY dobby_family_files_upload ON pg_temp.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='dobby-family-files' AND EXISTS(SELECT 1 FROM public.dobby_v2_memberships m WHERE m.active=true AND m.user_id=(SELECT auth.uid()) AND m.household_id::text=(storage.foldername(name))[1]));
CREATE POLICY dobby_family_files_delete ON pg_temp.objects FOR DELETE TO authenticated
USING(bucket_id='dobby-family-files' AND EXISTS(SELECT 1 FROM public.dobby_v2_memberships m WHERE m.active=true AND m.user_id=(SELECT auth.uid()) AND m.household_id::text=(storage.foldername(name))[1]));
CREATE POLICY dobby_socle_parent_insert ON pg_temp.objects AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK(bucket_id<>'dobby-family-files' OR CASE WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN dobby_socle_private.is_parent(((storage.foldername(name))[1])::uuid) ELSE false END);
CREATE POLICY dobby_socle_parent_update ON pg_temp.objects AS RESTRICTIVE FOR UPDATE TO authenticated
USING(bucket_id<>'dobby-family-files' OR CASE WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN dobby_socle_private.is_parent(((storage.foldername(name))[1])::uuid) ELSE false END)
WITH CHECK(bucket_id<>'dobby-family-files' OR CASE WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN dobby_socle_private.is_parent(((storage.foldername(name))[1])::uuid) ELSE false END);
CREATE POLICY dobby_socle_parent_delete ON pg_temp.objects AS RESTRICTIVE FOR DELETE TO authenticated
USING(bucket_id<>'dobby-family-files' OR CASE WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN dobby_socle_private.is_parent(((storage.foldername(name))[1])::uuid) ELSE false END);
CREATE POLICY dobby_socle_canonical_read ON pg_temp.objects AS RESTRICTIVE FOR SELECT TO authenticated
USING(bucket_id<>'dobby-family-files' OR CASE WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN dobby_socle_private.can_read(((storage.foldername(name))[1])::uuid) ELSE false END);
CREATE POLICY dobby_socle_parent_update_allow ON pg_temp.objects AS PERMISSIVE FOR UPDATE TO authenticated
USING(bucket_id='dobby-family-files' AND CASE WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN dobby_socle_private.is_parent(((storage.foldername(name))[1])::uuid) ELSE false END)
WITH CHECK(bucket_id='dobby-family-files' AND CASE WHEN (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN dobby_socle_private.is_parent(((storage.foldername(name))[1])::uuid) ELSE false END);

DO $policies$
DECLARE entry record; expression text; literal text[];
BEGIN
 IF EXISTS(SELECT 1 FROM pg_policy expected LEFT JOIN pg_policy actual
  ON actual.polrelid='storage.objects'::regclass AND actual.polname=expected.polname
  WHERE expected.polrelid='pg_temp.objects'::regclass
   AND (actual.oid IS NULL OR
    md5(jsonb_build_array(actual.polcmd,actual.polpermissive,actual.polroles::text,pg_get_expr(actual.polqual,actual.polrelid),pg_get_expr(actual.polwithcheck,actual.polrelid))::text)
    IS DISTINCT FROM md5(jsonb_build_array(expected.polcmd,expected.polpermissive,expected.polroles::text,pg_get_expr(expected.polqual,expected.polrelid),pg_get_expr(expected.polwithcheck,expected.polrelid))::text))) THEN
  RAISE EXCEPTION 'Published eight Storage policies drifted or missing';
 END IF;
 FOR entry IN SELECT * FROM pg_policy p WHERE p.polpermissive
  AND (p.polrelid='storage.objects'::regclass OR (p.polrelid='storage.buckets'::regclass AND p.polcmd IN ('a','w','d','*')))
  AND NOT EXISTS(SELECT 1 FROM pg_policy e WHERE p.polrelid='storage.objects'::regclass AND e.polrelid='pg_temp.objects'::regclass AND e.polname=p.polname)
  AND (0=ANY(p.polroles) OR EXISTS(SELECT 1 FROM unnest(p.polroles) role_oid WHERE role_oid<>0
   AND (pg_has_role('authenticated',role_oid,'MEMBER') OR pg_has_role('anon',role_oid,'MEMBER')))) LOOP
  -- NULL USING means true for read/delete/update commands. A narrow CHECK
  -- alone does not make such an extra policy disjoint from family reads.
  IF entry.polcmd IN ('r','w','d','*') AND entry.polqual IS NULL THEN
   RAISE EXCEPTION 'Unbounded USING in permissive Storage policy: %',entry.polname;
  END IF;
  -- Accept only literal equalities to a different bucket. No OR, helper,
  -- prefix, inequality or arbitrary expression is assumed disjoint.
  FOREACH expression IN ARRAY ARRAY[pg_get_expr(entry.polqual,entry.polrelid),pg_get_expr(entry.polwithcheck,entry.polrelid)] LOOP
   IF expression IS NOT NULL THEN
    literal:=regexp_match(expression,CASE WHEN entry.polrelid='storage.buckets'::regclass
     THEN $pattern$^\(id = ('(?:[^']|'')*')::text\)$$pattern$
     ELSE $pattern$^\(bucket_id = ('(?:[^']|'')*')::text\)$$pattern$ END);
    IF literal IS NULL OR literal[1]=quote_literal('dobby-family-files') THEN
     RAISE EXCEPTION 'Unreviewed permissive Storage policy: %',entry.polname;
    END IF;
   END IF;
  END LOOP;
  IF entry.polqual IS NULL AND entry.polwithcheck IS NULL THEN
   RAISE EXCEPTION 'Unbounded permissive Storage policy: %',entry.polname;
  END IF;
 END LOOP;
END $policies$;

-- Sole permanent addition. The other-bucket branch leaves unrelated policies
-- unchanged. The native family policies still decide source/destination and
-- Parent/Enfant permissions. Missing/unknown operations fail closed.
CREATE POLICY dobby_access_storage_native ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
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
COMMIT;

-- Read-only catalog report. Run as each proposed authority before its phase.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '15s';

SELECT current_user AS effective_role, session_user AS connection_role,
       current_setting('server_version_num')::integer >= 170000 AS postgres_17_or_later;

WITH expected(kind, schema_name, relation_name) AS (
  VALUES
    ('schema', 'public', NULL),
    ('schema', 'dobby_v7_private', NULL),
    ('schema', 'dobby_socle_private', NULL),
    ('schema', 'dobby_health_private', NULL),
    ('schema', 'storage', NULL),
    ('relation', 'public', 'dobby_v2_modules'),
    ('relation', 'public', 'dobby_v2_households'),
    ('relation', 'public', 'dobby_v2_memberships'),
    ('relation', 'storage', 'objects'),
    ('relation', 'storage', 'buckets'),
    ('relation', 'dobby_health_private', 'install_state')
), objects AS (
  SELECT kind, concat_ws('.', schema_name, relation_name) AS object_name, n.oid AS schema_oid,
         c.oid AS relation_oid, c.relrowsecurity,
         CASE WHEN kind = 'schema' THEN n.nspowner ELSE c.relowner END AS owner_oid
  FROM expected e
  LEFT JOIN pg_namespace n ON n.nspname = e.schema_name
  LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = e.relation_name
)
SELECT kind, object_name, owner_oid IS NOT NULL AS present, pg_get_userbyid(owner_oid) AS owner,
       relrowsecurity AS rls,
       CASE WHEN kind = 'schema' AND schema_oid IS NOT NULL
         THEN has_schema_privilege(schema_oid, 'USAGE WITH GRANT OPTION') END AS can_grant_usage,
       CASE WHEN owner_oid IS NOT NULL THEN pg_has_role(owner_oid, 'SET') END AS can_set_owner
FROM objects ORDER BY kind, object_name;

WITH expected(schema_name, function_name, args) AS (
  VALUES ('dobby_socle_private', 'actor_context', 'uuid, boolean'), ('dobby_v7_private', 'actor', ''),
         ('storage', 'allow_only_operation', 'text'), ('public', 'dobby_health_capabilities', 'uuid')
)
SELECT format('%s.%s(%s)', schema_name, function_name, args) AS signature,
       p.oid IS NOT NULL AS present, pg_get_userbyid(p.proowner) AS owner,
       CASE WHEN p.oid IS NOT NULL THEN has_function_privilege(p.oid, 'EXECUTE WITH GRANT OPTION') END AS can_grant_execute,
       CASE WHEN p.oid IS NOT NULL THEN pg_has_role(p.proowner, 'SET') END AS can_set_owner
FROM expected e
LEFT JOIN pg_namespace n ON n.nspname = e.schema_name
LEFT JOIN pg_proc p ON p.pronamespace = n.oid AND p.proname = e.function_name AND oidvectortypes(p.proargtypes) = e.args
ORDER BY signature;

SELECT r.rolname AS writer, r.rolcanlogin, r.rolcreaterole, r.rolbypassrls, r.rolsuper,
       pg_get_userbyid(m.member) AS member, pg_get_userbyid(m.grantor) AS grantor,
       m.admin_option, m.inherit_option, m.set_option
FROM pg_roles r LEFT JOIN pg_auth_members m ON r.oid = m.roleid
WHERE r.rolname = 'dobby_health_writer';

SELECT t.tgrelid::regclass AS relation, t.tgname, t.tgenabled, t.tgfoid::regprocedure AS trigger_function
FROM pg_trigger t
WHERE NOT t.tgisinternal AND t.tgname IN (
  'dobby_family_identity_lifecycle', 'dobby_health_legacy_activation_guard', 'dobby_health_legacy_snapshot_guard'
)
ORDER BY 1, 2;

SELECT polrelid::regclass AS relation, polname, polcmd, polpermissive, polroles
FROM pg_policy WHERE polname LIKE 'dobby_health_%' ORDER BY 1, 2;

-- Check configured values only for callers with access. No health rows are read.
DO $$
DECLARE details jsonb; buckets oid; state oid;
BEGIN
  SELECT c.oid INTO buckets FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'storage' AND c.relname = 'buckets' AND has_schema_privilege(n.oid, 'USAGE');
  IF buckets IS NOT NULL AND
     has_column_privilege(buckets, 'id', 'SELECT') AND
     has_column_privilege(buckets, 'public', 'SELECT') AND
     has_column_privilege(buckets, 'file_size_limit', 'SELECT') AND
     has_column_privilege(buckets, 'allowed_mime_types', 'SELECT') THEN
    SELECT jsonb_build_object('private', NOT public, 'size_limit', file_size_limit, 'mimes', allowed_mime_types)
    INTO details FROM storage.buckets WHERE id = 'dobby-health-files';
    RAISE NOTICE 'Bucket Santé visible dans cette session = %', coalesce(details::text, 'absent ou masqué par RLS');
  ELSE
    RAISE NOTICE 'Configuration du bucket Santé à vérifier dans la session du propriétaire Storage';
  END IF;
  SELECT c.oid INTO state FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'dobby_health_private' AND c.relname = 'install_state' AND has_schema_privilege(n.oid, 'USAGE');
  IF state IS NOT NULL AND has_table_privilege(state, 'SELECT') THEN
    SELECT jsonb_build_object('enabled', enabled, 'legacyClosed', to_jsonb(s)->'legacy_closed')
    INTO details FROM dobby_health_private.install_state s WHERE singleton;
    RAISE NOTICE 'État de publication visible = %', coalesce(details::text, 'absent ou masqué par RLS');
  END IF;
END $$;
COMMIT;

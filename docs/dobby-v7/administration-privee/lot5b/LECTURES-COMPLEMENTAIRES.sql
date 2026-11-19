-- Proposed metadata reads only. Not executed against the hosted project.
-- No Auth/user rows, file paths, secrets, or raw function definitions.
BEGIN READ ONLY;

SELECT current_user,current_setting('server_version') AS postgres_version;
SELECT rolname,rolcanlogin,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolreplication
FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','authenticator','service_role',
 'dobby_v7_writer','dobby_socle_writer','dobby_missions_v2_writer',
 'dobby_access_session_reader','dobby_access_identity_reader') ORDER BY rolname;

WITH RECURSIVE reachable(oid) AS (
 SELECT oid FROM pg_roles WHERE rolname='postgres'
 UNION
 SELECT m.roleid FROM pg_auth_members m JOIN reachable r ON m.member=r.oid
)
SELECT pg_get_userbyid(m.roleid) AS role_name,pg_get_userbyid(m.member) AS member,
 pg_get_userbyid(m.grantor) AS grantor,m.admin_option,m.inherit_option,m.set_option
FROM pg_auth_members m
WHERE m.member IN (SELECT oid FROM reachable)
 OR m.roleid IN (SELECT oid FROM pg_roles WHERE rolname IN
 ('dobby_v7_writer','dobby_socle_writer','dobby_missions_v2_writer'))
ORDER BY role_name,member,grantor;

SELECT n.nspname,c.relname,pg_get_userbyid(c.relowner) AS owner,c.relrowsecurity,c.relforcerowsecurity,
 (SELECT count(*) FROM pg_policy p WHERE p.polrelid=c.oid) AS policy_count
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE (n.nspname='auth' AND c.relname IN ('users','sessions'))
 OR (n.nspname='storage' AND c.relname IN ('objects','buckets'))
ORDER BY n.nspname,c.relname;

SELECT r.rolname,c.relname,a.attname,format_type(a.atttypid,a.atttypmod) AS column_type,
 has_schema_privilege(r.oid,n.oid,'USAGE') AS schema_usage,
 has_schema_privilege(r.oid,n.oid,'USAGE WITH GRANT OPTION') AS can_grant_schema_usage,
 has_column_privilege(r.oid,c.oid,a.attnum,'SELECT') AS column_select
FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
WHERE r.rolname IN ('postgres','dobby_access_session_reader','dobby_access_identity_reader') AND n.nspname='auth'
 AND ((c.relname='sessions' AND a.attname IN ('id','user_id','created_at','not_after'))
 OR (c.relname='users' AND a.attname IN ('id','email','email_confirmed_at')))
ORDER BY r.rolname,c.relname,a.attname;

SELECT c.relname,has_schema_privilege('postgres',n.oid,'USAGE') AS schema_usage,
 has_schema_privilege('postgres',n.oid,'CREATE') AS schema_create,
 pg_has_role('postgres',c.relowner,'USAGE') AS owner_privileges,
 has_table_privilege('postgres',c.oid,'MAINTAIN,UPDATE,DELETE,TRUNCATE') AS any_full_lock_privilege,
 has_database_privilege('postgres',current_database(),'TEMP') AS database_temp
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='storage' AND c.relname IN ('objects','buckets') ORDER BY c.relname;

WITH settings AS (
 SELECT nullif(current_setting('supautils.policy_grants',true),'') AS grants
)
SELECT current_setting('supautils.version',true) AS supautils_version,
 current_setting('shared_preload_libraries',true) AS shared_preload_libraries,
 CASE WHEN grants IS NULL THEN NULL ELSE (grants::jsonb->'postgres') ? 'storage.objects' END AS configured_objects_policy_grant,
 CASE WHEN grants IS NULL THEN NULL ELSE (grants::jsonb->'postgres') ? 'storage.buckets' END AS configured_buckets_policy_grant
FROM settings;

SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,
 pg_get_userbyid(p.proowner) AS owner,p.prosecdef,format_type(p.prorettype,NULL) AS result_type,
 md5(p.prosrc) AS body_md5,md5(pg_get_functiondef(p.oid)) AS definition_md5
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='dobby_runes_private' AND p.proname IN ('assert_event','assert_ledger','assert_mission',
 'assert_payload','event_key','has_native_text','lock_active_membership','request_user_id',
 'safe_integer','same_award','utf16_length','valid_date')
ORDER BY p.proname,arguments;

SELECT t.tgname,n.nspname,c.relname,t.tgenabled,t.tgtype,
 md5(pg_get_triggerdef(t.oid)) AS definition_md5
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace f ON f.oid=p.pronamespace
WHERE f.nspname='public' AND p.proname='dobby_sync_stamper' AND NOT t.tgisinternal
ORDER BY n.nspname,c.relname,t.tgname;
ROLLBACK;

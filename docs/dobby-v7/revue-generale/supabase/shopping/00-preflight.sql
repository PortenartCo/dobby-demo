-- MANUAL ONLY. Read-only metadata. Never executed by Codex.
-- Intended solely for the personal DOBBY project, first in an isolated test DB.
BEGIN READ ONLY;
SELECT table_schema,table_name,column_name,data_type,is_nullable,column_default,numeric_precision,numeric_scale
FROM information_schema.columns
WHERE table_schema='public' AND table_name='dobby_v2_grocery'
ORDER BY ordinal_position;
SELECT conname,pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid=to_regclass('public.dobby_v2_grocery');
SELECT tgname,pg_get_triggerdef(oid) AS trigger_definition,pg_get_functiondef(tgfoid) AS function_definition
FROM pg_trigger WHERE tgrelid=to_regclass('public.dobby_v2_grocery') AND NOT tgisinternal;
SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid=to_regclass('public.dobby_v2_grocery');
SELECT policyname,roles,cmd,qual,with_check FROM pg_policies
WHERE schemaname='public' AND tablename='dobby_v2_grocery';
SELECT grantee,privilege_type,column_name FROM information_schema.column_privileges
WHERE table_schema='public' AND table_name='dobby_v2_grocery';
COMMIT;

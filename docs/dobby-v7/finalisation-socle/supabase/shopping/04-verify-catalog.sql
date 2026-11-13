-- MANUAL USER EXECUTION ONLY, solely in the personal dobby-family-sync project.
-- Complements the unchanged original shopping/02-verify.sql after installation.
-- Catalog metadata only. No account/article rows, RPC calls or runtime UPDATE.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
WITH target AS (
 SELECT c.oid,c.relrowsecurity,c.relforcerowsecurity
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname='dobby_v2_grocery' AND c.relkind='r'
), availability AS (
 SELECT a.*,pg_catalog.pg_get_expr(d.adbin,d.adrelid) AS default_expression
 FROM target t JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid
 LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
 WHERE a.attname='at_home_quantity' AND NOT a.attisdropped
), checks AS (
 SELECT
  EXISTS(SELECT FROM target) AS table_present,
  EXISTS(SELECT FROM availability a
   WHERE a.atttypid='pg_catalog.numeric'::regtype AND a.atttypmod=-1
    AND a.attnotnull AND a.attidentity='' AND a.attgenerated=''
    AND COALESCE(a.default_expression,'') ~ '^\(?0\)?(::numeric)?$') AS column_contract,
  EXISTS(SELECT FROM target t JOIN pg_catalog.pg_constraint c ON c.conrelid=t.oid
   WHERE c.conname='dobby_v2_grocery_at_home_quantity_range'
    AND c.contype='c' AND c.convalidated
    AND replace(pg_catalog.regexp_replace(pg_catalog.pg_get_expr(c.conbin,c.conrelid),
     '[[:space:]()]','','g'),'::numeric','')=
     'at_home_quantity>=0ANDat_home_quantity<=999999') AS range_contract,
  EXISTS(SELECT FROM target t JOIN pg_catalog.pg_attribute a ON a.attrelid=t.oid
   WHERE a.attname='quantity' AND NOT a.attisdropped AND NOT a.attnotnull
    AND pg_catalog.format_type(a.atttypid,a.atttypmod)='numeric(12,2)') AS native_quantity_preserved,
  EXISTS(SELECT FROM target t JOIN pg_catalog.pg_constraint c ON c.conrelid=t.oid
   WHERE c.conname='dobby_v2_grocery_pkey' AND c.contype='p' AND c.convalidated) AS primary_key_preserved,
  EXISTS(SELECT FROM target t JOIN pg_catalog.pg_constraint c ON c.conrelid=t.oid
   WHERE c.conname='dobby_v2_grocery_household_id_import_source_id_key'
    AND c.contype='u' AND c.convalidated) AS import_receipt_unique_preserved,
  EXISTS(SELECT FROM target t JOIN pg_catalog.pg_trigger g ON g.tgrelid=t.oid
   JOIN pg_catalog.pg_proc p ON p.oid=g.tgfoid
   WHERE NOT g.tgisinternal AND g.tgenabled IN ('O','A')
    AND (g.tgtype::integer & 19)=19 AND g.tgattr::text='' AND g.tgqual IS NULL
    AND p.oid=pg_catalog.to_regprocedure('public.dobby_v2_grocery_stamp()')
    AND NOT p.prosecdef
    AND md5(pg_catalog.pg_get_functiondef(p.oid))='ee36503542de1162beba0eed99ac4874') AS reviewed_revision_trigger_preserved,
  COALESCE((SELECT t.relrowsecurity FROM target t),false) AS rls_enabled,
  EXISTS(SELECT FROM target t CROSS JOIN availability a
   JOIN pg_catalog.pg_roles r ON r.rolname='authenticated'
   WHERE NOT r.rolsuper AND NOT r.rolbypassrls
    AND pg_catalog.has_schema_privilege(r.oid,'public','USAGE')
    AND pg_catalog.has_table_privilege(r.oid,t.oid,'SELECT')
    AND pg_catalog.has_table_privilege(r.oid,t.oid,'INSERT')
    AND pg_catalog.has_table_privilege(r.oid,t.oid,'UPDATE')
    AND pg_catalog.has_column_privilege(r.oid,t.oid,a.attnum,'SELECT')
    AND pg_catalog.has_column_privilege(r.oid,t.oid,a.attnum,'INSERT')
    AND pg_catalog.has_column_privilege(r.oid,t.oid,a.attnum,'UPDATE')) AS authenticated_access_preserved
)
SELECT pg_catalog.jsonb_build_object(
 'verification','dobby-socle-c07-observed-catalog-v1',
 'transactionReadOnly',pg_catalog.current_setting('transaction_read_only'),
 'applicationRowsRead',false,
 'catalogContractPassed',table_present AND column_contract AND range_contract
  AND native_quantity_preserved AND primary_key_preserved AND import_receipt_unique_preserved
  AND reviewed_revision_trigger_preserved AND rls_enabled AND authenticated_access_preserved,
 'checks',pg_catalog.to_jsonb(checks),
 'f09ServerVerificationRequired',true,
 'realRuntimeAndAuthorizationVerified',false,
 'noAccountOrHouseholdReset',true,
 'nextStep','Combine with the separate F09 verification and the targeted real C07 recipe; do not infer authorization from this catalog result.'
) AS shopping_verification
FROM checks;
ROLLBACK;

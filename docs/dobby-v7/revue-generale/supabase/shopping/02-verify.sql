-- MANUAL ONLY, metadata validation. Does not read user rows or alter data.
BEGIN READ ONLY;
DO $$
DECLARE c record; range_constraint record;
BEGIN
 SELECT * INTO c FROM information_schema.columns WHERE table_schema='public' AND table_name='dobby_v2_grocery' AND column_name='at_home_quantity';
 IF NOT FOUND OR c.data_type<>'numeric' OR c.is_nullable<>'NO' OR c.numeric_scale IS NOT NULL OR COALESCE(c.column_default,'') !~ '^\(?0\)?(::numeric)?$' THEN
  RAISE EXCEPTION 'availability_column_contract_failed';
 END IF;
 SELECT contype,convalidated,pg_get_expr(conbin,conrelid) AS expression
 INTO range_constraint FROM pg_constraint
 WHERE conrelid='public.dobby_v2_grocery'::regclass
  AND conname='dobby_v2_grocery_at_home_quantity_range';
 -- Exact parser-normalized expression, not a substring test: OR/extra clauses
 -- must not produce a false success. Alternate definitions require review.
 IF NOT FOUND OR range_constraint.contype IS DISTINCT FROM 'c'
  OR range_constraint.convalidated IS DISTINCT FROM true
  OR range_constraint.expression IS DISTINCT FROM '((at_home_quantity >= (0)::numeric) AND (at_home_quantity <= (999999)::numeric))' THEN
  RAISE EXCEPTION 'availability_range_contract_failed';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.dobby_v2_grocery'::regclass AND relrowsecurity) THEN
  RAISE EXCEPTION 'existing_rls_not_enabled';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.dobby_v2_grocery'::regclass AND NOT tgisinternal AND tgenabled<>'D') THEN
  RAISE EXCEPTION 'review_required_no_enabled_revision_trigger';
 END IF;
 RAISE NOTICE 'availability_metadata_verified; revision/RLS/auth runtime and two-account tests remain required';
END; $$;
SELECT 'availability_metadata_verified' AS result;
COMMIT;

-- CANDIDATE, MANUAL ONLY. Do not execute on any remote project from Codex.
-- Complete 00-preflight + README before use. No RLS, grant or trigger changes.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $$
DECLARE c record;
BEGIN
 IF to_regclass('public.dobby_v2_grocery') IS NULL THEN
  RAISE EXCEPTION 'Expected existing dobby_v2_grocery table absent; stop';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.dobby_v2_grocery'::regclass AND relrowsecurity) THEN
  RAISE EXCEPTION 'Existing table RLS must be enabled; review separately';
 END IF;
 SELECT * INTO c FROM information_schema.columns WHERE table_schema='public' AND table_name='dobby_v2_grocery' AND column_name='at_home_quantity';
 IF FOUND AND (c.data_type<>'numeric' OR c.is_nullable<>'NO' OR c.numeric_scale IS NOT NULL OR COALESCE(c.column_default,'') !~ '^\(?0\)?(::numeric)?$') THEN
  RAISE EXCEPTION 'Existing availability column contract differs; do not rewrite values or type';
 END IF;
END; $$;
ALTER TABLE public.dobby_v2_grocery ADD COLUMN IF NOT EXISTS at_home_quantity numeric NOT NULL DEFAULT 0;
DO $$
DECLARE existing record;
BEGIN
 SELECT contype,convalidated,pg_get_expr(conbin,conrelid) AS expression
 INTO existing FROM pg_constraint
 WHERE conrelid='public.dobby_v2_grocery'::regclass
  AND conname='dobby_v2_grocery_at_home_quantity_range';
 IF FOUND THEN
  -- A same-name constraint is not proof of the range contract. Refuse a
  -- different expression/type or NOT VALID instead of rewriting it or data.
  IF existing.contype IS DISTINCT FROM 'c' OR existing.convalidated IS DISTINCT FROM true
   OR existing.expression IS DISTINCT FROM '((at_home_quantity >= (0)::numeric) AND (at_home_quantity <= (999999)::numeric))' THEN
   RAISE EXCEPTION 'Existing availability range constraint differs; manual review required';
  END IF;
 ELSE
  ALTER TABLE public.dobby_v2_grocery ADD CONSTRAINT dobby_v2_grocery_at_home_quantity_range CHECK(at_home_quantity>=0 AND at_home_quantity<=999999);
 END IF;
END; $$;
-- No fixed scale: .001 kg must retain gram precision.
-- No <= quantity bound: legacy PATCH may reduce quantity while omitting availability.
NOTIFY pgrst,'reload schema';
COMMIT;

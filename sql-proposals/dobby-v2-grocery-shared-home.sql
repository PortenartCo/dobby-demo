-- PROPOSAL ONLY. Do not run on the real project without explicit authorization.
-- Preflight and staging validation: docs/dobby-v7/e07-p02-shared-home-migration.md
-- No backfill from browser state, policy/grant change, or replacement trigger.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $$
BEGIN
  IF to_regclass('public.dobby_v2_grocery') IS NULL THEN
    RAISE EXCEPTION 'Expected existing dobby_v2_grocery table is absent';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
             AND table_name='dobby_v2_grocery' AND column_name='at_home_quantity'
             AND data_type <> 'numeric') THEN
    RAISE EXCEPTION 'Existing at_home_quantity has an incompatible type; review required';
  END IF;
END $$;
ALTER TABLE public.dobby_v2_grocery
  ADD COLUMN IF NOT EXISTS at_home_quantity numeric NOT NULL DEFAULT 0;
-- Numeric without a fixed scale preserves 1 g as 0.001 kg.
-- The upper bound also excludes NaN/Infinity. Do not add <= quantity: old
-- clients may reduce quantity while omitting the new column in their PATCH.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid='public.dobby_v2_grocery'::regclass
                   AND conname='dobby_v2_grocery_at_home_quantity_range') THEN
    ALTER TABLE public.dobby_v2_grocery ADD CONSTRAINT dobby_v2_grocery_at_home_quantity_range
      CHECK (at_home_quantity >= 0 AND at_home_quantity <= 999999);
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;

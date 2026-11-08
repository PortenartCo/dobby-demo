-- DO NOT EXECUTE UNTIL BACKUP AND REVIEW.
-- PERSONAL Supabase Dobby project only; no Portenart database changes.
-- Shared non-medical household snapshots, one row per module and household.
-- Sensitive health data, documents and attachments intentionally excluded.
BEGIN;

CREATE TABLE public.dobby_v2_modules (
  household_id uuid NOT NULL REFERENCES public.dobby_v2_households(id),
  module text NOT NULL CHECK (module IN (
    'menus', 'recipes', 'missions', 'house', 'family'
  )),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(payload) = 'object'
       AND octet_length(payload::text) <= 262144),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  PRIMARY KEY (household_id, module)
);

ALTER TABLE public.dobby_v2_modules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dobby_v2_modules FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.dobby_v2_modules TO authenticated;

CREATE POLICY dobby_v2_modules_read
ON public.dobby_v2_modules FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.dobby_v2_memberships m
  WHERE m.household_id = dobby_v2_modules.household_id
    AND m.user_id = (SELECT auth.uid()) AND m.active
));

CREATE POLICY dobby_v2_modules_insert
ON public.dobby_v2_modules FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.dobby_v2_memberships m
  WHERE m.household_id = dobby_v2_modules.household_id
    AND m.user_id = (SELECT auth.uid()) AND m.active
));

CREATE POLICY dobby_v2_modules_update
ON public.dobby_v2_modules FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.dobby_v2_memberships m
  WHERE m.household_id = dobby_v2_modules.household_id
    AND m.user_id = (SELECT auth.uid()) AND m.active
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.dobby_v2_memberships m
  WHERE m.household_id = dobby_v2_modules.household_id
    AND m.user_id = (SELECT auth.uid()) AND m.active
));

CREATE FUNCTION public.dobby_v2_modules_stamp()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.household_id IS DISTINCT FROM OLD.household_id
      OR NEW.module IS DISTINCT FROM OLD.module THEN
      RAISE EXCEPTION 'Household and module identity cannot be reassigned';
    END IF;
    NEW.revision := OLD.revision + 1;
    NEW.created_at := OLD.created_at;
  ELSE
    NEW.revision := 1;
    NEW.created_at := now();
  END IF;
  NEW.updated_at := clock_timestamp();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.dobby_v2_modules_stamp()
FROM PUBLIC, anon, authenticated;

CREATE TRIGGER dobby_v2_modules_stamp_trigger
BEFORE INSERT OR UPDATE ON public.dobby_v2_modules
FOR EACH ROW EXECUTE FUNCTION public.dobby_v2_modules_stamp();

COMMIT;

-- Read-only smoke-check after execution (run separately):
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname='public' AND tablename='dobby_v2_modules';
-- SELECT policyname,cmd FROM pg_policies
-- WHERE schemaname='public' AND tablename='dobby_v2_modules';

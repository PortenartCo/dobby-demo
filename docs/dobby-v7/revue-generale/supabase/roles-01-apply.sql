-- CANDIDAT MANUEL, NON APPLIQUE. Projet personnel DOBBY uniquement.
-- Garde restrictive provisoire : ne rend PAS le protocole Missions enfants operationnel.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF to_regprocedure('public.dobby_v7_context()') IS NULL OR
    to_regclass('public.dobby_v2_modules') IS NULL OR
    to_regclass('public.dobby_v2_grocery') IS NULL THEN
  RAISE EXCEPTION 'Socle V7 personnel requis, interrompre sans modifier';
 END IF;
 IF to_regprocedure('public.dobby_v7_review_parent(text)') IS NOT NULL THEN
  RAISE EXCEPTION 'Garde revue deja presente : utiliser roles-02-verify.sql';
 END IF;
END $$;
CREATE FUNCTION public.dobby_v7_review_parent(p_household text) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $fn$
 SELECT coalesce(c->>'phase'='active' AND c->>'householdId'=p_household
   AND c->'profile'->>'memberCategory'='parent',false)
 FROM (SELECT public.dobby_v7_context() c) context
$fn$;
REVOKE ALL ON FUNCTION public.dobby_v7_review_parent(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dobby_v7_review_parent(text) TO authenticated;
CREATE POLICY dobby_review_dobby_v2_modules_insert ON public.dobby_v2_modules AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.dobby_v7_review_parent(household_id::text));
CREATE POLICY dobby_review_dobby_v2_modules_update ON public.dobby_v2_modules AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.dobby_v7_review_parent(household_id::text)) WITH CHECK (public.dobby_v7_review_parent(household_id::text));
CREATE POLICY dobby_review_dobby_v2_modules_delete ON public.dobby_v2_modules AS RESTRICTIVE FOR DELETE TO authenticated USING (public.dobby_v7_review_parent(household_id::text)) ;
CREATE POLICY dobby_review_dobby_v2_grocery_insert ON public.dobby_v2_grocery AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.dobby_v7_review_parent(household_id::text));
CREATE POLICY dobby_review_dobby_v2_grocery_update ON public.dobby_v2_grocery AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.dobby_v7_review_parent(household_id::text)) WITH CHECK (public.dobby_v7_review_parent(household_id::text));
CREATE POLICY dobby_review_dobby_v2_grocery_delete ON public.dobby_v2_grocery AS RESTRICTIVE FOR DELETE TO authenticated USING (public.dobby_v7_review_parent(household_id::text)) ;
CREATE POLICY dobby_review_objects_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id<>'dobby-family-files' OR public.dobby_v7_review_parent((storage.foldername(name))[1])));
CREATE POLICY dobby_review_objects_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING ((bucket_id<>'dobby-family-files' OR public.dobby_v7_review_parent((storage.foldername(name))[1]))) WITH CHECK ((bucket_id<>'dobby-family-files' OR public.dobby_v7_review_parent((storage.foldername(name))[1])));
CREATE POLICY dobby_review_objects_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING ((bucket_id<>'dobby-family-files' OR public.dobby_v7_review_parent((storage.foldername(name))[1]))) ;
COMMIT;

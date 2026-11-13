-- CANDIDAT MANUEL, NON APPLIQUE. Projet personnel DOBBY uniquement.
-- Garde restrictive des seules ecritures DIRECTES authenticated. PAS un installateur F09.
-- Examiner d’abord le diagnostic regroupe et les vrais guards prives : README-ROLES.md.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$
DECLARE relation text; context_oid oid:=to_regprocedure('public.dobby_v7_context()');
BEGIN
 IF context_oid IS NULL OR to_regprocedure('storage.foldername(text)') IS NULL THEN
  RAISE EXCEPTION 'Socle V7/Storage inconnu : interrompre, ne pas rejouer les anciens installs';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner
  WHERE p.oid=context_oid AND p.prorettype='jsonb'::regtype AND p.prosecdef AND p.provolatile='s'
    AND p.proconfig @> ARRAY['search_path=""']::text[]
    AND has_function_privilege('authenticated',p.oid,'EXECUTE')
    AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
    AND NOT r.rolcanlogin AND NOT r.rolsuper AND NOT r.rolbypassrls
    AND NOT pg_has_role('authenticated',r.oid,'MEMBER')) THEN
  RAISE EXCEPTION 'Proprietaire/contexte V7 non ferme : audit requis avant restriction';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated' AND NOT rolsuper AND NOT rolbypassrls) THEN
  RAISE EXCEPTION 'Role authenticated privilegie ou absent : aucune garantie RLS';
 END IF;
 FOREACH relation IN ARRAY ARRAY['public.dobby_v2_modules','public.dobby_v2_grocery','storage.objects'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(relation) AND relrowsecurity
    AND NOT pg_has_role('authenticated',relowner,'MEMBER')) THEN
   RAISE EXCEPTION 'RLS/propriete non conforme sur %',relation;
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid IN ('public.dobby_v2_modules'::regclass,'public.dobby_v2_grocery'::regclass)
    AND attname='household_id' AND NOT attisdropped AND atttypid<>'uuid'::regtype) THEN
  RAISE EXCEPTION 'Type foyer inattendu : audit du catalogue requis';
 END IF;
 IF to_regprocedure('public.dobby_v7_review_parent(text)') IS NOT NULL OR EXISTS(
  SELECT 1 FROM pg_policies WHERE policyname LIKE 'dobby_review_%') THEN
  RAISE EXCEPTION 'Garde revue deja presente ou noms reserves occupes : verification, pas de remplacement';
 END IF;
END $$;
CREATE FUNCTION public.dobby_v7_review_parent(p_household text) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $fn$
 SELECT coalesce(c->>'protocol'='1' AND c->>'phase'='active' AND c->>'householdId'=p_household
   AND jsonb_typeof(c->'memberId')='string' AND length(c->>'memberId') BETWEEN 1 AND 120
   AND c->'profile'->>'id'=c->>'memberId' AND c->'profile'->>'memberCategory'='parent'
   AND c->'permissions'->'canEdit'='true'::jsonb,false)
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

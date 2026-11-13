-- MANUEL. Retire uniquement les restrictions ajoutees, sans supprimer de donnees.
BEGIN;
DROP POLICY IF EXISTS dobby_review_dobby_v2_modules_insert ON public.dobby_v2_modules;
DROP POLICY IF EXISTS dobby_review_dobby_v2_modules_update ON public.dobby_v2_modules;
DROP POLICY IF EXISTS dobby_review_dobby_v2_modules_delete ON public.dobby_v2_modules;
DROP POLICY IF EXISTS dobby_review_dobby_v2_grocery_insert ON public.dobby_v2_grocery;
DROP POLICY IF EXISTS dobby_review_dobby_v2_grocery_update ON public.dobby_v2_grocery;
DROP POLICY IF EXISTS dobby_review_dobby_v2_grocery_delete ON public.dobby_v2_grocery;
DROP POLICY IF EXISTS dobby_review_objects_insert ON storage.objects;
DROP POLICY IF EXISTS dobby_review_objects_update ON storage.objects;
DROP POLICY IF EXISTS dobby_review_objects_delete ON storage.objects;
DROP FUNCTION IF EXISTS public.dobby_v7_review_parent(text);
COMMIT;

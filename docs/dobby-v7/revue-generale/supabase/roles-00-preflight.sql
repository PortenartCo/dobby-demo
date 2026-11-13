-- Lecture seule. Rien installer tant que la source privee Missions reste inconnue.
SELECT to_regprocedure('public.dobby_v7_context()') IS NOT NULL AS v7_present,
 to_regclass('storage.objects') IS NOT NULL AS storage_present,
 (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename IN ('dobby_v2_modules','dobby_v2_grocery')) AS policies_existantes;
SELECT schemaname,tablename,policyname,cmd,roles,qual,with_check FROM pg_policies
 WHERE (schemaname='public' AND tablename IN ('dobby_v2_modules','dobby_v2_grocery')) OR
 (schemaname='storage' AND tablename='objects');
-- Examiner localement les fonctions privees Missions et TOUS les roles writers
-- avant de promettre les droits enfants ; ne pas transmettre donnees/jetons.

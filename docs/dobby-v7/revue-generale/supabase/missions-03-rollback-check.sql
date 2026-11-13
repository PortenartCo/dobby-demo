-- MANUEL, LECTURE SEULE. Aucun objet V3 n'est installé par le présent lot.
-- Aucun DROP, DELETE, changement de rôle, ni réécriture de crédit n'est nécessaire.
-- Après une future migration V3, utiliser SON rollback versionné et testé.
BEGIN READ ONLY;
SELECT pg_catalog.jsonb_pretty(pg_catalog.jsonb_build_object(
 'check','dobby-missions-v3-rollback-state',
 'action','Maintenir ou republier le gate frontend V3 fermé',
 'databaseMutationPerformed',false,
 'existingV2WriterPresent',pg_catalog.to_regprocedure('public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)') IS NOT NULL,
 'existingV2GuardEnabled',EXISTS(SELECT 1 FROM pg_catalog.pg_trigger t
  WHERE t.tgrelid=pg_catalog.to_regclass('public.dobby_v2_modules')
   AND t.tgname='dobby_missions_v2_guard' AND t.tgenabled='O'),
 'v3FunctionsPresent',(SELECT count(*) FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname LIKE 'dobby_missions_v3_%'),
 'ifV3Exists','Ne rien supprimer avec ce script ; appliquer uniquement le rollback audité de cette future migration, en conservant crédits et reçus',
 'dataPolicy','Conserver missions, occurrences, membres, crédits V1/V2/V3 et opérations ; aucune conversion aveugle'
)) AS missions_rollback_check;
COMMIT;

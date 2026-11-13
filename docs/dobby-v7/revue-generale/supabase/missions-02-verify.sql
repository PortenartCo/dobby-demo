-- MANUEL, LECTURE SEULE. Ce contrôle ne prétend jamais valider les droits réels.
-- Ne pas ouvrir le gate V3 sur la seule base d'un résultat catalogue.
BEGIN READ ONLY;
DO $checks$
BEGIN
 IF pg_catalog.to_regclass('public.dobby_v2_modules') IS NULL
   OR pg_catalog.to_regclass('public.dobby_v2_memberships') IS NULL THEN
  RAISE EXCEPTION 'Socle Missions V2 absent : aucune installation automatique autorisée';
 END IF;
 IF pg_catalog.to_regprocedure('public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)') IS NULL
   OR pg_catalog.to_regprocedure('public.dobby_missions_v2_capabilities(uuid)') IS NULL THEN
  RAISE EXCEPTION 'RPC Missions V2 absent : conserver le gate fermé';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles r
   WHERE r.rolname='dobby_missions_v2_writer' AND NOT r.rolcanlogin
   AND NOT r.rolsuper AND NOT r.rolbypassrls AND NOT r.rolcreaterole AND NOT r.rolcreatedb) THEN
  RAISE EXCEPTION 'Rôle Missions V2 absent ou trop privilégié';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid=pg_catalog.to_regclass('public.dobby_v2_modules')
   AND t.tgname='dobby_missions_v2_guard' AND t.tgenabled='O') THEN
  RAISE EXCEPTION 'Guard Missions V2 absent ou désactivé';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid=pg_catalog.to_regclass('public.dobby_v2_modules')
   AND t.tgname='dobby_v2_modules_stamp_trigger' AND t.tgenabled='O') THEN
  RAISE EXCEPTION 'Stamp natif absent ou désactivé';
 END IF;
END $checks$;
SELECT pg_catalog.jsonb_pretty(pg_catalog.jsonb_build_object(
 'check','dobby-missions-v3-catalog-only',
 'status','ATTENTE_UTILISATEUR','sharedDistributionOperational',false,
 'frontendGateMustRemainClosed',true,
 'reason','Migration V3 et recette parent/enfant/inter-foyers réelles non fournies ni certifiées par ce lot',
 'v3FunctionsPresent',(SELECT count(*) FROM pg_catalog.pg_proc p
   JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname LIKE 'dobby_missions_v3_%'),
 'v2WriterMd5',pg_catalog.md5(pg_catalog.pg_get_functiondef(
   pg_catalog.to_regprocedure('public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)'))),
 'stampMd5',pg_catalog.md5(pg_catalog.pg_get_functiondef(
   pg_catalog.to_regprocedure('public.dobby_v2_modules_stamp()')))
)) AS missions_verification;
COMMIT;

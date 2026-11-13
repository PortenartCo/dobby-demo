-- À exécuter MANUELLEMENT, uniquement dans le projet personnel DOBBY.
-- LECTURE SEULE : aucun appel métier, aucune ligne de profil ou de compte.
-- Conserver le JSON pour comparer les empreintes après intervention.
BEGIN READ ONLY;
SELECT pg_catalog.jsonb_pretty(pg_catalog.jsonb_build_object(
 'check','dobby-missions-v3-preflight',
 'databaseVersion',pg_catalog.current_setting('server_version'),
 'status','ATTENTE_UTILISATEUR',
 'v3MigrationProvided',false,
 'tables',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'schema',n.nspname,'name',c.relname,'rls',c.relrowsecurity,
   'forced',c.relforcerowsecurity,'owner',pg_catalog.pg_get_userbyid(c.relowner))
   ORDER BY n.nspname,c.relname)
  FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE c.relkind='r' AND ((n.nspname='public' AND c.relname IN ('dobby_v2_modules','dobby_v2_memberships'))
   OR (n.nspname='dobby_runes_private' AND c.relname='operations'))),
 'functions',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'schema',n.nspname,'name',p.proname,
   'arguments',pg_catalog.pg_get_function_identity_arguments(p.oid),
   'owner',pg_catalog.pg_get_userbyid(p.proowner),'securityDefiner',p.prosecdef,
   'settings',p.proconfig,'definitionMd5',pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)))
   ORDER BY n.nspname,p.proname,p.oid)
  FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  WHERE (n.nspname='public' AND (p.proname IN ('dobby_missions_v2_write','dobby_missions_v2_capabilities','dobby_v2_modules_stamp') OR p.proname LIKE 'dobby_missions_v3_%'))
   OR (n.nspname='dobby_runes_private' AND p.proname IN ('guard_missions','assert_payload','assert_ledger','same_award','event_key','request_user_id','lock_active_membership'))),
 'triggers',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'name',t.tgname,'enabled',t.tgenabled,
   'definition',pg_catalog.pg_get_triggerdef(t.oid,true)) ORDER BY t.tgname)
  FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
  JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='dobby_v2_modules' AND NOT t.tgisinternal),
 'writerRole',(SELECT pg_catalog.jsonb_build_object('login',r.rolcanlogin,
   'superuser',r.rolsuper,'bypassRls',r.rolbypassrls,
   'createRole',r.rolcreaterole,'createDatabase',r.rolcreatedb,
   'membershipCount',(SELECT count(*) FROM pg_catalog.pg_auth_members m WHERE m.roleid=r.oid))
  FROM pg_catalog.pg_roles r WHERE r.rolname='dobby_missions_v2_writer')
)) AS missions_preflight;
COMMIT;

-- LECTURE SEULE. Exécuter manuellement après 01-apply.sql et renvoyer ce JSON.
BEGIN READ ONLY;
DO $checks$
DECLARE bad integer;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='dobby_v7_writer' AND NOT rolcanlogin
      AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb) THEN
    RAISE EXCEPTION 'Rôle V7 absent ou trop privilégié';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid=(SELECT oid FROM pg_roles WHERE rolname='dobby_v7_writer')) THEN
    RAISE EXCEPTION 'Le rôle writer ne doit être accordé à aucun compte';
  END IF;
  IF has_schema_privilege('dobby_v7_writer','public','CREATE') OR has_schema_privilege('dobby_v7_writer','dobby_v7_private','CREATE') THEN RAISE EXCEPTION 'CREATE temporaire writer non retiré'; END IF;
  SELECT count(*) INTO bad FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='dobby_v7_private' AND c.relkind='r' AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity);
  IF bad<>0 OR (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='dobby_v7_private' AND c.relkind='r')<>5 THEN RAISE EXCEPTION 'Tables privées/RLS V7 inattendues'; END IF;
  SELECT count(*) INTO bad FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname LIKE 'dobby_v7_%'
      AND (NOT p.prosecdef OR pg_get_userbyid(p.proowner)<>'dobby_v7_writer' OR NOT coalesce(p.proconfig,'{}') @> ARRAY['search_path=""']);
  IF bad<>0 OR (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'dobby_v7_%')<>10 THEN RAISE EXCEPTION 'RPC V7/propriétaire/search_path inattendus'; END IF;
  IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace,
      LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      WHERE (n.nspname='dobby_v7_private' OR (n.nspname='public' AND p.proname LIKE 'dobby_v7_%'))
      AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'EXECUTE PUBLIC inattendu'; END IF;
  IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname LIKE 'dobby_v7_%' AND p.proname<>'dobby_v7_preview_invitation'
      AND has_function_privilege('anon',p.oid,'EXECUTE')) THEN RAISE EXCEPTION 'RPC authentifiée accessible anon'; END IF;
  IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='dobby_v7_private' AND (pg_get_userbyid(p.proowner)<>'dobby_v7_writer' OR NOT coalesce(p.proconfig,'{}') @> ARRAY['search_path=""']
      OR has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('service_role',p.oid,'EXECUTE')
      OR (p.proname<>'assert_snapshot' AND has_function_privilege('authenticated',p.oid,'EXECUTE')))) THEN RAISE EXCEPTION 'Helpers privés/propriétaire/EXECUTE inattendus'; END IF;
  IF NOT has_function_privilege('anon','public.dobby_v7_preview_invitation(text)','EXECUTE') THEN RAISE EXCEPTION 'Preview anon manquante'; END IF;
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='dobby_v7_private' AND c.relkind='r' AND
      (has_table_privilege('anon',c.oid,'SELECT') OR has_table_privilege('authenticated',c.oid,'SELECT'))) THEN RAISE EXCEPTION 'Table privée lisible par client'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.dobby_v2_modules'::regclass AND tgname='dobby_missions_v2_guard' AND tgenabled='O')
     OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.dobby_v2_modules'::regclass AND tgname='dobby_v2_modules_stamp_trigger' AND tgenabled='O')
     OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.dobby_v2_modules'::regclass AND tgname='dobby_v7_family_guard' AND tgenabled='O') THEN RAISE EXCEPTION 'Protection de module manquante'; END IF;
END $checks$;
SELECT jsonb_pretty(jsonb_build_object(
  'verification','dobby-stitch19-20-v2','databaseVersion',current_setting('server_version'),
  'rpc',(SELECT jsonb_agg(jsonb_build_object('name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),'owner',pg_get_userbyid(p.proowner),'settings',p.proconfig) ORDER BY p.proname) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'dobby_v7_%'),
  'privateTables',(SELECT jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity) ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='dobby_v7_private' AND c.relkind='r'),
  'moduleTriggers',(SELECT jsonb_agg(jsonb_build_object('name',tgname,'definition',pg_get_triggerdef(oid,true)) ORDER BY tgname) FROM pg_trigger WHERE tgrelid='public.dobby_v2_modules'::regclass AND NOT tgisinternal),
  'missionsWriterDefinitionMd5',md5(pg_get_functiondef('public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)'::regprocedure)),
  'moduleStampDefinitionMd5',md5(pg_get_functiondef('public.dobby_v2_modules_stamp()'::regprocedure)),
  'counts',dobby_v7_private.verification_counts()
)) AS verification;
COMMIT;

-- LECTURE SEULE : vérification structurelle du correctif 11.
-- writerAuthSchemaUsage=false reste attendu : le schéma Auth n'a pas été élargi.
BEGIN TRANSACTION READ ONLY;
DO $checks$
DECLARE account_row record; context_result jsonb; context_phase text; phases jsonb:='{}'::jsonb; errors jsonb:='{}'::jsonb;
  probed integer:=0; saved_sub text:=current_setting('request.jwt.claim.sub',true); saved_claims text:=current_setting('request.jwt.claims',true);
BEGIN

  IF current_user IN ('anon','authenticated','service_role','dobby_v7_writer')
    OR (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='dobby_v7_private') IS DISTINCT FROM current_user
    OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='public.dobby_v2_modules_stamp()'::regprocedure) IS DISTINCT FROM current_user THEN
    RAISE EXCEPTION 'Exécuter avec le propriétaire vérifié du schéma privé et du stamp familial';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='dobby_v7_writer' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls)
    OR NOT has_schema_privilege('dobby_v7_writer','dobby_v7_private','USAGE') THEN
    RAISE EXCEPTION 'Rôle familial fermé ou accès privé inattendu';
  END IF;

  IF EXISTS(SELECT 1 FROM aclexplode(coalesce((SELECT proacl FROM pg_proc WHERE oid='dobby_v7_private.actor()'::regprocedure),acldefault('f',(SELECT proowner FROM pg_proc WHERE oid='dobby_v7_private.actor()'::regprocedure)))) a
    WHERE a.privilege_type='EXECUTE' AND a.grantee NOT IN ((SELECT oid FROM pg_roles WHERE rolname=current_user),(SELECT oid FROM pg_roles WHERE rolname='dobby_v7_writer')))
    OR NOT has_function_privilege('dobby_v7_writer','dobby_v7_private.actor()','EXECUTE')
    OR (SELECT prosecdef OR provolatile<>'s' OR prorettype<>'uuid'::regtype OR pronargs<>0 OR NOT coalesce(proconfig,'{}') @> ARRAY['search_path=""'] FROM pg_proc WHERE oid='dobby_v7_private.actor()'::regprocedure) THEN
    RAISE EXCEPTION 'Le helper doit rester INVOKER/STABLE/UUID/fermé';
  END IF;

  IF md5(pg_get_functiondef('dobby_v7_private.actor()'::regprocedure)) NOT IN ('01a3e6711793bb7dfc59ae272b3020e2','b8cefee1f90f53c8bda4132fe4ae3358')
    OR (SELECT pg_get_userbyid(proowner) IS DISTINCT FROM current_user FROM pg_proc WHERE oid='dobby_v7_private.actor()'::regprocedure)
    OR md5(pg_get_functiondef('public.dobby_v2_modules_stamp()'::regprocedure))<>'6e2372696dc78db3a039342f66feadcf'
    OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'dobby_v7_%' AND (NOT p.prosecdef OR pg_get_userbyid(p.proowner)<>'dobby_v7_writer')) THEN
    RAISE EXCEPTION 'Structure du correctif différente de la version validée';
  END IF;
  FOR account_row IN SELECT id FROM auth.users LOOP
    probed:=probed+1;
    PERFORM set_config('request.jwt.claim.sub',account_row.id::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',account_row.id,'role','authenticated')::text,true);
    BEGIN
      context_result:=public.dobby_v7_context(); context_phase:=context_result->>'phase';
      IF context_phase IS NULL OR context_phase NOT IN ('profile','household','active','rejected') THEN context_phase:='other'; END IF;
      phases:=jsonb_set(phases,ARRAY[context_phase],to_jsonb(coalesce((phases->>context_phase)::integer,0)+1),true);
    EXCEPTION WHEN OTHERS THEN
      errors:=jsonb_set(errors,ARRAY[SQLSTATE],to_jsonb(coalesce((errors->>SQLSTATE)::integer,0)+1),true);
    END;
  END LOOP;
  PERFORM set_config('request.jwt.claim.sub',coalesce(saved_sub,''),true);
  PERFORM set_config('request.jwt.claims',coalesce(saved_claims,''),true);
  PERFORM set_config('dobby.v7_context_probe',jsonb_build_object('probedAccountCount',probed,'phaseCounts',phases,'errorSqlstateCounts',errors)::text,true);
END $checks$;
SELECT jsonb_build_object('verification','dobby-v7-jwt-sub-invoker-v1','readOnly',true,
  'actorSecurityInvoker',NOT (SELECT prosecdef FROM pg_proc WHERE oid='dobby_v7_private.actor()'::regprocedure),
  'actorOwner',(SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='dobby_v7_private.actor()'::regprocedure),
  'actorOwnerIsSchemaOwner',true,'actorDefinitionMd5',md5(pg_get_functiondef('dobby_v7_private.actor()'::regprocedure)),
  'stampDefinitionMd5',md5(pg_get_functiondef('public.dobby_v2_modules_stamp()'::regprocedure)),
  'writerAuthSchemaUsage',has_schema_privilege('dobby_v7_writer','auth','USAGE'),
  'writerCanExecuteActor',has_function_privilege('dobby_v7_writer','dobby_v7_private.actor()','EXECUTE'),
  'callerCanExecuteContext',has_function_privilege(current_user,'public.dobby_v7_context()','EXECUTE'),
  'contextDatabaseProbe',current_setting('dobby.v7_context_probe')::jsonb,
  'realAuthOrApiVerified',false) AS repair_verification;
ROLLBACK;

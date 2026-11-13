-- DOBBY familial uniquement : dobby-family-sync / pqcdkrwljgvgagzwrcmg.
-- Diagnostic de connexion, aucune modification des tables, comptes ou droits.
-- Les revendications JWT simulées sont locales à cette transaction annulée.
-- Ne teste ni le mot de passe, ni la clé API, ni un vrai JWT/PostgREST.
BEGIN TRANSACTION READ ONLY;

DO $diagnostic$
DECLARE
  account_row record;
  context_result jsonb;
  context_phase text;
  phases jsonb := '{}'::jsonb;
  errors jsonb := '{}'::jsonb;
  saved_sub text := current_setting('request.jwt.claim.sub',true);
  saved_claims text := current_setting('request.jwt.claims',true);
  auth_summary jsonb;
  permissions jsonb;
BEGIN
  SELECT jsonb_build_object(
    'accounts',count(*),
    'emailConfirmed',count(*) FILTER (WHERE email_confirmed_at IS NOT NULL),
    'passwordPresent',count(*) FILTER (WHERE coalesce(encrypted_password,'')<>''),
    'signedInSinceRelease',count(*) FILTER (WHERE last_sign_in_at>='2026-11-13T00:06:02Z'::timestamptz)
  ) INTO auth_summary FROM auth.users;

  permissions := jsonb_build_object(
    'authenticatedPublicSchemaUsage',has_schema_privilege('authenticated','public','USAGE'),
    'authenticatedContextExecute',has_function_privilege('authenticated','public.dobby_v7_context()','EXECUTE'),
    'writerPublicSchemaUsage',has_schema_privilege('dobby_v7_writer','public','USAGE'),
    'writerPrivateSchemaUsage',has_schema_privilege('dobby_v7_writer','dobby_v7_private','USAGE'),
    'writerAuthSchemaUsage',has_schema_privilege('dobby_v7_writer','auth','USAGE'),
    'writerAuthUidExecute',has_function_privilege('dobby_v7_writer','auth.uid()','EXECUTE'),
    'contextSecurityDefiner',(SELECT prosecdef FROM pg_proc WHERE oid='public.dobby_v7_context()'::regprocedure),
    'contextOwnerIsWriter',(SELECT pg_get_userbyid(proowner)='dobby_v7_writer' FROM pg_proc WHERE oid='public.dobby_v7_context()'::regprocedure)
  );

  FOR account_row IN SELECT id FROM auth.users LOOP
    PERFORM set_config('request.jwt.claim.sub',account_row.id::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',account_row.id,'role','authenticated')::text,true);
    BEGIN
      context_result := public.dobby_v7_context();
      context_phase := context_result->>'phase';
      IF context_phase IS NULL OR context_phase NOT IN ('profile','household','active','rejected') THEN
        context_phase := 'other';
      END IF;
      phases := jsonb_set(phases,ARRAY[context_phase],to_jsonb(coalesce((phases->>context_phase)::integer,0)+1),true);
    EXCEPTION WHEN OTHERS THEN
      -- SQLSTATE seulement : jamais SQLERRM, profil, adresse, UUID ou jeton.
      errors := jsonb_set(errors,ARRAY[SQLSTATE],to_jsonb(coalesce((errors->>SQLSTATE)::integer,0)+1),true);
    END;
  END LOOP;
  PERFORM set_config('request.jwt.claim.sub',coalesce(saved_sub,''),true);
  PERFORM set_config('request.jwt.claims',coalesce(saved_claims,''),true);
  PERFORM set_config('dobby.login_diagnostic',jsonb_build_object(
    'diagnostic','dobby-v7-login-readonly-v1',
    'readOnly',true,
    'authSummary',auth_summary,
    'permissions',permissions,
    'contextDatabaseProbe',jsonb_build_object('phaseCounts',phases,'errorSqlstateCounts',errors),
    'realAuthOrApiVerified',false
  )::text,true);
END $diagnostic$;

SELECT current_setting('dobby.login_diagnostic')::jsonb AS login_diagnostic;
ROLLBACK;

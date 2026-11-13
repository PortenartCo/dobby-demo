-- DOBBY familial exclusivement : dobby-family-sync / pqcdkrwljgvgagzwrcmg.
-- À exécuter MANUELLEMENT par l'utilisateur. Aucun compte ni foyer réinitialisé.
-- Deux fonctions seulement. Aucun rôle, schéma, table, politique RLS ou droit Auth modifié.
-- Le helper actor est recréé SECURITY INVOKER au nom du propriétaire du schéma.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

DO $repair$
DECLARE
  source text; normalized text; expression text; variant text; body text;
  stamp text:=pg_get_functiondef('public.dobby_v2_modules_stamp()'::regprocedure);
  old_stamp_oid oid:='public.dobby_v2_modules_stamp()'::regprocedure;
  old_stamp_acl text; old_stamp_owner oid; old_stamp_properties jsonb;
  nl text; needle text; replacement text; saved_sub text:=current_setting('request.jwt.claim.sub',true);
  saved_claims text:=current_setting('request.jwt.claims',true); sample jsonb;
  helper_result uuid; expression_result uuid; helper_error text; expression_error text;
  untouched_before jsonb; untouched_after jsonb;
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

  IF has_schema_privilege('dobby_v7_writer','auth','USAGE')
    OR has_schema_privilege(current_user,'auth','USAGE WITH GRANT OPTION') THEN
    RAISE EXCEPTION 'Ce correctif est réservé au refus Auth USAGE confirmé sans droit de GRANT';
  END IF;
  IF md5(pg_get_functiondef('dobby_v7_private.actor()'::regprocedure))<>'ca66dec1067c5cb1a77139730dcf2d9c'
    OR (SELECT pg_get_userbyid(proowner)<>'dobby_v7_writer' OR prosecdef OR provolatile<>'s' OR pronargs<>0 OR prorettype<>'uuid'::regtype OR prolang<>(SELECT oid FROM pg_language WHERE lanname='plpgsql') FROM pg_proc WHERE oid='dobby_v7_private.actor()'::regprocedure)
    OR md5(stamp)<>'81320b020efdd9c11fc8a2b0e9cb692a' THEN
    RAISE EXCEPTION 'Définitions actor/stamp différentes du diagnostic validé : aucune modification';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='auth.uid()'::regprocedure AND NOT prosecdef AND provolatile='s' AND pronargs=0 AND prorettype='uuid'::regtype AND prolang=(SELECT oid FROM pg_language WHERE lanname='sql')) THEN
    RAISE EXCEPTION 'Contrat du helper Auth non reconnu';
  END IF;
  SELECT prosrc INTO source FROM pg_proc WHERE oid='auth.uid()'::regprocedure;
  IF position('''request.jwt.claim.sub''' IN source)=0 OR position('''request.jwt.claims''' IN source)=0 OR position('''sub''' IN source)=0 THEN
    RAISE EXCEPTION 'Les noms des revendications Auth doivent conserver leur casse exacte';
  END IF;
  normalized:=lower(rtrim(regexp_replace(source,'[[:space:]]','','g'),';'));
  IF normalized IN ('selectnullif(coalesce(current_setting(''request.jwt.claim.sub'',true),(current_setting(''request.jwt.claims'',true)::jsonb->>''sub'')),'''')::uuid') THEN
    variant:='legacy_blank_blocks_json'; expression:='nullif(coalesce(current_setting(''request.jwt.claim.sub'',true),(current_setting(''request.jwt.claims'',true)::jsonb->>''sub'')),'''')::uuid';
  ELSIF normalized IN ('selectcoalesce(nullif(current_setting(''request.jwt.claim.sub'',true),''''),nullif(current_setting(''request.jwt.claims'',true),'''')::jsonb->>''sub'')::uuid','selectcoalesce(nullif(current_setting(''request.jwt.claim.sub'',true),''''),(nullif(current_setting(''request.jwt.claims'',true),'''')::jsonb->>''sub''))::uuid') THEN
    variant:='legacy_blank_uses_json'; expression:='coalesce(nullif(current_setting(''request.jwt.claim.sub'',true),''''),nullif(current_setting(''request.jwt.claims'',true),'''')::jsonb->>''sub'')::uuid';
  ELSE RAISE EXCEPTION 'Expression Auth inconnue : aucune modification'; END IF;
  -- Valeurs fictives locales à la transaction, sans lecture de compte Auth.
  FOR sample IN SELECT value FROM jsonb_array_elements($cases$[{"legacy": "00000000-0000-4000-8000-000000000901", "claims": ""}, {"legacy": "", "claims": "{\"sub\": \"00000000-0000-4000-8000-000000000902\"}"}, {"legacy": "00000000-0000-4000-8000-000000000901", "claims": "{\"sub\": \"00000000-0000-4000-8000-000000000902\"}"}, {"legacy": "", "claims": "{}"}, {"legacy": "", "claims": ""}, {"legacy": "invalid", "claims": "{}"}, {"legacy": "", "claims": "{\"sub\": \"invalid\"}"}, {"legacy": "", "claims": "invalid-json"}, {"legacy": "00000000-0000-4000-8000-000000000901", "claims": "invalid-json"}, {"legacy": "invalid", "claims": "{\"sub\": \"00000000-0000-4000-8000-000000000902\"}"}, {"legacy": "", "claims": "{\"sub\": null}"}, {"legacy": "", "claims": "{\"user_metadata\": {\"sub\": \"00000000-0000-4000-8000-000000000902\"}}"}]$cases$::jsonb) LOOP
    PERFORM set_config('request.jwt.claim.sub',sample->>'legacy',true);
    PERFORM set_config('request.jwt.claims',sample->>'claims',true);
    helper_result:=NULL; expression_result:=NULL; helper_error:=NULL; expression_error:=NULL;
    BEGIN helper_result:=auth.uid(); EXCEPTION WHEN OTHERS THEN helper_error:=SQLSTATE; END;
    BEGIN EXECUTE 'SELECT '||expression INTO expression_result; EXCEPTION WHEN OTHERS THEN expression_error:=SQLSTATE; END;
    IF helper_result IS DISTINCT FROM expression_result OR helper_error IS DISTINCT FROM expression_error THEN
      RAISE EXCEPTION 'Lecture des revendications non équivalente au helper Auth : aucune modification';
    END IF;
  END LOOP;
  PERFORM set_config('request.jwt.claim.sub',coalesce(saved_sub,''),true);
  PERFORM set_config('request.jwt.claims',coalesce(saved_claims,''),true);
  SELECT proacl::text,proowner,jsonb_build_array(prolang,provolatile,prosecdef,proleakproof,proisstrict,proparallel,proconfig,prorettype,pronargs)
    INTO old_stamp_acl,old_stamp_owner,old_stamp_properties FROM pg_proc WHERE oid=old_stamp_oid;
  SELECT jsonb_agg(jsonb_build_array(p.oid,md5(pg_get_functiondef(p.oid)),p.proowner,p.proacl::text) ORDER BY p.oid) INTO untouched_before
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','dobby_v7_private','dobby_runes_private') AND p.oid NOT IN ('dobby_v7_private.actor()'::regprocedure,old_stamp_oid);
  body:=E'\n-- DOBBY_V7_ACTOR_JWT_SUB_V1\nDECLARE u uuid:='||expression||E';\nBEGIN\n  IF u IS NULL THEN RAISE EXCEPTION USING ERRCODE=''42501'',MESSAGE=''Connexion requise''; END IF;\n  RETURN u;\nEND ';
  DROP FUNCTION dobby_v7_private.actor() RESTRICT;
  EXECUTE format('CREATE FUNCTION dobby_v7_private.actor() RETURNS uuid LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='''' AS %L',body);
  REVOKE ALL ON FUNCTION dobby_v7_private.actor() FROM PUBLIC,anon,authenticated,service_role;
  GRANT EXECUTE ON FUNCTION dobby_v7_private.actor() TO dobby_v7_writer;
  nl:=CASE WHEN position(E'\r\n' IN stamp)>0 THEN E'\r\n' ELSE E'\n' END;
  needle:='  ELSE'||nl||'    NEW.updated_by := auth.uid();';
  replacement:='  ELSIF current_user=''dobby_v7_writer'' THEN'||nl||'    NEW.updated_by := dobby_v7_private.actor();'||nl||needle;
  IF (length(stamp)-length(replace(stamp,needle,'')))/length(needle)<>1 THEN RAISE EXCEPTION 'Branche stamp ambiguë'; END IF;
  EXECUTE replace(stamp,needle,replacement);
  IF md5(pg_get_functiondef('public.dobby_v2_modules_stamp()'::regprocedure))<>'6e2372696dc78db3a039342f66feadcf'
    OR (SELECT oid<>old_stamp_oid OR proowner<>old_stamp_owner OR proacl::text IS DISTINCT FROM old_stamp_acl OR prosecdef
      OR jsonb_build_array(prolang,provolatile,prosecdef,proleakproof,proisstrict,proparallel,proconfig,prorettype,pronargs) IS DISTINCT FROM old_stamp_properties
      FROM pg_proc WHERE oid='public.dobby_v2_modules_stamp()'::regprocedure)
    OR (SELECT pg_get_userbyid(proowner) IS DISTINCT FROM current_user FROM pg_proc WHERE oid='dobby_v7_private.actor()'::regprocedure) THEN
    RAISE EXCEPTION 'Propriétés owner/ACL/OID/INVOKER du stamp ou owner du helper modifiées';
  END IF;

  IF EXISTS(SELECT 1 FROM aclexplode(coalesce((SELECT proacl FROM pg_proc WHERE oid='dobby_v7_private.actor()'::regprocedure),acldefault('f',(SELECT proowner FROM pg_proc WHERE oid='dobby_v7_private.actor()'::regprocedure)))) a
    WHERE a.privilege_type='EXECUTE' AND a.grantee NOT IN ((SELECT oid FROM pg_roles WHERE rolname=current_user),(SELECT oid FROM pg_roles WHERE rolname='dobby_v7_writer')))
    OR NOT has_function_privilege('dobby_v7_writer','dobby_v7_private.actor()','EXECUTE')
    OR (SELECT prosecdef OR provolatile<>'s' OR prorettype<>'uuid'::regtype OR pronargs<>0 OR NOT coalesce(proconfig,'{}') @> ARRAY['search_path=""'] FROM pg_proc WHERE oid='dobby_v7_private.actor()'::regprocedure) THEN
    RAISE EXCEPTION 'Le helper doit rester INVOKER/STABLE/UUID/fermé';
  END IF;

  IF md5(pg_get_functiondef('dobby_v7_private.actor()'::regprocedure)) NOT IN ('01a3e6711793bb7dfc59ae272b3020e2','b8cefee1f90f53c8bda4132fe4ae3358') THEN RAISE EXCEPTION 'Définition du helper corrigé inattendue'; END IF;
  SELECT jsonb_agg(jsonb_build_array(p.oid,md5(pg_get_functiondef(p.oid)),p.proowner,p.proacl::text) ORDER BY p.oid) INTO untouched_after
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','dobby_v7_private','dobby_runes_private') AND p.oid NOT IN ('dobby_v7_private.actor()'::regprocedure,old_stamp_oid);
  IF untouched_after IS DISTINCT FROM untouched_before THEN RAISE EXCEPTION 'Une autre fonction a changé'; END IF;
  PERFORM set_config('dobby.v7_actor_variant',variant,true);
END $repair$;
SELECT jsonb_build_object('repair','dobby-v7-jwt-sub-invoker-v1','functionsChanged',2,'authSchemaUntouched',true,
  'actorSecurityInvoker',true,'actorOwner',current_user,'actorOriginalWriterOwnerRestored',false,
  'actorVariant',current_setting('dobby.v7_actor_variant'),'stampMd5',md5(pg_get_functiondef('public.dobby_v2_modules_stamp()'::regprocedure)),
  'noAccountOrHouseholdReset',true,'realAuthOrApiVerified',false) AS repair_result;
COMMIT;

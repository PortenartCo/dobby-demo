-- DOBBY familial exclusivement : dobby-family-sync / pqcdkrwljgvgagzwrcmg.
-- À exécuter MANUELLEMENT par l'utilisateur. Aucun compte ni foyer réinitialisé.
-- RETOUR ARRIÈRE DU CODE. Deux fonctions seulement. Aucun rôle, schéma, table, politique RLS ou droit Auth modifié.
-- Le helper actor est recréé SECURITY INVOKER au nom du propriétaire du schéma.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

-- Le propriétaire original writer ne peut pas être rétabli sans SET/ADMIN.
-- actor reste SECURITY INVOKER, propriétaire du schéma, EXECUTE fermé au writer.
-- Le retour arrière rétablit le refus initial si Auth USAGE reste absent.
DO $rollback$
DECLARE stamp text:=pg_get_functiondef('public.dobby_v2_modules_stamp()'::regprocedure); needle text; nl text; body text;
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
    OR md5(stamp)<>'6e2372696dc78db3a039342f66feadcf' THEN RAISE EXCEPTION 'Version corrigée attendue absente'; END IF;
  body:=E'\r\nDECLARE u uuid:=auth.uid();\r\nBEGIN\r\n  IF u IS NULL THEN RAISE EXCEPTION USING ERRCODE=''42501'',MESSAGE=''Connexion requise''; END IF;\r\n  RETURN u;\r\nEND ';
  EXECUTE format('CREATE OR REPLACE FUNCTION dobby_v7_private.actor() RETURNS uuid LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='''' AS %L',body);
  nl:=CASE WHEN position(E'\r\n' IN stamp)>0 THEN E'\r\n' ELSE E'\n' END;
  needle:='  ELSIF current_user=''dobby_v7_writer'' THEN'||nl||'    NEW.updated_by := dobby_v7_private.actor();'||nl;
  IF (length(stamp)-length(replace(stamp,needle,'')))/length(needle)<>1 THEN RAISE EXCEPTION 'Branche stamp corrigée ambiguë'; END IF;
  EXECUTE replace(stamp,needle,'');
  IF md5(pg_get_functiondef('dobby_v7_private.actor()'::regprocedure))<>'ca66dec1067c5cb1a77139730dcf2d9c'
    OR md5(pg_get_functiondef('public.dobby_v2_modules_stamp()'::regprocedure))<>'81320b020efdd9c11fc8a2b0e9cb692a' THEN RAISE EXCEPTION 'Définitions initiales non restaurées'; END IF;
END $rollback$;
SELECT jsonb_build_object('rollback','dobby-v7-jwt-sub-invoker-v1','initialFunctionBodiesRestored',true,
  'actorOriginalWriterOwnershipRestored',false,'actorRemainsSecurityInvoker',true,'actorOwner',current_user,
  'noAccountOrHouseholdReset',true,'initialAuthSchemaFailureCanReturn',true) AS rollback_result;
COMMIT;

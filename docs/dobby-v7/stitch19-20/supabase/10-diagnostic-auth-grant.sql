-- Projet familial uniquement : dobby-family-sync / pqcdkrwljgvgagzwrcmg.
-- Lecture seule : détermine qui peut accorder le droit auth manquant.
-- Aucun GRANT, changement de rôle, compte ou donnée.
BEGIN TRANSACTION READ ONLY;
SELECT jsonb_build_object(
  'diagnostic','dobby-v7-auth-grant-readonly-v1',
  'readOnly',true,
  'writerAuthSchemaUsage',has_schema_privilege('dobby_v7_writer','auth','USAGE'),
  'callerCanGrantAuthUsage',has_schema_privilege(current_user,'auth','USAGE WITH GRANT OPTION'),
  'authOwnerIsCaller',(SELECT nspowner=(SELECT oid FROM pg_roles WHERE rolname=current_user) FROM pg_namespace WHERE nspname='auth'),
  'callerCanSetAuthOwner',(SELECT pg_has_role(current_user,nspowner,'SET') FROM pg_namespace WHERE nspname='auth'),
  'callerCanSetWriter',pg_has_role(current_user,'dobby_v7_writer','SET'),
  'callerCanAdminWriter',pg_has_role(current_user,'dobby_v7_writer','USAGE WITH ADMIN OPTION'),
  'callerIsSuperuser',(SELECT rolsuper FROM pg_roles WHERE rolname=current_user),
  'callerCanCreateRoles',(SELECT rolcreaterole FROM pg_roles WHERE rolname=current_user),
  'stampOwnerIsCaller',(SELECT proowner=(SELECT oid FROM pg_roles WHERE rolname=current_user) FROM pg_proc WHERE oid='public.dobby_v2_modules_stamp()'::regprocedure),
  'stampDefinitionMd5',md5(pg_get_functiondef('public.dobby_v2_modules_stamp()'::regprocedure)),
  'actorDefinitionMd5',md5(pg_get_functiondef('dobby_v7_private.actor()'::regprocedure))
) AS auth_grant_diagnostic;
ROLLBACK;

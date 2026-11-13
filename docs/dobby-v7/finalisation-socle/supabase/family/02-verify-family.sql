-- Lecture seule, projet familial uniquement. Aucun compte/foyer modifié.
BEGIN TRANSACTION READ ONLY;
SELECT jsonb_pretty(jsonb_build_object(
 'verification','dobby-socle-family-v1','readOnly',true,'dataRowsRead',false,
 'runtimeOrRealAuthVerified',false,
 'writer',(SELECT jsonb_build_object('login',rolcanlogin,'superuser',rolsuper,'bypassRls',rolbypassrls,'createRole',rolcreaterole,
  'sqlEditorSet',pg_has_role('postgres',oid,'SET'),'sqlEditorInherit',pg_has_role('postgres',oid,'USAGE'),
  'sqlEditorAdmin',pg_has_role('postgres',oid,'USAGE WITH ADMIN OPTION'),
  'browserMemberships',(SELECT count(*) FROM pg_auth_members WHERE roleid=pg_roles.oid AND member<>'postgres'::regrole))
  FROM pg_roles WHERE rolname='dobby_socle_writer'),
 'clientFlags',(SELECT jsonb_build_object('familyRolesVerified',family_client_verified,'storageVerified',storage_client_verified,'childLinkVerified',child_link_client_verified,'missionsVerified',missions_client_verified)
  FROM dobby_socle_private.install_state WHERE singleton),
 'privateTablesClosed',(SELECT bool_and(c.relrowsecurity AND c.relforcerowsecurity
  AND NOT has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE')
  AND NOT has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE'))
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname='dobby_socle_private'),
 'actorRepairPreserved',md5(pg_get_functiondef('dobby_v7_private.actor()'::regprocedure))='b8cefee1f90f53c8bda4132fe4ae3358',
 'groceryStampPreserved',md5(pg_get_functiondef('public.dobby_v2_grocery_stamp()'::regprocedure))='ee36503542de1162beba0eed99ac4874',
 'moduleStampBranches',(SELECT position('dobby_socle_writer' IN pg_get_functiondef(oid))>0
  AND position('dobby_v7_writer' IN pg_get_functiondef(oid))>0
  AND position('dobby_missions_v2_writer' IN pg_get_functiondef(oid))>0
  FROM pg_proc WHERE oid='public.dobby_v2_modules_stamp()'::regprocedure),
 'functions',(SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),
  'securityDefiner',p.prosecdef,'configuration',p.proconfig,'definitionMd5',md5(pg_get_functiondef(p.oid)),
  'publicExecute',EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE'))
  ORDER BY n.nspname,p.proname)
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='dobby_socle_private' OR (n.nspname='public' AND p.proname IN
   ('dobby_v7_context','dobby_v7_create_child_invitation','dobby_v7_preview_child_invitation','dobby_v7_accept_child_invitation','dobby_v7_family_capabilities'))),
 'restrictivePolicies',(SELECT jsonb_agg(jsonb_build_object('relation',p.polrelid::regclass::text,'name',p.polname,'command',p.polcmd,'restrictive',NOT p.polpermissive) ORDER BY p.polrelid,p.polname)
  FROM pg_policy p WHERE p.polname LIKE 'dobby_socle_%'),
 'requiredNext','Contrôler le lot Missions V3 et Storage séparés ; ne pas activer les flags clients avant leurs preuves serveur réelles.'
)) AS family_verification;
ROLLBACK;

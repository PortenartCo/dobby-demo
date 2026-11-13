-- DOBBY familial seulement. Vérification de catalogue, aucune mutation.
BEGIN READ ONLY;
SELECT pg_catalog.jsonb_pretty(pg_catalog.jsonb_build_object(
 'verification','dobby-missions-intents-v3-1',
 'readOnly',pg_catalog.current_setting('transaction_read_only')='on',
 'realAuthRlsRpcRecipeVerified',false,
 'clientMayBeEnabledByThisResultAlone',false,
 'functions',(
   SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'name',p.proname,'identity',p.oid::pg_catalog.regprocedure::text,'owner',pg_catalog.pg_get_userbyid(p.proowner),
    'securityDefiner',p.prosecdef,'configuration',p.proconfig,
    'definitionMd5',pg_catalog.md5(pg_catalog.pg_get_functiondef(p.oid)),
    'authenticatedExecute',pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'),
    'anonymousExecute',pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')) ORDER BY p.proname)
   FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN ('dobby_missions_v3_write','dobby_missions_v3_capabilities',
    'dobby_missions_v2_write','dobby_missions_v2_write_legacy_socle')),
 'requiredPublicFunctionsPresent',
   pg_catalog.to_regprocedure('public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)') IS NOT NULL
   AND pg_catalog.to_regprocedure('public.dobby_missions_v3_capabilities(uuid)') IS NOT NULL
   AND pg_catalog.to_regprocedure('public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)') IS NOT NULL
   AND pg_catalog.to_regprocedure('public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)') IS NOT NULL,
 'legacyOriginalBodyPreserved',coalesce((
   SELECT pg_catalog.md5(pg_catalog.replace(pg_catalog.pg_get_functiondef(p.oid),
     'CREATE OR REPLACE FUNCTION public.dobby_missions_v2_write_legacy_socle(',
     'CREATE OR REPLACE FUNCTION public.dobby_missions_v2_write('))='3a5bc8dc7117925a158e1fd70dc05709'
   FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
   WHERE p.oid=pg_catalog.to_regprocedure('public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)')),false),
 'legacyAliasClientAccessClosed',coalesce((SELECT NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    AND NOT pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
   FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='dobby_missions_v2_write_legacy_socle'),false),
 'operationTable',(SELECT pg_catalog.jsonb_build_object(
   'present',true,'owner',pg_catalog.pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
   'authenticatedSelect',pg_catalog.has_table_privilege('authenticated',c.oid,'SELECT'),
   'authenticatedInsert',pg_catalog.has_table_privilege('authenticated',c.oid,'INSERT'))
   FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='dobby_socle_private' AND c.relname='mission_operations'),
 'closedWriter',(SELECT pg_catalog.jsonb_build_object(
   'login',r.rolcanlogin,'superuser',r.rolsuper,'bypassRls',r.rolbypassrls,'createRole',r.rolcreaterole,
   'callerCanSet',pg_catalog.pg_has_role(current_user,r.oid,'SET'),
   'callerInherits',pg_catalog.pg_has_role(current_user,r.oid,'USAGE'),
   'anonymousMember',pg_catalog.pg_has_role('anon',r.oid,'MEMBER'),
   'authenticatedMember',pg_catalog.pg_has_role('authenticated',r.oid,'MEMBER'))
   FROM pg_catalog.pg_roles r WHERE r.rolname='dobby_socle_writer'),
 'participantAndIntentProtocol',1,
 'clientVerificationFlag',(SELECT missions_client_verified FROM dobby_socle_private.install_state WHERE singleton),
 'frontendGateMustRemainClosedUntilRealServerRecipe',true,
 'expectedNextStep','Comparer le catalogue puis recetter les RPC réelles Parent/Enfant/inter-foyers, partage, CAS et rejeu. Aucun crédit existant à réinitialiser.'
)) AS missions_v3_verification;
ROLLBACK;

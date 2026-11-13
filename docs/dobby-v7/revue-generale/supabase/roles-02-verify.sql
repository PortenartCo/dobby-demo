-- LECTURE SEULE. Verification EXACTE du seul candidat neuf-policies.
-- Comparaison stricte sous search_path vide : conserver les espaces des litteraux.
-- Un PASS n'atteste PAS les RPC privilegiees, le guard Missions prive ou F09 complet.
BEGIN TRANSACTION READ ONLY;
SET LOCAL search_path='';
SET LOCAL statement_timeout='30s';
WITH expected(policyname,schemaname,tablename,cmd,expression) AS (
 VALUES
 ('dobby_review_dobby_v2_modules_insert','public','dobby_v2_modules','INSERT','public.dobby_v7_review_parent((household_id)::text)'),
 ('dobby_review_dobby_v2_modules_update','public','dobby_v2_modules','UPDATE','public.dobby_v7_review_parent((household_id)::text)'),
 ('dobby_review_dobby_v2_modules_delete','public','dobby_v2_modules','DELETE','public.dobby_v7_review_parent((household_id)::text)'),
 ('dobby_review_dobby_v2_grocery_insert','public','dobby_v2_grocery','INSERT','public.dobby_v7_review_parent((household_id)::text)'),
 ('dobby_review_dobby_v2_grocery_update','public','dobby_v2_grocery','UPDATE','public.dobby_v7_review_parent((household_id)::text)'),
 ('dobby_review_dobby_v2_grocery_delete','public','dobby_v2_grocery','DELETE','public.dobby_v7_review_parent((household_id)::text)'),
 ('dobby_review_objects_insert','storage','objects','INSERT','((bucket_id <> ''dobby-family-files''::text) OR public.dobby_v7_review_parent((storage.foldername(name))[1]))'),
 ('dobby_review_objects_update','storage','objects','UPDATE','((bucket_id <> ''dobby-family-files''::text) OR public.dobby_v7_review_parent((storage.foldername(name))[1]))'),
 ('dobby_review_objects_delete','storage','objects','DELETE','((bucket_id <> ''dobby-family-files''::text) OR public.dobby_v7_review_parent((storage.foldername(name))[1]))')
), policies AS (
 SELECT e.policyname,coalesce(p.permissive='RESTRICTIVE' AND p.cmd=e.cmd AND p.roles=ARRAY['authenticated']::name[]
  AND (CASE WHEN e.cmd IN ('UPDATE','DELETE') THEN p.qual=e.expression ELSE p.qual IS NULL END)
  AND (CASE WHEN e.cmd IN ('UPDATE','INSERT') THEN p.with_check=e.expression ELSE p.with_check IS NULL END),false) AS passed
 FROM expected e LEFT JOIN pg_policies p USING (policyname,schemaname,tablename)
), helper AS (
 SELECT coalesce(bool_and(NOT p.prosecdef AND p.provolatile='s' AND l.lanname='sql'
  AND p.prorettype='boolean'::regtype AND p.proconfig=ARRAY['search_path=""']::text[]
  AND p.prosrc=$body$
 SELECT coalesce(c->>'protocol'='1' AND c->>'phase'='active' AND c->>'householdId'=p_household
   AND jsonb_typeof(c->'memberId')='string' AND length(c->>'memberId') BETWEEN 1 AND 120
   AND c->'profile'->>'id'=c->>'memberId' AND c->'profile'->>'memberCategory'='parent'
   AND c->'permissions'->'canEdit'='true'::jsonb,false)
 FROM (SELECT public.dobby_v7_context() c) context
$body$
  AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE')
  AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
  AND has_function_privilege('authenticated',p.oid,'EXECUTE')),false) AS passed
 FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang WHERE p.oid=to_regprocedure('public.dobby_v7_review_parent(text)')
), context_contract AS (
 SELECT coalesce(bool_and(p.prorettype='jsonb'::regtype AND p.prosecdef AND p.provolatile='s'
  AND p.proconfig @> ARRAY['search_path=""']::text[]
  AND NOT r.rolcanlogin AND NOT r.rolsuper AND NOT r.rolbypassrls
  AND NOT pg_has_role('authenticated',r.oid,'MEMBER')
  AND has_function_privilege('authenticated',p.oid,'EXECUTE')
  AND NOT has_function_privilege('anon',p.oid,'EXECUTE')),false) AS passed
 FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner WHERE p.oid=to_regprocedure('public.dobby_v7_context()')
), client AS (
 SELECT count(*)=1 AND bool_and(NOT rolsuper AND NOT rolbypassrls) AS passed FROM pg_roles WHERE rolname='authenticated'
), tables AS (
 SELECT count(*)=3 AND bool_and(c.relrowsecurity AND NOT pg_has_role('authenticated',c.relowner,'MEMBER')) AS passed
 FROM pg_class c WHERE c.oid IN (to_regclass('public.dobby_v2_modules'),to_regclass('public.dobby_v2_grocery'),to_regclass('storage.objects'))
)
SELECT jsonb_build_object('scope','direct-authenticated-only','completeF09',false,
 'passed',(SELECT bool_and(passed) FROM policies) AND (SELECT passed FROM helper) AND (SELECT passed FROM tables) AND (SELECT passed FROM client) AND (SELECT passed FROM context_contract),
 'policies',(SELECT jsonb_agg(jsonb_build_object('name',policyname,'passed',passed) ORDER BY policyname) FROM policies),
 'helperExact',(SELECT passed FROM helper),'rlsTables',(SELECT passed FROM tables),'clientNotPrivileged',(SELECT passed FROM client),'contextClosed',(SELECT passed FROM context_contract),
 'unverified',jsonb_build_array('private Mission guard','SECURITY DEFINER writers','child completion exception','other-parent management','Storage service/API')) AS role_guard_verification;
ROLLBACK;

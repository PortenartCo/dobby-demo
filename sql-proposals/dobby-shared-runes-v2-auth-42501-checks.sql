-- READ ONLY. Run manually AFTER the standalone 42501 correction, not the initial migration.
-- These catalog checks do not issue JWTs or prove a hosted HTTP request works.
BEGIN READ ONLY;

-- Expected: safe writer flags false, no client/writer memberships.
SELECT rolname,rolcanlogin,rolinherit,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication
FROM pg_catalog.pg_roles WHERE rolname='dobby_missions_v2_writer';
SELECT pg_catalog.pg_has_role('authenticated','dobby_missions_v2_writer','MEMBER') AS authenticated_is_writer,
 pg_catalog.pg_has_role('anon','dobby_missions_v2_writer','MEMBER') AS anon_is_writer,
 pg_catalog.pg_has_role('dobby_missions_v2_writer','authenticated','MEMBER') AS writer_is_authenticated,
 pg_catalog.has_schema_privilege('dobby_missions_v2_writer','auth','USAGE') AS writer_auth_usage;
-- writer_auth_usage may remain false: the correction must NOT require it.

-- Expected: all true; owner is unchanged, public RPC owner remains writer.
WITH expected(signature,fixed_body_sha256) AS (VALUES
 ('public.dobby_missions_v2_capabilities(uuid)','be80e28dc03e10ab05615c1fe757c94e606f3128bcc7c14fb1154eeec1d8a02d'),
 ('public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)','9ab7c1c9bf752900c9433bf6759b57e296139e8b33508309bfec166d99802f45'),
 ('dobby_runes_private.lock_active_membership(uuid)','7f66b4569a016e65db7c504b3441ebd2f7af1219d3ff3a7f003776e4b623a1ff'),
 ('public.dobby_v2_modules_stamp()','fd9faf1d37bf06f04cacae23a20a6010be9ed9fa1806abca3f4e2d84c8e5a312')
)
SELECT e.signature,p.proowner::regrole AS owner,p.prosecdef,p.provolatile,p.proconfig,
 pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')=e.fixed_body_sha256 AS matches_reviewed_fix
FROM expected e LEFT JOIN pg_catalog.pg_proc p ON p.oid=pg_catalog.to_regprocedure(e.signature);

-- Expected: invoker=false for prosecdef, stable=s, empty search_path;
-- PUBLIC/anon/authenticated cannot execute, writer can execute the private helper.
SELECT p.oid::regprocedure AS helper,p.proowner::regrole AS owner,p.prosecdef,p.provolatile,p.proconfig,
 NOT EXISTS(SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
   WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS no_public_execute,
 pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
 pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
 pg_catalog.has_function_privilege('dobby_missions_v2_writer',p.oid,'EXECUTE') AS writer_execute
FROM pg_catalog.pg_proc p WHERE p.oid='dobby_runes_private.request_user_id()'::regprocedure;

-- Existing public RPC ACLs: authenticated=true, anon/PUBLIC=false.
SELECT p.oid::regprocedure AS rpc,p.proowner::regrole AS owner,p.prosecdef,p.proconfig,
 pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
 pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
 EXISTS(SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
   WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute
FROM pg_catalog.pg_proc p WHERE p.oid IN('public.dobby_missions_v2_capabilities(uuid)'::regprocedure,
 'public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)'::regprocedure);

-- Expected: all RLS enabled, no table owned by writer. No UPDATE memberships.
SELECT c.oid::regclass AS relation,c.relrowsecurity,c.relowner::regrole AS owner
FROM pg_catalog.pg_class c WHERE c.oid IN('public.dobby_v2_modules'::regclass,
 'public.dobby_v2_memberships'::regclass,'dobby_runes_private.operations'::regclass);
SELECT pg_catalog.has_table_privilege('dobby_missions_v2_writer','public.dobby_v2_memberships','UPDATE') AS writer_can_change_membership,
 pg_catalog.has_table_privilege('dobby_missions_v2_writer','dobby_runes_private.operations','UPDATE') AS writer_can_change_receipt,
 pg_catalog.has_table_privilege('dobby_missions_v2_writer','dobby_runes_private.operations','DELETE') AS writer_can_delete_receipt;

-- Review ALL policies effective for writer, including policies TO PUBLIC.
-- Expected: no auth.uid() in these expressions; all six reviewed policies present.
SELECT c.oid::regclass AS relation,pol.polname,pol.polcmd,
 pg_catalog.pg_get_expr(pol.polqual,pol.polrelid) AS using_expression,
 pg_catalog.pg_get_expr(pol.polwithcheck,pol.polrelid) AS check_expression
FROM pg_catalog.pg_policy pol JOIN pg_catalog.pg_class c ON c.oid=pol.polrelid
WHERE pol.polrelid IN('public.dobby_v2_modules'::regclass,'public.dobby_v2_memberships'::regclass,'dobby_runes_private.operations'::regclass)
 AND EXISTS(SELECT 1 FROM pg_catalog.unnest(pol.polroles) r(role_oid)
  WHERE CASE WHEN r.role_oid=0 THEN true ELSE pg_catalog.pg_has_role('dobby_missions_v2_writer',r.role_oid,'USAGE') END)
ORDER BY c.oid::regclass::text,pol.polname;

-- Expected: guard and native stamp triggers still enabled and unchanged.
SELECT t.tgname,t.tgenabled,pg_catalog.pg_get_triggerdef(t.oid) AS definition
FROM pg_catalog.pg_trigger t WHERE t.tgrelid='public.dobby_v2_modules'::regclass AND NOT t.tgisinternal;

-- Compare with the pre-install backup/counts. The patch never updates these rows.
SELECT module,count(*) AS rows,min(revision) AS min_revision,max(revision) AS max_revision
FROM public.dobby_v2_modules GROUP BY module ORDER BY module;
SELECT count(*) AS receipt_rows FROM dobby_runes_private.operations;
COMMIT;

-- Hosted validation remains manual: reload the pilot, then retry GET
-- /rest/v1/rpc/dobby_missions_v2_capabilities?p_household_id=<the household UUID>
-- with an active member's real JWT, without putting it into this file or Git.
-- Expected JSON: protocol=2, maxPayloadBytes=262144, directWritesBlocked=true,
-- ledgerVersions=[1,2]. Anonymous/non-member/inactive calls must stay refused.

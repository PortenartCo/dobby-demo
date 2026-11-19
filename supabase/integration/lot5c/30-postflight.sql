BEGIN READ ONLY;
SET LOCAL search_path='';
DO $state$
BEGIN
 IF current_user<>'postgres' OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('dobby_access_legacy.lot5c_state')
  AND relowner='postgres'::regrole AND relrowsecurity AND NOT relforcerowsecurity)
  OR EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
   WHERE c.oid='dobby_access_legacy.lot5c_state'::regclass AND (a.grantee<>'postgres'::regrole OR a.is_grantable))
  OR (SELECT count(*) FROM dobby_access_legacy.lot5c_state)<>1
  OR (SELECT jsonb_agg(jsonb_build_array(p.oid,md5(pg_get_functiondef(p.oid)),p.proowner,p.proacl::text,p.provolatile,p.proconfig) ORDER BY p.oid)
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN
 ('dobby_access_private','dobby_access_legacy','dobby_access_lot3_legacy','dobby_access_auth_bridge','dobby_access_v7_gate')
 OR n.nspname='public' AND p.proname LIKE 'dobby_access_%'
 OR p.oid IN (to_regprocedure('public.dobby_v7_context()'),to_regprocedure('public.dobby_v7_update_profile(jsonb,bigint)'),to_regprocedure('public.dobby_v7_create_household(text,uuid)'),to_regprocedure('public.dobby_v7_create_invitation(integer,uuid)'),to_regprocedure('public.dobby_v7_preview_invitation(text)'),to_regprocedure('public.dobby_v7_accept_invitation(text,uuid)'),to_regprocedure('public.dobby_v7_revoke_invitation(uuid)'),to_regprocedure('public.dobby_v7_bind_existing_member(uuid,text,uuid)'),to_regprocedure('public.dobby_v7_update_magic(text,jsonb,bigint,uuid)'),to_regprocedure('public.dobby_v7_update_member(text,jsonb,bigint,uuid)'),to_regprocedure('public.dobby_v7_create_child_invitation(text,integer,uuid)'),to_regprocedure('public.dobby_v7_preview_child_invitation(text)'),to_regprocedure('public.dobby_v7_accept_child_invitation(text,uuid)'),to_regprocedure('public.dobby_v7_family_capabilities()'),to_regprocedure('public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)'),to_regprocedure('public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)'),to_regprocedure('public.dobby_missions_v2_capabilities(uuid)'),to_regprocedure('public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)'),to_regprocedure('public.dobby_missions_v3_capabilities(uuid)'),to_regprocedure('public.dobby_sync_stamper()'),to_regprocedure('public.dobby_v2_grocery_stamp()'),to_regprocedure('public.dobby_v2_modules_stamp()'),to_regprocedure('dobby_socle_private.actor_context(uuid,boolean)'),to_regprocedure('dobby_socle_private.is_parent(uuid)'),to_regprocedure('dobby_socle_private.can_read(uuid)'),to_regprocedure('dobby_socle_private.legacy_unlinked()'),to_regprocedure('dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb)'))
 OR n.nspname='dobby_socle_private' AND (p.proname LIKE 'access_%' OR p.proname IN ('accept_invitation','create_invitation','preview_invitation','add_pending_member'))) IS DISTINCT FROM (SELECT functions FROM dobby_access_legacy.lot5c_state WHERE singleton) THEN
  RAISE EXCEPTION 'Lot5C installed definition/owner/ACL drift or untrusted journal';
 END IF;
END $state$;
DO $v7_defaults$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole='postgres'::regrole AND d.defaclobjtype IN ('f','n','r','S','T')
   AND a.grantee<>d.defaclrole
   AND NOT(a.grantee=0 AND NOT a.is_grantable AND (d.defaclobjtype='f' AND a.privilege_type='EXECUTE' OR d.defaclobjtype='T' AND a.privilege_type='USAGE'))) THEN
  RAISE EXCEPTION 'Unexpected creator default ACL; review before V7 installation or rollback';
 END IF;
END $v7_defaults$;
DO $v7_gate_acl$
DECLARE f record; n record; role_name text;
BEGIN
 IF EXISTS(SELECT 1 FROM (VALUES
 ('anon'),('authenticated'),('service_role'),('dobby_socle_writer'),('dobby_missions_v2_writer'),('dobby_access_writer')) principal(name)
 WHERE pg_has_role(principal.name,'dobby_v7_writer','MEMBER')) THEN
 RAISE EXCEPTION 'V7 role isolation required for readers and temporary maintenance writers';
END IF;
 IF (SELECT count(*) FROM pg_class WHERE oid IN('dobby_v7_private.pending_profiles'::regclass,'dobby_v7_private.account_links'::regclass,'dobby_v7_private.operations'::regclass,'public.dobby_v2_households'::regclass,'public.dobby_v2_memberships'::regclass,'public.dobby_v2_modules'::regclass))<>6
 OR EXISTS(SELECT 1 FROM pg_class WHERE oid IN('dobby_v7_private.pending_profiles'::regclass,'dobby_v7_private.account_links'::regclass,'dobby_v7_private.operations'::regclass,'public.dobby_v2_households'::regclass,'public.dobby_v2_memberships'::regclass,'public.dobby_v2_modules'::regclass) AND
  (relowner<>'postgres'::regrole OR NOT relrowsecurity OR pg_has_role('dobby_v7_writer',relowner,'USAGE'))) THEN
 RAISE EXCEPTION 'V7 relation owner and enabled RLS required for the write fence';
END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='dobby_access_legacy.v7_gate_state'::regclass
  AND relowner='postgres'::regrole AND relrowsecurity AND NOT relforcerowsecurity AND relkind='r')
  OR EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
   WHERE c.oid='dobby_access_legacy.v7_gate_state'::regclass AND(a.grantee<>'postgres'::regrole OR a.grantor<>'postgres'::regrole OR a.is_grantable))
  OR EXISTS(SELECT 1 FROM pg_attribute c CROSS JOIN LATERAL aclexplode(c.attacl) a
   WHERE c.attrelid='dobby_access_legacy.v7_gate_state'::regclass AND(a.grantee<>'postgres'::regrole OR a.grantor<>'postgres'::regrole OR a.is_grantable)) THEN
  RAISE EXCEPTION 'V7 journal must retain its private owner RLS and ACL';
 END IF;
 SELECT * INTO n FROM pg_namespace WHERE nspname='dobby_access_v7_gate';
 SELECT * INTO f FROM pg_proc WHERE oid='dobby_access_v7_gate.check_access()'::regprocedure;
 IF n.nspowner<>'postgres'::regrole OR f.proowner<>'dobby_access_writer'::regrole
  OR NOT f.prosecdef OR f.provolatile<>'v' OR f.prorettype<>'boolean'::regtype OR f.pronargs<>0 OR f.proretset
  OR f.proconfig IS DISTINCT FROM ARRAY['search_path=""']::text[]
  OR (SELECT count(*) FROM pg_proc WHERE pronamespace=n.oid)<>1
  OR EXISTS(SELECT 1 FROM pg_roles WHERE oid=f.proowner AND(rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication)) THEN
  RAISE EXCEPTION 'Unexpected V7 private guard owner/definition';
 END IF;
 IF EXISTS(SELECT 1 FROM aclexplode(n.nspacl) a WHERE a.grantor<>'postgres'::regrole OR a.is_grantable
  OR NOT(a.grantee='postgres'::regrole AND a.privilege_type IN('USAGE','CREATE')
   OR a.grantee IN('dobby_access_writer'::regrole,'dobby_v7_writer'::regrole) AND a.privilege_type='USAGE'))
  OR EXISTS(SELECT 1 FROM aclexplode(f.proacl) a WHERE a.grantor<>'dobby_access_writer'::regrole OR a.is_grantable
   OR a.grantee NOT IN('dobby_access_writer'::regrole,'dobby_v7_writer'::regrole) OR a.privilege_type<>'EXECUTE')
  OR NOT has_schema_privilege('dobby_v7_writer',n.oid,'USAGE')
  OR has_schema_privilege('dobby_v7_writer',n.oid,'CREATE,USAGE WITH GRANT OPTION')
  OR NOT has_function_privilege('dobby_v7_writer',f.oid,'EXECUTE')
  OR has_function_privilege('dobby_v7_writer',f.oid,'EXECUTE WITH GRANT OPTION')
  OR has_schema_privilege('dobby_access_writer',n.oid,'CREATE') THEN
  RAISE EXCEPTION 'Unexpected V7 guard ACL; only USAGE and one EXECUTE allowed';
 END IF;
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_schema_privilege(role_name,n.oid,'USAGE,CREATE') OR has_function_privilege(role_name,f.oid,'EXECUTE') THEN
   RAISE EXCEPTION 'Unexpected browser/service access to V7 guard';
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_class WHERE relnamespace=n.oid AND
  (has_any_column_privilege('dobby_v7_writer',oid,'SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege('dobby_v7_writer',oid,'DELETE,TRUNCATE,TRIGGER'))) THEN
  RAISE EXCEPTION 'No V7 table rights allowed in private guard schema';
 END IF;
 IF (SELECT count(*) FROM pg_proc WHERE oid IN('public.dobby_v7_context()'::regprocedure,'public.dobby_v7_preview_invitation(text)'::regprocedure,'public.dobby_v7_preview_child_invitation(text)'::regprocedure) AND provolatile='s')<>3 THEN
  RAISE EXCEPTION 'All three public readers must remain STABLE';
 END IF;
END $v7_gate_acl$;
DO $v7_restore_verify$ BEGIN
 IF (SELECT count(*) FROM dobby_access_legacy.v7_gate_state)<>7
  OR (SELECT jsonb_build_object(
 'role',(SELECT jsonb_build_array(rolcanlogin,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolinherit,rolreplication) FROM pg_roles WHERE rolname='dobby_v7_writer'),
 'memberships',(SELECT jsonb_agg(to_jsonb(m) ORDER BY roleid,member,grantor) FROM pg_auth_members m WHERE roleid='dobby_v7_writer'::regrole OR member='dobby_v7_writer'::regrole),
 'schemas',(SELECT jsonb_agg(jsonb_build_array(n.oid,a.grantor,a.privilege_type,a.is_grantable) ORDER BY n.oid,a.grantor,a.privilege_type) FROM pg_namespace n CROSS JOIN LATERAL aclexplode(n.nspacl) a WHERE a.grantee='dobby_v7_writer'::regrole AND n.nspname<>'dobby_access_v7_gate'),
 'tables',(SELECT jsonb_agg(jsonb_build_array(c.oid,a.grantor,a.privilege_type,a.is_grantable) ORDER BY c.oid,a.grantor,a.privilege_type) FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE a.grantee='dobby_v7_writer'::regrole),
 'columns',(SELECT jsonb_agg(jsonb_build_array(c.attrelid,c.attnum,a.grantor,a.privilege_type,a.is_grantable) ORDER BY c.attrelid,c.attnum,a.grantor,a.privilege_type) FROM pg_attribute c CROSS JOIN LATERAL aclexplode(c.attacl) a WHERE a.grantee='dobby_v7_writer'::regrole),
 'functions',(SELECT jsonb_agg(jsonb_build_array(p.oid,a.grantor,a.privilege_type,a.is_grantable) ORDER BY p.oid,a.grantor,a.privilege_type) FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) a JOIN pg_namespace n ON n.oid=p.pronamespace WHERE a.grantee='dobby_v7_writer'::regrole AND n.nspname<>'dobby_access_v7_gate'))) IS DISTINCT FROM (SELECT snapshot FROM dobby_access_legacy.v7_gate_state WHERE key='privileges_before')
  OR (SELECT jsonb_agg(jsonb_build_array(oid,md5(pg_get_functiondef(oid)),proowner,proacl::text) ORDER BY oid) FROM pg_proc WHERE proowner='dobby_v7_writer'::regrole) IS DISTINCT FROM (SELECT snapshot FROM dobby_access_legacy.v7_gate_state WHERE key='owned_before')
  OR (SELECT jsonb_agg(jsonb_build_array(oid,md5(pg_get_functiondef(oid)),proowner,proacl::text,provolatile) ORDER BY oid) FROM pg_proc WHERE oid IN ('public.dobby_v7_context()'::regprocedure,'public.dobby_v7_preview_invitation(text)'::regprocedure,'public.dobby_v7_preview_child_invitation(text)'::regprocedure)) IS DISTINCT FROM (SELECT snapshot FROM dobby_access_legacy.v7_gate_state WHERE key='readers')
  OR (SELECT jsonb_agg(jsonb_build_array(oid,md5(pg_get_functiondef(oid)),proowner,proacl::text) ORDER BY oid) FROM pg_proc WHERE oid IN ('dobby_access_v7_gate.check_access()'::regprocedure,'dobby_access_private.guard_v7_preserved()'::regprocedure,'dobby_access_private.consume_v7_preserved_creation()'::regprocedure)) IS DISTINCT FROM (SELECT snapshot FROM dobby_access_legacy.v7_gate_state WHERE key='objects')
  OR (SELECT jsonb_agg(jsonb_build_array(polrelid,polname,polpermissive,polcmd,polroles,pg_get_expr(polqual,polrelid),pg_get_expr(polwithcheck,polrelid)) ORDER BY polrelid) FROM pg_policy WHERE polname='dobby_access_v7_preserved') IS DISTINCT FROM (SELECT snapshot FROM dobby_access_legacy.v7_gate_state WHERE key='policies')
  OR (SELECT jsonb_agg(jsonb_build_array(tgrelid,tgname,tgenabled,tgtype,tgfoid,pg_get_triggerdef(oid)) ORDER BY tgrelid,tgname) FROM pg_trigger WHERE tgname IN ('dobby_access_00_v7_guard','dobby_access_v7_consume')) IS DISTINCT FROM (SELECT snapshot FROM dobby_access_legacy.v7_gate_state WHERE key='triggers')
  OR (SELECT jsonb_agg(jsonb_build_array(oid,relowner,relrowsecurity,relforcerowsecurity) ORDER BY oid) FROM pg_class WHERE oid IN('dobby_v7_private.pending_profiles'::regclass,'dobby_v7_private.account_links'::regclass,'dobby_v7_private.operations'::regclass,'public.dobby_v2_households'::regclass,'public.dobby_v2_memberships'::regclass,'public.dobby_v2_modules'::regclass)) IS DISTINCT FROM (SELECT snapshot FROM dobby_access_legacy.v7_gate_state WHERE key='relations') THEN
  RAISE EXCEPTION 'Unexpected V7 installed state; no rollback mutation';
 END IF;
END $v7_restore_verify$;
SELECT 'LOT5C_METADATA_INTACT' AS result;
SELECT session_guard_ready,identity_guard_ready,administration_enabled,child_delivery_enabled FROM dobby_access_private.settings WHERE singleton;
COMMIT;

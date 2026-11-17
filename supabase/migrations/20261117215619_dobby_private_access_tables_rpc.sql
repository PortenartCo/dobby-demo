-- Lot 2A candidate. Apply ONLY after a separately approved hosted-catalog review.
-- No old installer is replayed. No Auth, role attribute, or Storage mutation.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
CREATE TEMP TABLE access_2a_manifest(signature text PRIMARY KEY,kind text NOT NULL) ON COMMIT DROP;
INSERT INTO access_2a_manifest VALUES
 ('public.dobby_v7_context()','read'),
 ('public.dobby_v7_update_profile(jsonb,bigint)','write'),
 ('public.dobby_v7_create_household(text,uuid)','create'),
 ('public.dobby_v7_create_invitation(integer,uuid)','write'),
 ('public.dobby_v7_preview_invitation(text)','preview'),
 ('public.dobby_v7_accept_invitation(text,uuid)','write'),
 ('public.dobby_v7_revoke_invitation(uuid)','write'),
 ('public.dobby_v7_bind_existing_member(uuid,text,uuid)','write'),
 ('public.dobby_v7_update_magic(text,jsonb,bigint,uuid)','write'),
 ('public.dobby_v7_update_member(text,jsonb,bigint,uuid)','write'),
 ('public.dobby_v7_create_child_invitation(text,integer,uuid)','write'),
 ('public.dobby_v7_preview_child_invitation(text)','preview'),
 ('public.dobby_v7_accept_child_invitation(text,uuid)','write'),
 ('public.dobby_v7_family_capabilities()','public-flags'),
 ('public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)','write'),
 ('public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)','closed'),
 ('public.dobby_missions_v2_capabilities(uuid)','read'),
 ('public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)','write'),
 ('public.dobby_missions_v3_capabilities(uuid)','read'),
 ('public.dobby_sync_stamper()','trigger'),
 ('public.dobby_v2_grocery_stamp()','trigger'),
 ('public.dobby_v2_modules_stamp()','trigger'),
 ('dobby_socle_private.actor_context(uuid,boolean)','context'),
 ('dobby_socle_private.is_parent(uuid)','predicate'),
 ('dobby_socle_private.can_read(uuid)','predicate'),
 ('dobby_socle_private.legacy_unlinked()','predicate'),
 ('dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb)','write');

-- Body/owner fingerprints of definitions reconstructed from the published sources.
-- Any hosted drift requires review, never a best-effort patch.
CREATE TEMP TABLE access_2a_reference(signature text PRIMARY KEY,body_md5 text,owner_name name,definition_md5 text) ON COMMIT DROP;
INSERT INTO access_2a_reference VALUES
 ('public.dobby_v7_context()','ba0c44890d06743a2331c885a9739265','dobby_socle_writer','730d99915570bb5a465a2d1c8be104d1'),
 ('public.dobby_v7_update_profile(jsonb,bigint)','c4915597121f2b1ea01bf2058987481a','dobby_v7_writer','478f617c98f746586465faa0a57caf99'),
 ('public.dobby_v7_create_household(text,uuid)','05c28a810c14312cd1e85cf308ad9991','dobby_v7_writer','5b08f985d641c264395d212fdeefb08b'),
 ('public.dobby_v7_create_invitation(integer,uuid)','7284d04d29735fc60b64593001729cc7','dobby_socle_writer','188c6d1e83caf7095251b7f3ce63862d'),
 ('public.dobby_v7_preview_invitation(text)','3bec3bf1ddfde81709d7df7c56dad70a','dobby_socle_writer','d6ffdf95fa8c949a4e1ad7df178578cb'),
 ('public.dobby_v7_accept_invitation(text,uuid)','6048f22e8ddf0bf9bb504f10330f269d','dobby_socle_writer','568ed7faef5833eeb9f801010c8e1d16'),
 ('public.dobby_v7_revoke_invitation(uuid)','aafacb8a5114e64a764aa2008025c6b9','dobby_socle_writer','00a81a7c1b96420b6bcebd5cb41e5d05'),
 ('public.dobby_v7_bind_existing_member(uuid,text,uuid)','a7cfc3b4f1f8f90d15fa68beccb4194c','dobby_socle_writer','31ea09b15c4f0ae1a93b8579113d1785'),
 ('public.dobby_v7_update_magic(text,jsonb,bigint,uuid)','c16ddf78c573ffda347191c26ceb988c','dobby_socle_writer','455ccb6fb1a1cdce2262376aa3fe2abe'),
 ('public.dobby_v7_update_member(text,jsonb,bigint,uuid)','319689a81c90aa39a7c78cec26d1c3ec','dobby_socle_writer','43a7ecf25704c60cd3a7c6abdc8f7e25'),
 ('public.dobby_v7_create_child_invitation(text,integer,uuid)','3caf902bd54a142dc2d9e7694bd013b0','dobby_socle_writer','c9a4db8c82a3fff9d95a344e0045da4f'),
 ('public.dobby_v7_preview_child_invitation(text)','1ffbe92562691d9d79411a94220fe70d','dobby_socle_writer','e6476a4d52b95a56bec4864cd046088e'),
 ('public.dobby_v7_accept_child_invitation(text,uuid)','dc4a507ef23545435fb1f565e362b984','dobby_socle_writer','be4debb3177c59dd21999d154a458b6a'),
 ('public.dobby_v7_family_capabilities()','00ffdfdc9ec3b1babb6b0914ab09a188','dobby_socle_writer','01c4af6066e492aac71191b967fdf77a'),
 ('public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)','8be638a0e9119929db3ea34545d8880a','dobby_missions_v2_writer','f6c1a566f7f6a66079d25cf9f4186143'),
 ('public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)','1e12a5646770f5f04ffcaa8eeb9f5b35','dobby_missions_v2_writer','648199d70c9174d67e5f4c9354a44698'),
 ('public.dobby_missions_v2_capabilities(uuid)','7319035ed773aad8af54eb6c2d7f7a9a','dobby_missions_v2_writer','0cb2938afc1c3f6784332ac1a2b23f94'),
 ('public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)','e60f95219aabe2f2ca2ed4346922d6ec','dobby_socle_writer','72856125c45f273065a4c8ca075c8a94'),
 ('public.dobby_missions_v3_capabilities(uuid)','c6d9fc0c0b62c8963ac35758a93bba6d','dobby_socle_writer','d5884eb7f93a96c3895883ddb59a040e'),
 ('public.dobby_sync_stamper()','327272bd4b60d1c869558b1f4bd584fd','postgres','5004be1ada63c4fcb101dde1d24cbb2c'),
 ('public.dobby_v2_grocery_stamp()','612358e1c4bd661055818c36fb1479bd','postgres','b9769355fea53bd2ca1ed195c13d0d3d'),
 ('public.dobby_v2_modules_stamp()','5b486d3c6cdef63a32074abb1ceb9e75','postgres','943a6b127b61a0bb5e6eedfdbeb34368'),
 ('dobby_socle_private.actor_context(uuid,boolean)','d48e72bb46e5864d2bb39bde451da3dc','dobby_socle_writer','b5c7bdbecee13d0ec7151de89597be25'),
 ('dobby_socle_private.is_parent(uuid)','38dc1537cf6c738321f205db9e27f571','dobby_socle_writer','b5e0f3bd223b15925c66cd2bc7f8bb25'),
 ('dobby_socle_private.can_read(uuid)','05141408bf4ae637b333a2e6a5aafcd2','dobby_socle_writer','ae09d747b76ca165bbcc0df039b18d4a'),
 ('dobby_socle_private.legacy_unlinked()','0ba1cda9f3427d826d9673eec01605c8','dobby_socle_writer','14b41f1547e2e110b932797ac720e3c3'),
 ('dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb)','c28920c783b07efe39287d6c6fefabfd','dobby_socle_writer','62eb41b65d31d4df2e1a35f3c310277d');

DO $preflight$
DECLARE f record; r text;
BEGIN
 IF current_user<>'postgres' OR to_regnamespace('dobby_access_legacy') IS NOT NULL
  OR to_regprocedure('dobby_access_private.assert_active()') IS NULL THEN
  RAISE EXCEPTION 'Verified installer, Lot 1 and unapplied Lot 2A required';
 END IF;
 IF EXISTS(SELECT 1 FROM access_2a_manifest WHERE to_regprocedure(signature) IS NULL) THEN
  RAISE EXCEPTION 'Incomplete business catalog; no replacement stubs allowed';
 END IF;
 IF EXISTS(SELECT 1 FROM access_2a_reference r JOIN pg_proc p ON p.oid=to_regprocedure(r.signature) WHERE md5(p.prosrc)<>r.body_md5 OR md5(pg_get_functiondef(p.oid))<>r.definition_md5 OR pg_get_userbyid(p.proowner)<>r.owner_name) THEN
  RAISE EXCEPTION 'Business definition/owner drift; source review required';
 END IF;
 IF EXISTS(SELECT 1 FROM access_2a_manifest WHERE kind='closed'
  AND (has_function_privilege('anon',to_regprocedure(signature),'EXECUTE') OR has_function_privilege('authenticated',to_regprocedure(signature),'EXECUTE'))) THEN
  RAISE EXCEPTION 'Legacy Missions alias must already be closed';
 END IF;
 -- Names alone are insufficient: an unexpected overload is a new API entry.
 FOR f IN SELECT p.oid,p.oid::regprocedure::text sig,n.nspname,p.proname,p.prorettype
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e') LOOP
  IF f.sig NOT IN (SELECT to_regprocedure(signature)::text FROM access_2a_manifest)
   AND f.sig NOT IN ('dobby_access_context()','dobby_access_set_status(uuid,text,bigint,uuid,boolean)','dobby_access_finalize_reactivation(uuid,bigint)')
   THEN
   RAISE EXCEPTION 'Unreviewed public routine: %',f.sig;
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('v','m','f')
  AND (has_any_column_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,REFERENCES') OR has_any_column_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,REFERENCES')
   OR has_table_privilege('anon',c.oid,'DELETE,TRIGGER,TRUNCATE') OR has_table_privilege('authenticated',c.oid,'DELETE,TRIGGER,TRUNCATE'))) THEN
  RAISE EXCEPTION 'Exposed view/foreign relation requires separate source review';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relname NOT IN
  ('dobby_sync_members','dobby_sync_grocery_items','dobby_v2_households','dobby_v2_memberships','dobby_v2_modules','dobby_v2_grocery')
  AND (has_any_column_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,REFERENCES') OR has_any_column_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,REFERENCES')
   OR has_table_privilege('anon',c.oid,'DELETE,TRUNCATE,TRIGGER') OR has_table_privilege('authenticated',c.oid,'DELETE,TRUNCATE,TRIGGER'))) THEN
  RAISE EXCEPTION 'Unreviewed exposed public table';
 END IF;
 FOREACH r IN ARRAY ARRAY['dobby_v7_writer','dobby_socle_writer','dobby_missions_v2_writer','dobby_access_writer'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r AND (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication))
   OR NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid=r::regrole AND member=current_user::regrole AND admin_option AND NOT inherit_option AND NOT set_option)
   OR pg_has_role('anon',r,'MEMBER') OR pg_has_role('authenticated',r,'MEMBER') THEN
   RAISE EXCEPTION 'Existing closed maintenance ADMIN capability required for %',r;
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('dobby_v7_private','dobby_socle_private','dobby_runes_private')
  AND (has_schema_privilege('anon',n.oid,'USAGE') AND has_function_privilege('anon',p.oid,'EXECUTE')
    OR has_schema_privilege('authenticated',n.oid,'USAGE') AND has_function_privilege('authenticated',p.oid,'EXECUTE'))
  AND p.oid NOT IN (SELECT to_regprocedure(signature) FROM access_2a_manifest)) THEN
  RAISE EXCEPTION 'Unreviewed accessible private routine';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname IN ('dobby_v7_private','dobby_socle_private','dobby_runes_private') AND c.relkind IN ('r','p','v','m','f')
  AND (has_any_column_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,REFERENCES') OR has_any_column_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,REFERENCES')
    OR has_table_privilege('anon',c.oid,'DELETE,TRUNCATE,TRIGGER') OR has_table_privilege('authenticated',c.oid,'DELETE,TRUNCATE,TRIGGER'))) THEN
  RAISE EXCEPTION 'Exposed private business relation';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
  AND c.relname IN ('dobby_sync_members','dobby_v2_households','dobby_v2_memberships','dobby_v2_grocery','dobby_v2_modules')
  AND (has_table_privilege('authenticated',c.oid,'TRUNCATE,TRIGGER,REFERENCES')
   OR has_any_column_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,REFERENCES') OR has_table_privilege('anon',c.oid,'DELETE,TRUNCATE,TRIGGER'))) THEN
  RAISE EXCEPTION 'Unexpected browser business privileges';
 END IF;
END $preflight$;

-- Temporary, existing ADMIN maintenance only; no runtime membership is added.
GRANT dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer,dobby_access_writer TO postgres WITH INHERIT TRUE, SET TRUE;
CREATE SCHEMA dobby_access_legacy;
REVOKE ALL ON SCHEMA dobby_access_legacy FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE,CREATE ON SCHEMA dobby_access_legacy TO dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer;
GRANT USAGE ON SCHEMA dobby_access_private TO dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer;
GRANT EXECUTE ON FUNCTION dobby_access_private.is_active(),dobby_access_private.assert_active() TO dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer;
CREATE TABLE dobby_access_legacy.function_backups(signature text PRIMARY KEY,definition text NOT NULL,definition_md5 text NOT NULL,owner_name name NOT NULL);
REVOKE ALL ON dobby_access_legacy.function_backups FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO dobby_access_legacy.function_backups
 SELECT m.signature,pg_get_functiondef(p.oid),md5(pg_get_functiondef(p.oid)),pg_get_userbyid(p.proowner)
 FROM access_2a_manifest m JOIN pg_proc p ON p.oid=to_regprocedure(m.signature);
CREATE TABLE dobby_access_legacy.v1_acl_backups(column_name name,grantee_name name,privilege_type text,grantable boolean);
REVOKE ALL ON dobby_access_legacy.v1_acl_backups FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO dobby_access_legacy.v1_acl_backups
 SELECT NULL,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,a.is_grantable
 FROM pg_class c CROSS JOIN LATERAL aclexplode(c.relacl) a
 WHERE c.oid='public.dobby_sync_grocery_items'::regclass AND a.grantee IN (0,'anon'::regrole,'authenticated'::regrole)
 UNION ALL
 SELECT c.attname,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,a.is_grantable
 FROM pg_attribute c CROSS JOIN LATERAL aclexplode(c.attacl) a
 WHERE c.attrelid='public.dobby_sync_grocery_items'::regclass AND a.grantee IN (0,'anon'::regrole,'authenticated'::regrole);

GRANT CREATE ON SCHEMA dobby_access_private TO dobby_access_writer;
CREATE FUNCTION dobby_access_private.lock_household_creation() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid; allowed boolean;
BEGIN
 IF NOT dobby_access_private.is_active() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Active authorized session required'; END IF;
 u:=(dobby_access_private.request_identity()->>'userId')::uuid;
 -- Exclusive from the outset: no SHARE -> UPDATE upgrade after business locks.
 SELECT can_create_household INTO allowed FROM dobby_access_private.authorizations WHERE user_id=u FOR UPDATE;
 IF NOT FOUND OR NOT dobby_access_private.is_active() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Authorization changed'; END IF;
 RETURN allowed;
END $$;
CREATE FUNCTION dobby_access_private.consume_household_creation() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE dobby_access_private.authorizations SET can_create_household=false
  WHERE user_id=dobby_access_private.assert_active() AND can_create_household;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Approved household quota required'; END IF;
END $$;
ALTER FUNCTION dobby_access_private.lock_household_creation() OWNER TO dobby_access_writer;
ALTER FUNCTION dobby_access_private.consume_household_creation() OWNER TO dobby_access_writer;
REVOKE ALL ON FUNCTION dobby_access_private.lock_household_creation(),dobby_access_private.consume_household_creation() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION dobby_access_private.lock_household_creation(),dobby_access_private.consume_household_creation() TO dobby_v7_writer;
REVOKE CREATE ON SCHEMA dobby_access_private FROM dobby_access_writer;

-- Keep original OIDs, ACLs, owners, defaults and RLS dependencies. Copy bodies
-- to a non-exposed schema, then replace the original body with the guard.
-- The copied bodies retain the exact native CAS/idempotence/role checks.
DO $wrap$
DECLARE m record; f record; def text; head text; legacy text; body text; args text; decl text;
BEGIN
 FOR m IN SELECT * FROM access_2a_manifest WHERE kind NOT IN ('closed','trigger','public-flags') ORDER BY signature LOOP
  SELECT p.*,n.nspname,l.lanname,pg_get_functiondef(p.oid) definition INTO f
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE p.oid=to_regprocedure(m.signature);
  IF f.proretset OR f.proargmodes IS NOT NULL OR f.proargnames IS NULL AND f.pronargs>0 OR f.lanname NOT IN ('sql','plpgsql') THEN RAISE EXCEPTION 'Unsupported signature: %',m.signature; END IF;
  legacy:=format('dobby_access_legacy.%I',f.nspname||'__'||f.proname);
  def:=f.definition;
  def:=replace(def,format('FUNCTION %I.%I(',f.nspname,f.proname),'FUNCTION '||legacy||'(');
  EXECUTE def;
  EXECUTE format('ALTER FUNCTION %s(%s) OWNER TO %I',legacy,pg_get_function_identity_arguments(f.oid),pg_get_userbyid(f.proowner));
  EXECUTE format('REVOKE ALL ON FUNCTION %s(%s) FROM PUBLIC,anon,authenticated,service_role',legacy,pg_get_function_identity_arguments(f.oid));
  SELECT string_agg(format('%I',a),',') INTO args FROM unnest(f.proargnames) WITH ORDINALITY t(a,n) WHERE n<=f.pronargs;
  args:=coalesce(args,'');decl:='';
  body:=CASE m.kind
   WHEN 'predicate' THEN 'IF NOT dobby_access_private.is_active() THEN RETURN false; END IF;'
   WHEN 'preview' THEN 'IF NOT dobby_access_private.is_active() THEN RETURN jsonb_build_object(''status'',''invalid''); END IF;'
   WHEN 'context' THEN 'IF p_lock THEN PERFORM dobby_access_private.assert_active(); ELSIF NOT dobby_access_private.is_active() THEN RAISE EXCEPTION USING ERRCODE=''42501'',MESSAGE=''Active authorized session required''; END IF;'
   WHEN 'read' THEN 'IF NOT dobby_access_private.is_active() THEN RAISE EXCEPTION USING ERRCODE=''42501'',MESSAGE=''Active authorized session required''; END IF;'
   WHEN 'create' THEN 'allowed:=dobby_access_private.lock_household_creation(); IF NOT allowed AND public.dobby_v7_context()->>''phase'' IS DISTINCT FROM ''active'' THEN RAISE EXCEPTION USING ERRCODE=''42501'',MESSAGE=''Owner-approved household creation required''; END IF;'
   ELSE 'PERFORM dobby_access_private.assert_active();' END;
  IF m.kind='create' THEN
   decl:='DECLARE allowed boolean; result jsonb;';
   body:=body||format(' result:=%s(%s); IF result->>''replayed'' IS DISTINCT FROM ''true'' THEN PERFORM dobby_access_private.consume_household_creation(); END IF; RETURN result;',legacy,args);
  ELSIF m.kind='preview' THEN
   decl:='DECLARE result jsonb; c jsonb;';
   body:=body||format(' c:=public.dobby_v7_context(); IF c->>''phase'' IS NULL OR c->>''phase'' NOT IN (''profile'',''household'',''active'') THEN RETURN jsonb_build_object(''status'',''invalid''); END IF; result:=%s(%s); IF c->>''phase''=''active'' AND result->''household''->>''id'' IS DISTINCT FROM c->>''householdId'' THEN RETURN jsonb_build_object(''status'',''invalid''); END IF; RETURN result;',legacy,args);
  ELSIF f.prorettype='void'::regtype THEN body:=body||format(' PERFORM %s(%s); RETURN;',legacy,args);
  ELSE body:=body||format(' RETURN %s(%s);',legacy,args); END IF;
  head:=left(f.definition,strpos(f.definition,'AS $function$')-1);
  IF head='' THEN RAISE EXCEPTION 'Unexpected function serialization'; END IF;
  head:=replace(head,'LANGUAGE sql','LANGUAGE plpgsql');
  EXECUTE head||'AS '||quote_literal(decl||' BEGIN '||body||' END')||';';
 END LOOP;
END $wrap$;

-- Read predicates use a current registry/session lookup, never a JWT status claim.
-- The native permissive AND restrictive family policies remain in place.
DO $tables$
DECLARE t text; r text;
BEGIN
 FOREACH t IN ARRAY ARRAY['dobby_v2_households','dobby_v2_memberships','dobby_v2_grocery','dobby_v2_modules','dobby_sync_members'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=('public.'||t)::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'Native RLS required: %',t; END IF;
  EXECUTE format('CREATE POLICY dobby_access_active ON public.%I AS RESTRICTIVE FOR ALL TO authenticated,dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer USING(dobby_access_private.is_active()) WITH CHECK(dobby_access_private.is_active())',t);
 END LOOP;
 -- V1 has no verified canonical household mapping. Preserve data, close API.
 REVOKE ALL ON public.dobby_sync_grocery_items FROM PUBLIC,anon,authenticated;
 FOR r IN SELECT attname FROM pg_attribute WHERE attrelid='public.dobby_sync_grocery_items'::regclass AND attnum>0 AND NOT attisdropped LOOP
  EXECUTE format('REVOKE SELECT(%I),INSERT(%I),UPDATE(%I),REFERENCES(%I) ON public.dobby_sync_grocery_items FROM PUBLIC,anon,authenticated',r,r,r,r);
 END LOOP;
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF has_any_column_privilege(r,'public.dobby_sync_grocery_items','SELECT,INSERT,UPDATE,REFERENCES')
   OR has_table_privilege(r,'public.dobby_sync_grocery_items','DELETE,TRUNCATE,TRIGGER') THEN
   RAISE EXCEPTION 'Unexpected inherited privileges on V1 grocery; explicit ACL review required';
  END IF;
 END LOOP;
END $tables$;

-- A statement trigger runs before the executor takes any business row locks.
-- An RLS predicate/row trigger alone would be too late for this lock order.
CREATE FUNCTION dobby_access_private.guard_business_statement() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF current_user IN ('anon','authenticated','dobby_v7_writer','dobby_socle_writer','dobby_missions_v2_writer') THEN
  PERFORM dobby_access_private.assert_active();
 ELSIF NOT (current_user='postgres' OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolsuper)) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Unrecognized business writer';
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION dobby_access_private.guard_business_statement() FROM PUBLIC,anon,authenticated,service_role;
DO $triggers$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['dobby_v2_households','dobby_v2_memberships','dobby_v2_grocery','dobby_v2_modules','dobby_sync_members','dobby_sync_grocery_items'] LOOP
  EXECUTE format('CREATE TRIGGER dobby_access_statement_guard BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION dobby_access_private.guard_business_statement()',t);
 END LOOP;
END $triggers$;
REVOKE CREATE ON SCHEMA dobby_access_legacy FROM dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer;
DO $closure$
BEGIN
 IF has_schema_privilege('anon','dobby_access_legacy','USAGE') OR has_schema_privilege('authenticated','dobby_access_legacy','USAGE')
  OR EXISTS(SELECT 1 FROM pg_proc WHERE pronamespace='dobby_access_legacy'::regnamespace
    AND (has_function_privilege('anon',oid,'EXECUTE') OR has_function_privilege('authenticated',oid,'EXECUTE'))) THEN
  RAISE EXCEPTION 'Unexpected inherited/default privileges expose native copies';
 END IF;
END $closure$;
GRANT dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer,dobby_access_writer TO postgres WITH INHERIT FALSE, SET FALSE;
NOTIFY pgrst,'reload schema';
COMMIT;

-- LOCAL CANDIDATE: requires closed ingress before restoring native APIs.
-- LOCAL rollback drill / candidate only. Hosted execution needs distinct approval.
-- Reopens the native pre-Lot-2A APIs: a maintenance outage/closed ingress is a
-- prerequisite. Keep Lot 1, its decisions and all business rows intact.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
DO $$ BEGIN
 IF current_user<>'postgres' OR to_regclass('dobby_access_legacy.function_backups') IS NULL THEN
  RAISE EXCEPTION 'Verified installer and intact Lot 2A backups required';
 END IF;
END $$;
-- Validate the exact approved restore set before any maintenance grant.
-- Additive READ-ONLY preflight candidate, not a migration or a role repair.
-- Run before the reviewed maintenance transaction. Existing migrations stay
-- unchanged and must still pass their own catalogue/permission checks.
-- The historical closing statements update only grants made by postgres.
-- Do not reject its own temporary grant if that closing removes all authority.
DO $lot5b_roles$
DECLARE
 installer oid;
 role_name text;
 target oid;
 targets oid[];
 authority_after_close boolean;
BEGIN
 IF current_setting('server_version_num')::integer<160000 OR current_user<>'postgres'
  OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolsuper) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Verified non-superuser PostgreSQL installer required';
 END IF;
 SELECT oid INTO installer FROM pg_roles WHERE rolname=current_user;
 IF EXISTS(SELECT 1 FROM (VALUES ('dobby_v7_writer'),('dobby_socle_writer'),('dobby_missions_v2_writer')) expected(name)
  WHERE NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=expected.name)) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Existing business writer roles required';
 END IF;
 -- The access writer does not exist before Lot 1; check it too when present.
 SELECT array_agg(oid) INTO targets FROM pg_roles WHERE rolname IN
  ('dobby_v7_writer','dobby_socle_writer','dobby_missions_v2_writer','dobby_access_writer');
 FOREACH target IN ARRAY targets LOOP
  SELECT rolname INTO role_name FROM pg_roles WHERE oid=target;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE oid=target AND
   (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication))
   OR NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid=target AND member=installer
    AND admin_option AND NOT inherit_option AND NOT set_option)
   OR pg_has_role('anon',target,'MEMBER') OR pg_has_role('authenticated',target,'MEMBER') THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE=format('Existing closed ADMIN capability required for %s',role_name);
  END IF;
  -- Project the exact post-state: only the installer's own direct grants to
  -- these writers will be closed. Other grantors and indirect paths survive.
  WITH RECURSIVE can_set(roleid) AS (
   SELECT installer
   UNION
   SELECT m.roleid FROM pg_auth_members m JOIN can_set p ON p.roleid=m.member
   WHERE m.set_option AND NOT(m.member=installer AND m.grantor=installer AND m.roleid=ANY(targets))
  ), can_use(roleid) AS (
   -- A SET-able intermediate role may inherit a writer even when the
   -- installer cannot directly inherit or SET that writer itself.
   SELECT roleid FROM can_set
   UNION
   SELECT m.roleid FROM pg_auth_members m JOIN can_use p ON p.roleid=m.member
   WHERE m.inherit_option AND NOT(m.member=installer AND m.grantor=installer AND m.roleid=ANY(targets))
  ) SELECT EXISTS(SELECT 1 FROM can_use WHERE roleid=target) INTO authority_after_close;
  IF authority_after_close THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE=format('Maintenance would leave active membership for %s',role_name);
  END IF;
 END LOOP;
END $lot5b_roles$;

DO $restore_approval_5b$
DECLARE e jsonb; b record; f record; acl jsonb; expected_acl jsonb; profile text; acl_ok boolean;
BEGIN
 IF (SELECT count(*) FROM dobby_access_legacy.function_backups)<>27 THEN
  RAISE EXCEPTION 'Incomplete approved compatibility backup set';
 END IF;
 FOR e IN SELECT value FROM jsonb_array_elements('[{"signature":"public.dobby_v7_context()","owner":"dobby_socle_writer","definitions":["730d99915570bb5a465a2d1c8be104d1"],"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,dobby_v7_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"anon":false,"authenticated":true},{"signature":"public.dobby_v7_update_profile(jsonb,bigint)","owner":"dobby_v7_writer","definitions":["478f617c98f746586465faa0a57caf99","e9cd180c42b172de4bb6e3087d35d2e0"],"aclProfiles":["{dobby_v7_writer=X/dobby_v7_writer,authenticated=X/dobby_v7_writer}"],"anon":false,"authenticated":true},{"signature":"public.dobby_v7_create_household(text,uuid)","owner":"dobby_v7_writer","definitions":["5b08f985d641c264395d212fdeefb08b","4b92f7429be05ecae44e03965793958c"],"aclProfiles":["{dobby_v7_writer=X/dobby_v7_writer,authenticated=X/dobby_v7_writer}"],"anon":false,"authenticated":true},{"signature":"public.dobby_v7_create_invitation(integer,uuid)","owner":"dobby_socle_writer","definitions":["188c6d1e83caf7095251b7f3ce63862d"],"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"anon":false,"authenticated":true},{"signature":"public.dobby_v7_preview_invitation(text)","owner":"dobby_socle_writer","definitions":["d6ffdf95fa8c949a4e1ad7df178578cb"],"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer,anon=X/dobby_socle_writer}"],"anon":true,"authenticated":true},{"signature":"public.dobby_v7_accept_invitation(text,uuid)","owner":"dobby_socle_writer","definitions":["568ed7faef5833eeb9f801010c8e1d16"],"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"anon":false,"authenticated":true},{"signature":"public.dobby_v7_revoke_invitation(uuid)","owner":"dobby_socle_writer","definitions":["00a81a7c1b96420b6bcebd5cb41e5d05","176afdf0ffb1f495aa35712f1a79917b"],"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"anon":false,"authenticated":true},{"signature":"public.dobby_v7_bind_existing_member(uuid,text,uuid)","owner":"dobby_socle_writer","definitions":["31ea09b15c4f0ae1a93b8579113d1785","f5122d579f0e00142d3fa9aedb504467"],"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer}"],"anon":false,"authenticated":false},{"signature":"public.dobby_v7_update_magic(text,jsonb,bigint,uuid)","owner":"dobby_socle_writer","definitions":["455ccb6fb1a1cdce2262376aa3fe2abe","5511f41b0a217af72a129b0bcbe406b3"],"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"anon":false,"authenticated":true},{"signature":"public.dobby_v7_update_member(text,jsonb,bigint,uuid)","owner":"dobby_socle_writer","definitions":["43a7ecf25704c60cd3a7c6abdc8f7e25","dcee241ca6a37d9342ccdde37534250a"],"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"anon":false,"authenticated":true},{"signature":"public.dobby_v7_create_child_invitation(text,integer,uuid)","owner":"dobby_socle_writer","definitions":["c9a4db8c82a3fff9d95a344e0045da4f","8e137a6adc0606f964b29922835e90f5"],"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"anon":false,"authenticated":true},{"signature":"public.dobby_v7_preview_child_invitation(text)","owner":"dobby_socle_writer","definitions":["e6476a4d52b95a56bec4864cd046088e"],"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer,anon=X/dobby_socle_writer}"],"anon":true,"authenticated":true},{"signature":"public.dobby_v7_accept_child_invitation(text,uuid)","owner":"dobby_socle_writer","definitions":["be4debb3177c59dd21999d154a458b6a"],"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"anon":false,"authenticated":true},{"signature":"public.dobby_v7_family_capabilities()","owner":"dobby_socle_writer","definitions":["01c4af6066e492aac71191b967fdf77a","c8946b6cc1cd45c79221fef852d18d67"],"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer,anon=X/dobby_socle_writer}"],"anon":true,"authenticated":true},{"signature":"public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)","owner":"dobby_missions_v2_writer","definitions":["f6c1a566f7f6a66079d25cf9f4186143","183463fe1a9ed008d109495eb125fb00"],"aclProfiles":["{dobby_missions_v2_writer=X/dobby_missions_v2_writer,authenticated=X/dobby_missions_v2_writer}"],"anon":false,"authenticated":true},{"signature":"public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)","owner":"dobby_missions_v2_writer","definitions":["648199d70c9174d67e5f4c9354a44698","b4d3770d04a83a20472497cbc54d6d0b"],"aclProfiles":["{dobby_missions_v2_writer=X/dobby_missions_v2_writer}"],"anon":false,"authenticated":false},{"signature":"public.dobby_missions_v2_capabilities(uuid)","owner":"dobby_missions_v2_writer","definitions":["0cb2938afc1c3f6784332ac1a2b23f94","7ae3285e2ad55c7b6fe6274600fc4964"],"aclProfiles":["{dobby_missions_v2_writer=X/dobby_missions_v2_writer,authenticated=X/dobby_missions_v2_writer}"],"anon":false,"authenticated":true},{"signature":"public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)","owner":"dobby_socle_writer","definitions":["72856125c45f273065a4c8ca075c8a94","b08e3e6608c570db021dea360413e793"],"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"anon":false,"authenticated":true},{"signature":"public.dobby_missions_v3_capabilities(uuid)","owner":"dobby_socle_writer","definitions":["d5884eb7f93a96c3895883ddb59a040e","aabcc749a98abc42b7edd0b4e68b18b7"],"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"anon":false,"authenticated":true},{"signature":"public.dobby_sync_stamper()","owner":"postgres","definitions":["5004be1ada63c4fcb101dde1d24cbb2c","e26ca6808eb54035f23c083ca87b53b7"],"aclProfiles":["{postgres=X/postgres}","{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}"],"anon":false,"authenticated":false},{"signature":"public.dobby_v2_grocery_stamp()","owner":"postgres","definitions":["b9769355fea53bd2ca1ed195c13d0d3d","ee36503542de1162beba0eed99ac4874"],"aclProfiles":["{postgres=X/postgres}"],"anon":false,"authenticated":false},{"signature":"public.dobby_v2_modules_stamp()","owner":"postgres","definitions":["943a6b127b61a0bb5e6eedfdbeb34368","af31219b7511ffc379184c68d5b4744a"],"aclProfiles":["{postgres=X/postgres}"],"anon":false,"authenticated":false},{"signature":"dobby_socle_private.actor_context(uuid,boolean)","owner":"dobby_socle_writer","definitions":["b5c7bdbecee13d0ec7151de89597be25","637e061b764e9dce6b692bb646870c36"],"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,dobby_missions_v2_writer=X/dobby_socle_writer}"],"anon":false,"authenticated":false},{"signature":"dobby_socle_private.is_parent(uuid)","owner":"dobby_socle_writer","definitions":["b5e0f3bd223b15925c66cd2bc7f8bb25","62e96e71a893d394948bac85c11ca35a"],"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"anon":false,"authenticated":true},{"signature":"dobby_socle_private.can_read(uuid)","owner":"dobby_socle_writer","definitions":["ae09d747b76ca165bbcc0df039b18d4a","1ce26b3479aea7e992d2047cecb0006b"],"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"anon":false,"authenticated":true},{"signature":"dobby_socle_private.legacy_unlinked()","owner":"dobby_socle_writer","definitions":["14b41f1547e2e110b932797ac720e3c3","e6228c783c43d534aae7df7406f210aa"],"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"anon":false,"authenticated":true},{"signature":"dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb)","owner":"dobby_socle_writer","definitions":["62eb41b65d31d4df2e1a35f3c310277d","16d06586efdbfe90e4b61986c37468a4"],"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"anon":false,"authenticated":true}]'::jsonb) LOOP
  SELECT * INTO b FROM dobby_access_legacy.function_backups WHERE signature=e->>'signature';
  IF NOT FOUND OR b.owner_name::text IS DISTINCT FROM e->>'owner'
   OR md5(b.definition) IS DISTINCT FROM b.definition_md5
   OR NOT (e->'definitions' ? b.definition_md5) THEN
   RAISE EXCEPTION 'Unapproved compatibility restore definition: %',e->>'signature';
  END IF;
  SELECT * INTO f FROM pg_proc WHERE oid=to_regprocedure(e->>'signature');
  IF NOT FOUND OR pg_get_userbyid(f.proowner) IS DISTINCT FROM e->>'owner' THEN
   RAISE EXCEPTION 'Unapproved current compatibility owner: %',e->>'signature';
  END IF;
  SELECT jsonb_agg(jsonb_build_array(pg_get_userbyid(a.grantor),
    CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,a.is_grantable)
    ORDER BY a.grantor,a.grantee,a.privilege_type) INTO acl
   FROM aclexplode(coalesce(f.proacl,acldefault('f',f.proowner))) a;
  acl_ok:=false;
  FOR profile IN SELECT jsonb_array_elements_text(e->'aclProfiles') LOOP
   SELECT jsonb_agg(jsonb_build_array(pg_get_userbyid(a.grantor),
     CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type,a.is_grantable)
     ORDER BY a.grantor,a.grantee,a.privilege_type) INTO expected_acl
    FROM aclexplode(profile::aclitem[]) a;
   IF acl IS NOT DISTINCT FROM expected_acl THEN acl_ok:=true; END IF;
  END LOOP;
  IF NOT acl_ok THEN RAISE EXCEPTION 'Unapproved catalogue execution ACL: %',e->>'signature'; END IF;
  IF e->>'signature'='public.dobby_sync_stamper()' THEN
   IF f.prorettype <> 'trigger'::regtype OR f.prosecdef OR NOT EXISTS(
    SELECT 1 FROM pg_trigger t WHERE t.tgfoid=f.oid AND NOT t.tgisinternal AND t.tgenabled IN ('O','A')) THEN
    RAISE EXCEPTION 'Approved stamper must remain an attached invoker trigger';
   END IF;
  ELSIF has_function_privilege('anon',f.oid,'EXECUTE') IS DISTINCT FROM (e->>'anon')::boolean
   OR has_function_privilege('authenticated',f.oid,'EXECUTE') IS DISTINCT FROM (e->>'authenticated')::boolean THEN
   RAISE EXCEPTION 'Unapproved inherited catalogue execution: %',e->>'signature';
  END IF;
 END LOOP;
END $restore_approval_5b$;
GRANT dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer,dobby_access_writer TO postgres WITH INHERIT TRUE, SET TRUE;
DO $restore$
DECLARE f record; t text; recipient text;
BEGIN
 FOR f IN SELECT * FROM dobby_access_legacy.function_backups ORDER BY signature LOOP
  IF md5(f.definition)<>f.definition_md5 THEN RAISE EXCEPTION 'Changed backup: %',f.signature; END IF;
  EXECUTE f.definition;
 END LOOP;
 FOREACH t IN ARRAY ARRAY['dobby_v2_households','dobby_v2_memberships','dobby_v2_grocery','dobby_v2_modules','dobby_sync_members'] LOOP
  EXECUTE format('DROP POLICY dobby_access_active ON public.%I',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['dobby_v2_households','dobby_v2_memberships','dobby_v2_grocery','dobby_v2_modules','dobby_sync_members','dobby_sync_grocery_items'] LOOP
  EXECUTE format('DROP TRIGGER dobby_access_statement_guard ON public.%I',t);
 END LOOP;
 FOR f IN SELECT * FROM dobby_access_legacy.v1_acl_backups LOOP
  recipient:=CASE WHEN f.grantee_name='PUBLIC' THEN 'PUBLIC' ELSE quote_ident(f.grantee_name) END;
  EXECUTE format('GRANT %s%s ON public.dobby_sync_grocery_items TO %s%s',f.privilege_type,
   CASE WHEN f.column_name IS NULL THEN '' ELSE format('(%I)',f.column_name) END,recipient,
   CASE WHEN f.grantable THEN ' WITH GRANT OPTION' ELSE '' END);
 END LOOP;
END $restore$;
DROP FUNCTION dobby_access_private.guard_business_statement() RESTRICT;
DROP FUNCTION dobby_access_private.lock_household_creation() RESTRICT;
DROP FUNCTION dobby_access_private.consume_household_creation() RESTRICT;
-- Explicit closed-body list, no CASCADE that could remove business objects.
DO $drop_bodies$
DECLARE f record;
BEGIN
 FOR f IN SELECT p.oid::regprocedure sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='dobby_access_legacy' LOOP
  EXECUTE format('DROP FUNCTION %s RESTRICT',f.sig);
 END LOOP;
END $drop_bodies$;
DROP TABLE dobby_access_legacy.function_backups,dobby_access_legacy.v1_acl_backups RESTRICT;
REVOKE USAGE ON SCHEMA dobby_access_private FROM dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer;
REVOKE EXECUTE ON FUNCTION dobby_access_private.is_active(),dobby_access_private.assert_active() FROM dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer;
DROP SCHEMA dobby_access_legacy RESTRICT;
GRANT dobby_v7_writer,dobby_socle_writer,dobby_missions_v2_writer,dobby_access_writer TO postgres WITH INHERIT FALSE, SET FALSE;
NOTIFY pgrst,'reload schema';
COMMIT;

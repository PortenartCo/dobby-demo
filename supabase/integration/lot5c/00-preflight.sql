-- READ ONLY metadata; no private bodies, user rows, file paths or credentials output.
BEGIN READ ONLY;
SET LOCAL search_path='';
SET LOCAL statement_timeout='30s';
DO $preflight$
DECLARE r text; f record;
BEGIN
 IF current_user<>'postgres' OR current_setting('server_version_num')::int/10000<>17
  OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolsuper OR NOT rolcreaterole)) THEN RAISE EXCEPTION 'Existing non-superuser PostgreSQL17 postgres installer required'; END IF;
 IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname IN ('dobby_access_private','dobby_access_legacy','dobby_access_lot3_legacy','dobby_access_auth_bridge','dobby_access_v7_gate'))
  OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('dobby_access_writer','dobby_access_session_reader','dobby_access_identity_reader')) THEN RAISE EXCEPTION 'Fresh administration installation required; do not reset or reinstall'; END IF;
 FOREACH r IN ARRAY ARRAY['dobby_v7_private.pending_profiles','dobby_v7_private.account_links','dobby_v7_private.operations','public.dobby_v2_households','public.dobby_v2_memberships','public.dobby_v2_modules'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(r) AND relowner='postgres'::regrole AND relrowsecurity) THEN RAISE EXCEPTION 'Owned RLS business relation required: %',r; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role','dobby_socle_writer','dobby_missions_v2_writer') AND pg_has_role(oid,'dobby_v7_writer','MEMBER')) THEN RAISE EXCEPTION 'V7 isolation required'; END IF;
 IF EXISTS(WITH RECURSIVE s(oid) AS(SELECT 'postgres'::regrole::oid UNION SELECT m.roleid FROM pg_auth_members m JOIN s ON s.oid=m.member WHERE m.set_option),u(oid) AS(SELECT oid FROM s UNION SELECT m.roleid FROM pg_auth_members m JOIN u ON u.oid=m.member WHERE m.inherit_option) SELECT 1 FROM u WHERE oid='dobby_v7_writer'::regrole) THEN RAISE EXCEPTION 'No usable V7 maintenance authority permitted'; END IF;
 FOREACH r IN ARRAY ARRAY['auth.users','auth.sessions'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(r) AND relrowsecurity) THEN RAISE EXCEPTION 'Existing RLS-enabled Auth required'; END IF;
 END LOOP;
 IF NOT has_schema_privilege('postgres','auth','USAGE') OR NOT has_column_privilege('postgres','auth.users','id','REFERENCES')
  OR EXISTS(SELECT 1 FROM (VALUES ('auth.users','id'),('auth.users','email'),('auth.users','email_confirmed_at'),('auth.sessions','id'),('auth.sessions','user_id'),('auth.sessions','created_at'),('auth.sessions','not_after')) a(rel,col) WHERE NOT has_column_privilege('postgres',a.rel,a.col,'SELECT')) THEN RAISE EXCEPTION 'Existing installer Auth projection/REFERENCES required; no Auth repair'; END IF;
 IF coalesce(current_setting('pgrst.db_schemas',true),'') ~ '(^|,)[[:space:]]*(dobby_access_private|dobby_access_legacy|dobby_access_auth_bridge|dobby_access_v7_gate)([[:space:]]*,|$)' THEN RAISE EXCEPTION 'Private schemas must not be exposed'; END IF;
END $preflight$;
DO $v7_defaults$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
  WHERE d.defaclrole='postgres'::regrole AND d.defaclobjtype IN ('f','n','r','S','T')
   AND a.grantee<>d.defaclrole
   AND NOT(a.grantee=0 AND NOT a.is_grantable AND (d.defaclobjtype='f' AND a.privilege_type='EXECUTE' OR d.defaclobjtype='T' AND a.privilege_type='USAGE'))) THEN
  RAISE EXCEPTION 'Unexpected creator default ACL; review before V7 installation or rollback';
 END IF;
END $v7_defaults$;
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
  ('dobby_socle_writer','dobby_missions_v2_writer','dobby_access_writer');
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

-- Exact approved pairs only; no lexical normalization or business write.
DO $catalogue_5b$
DECLARE e jsonb; f record; acl jsonb; expected_acl jsonb; profile text; acl_ok boolean;
BEGIN
 IF current_user <> 'postgres' OR current_setting('server_version_num')::int < 160000
  OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolsuper) THEN
  RAISE EXCEPTION 'Verified non-superuser postgres installer required for catalogue approval';
 END IF;
 FOR e IN SELECT value FROM jsonb_array_elements('[{"signature":"public.dobby_v7_context()","kind":"read","owner":"dobby_socle_writer","securityDefiner":true,"language":"sql","volatility":"s","configuration":["search_path=\"\""],"arguments":"","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,dobby_v7_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"ba0c44890d06743a2331c885a9739265","definitionMD5":"730d99915570bb5a465a2d1c8be104d1","source":"published-reference"}]},{"signature":"public.dobby_v7_update_profile(jsonb,bigint)","kind":"write","owner":"dobby_v7_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_profile jsonb, p_expected_revision bigint","anon":false,"authenticated":true,"aclProfiles":["{dobby_v7_writer=X/dobby_v7_writer,authenticated=X/dobby_v7_writer}"],"pairs":[{"bodyMD5":"c4915597121f2b1ea01bf2058987481a","definitionMD5":"478f617c98f746586465faa0a57caf99","source":"published-reference"},{"bodyMD5":"34be4ec3886d86b4f50227c55f9c18d1","definitionMD5":"e9cd180c42b172de4bb6e3087d35d2e0","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_create_household(text,uuid)","kind":"create","owner":"dobby_v7_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_name text, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_v7_writer=X/dobby_v7_writer,authenticated=X/dobby_v7_writer}"],"pairs":[{"bodyMD5":"05c28a810c14312cd1e85cf308ad9991","definitionMD5":"5b08f985d641c264395d212fdeefb08b","source":"published-reference"},{"bodyMD5":"54228b41c9101243098de608e9c36fba","definitionMD5":"4b92f7429be05ecae44e03965793958c","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_create_invitation(integer,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"sql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_expires_in_hours integer, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"7284d04d29735fc60b64593001729cc7","definitionMD5":"188c6d1e83caf7095251b7f3ce63862d","source":"published-reference"}]},{"signature":"public.dobby_v7_preview_invitation(text)","kind":"preview","owner":"dobby_socle_writer","securityDefiner":true,"language":"sql","volatility":"s","configuration":["search_path=\"\""],"arguments":"p_token text","anon":true,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer,anon=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"3bec3bf1ddfde81709d7df7c56dad70a","definitionMD5":"d6ffdf95fa8c949a4e1ad7df178578cb","source":"published-reference"}]},{"signature":"public.dobby_v7_accept_invitation(text,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"sql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_token text, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"6048f22e8ddf0bf9bb504f10330f269d","definitionMD5":"568ed7faef5833eeb9f801010c8e1d16","source":"published-reference"}]},{"signature":"public.dobby_v7_revoke_invitation(uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_invitation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"aafacb8a5114e64a764aa2008025c6b9","definitionMD5":"00a81a7c1b96420b6bcebd5cb41e5d05","source":"published-reference"},{"bodyMD5":"6ef6ac479b3683ecc8e72effd9def686","definitionMD5":"176afdf0ffb1f495aa35712f1a79917b","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_bind_existing_member(uuid,text,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_user_id uuid, p_member_id text, p_operation_id uuid","anon":false,"authenticated":false,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"a7cfc3b4f1f8f90d15fa68beccb4194c","definitionMD5":"31ea09b15c4f0ae1a93b8579113d1785","source":"published-reference"},{"bodyMD5":"f4516255573304a3e845d267288c02e4","definitionMD5":"f5122d579f0e00142d3fa9aedb504467","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_update_magic(text,jsonb,bigint,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_member_id text, p_values jsonb, p_expected_revision bigint, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"c16ddf78c573ffda347191c26ceb988c","definitionMD5":"455ccb6fb1a1cdce2262376aa3fe2abe","source":"published-reference"},{"bodyMD5":"4adbf459e416a3c237d94d7a3c97b998","definitionMD5":"5511f41b0a217af72a129b0bcbe406b3","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_update_member(text,jsonb,bigint,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_member_id text, p_values jsonb, p_expected_revision bigint, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"319689a81c90aa39a7c78cec26d1c3ec","definitionMD5":"43a7ecf25704c60cd3a7c6abdc8f7e25","source":"published-reference"},{"bodyMD5":"bc5480cd38c04443320a044df2c40505","definitionMD5":"dcee241ca6a37d9342ccdde37534250a","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_create_child_invitation(text,integer,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_member_id text, p_expires_in_hours integer, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"3caf902bd54a142dc2d9e7694bd013b0","definitionMD5":"c9a4db8c82a3fff9d95a344e0045da4f","source":"published-reference"},{"bodyMD5":"f23e8a78d027398c648f5079c0b7e1d9","definitionMD5":"8e137a6adc0606f964b29922835e90f5","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v7_preview_child_invitation(text)","kind":"preview","owner":"dobby_socle_writer","securityDefiner":true,"language":"sql","volatility":"s","configuration":["search_path=\"\""],"arguments":"p_token text","anon":true,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer,anon=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"1ffbe92562691d9d79411a94220fe70d","definitionMD5":"e6476a4d52b95a56bec4864cd046088e","source":"published-reference"}]},{"signature":"public.dobby_v7_accept_child_invitation(text,uuid)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"sql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_token text, p_operation_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"dc4a507ef23545435fb1f565e362b984","definitionMD5":"be4debb3177c59dd21999d154a458b6a","source":"published-reference"}]},{"signature":"public.dobby_v7_family_capabilities()","kind":"public-flags","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"s","configuration":["search_path=\"\""],"arguments":"","anon":true,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer,anon=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"00ffdfdc9ec3b1babb6b0914ab09a188","definitionMD5":"01c4af6066e492aac71191b967fdf77a","source":"published-reference"},{"bodyMD5":"009915f94fb69d9eca749f76d6d798cc","definitionMD5":"c8946b6cc1cd45c79221fef852d18d67","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)","kind":"write","owner":"dobby_missions_v2_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_household_id uuid, p_expected_revision bigint, p_operation_id uuid, p_payload jsonb","anon":false,"authenticated":true,"aclProfiles":["{dobby_missions_v2_writer=X/dobby_missions_v2_writer,authenticated=X/dobby_missions_v2_writer}"],"pairs":[{"bodyMD5":"8be638a0e9119929db3ea34545d8880a","definitionMD5":"f6c1a566f7f6a66079d25cf9f4186143","source":"published-reference"},{"bodyMD5":"c19d7250d6d1c0170746f190cc37a91f","definitionMD5":"183463fe1a9ed008d109495eb125fb00","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)","kind":"closed","owner":"dobby_missions_v2_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_household_id uuid, p_expected_revision bigint, p_operation_id uuid, p_payload jsonb","anon":false,"authenticated":false,"aclProfiles":["{dobby_missions_v2_writer=X/dobby_missions_v2_writer}"],"pairs":[{"bodyMD5":"1e12a5646770f5f04ffcaa8eeb9f5b35","definitionMD5":"648199d70c9174d67e5f4c9354a44698","source":"published-reference"},{"bodyMD5":"fc8629bb62607cda0d0e1fb70d76606e","definitionMD5":"b4d3770d04a83a20472497cbc54d6d0b","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_missions_v2_capabilities(uuid)","kind":"read","owner":"dobby_missions_v2_writer","securityDefiner":true,"language":"plpgsql","volatility":"s","configuration":["search_path=\"\""],"arguments":"p_household_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_missions_v2_writer=X/dobby_missions_v2_writer,authenticated=X/dobby_missions_v2_writer}"],"pairs":[{"bodyMD5":"7319035ed773aad8af54eb6c2d7f7a9a","definitionMD5":"0cb2938afc1c3f6784332ac1a2b23f94","source":"published-reference"},{"bodyMD5":"dcc7672defff4a40edaa41d345bff93b","definitionMD5":"7ae3285e2ad55c7b6fe6274600fc4964","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_household_id uuid, p_expected_revision bigint, p_operation_id uuid, p_intent jsonb","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"e60f95219aabe2f2ca2ed4346922d6ec","definitionMD5":"72856125c45f273065a4c8ca075c8a94","source":"published-reference"},{"bodyMD5":"e08b19bb97d0b56dece38ccb45f13e4a","definitionMD5":"b08e3e6608c570db021dea360413e793","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_missions_v3_capabilities(uuid)","kind":"read","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"s","configuration":["search_path=\"\""],"arguments":"p_household_id uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"c6d9fc0c0b62c8963ac35758a93bba6d","definitionMD5":"d5884eb7f93a96c3895883ddb59a040e","source":"published-reference"},{"bodyMD5":"02c7e27105c537f69479c71b452b9e8c","definitionMD5":"aabcc749a98abc42b7edd0b4e68b18b7","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_sync_stamper()","kind":"trigger","owner":"postgres","securityDefiner":false,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"","anon":false,"authenticated":false,"aclProfiles":["{postgres=X/postgres}","{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}"],"pairs":[{"bodyMD5":"327272bd4b60d1c869558b1f4bd584fd","definitionMD5":"5004be1ada63c4fcb101dde1d24cbb2c","source":"published-reference"},{"bodyMD5":"fa45e3e11adc285d0aea62d8d8ece43b","definitionMD5":"e26ca6808eb54035f23c083ca87b53b7","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v2_grocery_stamp()","kind":"trigger","owner":"postgres","securityDefiner":false,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"","anon":false,"authenticated":false,"aclProfiles":["{postgres=X/postgres}"],"pairs":[{"bodyMD5":"612358e1c4bd661055818c36fb1479bd","definitionMD5":"b9769355fea53bd2ca1ed195c13d0d3d","source":"published-reference"},{"bodyMD5":"ed50edec2a5405ffc2695b80ddd676f4","definitionMD5":"ee36503542de1162beba0eed99ac4874","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"public.dobby_v2_modules_stamp()","kind":"trigger","owner":"postgres","securityDefiner":false,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"","anon":false,"authenticated":false,"aclProfiles":["{postgres=X/postgres}"],"pairs":[{"bodyMD5":"5b486d3c6cdef63a32074abb1ceb9e75","definitionMD5":"943a6b127b61a0bb5e6eedfdbeb34368","source":"published-reference"},{"bodyMD5":"797d1c401fd7794e9b11346b583a00e0","definitionMD5":"af31219b7511ffc379184c68d5b4744a","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"dobby_socle_private.actor_context(uuid,boolean)","kind":"context","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_household uuid, p_lock boolean","anon":false,"authenticated":false,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,dobby_missions_v2_writer=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"d48e72bb46e5864d2bb39bde451da3dc","definitionMD5":"b5c7bdbecee13d0ec7151de89597be25","source":"published-reference"},{"bodyMD5":"61404767b69ee7d011abca3b12b6a33c","definitionMD5":"637e061b764e9dce6b692bb646870c36","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"dobby_socle_private.is_parent(uuid)","kind":"predicate","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"s","configuration":["search_path=\"\""],"arguments":"p_household uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"38dc1537cf6c738321f205db9e27f571","definitionMD5":"b5e0f3bd223b15925c66cd2bc7f8bb25","source":"published-reference"},{"bodyMD5":"c8ffd486d81385ea26bc087b53602c95","definitionMD5":"62e96e71a893d394948bac85c11ca35a","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"dobby_socle_private.can_read(uuid)","kind":"predicate","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"s","configuration":["search_path=\"\""],"arguments":"p_household uuid","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"05141408bf4ae637b333a2e6a5aafcd2","definitionMD5":"ae09d747b76ca165bbcc0df039b18d4a","source":"published-reference"},{"bodyMD5":"b281e880ccfabd6c6a9d8e2ceb442202","definitionMD5":"1ce26b3479aea7e992d2047cecb0006b","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"dobby_socle_private.legacy_unlinked()","kind":"predicate","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"s","configuration":["search_path=\"\""],"arguments":"","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"0ba1cda9f3427d826d9673eec01605c8","definitionMD5":"14b41f1547e2e110b932797ac720e3c3","source":"published-reference"},{"bodyMD5":"93e44c5b1ec3ace5a6fa4cb0be835d6c","definitionMD5":"e6228c783c43d534aae7df7406f210aa","source":"ChatGPT-reported-lexical-review-20261119"}]},{"signature":"dobby_v7_private.assert_snapshot(uuid,jsonb,jsonb)","kind":"write","owner":"dobby_socle_writer","securityDefiner":true,"language":"plpgsql","volatility":"v","configuration":["search_path=\"\""],"arguments":"p_household uuid, p_old jsonb, p_new jsonb","anon":false,"authenticated":true,"aclProfiles":["{dobby_socle_writer=X/dobby_socle_writer,authenticated=X/dobby_socle_writer}"],"pairs":[{"bodyMD5":"c28920c783b07efe39287d6c6fefabfd","definitionMD5":"62eb41b65d31d4df2e1a35f3c310277d","source":"published-reference"},{"bodyMD5":"02f2de08010befdde4d85ce88e13b689","definitionMD5":"16d06586efdbfe90e4b61986c37468a4","source":"ChatGPT-reported-lexical-review-20261119"}]}]'::jsonb) LOOP
  SELECT p.*,l.lanname,pg_get_userbyid(p.proowner) owner_name,
   md5(p.prosrc) body_md5,md5(pg_get_functiondef(p.oid)) definition_md5,
   pg_get_function_identity_arguments(p.oid) arguments
  INTO f FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang
  WHERE p.oid=to_regprocedure(e->>'signature');
  IF NOT FOUND THEN RAISE EXCEPTION 'Missing approved catalogue routine: %',e->>'signature'; END IF;
  IF f.owner_name IS DISTINCT FROM e->>'owner'
   OR f.prosecdef IS DISTINCT FROM (e->>'securityDefiner')::boolean
   OR f.lanname IS DISTINCT FROM e->>'language'
   OR f.provolatile::text IS DISTINCT FROM e->>'volatility'
   OR to_jsonb(f.proconfig) IS DISTINCT FROM e->'configuration'
   OR f.arguments IS DISTINCT FROM e->>'arguments'
   OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(e->'pairs') pair
    WHERE f.body_md5=pair->>'bodyMD5' AND f.definition_md5=pair->>'definitionMD5') THEN
   RAISE EXCEPTION 'Unapproved catalogue pair/owner/attribute drift: %',e->>'signature';
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
END $catalogue_5b$;
-- References from the published Missions installer; no private stub.
DO $missions_5b$
DECLARE e jsonb; f oid;
BEGIN
 FOR e IN SELECT value FROM jsonb_array_elements('[{"signature":"dobby_runes_private.assert_event(jsonb,boolean)","definitionMD5":"143d7eee03b39cd641adc44d5463c98b"},{"signature":"dobby_runes_private.assert_ledger(jsonb)","definitionMD5":"97ca8fc4f7a90da7ab9424d8061eb9c7"},{"signature":"dobby_runes_private.assert_mission(jsonb)","definitionMD5":"a1a81757d2fa0083204a79ecd9f50388"},{"signature":"dobby_runes_private.assert_payload(jsonb)","definitionMD5":"fd72b697c15961425a22da79c4495d1a"},{"signature":"dobby_runes_private.event_key(jsonb)","definitionMD5":"546b184d13d15d74814a2e4a1eee09c1"},{"signature":"dobby_runes_private.has_native_text(text)","definitionMD5":"339a898b0c8c47fcb6f2ef0fd168dbb6"},{"signature":"dobby_runes_private.lock_active_membership(uuid)","definitionMD5":"fbf50ad8e900c6ca1f360038a8abce37"},{"signature":"dobby_runes_private.request_user_id()","definitionMD5":"d6c6cd4743fa2d32d6994d2bf382679c"},{"signature":"dobby_runes_private.safe_integer(jsonb,text)","definitionMD5":"0b7cf60ae2d30086d30bf036eae0e8f5"},{"signature":"dobby_runes_private.same_award(jsonb,jsonb)","definitionMD5":"e43e606d434d8b1e15fe330d83741f42"},{"signature":"dobby_runes_private.utf16_length(text)","definitionMD5":"e2570931d23e3fdbffe397c971df9a31"},{"signature":"dobby_runes_private.valid_date(text)","definitionMD5":"1b25324883b40c6d4e62c15c7a565a58"}]'::jsonb) LOOP
  f:=to_regprocedure(e->>'signature');
  IF f IS NULL OR md5(pg_get_functiondef(f)) IS DISTINCT FROM e->>'definitionMD5' THEN
   RAISE EXCEPTION 'Missing or unapproved private Missions definition: %',e->>'signature';
  END IF;
  IF has_function_privilege('anon',f,'EXECUTE') OR has_function_privilege('authenticated',f,'EXECUTE') THEN
   RAISE EXCEPTION 'Unapproved browser permission on private Missions helper: %',e->>'signature';
  END IF;
 END LOOP;
END $missions_5b$;


DO $family$ BEGIN  IF EXISTS(SELECT 1 FROM (VALUES
 ('dobby_socle_private.accept_invitation(text,uuid,text)','ca2d468a1b8ec7c4401290f0c0bac3f3'),
 ('dobby_socle_private.create_invitation(text,integer,uuid)','8d86dfd05690f3cd5a695245a0bb405e'),
 ('dobby_socle_private.preview_invitation(text,text)','ab75b223e47ee2b4201fa5f3fb444c14'),
 ('dobby_socle_private.add_pending_member(uuid,uuid)','52b9ed6e79041b6860d6a5d614ed98f1')) r(sig,body)
 LEFT JOIN pg_proc p ON p.oid=to_regprocedure(r.sig)
 WHERE p.oid IS NULL OR md5(p.prosrc)<>r.body OR pg_get_userbyid(p.proowner)<>'dobby_socle_writer') THEN
  RAISE EXCEPTION 'Native family definition/owner drift';
 END IF;
 END $family$;
DO $storage_read$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='dobby-family-files' AND NOT public)
  OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='storage.objects'::regclass AND relrowsecurity)
  OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='storage.buckets'::regclass AND relrowsecurity) THEN RAISE EXCEPTION 'Existing private RLS Storage required'; END IF;
 IF (SELECT count(*) FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname IN ('dobby_family_files_read','dobby_family_files_upload','dobby_family_files_delete','dobby_socle_parent_insert','dobby_socle_parent_update','dobby_socle_parent_delete','dobby_socle_canonical_read','dobby_socle_parent_update_allow'))<>8 THEN RAISE EXCEPTION 'Eight native Storage policies required'; END IF;
END $storage_read$;
DO $storage_helpers$
DECLARE expected_operation text:=$source$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$source$;
 expected_any text:=$source$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$source$;
BEGIN
 IF EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid IN ('storage.operation()'::regprocedure,'storage.allow_any_operation(text[])'::regprocedure)
  AND (p.prosecdef OR p.provolatile<>'s' OR p.proconfig IS NOT NULL
   OR p.proowner<>(SELECT relowner FROM pg_class WHERE oid='storage.objects'::regclass)
   OR p.prorettype<>CASE WHEN p.oid='storage.operation()'::regprocedure THEN 'text'::regtype ELSE 'boolean'::regtype END
   OR md5(p.prosrc)<>md5(CASE WHEN p.oid='storage.operation()'::regprocedure THEN expected_operation ELSE expected_any END))) THEN
  RAISE EXCEPTION 'Reviewed Storage operation helper definition required';
 END IF;
END $storage_helpers$;

-- Current foldername comes from the pinned image's tenant migration 0060,
-- which replaces 0002. Every family policy depends on this path parser.
DO $path_helper$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang
  WHERE p.oid=to_regprocedure('storage.foldername(text)')
   AND md5(p.prosrc)='d74c9ac376970bf5b265ecb58e855df9'
   AND l.lanname='plpgsql' AND p.prorettype='text[]'::regtype
   AND p.proowner=(SELECT relowner FROM pg_class WHERE oid='storage.objects'::regclass)
   AND NOT p.prosecdef AND p.provolatile='i' AND p.proconfig IS NULL
   AND p.proargnames=ARRAY['name']::text[] AND p.pronargdefaults=0
   AND NOT p.proretset AND NOT p.proisstrict AND p.proparallel='u') THEN
  RAISE EXCEPTION 'Reviewed Storage foldername helper definition required';
 END IF;
END $path_helper$;



SELECT current_user,current_setting('server_version') AS postgres_version,
 (SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user) AS existing_installer_bypass,
 current_setting('pgrst.db_schemas',true) AS configured_exposed_schemas;
SELECT schemaname,tablename,policyname,md5(coalesce(qual,'')) AS using_md5,md5(coalesce(with_check,'')) AS check_md5 FROM pg_policies WHERE schemaname='auth' AND tablename IN ('users','sessions') ORDER BY tablename,policyname;
SELECT p.polname,p.polcmd,p.polpermissive,md5(pg_get_expr(p.polqual,p.polrelid)) AS using_md5,md5(pg_get_expr(p.polwithcheck,p.polrelid)) AS check_md5 FROM pg_policy p WHERE p.polrelid IN ('storage.objects'::regclass,'storage.buckets'::regclass) ORDER BY p.polname;
SELECT extname,extversion FROM pg_extension ORDER BY extname;
-- SQL cannot prove the platform project identity, SMTP, API schema config,
-- managed policy delegation, or positive Auth RLS visibility: operator evidence required.
COMMIT;

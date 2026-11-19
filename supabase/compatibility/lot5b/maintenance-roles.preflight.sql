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

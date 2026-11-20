-- Prepare only the loginless writer. PostgreSQL 17 adds a bootstrap ADMIN edge.
-- 02-fermer-role.sql removes that edge before any Santé capability can open.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL createrole_self_grant = '';

DO $$
BEGIN
  IF current_user <> 'postgres' OR NOT EXISTS (
    SELECT FROM pg_roles WHERE rolname = current_user AND rolcreaterole AND NOT rolsuper
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Santé 00 exige le rôle applicatif postgres avec CREATEROLE';
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'dobby_health_writer')
     OR to_regnamespace('dobby_health_private') IS NOT NULL THEN
    RAISE EXCEPTION 'Santé 00 déjà préparée ou nom utilisé. Vérifier avec 00-preflight.sql.';
  END IF;
  IF NOT EXISTS (
    SELECT FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE t.tgrelid = to_regclass('public.dobby_v2_modules') AND t.tgname = 'dobby_family_identity_lifecycle'
      AND t.tgenabled = 'A' AND t.tgtype = 29 AND n.nspname = 'dobby_family_identity_private' AND p.proname = 'guard_family'
  ) THEN
    RAISE EXCEPTION 'Santé 00 exige le garde canonique Famille actif sur les trois opérations.';
  END IF;
END $$;

CREATE ROLE dobby_health_writer NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_auth_members WHERE roleid = 'dobby_health_writer'::regrole AND (inherit_option OR set_option)
  ) THEN
    RAISE EXCEPTION 'Santé 00 a créé une délégation SET ou INHERIT inattendue.';
  END IF;
END $$;
COMMIT;

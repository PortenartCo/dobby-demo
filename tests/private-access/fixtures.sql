-- Entirely fictional LOCAL model. No live Auth rows or private function sources.
-- Existing public family test models the hosted installer as NOSUPERUSER with
-- BYPASSRLS. This is a fixture assumption, NEVER a role change in the migration.
CREATE ROLE postgres LOGIN NOSUPERUSER NOCREATEDB CREATEROLE BYPASSRLS;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE dobby_fixture_client LOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOBYPASSRLS;
GRANT authenticated TO dobby_fixture_client WITH INHERIT FALSE, SET TRUE;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE supabase_auth_admin NOLOGIN;
CREATE ROLE dobby_v7_writer NOLOGIN NOINHERIT NOBYPASSRLS;
GRANT CREATE ON DATABASE dobby_access_lot1 TO postgres;
ALTER DATABASE dobby_access_lot1 OWNER TO postgres;
GRANT USAGE, CREATE ON SCHEMA public TO postgres;
CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin;
SET ROLE supabase_auth_admin;
CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
CREATE TABLE auth.sessions(
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL, not_after timestamptz,
 refresh_token_hash text -- deliberately never granted to the access reader
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
   nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO postgres, authenticated, anon;
GRANT SELECT(id), REFERENCES(id) ON auth.users TO postgres;
RESET ROLE;
-- Real pre-existing table and membership-policy DDL is loaded by local-db.mjs.

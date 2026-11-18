-- LOCAL FICTIONAL infrastructure prerequisites only. GoTrue creates and migrates
-- every Auth table itself. This file contains no synthetic auth.users/sessions.
CREATE ROLE postgres LOGIN NOSUPERUSER NOCREATEDB CREATEROLE BYPASSRLS;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE supabase_auth_admin LOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOBYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOBYPASSRLS;
CREATE ROLE dobby_fixture_client LOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOBYPASSRLS;
CREATE ROLE dobby_v7_writer NOLOGIN NOINHERIT NOBYPASSRLS;
GRANT anon,authenticated,service_role TO authenticator WITH INHERIT FALSE, SET TRUE;
GRANT authenticated TO dobby_fixture_client WITH INHERIT FALSE, SET TRUE;
DO $$ BEGIN
 EXECUTE format('GRANT CREATE ON DATABASE %I TO postgres',current_database());
 EXECUTE format('ALTER DATABASE %I OWNER TO postgres',current_database());
END $$;
GRANT USAGE,CREATE ON SCHEMA public TO postgres;
CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin;
ALTER ROLE supabase_auth_admin SET search_path=auth,public;
GRANT USAGE ON SCHEMA auth TO postgres,anon,authenticated,service_role;
-- Public API tables/RPCs are installed later by the business catalog fixture.
-- PostgREST's login can only SET the three API roles and exposes public only.

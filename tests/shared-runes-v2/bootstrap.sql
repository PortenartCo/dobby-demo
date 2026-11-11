-- Isolated PostgreSQL fixture only. Harness refuses any non-labelled Docker target.
-- Minimal Supabase Auth role boundary; JWT issuance itself is not tested here.
DROP SCHEMA IF EXISTS dobby_runes_private CASCADE;
DROP SCHEMA IF EXISTS public CASCADE;
DROP SCHEMA IF EXISTS auth CASCADE;
CREATE SCHEMA public;
CREATE SCHEMA auth;
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='dobby_fixture_authenticator') THEN CREATE ROLE dobby_fixture_authenticator LOGIN; END IF;
END $$;
ALTER ROLE anon NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
ALTER ROLE authenticated NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
ALTER ROLE dobby_fixture_authenticator LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
GRANT anon,authenticated TO dobby_fixture_authenticator;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path=''
AS $$ SELECT COALESCE(NULLIF(pg_catalog.current_setting('request.jwt.claim.sub',true),''),(NULLIF(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'sub'))::uuid $$;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;
CREATE TABLE public.dobby_v2_households(id uuid PRIMARY KEY);
CREATE TABLE public.dobby_v2_memberships(
  household_id uuid NOT NULL REFERENCES public.dobby_v2_households(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL DEFAULT 'member',
  active boolean NOT NULL DEFAULT true,
  PRIMARY KEY(household_id,user_id)
);
ALTER TABLE public.dobby_v2_households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dobby_v2_memberships ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.dobby_v2_households,public.dobby_v2_memberships TO authenticated;
CREATE POLICY fixture_membership_self ON public.dobby_v2_memberships FOR SELECT TO authenticated
USING(user_id=(SELECT auth.uid()));
CREATE POLICY fixture_household_member ON public.dobby_v2_households FOR SELECT TO authenticated
USING(EXISTS(SELECT FROM public.dobby_v2_memberships m WHERE m.household_id=id AND m.user_id=(SELECT auth.uid()) AND m.active));
INSERT INTO auth.users(id) VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333');

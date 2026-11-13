-- SUPPLEMENT ENTIEREMENT FICTIF. Ne jamais appliquer dans Supabase.
-- Le catalogue de base est tests/catalog-fixture.sql du pack stitch19-20.
-- Son guard_missions est un STUB DEFENSIF, PAS la source privée réelle.
DO $$ BEGIN
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='dobby_v7_writer') THEN CREATE ROLE dobby_v7_writer NOLOGIN NOINHERIT NOBYPASSRLS; END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='dobby_missions_v3_writer') THEN CREATE ROLE dobby_missions_v3_writer NOLOGIN NOINHERIT NOBYPASSRLS; END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='dobby_diag_observer') THEN CREATE ROLE dobby_diag_observer NOLOGIN; END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='dobby_diag_fixture_parent') THEN CREATE ROLE dobby_diag_fixture_parent NOLOGIN; END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='dobby_diag_acl_holder') THEN CREATE ROLE dobby_diag_acl_holder NOLOGIN; END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='dobby_diag_acl_middle') THEN CREATE ROLE dobby_diag_acl_middle NOLOGIN; END IF;
 IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='dobby_diag_acl_leaf') THEN CREATE ROLE dobby_diag_acl_leaf NOLOGIN; END IF;
END $$;
GRANT dobby_v7_writer TO dobby_diag_fixture_parent WITH INHERIT FALSE, SET TRUE;
GRANT dobby_diag_fixture_parent TO authenticated WITH INHERIT TRUE, SET FALSE;
GRANT dobby_diag_acl_holder TO dobby_diag_acl_middle WITH INHERIT TRUE, SET TRUE;
GRANT dobby_diag_acl_middle TO dobby_diag_acl_leaf WITH INHERIT TRUE, SET TRUE;
GRANT UPDATE(quantity) ON public.dobby_v2_grocery TO dobby_diag_acl_holder;
ALTER TABLE public.dobby_v2_grocery ADD COLUMN at_home_quantity numeric NOT NULL DEFAULT 0;
ALTER TABLE public.dobby_v2_grocery ADD CONSTRAINT dobby_v2_grocery_at_home_quantity_range
 CHECK(at_home_quantity>=0 AND at_home_quantity<=999999);
CREATE SCHEMA dobby_v7_private;
REVOKE ALL ON SCHEMA dobby_v7_private FROM PUBLIC;
GRANT USAGE ON SCHEMA dobby_v7_private TO dobby_v7_writer;
CREATE TABLE dobby_v7_private.account_links(
 user_id uuid PRIMARY KEY, household_id uuid NOT NULL, member_id text NOT NULL,
 UNIQUE(household_id,member_id),
 FOREIGN KEY(household_id,user_id) REFERENCES public.dobby_v2_memberships(household_id,user_id));
CREATE TABLE dobby_v7_private.invitations(
 id uuid PRIMARY KEY, household_id uuid NOT NULL, target_member_id text,
 token_hash bytea NOT NULL UNIQUE, expires_at timestamptz NOT NULL,
 accepted_by uuid, accepted_at timestamptz, revoked_at timestamptz,
 CHECK((accepted_by IS NULL)=(accepted_at IS NULL)));
CREATE TABLE dobby_v7_private.operations(
 actor_id uuid, operation_id uuid, request_digest bytea, result jsonb,
 PRIMARY KEY(actor_id,operation_id));
CREATE TABLE dobby_v7_private.pending_profiles(user_id uuid PRIMARY KEY,profile jsonb);
CREATE TABLE dobby_v7_private.install_secret(secret text);
INSERT INTO dobby_v7_private.install_secret VALUES('ROW-ONLY-SECRET-SENTINEL');
INSERT INTO dobby_v7_private.pending_profiles VALUES(
 '00000000-0000-4000-8000-000000000099','{"name":"ROW-ONLY-PROFILE-SENTINEL"}');
INSERT INTO dobby_v7_private.invitations VALUES(
 '00000000-0000-4000-8000-000000000098','00000000-0000-4000-8000-000000000097',
 'ROW-ONLY-MEMBER-SENTINEL',convert_to('ROW-ONLY-TOKEN-SENTINEL','UTF8'),now(),null,null,null);
ALTER TABLE dobby_v7_private.account_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE dobby_v7_private.account_links FORCE ROW LEVEL SECURITY;
CREATE POLICY fixture_writer ON dobby_v7_private.account_links TO dobby_v7_writer USING(true) WITH CHECK(true);
GRANT SELECT,INSERT,UPDATE,DELETE ON dobby_v7_private.account_links TO dobby_v7_writer;
CREATE SEQUENCE dobby_runes_private.fixture_receipt_sequence;
GRANT USAGE ON SEQUENCE dobby_runes_private.fixture_receipt_sequence TO dobby_missions_v2_writer;
CREATE SCHEMA unrelated_service_private;
CREATE FUNCTION unrelated_service_private.external_guard() RETURNS void LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'UNRELATED-PRIVATE-SOURCE-SENTINEL'; END $$;
CREATE FUNCTION unrelated_service_private.storage_hook() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'UNRELATED-TRIGGER-SOURCE-SENTINEL'; END $$;
CREATE FUNCTION dobby_v7_private.unused_unrelated_helper() RETURNS text LANGUAGE sql AS $$
 SELECT 'UNREACHABLE-V7-SOURCE-SENTINEL'::text $$;
CREATE FUNCTION dobby_v7_private.fixture_dependency() RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 PERFORM unrelated_service_private.external_guard();
 PERFORM dobby_v7_private.function_not_installed();
 RAISE EXCEPTION 'FUNCTION_NOT_FOR_DIAGNOSTIC_EXECUTION';
END $$;
CREATE FUNCTION dobby_v7_private.actor() RETURNS uuid LANGUAGE plpgsql STABLE SET search_path='' AS $$
BEGIN PERFORM dobby_v7_private.fixture_dependency(); RAISE EXCEPTION 'FUNCTION_NOT_FOR_DIAGNOSTIC_EXECUTION'; END $$;
CREATE FUNCTION public.dobby_v7_context() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN PERFORM dobby_v7_private.actor(); RAISE EXCEPTION 'FUNCTION_NOT_FOR_DIAGNOSTIC_EXECUTION'; END $$;
ALTER FUNCTION public.dobby_v7_context() OWNER TO dobby_v7_writer;
REVOKE ALL ON FUNCTION public.dobby_v7_context() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dobby_v7_context() TO authenticated;
CREATE FUNCTION public.dobby_v7_create_child_invitation(p_member_id text,p_operation_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'FUNCTION_NOT_FOR_DIAGNOSTIC_EXECUTION'; END $$;
CREATE FUNCTION public.dobby_missions_v3_capabilities(p_household_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'FUNCTION_NOT_FOR_DIAGNOSTIC_EXECUTION'; END $$;
CREATE FUNCTION dobby_runes_private.fixture_extra_guard_helper() RETURNS void LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'FUNCTION_NOT_FOR_DIAGNOSTIC_EXECUTION'; END $$;
CREATE FUNCTION public.unrelated_fixture_api() RETURNS text LANGUAGE sql AS $$
 SELECT 'UNRELATED-PUBLIC-SOURCE-SENTINEL'::text $$;
CREATE SCHEMA storage;
CREATE TABLE storage.objects(id bigint GENERATED BY DEFAULT AS IDENTITY,bucket_id text,name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY dobby_family_files ON storage.objects TO authenticated USING(bucket_id='dobby-family-files');
CREATE POLICY unrelated_bucket ON storage.objects TO authenticated USING(bucket_id='OTHER-BUCKET-POLICY-SENTINEL');
CREATE POLICY generic_allow ON storage.objects TO authenticated USING(true);
CREATE TRIGGER generic_hook BEFORE INSERT OR UPDATE ON storage.objects FOR EACH ROW
 EXECUTE FUNCTION unrelated_service_private.storage_hook();
GRANT SELECT ON storage.objects TO authenticated;
REVOKE SELECT,INSERT,UPDATE,DELETE ON public.dobby_v2_grocery FROM anon;
GRANT SELECT(at_home_quantity),UPDATE(at_home_quantity) ON public.dobby_v2_grocery TO anon;
INSERT INTO auth.users VALUES('00000000-0000-4000-8000-000000000096');
INSERT INTO public.dobby_v2_households(id,name) VALUES(
 '00000000-0000-4000-8000-000000000095','ROW-ONLY-HOUSEHOLD-SENTINEL');
INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES(
 '00000000-0000-4000-8000-000000000095','family','{"name":"ROW-ONLY-FAMILY-SENTINEL"}');

-- FICTIONAL ONLY. Canonical DB context, not client-selected category JSON.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE fixture_context_writer NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE fixture_rpc_writer NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'') $$;
GRANT USAGE ON SCHEMA auth TO fixture_context_writer;
GRANT EXECUTE ON FUNCTION auth.uid() TO fixture_context_writer;
CREATE SCHEMA fixture_private;
CREATE TABLE fixture_private.bindings(user_id text PRIMARY KEY, household_id uuid, member_id text, category text, active boolean, can_edit boolean);
ALTER TABLE fixture_private.bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixture_private.bindings FORCE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA fixture_private TO fixture_context_writer;
GRANT SELECT ON fixture_private.bindings TO fixture_context_writer;
CREATE POLICY fixture_canonical_context ON fixture_private.bindings TO fixture_context_writer USING (true);
INSERT INTO fixture_private.bindings VALUES
 ('TEST-parent','00000000-0000-4000-8000-000000000010','TEST-p','parent',true,true),
 ('TEST-child','00000000-0000-4000-8000-000000000010','TEST-c','child',true,false),
 ('TEST-pet','00000000-0000-4000-8000-000000000010','TEST-pet','pet',true,false),
 ('TEST-revoked','00000000-0000-4000-8000-000000000010','TEST-r','parent',false,true),
 ('TEST-parent-no-edit','00000000-0000-4000-8000-000000000010','TEST-n','parent',true,false);
CREATE FUNCTION public.dobby_v7_context() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('protocol',1,'phase',CASE WHEN active THEN 'active' ELSE 'rejected' END,
  'userId',user_id,'householdId',household_id,'memberId',member_id,
  'profile',jsonb_build_object('id',member_id,'memberCategory',category),
  'permissions',jsonb_build_object('canEdit',can_edit))
 FROM fixture_private.bindings WHERE user_id=auth.uid()
$$;
GRANT CREATE ON SCHEMA public TO fixture_context_writer;
ALTER FUNCTION public.dobby_v7_context() OWNER TO fixture_context_writer;
REVOKE CREATE ON SCHEMA public FROM fixture_context_writer;
REVOKE ALL ON FUNCTION public.dobby_v7_context() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dobby_v7_context() TO authenticated;
CREATE TABLE public.dobby_v2_modules(household_id uuid,module text,payload jsonb);
CREATE TABLE public.dobby_v2_grocery(household_id uuid,title text);
CREATE SCHEMA storage;
CREATE TABLE storage.objects(bucket_id text,name text);
-- Model directory components only: a bare filename has no household folder.
CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
 SELECT (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]
$$;
GRANT USAGE ON SCHEMA public,storage TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.dobby_v2_modules,public.dobby_v2_grocery,storage.objects TO authenticated;
ALTER TABLE public.dobby_v2_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dobby_v2_grocery ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
-- Deliberately permissive base: the candidate must independently restrict writes.
CREATE POLICY fixture_member ON public.dobby_v2_modules TO authenticated USING(true) WITH CHECK(true);
CREATE POLICY fixture_member ON public.dobby_v2_grocery TO authenticated USING(true) WITH CHECK(true);
CREATE POLICY fixture_member ON storage.objects TO authenticated USING(true) WITH CHECK(true);
INSERT INTO public.dobby_v2_modules VALUES('00000000-0000-4000-8000-000000000010','menus','{}');
INSERT INTO public.dobby_v2_grocery VALUES('00000000-0000-4000-8000-000000000010','TEST-Preserved');
INSERT INTO storage.objects VALUES('dobby-family-files','00000000-0000-4000-8000-000000000010/TEST.pdf');
-- Explicitly UNSAFE demonstration, not a replacement for the absent real guard.
-- NOBYPASSRLS still uses writer policies, not policies TO authenticated.
GRANT USAGE ON SCHEMA public TO fixture_rpc_writer;
GRANT SELECT,INSERT ON public.dobby_v2_grocery TO fixture_rpc_writer;
CREATE POLICY fixture_privileged_write ON public.dobby_v2_grocery TO fixture_rpc_writer USING(true) WITH CHECK(true);
CREATE FUNCTION public.fixture_unsafe_rpc() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 INSERT INTO public.dobby_v2_grocery VALUES ('00000000-0000-4000-8000-000000000010','TEST-SECDEF-not-covered')
$$;
GRANT CREATE ON SCHEMA public TO fixture_rpc_writer;
ALTER FUNCTION public.fixture_unsafe_rpc() OWNER TO fixture_rpc_writer;
REVOKE CREATE ON SCHEMA public FROM fixture_rpc_writer;
REVOKE ALL ON FUNCTION public.fixture_unsafe_rpc() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fixture_unsafe_rpc() TO authenticated;

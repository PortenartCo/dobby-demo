-- Disposable local catalog. Signal identity through a test JWT setting.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT COALESCE(nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE SCHEMA dobby_v7_private;
CREATE SCHEMA dobby_socle_private;
CREATE TABLE public.dobby_v2_households(id uuid PRIMARY KEY);
CREATE TABLE public.dobby_v2_memberships (
  household_id uuid REFERENCES public.dobby_v2_households,
  user_id uuid, role text NOT NULL DEFAULT 'member', active boolean NOT NULL DEFAULT true,
  PRIMARY KEY(household_id, user_id)
);
CREATE TABLE public.dobby_v2_modules (
  household_id uuid REFERENCES public.dobby_v2_households, module text, payload jsonb, revision bigint,
  PRIMARY KEY(household_id, module)
);
ALTER TABLE public.dobby_v2_modules ENABLE ROW LEVEL SECURITY;
CREATE TABLE dobby_v7_private.account_links(user_id uuid PRIMARY KEY, household_id uuid, member_id text);
CREATE TABLE dobby_v7_private.pending_profiles(user_id uuid PRIMARY KEY, profile jsonb);
CREATE TABLE dobby_socle_private.install_state (
  singleton boolean PRIMARY KEY, family_client_verified boolean, storage_client_verified boolean, missions_client_verified boolean
);
INSERT INTO dobby_socle_private.install_state VALUES(true,true,true,false);
CREATE FUNCTION dobby_v7_private.actor() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT COALESCE(nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid
$$;
CREATE FUNCTION dobby_socle_private.actor() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT dobby_v7_private.actor()
$$;
CREATE FUNCTION dobby_socle_private.members(payload jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE AS
  $$ SELECT payload->'familyMembers' $$;
INSERT INTO public.dobby_v2_households VALUES
  ('00000000-0000-4000-8000-000000000101'),('00000000-0000-4000-8000-000000000102');
INSERT INTO public.dobby_v2_memberships(household_id,user_id)
SELECT '00000000-0000-4000-8000-000000000101', ('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid
FROM generate_series(1,6) i;
INSERT INTO public.dobby_v2_memberships(household_id,user_id) VALUES
  ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000007');
INSERT INTO public.dobby_v2_modules VALUES
  ('00000000-0000-4000-8000-000000000101', 'family', '{"familyMembers":[
    {"id":"parent-a","name":"TEST A","memberCategory":"parent"},
    {"id":"parent-b","name":"TEST B","memberCategory":"parent"},
    {"id":"child","name":"TEST C","memberCategory":"child"},
    {"id":"sibling","name":"TEST D","memberCategory":"child"},
    {"id":"baby","name":"TEST E","memberCategory":"baby"},
    {"id":"pet","name":"TEST F","memberCategory":"pet"},
    {"id":"other-adult","name":"TEST G","memberCategory":"parent"}
  ],"sharedHealthVisits":[{"id":"legacy","note":"TEST unchanged"}]}',1),
  ('00000000-0000-4000-8000-000000000102', 'family', '{"familyMembers":[
    {"id":"parent-a","name":"TEST same canonical text in another home","memberCategory":"parent"}
  ]}',1);
INSERT INTO dobby_v7_private.account_links
SELECT user_id, household_id,
  CASE right(user_id::text,1) WHEN '1' THEN 'parent-a' WHEN '2' THEN 'parent-b'
       WHEN '4' THEN 'sibling' WHEN '5' THEN 'other-adult' WHEN '7' THEN 'parent-a' END
FROM public.dobby_v2_memberships WHERE right(user_id::text,1) IN ('1','2','4','5','7');

#!/usr/bin/env python3
"""No remote DB support. PostgreSQL policy fixture only, no production accounts."""
import json, subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
container='dobby-stitch1920-pg-20261113-review'
info=json.loads(subprocess.check_output(['docker','inspect',container]))[0]
assert info['HostConfig']['NetworkMode']=='none' and not info['HostConfig']['PortBindings']
base=['docker','exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','dobby_local_test']
def sql(text,db='dobby_review_guard_test',error=False):
 p=subprocess.run(base+['-d',db],input=text,text=True,capture_output=True)
 if error:
  assert p.returncode and ('row-level security' in p.stderr or 'permission denied' in p.stderr),p.stderr
 else:assert p.returncode==0,p.stderr
 return p.stdout.strip()
sql('DROP DATABASE IF EXISTS dobby_review_guard_test;','postgres')
sql('CREATE DATABASE dobby_review_guard_test;','postgres')
sql("""
DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; END $$;
CREATE FUNCTION public.dobby_v7_context() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT current_setting('dobby.test_context')::jsonb $$;
CREATE TABLE public.dobby_v2_modules(household_id text,module text,payload jsonb);
CREATE TABLE public.dobby_v2_grocery(household_id text,title text);
CREATE SCHEMA storage;
CREATE TABLE storage.objects(bucket_id text,name text);
CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array($1,'/') $$;
GRANT USAGE ON SCHEMA public,storage TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.dobby_v2_modules,public.dobby_v2_grocery,storage.objects TO authenticated;
ALTER TABLE public.dobby_v2_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dobby_v2_grocery ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_member ON public.dobby_v2_modules TO authenticated USING(true) WITH CHECK(true);
CREATE POLICY fixture_member ON public.dobby_v2_grocery TO authenticated USING(true) WITH CHECK(true);
CREATE POLICY fixture_member ON storage.objects TO authenticated USING(true) WITH CHECK(true);
INSERT INTO public.dobby_v2_modules VALUES('TEST-HOME','menus','{}');
INSERT INTO public.dobby_v2_grocery VALUES('TEST-HOME','TEST-Preserved');
INSERT INTO storage.objects VALUES('dobby-family-files','TEST-HOME/TEST.pdf');
""")
sql((root/'roles-01-apply.sql').read_text())
assert sql((root/'roles-02-verify.sql').read_text()).splitlines()==['t','t']
def as_role(category,statement):
 context=json.dumps({'phase':'active','householdId':'TEST-HOME','profile':{'memberCategory':category}})
 return "SET ROLE authenticated;SET dobby.test_context='"+context+"';"+statement
for category in ['child','pet']:
 for table,row in [('public.dobby_v2_modules',"('TEST-HOME','recipes','{}')"),('public.dobby_v2_grocery',"('TEST-HOME','TEST-Forbidden')"),('storage.objects',"('dobby-family-files','TEST-HOME/TEST-new.pdf')")]:
  sql(as_role(category,f'INSERT INTO {table} VALUES{row};'),error=True)
 assert sql(as_role(category,'SELECT count(*) FROM public.dobby_v2_grocery;'))=='1'
 assert sql(as_role(category,"WITH changed AS (UPDATE public.dobby_v2_grocery SET title='TEST-Forbidden' RETURNING *) SELECT count(*) FROM changed;"))=='0'
 assert sql(as_role(category,'WITH changed AS (DELETE FROM public.dobby_v2_grocery RETURNING *) SELECT count(*) FROM changed;'))=='0'
sql(as_role('parent',"INSERT INTO public.dobby_v2_grocery VALUES('TEST-HOME','TEST-Allowed');"))
sql(as_role('parent',"INSERT INTO public.dobby_v2_grocery VALUES('TEST-OTHER','TEST-Forbidden');"),error=True)
sql(as_role('parent',"INSERT INTO storage.objects VALUES('dobby-family-files','TEST-OTHER/TEST.pdf');"),error=True)
# Leave unrelated buckets governed by their existing policies.
sql(as_role('child',"INSERT INTO storage.objects VALUES('TEST-other-bucket','TEST-object');"))
sql((root/'roles-03-rollback.sql').read_text())
assert sql('SELECT count(*) FROM public.dobby_v2_grocery;')=='2'
sql(as_role('child',"INSERT INTO public.dobby_v2_grocery VALUES('TEST-HOME','TEST-Old-permissions-restored');"))
print('PASS role guard: 9 restrictive policies; child read-only; parent own household; storage isolation; non-destructive rollback. FICTIONAL FIXTURE, not real RPC/RLS certification.')

#!/usr/bin/env python3
"""Separate Storage-policy tests after run-family-local.py; fictional DB only."""
import hashlib,json,subprocess,time,uuid
from pathlib import Path
HERE=Path(__file__).resolve().parent
C='dobby-socle-family-pg-20261113';DB='dobby_socle_family_validation'
info=json.loads(subprocess.check_output(['docker','inspect',C],text=True))[0]
assert info['HostConfig']['NetworkMode']=='none' and not info['HostConfig']['PortBindings']
BASE=['docker','exec','-i',C,'psql','-X','-qAt','-v','ON_ERROR_STOP=1']
checks=[]
def run(sql,user='postgres',actor=None,error=None):
 prefix=''
 if actor:prefix="SET ROLE authenticated;SET request.jwt.claims='"+json.dumps({'sub':uid(actor),'role':'authenticated'})+"';\n"
 p=subprocess.run(BASE+['-U',user,'-d',DB],input=prefix+sql,text=True,capture_output=True)
 if error:assert p.returncode and error in p.stderr,p.stderr;return
 assert p.returncode==0,p.stderr
 return p.stdout.strip()
def uid(n):return '00000000-0000-4000-8000-'+str(n).zfill(12)
def check(s):checks.append(s);print('PASS '+s)
# Managed-helper fixture, explicitly not a claim of its hosted implementation.
run('''CREATE SCHEMA storage;
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text NOT NULL,name text NOT NULL);
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
GRANT USAGE ON SCHEMA storage TO authenticated,postgres;
GRANT EXECUTE ON FUNCTION storage.foldername(text) TO authenticated,postgres;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY dobby_family_files_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='dobby-family-files' AND EXISTS(SELECT 1 FROM public.dobby_v2_memberships m WHERE m.active AND m.user_id=auth.uid() AND m.household_id::text=(storage.foldername(name))[1]));
CREATE POLICY dobby_family_files_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='dobby-family-files' AND EXISTS(SELECT 1 FROM public.dobby_v2_memberships m WHERE m.active AND m.user_id=auth.uid() AND m.household_id::text=(storage.foldername(name))[1]));
CREATE POLICY dobby_family_files_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='dobby-family-files' AND EXISTS(SELECT 1 FROM public.dobby_v2_memberships m WHERE m.active AND m.user_id=auth.uid() AND m.household_id::text=(storage.foldername(name))[1]));
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO postgres WITH GRANT OPTION;
ALTER TABLE storage.objects OWNER TO supabase_storage_admin;
''',user='dobby_local_test')
install=(HERE.parent/'03-install-storage-policies.sql').read_text()
run(install,error='must be owner')
assert run("SELECT count(*) FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname LIKE 'dobby_socle_%';")=='0'
check('managed ownership refusal returns 42501-equivalent and rolls back all five policy creations')
# Positive test deliberately supplies DDL ownership; this does not certify that
# hosted SQL Editor has Supabase-managed delegation to create these policies.
run('ALTER TABLE storage.objects OWNER TO postgres;',user='dobby_local_test')
run(install)
verification=json.loads(run((HERE.parent/'04-verify-storage.sql').read_text()))
assert verification['fourRestrictiveAuthenticatedPolicies'] is True
assert len(verification['policies'])==5 and verification['parentUpdateAllowPolicy'] is True
run("INSERT INTO storage.objects(bucket_id,name) VALUES('dobby-family-files','"+uid(101)+"/TEST-a.pdf');",actor=2)
assert run('SELECT count(*) FROM storage.objects;',actor=3)=='1'
run("INSERT INTO storage.objects(bucket_id,name) VALUES('dobby-family-files','"+uid(101)+"/FORBIDDEN-child.pdf');",actor=3,error='row-level security')
run("INSERT INTO storage.objects(bucket_id,name) VALUES('dobby-family-files','"+uid(102)+"/FORBIDDEN-other-home.pdf');",actor=2,error='row-level security')
assert run("WITH changed AS(UPDATE storage.objects SET name='"+uid(101)+"/FORBIDDEN-child-update.pdf' RETURNING*)SELECT count(*)FROM changed;",actor=3)=='0'
assert run('WITH changed AS(DELETE FROM storage.objects RETURNING*)SELECT count(*)FROM changed;',actor=3)=='0'
assert run('SELECT count(*) FROM storage.objects;',actor=4)=='0'
assert run("WITH changed AS(UPDATE storage.objects SET name='"+uid(101)+"/TEST-parent-update.pdf' RETURNING*)SELECT count(*)FROM changed;",actor=2)=='1'
assert run('SELECT name FROM storage.objects;',actor=2)==uid(101)+'/TEST-parent-update.pdf'
assert run('WITH changed AS(DELETE FROM storage.objects RETURNING*)SELECT count(*)FROM changed;',actor=2)=='1'
check('parent B CRUD accepted; child shared read only; foreign household read/write denied')
# Both verification files are exact, read-only, and do not certify runtime.
family=json.loads(run((HERE.parent/'02-verify-family.sql').read_text()))
assert family['privateTablesClosed'] and family['actorRepairPreserved'] and family['groceryStampPreserved'] and family['moduleStampBranches']
assert family['runtimeOrRealAuthVerified'] is False
check('exact family and Storage metadata verification reports expected protections without real-auth claim')
# Pause an accepted new child transaction before COMMIT. Suspension must wait
# for its shared install-state row lock before it can close the API.
run("UPDATE public.dobby_v2_modules SET payload=jsonb_set(payload,'{familyMembers}',(payload->'familyMembers')||'[{\"id\":\"child-rollback-race\",\"memberCategory\":\"child\",\"name\":\"TEST rollback race\"}]'::jsonb) WHERE household_id='"+uid(101)+"' AND module='family';",user='dobby_local_test')
inv=json.loads(run("SELECT public.dobby_v7_create_child_invitation('child-rollback-race',24,'"+str(uuid.uuid4())+"');",actor=1))
query="SET ROLE authenticated;SET request.jwt.claims='"+json.dumps({'sub':uid(14),'role':'authenticated'})+"';BEGIN;SELECT public.dobby_v7_accept_child_invitation('"+inv['token']+"','"+str(uuid.uuid4())+"')->>'memberId';SELECT 'ACCEPTED_UNCOMMITTED';SELECT pg_sleep(.8);COMMIT;"
pending=subprocess.Popen(BASE+['-U','postgres','-d',DB],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
pending.stdin.write(query);pending.stdin.close()
assert pending.stdout.readline().strip()=='child-rollback-race'
assert pending.stdout.readline().strip()=='ACCEPTED_UNCOMMITTED'
started=time.monotonic()
run((HERE.parent/'05-rollback-suspend.sql').read_text())
assert time.monotonic()-started>.4,'Suspension overtook an authorized uncommitted child acceptance'
assert pending.wait(timeout=8)==0,pending.stderr.read()
run((HERE.parent/'06-rollback-storage.sql').read_text(),error='enfants actifs')
assert run("SELECT count(*) FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname LIKE 'dobby_socle_%';")=='5'
check('uncommitted child acceptance holds suspension barrier; subsequent Storage removal refuses that active child')
# Conservative rollback keeps bindings, profiles, historical credits, policies.
def snapshot():return run("SELECT md5(jsonb_build_object('links',(SELECT jsonb_agg(to_jsonb(l)ORDER BY user_id)FROM dobby_v7_private.account_links l),'modules',(SELECT jsonb_agg(to_jsonb(m)ORDER BY household_id,module)FROM public.dobby_v2_modules m),'invitations',(SELECT jsonb_agg(to_jsonb(i)ORDER BY id)FROM dobby_v7_private.invitations i))::text);",user='dobby_local_test')
before=snapshot();result=json.loads(run((HERE.parent/'05-rollback-suspend.sql').read_text()));assert result['permissionsHardeningRetained']
assert snapshot()==before
caps=json.loads(run("SET ROLE authenticated;SET request.jwt.claims='"+json.dumps({'sub':uid(1),'role':'authenticated'})+"';SELECT public.dobby_v7_family_capabilities();"))
assert caps['familyRolesVerified'] is False and caps['childAccountLinkVerified'] is False and caps['childAccountLinkAvailable'] is False
assert run("SELECT count(*) FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname LIKE 'dobby_socle_%';")=='5'
check('conservative rollback suspends F08/new publication while retaining all links/profiles/credits and RLS hardening')
# Storage-only rollback requires explicit removal and remains a separate action.
run((HERE.parent/'06-rollback-storage.sql').read_text(),error='enfants actifs')
run("UPDATE public.dobby_v2_memberships a SET active=false FROM dobby_v7_private.account_links l,public.dobby_v2_modules m,LATERAL jsonb_array_elements(m.payload->'familyMembers') e WHERE a.household_id=l.household_id AND a.user_id=l.user_id AND m.household_id=l.household_id AND m.module='family' AND e->>'id'=l.member_id AND e->>'memberCategory'='child';",user='dobby_local_test')
run((HERE.parent/'06-rollback-storage.sql').read_text())
assert run("SELECT count(*) FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname LIKE 'dobby_socle_%';")=='0'
check('Storage-only rollback refuses active children; after fictional access suspension removes exactly five policies without file changes')
files=['01-install-family.sql','02-verify-family.sql','03-install-storage-policies.sql','04-verify-storage.sql','05-rollback-suspend.sql','06-rollback-storage.sql']
evidence={'status':'PASS','postgresVersion':run('SHOW server_version;'),'network':'none','scope':'fictional local Storage catalog and direct role boundaries; no hosted delegation claim','checks':checks,'filesSha256':{f:hashlib.sha256((HERE.parent/f).read_bytes()).hexdigest() for f in files},'limitations':['No hosted SQL Editor Storage ownership/delegation success is inferred.','The foldername fixture follows the documented interface; actual managed implementation is not exported.','No remote Supabase mutation or real Auth/browser/file upload tested.','Default functional rollback retains authorization hardening; Storage removal is separate and not routine.']}
p=HERE.parent/'evidence/local-storage-and-rollback.json';p.parent.mkdir(exist_ok=True);p.write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
print('PASS Storage policy boundaries/owner refusal/verification/conservative rollback, local fixture only')

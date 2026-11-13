#!/usr/bin/env python3
"""Disposable stock PG17.7, network none, fictional catalog only. No DB URL support."""
import hashlib, json, os, subprocess, time, uuid
from pathlib import Path
root = Path(__file__).resolve().parents[1]
image = 'postgres:17.7'
name = 'dobby-role-guard-fixture-' + uuid.uuid4().hex[:12]
container = None
results = []
DOCKER = ['docker', '--host', 'unix:///var/run/docker.sock']
LOCAL_ENV = {k:v for k,v in os.environ.items() if k not in {'DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'}}
def command(args, **kwargs):
    if args and args[0] == 'docker': args = DOCKER + args[1:]
    return subprocess.run(args, text=True, capture_output=True, env=LOCAL_ENV, **kwargs)
def sql(text, error=False, expected=None):
    process = command(['docker','exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','dobby_roles_local','-d','postgres'], input=text)
    if expected:
        assert process.returncode and expected in process.stderr, process.stderr
    elif error:
        assert process.returncode and any(value in process.stderr for value in ['row-level security','permission denied']), process.stderr
    else:
        assert process.returncode == 0, process.stderr
    return process.stdout.strip()
def actor(user, statement):
    assert user in ['parent','child','pet','revoked','parent-no-edit','unknown']
    return "SET ROLE authenticated; SET request.jwt.claim.sub='TEST-" + user + "';" + statement
def check(name, run):
    run()
    results.append(name)
    print('PASS ' + name, flush=True)
def verify():
    output = sql((root/'roles-02-verify.sql').read_text())
    # New verifier is a single structured result. Old two-boolean output is kept
    # only for the RED assertion: it incorrectly accepts a weakened policy.
    if output.startswith('{'):
        return json.loads(output)['passed']
    return all(value == 't' for value in output.splitlines())
try:
    assert command(['docker','image','inspect',image]).returncode == 0, 'Use existing postgres:17.7 image; never pull/network.'
    created = command(['docker','run','--detach','--rm','--pull=never','--network=none','--name',name,
        '--label','codex.fixture=dobby-role-guard','--env','POSTGRES_USER=dobby_roles_local',
        '--env','POSTGRES_PASSWORD=FICTIONAL_LOCAL_ONLY',image])
    assert created.returncode == 0, created.stderr
    container = created.stdout.strip()
    info = json.loads(subprocess.check_output(DOCKER + ['inspect',container],env=LOCAL_ENV))[0]
    assert info['Name'] == '/' + name and info['HostConfig']['NetworkMode'] == 'none' and not info['HostConfig']['PortBindings']
    for _ in range(60):
        if command(['docker','exec',container,'pg_isready','-h','127.0.0.1','-U','dobby_roles_local']).returncode == 0:
            break
        time.sleep(.25)
    else:
        raise AssertionError('Fixture PostgreSQL not ready')
    assert sql('SHOW server_version_num;') == '170007'
    sql((root/'tests/role-guard-fixture.sql').read_text())
    sql((root/'roles-01-apply.sql').read_text())
    assert verify(), 'Original candidate structure must verify'
    sql('ALTER POLICY dobby_review_dobby_v2_grocery_update ON public.dobby_v2_grocery USING(true) WITH CHECK(true);')
    assert verify() is False, 'Verifier must reject named restrictive policy with USING(true)'
    sql('ALTER POLICY dobby_review_dobby_v2_grocery_update ON public.dobby_v2_grocery USING(public.dobby_v7_review_parent(household_id::text)) WITH CHECK(public.dobby_v7_review_parent(household_id::text));')
    assert verify(), 'Restored exact policy must verify'
    results.append('exact verifier rejects permissive-looking restrictive policy')
    storage_parent = "public.dobby_v7_review_parent((storage.foldername(name))[1])"
    storage_ok = "(bucket_id <> 'dobby-family-files' OR " + storage_parent + ")"
    storage_mutant = "(bucket_id <> 'dobby- family-files' OR " + storage_parent + ")"
    for clause in ['USING','WITH CHECK']:
        sql('ALTER POLICY dobby_review_objects_update ON storage.objects ' + clause + '(' + storage_mutant + ');')
        assert verify() is False, 'Whitespace inside Storage bucket literal must not be normalized away: ' + clause
        sql('ALTER POLICY dobby_review_objects_update ON storage.objects ' + clause + '(' + storage_ok + ');')
    helper_original = sql("SELECT pg_get_functiondef('public.dobby_v7_review_parent(text)'::regprocedure);")
    sql(helper_original.replace("c->'permissions'", "c->'per missions'"))
    assert verify() is False, 'Whitespace inside helper JSON key must not be normalized away'
    sql(helper_original)
    assert verify()
    results.append('quoted whitespace mutants rejected in both Storage clauses and helper JSON key')

    sql('GRANT EXECUTE ON FUNCTION public.dobby_v7_review_parent(text) TO PUBLIC;')
    assert verify() is False, 'PUBLIC grant must fail verification'
    sql('REVOKE EXECUTE ON FUNCTION public.dobby_v7_review_parent(text) FROM PUBLIC;')
    sql('ALTER FUNCTION public.dobby_v7_review_parent(text) SECURITY DEFINER;')
    assert verify() is False, 'Privilege escalation of helper must fail verification'
    sql('ALTER FUNCTION public.dobby_v7_review_parent(text) SECURITY INVOKER;')
    sql('ALTER POLICY dobby_review_dobby_v2_modules_insert ON public.dobby_v2_modules TO anon;')
    assert verify() is False, 'Wrong policy role must fail verification'
    sql('ALTER POLICY dobby_review_dobby_v2_modules_insert ON public.dobby_v2_modules TO authenticated;')
    helper = sql("SELECT pg_get_functiondef('public.dobby_v7_review_parent(text)'::regprocedure);")
    sql("CREATE OR REPLACE FUNCTION public.dobby_v7_review_parent(p_household text) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT true $$;")
    assert verify() is False, 'Same signature with permissive helper body must fail verification'
    sql(helper)
    sql('ALTER ROLE authenticated BYPASSRLS;')
    assert verify() is False, 'BYPASSRLS client must fail verification'
    sql('ALTER ROLE authenticated NOBYPASSRLS;')
    sql('ALTER ROLE fixture_context_writer LOGIN;')
    assert verify() is False, 'Login-enabled context owner must fail verification'
    sql('ALTER ROLE fixture_context_writer NOLOGIN;')
    assert verify(), 'Restored guard must verify'
    results.append('verifier rejects PUBLIC execute, SECURITY DEFINER helper, wrong policy role, altered body and privileged client')

    for user in ['child','pet','revoked','unknown','parent-no-edit']:
        for table, row in [('public.dobby_v2_modules',"('00000000-0000-4000-8000-000000000010','recipes','{}')"),('public.dobby_v2_grocery',"('00000000-0000-4000-8000-000000000010','TEST-Forbidden')"),('storage.objects',"('dobby-family-files','00000000-0000-4000-8000-000000000010/TEST-new.pdf')")]:
            sql(actor(user, f'INSERT INTO {table} VALUES {row};'), error=True)
        for table, assignment in [('public.dobby_v2_grocery',"title='TEST-Forbidden'"),('public.dobby_v2_modules',"payload='{\"TEST\":true}'::jsonb"),('storage.objects',"name='00000000-0000-4000-8000-000000000010/TEST-Forbidden.pdf'")]:
            assert sql(actor(user, f'WITH changed AS (UPDATE {table} SET {assignment} RETURNING *) SELECT count(*) FROM changed;')) == '0'
            assert sql(actor(user, f'WITH changed AS (DELETE FROM {table} RETURNING *) SELECT count(*) FROM changed;')) == '0'

        results.append(user + ': insert/update/delete restricted')
    sql(actor('child', "UPDATE fixture_private.bindings SET category='parent' WHERE user_id='TEST-child';"), error=True)
    sql(actor('child', "SET request.jwt.claims='{\"user_metadata\":{\"memberCategory\":\"parent\"}}'; INSERT INTO public.dobby_v2_grocery VALUES('00000000-0000-4000-8000-000000000010','TEST-Spoofed');"), error=True)
    assert sql(actor('child','SELECT count(*) FROM public.dobby_v2_grocery;')) == '1'
    sql(actor('parent', "INSERT INTO public.dobby_v2_grocery VALUES('00000000-0000-4000-8000-000000000010','TEST-Allowed');"))
    sql("UPDATE fixture_private.bindings SET can_edit=false WHERE user_id='TEST-parent';")
    sql(actor('parent', "INSERT INTO public.dobby_v2_grocery VALUES('00000000-0000-4000-8000-000000000010','TEST-after-revocation');"), error=True)
    sql("UPDATE fixture_private.bindings SET can_edit=true WHERE user_id='TEST-parent';")
    results.append('canonical bindings protected and permission revocation is effective without trusting JWT user_metadata')
    sql(actor('parent', "UPDATE public.dobby_v2_grocery SET household_id='00000000-0000-4000-8000-000000000020';"), error=True)
    sql(actor('parent', "INSERT INTO public.dobby_v2_grocery VALUES('00000000-0000-4000-8000-000000000020','TEST-Forbidden');"), error=True)
    for path in ['00000000-0000-4000-8000-000000000020/TEST.pdf','00000000-0000-4000-8000-000000000010','/TEST.pdf']:
        sql(actor('parent', "INSERT INTO storage.objects VALUES('dobby-family-files','"+path+"');"), error=True)
    sql(actor('parent', "INSERT INTO storage.objects VALUES('dobby-family-files','00000000-0000-4000-8000-000000000010/allowed.pdf');"))
    sql(actor('parent', "UPDATE storage.objects SET name='00000000-0000-4000-8000-000000000020/moved.pdf' WHERE name='00000000-0000-4000-8000-000000000010/allowed.pdf';"), error=True)
    sql(actor('child', "INSERT INTO storage.objects VALUES('TEST-other-bucket','TEST-object');"))
    results.append('canonical parent own household only; storage root/move isolation; unrelated bucket unchanged')
    # Document the proven boundary instead of claiming all SECURITY DEFINER RPCs
    # are protected: the real private Mission guard remains unknown.
    sql(actor('child', 'SELECT public.fixture_unsafe_rpc();'))
    assert sql("SELECT count(*) FROM public.dobby_v2_grocery WHERE title='TEST-SECDEF-not-covered';") == '1'
    results.append('LIMITATION reproduced: restricted authenticated policies do not cover separate SECURITY DEFINER writer role')
    sql((root/'roles-03-rollback.sql').read_text())
    assert sql('SELECT count(*) FROM public.dobby_v2_grocery;') == '3'
    sql(actor('child', "INSERT INTO public.dobby_v2_grocery VALUES('00000000-0000-4000-8000-000000000010','TEST-Old-rights-restored');"))
    results.append('rollback preserves all rows and restores prior direct permissions')
    sql('ALTER TABLE public.dobby_v2_grocery DISABLE ROW LEVEL SECURITY;')
    sql((root/'roles-01-apply.sql').read_text(), expected='RLS/propriete non conforme')
    assert sql("SELECT to_regprocedure('public.dobby_v7_review_parent(text)') IS NULL;") == 't'
    sql('ALTER TABLE public.dobby_v2_grocery ENABLE ROW LEVEL SECURITY;')
    sql('ALTER ROLE fixture_context_writer LOGIN;')
    sql((root/'roles-01-apply.sql').read_text(), expected='Proprietaire/contexte V7 non ferme')
    sql('ALTER ROLE fixture_context_writer NOLOGIN;')
    sql((root/'roles-01-apply.sql').read_text())
    assert verify()
    sql((root/'roles-03-rollback.sql').read_text())
    results.append('prerequisites reject disabled RLS and login-enabled context owner without partial install')

    output = {'status':'PASS','postgres':'17.7','imageId':info['Image'],'network':'none','fictionalOnly':True,'liveBackendVerified':False,'completeF09':False,'sourceSha256':{name:hashlib.sha256((root/name).read_bytes()).hexdigest() for name in ['roles-01-apply.sql','roles-02-verify.sql','roles-03-rollback.sql','tests/role-guard-fixture.sql','tests/run-role-guard-local.py']},'tests':results}
    evidence = Path(os.environ.get('DOBBY_ROLE_EVIDENCE_DIR','/workspace/dobby-roles-evidence'))
    evidence.mkdir(parents=True,exist_ok=True)
    (evidence/'results.json').write_text(json.dumps(output,indent=2)+'\n')
    print(json.dumps(output,ensure_ascii=False),flush=True)
finally:
    if container:
        command(['docker','rm','--force',container])

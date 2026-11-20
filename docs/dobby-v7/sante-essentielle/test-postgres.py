#!/usr/bin/env python3
"""Run the Santé migration and assertions on a fresh, networkless PG container."""
import argparse
import base64
import concurrent.futures
import hashlib
import hmac
import json
from pathlib import Path
import runpy
import subprocess
import time
from urllib.parse import urlencode
from uuid import uuid4

HERE = Path(__file__).resolve().parent
CONTAINER = f'dobby-sante-local-{uuid4().hex[:10]}'
DB = 'dobby_health_tests'
BOOTSTRAP = 'dobby_fixture_admin'
STORAGE = CONTAINER + '-storage'
REST = CONTAINER + '-rest'
REST_IMAGE = 'postgrest/postgrest:v14.8@sha256:4173b72e0be29cf15349dc827798c3e464c5f2cc7f9c1697022f9cd1874b4c36'
STORAGE_IMAGE = 'supabase/storage-api:v1.89.12@sha256:8526956cb462e9f7d392e9848ec77133b2769982ed614e9753cc687e8e4339a6'
JWT_KEY = b'DOBBY health test fixture only, not a real credential'


def run(*args, **kwargs):
    return subprocess.run(args, text=True, check=True, capture_output=True, **kwargs).stdout.strip()


def uid(n):
    return f'00000000-0000-4000-8000-{n:012}'


def quote(value):
    if value is None:
        return 'NULL'
    if isinstance(value, (dict, list)):
        return quote(json.dumps(value)) + '::jsonb'
    if isinstance(value, int):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def sql(code, user=None, operation=None, error=None, role=None, effective=None):
    prefix = ''
    if user:
        prefix = f'SET ROLE authenticated; SET request.jwt.claim.sub = {quote(uid(user))};'
    elif role:
        prefix = f'SET ROLE {role};'
    elif effective and effective != 'postgres':
        prefix = f'SET SESSION AUTHORIZATION {effective};'
    if operation:
        prefix += f'SET storage.test.operation = {quote(operation)};'
    login = 'postgres' if effective == 'postgres' else BOOTSTRAP
    result = subprocess.run(['docker', 'exec', '-i', CONTAINER, 'psql', '-U', login, '-d', DB,
                             '-XqAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'],
                            input=prefix + '\n' + code, text=True, capture_output=True)
    if error:
        assert result.returncode and error in result.stderr, (result.stdout, result.stderr)
        return
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


def rpc(name, args, **options):
    value = sql(f"SELECT public.dobby_health_{name}({','.join(map(quote, args))});", **options)
    return json.loads(value) if value is not None else None


def read(user, view, person=None, *, home=101, error=None):
    return rpc('read', [uid(home), view, person], user=user, error=error)


def write(user, row, person, kind, values=None, *, revision=0, action='save', op=None, error=None, home=101):
    return rpc('write', [uid(home), uid(row), person, kind, action, revision, op or uuid4(), values or {}],
               user=user, error=error)


def published_fields(result, keys):
    assert len(result) == 1 and set(result[0]) == set(keys.split())
    assert 'SECRET' not in json.dumps(result)


def check():
    date_today, tomorrow = sql("""SELECT (now() AT TIME ZONE 'Europe/Brussels')::date,
                                       (now() AT TIME ZONE 'Europe/Brussels')::date + 1;""").split('|')
    before = sql("SELECT md5(jsonb_agg(to_jsonb(m) ORDER BY household_id,module)::text) FROM public.dobby_v2_modules m;")
    for actor in (1, 2):
        sql(f"""INSERT INTO dobby_health_private.caregivers VALUES
             ('{uid(101)}','child','{uid(actor)}','parent-{'a' if actor == 1 else 'b'}');""")
    assert [row['id'] for row in read(1, 'people')] == ['parent-a', 'child']
    assert [row['id'] for row in read(2, 'people')] == ['parent-b', 'child']
    assert [row['id'] for row in read(5, 'people')] == ['other-adult']
    assert [row['id'] for row in read(7, 'people', home=102)] == ['parent-a']
    assert read(7, 'private', 'parent-a', home=102) == []
    read(7, 'private', 'parent-a', error='42501')
    read(6, 'people', error='42501')
    read(4, 'private', 'child', error='42501')
    sql(f"SELECT public.dobby_health_read('{uid(101)}','people');", role='anon', error='42501')
    sql('SELECT * FROM dobby_health_private.entries;', user=1, error='42501')
    sql('INSERT INTO dobby_health_private.caregivers VALUES (NULL,NULL,NULL,NULL);', user=1, error='42501')
    assert sql("SELECT count(*) FROM pg_auth_members WHERE roleid='dobby_health_writer'::regrole AND (inherit_option OR set_option);") == '0'
    assert sql("SELECT has_schema_privilege('dobby_health_writer','auth','USAGE');") == 'f'
    write(1, 300, 'parent-a', 'profile', {'allergies': 'SECRET A'})
    write(2, 301, 'parent-b', 'profile', {'treatments': 'SECRET B'})
    for user, person in [(1,'parent-b'), (2,'parent-a'), (5,'child'), (4,'sibling')]:
        read(user, 'private', person, error='42501')
        write(user, 320, person, 'profile', {}, error='42501')
    print('PASS adult isolation, scoped caregiver grants, canonical identity, raw ACL', flush=True)

    visit = {'title':'SECRET motif', 'date':tomorrow, 'provider':'SECRET doctor',
             'location':'SECRET location', 'note':'SECRET note', 'reference':'SECRET reference',
             'agendaVisible':True, 'childText':'Apporter une gourde', 'childPlace':'Entrée'}
    visit_id = 302
    write(1, visit_id, 'child', 'visit', visit)
    write(1, 303, 'parent-a', 'visit', {'title':'SECRET A only','date':date_today})
    write(2, 304, 'parent-b', 'visit', {'title':'SECRET B only','date':date_today,'agendaVisible':True})
    assert read(1, 'private', 'child') == read(2, 'private', 'child')
    assert read(4, 'agenda') == [] and read(4, 'practical') == [] and read(4, 'reminders') == []
    assert {row['id'] for row in read(5,'agenda')} == {uid(visit_id),uid(304)}
    assert read(5,'reminders') == []
    assert {row['id'] for row in read(1,'reminders')} == {uid(visit_id),uid(303)}
    assert {row['id'] for row in read(2,'reminders')} == {uid(visit_id),uid(304)}
    assert 'SECRET' not in json.dumps(read(2,'agenda') + read(2,'reminders'))
    write(1, visit_id, 'child', 'visit', {**visit, 'childVisible':True}, revision=1)
    # The linking fixture uses the real resolver and retains the existing member ID.
    sql(f"INSERT INTO dobby_v7_private.account_links VALUES ('{uid(3)}','{uid(101)}','child');")
    published_fields(read(3,'practical'), 'id kind date time place text')
    published_fields(read(3,'agenda'), 'id date time')
    published_fields(read(3,'reminders'), 'id date time offset')
    assert read(3,'reminders')[0]['offset'] == 1
    assert read(3,'practical')[0]['text'] == 'Apporter une gourde'
    read(3,'private','child',error='42501')
    read(3,'practical','sibling',error='22023')
    write(3, visit_id, 'child', 'visit', visit, revision=2, error='42501')
    write(2, 305, 'child', 'instruction', {'childVisible':True, 'childText':'Préparer son sac'})
    assert {row['id'] for row in read(3,'practical')} == {uid(visit_id),uid(305)}
    print('PASS explicit child publication; sibling, agenda and reminder projections', flush=True)

    write(2, visit_id, 'child', 'visit', {**visit, 'date':date_today, 'childVisible':True,
          'remindDayBefore':False}, revision=2)
    assert [row['offset'] for row in read(3,'reminders')] == [0]
    write(2, visit_id, 'child', 'visit', {**visit, 'date':date_today, 'childVisible':True,
          'remindSameDay':False}, revision=3)
    assert read(3,'reminders') == []
    write(2, visit_id, 'child', 'visit', {**visit, 'childVisible':True, 'remindSameDay':False}, revision=4)
    assert [row['offset'] for row in read(3,'reminders')] == [1]
    write(2, visit_id, 'child', 'visit', {**visit, 'childVisible':True, 'cancelled':True}, revision=5)
    assert read(3,'reminders') == [] and read(3,'agenda') == []
    write(2, visit_id, 'child', 'visit', {**visit, 'childVisible':False, 'agendaVisible':False}, revision=6)
    assert read(3,'reminders') == [] and read(3,'agenda') == []
    assert [row['id'] for row in read(3,'practical')] == [uid(305)]
    op = uuid4()
    removed = write(1, visit_id, 'child', 'visit', action='remove', revision=7, op=op)
    assert write(1, visit_id, 'child', 'visit', action='remove', revision=7, op=op) == removed
    write(1, visit_id, 'child', 'visit', visit, revision=8, error='PT409')
    write(1, 305, 'child', 'instruction', action='remove', revision=1)
    assert read(3,'practical') == []
    print('PASS J-1/J0 defaults and preferences, reschedule, cancel, revoke, remove, replay', flush=True)

    write(1, 306, 'child', 'visit', visit)
    def edit(actor):
        return write(actor, 306, 'child', 'visit', {**visit,'title':f'TEST parent {actor}'}, revision=1)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(edit, actor) for actor in (1,2)]
        outcomes = []
        for edited in futures:
            try:
                outcomes.append(edited.result()['revision'])
            except AssertionError as err:
                assert 'PT409' in str(err), str(err)
                outcomes.append('conflict')
    assert set(outcomes) == {2,'conflict'}
    write(1, 307, 'child', 'visit', {**visit,'date':'2026-02-30'}, error='22023')
    write(1, 307, 'child', 'visit', {**visit,'provider':'A','attachment':'SECRET'}, error='22023')
    write(2, 307, 'parent-b', 'visit', {**visit,'childVisible':True}, error='22023')
    assert sql("SELECT md5(jsonb_agg(to_jsonb(m) ORDER BY household_id,module)::text) FROM public.dobby_v2_modules m;") == before
    print('PASS concurrent CAS and validation; native shared records preserved', flush=True)

    for n, person, mime, reader in [(310,'parent-a','application/pdf',None), (311,'child','image/png',2)]:
        result = write(1, n, person, 'document', {'title':'SECRET filename','mime':mime})
        path = result['path']
        assert 'SECRET' not in path
        metadata = quote({'mimetype':mime, 'size':16, 'cacheControl':'private, no-store'})
        upload = f"INSERT INTO storage.objects VALUES('dobby-health-files',{quote(path)},{metadata});"
        count = f"SELECT count(*) FROM storage.objects WHERE name={quote(path)};"
        good_read = 'storage.object.get_authenticated'
        write(1, n, person, 'document', action='finalize', revision=1, error='22023')
        sql(upload, 2, 'storage.object.upload', error='42501')
        sql(upload, 1, 'storage.object.sign_upload_url', error='42501')
        sql(upload, 1, 'storage.object.upload')
        assert sql(count, 1, good_read) == '0'
        write(1, n, person, 'document', action='finalize', revision=1)
        assert sql(count, 1, good_read) == '1'
        assert sql(count, 2, good_read) == ('1' if reader else '0')
        for actor in (3,4,5,7):
            assert sql(count, actor, good_read) == '0'
        assert sql(count, operation=good_read, role='anon') == '0'
        for operation in ('storage.object.sign','storage.object.sign_many','storage.object.list','storage.object.get_signed'):
            assert sql(count, 1, operation) == '0'
        if person == 'child':
            sql(f"DELETE FROM dobby_health_private.caregivers WHERE caregiver_user_id='{uid(2)}';")
            assert sql(count, 2, good_read) == '0'
            read(2,'private','child',error='42501')
        write(1, n, person, 'document', action='remove', revision=2)
        assert sql(count, 1, good_read) == '0'
        assert sql(count) == '1'
    sql("INSERT INTO storage.objects VALUES('other','fixture.pdf',NULL);", 1, 'storage.object.upload')
    assert sql("SELECT count(*) FROM storage.objects WHERE bucket_id='other';", 2) == '1'
    # Hold an uncommitted administrative revocation while A attempts to publish.
    operator = subprocess.Popen(['docker','exec','-i',CONTAINER,'psql','-U','postgres','-d',DB,'-XqAt',
                                 '-v','ON_ERROR_STOP=1'], text=True, stdin=subprocess.PIPE,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        operator.stdin.write(f"BEGIN; DELETE FROM dobby_health_private.caregivers "
                             f"WHERE caregiver_user_id='{uid(1)}'; SELECT 'ready';\n")
        operator.stdin.flush()
        assert operator.stdout.readline().strip() == 'ready'
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            queued = pool.submit(write,1,396,'child','visit',{**visit,'childVisible':True},error='42501')
            time.sleep(.2)
            waiting = not queued.done()
            operator.stdin.write('COMMIT;\n')
            operator.stdin.flush()
            queued.result(timeout=8)
            assert waiting and read(3,'practical') == []
    finally:
        operator.stdin.close()
        assert operator.wait(timeout=8) == 0, operator.stderr.read()
    print('PASS child publication cannot overtake an uncommitted caregiver revocation', flush=True)
    print('PASS Storage operation policies, two MIME types, known path and immediate revocation; unrelated bucket preserved', flush=True)


def http_request(method, endpoint, user=None, body=None, content_type='application/json', *, host='127.0.0.1:5000'):
    def encoded(value):
        return base64.urlsafe_b64encode(value).rstrip(b'=')

    token = b'.'.join([
        encoded(b'{"alg":"HS256","typ":"JWT"}'),
        encoded(json.dumps({
            'sub': uid(user) if user else None, 'role': 'authenticated' if user else 'anon',
            'exp': int(time.time()) + 600
        }).encode()),
    ])
    token = b'.'.join([token, encoded(hmac.digest(JWT_KEY, token, hashlib.sha256))])
    packet = {
        'method': method, 'url': 'http://' + host + endpoint, 'token': token.decode(), 'type': content_type,
        'body': base64.b64encode(body).decode() if body is not None else None
    }
    script = """
      const fs = require('node:fs');
      const options = JSON.parse(fs.readFileSync(0, 'utf8'));
      (async () => {
        const result = await fetch(options.url, {
          method: options.method,
          headers: {Authorization:'Bearer '+options.token, 'Content-Type':options.type,
                    'Cache-Control':'private, no-store','x-upsert':'false'},
          body: options.body === null ? undefined : Buffer.from(options.body,'base64')
        });
        console.log(JSON.stringify({
          status:result.status, cache:result.headers.get('cache-control'),
          body:Buffer.from(await result.arrayBuffer()).toString('base64')
        }));
      })().catch(error => { console.error(error); process.exitCode = 1; });
    """
    return json.loads(run('docker','exec','-i',STORAGE,'node','-e',script,input=json.dumps(packet)))


def check_storage_http():
    for actor in (1, 2):
        sql(f"""INSERT INTO dobby_health_private.caregivers VALUES
          ('{uid(101)}','child','{uid(actor)}','parent-{'a' if actor == 1 else 'b'}');""")
    documents = [
        (431, 'parent-a', 'application/pdf', b'%PDF-1.4\nTEST disposable document'),
        (432, 'child', 'image/png', base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6S0AAAAASUVORK5CYII='))
    ]
    for number, person, mime, data in documents:
        path = write(1, number, person, 'document', {'title':'TEST no filename in path','mime':mime})['path']
        upload_endpoint = '/object/dobby-health-files/' + path
        read_endpoint = '/object/authenticated/dobby-health-files/' + path
        sign_endpoint = '/object/sign/dobby-health-files/' + path
        write(1, number, person, 'document', action='finalize', revision=1, error='22023')
        assert http_request('POST',upload_endpoint,2,data,mime)['status'] >= 400
        assert http_request('POST',upload_endpoint,3,data,mime)['status'] >= 400
        stored = http_request('POST',upload_endpoint,1,data,mime)
        assert stored['status'] < 300, (stored, base64.b64decode(stored['body']))
        assert http_request('POST',upload_endpoint,1,data + b'different test bytes',mime)['status'] >= 400
        assert http_request('GET',read_endpoint,1)['status'] >= 400
        write(1, number, person, 'document', action='finalize', revision=1)
        fetched = http_request('GET',read_endpoint,1)
        assert fetched['status'] == 200 and base64.b64decode(fetched['body']) == data, fetched
        assert 'no-store' in fetched['cache'], fetched
        if person == 'parent-a':
            sql('UPDATE dobby_health_private.install_state SET enabled=false WHERE singleton;')
            assert http_request('GET',read_endpoint,1)['status'] >= 400
            sql('UPDATE dobby_health_private.install_state SET enabled=true WHERE singleton;')
        for actor in (None,3,4,5,7):
            assert http_request('GET',read_endpoint,actor)['status'] >= 400
        assert http_request('GET','/object/public/dobby-health-files/'+path,1)['status'] >= 400
        assert http_request('POST',sign_endpoint,1,b'{"expiresIn":1800}')['status'] >= 400
        caregiver_response = http_request('GET',read_endpoint,2)
        if person == 'child':
            assert caregiver_response['status'] == 200
        else:
            assert caregiver_response['status'] >= 400
        if person == 'child':
            sql(f"DELETE FROM dobby_health_private.caregivers WHERE caregiver_user_id='{uid(2)}';")
            assert http_request('GET',read_endpoint,2)['status'] >= 400
        write(1, number, person, 'document', action='remove', revision=2)
        assert http_request('GET',read_endpoint,1)['status'] >= 400
    print('PASS Storage HTTP v1.89.12: PDF and PNG bytes, private no-store, anonymous/public/signing denied, revocation', flush=True)


def check_rest_http():
    sql(f"""INSERT INTO dobby_v7_private.account_links VALUES ('{uid(3)}','{uid(101)}','child');
         INSERT INTO dobby_health_private.caregivers VALUES ('{uid(101)}','child','{uid(1)}','parent-a');""")
    date_today = sql("SELECT (now() AT TIME ZONE 'Europe/Brussels')::date;")

    def rest(method, endpoint, user, body=None):
        response = http_request(method, endpoint, user, json.dumps(body).encode() if body else None,
                                host=REST + ':3000')
        return response['status'], response['cache'], json.loads(base64.b64decode(response['body']))

    request = {
        'p_household_id':uid(101), 'p_id':uid(422), 'p_member_id':'child', 'p_kind':'visit',
        'p_action':'save', 'p_revision':0, 'p_operation_id':str(uuid4()),
        'p_values':{'title':'SECRET motif','note':'SECRET note','date':date_today,'childVisible':True,
                    'agendaVisible':True,'childText':'Par la porte principale'}
    }
    write_target = '/rpc/dobby_health_write'
    capability_target = '/rpc/dobby_health_capabilities?' + urlencode({'p_household_id': uid(101)})
    assert rest('GET', capability_target, 1) == (200, 'private, no-store', {'enabled': True, 'legacyClosed': True})
    assert rest('GET', capability_target, 7) == (200, 'private, no-store', {'enabled': False})
    assert rest('GET', capability_target, None)[0] in (401,403)
    assert rest('POST',write_target,1,request)[0] == 200
    assert rest('POST',write_target,3,{**request,'p_revision':1})[0] == 403
    assert rest('POST',write_target,2,{**request,'p_revision':1})[0] == 403

    def api_read(user, view, member_id=None):
        params = {'p_view':view, 'p_household_id':uid(101)}
        if member_id:
            params['p_member_id'] = member_id
        return rest('GET','/rpc/dobby_health_read?' + urlencode(params),user)

    status, header, data = api_read(3,'practical')
    assert status == 200 and header == 'private, no-store'
    published_fields(data, 'id kind date time place text')
    assert data[0]['text'] == 'Par la porte principale'
    published_fields(api_read(3,'agenda')[2], 'id date time')
    published_fields(api_read(3,'reminders')[2], 'id date time offset')
    assert api_read(3,'private','child')[0] == 403
    assert api_read(7,'agenda')[0] == 403
    assert api_read(None,'agenda')[0] in (401,403)
    assert rest('GET','/entries',1)[0] == 404
    assert rest('POST',write_target,1,{**request,'p_revision':1,'p_operation_id':str(uuid4()),
        'p_values':{**request['p_values'],'childVisible':False,'agendaVisible':False}})[0] == 200
    assert api_read(3,'practical')[2] == api_read(3,'agenda')[2] == api_read(3,'reminders')[2] == []
    sql('UPDATE dobby_health_private.install_state SET enabled=false WHERE singleton;', effective='postgres')
    for actor in (1, 3):
        assert rest('GET', capability_target, actor) == (200, 'private, no-store', {'enabled': False, 'legacyClosed': True})
    assert rest('GET', capability_target, 7) == (200, 'private, no-store', {'enabled': False})
    assert api_read(1, 'people')[0] == rest('POST', write_target, 1, request)[0] == 403
    sql('UPDATE dobby_health_private.install_state SET enabled=true WHERE singleton;', effective='postgres')
    sql(f"DELETE FROM dobby_health_private.caregivers WHERE caregiver_user_id='{uid(1)}';")
    print('PASS PostgREST HTTP v14.8: private no-store, direct account/API refusals, revocation and durable closure on suspension', flush=True)


def wait_ready(*command):
    for _ in range(75):
        try:
            run(*command)
            return
        except subprocess.CalledProcessError:
            time.sleep(.2)
    raise RuntimeError(f'Local service did not start: {command}')


def install_for_fixtures():
    def phase(name, *, effective=None, error=None):
        return sql((HERE / name).read_text(), effective=effective, error=error)

    preflight = phase('00-preflight.sql', effective='postgres')
    assert 'dobby_socle_writer|f|f' in preflight, preflight
    assert 'supabase_storage_admin|t||f' in preflight, preflight
    phase('00-role.sql', effective='postgres')
    phase('01-delegation-socle.sql', effective='postgres', error='exige le propriétaire effectif')
    phase('01-proposition.sql', effective='postgres', error='exige la délégation effective')
    assert sql("SELECT to_regnamespace('dobby_health_private') IS NULL;") == 't'
    phase('01-delegation-socle.sql', effective='dobby_socle_writer')
    phase('01-proposition.sql', effective='postgres')
    phase('01-legacy-guard.sql', effective='postgres')
    assert rpc('capabilities', [uid(101)], user=1) == {'enabled': False}
    read(1, 'people', error='42501')
    assert sql("SELECT pg_has_role('postgres','dobby_health_writer','SET'), pg_has_role('postgres','dobby_health_writer','USAGE');") == 'f|f'
    phase('02-fermer-role.sql', effective='postgres', error='exige le rôle de plateforme')
    phase('03-storage.sql', effective='postgres', error='exige le propriétaire effectif')
    phase('03-storage.sql', effective='supabase_storage_admin', error='writer fermé')
    assert sql("SELECT count(*) FROM storage.buckets WHERE id='dobby-health-files';") == '0'
    phase('02-fermer-role.sql')
    assert sql("SELECT count(*) FROM pg_auth_members WHERE roleid='dobby_health_writer'::regrole OR member='dobby_health_writer'::regrole;") == '0'
    sql('SET ROLE dobby_health_writer;', effective='postgres', error='42501')
    sql('GRANT dobby_health_writer TO postgres WITH SET TRUE;', effective='postgres', error='42501')
    phase('03-storage.sql', effective='supabase_storage_admin')
    phase('00-preflight.sql', effective='postgres')
    phase('00-preflight.sql', effective='supabase_storage_admin')
    assert rpc('capabilities', [uid(101)], user=1) == {'enabled': False}
    assert sql('SELECT enabled, legacy_closed FROM dobby_health_private.install_state;', effective='postgres') == 'f|f'
    read(1, 'people', error='42501')
    write(1, 400, 'parent-a', 'profile', {}, error='42501')
    assert sql("SELECT has_column_privilege('dobby_health_writer', 'storage.objects', 'metadata', 'SELECT'), "
               "has_table_privilege('dobby_health_writer', 'storage.objects', 'SELECT'), "
               "has_table_privilege('dobby_health_writer', 'storage.objects', 'INSERT');") == 't|f|f'
    sql('UPDATE dobby_health_private.install_state SET legacy_closed=true WHERE singleton;',
        effective='postgres', error='La première activation valide')
    sql('UPDATE dobby_health_private.install_state SET enabled=true WHERE singleton;',
        effective='postgres', error='données Santé historiques')
    assert sql('SELECT enabled, legacy_closed FROM dobby_health_private.install_state;', effective='postgres') == 'f|f'
    sql(f"UPDATE public.dobby_v2_modules SET payload = payload - 'sharedHealthVisits' "
        f"WHERE module='family' AND household_id='{uid(101)}';", user=1)
    sql('UPDATE dobby_health_private.install_state SET enabled=true WHERE singleton;', effective='postgres')
    assert rpc('capabilities', [uid(101)], user=1) == {'enabled': True, 'legacyClosed': True}
    assert rpc('capabilities', [uid(101)], user=7) == {'enabled': False}
    sql('UPDATE dobby_health_private.install_state SET enabled=false WHERE singleton;', effective='postgres')
    assert rpc('capabilities', [uid(101)], user=1) == {'enabled': False, 'legacyClosed': True}
    assert rpc('capabilities', [uid(101)], user=7) == {'enabled': False}
    read(1, 'people', error='42501')
    write(1, 400, 'parent-a', 'profile', {}, error='42501')
    sql('UPDATE dobby_health_private.install_state SET legacy_closed=false WHERE singleton;',
        effective='postgres', error='reste acquise')
    legacy_snapshot = quote({'sharedHealthVisits': [{'id': 'archived-fixture'}]})
    sql(f"UPDATE public.dobby_v2_modules SET payload = payload || {legacy_snapshot} "
        f"WHERE module='family' AND household_id='{uid(101)}';",
        user=1, error='Données Santé historiques refusées')
    sql('UPDATE dobby_health_private.install_state SET enabled=true WHERE singleton;', effective='postgres')
    sql('ALTER TABLE public.dobby_v2_modules DISABLE TRIGGER dobby_family_identity_lifecycle;', effective='postgres')
    assert rpc('capabilities', [uid(101)], user=1) == {'enabled': False, 'legacyClosed': True}
    read(1, 'people', error='42501')
    sql('ALTER TABLE public.dobby_v2_modules ENABLE ALWAYS TRIGGER dobby_family_identity_lifecycle;', effective='postgres')
    print('PASS read-only preflight, separated owners, scoped grants, closed release and durable legacy write ban', flush=True)


def main(with_storage):
    network = CONTAINER if with_storage else 'none'
    if with_storage:
        run('docker','network','create','--internal',network)
    try:
        run('docker','run','--pull=never','--detach','--network',network,'--name',CONTAINER,'--rm',
            '-e',f'POSTGRES_USER={BOOTSTRAP}','-e','POSTGRES_PASSWORD=fixture-only','-e',f'POSTGRES_DB={DB}','postgres:17.11')
        try:
            wait_ready('docker','exec',CONTAINER,'pg_isready','-U',BOOTSTRAP,'-d',DB,'-h','127.0.0.1')
            assert run('docker','inspect','-f','{{.HostConfig.NetworkMode}}',CONTAINER) == network
            sql((HERE / 'fixture.sql').read_text())
            runpy.run_path(str(HERE / 'fixture-identites-famille.py'))['install_family_fixture'](sql)
            sql('GRANT EXECUTE ON FUNCTION dobby_socle_private.actor_context(uuid,boolean) TO postgres;',
                effective='dobby_socle_writer')
            identity_sql = (HERE / '00-identites-famille.sql').read_text()
            sql(identity_sql, effective='postgres', error='Le rôle de plateforme est requis')
            sql(identity_sql)
            print('PostgreSQL', sql('SHOW server_version;'), '· native canonical resolver + synthetic Family catalog', flush=True)
            if with_storage:
                assert run('docker','network','inspect','-f','{{.Internal}}',network) == 'true'
                run('docker','run','--pull=never','--detach','--network',network,'--name',STORAGE,
                    '-e',f'DATABASE_URL=postgres://{BOOTSTRAP}:fixture-only@{CONTAINER}:5432/{DB}',
                    '-e',f'AUTH_JWT_SECRET={JWT_KEY.decode()}','-e','DB_INSTALL_ROLES=true',
                    '-e','STORAGE_BACKEND=file','-e','FILE_STORAGE_BACKEND_PATH=/tmp/dobby-health-files',
                    '-e','GLOBAL_S3_BUCKET=fixture','-e','FILE_SIZE_LIMIT=10485760','-e','NODE_ENV=test',
                    '-e','TENANT_ID=fixture','-e','REGION=local','-e','S3_PROTOCOL_ENABLED=false',
                    STORAGE_IMAGE)
                try:
                    wait_ready('docker','exec',STORAGE,'node','-e',
                               "fetch('http://127.0.0.1:5000/status').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))")
                    # Align standalone Storage's migration owners with hosted DOBBY.
                    sql("DO $$ BEGIN IF to_regrole('supabase_storage_admin') IS NULL THEN "
                        'CREATE ROLE supabase_storage_admin NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$;'
                        'ALTER SCHEMA storage OWNER TO supabase_storage_admin;'
                        'ALTER TABLE storage.objects OWNER TO supabase_storage_admin;'
                        'ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;')
                    install_for_fixtures()
                    run('docker','run','--pull=never','--detach','--network',network,'--name',REST,'--rm',
                        '-e',f'PGRST_DB_URI=postgres://fixture_authenticator:fixture-only@{CONTAINER}:5432/{DB}',
                        '-e','PGRST_DB_SCHEMAS=public','-e','PGRST_DB_ANON_ROLE=anon',
                        '-e',f'PGRST_JWT_SECRET={JWT_KEY.decode()}',REST_IMAGE)
                    try:
                        wait_ready('docker','exec',STORAGE,'node','-e',
                                   f"fetch('http://{REST}:3000/').then(r=>{{if(!r.ok)process.exit(1)}}).catch(()=>process.exit(1))")
                        check_rest_http()
                    finally:
                        run('docker','stop',REST)
                    check_storage_http()
                except Exception:
                    logs = subprocess.run(['docker','logs','--tail','12',STORAGE], text=True, capture_output=True)
                    print(logs.stdout + logs.stderr)
                    raise
                finally:
                    run('docker','rm','--force',STORAGE)
            else:
                sql((HERE / 'fixture-storage.sql').read_text())
                install_for_fixtures()
                check()
        finally:
            run('docker','stop',CONTAINER)
    finally:
        if with_storage:
            run('docker','network','rm',network)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--storage', action='store_true', help='Run real local Storage and PostgREST services on an internal network')
    main(parser.parse_args().storage)

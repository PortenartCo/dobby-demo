#!/usr/bin/env python3
"""Verify child access using disposable PostgreSQL and PostgREST fixtures."""
from pathlib import Path
from runpy import run_path
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4
import argparse
import base64
import hashlib
import hmac
import json
import subprocess
import time

HERE = Path(__file__).resolve().parent
DOC = HERE.parents[1]
MIGRATION = HERE.parent / '01-restrict-child-access.sql'
lot1 = run_path(str(DOC / 'runes-lot1/test-postgres.py'))
docker, sql, rpc, op, uid, quote, encode = (lot1[k] for k in ('docker','sql','rpc','op','uid','quote','encode'))
container, image = lot1['CONTAINER'], lot1['IMAGE']
rest = container + '-rest'
JWT_KEY = uuid4().hex + uuid4().hex
REST_IMAGE = 'postgrest/postgrest:v14.8@sha256:4173b72e0be29cf15349dc827798c3e464c5f2cc7f9c1697022f9cd1874b4c36'


def setup_storage():
    sql("""
        CREATE SCHEMA storage AUTHORIZATION postgres;
        CREATE TABLE storage.buckets(id text PRIMARY KEY,public boolean NOT NULL);
        ALTER TABLE storage.buckets OWNER TO postgres;
        INSERT INTO storage.buckets VALUES('dobby-family-files',false);
        CREATE TABLE storage.objects(bucket_id text NOT NULL,name text NOT NULL,PRIMARY KEY(bucket_id,name));
        ALTER TABLE storage.objects OWNER TO postgres;
        CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE
          AS $$ SELECT (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
        GRANT USAGE ON SCHEMA storage TO authenticated;
        GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
        CREATE POLICY fixture_read ON storage.objects FOR SELECT TO authenticated USING(true);
        CREATE POLICY fixture_write ON storage.objects FOR INSERT TO authenticated WITH CHECK(true);
    """)
    install = DOC / 'finalisation-socle/supabase/family/03-install-storage-policies.sql'
    sql(install.read_text(), installer=True)


def jwt(actor):
    def b64(value):
        return base64.urlsafe_b64encode(value).decode().rstrip('=')
    body = b64(b'{"alg":"HS256","typ":"JWT"}') + '.' + b64(json.dumps({'sub':actor,'role':'authenticated','exp':int(time.time())+300}).encode())
    return body + '.' + b64(hmac.digest(JWT_KEY.encode(),body.encode(),'sha256'))


def http(origin, path, actor=None, body=None, status=200, token=None):
    headers = {'Accept-Profile':'storage'} if path.startswith('/objects') else {}
    if actor or token:
        headers['Authorization'] = 'Bearer ' + (token or jwt(actor))
    if body is not None:
        headers['Content-Type'] = 'application/json'
    request = Request(origin+path, data=json.dumps(body).encode() if body is not None else None, headers=headers)
    try:
        response = urlopen(request, timeout=4)
    except HTTPError as caught:
        response = caught
    with response:
        result = json.loads(response.read())
        assert response.code == status, (path, response.code, result)
        return result


def run(a,b,child,outsider,hh,read,write,snapshot,mission):
    sql((DOC/'runes-lot2/02-participations-recompenses.sql').read_text(), installer=True)
    setup_storage()
    raw = lambda who: sql(f"SELECT module FROM public.dobby_v2_modules WHERE household_id={quote(hh)} ORDER BY module;",who).splitlines()
    if args.red:
        assert raw(child) == [], 'The child directly reads the raw Famille and Missions payloads'
        return
    sql(MIGRATION.read_text(), installer=True)
    caps = rpc('dobby_v7_family_capabilities',a)
    assert caps['childAccessProtocol']==1 and caps['childAccountLinkVerified'] is False and caps['missionsV3Verified'] is False
    rpc('dobby_v7_child_module',child,hh,'family',error='42501')
    rpc('dobby_v7_create_child_invitation',a,'sibling',24,op(),error='42501')
    rpc('dobby_missions_v3_write',child,hh,read()['revision'],op(),{'kind':'project'},error='42501')
    assert raw(child)==[]
    print('PASS installation attestée et portes enfant fermées dans le socle fictif')

    sql("""
      BEGIN; SET LOCAL search_path='';
      UPDATE dobby_socle_private.install_state SET family_client_verified=true,storage_client_verified=true,
        child_link_client_verified=true,missions_client_verified=true WHERE singleton;
      COMMIT;
      INSERT INTO auth.users(id) VALUES ('00000000-0000-4000-8000-000000000006'),('00000000-0000-4000-8000-000000000007');
    """)
    sibling = uid(6)
    family = lambda: json.loads(sql(f"SELECT payload FROM public.dobby_v2_modules WHERE household_id={quote(hh)} AND module='family';",a))
    payload = family()
    payload['familyMembers'].extend([
      {'id':'second-child','name':'TEST Deux','memberCategory':'child','notes':'TEST_SECRET'},
      {'id':'pending-child','name':'TEST Attente','memberCategory':'child'},
    ])
    payload['familyMembers'][0]['magicProfile'] = {'version':1,'houseId':'gryffindor','avatarId':'portrait-2','secret':'TEST_SECRET'}
    payload['familyEvents'] = [
      {'id':'outing','title':'TEST sortie','date':'2026-11-20','category':'Famille','note':'TEST_SECRET','description':'TEST_SECRET'},
      {'id':'private','title':'TEST_SECRET','date':'2026-11-20','category':'Famille','visibility':'private'},
      {'id':'appointment','title':'TEST_SECRET','date':'2026-11-20','category':'Santé'},
      {'id':'only-sibling','title':'TEST autorisé','date':'2026-11-20','category':'Famille','visibleToMemberIds':['second-child']},
    ]
    payload['famContacts'] = [{'id':'x','name':'TEST_SECRET'}]
    payload['sharedHealthVisits'] = [{'id':'x','title':'TEST_SECRET'}]
    payload['sharedFamilyNotes'] = [{'id':'x','body':'TEST_SECRET'}]
    sql(f"UPDATE public.dobby_v2_modules SET payload={encode(payload)} WHERE household_id={quote(hh)} AND module='family';",a)
    for module in ('recipes','menus','house','contracts'):
        sql(f"INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES({quote(hh)},{quote(module)},'{{}}');",a)
    sql(f"INSERT INTO storage.objects VALUES('dobby-family-files',{quote(hh+'/private.pdf')}),('dobby-recipe-images',{quote(hh+'/recipe.jpg')}),('dobby-health-files',{quote(hh+'/health.pdf')});")
    assert raw(child)==['menus','recipes'] and set(raw(a))=={'contracts','family','house','menus','missions','recipes'}
    assert sql("SELECT string_agg(bucket_id,',' ORDER BY bucket_id) FROM storage.objects;",child)=='dobby-health-files,dobby-recipe-images'
    assert sql("SELECT count(*) FROM storage.objects WHERE bucket_id='dobby-family-files';",a)=='1'
    rpc('dobby_v7_child_module',child,hh,'house',error='42501')
    rpc('dobby_v7_child_module',a,hh,'family',error='42501')
    foreign = rpc('dobby_v7_context',outsider)['householdId']
    rpc('dobby_v7_child_module',child,foreign,'family',error='42501')
    assert rpc('dobby_v7_child_access_status',a,'second-child')=={'linked':False,'active':False}
    invitation = rpc('dobby_v7_create_child_invitation',a,'second-child',24,op())
    acceptance = op()
    accepted = rpc('dobby_v7_accept_child_invitation',sibling,invitation['token'],acceptance)
    assert accepted['memberId']=='second-child' and accepted['householdId']==hh
    assert 'TEST_SECRET' not in json.dumps(accepted)
    assert rpc('dobby_v7_context',sibling)['memberId']=='second-child'
    assert len(family()['familyMembers'])==len(payload['familyMembers'])
    assert rpc('dobby_v7_accept_child_invitation',sibling,invitation['token'],acceptance)['replayed']
    rpc('dobby_v7_accept_child_invitation',uid(7),invitation['token'],op(),error='22023')
    assert rpc('dobby_v7_child_access_status',b,'second-child')=={'linked':True,'active':True}
    rpc('dobby_v7_child_access_status',child,'second-child',error='42501')
    rpc('dobby_v7_child_access_status',outsider,'second-child',error='42501')
    assert set(rpc('dobby_v7_child_module',sibling,hh,'family')['payload'])=={'familyMembers','familyEvents'}
    one = rpc('dobby_v7_child_module',child,hh,'family')
    two = rpc('dobby_v7_child_module',sibling,hh,'family')
    assert [x['id'] for x in one['payload']['familyEvents']]==['outing']
    assert [x['id'] for x in two['payload']['familyEvents']]==['outing','only-sibling']
    assert 'TEST_SECRET' not in json.dumps([one,two,rpc('dobby_v7_context',sibling)])
    assert rpc('dobby_v7_child_module',child,hh,'family')['revision'] == one['revision']
    rpc('dobby_v7_update_magic',child,'second-child',{'magicHouseId':'hufflepuff'},one['revision'],op(),error='42501')
    rpc('dobby_v7_update_magic',child,'child',{'magicCeremony':'deferred'},one['revision'],op(),error='42501')
    magic_values={'magicHouseId':'hufflepuff','magicPatronusId':'otter'}
    magic_op=op()
    magic=rpc('dobby_v7_update_magic',child,'child',magic_values,one['revision'],magic_op)
    assert magic['context']['profile']['magicProfile']['houseId']=='hufflepuff'
    assert set(magic['module']['payload'])=={'familyMembers','familyEvents'} and 'TEST_SECRET' not in json.dumps(magic)
    assert rpc('dobby_v7_update_magic',child,'child',magic_values,one['revision'],magic_op)['replayed']
    print('PASS deux enfants canoniques, invitation native, RLS et Storage familial, projection Famille et magie propre')

    run_missions(a,b,child,sibling,hh,read,write,snapshot,mission)
    run_http(a,b,child,sibling,outsider,hh,invite=invitation['token'],acceptance=acceptance)


def run_missions(a,b,child,sibling,hh,read,write,snapshot,mission):
    current=read()
    today=sql("SELECT (clock_timestamp() AT TIME ZONE 'Europe/Brussels')::date;")
    rows=current['payload']['manualMissions']+[
        mission('solo-private',note='TEST_SECRET'),
        mission('sibling-private',assigneeId='second-child',title='TEST_SECRET'),
        mission('shared-award',assigneeId='',assigneeIds=['child','second-child']),
        mission('cycled-award',assigneeId='',assigneeIds=['child','second-child']),
        mission('validated',assigneeId='',assigneeIds=['child','second-child'],participantVersion=1,
                individualRunes=True,approvalRequired=True,due=today,note='TEST_SECRET'),
    ]
    for key,member in [('series-a','child'),('series-b','second-child')]:
        template={'title':'TEST ' + key,'effort':'regular','rewardVersion':1,'assigneeId':'','assigneeIds':[member],
                  'participantVersion':1,'deadlineOffsetDays':None,'individualRunes':True}
        rows.append(mission(key,**template,due='2026-01-01',recurrence={'version':1,'seriesId':key,'rules':[
            {'from':'2026-01-01','start':'2026-01-01','frequency':'daily','state':'active','shortMonth':'last-day',
             'weekdays':[],'monthDay':1,'template':template}
        ]}))
    snapshot(rows,current['revision'])

    def send(intent,who=a,**settings):
        return write(intent,settings.pop('rev',read()['revision']),actor=who,**settings)

    def complete(key,actor,ids,**settings):
        return send({'kind':'complete','missionId':key,'participantIds':ids},actor,**settings)

    def child_read(who=child):
        return rpc('dobby_v7_child_module',who,hh,'missions')

    sql(f"UPDATE public.dobby_v2_memberships SET role='owner' WHERE household_id={quote(hh)} AND user_id={quote(child)};")
    before=read()
    for intent in ({'kind':'snapshot','payload':{'manualMissions':[]}},
                   {'kind':'submit','memberId':'second-child','missionId':'validated'},
                   {'kind':'approve','memberId':'child','missionId':'validated'},
                   {'kind':'reward-confirm','memberId':'child','goalId':op()}):
        send(intent,child,error='42501')
    complete('sibling-private',child,['child'],error='42501')
    complete('no-such-mission',child,['child'],error='42501')
    complete('shared-award',child,['child'],error='42501')
    rpc('dobby_missions_v2_write',child,hh,before['revision'],op(),before['payload'],error='42501')
    sql(f"SELECT dobby_socle_private.child_missions_write_native({quote(hh)},{before['revision']},{quote(op())},'{{}}');",
        child,error='42501')
    assert read()==before
    assert sql("WITH changed AS(UPDATE public.dobby_v2_modules SET payload='{}' WHERE module='recipes' RETURNING 1) SELECT count(*) FROM changed;",child)=='0'
    sql(f"INSERT INTO storage.objects VALUES('dobby-family-files',{quote(hh+'/nope')});",child,error='42501')
    print('PASS refus des écritures brutes, du writer V2, des appels privés et des intentions concernant autrui, même membership owner')

    first_revision = read()['revision']
    operation = op()
    first = complete('solo-private',child,['child'],rev=first_revision,operation=operation)
    again = complete('solo-private',child,['child'],rev=first_revision,operation=operation)
    assert first['replayed'] is False and again['replayed'] is True
    assert first['module']==again['module']==child_read()
    assert set(first)=={'protocol','replayed','operation','module'} and set(first['module'])=={'module','payload','revision','updated_at'}
    assert 'TEST_SECRET' not in json.dumps(first)
    assert 'TEST_SECRET' in json.dumps(read())
    send({'kind':'submit','memberId':'child','missionId':'validated'},child)
    send({'kind':'submit','memberId':'second-child','missionId':'validated'},sibling)
    send({'kind':'approve','memberId':'child','missionId':'validated'},b)
    assert {x['status'] for x in child_read()['payload']['missionParticipation']}=={'pending','credited'}
    assert [x['status'] for x in child_read(sibling)['payload']['missionParticipation']]==['pending']

    complete('shared-award',a,['child','second-child'])
    send({'kind':'reopen','missionId':'shared-award'})
    complete('cycled-award',a,['second-child'])
    send({'kind':'reopen','missionId':'cycled-award'})
    complete('cycled-award',a,['child'])
    own_cycle = [x for x in child_read()['payload']['runeCredits'] if x.get('missionId')=='cycled-award']
    assert len(own_cycle)==1 and own_cycle[0]['eventId']=='cycled-award~0~grant'
    send({'kind':'correction','memberId':'child','targetEventId':'cycled-award~1~grant',
          'expectedAmount':25,'amount':29,'reason':'TEST_SECRET'})
    shares = [x for x in child_read()['payload']['runeCredits'] if x.get('missionId')=='shared-award']
    assert len(shares)==2 and shares[0]['amount']==13 and shares[1]['reverses']==shares[0]['eventId']
    assert all(x['allocations']==[{'memberId':'child','amount':13}] for x in shares)
    send({'kind':'reward-set','memberId':'second-child','mode':'announced','threshold':1_000_000,'title':'TEST SECRET SIBLING'})
    goal_id=op()
    send({'kind':'reward-set','memberId':'child','mode':'surprise','threshold':1_000_000,'title':'TEST_SECRET'},operation=goal_id)
    goal=child_read()['payload']['runeGoals']
    assert set(goal)=={'child'} and 'title' not in goal['child']
    send({'kind':'bonus','memberId':'child','amount':1_000_000,'reason':'TEST_SECRET'})
    send({'kind':'reward-confirm','memberId':'child','goalId':goal_id})
    assert child_read()['payload']['runeRewards'][0]['title']=='Récompense mystère'
    result=send({'kind':'project'},child)
    assert any(m['id'].startswith('series-a-r') for m in read()['payload']['manualMissions'])
    assert not any(m['id'].startswith('series-b-r') for m in read()['payload']['manualMissions'])
    assert 'TEST_SECRET' not in json.dumps(result) and 'second-child' not in json.dumps(result)
    assert result['module']==child_read()

    js = """
      import {readFileSync} from 'node:fs';
      import {validateMissionV3Module,missionV3Summary} from './essai-stitch-v5-famille/family-mission-intents.mjs';
      import {normalizeMission} from './essai-stitch-v5-famille/family-missions-core.mjs';
      import assert from 'node:assert/strict';
      for(const [member,mod] of JSON.parse(readFileSync(0,'utf8'))) {
        validateMissionV3Module(mod);
        for(const row of mod.payload.manualMissions)normalizeMission(row);
        assert.ok(missionV3Summary(member,mod.payload.runeCredits).total>=0);
      }
    """
    subprocess.run(['node','--input-type=module','-e',js],input=json.dumps([
      ['child',child_read()],['second-child',child_read(sibling)]
    ]),text=True,check=True,cwd=DOC.parents[1])
    print('PASS réponse et rejeu V3 filtrés, participations propres, cycles/récompenses et validateur JS natif')


def run_http(a,b,child,sibling,outsider,hh,invite,acceptance):
    # The Lot 1 fixture emulates the earlier single-claim request setting.
    # PostgREST sends the current Supabase-style JSON claims setting.
    sql('''
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$
       SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
         nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
      $$;
      CREATE OR REPLACE FUNCTION dobby_v7_private.actor() RETURNS uuid
      LANGUAGE plpgsql STABLE SET search_path='' AS $$
      DECLARE u uuid:=coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
        nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid;
      BEGIN
        IF u IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Connexion requise'; END IF;
        RETURN u;
      END $$;
    ''',installer=True)
    sql("CREATE ROLE fixture_rest LOGIN NOINHERIT; GRANT anon,authenticated TO fixture_rest;")
    docker('run','--rm','--detach','--name',rest,'--network',container,'--publish','127.0.0.1::3000',
           '-e',f'PGRST_DB_URI=postgres://fixture_rest@{container}:5432/dobby_lot1',
           '-e','PGRST_DB_ANON_ROLE=anon','-e','PGRST_DB_SCHEMAS=public,storage',
           '-e',f'PGRST_JWT_SECRET={JWT_KEY}',REST_IMAGE)
    origin = 'http://' + docker('port',rest,'3000/tcp')
    for _ in range(60):
        try:
            with urlopen(origin+'/rpc/dobby_v7_family_capabilities',timeout=3) as response:
                if response.status == 200:
                    break
        except OSError:
            time.sleep(.2)
    else:
        raise AssertionError('PostgREST local non prêt')
    assert http(origin,'/rpc/dobby_v7_family_capabilities')['childAccessProtocol']==1
    family=f'/rpc/dobby_v7_child_module?p_household_id={hh}&p_module=family'
    raw=f'/dobby_v2_modules?select=module&household_id=eq.{hh}'
    assert http(origin,family,child)['payload']['familyMembers']
    assert http(origin,family,status=401)['code']=='42501'
    assert http(origin,family,outsider,status=403)['code']=='42501'
    assert {x['module'] for x in http(origin,raw,child)}=={'menus','recipes'}
    objects='/objects?select=name&bucket_id=eq.dobby-family-files'
    assert http(origin,objects,child)==[] and len(http(origin,objects,a))==1
    status='/rpc/dobby_v7_child_access_status?p_member_id=second-child'
    suspend='/rpc/dobby_v7_suspend_child_access'
    assert http(origin,status,b)=={'linked':True,'active':True}
    sibling_token=jwt(sibling)
    assert http(origin,family,token=sibling_token)['payload']['familyMembers']
    assert http(origin,status,status=403,token=sibling_token)['code']=='42501'
    assert http(origin,suspend,outsider,{'p_member_id':'second-child'},403)['code']=='42501'
    missions=f'/rpc/dobby_v7_child_module?p_household_id={hh}&p_module=missions'
    writer='/rpc/dobby_missions_v3_write'
    sibling_snapshot=http(origin,missions,token=sibling_token)
    rpc_body={'p_household_id':hh,'p_expected_revision':sibling_snapshot['revision'],
              'p_operation_id':op(),'p_intent':{'kind':'project'}}
    own_write=http(origin,writer,body=rpc_body,token=sibling_token)
    assert own_write['module']==http(origin,missions,token=sibling_token)
    assert not any(m['id'].startswith('series-a') for m in own_write['module']['payload']['manualMissions'])

    pending=rpc('dobby_v7_create_child_invitation',a,'pending-child',24,op())
    assert http(origin,suspend,b,{'p_member_id':'pending-child'})=={'linked':False,'active':False}
    rpc('dobby_v7_accept_child_invitation',uid(7),pending['token'],op(),error='22023')

    state=lambda: sql(f"SELECT md5(string_agg(payload::text,'|' ORDER BY module)) FROM public.dobby_v2_modules WHERE household_id={quote(hh)};")
    before=state()
    # Hold the real child's membership and household locks until commit, then
    # check the parent does not suspend midway through the mutation.
    with subprocess.Popen(['docker','exec','-i',container,'psql','-XqAt','-v','ON_ERROR_STOP=1',
                           '-U','dobby_lot1_admin','-d','dobby_lot1'],stdin=subprocess.PIPE,
                          stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True) as pending:
        pending.stdin.write(f"""SET ROLE authenticated; SET request.jwt.claim.sub={quote(sibling)};
          BEGIN;
          SELECT public.dobby_missions_v3_write({quote(hh)},{own_write['module']['revision']},
            {quote(op())},'{{"kind":"project"}}')->'operation'->>'changed';
          SELECT 'child-lock-acquired'; SELECT pg_sleep(1); COMMIT;""")
        pending.stdin.close()
        assert pending.stdout.readline().strip()=='false'
        assert pending.stdout.readline().strip()=='child-lock-acquired'
        started=time.monotonic()
        assert http(origin,suspend,b,{'p_member_id':'second-child'})=={'linked':True,'active':False}
        assert time.monotonic()-started>.5 and pending.wait(timeout=5)==0, pending.stderr.read()
    assert http(origin,suspend,a,{'p_member_id':'second-child'})=={'linked':True,'active':False}
    assert http(origin,status,b)=={'linked':True,'active':False}
    context=http(origin,'/rpc/dobby_v7_context',token=sibling_token)
    assert context['phase']=='rejected' and context['reason']=='child_access_suspended'
    assert http(origin,family,status=403,token=sibling_token)['code']=='42501' and http(origin,raw,token=sibling_token)==[]
    assert http(origin,'/rpc/dobby_missions_v3_write',sibling,{'p_household_id':hh,
      'p_expected_revision':1,'p_operation_id':op(),'p_intent':{'kind':'project'}},403)['code']=='42501'
    rpc('dobby_v7_accept_child_invitation',sibling,invite,acceptance,error='42501')
    rpc('dobby_v7_create_child_invitation',a,'second-child',24,op(),error='23505')
    assert http(origin,family,child)['payload']['familyEvents'] and state()==before
    print('PASS PostgREST avec deux JWT enfant distincts et deux parents, Storage familial, suspension idempotente et historique identique')
    print('PASS suspension sérialisée avec une écriture enfant en cours et ancien JWT refusé après commit')
    print('PostgreSQL '+sql('SHOW server_version;')+' · PostgREST 14.8 · migration SHA256 '+hashlib.sha256(MIGRATION.read_bytes()).hexdigest())


def main():
    docker('network','create',container)
    try:
        docker('run','--rm','--detach','--name',container,'--network',container,
               '--tmpfs','/var/lib/postgresql/data:rw,size=256m','-e','POSTGRES_HOST_AUTH_METHOD=trust',
               '-e','POSTGRES_DB=dobby_lot1','-e','POSTGRES_USER=dobby_lot1_admin',image)
        docker('exec',container,'bash','-c',
               'for i in {1..60}; do pg_isready -h 127.0.0.1 -U postgres -d dobby_lot1 >/dev/null && exit 0; sleep 1; done; exit 1')
        lot1['main'](run)
    finally:
        subprocess.run(['docker','rm','-f',rest,container],capture_output=True)
        subprocess.run(['docker','network','rm',container],capture_output=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--red',action='store_true')
    args = parser.parse_args()
    main()

#!/usr/bin/env python3
"""Real PostgreSQL writer/RLS tests on an offline, disposable fictional fixture."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import re
import subprocess
import uuid

ROOT = Path(__file__).resolve().parents[3]
DOC = ROOT / 'docs/dobby-v7'
V2 = '04c58d9ebaf84374820a5e6a727c45dfa4ee3527'
IMAGE = 'postgres@sha256:ff87138949ad9a46f32ff23bd6852b52ce024a13dffe9b4087be98292cdd3b4f'
CONTAINER = 'dobby-runes-lot1-' + uuid.uuid4().hex[:12]
DOCKER = ['docker', '--host=unix:///var/run/docker.sock']


def docker(*args, **kwargs):
    return subprocess.run([*DOCKER, *args], check=True, capture_output=True, text=True, **kwargs).stdout.strip()


def sql(query, actor=None, role='authenticated', error=None, installer=False):
    if actor is not None:
        query = f"SET ROLE {role}; SET request.jwt.claim.sub={quote(actor)};\n" + query
    command = [*DOCKER, 'exec', '-i', CONTAINER, 'psql', '-XqAt', '-U', 'postgres' if installer else 'dobby_lot1_admin', '-d', 'dobby_lot1',
               '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose']
    result = subprocess.run(command, input=query, capture_output=True, text=True)
    if error:
        assert result.returncode and f'ERROR:  {error}:' in result.stderr, (error, result.stderr)
        return
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


def quote(value):
    return "'" + value.replace("'", "''") + "'"


def encode(value):
    if isinstance(value, (dict, list)):
        return quote(json.dumps(value, ensure_ascii=False)) + '::jsonb'
    return str(value) if isinstance(value, int) else quote(value)


def rpc(name, actor, *args, error=None, role='authenticated'):
    result = sql('SELECT public.' + name + '(' + ','.join(map(encode, args)) + ');', actor, role, error)
    return json.loads(result) if result else None


def uid(n):
    return f'00000000-0000-4000-8000-{n:012}'


def op():
    return str(uuid.uuid4())


def old_file(path):
    return subprocess.check_output(['git', 'show', f'{V2}:{path}'], cwd=ROOT, text=True)


def without_catalog_preflight(path):
    # The hosted catalog fingerprints need a separately supplied private
    # baseline. The fixture uses public V2 source and the exact function bodies
    # from main. Only the two *prior* installers' catalog preflights are skipped.
    result, count = re.subn(r'DO \$preflight\$.*?END \$preflight\$;', '', path.read_text(), count=1, flags=re.S)
    assert count == 1
    return result


def main():
    sql(old_file('tests/shared-runes-v2/bootstrap.sql'))
    sql("""
      CREATE ROLE service_role NOLOGIN;
      CREATE ROLE postgres LOGIN CREATEROLE;
      ALTER DATABASE dobby_lot1 OWNER TO postgres;
      ALTER SCHEMA public OWNER TO postgres;
      ALTER SCHEMA auth OWNER TO postgres;
      ALTER TABLE auth.users OWNER TO postgres;
      ALTER FUNCTION auth.uid() OWNER TO postgres;
      ALTER TABLE public.dobby_v2_households OWNER TO postgres;
      ALTER TABLE public.dobby_v2_memberships OWNER TO postgres;
      ALTER TABLE public.dobby_v2_households ADD COLUMN name text NOT NULL DEFAULT 'Fixture';
      ALTER TABLE public.dobby_v2_households ALTER COLUMN id SET DEFAULT gen_random_uuid();
      ALTER TABLE public.dobby_v2_memberships ADD CONSTRAINT dobby_v2_memberships_role_check
        CHECK(role IN ('owner','member'));
      CREATE TABLE public.dobby_v2_grocery(household_id uuid NOT NULL);
      ALTER TABLE public.dobby_v2_grocery OWNER TO postgres;
      ALTER TABLE public.dobby_v2_grocery ENABLE ROW LEVEL SECURITY;
    """)
    sql((ROOT/'sql-proposals/dobby-v2-modules.sql').read_text(), installer=True)
    sql(old_file('sql-proposals/dobby-shared-runes-v2.sql'), installer=True)
    sql((DOC/'stitch19-20/supabase/01-apply.sql').read_text(), installer=True)
    # Fixture equivalents of the already-installed Auth repair. Preserve the
    # source member lookup and actual RLS rather than mocking actor_context.
    sql("""
      GRANT dobby_v7_writer TO postgres WITH ADMIN TRUE,INHERIT TRUE,SET TRUE;
      CREATE OR REPLACE FUNCTION dobby_v7_private.actor() RETURNS uuid
        LANGUAGE plpgsql STABLE SET search_path='' AS $$
      BEGIN
        RETURN nullif(pg_catalog.current_setting('request.jwt.claim.sub',true),'')::uuid;
      END $$;
      GRANT USAGE ON SCHEMA dobby_v7_private TO dobby_missions_v2_writer;
      DO $$ DECLARE body text:=pg_get_functiondef('public.dobby_v2_modules_stamp()'::regprocedure);
      BEGIN
        EXECUTE replace(body, '    NEW.updated_by := auth.uid();',
          '    NEW.updated_by := nullif(pg_catalog.current_setting(''request.jwt.claim.sub'',true),'''')::uuid;');
        body:=pg_get_functiondef('public.dobby_v2_modules_stamp()'::regprocedure);
        EXECUTE replace(body, '  ELSE', '  ELSIF current_user=''dobby_v7_writer'' THEN
          NEW.updated_by := dobby_v7_private.actor();
        ELSE');
      END $$;
    """)
    sql(without_catalog_preflight(DOC/'finalisation-socle/supabase/family/01-install-family.sql'), installer=True)
    sql(without_catalog_preflight(DOC/'finalisation-socle/supabase/missions/01-apply.sql'), installer=True)

    a, b, child, outsider, inactive = map(uid, range(1, 6))
    sql("INSERT INTO auth.users(id) SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid FROM generate_series(1,5)n;")
    for who in (a,b,outsider):
        rpc('dobby_v7_update_profile',who,{'firstName':'TEST Parent','avatarId':'portrait-1'})
    first = rpc('dobby_v7_create_household',a,'Foyer fictif A',op())
    hh = first['householdId']
    inv = rpc('dobby_v7_create_invitation',a,24,op())
    second = rpc('dobby_v7_accept_invitation',b,inv['token'],op())
    assert second['householdId'] == hh and second['memberId'] != first['memberId']
    foreign = rpc('dobby_v7_create_household',outsider,'Foyer fictif B',op())['householdId']
    people = [{'id':'child','name':'TEST Enfant','memberCategory':'child'},
              {'id':'sibling','name':'TEST Fratrie','memberCategory':'child'},
              {'id':'pet','name':'TEST Animal','memberCategory':'pet'}]
    sql(f"""UPDATE public.dobby_v2_modules
      SET payload=jsonb_set(payload,'{{familyMembers}}',payload->'familyMembers'||{encode(people)})
      WHERE household_id={quote(hh)} AND module='family';""",a)
    sql(f"""INSERT INTO public.dobby_v2_memberships(household_id,user_id,role,active) VALUES
          ({quote(hh)},{quote(child)},'member',true),({quote(hh)},{quote(inactive)},'member',false);
          INSERT INTO dobby_v7_private.account_links(user_id,household_id,member_id) VALUES
          ({quote(child)},{quote(hh)},'child'),({quote(inactive)},{quote(hh)},'sibling');""")
    assert rpc('dobby_v7_context',child)['profile']['memberCategory'] == 'child'
    print('PASS onboarding SQL: deux nouveaux profils parents, création, invitation, rattachement')

    def write(intent, rev, actor=a, operation=None, household=hh, error=None, role='authenticated'):
        return rpc('dobby_missions_v3_write',actor,household,rev,operation or op(),intent,error=error,role=role)

    def read(actor=a, household=hh):
        row = sql(f"SELECT jsonb_build_object('payload',payload,'revision',revision) FROM public.dobby_v2_modules WHERE household_id={quote(household)} AND module='missions';", actor)
        return json.loads(row) if row else None

    def mission(id, effort='regular', **fields):
        return {'id':id,'title':'TEST '+id,'assigneeId':'child','status':'open','effort':effort,'rewardVersion':1,**fields}

    def snapshot(missions, rev, **payload):
        return write({'kind':'snapshot','payload':{'autoTasks':[],'manualMissions':missions,**payload}},rev)

    def complete(id, rev, actor=a, participants=None):
        return write({'kind':'complete','missionId':id,'participantIds':participants or ['child']},rev,actor)

    missions = [mission('light','light'),mission('regular'),mission('major','major'),mission('custom','light',customRunes=73),
                mission('foreign-child',assigneeId='sibling'),mission('shared',assigneeIds=['child','sibling'])]
    snapshot(missions,0)
    complete('light',1)
    before = read()
    migration = (DOC/'runes-lot1/01-etendre-registre-v3.sql').read_text()
    sql(migration,installer=True)
    assert read() == before
    caps = rpc('dobby_missions_v3_capabilities',a,hh)
    assert caps['runesLot1'] == 1 and caps['clientVerified'] is False
    print('PASS migration sans mutation ni ouverture des gates client')

    for index, name in enumerate(['regular','major','custom'],2):
        complete(name,index)
    history = read()['payload']['runeCredits']
    assert [e['amount'] for e in history] == [10,25,50,73]
    assert history[0] == before['payload']['runeCredits'][0]
    assert history[-1]['actorMemberId'] == first['memberId']
    edited = read()['payload']['manualMissions']
    edited[3]['customRunes'] = 87
    snapshot(edited,5)
    assert read()['payload']['runeCredits'] == history
    print('PASS quatre montants et crédit historique inchangé après édition')

    grant = {'kind':'bonus','memberId':'child','amount':40,'reason':'Entraide exceptionnelle'}
    operation = op()
    with ThreadPoolExecutor(2) as pool:
        receipts = list(pool.map(lambda _:write(grant,6,b,operation),range(2)))
    assert sorted(r['replayed'] for r in receipts) == [False,True]
    bonus = read()['payload']['runeCredits'][-1]
    assert bonus['eventId'] == 'rune:'+operation and bonus['actorMemberId'] == second['memberId']
    assert len(read()['payload']['runeCredits']) == 5
    write(grant,6,a,operation,error='22023')
    write({**grant,'amount':41},6,b,operation,error='22023')
    print('PASS bonus parental, UUID concurrent unique et contrôle acteur/contenu')

    correction = {'kind':'correction','memberId':'child','targetEventId':bonus['eventId'],
                  'expectedAmount':40,'amount':12,'reason':'Montant saisi par erreur'}
    operations = [op(),op()]
    def attempt(pair):
        who, operation_id = pair
        try:
            return write(correction,7,who,operation_id)
        except AssertionError as exc:
            assert '40001' in str(exc), exc
            return None
    with ThreadPoolExecutor(2) as pool:
        results = list(pool.map(attempt,zip((a,b),operations)))
    assert sum(result is not None for result in results) == 1
    winner = next(i for i,r in enumerate(results) if r)
    confirmed = read()['payload']['runeCredits'][-1]
    assert confirmed['previousAmount']==40 and confirmed['amount']==12 and confirmed['targetEventId']==bonus['eventId']
    assert write(correction,7,(a,b)[winner],operations[winner])['replayed']
    write(correction,8,error='40001')
    write({**correction,'expectedAmount':12},8,error='23514')
    write({**correction,'expectedAmount':12,'memberId':'sibling'},8,error='40001')
    assert read()['payload']['runeCredits'][:-1] == history+[bonus]
    print('PASS correction liée, deux parents concurrents, reprise et conservation du brut')

    for who in (child,outsider,inactive):
        write(grant,8,who,error='42501')
        write(correction,8,who,error='42501')
    write(grant,8,a,household=foreign,error='42501')
    write(grant,8,role='anon',error='42501')
    write({**grant,'memberId':'sibling-absent'},8,error='42501')
    write({**grant,'memberId':'pet'},8,error='42501')
    write({**grant,'amount':0},8,error='23514')
    write({**grant,'amount':-5},8,error='23514')
    write({**grant,'amount':9007199254740991},8,error='23514')
    write({**grant,'reason':'   '},8,error='22023')
    write({**grant,'actorMemberId':'fake'},8,error='22023')
    write({'kind':'complete','missionId':'foreign-child','participantIds':['sibling']},8,child,error='42501')
    write({'kind':'complete','missionId':'shared','participantIds':['child','sibling']},8,child,error='42501')
    write({'kind':'snapshot','payload':{**read()['payload'],'runeCredits':[]}},8,error='23514')
    assert read(outsider) is None and read(inactive) is None
    assert read(b)==read(a)
    sql('SELECT * FROM dobby_socle_private.mission_operations;',child,error='42501')
    sql(f"UPDATE public.dobby_v2_modules SET payload='{{}}' WHERE household_id={quote(hh)} AND module='missions';",a,error='42501')
    assert read()['revision']==8
    print('PASS RLS inter-foyers, enfant, anonyme, inactif, Runes invalides et écritures directes refusés')

    write({'kind':'correction','memberId':'child','targetEventId':history[3]['eventId'],'expectedAmount':73,'amount':5,'reason':'Erreur de montant'},8)
    write({'kind':'reopen','missionId':'custom'},9)
    complete('custom',10)
    final = read()['payload']['runeCredits']
    assert final[3]['amount']==73 and final[-2]['amount']==73 and final[-2]['kind']=='reversal'
    assert final[-1]['amount']==87 and final[-1]['cycle']==1
    print('PASS reprise d’une mission corrigée et réattribution au nouveau cycle')

    old = read()
    sql(migration,error='P0001',installer=True)
    assert read()==old
    print('PASS précontrôle: réexécution refusée sans mutation')


try:
    docker('run','--rm','--detach','--name',CONTAINER,'--network','none',
           '--tmpfs','/var/lib/postgresql/data:rw,size=256m',
           '-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=dobby_lot1',
           '-e','POSTGRES_USER=dobby_lot1_admin',IMAGE)
    info = json.loads(docker('inspect',CONTAINER))[0]
    assert info['HostConfig']['NetworkMode']=='none' and not info['HostConfig']['PortBindings']
    docker('exec',CONTAINER,'bash','-c',
           'for i in {1..60}; do pg_isready -h 127.0.0.1 -U postgres -d dobby_lot1 >/dev/null && exit 0; sleep 1; done; exit 1')
    main()
finally:
    subprocess.run([*DOCKER,'stop',CONTAINER],capture_output=True)

#!/usr/bin/env python3
"""Fictional local PostgreSQL tests only. Never connects to Supabase.

Requires the dedicated no-network Docker container; --reset explicitly rebuilds
only its dobby_stitch1920_test database. The private Missions guard is a labelled
defensive stub because the supplied catalog omitted its source.
"""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess
import uuid

HERE = Path(__file__).resolve().parent
SQL = HERE.parent
parser = argparse.ArgumentParser()
parser.add_argument('--container', default='dobby-stitch1920-pg-20261112')
parser.add_argument('--reset', action='store_true', required=True)
args = parser.parse_args()
assert args.container.startswith('dobby-stitch1920-pg-'), 'Dedicated local container required'
info = json.loads(subprocess.check_output(['docker', 'inspect', args.container], text=True))[0]
assert info['HostConfig']['NetworkMode'] == 'none' and not info['HostConfig']['PortBindings']
DB = 'dobby_stitch1920_test'
BASE = ['docker', 'exec', '-i', args.container, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-U', 'dobby_local_test']
checks = []

def run(sql, actor=None, role=None, error=None, database=DB):
    prefix = ''
    if role:
        assert role in ('authenticated', 'anon', 'dobby_stitch1920_installer')
        prefix += 'SET ROLE ' + role + ';\n'
    if actor:
        prefix += "SET request.jwt.claim.sub='" + str(uuid.UUID(actor)) + "';\n"
    result = subprocess.run(BASE + ['-d', database], input=prefix + sql, text=True, capture_output=True)
    if error:
        assert result.returncode != 0 and error in result.stderr, result.stderr
        return None
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()

def q(value):
    return "'" + str(value).replace("'", "''") + "'"

def jsonq(value):
    return q(json.dumps(value, separators=(',', ':'))) + '::jsonb'

def uid(number):
    return '00000000-0000-4000-8000-' + str(number).zfill(12)

def op():
    return str(uuid.uuid4())

def rpc(name, values=(), actor=1, role='authenticated', error=None):
    encoded = [jsonq(v) if isinstance(v, dict) else 'NULL' if v is None else str(v) if isinstance(v, int) else q(v) for v in values]
    result = run('SELECT public.' + name + '(' + ','.join(encoded) + ');', uid(actor) if actor else None, role, error)
    return json.loads(result) if result is not None else None

def check(name):
    checks.append(name)
    print('PASS ' + name, flush=True)

def profile(actor, name):
    return rpc('dobby_v7_update_profile', [{'firstName': name, 'avatarId': 'portrait-24'}], actor)

def context(actor=1):
    return rpc('dobby_v7_context', actor=actor)

subprocess.run(['docker','exec',args.container,'dropdb','--if-exists','-U','dobby_local_test',DB], check=True, capture_output=True)
run('DROP ROLE IF EXISTS dobby_v7_writer;', database='postgres')
run("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='dobby_stitch1920_installer') THEN CREATE ROLE dobby_stitch1920_installer NOLOGIN NOSUPERUSER CREATEROLE NOCREATEDB NOBYPASSRLS; END IF; END $$;", database='postgres')
subprocess.run(['docker','exec',args.container,'createdb','-U','dobby_local_test','-O','dobby_stitch1920_installer',DB], check=True, capture_output=True)
fixture=(HERE / 'catalog-fixture.sql').read_text()
setup, objects=fixture.split('CREATE SCHEMA auth;',1)
run(setup)
run('CREATE SCHEMA auth;'+objects, role='dobby_stitch1920_installer')
assert run("SELECT rolsuper::text||':'||rolcreaterole::text||':'||rolbypassrls::text FROM pg_roles WHERE rolname=current_user;",role='dobby_stitch1920_installer')=='false:true:false'
baseline = run("SELECT md5(pg_get_functiondef('public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)'::regprocedure))||':'||md5(pg_get_functiondef('public.dobby_v2_modules_stamp()'::regprocedure));")
run((SQL / '01-apply.sql').read_text(), role='dobby_stitch1920_installer')
run((SQL / '02-verify.sql').read_text(), role='dobby_stitch1920_installer')
run('INSERT INTO auth.users(id) SELECT (\'00000000-0000-4000-8000-\'||lpad(i::text,12,\'0\'))::uuid FROM generate_series(1,20) i;')
assert run("SELECT count(*) FROM pg_auth_members WHERE roleid='dobby_v7_writer'::regrole;")=='0'
assert run("SELECT count(*) FROM pg_roles WHERE rolname='dobby_v7_installer_tmp';")=='0'
assert run("SELECT has_schema_privilege('dobby_v7_writer','public','CREATE') OR has_schema_privilege('dobby_v7_writer','dobby_v7_private','CREATE');")=='f'
check('managed NOSUPERUSER CREATEROLE NOBYPASSRLS apply; temporary roles/CREATE closed; read-only verify')

rpc('dobby_v7_context', actor=None, role='anon', error='42501')
rpc('dobby_v7_context', actor=None, error='42501')
for table in ['pending_profiles','account_links','invitations','operations','install_secret']:
    run('SELECT * FROM dobby_v7_private.'+table+';', uid(1), 'authenticated', '42501')
assert context()['phase'] == 'profile'
rpc('dobby_v7_update_profile', [{'firstName':'Bad','role':'owner'}], error='22023')
rpc('dobby_v7_update_profile', [{'firstName':'Bad','birthdate':'2023-02-31'}], error='22023')
rpc('dobby_v7_update_profile', [{'firstName':'Bad','avatarId':'portrait-25'}], error='22023')
assert profile(1,'Alice')['phase'] == 'household'
assert run('SELECT count(*) FROM public.dobby_v2_modules;') == '0'
create_id = op()
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    created = list(pool.map(lambda _: rpc('dobby_v7_create_household',['Foyer fictif A',create_id]), range(2)))
c = context(); household = c['householdId']; own = c['memberId']
assert c['phase']=='active' and all(x['householdId']==household for x in created)
assert sum(x['replayed'] for x in created)==1
assert run('SELECT count(*) FROM public.dobby_v2_households;')=='1'
assert run('SELECT count(*) FROM dobby_v7_private.pending_profiles;')=='0'
rpc('dobby_v7_create_household',['Nom changé',create_id], error='22023')
rpc('dobby_v7_create_household',['Autre foyer',op()], error='42501')
check('pending profile atomically bound; concurrent household creation and replay')

invop=op(); invite=rpc('dobby_v7_create_invitation',[168,invop]); token=invite['token']
assert len(token)==64 and rpc('dobby_v7_create_invitation',[168,invop])['token']==token
rpc('dobby_v7_create_invitation',[1,invop],error='22023')
preview=rpc('dobby_v7_preview_invitation',[token],actor=None,role='anon')
assert preview['status']=='valid' and preview['household']['id']==household and preview['inviter']['name']=='Alice'
assert set(preview)=={'status','household','inviter','expiresAt'}
assert rpc('dobby_v7_preview_invitation',['invalid'],actor=None,role='anon')=={'status':'invalid'}
profile(2,'Bob'); acceptop=op()
accepted=rpc('dobby_v7_accept_invitation',[token,acceptop],actor=2)
assert accepted['phase']=='active' and accepted['householdId']==household and accepted['memberId']!=own
assert accepted['permissions']['canInvite'] is False
rpc('dobby_v7_create_invitation',[168,op()],actor=2,error='42501')
assert rpc('dobby_v7_accept_invitation',[token,acceptop],actor=2)['replayed'] is True
assert rpc('dobby_v7_accept_invitation',[token,op()],actor=2)['replayed'] is True
assert rpc('dobby_v7_preview_invitation',[token],actor=None,role='anon')=={'status':'invalid'}
profile(3,'Claire')
rpc('dobby_v7_accept_invitation',[token,op()],actor=3,error='22023')
assert run('SELECT count(*) FROM dobby_v7_private.account_links;')=='2'
check('opaque invitation, safe anonymous preview, membership role, acceptance replay')

for kind in ['expired','revoked']:
    inv=rpc('dobby_v7_create_invitation',[1,op()])
    if kind=='expired':
        run('UPDATE dobby_v7_private.invitations SET expires_at=clock_timestamp()-interval \'1 second\' WHERE id='+q(inv['invitationId'])+';')
    else:
        rpc('dobby_v7_revoke_invitation',[inv['invitationId']])
    assert rpc('dobby_v7_preview_invitation',[inv['token']],actor=None,role='anon')=={'status':'expired' if kind=='expired' else 'invalid'}
    rpc('dobby_v7_accept_invitation',[inv['token'],op()],actor=3,error='22023')
run('UPDATE dobby_v7_private.invitations SET expires_at=clock_timestamp()-interval \'1 second\',revoked_at=clock_timestamp() WHERE id='+q(invop)+';')
assert rpc('dobby_v7_accept_invitation',[token,acceptop],actor=2)['replayed'] is True
assert run('SELECT count(*) FROM public.dobby_v2_modules;',uid(3),'authenticated')=='0'
run('UPDATE public.dobby_v2_memberships SET role=\'owner\' WHERE user_id='+q(uid(2))+';',uid(2),'authenticated','42501')
run('INSERT INTO dobby_v7_private.account_links(user_id,household_id,member_id) VALUES('+q(uid(3))+','+q(household)+',\'forged\');',uid(3),'authenticated','42501')
run('INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES('+q(household)+',\'recipes\',\'{}\');',uid(3),'authenticated','42501')
check('expired/revoked admission denied, prior success replay harmless, cross-household RLS')

payload=json.loads(run('SELECT payload FROM public.dobby_v2_modules WHERE household_id='+q(household)+" AND module='family';"))
payload['futureTopLevel']={'keep':['opaque',1]}; payload['familyMembers'][0]['futureMember']={'keep':True}
run('UPDATE public.dobby_v2_modules SET payload='+jsonq(payload)+' WHERE household_id='+q(household)+" AND module='family';")
evil=json.loads(json.dumps(payload)); evil['familyMembers'][0]['name']='Stale overwrite'
run('UPDATE public.dobby_v2_modules SET payload='+jsonq(evil)+' WHERE household_id='+q(household)+" AND module='family';",uid(1),'authenticated','42501')
run('UPDATE public.dobby_v2_modules SET payload='+jsonq(evil)+' WHERE household_id='+q(household)+" AND module='family';",uid(2),'authenticated','42501')
run('INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES('+q(household)+",'missions','{}');",uid(1),'authenticated','42501')
c=context(); mid=c['memberId']; rev=c['familyRevision']; magicop=op()
magic=rpc('dobby_v7_update_magic',[mid,{'magicHouseId':'ravenclaw'},rev,magicop])
assert magic['context']['profile']['magicProfile']['houseSelectionSource']=='manual'
assert 'houseAlgorithmVersion' not in magic['context']['profile']['magicProfile']
assert magic['module']['payload']['futureTopLevel']==payload['futureTopLevel']
assert magic['context']['profile']['futureMember']=={'keep':True}
assert rpc('dobby_v7_update_magic',[mid,{'magicHouseId':'ravenclaw'},rev,magicop])['replayed'] is True
rpc('dobby_v7_update_magic',[mid,{'magicHouseId':'slytherin'},rev,magicop],error='22023')
rpc('dobby_v7_update_magic',[mid,{'magicPatronusId':'otter'},rev,op()],error='40001')
c=context(); c=rpc('dobby_v7_update_magic',[mid,{'magicPatronusId':'otter','magicPatronusAlgorithm':'e06-v1'},c['familyRevision'],op()])['context']
assert c['pendingCeremony'] is False and c['profile']['magicProfile']['ceremonyStatus']=='complete'
assert c['profile']['magicProfile']['houseSelectionSource']=='manual' and c['profile']['magicProfile']['patronusSelectionSource']=='calculated'
rpc('dobby_v7_update_magic',[context(2)['memberId'],{'magicHouseId':'gryffindor'},c['familyRevision'],op()],error='42501')
rpc('dobby_v7_update_magic',[mid,{'runeCredits':[]},c['familyRevision'],op()],error='22023')
check('snapshot guard, Missions unchanged, opaque data preservation, magic source/CAS/replay')

c=context(); m=rpc('dobby_v7_update_member',[mid,{'profileFirstName':'Alicia','profileLastName':'Fixture','name':'Alicia Fixture','notes':'native note','magicAvatarId':'portrait-23'},c['familyRevision'],op()])
assert m['context']['profile']['name']=='Alicia Fixture' and m['context']['profile']['notes']=='native note'
assert m['context']['profile']['magicProfile']['houseId']=='ravenclaw'
assert m['context']['profile']['futureMember']=={'keep':True}
c=context()
rpc('dobby_v7_update_member',[mid,{'magicHouseId':'slytherin'},c['familyRevision'],op()],error='22023')
rpc('dobby_v7_update_member',[mid,{'name':'Wrong downgrade'},c['familyRevision'],op()],error='22023')
rpc('dobby_v7_update_member',[mid,{'memberCategory':'child'},c['familyRevision'],op()],error='42501')
rpc('dobby_v7_update_member',[context(2)['memberId'],{'notes':'not your adult'},c['familyRevision'],op()],error='42501')
check('native member writer preserves magic/opaque fields; other adult/category escalation denied')

# Active identity writes require the displayed revision; optional omissions preserve
# the final canonical identity. A stale tab must never overwrite a newer profile.
c=context(); rev=c['familyRevision']
rpc('dobby_v7_update_profile',[{'firstName':'Alicia','lastName':'Doe'},rev])
current=context(); assert current['profile']['name']=='Alicia Doe'
rpc('dobby_v7_update_profile',[{'firstName':'Stale tab'},rev],error='40001')
rpc('dobby_v7_update_profile',[{'firstName':'No revision'}],error='22023')
assert context()['profile']==current['profile']
rpc('dobby_v7_update_profile',[{'firstName':'Jill'},current['familyRevision']])
assert context()['profile']['lastName']=='Doe' and context()['profile']['name']=='Jill Doe'
assert context()['profile']['futureMember']=={'keep':True}
check('bound profile CAS rejects missing/stale revision; omitted surname and opaque data preserved')

# Two different authenticated accounts race on one family CAS revision.
c=context(); c2=context(2); rev=c['familyRevision']
def race_magic(actor):
    member=c['memberId'] if actor==1 else c2['memberId']
    sql='SELECT public.dobby_v7_update_magic('+q(member)+",'{\"magicHouseId\":\"gryffindor\"}',"+str(rev)+','+q(op())+');'
    prefix='SET ROLE authenticated; SET request.jwt.claim.sub='+q(uid(actor))+'; '
    return subprocess.run(BASE+['-d',DB],input=prefix+sql,text=True,capture_output=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    raced=list(pool.map(race_magic,[1,2]))
assert sum(r.returncode==0 for r in raced)==1 and any('40001' in r.stderr for r in raced)
profile(4,'Diane'); inv=rpc('dobby_v7_create_invitation',[168,op()]);
def race_accept(actor):
    sql='SET ROLE authenticated; SET request.jwt.claim.sub='+q(uid(actor))+'; SELECT public.dobby_v7_accept_invitation('+q(inv['token'])+','+q(op())+');'
    return subprocess.run(BASE+['-d',DB],input=sql,text=True,capture_output=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    raced=list(pool.map(race_accept,[3,4]))
assert sum(r.returncode==0 for r in raced)==1 and any('22023' in r.stderr for r in raced)
check('concurrent family CAS and single-use invitation serialize safely')

# A forced failure after the membership INSERT must roll the whole acceptance back.
profile(5,'Erin'); inv=rpc('dobby_v7_create_invitation',[168,op()])
good=json.loads(run('SELECT payload FROM public.dobby_v2_modules WHERE household_id='+q(household)+" AND module='family';"))
bad=json.loads(json.dumps(good)); bad['familyMembers'].append(bad['familyMembers'][0])
run('UPDATE public.dobby_v2_modules SET payload='+jsonq(bad)+' WHERE household_id='+q(household)+" AND module='family';")
rpc('dobby_v7_accept_invitation',[inv['token'],op()],actor=5,error='23514')
assert run('SELECT count(*) FROM public.dobby_v2_memberships WHERE user_id='+q(uid(5))+';')=='0'
assert run('SELECT count(*) FROM dobby_v7_private.pending_profiles WHERE user_id='+q(uid(5))+';')=='1'
assert run('SELECT accepted_by IS NULL FROM dobby_v7_private.invitations WHERE id='+q(inv['invitationId'])+';')=='t'
run('UPDATE public.dobby_v2_modules SET payload='+jsonq(good)+' WHERE household_id='+q(household)+" AND module='family';")
check('failed adoption rolls back membership, profile binding and invitation consumption')

# Existing real-layout members: no matching by name/order; explicit native ID only.
legacy_hh=op(); legacy_id='native-legacy-text-id'
legacy={'familyMembers':[{'id':'native-alternate-parent','name':'Alternate parent','memberCategory':'parent'},{'id':'native-baby','name':'Baby fixture','memberCategory':'baby'},{'id':legacy_id,'name':'Historical same name','memberCategory':'parent','magicProfile':{'version':1,'houseId':'slytherin','patronusId':'fox','ceremonyStatus':'complete'},'opaque':42}]}
run('INSERT INTO public.dobby_v2_households(id,name) VALUES('+q(legacy_hh)+",'Legacy fixture'); INSERT INTO public.dobby_v2_memberships(household_id,user_id,role) VALUES("+q(legacy_hh)+','+q(uid(6))+",'owner'); INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES("+q(legacy_hh)+",'family',"+jsonq(legacy)+');')
assert context(6)['reason']=='existing_member_link_required'
rpc('dobby_v7_update_profile',[{'firstName':'Historical same name'}],actor=6,error='42501')
def bootstrap(user, household, member, error=None):
    script=(SQL/'04-link-existing-owner.sql').read_text().replace('NULL::uuid',q(uid(user))+'::uuid',1).replace('NULL::uuid',q(household)+'::uuid',1).replace('NULL::text',q(member)+'::text',1)
    return run(script,role='dobby_stitch1920_installer',error=error)
bootstrap(6,legacy_hh,legacy_id)
bootstrap(6,legacy_hh,legacy_id)
bootstrap(6,legacy_hh,'native-alternate-parent',error='Une autre liaison existe')
counts=json.loads(run((SQL/'02-verify.sql').read_text(),role='dobby_stitch1920_installer'))['counts']
assert counts['bindings']==int(run('SELECT count(*) FROM dobby_v7_private.account_links;')) and counts['bindings']>0
assert counts['pendingProfiles']==int(run('SELECT count(*) FROM dobby_v7_private.pending_profiles;')) and counts['pendingProfiles']>0
assert counts['invitations']==int(run('SELECT count(*) FROM dobby_v7_private.invitations;')) and counts['invitations']>0
for helper in ['verification_counts()', 'link_existing_owner(uuid,uuid,text)']:
    run('SELECT dobby_v7_private.'+helper.replace('uuid,uuid,text',q(uid(6))+','+q(legacy_hh)+','+q(legacy_id))+';',uid(6),'authenticated','42501')
check('managed installer legacy bootstrap/replay/reassignment refusal; truthful nonzero counts; admin helpers denied clients')
assert context(6)['memberId']==legacy_id and context(6)['pendingCeremony'] is False
assert json.loads(run('SELECT payload FROM public.dobby_v2_modules WHERE household_id='+q(legacy_hh)+" AND module='family';"))==legacy
run('INSERT INTO public.dobby_v2_memberships(household_id,user_id,role) VALUES('+q(legacy_hh)+','+q(uid(7))+",'owner'); UPDATE public.dobby_v2_modules SET payload=jsonb_set(payload,'{familyMembers}',payload->'familyMembers'||'[{\"id\":\"native-child-text-id\",\"name\":\"Child fixture\",\"memberCategory\":\"child\"}]') WHERE household_id="+q(legacy_hh)+" AND module='family';")
rpc('dobby_v7_bind_existing_member',[uid(7),'native-child-text-id',op()],actor=6)
assert context(7)['permissions']['canEdit'] is False and context(7)['permissions']['canMagic'] is True
rpc('dobby_v7_update_profile',[{'firstName':'Forbidden'}],actor=7,error='42501')
child=context(7)
rpc('dobby_v7_update_magic',[child['memberId'],{'magicHouseId':'hufflepuff'},child['familyRevision'],op()],actor=7)
# An owner bound to a child and an unbound owner lack parent-owner authority,
# even through legacy snapshot UPDATE. A verified parent owner remains allowed.
legacy_now=json.loads(run('SELECT payload FROM public.dobby_v2_modules WHERE household_id='+q(legacy_hh)+" AND module='family';"))
changed=json.loads(json.dumps(legacy_now)); next(m for m in changed['familyMembers'] if m['id']=='native-baby')['name']='Allowed baby edit'
write='UPDATE public.dobby_v2_modules SET payload='+jsonq(changed)+' WHERE household_id='+q(legacy_hh)+" AND module='family';"
run(write,uid(7),'authenticated','42501')
run('INSERT INTO public.dobby_v2_memberships(household_id,user_id,role) VALUES('+q(legacy_hh)+','+q(uid(8))+",'owner');")
run(write,uid(8),'authenticated','42501')
run(write,uid(6),'authenticated')
assert run("SELECT payload->'familyMembers'->1->>'name' FROM public.dobby_v2_modules WHERE household_id="+q(legacy_hh)+" AND module='family';")=='Allowed baby edit'
check('legacy IDs preserved; child-owner and unbound-owner snapshot bypass denied; verified parent permitted')

after=run("SELECT md5(pg_get_functiondef('public.dobby_missions_v2_write(uuid,bigint,uuid,jsonb)'::regprocedure))||':'||md5(pg_get_functiondef('public.dobby_v2_modules_stamp()'::regprocedure));")
assert after==baseline
verification=run((SQL/'02-verify.sql').read_text(), role='dobby_stitch1920_installer')
before_rollback=run('SELECT count(*) FROM public.dobby_v2_households; SELECT count(*) FROM dobby_v7_private.account_links;')
run((SQL/'03-rollback.sql').read_text(), role='dobby_stitch1920_installer')
assert run('SELECT count(*) FROM public.dobby_v2_households; SELECT count(*) FROM dobby_v7_private.account_links;')==before_rollback
assert run("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'dobby_v7_%';")=='0'
assert run("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='dobby_v7_private' AND p.proname IN ('assert_snapshot','link_existing_owner','verification_counts');")=='0'
assert run("SELECT count(*) FROM pg_auth_members WHERE roleid='dobby_v7_writer'::regrole;")=='0'
assert run("SELECT has_schema_privilege('authenticated','dobby_v7_private','USAGE');")=='f'
assert run("SELECT count(*) FROM pg_trigger WHERE tgrelid='public.dobby_v2_modules'::regclass AND tgname IN ('dobby_missions_v2_guard','dobby_v2_modules_stamp_trigger');")=='2'
check('verification and rollback preserve households, canonical members, bindings and Missions code')

summary={'checks':len(checks),'passed':checks,'fixtureOnly':True,'remoteSupabaseOperations':0,
         'postgresVersion':run('SHOW server_version;'),'liveCatalogVersion':'17.11',
         'installerRole':'NOSUPERUSER CREATEROLE NOBYPASSRLS database owner',
         'migrationSha256':hashlib.sha256((SQL/'01-apply.sql').read_bytes()).hexdigest(),
         'missionsPrivateSourceAvailable':False,'databaseAfterTest':'V7 rolled back; fixture data preserved'}
Path('/workspace/scratch/stitch19-20-sql-local/test-results.json').write_text(json.dumps(summary,indent=2)+'\n')
Path('/workspace/scratch/stitch19-20-sql-local/verification-tested.json').write_text(verification+'\n')
print(json.dumps({k:summary[k] for k in ['checks','fixtureOnly','postgresVersion','remoteSupabaseOperations']}))

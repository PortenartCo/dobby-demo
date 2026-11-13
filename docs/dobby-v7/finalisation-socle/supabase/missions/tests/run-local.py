#!/usr/bin/env python3
"""Focused V3 tests on the private actual-catalog baseline and fictional data.

No network or Supabase access. The exact family/Missions candidates must already
be installed in a dedicated offline container. This script creates fictional
Auth IDs, households and ledger rows only in the explicitly named test database.
It never runs Stitch 01/04/06/11 or a historical campaign.
"""
import argparse
import concurrent.futures
import hashlib
import json
import subprocess
import uuid
from pathlib import Path

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--container',default='dobby-socle-missions-pg-20261113')
parser.add_argument('--database',default='dobby_socle_missions_test')
parser.add_argument('--evidence',type=Path)
parser.add_argument('--installed-family-sha256',required=True)
parser.add_argument('--installed-missions-sha256',required=True)
args=parser.parse_args()
assert args.container.startswith('dobby-socle-') and args.database.startswith('dobby_socle_')
info=json.loads(subprocess.check_output(['docker','inspect',args.container],text=True))[0]
assert info['HostConfig']['NetworkMode']=='none' and not info['HostConfig']['PortBindings']
base=['docker','exec','-i',args.container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose']
checks=[]
family_sql=Path(__file__).parents[2]/'family/01-install-family.sql'
missions_sql=Path(__file__).parents[1]/'01-apply.sql'
assert hashlib.sha256(family_sql.read_bytes()).hexdigest()==args.installed_family_sha256
assert hashlib.sha256(missions_sql.read_bytes()).hexdigest()==args.installed_missions_sha256
def sql(text,actor=None,role=None,error=None,superuser=False):
    prefix=''
    if actor:prefix+="SET request.jwt.claims='"+json.dumps({'sub':actor},separators=(',',':'))+"';\nSET request.jwt.claim.sub='"+actor+"';\n"
    if role:prefix+='SET ROLE '+role+';\n'
    p=subprocess.run(base+['-U','dobby_local_test' if superuser else 'postgres','-d',args.database],input=prefix+text,text=True,capture_output=True)
    if error:
        assert p.returncode and error in p.stderr,(error,p.stderr)
        return
    assert p.returncode==0,p.stderr
    return p.stdout.strip()
def q(value):return "'"+str(value).replace("'","''")+"'"
def jq(value):return q(json.dumps(value,ensure_ascii=False,separators=(',',':')))+'::jsonb'
def uid(number):return '00000000-0000-4000-8000-'+str(number).zfill(12)
def op():return str(uuid.uuid4())
def rpc(name,values=(),actor=1,error=None):
    encoded=[jq(v) if isinstance(v,(dict,list)) else str(v) if isinstance(v,int) else 'NULL' if v is None else q(v) for v in values]
    result=sql('SELECT public.'+name+'('+','.join(encoded)+');',uid(actor),'authenticated',error)
    return json.loads(result) if result else None
def passed(name):
    checks.append(name);print('PASS '+name,flush=True)
def profile(actor):return rpc('dobby_v7_update_profile',[{'firstName':'TEST-'+str(actor),'avatarId':'portrait-1'}],actor)

assert sql('SELECT current_user||\':\'||session_user||\':\'||rolsuper::text FROM pg_roles WHERE rolname=current_user;')=='postgres:postgres:false'
assert sql("SELECT count(*) FROM auth.users;",superuser=True)=='0','Use a fresh dedicated clone; do not reset data'
sql("INSERT INTO auth.users(id) SELECT ('00000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid FROM generate_series(1,6)n;",superuser=True)
profile(1);a=rpc('dobby_v7_create_household',['TEST-Missions-A',op()]);hh=a['householdId'];a_id=a['memberId']
profile(2);invite=rpc('dobby_v7_create_invitation',[24,op()]);b=rpc('dobby_v7_accept_invitation',[invite['token'],op()],2);b_id=b['memberId']
profile(4);x=rpc('dobby_v7_create_household',['TEST-Missions-X',op()],4);other=x['householdId']
child_id='child-test';pet_id='pet-test';long_id='long-'+('x'*115)
astral_id='\U00010000';bmp_id='\ue000'
members=[{'id':child_id,'name':'TEST-Child','memberCategory':'child','opaque':{'keep':'child'}},
         {'id':pet_id,'name':'TEST-Pet','memberCategory':'pet'},
         {'id':long_id,'name':'TEST-Long','memberCategory':'child'},
         {'id':astral_id,'name':'TEST-Astral','memberCategory':'child'},
         {'id':bmp_id,'name':'TEST-BMP','memberCategory':'child'}]
sql("UPDATE public.dobby_v2_modules SET payload=jsonb_set(payload,'{familyMembers}',payload->'familyMembers'||"+jq(members)+") WHERE household_id="+q(hh)+" AND module='family';",uid(1),'authenticated')
sql('INSERT INTO public.dobby_v2_memberships(household_id,user_id,role) VALUES('+q(hh)+','+q(uid(3))+",'member'); INSERT INTO dobby_v7_private.account_links(user_id,household_id,member_id) VALUES("+q(uid(3))+','+q(hh)+','+q(child_id)+');')
assert rpc('dobby_v7_context',actor=3)['profile']['memberCategory']=='child'
passed('real canonical parent/child links in fictional household; second parent and other household')

legacy={'missionId':'legacy','memberId':a_id,'effort':'regular','amount':25,'date':'2026-01-01T12:00:00.000Z','title':'TEST Legacy','revision':0,'opaqueCredit':{'keep':[1,2]}}
old_mission={'id':'legacy','title':'TEST Legacy','status':'done','effort':'regular','assigneeId':a_id,'completedAt':'2026-01-01T12:00:00.000Z','opaqueMission':{'keep':True}}
legacy_v2={'missionId':'legacy-v2','memberId':b_id,'effort':'regular','amount':35,'customRunes':35,'eventId':'legacy-v2~0~grant','kind':'grant','cycle':0,'date':'2026-01-01T12:00:00+23:59','title':'TEST Legacy V2','revision':1,'opaqueCredit':{'keep':'v2'}}
old_mission_v2={'id':'legacy-v2','title':'TEST Legacy V2','status':'done','effort':'regular','customRunes':35,'rewardVersion':1,'assigneeId':b_id,'completedAt':'2026-01-01T12:00:00+23:59'}
old_credits=[legacy,legacy_v2]
payload={'autoTasks':[],'manualMissions':[old_mission,old_mission_v2],'runeCredits':old_credits,'runeRequests':[],'runeLedgerVersion':2,'opaqueRoot':{'keep':[1,2,3]}}
sql('BEGIN; GRANT dobby_socle_writer TO postgres WITH INHERIT FALSE,SET TRUE; SET LOCAL ROLE dobby_socle_writer; INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES('+q(hh)+",'missions',"+jq(payload)+'); RESET ROLE; GRANT dobby_socle_writer TO postgres WITH INHERIT FALSE,SET FALSE; COMMIT;',uid(1))
def module(household=hh):return json.loads(sql("SELECT jsonb_build_object('revision',revision,'payload',payload) FROM public.dobby_v2_modules WHERE household_id="+q(household)+" AND module='missions';"))
def write(intent,actor=1,revision=None,operation=None,household=hh,error=None):
    if revision is None:revision=module(household)['revision']
    return rpc('dobby_missions_v3_write',[household,revision,operation or op(),intent],actor,error)
def make_mission(name,**fields):
    return {'id':name,'title':'TEST '+name,'status':'open','category':'Famille','due':'','createdAt':'2026-01-01T00:00:00.000Z','completedAt':'','effort':'regular','rewardVersion':1,'assigneeId':'','assigneeIds':[a_id,child_id],'participantVersion':1,'opaqueMission':{'keep':name},**fields}
initial_revision=module()['revision']
adopt=write({'kind':'complete','missionId':'legacy','participantIds':[a_id]})
assert adopt['operation']['changed'] is True and adopt['module']['revision']==initial_revision+1
assert adopt['module']['payload']['runeCredits']==old_credits and adopt['module']['payload']['runeLedgerVersion']==3
passed('first already-completed V2-to-V3 operation upgrades metadata once without granting or rewriting history')
missions=[old_mission,old_mission_v2,make_mission('shared'),make_mission('solo'),make_mission('zero',customRunes=0),make_mission('unassigned',assigneeIds=[]),make_mission('missing',assigneeIds=['removed']),make_mission('other',assigneeIds=[b_id]),make_mission('long',assigneeIds=[long_id]),make_mission('unicode',assigneeIds=[bmp_id,astral_id])]
result=write({'kind':'snapshot','payload':{'manualMissions':missions,'autoTasks':[],'runeCredits':old_credits,'runeRequests':[],'runeLedgerVersion':3}},actor=2)
assert result['module']['payload']['runeLedgerVersion']==3
assert result['module']['payload']['opaqueRoot']==payload['opaqueRoot']
assert result['module']['payload']['runeCredits']==old_credits
assert result['module']['payload']['manualMissions'][0]==old_mission
passed('parent B can manage; V1/V2 events including offset dates and root/mission/credit extensions preserved exactly')

def history():return module()['payload']['runeCredits']
def events(mission):return [e for e in history() if e['missionId']==mission]
before=module()
for actor in [3,4,5]:write({'kind':'snapshot','payload':{'manualMissions':missions}},actor,revision=before['revision'],error='42501')
write({'kind':'complete','missionId':'shared','participantIds':[a_id,child_id],'amount':999},3,error='22023')
write({'kind':'complete','missionId':'unassigned','participantIds':[child_id]},3,error='42501')
write({'kind':'complete','missionId':'other','participantIds':[b_id]},3,error='42501')
for ids in [[child_id,pet_id],[child_id,'unknown'],[child_id,child_id],[]]:
    write({'kind':'complete','missionId':'shared','participantIds':ids},3,error='23514' if len(set(ids))!=len(ids) or not ids else '42501')
assert module()==before
assert sql("WITH changed AS(UPDATE public.dobby_v2_modules SET payload='{}' WHERE household_id="+q(hh)+" AND module='missions' RETURNING 1) SELECT count(*) FROM changed;",uid(3),'authenticated')=='0'
rpc('dobby_missions_v2_write',[hh,before['revision'],op(),{'autoTasks':[],'manualMissions':[],'runeCredits':[],'runeRequests':[],'runeLedgerVersion':2}],3,'42501')
sql('SELECT * FROM dobby_socle_private.mission_operations;',uid(3),'authenticated','42501')
passed('child, foreign household, unlinked actor, pets, removed IDs, direct table, V2 and private-receipt refusals are atomic')

first_op=op();rev=module()['revision'];intent={'kind':'complete','missionId':'shared','participantIds':[child_id,a_id]}
first=write(intent,3,rev,first_op)
grant=events('shared')[0]
expected_ids=sorted([a_id,child_id]);assert grant['amount']==25 and grant['memberId']==expected_ids[0]
assert grant['allocations']==[{'memberId':expected_ids[0],'amount':13},{'memberId':expected_ids[1],'amount':12}]
replay=write(intent,3,rev,first_op);assert replay['replayed'] and len(events('shared'))==1
write(intent,1,rev,first_op,error='22023')
write({**intent,'participantIds':[child_id]},3,rev,first_op,error='22023')
unchanged_rev=module()['revision'];noop=write(intent,3);assert noop['operation']['changed'] is False and module()['revision']==unchanged_rev and len(events('shared'))==1
passed('25→13+12 one atomic credit; exact lost-response replay; UUID actor/content mismatch; repeated completion no extra credit')
write({'kind':'reopen','missionId':'shared'},3,error='42501')
write({'kind':'reopen','missionId':'shared'})
assert len(events('shared'))==2 and events('shared')[1]['allocations']==grant['allocations'] and events('shared')[1]['reverses']==grant['eventId']
write({'kind':'complete','missionId':'shared','participantIds':[child_id]},3)
assert len(events('shared'))==3 and events('shared')[-1]['cycle']==1 and events('shared')[-1]['allocations']==[{'memberId':child_id,'amount':25}]
late=write(intent,3,rev,first_op);assert late['replayed'] and late['module']['revision']==module()['revision'] and late['operation']['revision']<late['module']['revision']
passed('whole-allocation reversal, next cycle, parent-only reopen, old receipt returns current module')
write({'kind':'complete','missionId':'solo','participantIds':[a_id]})
write({'kind':'complete','missionId':'zero','participantIds':[a_id,child_id]},3)
assert events('solo')[0]['allocations']==[{'memberId':a_id,'amount':25}]
assert all(e['amount']==0 for e in events('zero')[0]['allocations'])
write({'kind':'complete','missionId':'missing','participantIds':[a_id]},error='42501')
write({'kind':'complete','missionId':'unassigned','participantIds':[a_id]})
write({'kind':'complete','missionId':'long','participantIds':[long_id]})
write({'kind':'complete','missionId':'unicode','participantIds':[bmp_id,astral_id]})
assert events('long')[0]['memberId']==long_id
assert events('unicode')[0]['allocations']==[{'memberId':astral_id,'amount':13},{'memberId':bmp_id,'amount':12}]
passed('solo, zero, true unassigned parent, no deleted-assignee fallback, canonical 120-char TEXT IDs and JS UTF-16 ordering')

current=module();rows=current['payload']['manualMissions']+[make_mission('race'),make_mission('same-op-race'),make_mission('late-failure'),make_mission('overflow',customRunes=9007199254740991),make_mission('series',due='2020-01-01',recurrence={'version':1,'seriesId':'series','rules':[{'from':'2020-01-01','start':'2020-01-01','frequency':'daily','state':'active','shortMonth':'last-day','weekdays':[],'monthDay':1,'template':{'title':'TEST recurring','effort':'regular','rewardVersion':1,'assigneeId':'','assigneeIds':[a_id,child_id],'participantVersion':1,'deadlineOffsetDays':None}}]})]
rows += [make_mission('series-r20200102',seriesId='series',occurrenceDate='2020-01-02',due='',deadlineOffsetDays=None),make_mission('series-r20200103',seriesId='series',occurrenceDate='2020-01-03',due='',deadlineOffsetDays=None)]
write({'kind':'snapshot','payload':{'manualMissions':rows}})
race_rev=module()['revision'];race_intent={'kind':'complete','missionId':'race','participantIds':[a_id,child_id]}
def concurrent_write(_):
    try:return write(race_intent,revision=race_rev)
    except AssertionError as e:
        assert '40001' in str(e);return 'CAS'
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:race=list(pool.map(concurrent_write,[1,2]))
assert sum(isinstance(r,dict) for r in race)==1 and len(events('race'))==1
for day in ['20200102','20200103']:write({'kind':'complete','missionId':'series-r'+day,'participantIds':[child_id]},3)
assert len(events('series-r20200102'))==len(events('series-r20200103'))==1
passed('competing actual PostgreSQL transactions: one commit and one CAS; one grant per real recurrence occurrence')

same_rev=module()['revision'];same_op=op();same_intent={'kind':'complete','missionId':'same-op-race','participantIds':[a_id,child_id]}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    same=list(pool.map(lambda _:write(same_intent,revision=same_rev,operation=same_op),[1,2]))
assert sum(r['replayed'] for r in same)==1 and len(events('same-op-race'))==1
passed('two actual concurrent identical operations: one effect, one replay, one complete allocation')

before=module();write({'kind':'complete','missionId':'overflow','participantIds':[a_id]},error='23514');assert module()==before
sql("BEGIN; GRANT dobby_socle_writer TO postgres WITH INHERIT FALSE,SET TRUE; GRANT CREATE ON SCHEMA dobby_socle_private TO dobby_socle_writer; SET LOCAL ROLE dobby_socle_writer; CREATE FUNCTION dobby_socle_private.test_fail_receipt() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$BEGIN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='TEST receipt failure'; END$$; CREATE TRIGGER test_fail_receipt BEFORE INSERT ON dobby_socle_private.mission_operations FOR EACH ROW EXECUTE FUNCTION dobby_socle_private.test_fail_receipt(); RESET ROLE; REVOKE CREATE ON SCHEMA dobby_socle_private FROM dobby_socle_writer; GRANT dobby_socle_writer TO postgres WITH INHERIT FALSE,SET FALSE; COMMIT;")
before_count=sql('SELECT count(*) FROM dobby_socle_private.mission_operations;',superuser=True)
write({'kind':'complete','missionId':'late-failure','participantIds':[a_id]},error='23514')
assert module()==before and sql('SELECT count(*) FROM dobby_socle_private.mission_operations;',superuser=True)==before_count
sql("BEGIN; GRANT dobby_socle_writer TO postgres WITH INHERIT FALSE,SET TRUE; SET LOCAL ROLE dobby_socle_writer; DROP TRIGGER test_fail_receipt ON dobby_socle_private.mission_operations; DROP FUNCTION dobby_socle_private.test_fail_receipt(); RESET ROLE; GRANT dobby_socle_writer TO postgres WITH INHERIT FALSE,SET FALSE; COMMIT;")
passed('numeric overflow and receipt failure after module UPDATE roll back module, credits, revision and receipt')

write({'kind':'reopen','missionId':'legacy'})
assert events('legacy')[0]==legacy and events('legacy')[1]['reverses']=='legacy' and 'allocations' not in events('legacy')[1]
write({'kind':'complete','missionId':'legacy','participantIds':[a_id]})
assert len(events('legacy'))==2
write({'kind':'reopen','missionId':'legacy-v2'})
write({'kind':'complete','missionId':'legacy-v2','participantIds':[b_id]})
assert events('legacy-v2')[0]==legacy_v2 and events('legacy-v2')[-1]['cycle']==1 and events('legacy-v2')[-1]['amount']==35
passed('legacy V1/V2 exact compensation and dates preserved; no retroactive eligibility; next V2-to-V3 cycle credits only current amount')

v2_payload={'autoTasks':[],'manualMissions':[],'runeCredits':[],'runeRequests':[],'runeLedgerVersion':2}
write({'kind':'snapshot','payload':{'runeCredits':old_credits}},4,revision=0,household=other,error='23514')
assert sql("SELECT count(*) FROM public.dobby_v2_modules WHERE household_id="+q(other)+" AND module='missions';")=='0'
v2_operation=op();v2_result=rpc('dobby_missions_v2_write',[other,0,v2_operation,v2_payload],4)
assert v2_result['protocol']==2
rpc('dobby_missions_v2_write',[hh,module()['revision'],op(),v2_payload],1,'23514')
passed('existing parent V2 activation remains usable on V2 household; downgrade or fallback from V3 is refused')
write({'kind':'snapshot','payload':{'autoTasks':[],'manualMissions':[]}},4,revision=1,operation=v2_operation,household=other,error='22023')
rpc('dobby_missions_v2_write',[hh,module()['revision'],first_op,v2_payload],1,'22023')
cross_operation=op();cross_revision=module(other)['revision']
def cross_protocol(version):
    try:
        if version==2:return rpc('dobby_missions_v2_write',[other,cross_revision,cross_operation,v2_payload],4)
        return write({'kind':'snapshot','payload':{'autoTasks':[],'manualMissions':[]}},4,revision=cross_revision,operation=cross_operation,household=other)
    except AssertionError as e:
        assert '22023' in str(e);return 'CROSS_PROTOCOL_REJECTED'
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:cross=list(pool.map(cross_protocol,[2,3]))
assert sum(isinstance(r,dict) for r in cross)==1
passed('V2/V3 share one UUID namespace; both reuse directions and concurrent cross-protocol reuse reject a second effect')

before=module();bad=before['payload']['manualMissions'].copy();bad[0]={**bad[0],'opaqueMission':{'lost':True}}
write({'kind':'snapshot','payload':{'runeLedgerVersion':2}},error='23514');assert module()==before
write({'kind':'snapshot','payload':{'manualMissions':bad}},error='23514');assert module()==before
tampered=history().copy();tampered[0]={**tampered[0],'amount':50}
write({'kind':'snapshot','payload':{'runeCredits':tampered}},error='23514');assert module()==before
write({'kind':'snapshot','payload':{'opaqueRoot':{'lost':True}}},error='23514');assert module()==before
assert history()[0]==legacy
passed('historical credit/mission/root tampering refused with no partial module or receipt mutation')

caps=rpc('dobby_missions_v3_capabilities',[hh],3)
assert caps['protocol']==3 and caps['atomicAllocations'] and caps['canonicalAuthorization'] and caps['clientVerified'] is False
rpc('dobby_missions_v3_capabilities',[other],3,'42501')
rpc('dobby_missions_v3_capabilities',[hh],5,'42501')
rpc('dobby_missions_v3_capabilities',[None],1,'42501')
assert sql("SELECT rolcanlogin OR rolsuper OR rolbypassrls OR rolcreaterole FROM pg_roles WHERE rolname='dobby_socle_writer';")=='f'
assert sql("SELECT pg_has_role('postgres','dobby_socle_writer','SET') OR pg_has_role('postgres','dobby_socle_writer','USAGE');")=='f'
assert sql("SELECT has_function_privilege('anon','public.dobby_missions_v3_write(uuid,bigint,uuid,jsonb)','EXECUTE') OR has_function_privilege('authenticated','public.dobby_missions_v2_write_legacy_socle(uuid,bigint,uuid,jsonb)','EXECUTE');")=='f'
passed('capability scoped to canonical household; writer closure; original V2 alias unreachable from clients')

before=module()
sql('UPDATE public.dobby_v2_memberships SET active=false WHERE household_id='+q(hh)+' AND user_id='+q(uid(3))+';')
write({'kind':'complete','missionId':'late-failure','participantIds':[child_id]},3,error='42501')
assert module()==before
sql('UPDATE public.dobby_v2_memberships SET active=true WHERE household_id='+q(hh)+' AND user_id='+q(uid(3))+';')
# Hold a real completed RPC transaction open. Membership deactivation must wait
# until its active row lock is released; no authorization can change mid-write.
held_op=op();held_intent={'kind':'complete','missionId':'late-failure','participantIds':[child_id]};held_revision=module()['revision']
held=subprocess.Popen(base+['-U','postgres','-d',args.database],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
held.stdin.write("SET request.jwt.claims='"+json.dumps({'sub':uid(3)},separators=(',',':'))+"'; SET request.jwt.claim.sub='"+uid(3)+"'; SET ROLE authenticated; BEGIN; SELECT public.dobby_missions_v3_write("+q(hh)+','+str(held_revision)+','+q(held_op)+','+jq(held_intent)+');\n');held.stdin.flush()
held_result=json.loads(held.stdout.readline());assert held_result['protocol']==3
with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
    deactivation=pool.submit(sql,'UPDATE public.dobby_v2_memberships SET active=false WHERE household_id='+q(hh)+' AND user_id='+q(uid(3))+';')
    try:deactivation.result(timeout=.2);raise AssertionError('Membership lock did not protect the authorized transaction')
    except concurrent.futures.TimeoutError:pass
    held.stdin.write('COMMIT;\n');held.stdin.flush();held.stdin.close();held.wait(timeout=5)
    assert held.returncode==0,held.stderr.read()
    deactivation.result(timeout=5)
assert len(events('late-failure'))==1
write({'kind':'complete','missionId':'shared','participantIds':[child_id]},3,error='42501')
sql('UPDATE public.dobby_v2_memberships SET active=true WHERE household_id='+q(hh)+' AND user_id='+q(uid(3))+';')
passed('inactive canonical account refused and real membership deactivation waits for the authorized transaction')

profile(6);future=rpc('dobby_v7_create_household',['TEST-Missions-Future',op()],6)['householdId']
future_payload={'autoTasks':[],'manualMissions':[],'runeCredits':[],'runeLedgerVersion':4,'opaqueRoot':{'keep':'future'}}
sql('BEGIN; GRANT dobby_socle_writer TO postgres WITH INHERIT FALSE,SET TRUE; SET LOCAL ROLE dobby_socle_writer; INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES('+q(future)+",'missions',"+jq(future_payload)+'); RESET ROLE; GRANT dobby_socle_writer TO postgres WITH INHERIT FALSE,SET FALSE; COMMIT;',uid(6))
write({'kind':'snapshot','payload':{'manualMissions':[]}},6,revision=1,household=future,error='23514')
assert module(future)['payload']==future_payload
passed('unknown future ledger protocol is preserved and refused without downgrade or data loss')

verification=json.loads(sql((Path(__file__).parents[1]/'02-verify.sql').read_text()))
assert verification['readOnly'] and verification['requiredPublicFunctionsPresent'] and verification['legacyOriginalBodyPreserved'] and verification['legacyAliasClientAccessClosed']
before=module();before_receipts=sql('SELECT count(*) FROM dobby_socle_private.mission_operations;',superuser=True)
sql((Path(__file__).parents[1]/'03-rollback-conservative.sql').read_text())
assert module()==before and sql('SELECT count(*) FROM dobby_socle_private.mission_operations;',superuser=True)==before_receipts
write({'kind':'complete','missionId':'late-failure','participantIds':[child_id]},error='42501')
assert sql("SELECT pg_has_role('postgres','dobby_socle_writer','SET') OR pg_has_role('postgres','dobby_socle_writer','USAGE');")=='f'
passed('exact read-only verification and conservative rollback preserve all ledgers/receipts and close new RPC access')

report={'scope':'fictional local actual-catalog baseline only','postgres':sql('SHOW server_version;'),'network':'none',
 'realAuthOrSupabaseVerified':False,'checks':checks,'status':'PASS',
 'migrationSha256':args.installed_missions_sha256,'familyMigrationSha256':args.installed_family_sha256,
 'limits':['No live Supabase/Auth/browser adoption proof.','Frontend V3 gates stay closed.','Private actual baseline definitions are outside the public repository.']}
assert hashlib.sha256(family_sql.read_bytes()).hexdigest()==args.installed_family_sha256
assert hashlib.sha256(missions_sql.read_bytes()).hexdigest()==args.installed_missions_sha256
if args.evidence:
    args.evidence.parent.mkdir(parents=True,exist_ok=True);args.evidence.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('MISSIONS_V3_LOCAL_PASS '+str(len(checks))+' grouped cases; no remote access')

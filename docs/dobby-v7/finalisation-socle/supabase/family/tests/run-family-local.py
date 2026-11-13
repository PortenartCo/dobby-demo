#!/usr/bin/env python3
"""Targeted F08/F09 tests, fictional data in a no-network PostgreSQL 17 fixture.

The fixture must reproduce the user-supplied real catalog/function definitions;
those confidential inputs stay outside public Git. This script never downloads,
connects to, resets, or changes a Supabase project. No historical campaign.
"""
import argparse, concurrent.futures, hashlib, json, subprocess, uuid
from pathlib import Path
HERE=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--container',default='dobby-socle-family-pg-20261113')
parser.add_argument('--database',default='dobby_socle_family_validation')
parser.add_argument('--evidence',type=Path)
a=parser.parse_args()
assert a.container.startswith('dobby-socle-family-pg-')
assert a.database=='dobby_socle_family_validation'
info=json.loads(subprocess.check_output(['docker','inspect',a.container],text=True))[0]
assert info['HostConfig']['NetworkMode']=='none' and not info['HostConfig']['PortBindings']
BASE=['docker','exec','-i',a.container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1']
checks=[]
def run(sql,role='postgres',actor=None,error=None,db=None,superuser=False):
 prefix=''
 if actor: prefix+="SET request.jwt.claims='"+json.dumps({'sub':uid(actor),'role':'authenticated'})+"';\n"
 if role!='postgres':prefix+='SET ROLE '+role+';\n'
 p=subprocess.run(BASE+['-U','dobby_local_test' if superuser else 'postgres','-d',db or a.database],input=prefix+sql,text=True,capture_output=True)
 if error:
  assert p.returncode and error in p.stderr,(sql[:100],p.stderr)
  return None
 assert p.returncode==0,p.stderr
 return p.stdout.strip()
def q(v):return "'"+str(v).replace("'","''")+"'"
def uid(n):return '00000000-0000-4000-8000-'+str(n).zfill(12)
def op():return str(uuid.uuid4())
def jsonq(v):return q(json.dumps(v,ensure_ascii=False))+'::jsonb'
def rpc(name,args=(),actor=1,error=None):
 values=[jsonq(v) if isinstance(v,(dict,list)) else 'NULL' if v is None else str(v) if isinstance(v,int) else q(v) for v in args]
 r=run('SELECT public.'+name+'('+','.join(values)+');',role='authenticated',actor=actor,error=error)
 return json.loads(r) if r is not None else None
def check(name):checks.append(name);print('PASS '+name,flush=True)
def rev(actor=1):return rpc('dobby_v7_context',actor=actor)['familyRevision']
def rows():return json.loads(run("SELECT jsonb_object_agg(module,jsonb_build_object('payload',payload,'revision',revision)) FROM public.dobby_v2_modules WHERE household_id='"+uid(101)+"';",superuser=True))
assert run("SELECT session_user||':'||current_user||':'||rolsuper::text||':'||rolbypassrls::text FROM pg_roles WHERE rolname=current_user;",db='postgres')=='postgres:postgres:false:true'
assert run("SELECT count(*) FROM pg_database WHERE datname='"+a.database+"';",db='postgres')=='0','Use a fresh isolated fixture; this test never resets an existing DB'
run('CREATE DATABASE '+a.database+' OWNER postgres TEMPLATE dobby_socle_baseline;',db='postgres')
run((HERE.parent/'01-install-family.sql').read_text())
check('exact apply as direct LOGIN postgres NOSUPERUSER (RESET ROLE cannot elevate)')
assert run("SELECT pg_has_role('postgres','dobby_socle_writer','SET') OR pg_has_role('postgres','dobby_socle_writer','USAGE');")=='f'
assert run("SELECT pg_has_role('postgres','dobby_socle_writer','USAGE WITH ADMIN OPTION');")=='t'
assert run("SELECT count(*) FROM pg_auth_members WHERE roleid='dobby_socle_writer'::regrole AND member<>'postgres'::regrole;")=='0'
assert run("SELECT has_schema_privilege('dobby_socle_writer','public','CREATE') OR has_schema_privilege('dobby_socle_writer','dobby_socle_private','CREATE') OR has_schema_privilege('dobby_socle_writer','auth','USAGE');")=='f'
check('writer runtime closed, ADMIN-only maintenance retained, no auth/schema CREATE workaround')
profiles=[{'id':'parent-a','memberCategory':'parent','name':'TEST Parent A'}, {'id':'parent-b','memberCategory':'parent','name':'TEST Parent B'},
 {'id':'child-same-TEXT','memberCategory':'child','name':'TEST Child','birthdate':'2000-01-01','avatar':'🧙','nickname':'TEST','notes':'TEST retained','opaque':{'history':['TEST']},'magicProfile':{'version':1,'houseId':'ravenclaw','patronusId':'otter','avatarId':'portrait-3','ceremonyStatus':'complete','extension':{'TEST':1}}},
 {'id':'child-other','memberCategory':'child','name':'TEST Other child'}, {'id':'pet','memberCategory':'pet','name':'TEST Pet'}, {'id':'child-race','memberCategory':'child','name':'TEST race'}]
foreign=[{'id':'foreign-parent','memberCategory':'parent','name':'TEST Foreign parent'},{'id':'foreign-child','memberCategory':'child','name':'TEST Foreign child'}]
run("INSERT INTO auth.users(id) SELECT ('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid FROM generate_series(1,20) i;\n"+
 "INSERT INTO public.dobby_v2_households(id,name) VALUES("+q(uid(101))+",'TEST HH A'),("+q(uid(102))+",'TEST HH B');\n"+
 "INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES("+q(uid(101))+",'family',"+jsonq({'familyMembers':profiles,'opaque':{'keep':'TEST'}})+"),("+q(uid(102))+",'family',"+jsonq({'familyMembers':foreign})+");\n"+
 "INSERT INTO public.dobby_v2_memberships(household_id,user_id,role) VALUES "+','.join('('+q(uid(h))+','+q(uid(u))+','+q(role)+')' for h,u,role in [(101,1,'owner'),(101,2,'member'),(101,8,'member'),(102,4,'owner'),(102,5,'member')])+ ';\n'+
 "INSERT INTO dobby_v7_private.account_links(user_id,household_id,member_id) VALUES "+','.join('('+q(uid(u))+','+q(uid(h))+','+q(m)+')' for u,h,m in [(1,101,'parent-a'),(2,101,'parent-b'),(8,101,'child-other'),(4,102,'foreign-parent'),(5,102,'foreign-child')])+ ';',superuser=True)
# The real model accepts an old owner/member membership without inferring its category.
assert rpc('dobby_v7_context',actor=2)['category']=='parent'
assert rpc('dobby_v7_context',actor=8)['category']=='child'
assert rpc('dobby_v7_family_capabilities')['familyRolesVerified'] is False
anon=json.loads(run('SET ROLE anon; SELECT public.dobby_v7_family_capabilities();'))
assert anon['childAccountLinkVerified'] is False and anon['canonicalIdentity'] is False
check('canonical category wins over membership/age; publication flags closed, anonymous preview capability safe')
# The two retained old-writer RPCs must remain functional with the new guard.
active_profile=rpc('dobby_v7_update_profile',[{'firstName':'TEST Parent A','avatarId':'portrait-1'},rev()],actor=1)
assert active_profile['profile']['firstName']=='TEST Parent A'
assert active_profile['profile']['magicProfile']['avatarId']=='portrait-1'
rpc('dobby_v7_update_profile',[{'firstName':'TEST Fresh owner','avatarId':'portrait-2'}],actor=13)
fresh_household=rpc('dobby_v7_create_household',['TEST newly created household',op()],actor=13)
assert fresh_household['phase']=='active' and fresh_household['category']=='parent'
check('retained old-writer active profile/avatar and new-household RPCs pass the new family guard')
# Parent B (member) manages the other parent while retaining opaque profile data.
r=rpc('dobby_v7_update_member',['parent-a',{'nickname':'TEST managed by B'},rev(2),op()],actor=2)
assert r['module']['payload']['familyMembers'][0]['nickname']=='TEST managed by B'
rpc('dobby_v7_update_magic',['pet',{'magicHouseId':'gryffindor'},rev(),op()],error='modifiable')
rpc('dobby_v7_update_member',['pet',{'magicAvatarId':'portrait-4'},rev(),op()],error='animal')
# Above denial uses the existing fixed public error text. No payload changes.
check('non-owner parent manages another parent; animal magic denied by RPC')
# Existing generic sign-up/invitation still creates one adult profile.
assert rpc('dobby_v7_update_profile',[{'firstName':'TEST New Parent','avatarId':'portrait-2'}],actor=12)['phase']=='household'
generic=rpc('dobby_v7_create_invitation',[24,op()],actor=2)
generic_accepted=rpc('dobby_v7_accept_invitation',[generic['token'],op()],actor=12)
assert generic_accepted['category']=='parent' and generic_accepted['phase']=='active'
check('generic new Auth profile and adult invitation retain their native working path')
# Seed actual V1 historical credits through the real V2 writer, not a stub.
historic={'missionId':'historic','memberId':'child-same-TEXT','effort':'regular','amount':25,
 'date':'2026-01-01T00:00:00.000Z','title':'TEST historical','revision':0}
legacy_payload={'manualMissions':[{'id':'historic','title':'TEST historical','status':'done',
 'assigneeId':'child-same-TEXT','effort':'regular'}],'runeCredits':[historic],'runeLedgerVersion':1}
rpc('dobby_missions_v2_write',[uid(101),0,op(),legacy_payload])
# Targeted F08 gives an existing child a fresh Auth account without pending profile.
before=rows(); family_before=before['family']; target_before=next(x for x in family_before['payload']['familyMembers'] if x['id']=='child-same-TEXT')
created=rpc('dobby_v7_create_child_invitation',['child-same-TEXT',24,op()],actor=2)
token=created['token'];assert created['targetMemberId']=='child-same-TEXT'
assert rpc('dobby_v7_preview_child_invitation',[token],actor=6)['status']=='valid'
assert rpc('dobby_v7_preview_invitation',[token],actor=6)['status']=='invalid'
accept_op=op();accepted=rpc('dobby_v7_accept_child_invitation',[token,accept_op],actor=3)
assert accepted['memberId']=='child-same-TEXT' and accepted['profile']==target_before and accepted['category']=='child'
assert rows()==before
assert rows()['missions']['payload']['runeCredits']==[historic]
assert rpc('dobby_v7_accept_child_invitation',[token,accept_op],actor=3)['replayed'] is True
assert rpc('dobby_v7_accept_child_invitation',[token,op()],actor=3)['replayed'] is True
rpc('dobby_v7_accept_child_invitation',[token,op()],actor=6,error='utilisée')
assert run("SELECT count(*) FROM dobby_v7_private.account_links WHERE household_id="+q(uid(101))+" AND member_id='child-same-TEXT';",superuser=True)=='1'
check('targeted accept keeps exact TEXT ID/full profile/magic/unknowns and family revision; exact/new-op replay no duplicate')
# Existing foreign binding cannot migrate through a targeted invitation.
created2=rpc('dobby_v7_create_child_invitation',['child-race',24,op()])
before=rows();rpc('dobby_v7_accept_child_invitation',[created2['token'],op()],actor=4,error='déjà lié');assert rows()==before
rpc('dobby_v7_create_child_invitation',['pet',24,op()],error='enfant')
rpc('dobby_v7_create_child_invitation',['child-same-TEXT',24,op()],error='déjà un compte')
check('foreign household, animal target and already-bound child refused without duplicate/profile mutation')
# Two different accounts race one target; exactly one succeeds.
def accept_race(actor):
 try:return rpc('dobby_v7_accept_child_invitation',[created2['token'],op()],actor=actor)
 except AssertionError as e:
  assert 'utilisée' in str(e) or 'déjà lié' in str(e),str(e)
  return None
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 outcomes=list(pool.map(accept_race,[6,7]))
assert sum(x is not None for x in outcomes)==1
assert run("SELECT count(*) FROM dobby_v7_private.account_links WHERE household_id="+q(uid(101))+" AND member_id='child-race';",superuser=True)=='1'
check('concurrent invitation consumption by two accounts has one effective canonical binding')
# Same actor/op replay conflict is refused; no fabricated profile information.
rpc('dobby_v7_accept_child_invitation',['f'*64,accept_op],actor=3,error='réutilisé')
# Children can only mutate their own magical results, not profile/other data.
prior=rows();childrev=rev(3)
rpc('dobby_v7_update_member',['child-same-TEXT',{'nickname':'FORBIDDEN'},childrev,op()],actor=3,error='refusée')
rpc('dobby_v7_update_profile',[{'firstName':'FORBIDDEN'},childrev],actor=3,error='refusée')
rpc('dobby_v7_update_magic',['parent-a',{'magicHouseId':'gryffindor'},childrev,op()],actor=3,error='modifiable')
rpc('dobby_v7_update_magic',['child-same-TEXT',{'magicAvatarId':'portrait-4'},childrev,op()],actor=3,error='interdit')
rpc('dobby_v7_create_invitation',[24,op()],actor=3,error='Parent')
rpc('dobby_v7_create_child_invitation',['pet',24,op()],actor=3,error='Parent')
assert rows()==prior
magic=rpc('dobby_v7_update_magic',['child-same-TEXT',{'magicHouseId':'gryffindor'},childrev,op()],actor=3)
newprofile=magic['context']['profile'];assert newprofile['magicProfile']['houseId']=='gryffindor'
assert {k:v for k,v in newprofile.items() if k!='magicProfile'}=={k:v for k,v in target_before.items() if k!='magicProfile'}
house_keys={'houseId','houseSelectionSource','houseAlgorithmVersion','ceremonyStatus'}
assert {k:v for k,v in newprofile['magicProfile'].items() if k not in house_keys}=={k:v for k,v in target_before['magicProfile'].items() if k not in house_keys}
assert newprofile['opaque']==target_before['opaque'] and newprofile['memberCategory']=='child'
check('child own House/Patronus RPC only; profile/avatar/others/invites refused; opaque history retained')
# Shared reads remain possible, all direct writes intersect parent-only policies.
for module in ['menus','recipes','house','contracts','missions']:
 if module=='missions':continue # Actual Missions guard only admits its writer.
 run('INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES('+q(uid(101))+','+q(module)+',\'{"TEST":"original"}\');',superuser=True)
for module in ['family','menus','recipes','house','contracts']:
 assert run('SELECT count(*) FROM public.dobby_v2_modules WHERE household_id='+q(uid(101))+' AND module='+q(module)+';',role='authenticated',actor=3)=='1'
 assert run("WITH changed AS (UPDATE public.dobby_v2_modules SET payload=payload||'{\"TEST\":\"FORBIDDEN\"}' WHERE household_id="+q(uid(101))+' AND module='+q(module)+" RETURNING *) SELECT count(*) FROM changed;",role='authenticated',actor=3)=='0'
assert run('SELECT count(*) FROM public.dobby_v2_modules WHERE household_id='+q(uid(102))+';',role='authenticated',actor=3)=='0'
run('INSERT INTO public.dobby_v2_grocery(household_id,title) VALUES('+q(uid(101))+",'FORBIDDEN');",role='authenticated',actor=3,error='row-level security')
run('INSERT INTO public.dobby_v2_grocery(household_id,title) VALUES('+q(uid(102))+",'FORBIDDEN');",role='authenticated',actor=1,error='row-level security')
run('INSERT INTO public.dobby_v2_grocery(household_id,title) VALUES('+q(uid(101))+",'TEST allowed');",role='authenticated',actor=2)
check('child shared reads; direct family/menus/recipes/contracts/Courses writes and foreign HH refused; parent B Courses accepted')
# V7 accounts cannot use the old V1 global dataset that has no household scope.
run("INSERT INTO public.dobby_sync_members(user_id,display_name) VALUES("+q(uid(1))+",'TEST legacy'); INSERT INTO public.dobby_sync_grocery_items(id,title) VALUES("+q(uid(201))+",'TEST legacy row');",superuser=True)
assert run('SELECT count(*) FROM public.dobby_sync_grocery_items;',role='authenticated',actor=1)=='0'
check('V7-bound accounts cannot read or mutate unscoped V1 dataset; legacy rows retained')
# Expiration and revocation do not mutate the target profile.
run("UPDATE public.dobby_v2_modules SET payload=jsonb_set(payload,'{familyMembers}',(payload->'familyMembers')||'[{\"id\":\"child-expire\",\"memberCategory\":\"child\",\"name\":\"TEST expire\"},{\"id\":\"child-revoke\",\"memberCategory\":\"child\",\"name\":\"TEST revoke\"}]'::jsonb) WHERE household_id="+q(uid(101))+" AND module='family';",superuser=True)
expired=rpc('dobby_v7_create_child_invitation',['child-expire',1,op()]);revoked=rpc('dobby_v7_create_child_invitation',['child-revoke',1,op()])
run('UPDATE dobby_v7_private.invitations SET expires_at=clock_timestamp()-interval \'1 second\' WHERE id='+q(expired['invitationId'])+';',superuser=True)
rpc('dobby_v7_revoke_invitation',[revoked['invitationId']],actor=2)
prior=rows()
rpc('dobby_v7_accept_child_invitation',[expired['token'],op()],actor=9,error='expirée')
rpc('dobby_v7_accept_child_invitation',[revoked['token'],op()],actor=10,error='révoquée')
assert rows()==prior
check('expired/revoked targeted invitation refused with exact profile and revision retained')
# Direct REST already owns familyrow before its trigger. It must not then wait
# for the account/advisory locks held by a concurrent canonical RPC.
expected=rev(2)
direct="SET ROLE authenticated; SET request.jwt.claims="+q(json.dumps({'sub':uid(2),'role':'authenticated'}))+"; BEGIN; UPDATE public.dobby_v2_modules SET payload=payload||'{\"TEST_DIRECT_RACE\":true}' WHERE household_id="+q(uid(101))+" AND module='family'; SELECT 'ROW_LOCKED'; SELECT pg_sleep(.4); COMMIT;"
p=subprocess.Popen(BASE+['-U','postgres','-d',a.database],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
p.stdin.write(direct);p.stdin.close()
assert p.stdout.readline().strip()=='ROW_LOCKED'
try:
 rpc('dobby_v7_update_member',['parent-a',{'nickname':'TEST concurrent RPC'},expected,op()],actor=2)
except AssertionError as e:
 assert 'Conflit de révision' in str(e),str(e)
assert p.wait(timeout=8)==0,p.stderr.read()
assert rows()['family']['payload']['TEST_DIRECT_RACE'] is True
rpc('dobby_v7_update_member',['parent-a',{'nickname':'TEST after race'},rev(2),op()],actor=2)
check('parent direct UPDATE versus canonical RPC cannot invert advisory/family locks; stale CAS preserved')
if a.evidence:
 a.evidence.parent.mkdir(parents=True,exist_ok=True)
 a.evidence.write_text(json.dumps({'status':'PASS','postgresVersion':run('SHOW server_version;'),'scope':'exact family candidate on real-catalog model; fictional local data only','network':'none','directSqlEditorLogin':'postgres NOSUPERUSER','installationSha256':hashlib.sha256((HERE.parent/'01-install-family.sql').read_bytes()).hexdigest(),'checks':checks,'limitations':['No remote Supabase mutation or real Auth/RPC/browser validation.','Storage policies are a separate required step.','Missions V3 eligible-completion exception tested by its separate suite.','Raw live function definitions are private, not included in public evidence.']},ensure_ascii=False,indent=2)+'\n')
print('PASS family core; '+str(len(checks))+' targeted checks; fictional local fixture only')

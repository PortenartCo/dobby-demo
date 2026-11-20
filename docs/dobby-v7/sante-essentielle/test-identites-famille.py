#!/usr/bin/env python3
"""Check canonical Family identity in disposable PostgreSQL 17 with no network."""
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import runpy
import subprocess
from uuid import uuid4

HERE = Path(__file__).resolve().parent
support = runpy.run_path(str(HERE / 'test-postgres.py'))
sql, run, uid, quote = (support[name] for name in ('sql', 'run', 'uid', 'quote'))
container, database, admin = (support[name] for name in ('CONTAINER', 'DB', 'BOOTSTRAP'))
family = f"household_id='{uid(101)}' AND module='family'"
migration = (HERE / '00-identites-famille.sql').read_text()


def rpc(name, *args, actor=None, error=None):
    result = sql(f"SELECT public.dobby_v7_{name}({','.join(map(quote, args))});", user=actor, error=error)
    return json.loads(result) if result is not None else None


def id_state(member):
    return sql(f"SELECT state FROM dobby_family_identity_private.member_ids WHERE household_id='{uid(101)}' AND member_id={quote(member)};")


def snapshot(expression):
    return f"UPDATE public.dobby_v2_modules SET payload=jsonb_set(payload,'{{familyMembers}}',{expression}) WHERE {family};"


def add(member, *, home=101, actor=1, error=None):
    row = quote([{'id': member, 'memberCategory': 'child', 'name': 'TEST same name'}])
    query = snapshot(f"(payload->'familyMembers')||{row}").replace(uid(101), uid(home))
    sql(query, user=actor, error=error)


def remove(member):
    return snapshot(f"(SELECT jsonb_agg(e) FROM jsonb_array_elements(payload->'familyMembers') e WHERE e->>'id'<>{quote(member)})")


def reserve(actor=1, home=101, error=None):
    return sql(f"SELECT public.dobby_v7_reserve_member_id('{uid(home)}');", user=actor, error=error)


def family_fingerprint():
    return sql("SELECT md5(jsonb_agg(to_jsonb(m) ORDER BY household_id,module)::text) FROM public.dobby_v2_modules m;")


def writer_signatures():
    return json.loads(sql('''SELECT jsonb_agg(jsonb_build_array(p.oid, p.proowner, p.proacl, p.proconfig,
                              pg_get_functiondef(p.oid)) ORDER BY p.oid)
      FROM pg_proc p WHERE p.oid IN ('dobby_v7_private.add_pending_member(uuid,uuid)'::regprocedure,
         'dobby_socle_private.add_pending_member(uuid,uuid)'::regprocedure);'''))


def check():
    sql((HERE / 'fixture.sql').read_text())
    runpy.run_path(str(HERE / 'fixture-identites-famille.py'))['install_family_fixture'](sql)
    sql(f"""INSERT INTO dobby_v7_private.invitations(id,household_id,created_by,expires_at,target_member_id,invitation_kind)
      VALUES('{uuid4()}','{uid(101)}','{uid(1)}',now() + interval '1 day','preinstall-invited','child-account');""")
    initial, before_functions = family_fingerprint(), writer_signatures()
    # Then allow capacity for member 3's late Auth fixture without old membership.
    sql(f"DELETE FROM public.dobby_v2_memberships WHERE user_id='{uid(3)}';")
    sql(migration, effective='postgres', error='rôle de plateforme')
    assert sql("SELECT to_regnamespace('dobby_family_identity_private') IS NULL;") == 't'
    sql(migration)
    assert family_fingerprint() == initial
    replacement = 'id text:=dobby_family_identity_private.reserve_id(p_household,p_actor);'
    for before, after in zip(before_functions, writer_signatures(), strict=True):
        assert before[:-1] == after[:-1]
        assert before[-1].replace("id text:='member-'||gen_random_uuid()::text;", replacement) == after[-1]
    assert id_state('child') == 'active' and id_state('preinstall-invited') == 'retired'
    assert sql("SELECT count(*) FROM pg_auth_members WHERE roleid='dobby_family_identity_writer'::regrole;") == '0'
    sql('SELECT * FROM dobby_family_identity_private.member_ids;', user=1, error='42501')
    sql(f"SELECT public.dobby_v7_reserve_member_id('{uid(101)}');", role='anon', error='42501')
    reserve(actor=4, error='42501')
    reserve(actor=7, home=101, error='42501')
    print('PASS platform ACL, unchanged legacy payloads, existing and known historical IDs, native writer OID/ACL', flush=True)

    add('local-absent-before-guard', error='23514')
    add('preinstall-invited', error='23514')
    add('member-v7-00000000-0000-4000-8000-000000000123', error='23514')
    child = reserve()
    add(child, actor=2, error='23514')
    add(child, actor=7, home=102, error='23514')
    assert id_state(child) == 'reserved'
    add(child)
    assert id_state(child) == 'active'
    sql(f"""INSERT INTO public.dobby_v2_modules (household_id, module, payload)
      SELECT household_id, module, payload || '{{"fixtureNativeUpsert":true}}'::jsonb FROM public.dobby_v2_modules WHERE {family}
      ON CONFLICT (household_id, module) DO UPDATE SET payload=excluded.payload;""", role='dobby_socle_writer')
    assert id_state(child) == 'active'
    still_child = rpc('create_child_invitation', child, 24, uuid4(), actor=1)['token']
    accepted = rpc('accept_child_invitation', still_child, uuid4(), actor=3)
    assert accepted['memberId'] == child and accepted['category'] == 'child'
    assert id_state(child) == 'active'
    print('PASS scoped one-time server allocations, exact native child account binding, existing snapshot writes', flush=True)

    older = rpc('create_child_invitation', 'child', 24, uuid4(), actor=1)['token']
    assert rpc('preview_child_invitation', older, actor=8)['status'] == 'valid'
    stale = sql(f"SELECT payload->'familyMembers' FROM public.dobby_v2_modules WHERE {family};")
    assert stale
    with ThreadPoolExecutor(max_workers=1) as pool:
        command = ['docker', 'exec', '-i', container, 'psql', '-U', admin, '-d', database,
                   '-XqAt', '-v', 'ON_ERROR_STOP=1']
        with subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True) as process:
            process.stdin.write(f"SET ROLE authenticated; SET request.jwt.claim.sub='{uid(1)}'; BEGIN;\n"
                                + remove('child') + "\nSELECT 'LOCKED'; SELECT pg_sleep(.6); COMMIT;\n")
            process.stdin.close()
            assert process.stdout.readline().strip() == 'LOCKED'
            replay = pool.submit(sql, snapshot(f'{quote(stale)}::jsonb'), user=1, error='23514')
            replay.result(timeout=5)
            assert process.wait(timeout=5) == 0, process.stderr.read()
    assert id_state('child') == 'retired'
    assert rpc('preview_child_invitation', older, actor=8)['status'] == 'invalid'
    rpc('accept_child_invitation', older, uuid4(), actor=8, error='23505')
    for role in ('dobby_v7_writer', 'dobby_socle_writer', admin):
        sql(f"SET request.jwt.claim.sub='{uid(1)}';\n" + snapshot(f'{quote(stale)}::jsonb'), role=role, error='23514')
    sql('TRUNCATE public.dobby_v2_modules;', error='23514')
    replacement_id = reserve()
    add(replacement_id)
    assert replacement_id != 'child' and id_state(replacement_id) == 'active' and id_state('child') == 'retired'
    print('PASS concurrent removal versus stale replay, both privileged writers, late retired invitation, fresh replacement', flush=True)

    new_owner, generic_adult = uid(10), uid(11)
    sql(f"""INSERT INTO dobby_v7_private.pending_profiles VALUES
      ('{new_owner}', '{{"firstName":"TEST Owner"}}'), ('{generic_adult}', '{{"firstName":"TEST Adult"}}');""")
    adopted = rpc('create_household', 'TEST new home', uuid4(), actor=10)
    assert adopted['category'] == 'parent' and adopted['memberId'].startswith('member-v7-')
    created_home = quote(adopted['householdId'])
    created_payload = sql(f"SELECT payload FROM public.dobby_v2_modules WHERE household_id={created_home} AND module='family';")
    sql(f"DELETE FROM public.dobby_v2_modules WHERE household_id={created_home} AND module='family';")
    sql(f"SET request.jwt.claim.sub='{new_owner}'; INSERT INTO public.dobby_v2_modules(household_id,module,payload)"
        f" VALUES({created_home},'family',{quote(created_payload)}::jsonb);", error='23514')
    generic = rpc('create_invitation', 24, uuid4(), actor=1)['token']
    joined = rpc('accept_invitation', generic, uuid4(), actor=11)
    assert joined['category'] == 'parent' and id_state(joined['memberId']) == 'active'
    print('PASS native household creation and generic Auth invitation', flush=True)
    check_health_history(replacement_id)


def check_health_history(member):
    sql('GRANT EXECUTE ON FUNCTION dobby_socle_private.actor_context(uuid,boolean) TO postgres;', effective='dobby_socle_writer')
    sql((HERE / 'fixture-storage.sql').read_text())
    support['install_for_fixtures']()
    read, write = (support[name] for name in ('read', 'write'))

    def empower(child):
        sql(f"INSERT INTO dobby_health_private.caregivers VALUES ('{uid(101)}',{quote(child)},'{uid(1)}','parent-a');")

    empower(member)
    write(1, 701, member, 'profile', {'allergies': 'TEST original private history'})
    tomorrow = sql("SELECT (now() AT TIME ZONE 'Europe/Brussels')::date + 1;")
    write(1, 702, member, 'visit', {'title': 'TEST original private visit', 'date': tomorrow,
                                  'agendaVisible': True, 'childVisible': True, 'childText': 'TEST original practical text'})
    profiles = [entry for entry in read(1, 'private', member) if entry['kind'] == 'profile']
    assert profiles[0]['fields']['allergies'] == 'TEST original private history'
    assert {item['id'] for item in read(1, 'agenda')} == {uid(702)}
    sql(remove(member), user=1)
    read(1, 'private', member, error='42501')
    add(member, error='23514')
    replacement = reserve()
    add(replacement)
    empower(replacement)
    assert read(1, 'private', replacement) == []
    assert read(1, 'agenda') == []
    target = rpc('create_child_invitation', replacement, 24, uuid4(), actor=1)['token']
    assert rpc('accept_child_invitation', target, uuid4(), actor=8)['memberId'] == replacement
    assert read(8, 'practical') == [] and read(8, 'agenda') == []
    assert sql(f"SELECT count(*) FROM dobby_health_private.entries WHERE member_id={quote(member)};") == '2'
    print('PASS private history retained and inaccessible after native removal, same-name replacement and replacement Auth', flush=True)


if __name__ == '__main__':
    run('docker','run','--pull=never','--detach','--network','none','--name',container,'--rm',
        '-e', f'POSTGRES_USER={admin}', '-e', 'POSTGRES_PASSWORD=fixture-only',
        '-e', f'POSTGRES_DB={database}', 'postgres:17.11')
    try:
        support['wait_ready']('docker','exec',container,'pg_isready','-U',admin,'-d',database,'-h','127.0.0.1')
        assert run('docker','inspect','-f','{{.HostConfig.NetworkMode}}',container) == 'none'
        check()
    finally:
        run('docker','stop',container)

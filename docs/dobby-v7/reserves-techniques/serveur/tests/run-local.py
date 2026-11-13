#!/usr/bin/env python3
"""Exact diagnostic bytes; PostgreSQL17.7, fixed local container, no network.

Reuses the DECLARED historical fictional catalogue, NOT any install script.
The historical private Missions guard remains a clearly labelled STUB.
No remote connection parameter, Supabase client or application RPC invocation.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[4]
DIAGNOSTIC = HERE.parent / '00-diagnostic-regroupe.sql'
HISTORICAL = REPO / 'docs/dobby-v7/stitch19-20/supabase/tests/catalog-fixture.sql'
SUPPLEMENT = HERE / 'metadata-fixture.sql'
CONTAINER = 'dobby-v7-reserves-diag-pg-20261113'
DATABASE = 'dobby_reserves_diagnostic_test'
ROLE = 'dobby_diag_local'
diagnostic = DIAGNOSTIC.read_text()
assert 'defensive test stub only' in HISTORICAL.read_text()

# No configurable host/URL, docker pull, mounted socket, network or published port.
inspect = subprocess.run(['docker', 'inspect', CONTAINER], text=True, capture_output=True)
if inspect.returncode:
    subprocess.run(['docker', 'run', '--detach', '--pull=never', '--name', CONTAINER,
                    '--network', 'none', '--env', 'POSTGRES_USER=' + ROLE,
                    '--env', 'POSTGRES_PASSWORD=fictional-local-diagnostic-only',
                    'postgres:17.7'], check=True, capture_output=True)
    subprocess.run(['docker', 'exec', CONTAINER, 'sh', '-c',
                    'until pg_isready -U dobby_diag_local -d postgres >/dev/null; do sleep 1; done'],
                   check=True, timeout=30)
info = json.loads(subprocess.check_output(['docker', 'inspect', CONTAINER], text=True))[0]
assert info['HostConfig']['NetworkMode'] == 'none'
assert not info['HostConfig']['PortBindings']
assert all(x['Type'] == 'volume' and x['Destination'] == '/var/lib/postgresql/data'
           for x in info['Mounts']), 'No host bind mounts or shared sockets'
assert info['Config']['Image'] == 'postgres:17.7'
BASE = ['docker', 'exec', '-i', CONTAINER, 'psql', '-X', '-qAt',
        '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-U', ROLE]


def sql(source, database=DATABASE, prefix='', error=None):
    result = subprocess.run(BASE + ['-d', database], input=prefix + source,
                            text=True, capture_output=True, timeout=45)
    if error:
        assert result.returncode and error in result.stderr, result.stderr
        assert not result.stdout.strip(), result.stdout
        return None
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


def run(prefix=''):
    output = sql(diagnostic, prefix=prefix)
    assert len(output.splitlines()) == 1, 'Exactly one JSON result required'
    result = json.loads(output)
    assert set(result) == {
        'diagnostic', 'safety', 'serverVersion', 'executionRole', 'roleClosure', 'limits', 'groceryAvailability', 'presence',
        'schemas', 'relations', 'policies', 'triggers', 'functions', 'functionDependencies',
        'unresolvedQualifiedCalls', 'roles', 'roleMemberships', 'sequences'}
    assert result['diagnostic'] == 'dobby-v7-reserves-serveur-v1'
    assert result['safety'] == {
        'transactionReadOnly': 'on', 'isolation': 'repeatable read', 'statementTimeout': '30s',
        'lockTimeout': '3s', 'idleTransactionTimeout': '1min', 'jit': 'off', 'businessRowsRead': False,
        'businessFunctionsCalled': False, 'permissionErrorsSuppressed': False}
    return result, output


def item(result, section, name, schema='public'):
    return next(x for x in result[section] if x['name'] == name and x['schema'] == schema)


# Check executable SQL after removing comments and string literals. Definitions
# returned as catalogue VALUES do not become executable statements here.
code = re.sub(r'--[^\n]*', '', diagnostic)
code = re.sub(r"'(?:[^']|'')*'", "''", code)
assert not re.search(r'\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|GRANT|REVOKE|CALL|DO|EXECUTE|TRUNCATE|COPY)\b', code, re.I)
assert not re.search(r'\b(FROM|JOIN)\s+(public|auth|storage|dobby_\w+)\s*\.', code, re.I)
assert not re.search(r'\b(public|auth|storage|dobby_\w+)\s*\.\s*\w+\s*\(', code, re.I)
assert code.count(';') == 8  # BEGIN, five SET LOCAL, one SELECT/WITH, ROLLBACK.
assert sql("SELECT current_setting('server_version');", database='postgres').startswith('17.7 ')
sql('DROP DATABASE IF EXISTS ' + DATABASE + ';', database='postgres')
sql('CREATE DATABASE ' + DATABASE + ';', database='postgres')
empty, _ = run()
assert empty['relations'] == empty['functions'] == empty['triggers'] == empty['policies'] == []
assert not any(x['present'] for x in empty['presence']['relations'])
assert not any(x['present'] for x in empty['presence']['functions'])
assert empty['groceryAvailability']['columnState'] == 'table_absente'
print('PASS absent schemas/tables/functions: exact SQL yields one JSON without missing-object failure')

# Only the declared fictional catalogue and supplement are loaded. Historical
# 01/04/06/11 or other install/repair scripts are NEVER read or executed.
sql(HISTORICAL.read_text())
baseline, _ = run()
grocery = item(baseline, 'relations', 'dobby_v2_grocery')
assert 'at_home_quantity' not in {x['name'] for x in grocery['columns']}
assert baseline['groceryAvailability']['columnState'] == 'colonne_absente'
assert 'fixture: direct Missions write blocked' in item(baseline, 'functions', 'guard_missions', 'dobby_runes_private')['definition']
assert any(x['name'] == 'assert_payload' for x in baseline['unresolvedQualifiedCalls'])
print('PASS declared historical fixture: absent availability and unresolved private helpers are visible; guard is a STUB')

sql(SUPPLEMENT.read_text())
before_dump = subprocess.check_output(['docker', 'exec', CONTAINER, 'pg_dump', '-U', ROLE,
                                       '--no-owner', '--no-privileges', DATABASE], text=True)
present, output = run()
again, _ = run()
assert present == again, 'Repeated exact SQL must return the same complete JSON'
grocery = item(present, 'relations', 'dobby_v2_grocery')
column = next(x for x in grocery['columns'] if x['name'] == 'at_home_quantity')
assert (column['type'], column['typeModifier'], column['notNull'], column['default']) == ('numeric', -1, True, '0')
check = next(x for x in grocery['constraints'] if x['name'] == 'dobby_v2_grocery_at_home_quantity_range')
assert check['validated'] and check['type'] == 'c'
assert check['checkExpression'] == '((at_home_quantity >= (0)::numeric) AND (at_home_quantity <= (999999)::numeric))'
assert present['groceryAvailability']['columnState'] == 'compatible'
assert present['groceryAvailability']['rangeState'] == 'canonique_validee'
anon_column = next(x for x in column['effectivePrivileges'] if x['role'] == 'anon')
anon_table = next(x for x in grocery['effectivePrivileges'] if x['role'] == 'anon')
assert anon_column['select'] and anon_column['update'] and not anon_table['select'] and not anon_table['update']
assert grocery['rls']
assert any(x['name'] == 'dobby_v2_grocery_stamp_trigger' and x['enabled'] == 'O' and x['sourceIncluded'] for x in present['triggers'])
context = item(present, 'functions', 'dobby_v7_context')
assert context['owner'] == 'dobby_v7_writer' and context['securityDefiner']
assert context['settings'] == ['search_path=""'] and not context['publicExecute']
assert next(x for x in context['effectiveExecute'] if x['role'] == 'authenticated')['execute']
assert not next(x for x in context['effectiveExecute'] if x['role'] == 'anon')['execute']
assert item(present, 'functions', 'fixture_dependency', 'dobby_v7_private')
assert item(present, 'functions', 'fixture_extra_guard_helper', 'dobby_runes_private')
assert any(x['name'] == 'function_not_installed' for x in present['unresolvedQualifiedCalls'])
assert any(x['calleeSchema'] == 'unrelated_service_private' and not x['sourceIncluded'] for x in present['functionDependencies'])
assert any(x['name'] == 'dobby_v7_create_child_invitation' and x['present'] for x in present['presence']['functions'])
assert any(x['name'] == 'dobby_missions_v3_capabilities' and x['present'] for x in present['presence']['functions'])
assert any(x['role'] == 'dobby_v7_writer' and x['member'] == 'dobby_diag_fixture_parent' and not x['inherit'] and x['set'] for x in present['roleMemberships'])
assert present['roleClosure']['unresolvedRoleOids'] == []
for name in ['dobby_diag_acl_holder', 'dobby_diag_acl_middle', 'dobby_diag_acl_leaf']:
    assert any(x['name'] == name and not x['login'] for x in present['roles'])
    quantity = next(x for x in grocery['columns'] if x['name'] == 'quantity')
    assert next(x for x in quantity['effectivePrivileges'] if x['role'] == name)['update']
assert any(x['table'] == 'objects' and x['name'] == 'generic_allow' and x['using'] == 'true' for x in present['policies'])
assert any(x['table'] == 'objects' and x['name'] == 'unrelated_bucket' for x in present['policies'])
assert any(x['table'] == 'objects' and x['name'] == 'generic_hook' and not x['sourceIncluded'] for x in present['triggers'])
generic_hook = next(x for x in present['triggers'] if x['name'] == 'generic_hook')
assert generic_hook['functionOwner'] == ROLE and generic_hook['functionSecurityDefiner'] is False
assert 'functionSettings' in generic_hook and 'functionAcl' in generic_hook
assert any(x['name'] == 'fixture_receipt_sequence' for x in present['sequences'])
assert 'install_secret' not in {x['name'] for x in present['relations']}
assert not any(x['schema'] in ('auth', 'unrelated_service_private') for x in present['relations'] + present['functions'])
for sentinel in ['ROW-ONLY-', 'UNRELATED-PRIVATE-SOURCE-SENTINEL', 'UNRELATED-PUBLIC-SOURCE-SENTINEL',
                 'UNREACHABLE-V7-SOURCE-SENTINEL', 'UNRELATED-TRIGGER-SOURCE-SENTINEL']:
    assert sentinel not in output, sentinel
after_dump = subprocess.check_output(['docker', 'exec', CONTAINER, 'pg_dump', '-U', ROLE,
                                      '--no-owner', '--no-privileges', DATABASE], text=True)
# pg_dump randomizes its psql restrict token; no other byte may change.
def stable_dump(value):
    return re.sub(r'^\\(?:un)?restrict .*$', '', value, flags=re.M)
assert stable_dump(before_dump) == stable_dump(after_dump)
print('PASS present metadata/ACL/RLS/CAS source/dependencies/roles; no RPC executes, no row or unrelated source leaks; dump unchanged')

# Classifications must not turn a misleading same-name CHECK into success.
sql('ALTER TABLE public.dobby_v2_grocery DROP CONSTRAINT dobby_v2_grocery_at_home_quantity_range;')
without_check, _ = run()
assert without_check['groceryAvailability']['rangeState'] == 'absente'
sql('ALTER TABLE public.dobby_v2_grocery ADD CONSTRAINT dobby_v2_grocery_at_home_quantity_range CHECK(at_home_quantity>=0 OR at_home_quantity<=999999);')
wrong_check, _ = run()
assert wrong_check['groceryAvailability']['rangeState'] == 'incompatible_ou_non_validee'
sql('ALTER TABLE public.dobby_v2_grocery DROP CONSTRAINT dobby_v2_grocery_at_home_quantity_range; ALTER TABLE public.dobby_v2_grocery ADD CONSTRAINT dobby_v2_grocery_at_home_quantity_range CHECK(at_home_quantity>=0 AND at_home_quantity<=999999) NOT VALID;')
unvalidated, _ = run()
assert unvalidated['groceryAvailability']['rangeState'] == 'incompatible_ou_non_validee'
sql('ALTER TABLE public.dobby_v2_grocery VALIDATE CONSTRAINT dobby_v2_grocery_at_home_quantity_range; ALTER TABLE public.dobby_v2_grocery ALTER COLUMN at_home_quantity TYPE numeric(12,2);')
wrong_type, _ = run()
assert wrong_type['groceryAvailability']['columnState'] == 'incompatible'
sql('ALTER TABLE public.dobby_v2_grocery ALTER COLUMN at_home_quantity TYPE numeric; ALTER TABLE public.dobby_v2_grocery ALTER COLUMN at_home_quantity SET DEFAULT 2;')
wrong_default, _ = run()
assert wrong_default['groceryAvailability']['columnState'] == 'incompatible'
sql('ALTER TABLE public.dobby_v2_grocery ALTER COLUMN at_home_quantity SET DEFAULT 0;')
print('PASS availability states: missing CHECK, misleading OR, NOT VALID, fixed scale and wrong default never classify as compliant')

observer, _ = run('SET ROLE dobby_diag_observer;\n')
assert observer['executionRole'] == 'dobby_diag_observer'
private_schema = next(x for x in observer['schemas'] if x['name'] == 'dobby_v7_private')
assert not next(x for x in private_schema['effectivePrivileges'] if x['role'] == 'dobby_diag_observer')['usage']
assert item(observer, 'relations', 'account_links', 'dobby_v7_private')
sql('REVOKE SELECT ON pg_catalog.pg_proc FROM PUBLIC;')
try:
    sql(diagnostic, prefix='SET ROLE dobby_diag_observer;\n', error='permission denied for table pg_proc')
finally:
    sql('GRANT SELECT ON pg_catalog.pg_proc TO PUBLIC;')
print('PASS insufficient catalogue permission aborts visibly; schema USAGE denial is not disguised as object absence')
print('PASS diagnosticSha256=' + hashlib.sha256(DIAGNOSTIC.read_bytes()).hexdigest())
print('LOCAL FICTIONAL FIXTURE ONLY: no real guard source, migration, Supabase project or account verified.')

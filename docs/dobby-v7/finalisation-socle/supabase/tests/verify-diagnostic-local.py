#!/usr/bin/env python3
"""Validate the exact catalog diagnostic locally; never connects to Supabase.

Requires the existing fictional Stitch fixture in a dedicated network=none PG17
container. Only the two explicitly named catalog-test databases are created or
changed. No historical campaign or migration is replayed. Fixture private
Missions helpers are incomplete: this test certifies the diagnostic, not V3.
"""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
SQL = HERE.parent / '00-diagnostic-socle.sql'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--container', default='dobby-stitch1920-pg-20261112')
parser.add_argument('--evidence', type=Path)
args = parser.parse_args()
assert args.container.startswith('dobby-stitch1920-pg-')
info = json.loads(subprocess.check_output(['docker', 'inspect', args.container], text=True))[0]
assert info['HostConfig']['NetworkMode'] == 'none'
assert not info['HostConfig']['PortBindings']
base = ['docker', 'exec', '-i', args.container, 'psql', '-X', '-qAt',
        '-v', 'ON_ERROR_STOP=1', '-U', 'dobby_local_test']


def run(sql, db='postgres'):
    result = subprocess.run(base + ['-d', db], input=sql, text=True, capture_output=True)
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


code = SQL.read_text()
# Ignore comments/quoted text before checking executable statement boundaries.
# The diagnostic contains no dollar-quoted code or double-quoted identifiers.
tokens = re.sub(r"'(?:''|[^'])*'|--[^\n]*", ' ', code)
statements = [s.strip() for s in tokens.split(';') if s.strip()]
assert len(statements) == 3
assert re.match(r'^BEGIN\s+TRANSACTION\s+ISOLATION\s+LEVEL\s+REPEATABLE\s+READ\s+READ\s+ONLY$', statements[0])
assert statements[1].startswith('SELECT pg_catalog.jsonb_pretty(')
assert statements[2] == 'ROLLBACK'
assert not re.search(r'\b(INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|COPY|CALL|DO|SET|LOCK)\b', statements[1], re.I)
assert not re.search(r'\b(?:FROM|JOIN)\s+(?:public|auth|storage|dobby_\w+)\.', tokens, re.I)

databases = {
    'dobby_socle_catalog_local': 'dobby_stitch1920_test',
    'dobby_socle_catalog_empty_local': 'template0',
}
for db, template in databases.items():
    if run("SELECT count(*) FROM pg_catalog.pg_database WHERE datname='" + db + "';") == '0':
        run('CREATE DATABASE ' + db + ' TEMPLATE ' + template + ';')

fixture_db = 'dobby_socle_catalog_local'
sentinel = 'TEST-DIAGNOSTIC-ROW-MUST-REMAIN-PRIVATE'
run("INSERT INTO public.dobby_v2_households(id,name) VALUES "
    "('00000000-0000-4000-8000-000000099999','" + sentinel + "') "
    "ON CONFLICT(id) DO NOTHING;", fixture_db)


def fingerprint(db):
    tables = json.loads(run("SELECT jsonb_agg(format('%I.%I',n.nspname,c.relname) ORDER BY n.nspname,c.relname) "
        "FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace "
        "WHERE c.relkind='r' AND (n.nspname IN ('auth','dobby_v7_private','dobby_runes_private') "
        "OR (n.nspname='public' AND c.relname LIKE 'dobby%'));", db) or 'null') or []
    return {t: run("SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,'[]')) FROM " + t + ' t;', db) for t in tables}


results = []
sections = ['shoppingCatalog', 'missionsCatalog', 'familyRolesCatalog',
            'missionsFunctionSourcesConfidential', 'familyFunctionSourcesConfidential']


def check(label, db, role=None):
    before = fingerprint(db)
    prefix = ('SET ROLE ' + role + ';\n') if role else ''
    output = run(prefix + code, db)
    data = json.loads(output)
    assert data['diagnostic'] == 'dobby-v7-family-core-checkpoint-b-v1'
    assert data['transactionReadOnly'] == 'on'
    assert data['applicationRowsRead'] is False
    assert data['noMigrationPerformed'] is True
    assert data['realAuthRlsRpcOrBrowserVerified'] is False
    assert data['confidentialTechnicalOutput'] is True
    assert all(isinstance(data[s], dict) for s in sections)
    assert sentinel not in output
    assert before == fingerprint(db), 'Application/private rows changed'
    results.append({'case': label, 'status': 'PASS', 'singleJsonResult': True,
                    'readOnly': True, 'applicationRowsUnchanged': True})
    print('PASS ' + label)
    return data


check('existing fictional partial catalog', fixture_db)
anonymous = check('catalog available without application privileges', fixture_db, 'anon')
assert anonymous['familyRolesCatalog']['caller']['superuser'] is False
assert run("SET ROLE anon; SELECT has_table_privilege(current_user,'public.dobby_v2_households','SELECT');", fixture_db) == 'f'
editor = check('non-superuser fictional SQL Editor', fixture_db, 'dobby_stitch1920_installer')
assert editor['familyRolesCatalog']['caller']['superuser'] is False
empty = check('missing application catalog is reported safely', 'dobby_socle_catalog_empty_local')
assert empty['shoppingCatalog']['tablePresent'] is False
assert empty['missionsCatalog']['tables'] == []
assert empty['familyRolesCatalog']['relations'] == []
run('ALTER TABLE public.dobby_v2_grocery ADD COLUMN IF NOT EXISTS at_home_quantity numeric NOT NULL DEFAULT 0;', fixture_db)
present = check('existing unrestricted numeric availability column', fixture_db)
column = next(c for c in present['shoppingCatalog']['columns'] if c['name'] == 'at_home_quantity')
assert column['exactType'] == 'numeric' and column['notNull'] is True

evidence = {
    'diagnosticSha256': hashlib.sha256(SQL.read_bytes()).hexdigest(),
    'postgresVersion': run('SHOW server_version;'),
    'network': 'none', 'remoteSupabaseAccess': False,
    'scope': 'exact diagnostic only; fictional local data; no historical campaign replay',
    'checks': results,
    'limits': ['No backend migration installed or certified.',
               'Private Missions fixture functions are incomplete; not a V3 proof.',
               'No real Auth, RLS/RPC business recipe, Safari or physical microphone proof.',
               'Raw catalog and function-definition outputs are never saved in public evidence.'],
}
if args.evidence:
    args.evidence.parent.mkdir(parents=True, exist_ok=True)
    args.evidence.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + '\n')
print('PASS exact diagnostic; 5 local cases; no remote access or business certification')

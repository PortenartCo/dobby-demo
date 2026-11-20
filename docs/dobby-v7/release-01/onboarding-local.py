#!/usr/bin/env python3
"""Local-only DOBBY onboarding: real GoTrue, Mailpit, PostgREST and PostgreSQL."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import re
import socket
import subprocess
from threading import Thread
from time import sleep
from urllib.error import URLError
from urllib.request import urlopen
from uuid import uuid4

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SOURCE = HERE.parent
PG = 'postgres:17.11@sha256:ff87138949ad9a46f32ff23bd6852b52ce024a13dffe9b4087be98292cdd3b4f'
AUTH = 'public.ecr.aws/supabase/gotrue:v2.177.0@sha256:6a916b47af0386b7e0152ca84f3d45d050bf056e449a75a5460b48742fd67822'
REST = 'postgrest/postgrest:v14.8@sha256:4173b72e0be29cf15349dc827798c3e464c5f2cc7f9c1697022f9cd1874b4c36'
MAIL = 'axllent/mailpit:v1.28.3@sha256:27cfb8893806ed676042a00f4db70325a0d57cc5217349d210b6dd903e1a7e67'
NAME = 'dobby-onboarding-' + uuid4().hex[:10]
ADMIN = 'dobby_fixture_admin'
DATABASE = 'dobby_onboarding'
PASSWORD = 'dobby-local-' + uuid4().hex
JWT_SECRET = uuid4().hex + uuid4().hex


def docker(*args, **kwargs):
    return subprocess.run(['docker', *args], text=True, check=True, stdout=subprocess.PIPE, **kwargs).stdout.strip()


def start(service, image, env=None, port=None):
    options = ['--publish', f'127.0.0.1:{port[0]}:{port[1]}'] if port else []
    for name, value in (env or {}).items():
        options.extend(['--env', f'{name}={value}'])
    docker('run', '--detach', '--rm', '--name', NAME + service, '--network', NAME, *options, image)


def free_port():
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        return listener.getsockname()[1]


def wait_until(probe):
    for _ in range(100):
        try:
            if probe():
                return
        except (subprocess.CalledProcessError, URLError, OSError):
            pass
        sleep(0.2)
    raise RuntimeError('A local service failed its readiness check')


def http_ready(url):
    with urlopen(url, timeout=2) as response:
        return response.status == 200


def sql(source, user=ADMIN):
    return docker('exec', '-i', NAME + '-db', 'psql', '-XqAt', '-v', 'ON_ERROR_STOP=1',
                  '-U', user, '-d', DATABASE, input=source)


def install_family_sources():
    stitch = SOURCE / 'stitch19-20/supabase'
    catalog = (stitch / 'tests/catalog-fixture.sql').read_text()
    start = catalog.index('CREATE SCHEMA auth;')
    end = catalog.index('GRANT USAGE ON SCHEMA public,auth', start)
    sql(catalog[:start])
    sql(catalog[end:], 'postgres')
    sql((stitch / '01-apply.sql').read_text(), 'postgres')
    # The catalog fixture uses local owners and Auth's real helper. Reproduce
    # the repaired JWT lookup and module stamp without production fingerprints.
    sql("GRANT dobby_v7_writer TO postgres WITH ADMIN TRUE, INHERIT TRUE, SET TRUE;")
    sql("""
      CREATE OR REPLACE FUNCTION dobby_v7_private.actor() RETURNS uuid
      LANGUAGE plpgsql STABLE SET search_path='' AS $$
      DECLARE u uuid:=coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
        nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid;
      BEGIN
        IF u IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Connexion requise'; END IF;
        RETURN u;
      END $$;
      DO $fixture$
      DECLARE stamp text:=pg_get_functiondef('public.dobby_v2_modules_stamp()'::regprocedure);
      BEGIN
        EXECUTE replace(stamp, '  ELSE', '  ELSIF current_user=''dobby_v7_writer'' THEN
          NEW.updated_by := dobby_v7_private.actor();
        ELSE');
      END $fixture$;
    """, 'postgres')
    socle = (SOURCE / 'finalisation-socle/supabase/family/01-install-family.sql').read_text()
    socle, count = re.subn(r'DO \$preflight\$.*?END \$preflight\$;', '', socle, count=1, flags=re.S)
    assert count == 1
    sql(socle, 'postgres')


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass  # Auth callback and invitation URLs contain short-lived credentials.


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence', type=Path, required=True)
    options = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=ROOT))
    site = f'http://127.0.0.1:{server.server_port}'
    Thread(target=server.serve_forever, daemon=True).start()
    docker('network', 'create', NAME)
    try:
        start('-db', PG, dict(POSTGRES_USER=ADMIN, POSTGRES_DB=DATABASE, POSTGRES_PASSWORD=PASSWORD))
        wait_until(lambda: docker('exec', NAME + '-db', 'pg_isready', '-h', '127.0.0.1', '-U', ADMIN, '-d', DATABASE))
        sql(f"""
          CREATE ROLE postgres LOGIN CREATEROLE BYPASSRLS;
          ALTER DATABASE {DATABASE} OWNER TO postgres;
          ALTER SCHEMA public OWNER TO postgres;
          CREATE SCHEMA auth AUTHORIZATION postgres;
        """)
        mail_port, auth_port, rest_port = (free_port() for _ in range(3))
        auth_origin = f'http://127.0.0.1:{auth_port}'
        mail_origin = f'http://127.0.0.1:{mail_port}'
        rest_origin = f'http://127.0.0.1:{rest_port}'
        db_host = NAME + '-db:5432/' + DATABASE
        start('-mail', MAIL, port=(mail_port, 8025))
        start('-auth', AUTH, dict(
            GOTRUE_API_HOST='0.0.0.0', GOTRUE_API_PORT='9999', API_EXTERNAL_URL=auth_origin,
            GOTRUE_DB_DRIVER='postgres',
            GOTRUE_DB_DATABASE_URL=f'postgres://{ADMIN}:{PASSWORD}@{db_host}?sslmode=disable&search_path=auth',
            GOTRUE_SITE_URL=site+'/', GOTRUE_JWT_SECRET=JWT_SECRET, GOTRUE_JWT_AUD='authenticated',
            GOTRUE_JWT_DEFAULT_GROUP_NAME='authenticated',
            GOTRUE_EXTERNAL_EMAIL_ENABLED='true', GOTRUE_MAILER_AUTOCONFIRM='false',
            GOTRUE_SMTP_HOST=NAME+'-mail', GOTRUE_SMTP_PORT='1025', GOTRUE_SMTP_ADMIN_EMAIL='dobby@example.test',
            GOTRUE_SMTP_MAX_FREQUENCY='1s', GOTRUE_RATE_LIMIT_EMAIL_SENT='1000',
            GOTRUE_MAILER_URLPATHS_CONFIRMATION='/verify', GOTRUE_MAILER_URLPATHS_RECOVERY='/verify',
        ), port=(auth_port, 9999))
        wait_until(lambda: http_ready(auth_origin + '/health'))
        sql("ALTER TABLE auth.users OWNER TO postgres; ALTER FUNCTION auth.uid() OWNER TO postgres;")
        install_family_sources()
        sql(f"""
          CREATE ROLE dobby_fixture_rest LOGIN NOINHERIT PASSWORD '{PASSWORD}';
          GRANT anon, authenticated TO dobby_fixture_rest;
        """)
        start('-rest', REST, dict(
            PGRST_DB_URI=f'postgres://dobby_fixture_rest:{PASSWORD}@{db_host}',
            PGRST_DB_ANON_ROLE='anon', PGRST_JWT_SECRET=JWT_SECRET,
        ), port=(rest_port, 3000))
        wait_until(lambda: http_ready(rest_origin + '/'))
        wait_until(lambda: http_ready(mail_origin + '/api/v1/messages'))
        env = dict(os.environ, DOBBY_TEST_ORIGIN=site, DOBBY_LOCAL_AUTH=auth_origin,
                   DOBBY_LOCAL_REST=rest_origin, DOBBY_LOCAL_MAIL=mail_origin,
                   DOBBY_LOCAL_PG_CONTAINER=NAME+'-db', DOBBY_ONBOARDING_EVIDENCE=str(options.evidence.resolve()))
        subprocess.run(['node', 'essai-stitch-v7/tests/family-onboarding.cjs'], env=env, cwd=ROOT, check=True)
    finally:
        for service in ('-rest', '-auth', '-mail', '-db'):
            subprocess.run(['docker', 'rm', '-f', NAME+service], check=False, capture_output=True)
        subprocess.run(['docker', 'network', 'rm', NAME], check=False, capture_output=True)
        server.shutdown()


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Run the child account browser journeys on disposable local services."""
from pathlib import Path
import re
from runpy import run_path

DOC = Path(__file__).resolve().parents[2]
onboarding = run_path(str(DOC / 'release-01/onboarding-local.py'))
lot1 = run_path(str(DOC / 'runes-lot1/test-postgres.py'))


def install_native_v2(sql):
    # Replace the minimal V2 stubs of the generic onboarding catalog before
    # the V7 repair and Family installers derive the real writer and ACLs.
    sql("ALTER ROLE dobby_missions_v2_writer NOINHERIT; GRANT dobby_missions_v2_writer TO postgres WITH ADMIN TRUE;")
    sql("DROP TABLE dobby_runes_private.operations;", 'postgres')
    sql(lot1['old_file']('sql-proposals/dobby-shared-runes-v2.sql'), 'postgres')


def install(sql):
    missions = (DOC / 'finalisation-socle/supabase/missions/01-apply.sql').read_text()
    missions, count = re.subn(r'DO \$preflight\$.*?END \$preflight\$;', '', missions, count=1, flags=re.S)
    assert count == 1  # Hosted catalog fingerprints differ in the fictional fixture.
    sql(missions, 'postgres')
    for source in ('runes-lot1/01-etendre-registre-v3.sql', 'runes-lot2/02-participations-recompenses.sql'):
        sql((DOC / source).read_text(), 'postgres')
    sql("""
      CREATE SCHEMA storage AUTHORIZATION postgres;
      CREATE TABLE storage.buckets(id text PRIMARY KEY,public boolean NOT NULL);
      INSERT INTO storage.buckets VALUES('dobby-family-files',false);
      ALTER TABLE storage.buckets OWNER TO postgres;
      CREATE TABLE storage.objects(bucket_id text NOT NULL, name text NOT NULL);
      ALTER TABLE storage.objects OWNER TO postgres;
      CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE
        AS $$ SELECT (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
      GRANT USAGE ON SCHEMA storage TO authenticated;
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    """)
    sql((DOC / 'finalisation-socle/supabase/family/03-install-storage-policies.sql').read_text(), 'postgres')
    sql((DOC / 'comptes-enfants/01-restrict-child-access.sql').read_text(), 'postgres')
    sql("""UPDATE dobby_socle_private.install_state SET family_client_verified=true,storage_client_verified=true,
      child_link_client_verified=true,missions_client_verified=true WHERE singleton;""")


if __name__ == '__main__':
    onboarding['main'](install, 'child-onboarding-local.cjs', install_native_v2)

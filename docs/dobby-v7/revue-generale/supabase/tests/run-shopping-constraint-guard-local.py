#!/usr/bin/env python3
"""C07 metadata guard regression, stock local PostgreSQL with no network/ports.

The original installer is never replayed to set up this fixture. Only a unique
fictional database and synthetic rows are created, then removed in tearDownClass.
"""
import json
import os
from pathlib import Path
import subprocess
import unittest
import uuid


ROOT = Path(__file__).resolve().parents[1] / 'shopping'
CONTAINER = 'dobby-stitch1920-pg-20261113-review'
DOCKER = ['docker', '--host', 'unix:///var/run/docker.sock']
LOCAL_ENV = {k:v for k,v in os.environ.items() if k not in {'DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'}}


class ConstraintGuard(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        info = json.loads(subprocess.check_output(DOCKER + ['inspect', CONTAINER], env=LOCAL_ENV))[0]
        assert info['Config']['Image'] == 'postgres:17.7'
        assert info['HostConfig']['NetworkMode'] == 'none'
        assert not info['HostConfig']['PortBindings']
        cls.base = DOCKER + ['exec', '-i', CONTAINER, 'psql', '-X', '-qAt',
                    '-v', 'ON_ERROR_STOP=1', '-U', 'dobby_local_test']
        cls.database = 'dobby_c07_constraint_' + uuid.uuid4().hex[:12]
        cls.sql('CREATE DATABASE ' + cls.database + ';', database='postgres')

    @classmethod
    def tearDownClass(cls):
        cls.sql('DROP DATABASE ' + cls.database + ';', database='postgres')

    @classmethod
    def sql(cls, text, database=None):
        result = subprocess.run(cls.base + ['-d', database or cls.database],
                                input=text, text=True, capture_output=True, env=LOCAL_ENV)
        if result.returncode:
            raise AssertionError(result.stderr.strip())
        return result.stdout.strip()

    def setUp(self):
        self.sql('''
DROP TABLE IF EXISTS public.dobby_v2_grocery CASCADE;
CREATE TABLE public.dobby_v2_grocery(
 id text PRIMARY KEY, quantity numeric, revision bigint DEFAULT 1,
 at_home_quantity numeric NOT NULL DEFAULT 0);
ALTER TABLE public.dobby_v2_grocery ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.fixture_revision() RETURNS trigger
 LANGUAGE plpgsql AS $$ BEGIN NEW.revision:=OLD.revision+1; RETURN NEW; END; $$;
CREATE TRIGGER fixture_revision BEFORE UPDATE ON public.dobby_v2_grocery
 FOR EACH ROW EXECUTE FUNCTION public.fixture_revision();
''')

    def test_verifier_rejects_or_constraint_that_accepts_invalid_values(self):
        self.sql('''ALTER TABLE public.dobby_v2_grocery
 ADD CONSTRAINT dobby_v2_grocery_at_home_quantity_range
 CHECK(at_home_quantity>=0 OR at_home_quantity<=999999);
INSERT INTO public.dobby_v2_grocery(id,at_home_quantity) VALUES('TEST-INVALID',-1);
''')
        self.assertEqual(self.sql("SELECT at_home_quantity FROM public.dobby_v2_grocery WHERE id='TEST-INVALID';"), '-1')
        with self.assertRaisesRegex(AssertionError, 'availability_range_contract_failed'):
            self.sql((ROOT / '02-verify.sql').read_text())
        with self.assertRaisesRegex(AssertionError, 'Existing availability range constraint differs'):
            self.sql((ROOT / '01-install.sql').read_text())
        self.assertEqual(self.sql("SELECT at_home_quantity FROM public.dobby_v2_grocery WHERE id='TEST-INVALID';"), '-1')

    def test_canonical_constraint_verifies_and_reinstallation_preserves_values(self):
        self.sql('''ALTER TABLE public.dobby_v2_grocery
 ADD CONSTRAINT dobby_v2_grocery_at_home_quantity_range
 CHECK(at_home_quantity>=0 AND at_home_quantity<=999999);
INSERT INTO public.dobby_v2_grocery(id,at_home_quantity) VALUES('TEST-PRESERVED',.001);
''')
        for _ in range(2):
            self.sql((ROOT / '01-install.sql').read_text())
        self.assertEqual(self.sql((ROOT / '02-verify.sql').read_text()),
                         'availability_metadata_verified')
        self.assertEqual(self.sql("SELECT at_home_quantity||':'||revision FROM public.dobby_v2_grocery WHERE id='TEST-PRESERVED';"), '0.001:1')

    def test_unvalidated_constraint_is_not_silently_repaired(self):
        self.sql('''ALTER TABLE public.dobby_v2_grocery
 ADD CONSTRAINT dobby_v2_grocery_at_home_quantity_range
 CHECK(at_home_quantity>=0 AND at_home_quantity<=999999) NOT VALID;
''')
        with self.assertRaisesRegex(AssertionError, 'availability_range_contract_failed'):
            self.sql((ROOT / '02-verify.sql').read_text())
        with self.assertRaisesRegex(AssertionError, 'Existing availability range constraint differs'):
            self.sql((ROOT / '01-install.sql').read_text())
        self.assertEqual(self.sql("SELECT convalidated FROM pg_constraint WHERE conrelid='public.dobby_v2_grocery'::regclass AND conname='dobby_v2_grocery_at_home_quantity_range';"), 'f')

    def test_same_name_unique_constraint_is_rejected(self):
        self.sql('''ALTER TABLE public.dobby_v2_grocery
 ADD CONSTRAINT dobby_v2_grocery_at_home_quantity_range UNIQUE(at_home_quantity);
''')
        with self.assertRaisesRegex(AssertionError, 'availability_range_contract_failed'):
            self.sql((ROOT / '02-verify.sql').read_text())
        with self.assertRaisesRegex(AssertionError, 'Existing availability range constraint differs'):
            self.sql((ROOT / '01-install.sql').read_text())

    def test_missing_constraint_is_installed_by_the_candidate(self):
        with self.assertRaisesRegex(AssertionError, 'availability_range_contract_failed'):
            self.sql((ROOT / '02-verify.sql').read_text())
        self.sql((ROOT / '01-install.sql').read_text())
        self.assertEqual(self.sql((ROOT / '02-verify.sql').read_text()),
                         'availability_metadata_verified')
        with self.assertRaisesRegex(AssertionError, 'check constraint'):
            self.sql("INSERT INTO public.dobby_v2_grocery(id,at_home_quantity) VALUES('TEST-NEGATIVE',-1);")


if __name__ == '__main__':
    unittest.main(verbosity=2)

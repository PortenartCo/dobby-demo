#!/usr/bin/env python3
"""Exact manual shopping candidate on a fictional no-network PostgreSQL fixture."""
import json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'shopping';container='dobby-stitch1920-pg-20261113-review'
info=json.loads(subprocess.check_output(['docker','inspect',container]))[0]
assert info['HostConfig']['NetworkMode']=='none' and not info['HostConfig']['PortBindings']
base=['docker','exec','-i',container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','dobby_local_test']
def sql(text,db='dobby_review_shopping_test',error=None):
 p=subprocess.run(base+['-d',db],input=text,text=True,capture_output=True)
 if error:assert p.returncode and error in p.stderr,p.stderr
 else:assert p.returncode==0,p.stderr
 return p.stdout.strip()
sql('DROP DATABASE IF EXISTS dobby_review_shopping_test;','postgres');sql('CREATE DATABASE dobby_review_shopping_test;','postgres')
sql('''CREATE TABLE public.dobby_v2_grocery(id text PRIMARY KEY,household_id text,quantity numeric,checked boolean DEFAULT false,revision bigint DEFAULT 1,title text);
ALTER TABLE public.dobby_v2_grocery ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.fixture_stamp() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.revision:=OLD.revision+1; RETURN NEW; END $$;
CREATE TRIGGER fixture_revision BEFORE UPDATE ON public.dobby_v2_grocery FOR EACH ROW EXECUTE FUNCTION public.fixture_stamp();
INSERT INTO public.dobby_v2_grocery(id,household_id,quantity,title) VALUES('TEST-ITEM','TEST-HOME',1,'TEST-Preserved');''')
for repeat in range(2):sql((root/'01-install.sql').read_text())
assert sql((root/'02-verify.sql').read_text())=='availability_metadata_verified'
sql("UPDATE public.dobby_v2_grocery SET at_home_quantity=.001 WHERE id='TEST-ITEM' AND revision=1;")
assert sql("SELECT at_home_quantity||':'||checked||':'||revision FROM public.dobby_v2_grocery WHERE id='TEST-ITEM';")=='0.001:false:2'
assert sql("WITH changed AS (UPDATE public.dobby_v2_grocery SET at_home_quantity=.5 WHERE id='TEST-ITEM' AND revision=1 RETURNING *) SELECT count(*) FROM changed;")=='0'
sql("UPDATE public.dobby_v2_grocery SET quantity=.0005 WHERE id='TEST-ITEM';")
assert sql("SELECT at_home_quantity FROM public.dobby_v2_grocery WHERE id='TEST-ITEM';")=='0.001'
for bad in ['-1','1000000',"'NaN'::numeric","'Infinity'::numeric"]:
 sql('UPDATE public.dobby_v2_grocery SET at_home_quantity='+bad+';',error='check constraint')
sql((root/'03-rollback.sql').read_text())
assert sql("SELECT at_home_quantity||':'||title FROM public.dobby_v2_grocery WHERE id='TEST-ITEM';")=='0.001:TEST-Preserved'
# Refusal of an incompatible existing fixed-scale schema, not coercion.
sql('ALTER TABLE public.dobby_v2_grocery ALTER COLUMN at_home_quantity TYPE numeric(12,2);')
sql((root/'01-install.sql').read_text(),error='contract differs')
print('PASS exact shopping SQL: repeat install/verify, .001 precision, no fictitious purchase, stale revision, legacy quantity-only patch, bounds/NaN/Infinity, non-destructive rollback and incompatible-schema refusal. Local fixture only, no live RLS certification.')

"""Fictional PostgreSQL proof for family image staging and native recipe CAS."""
from pathlib import Path
from runpy import run_path
from base64 import b64encode
from hashlib import sha256

here = Path(__file__).parent
base = run_path(str(here.parent/'runes-lot1/test-postgres.py'))
rpc,sql,quote,encode,uid = (base[k] for k in ('rpc','sql','quote','encode','uid'))
root = here.parents[2]
image = (root/'essai-stitch-v7/tests/fixtures/e07-4/source.png').read_bytes()
hash_id = sha256(image).hexdigest()
binary = b64encode(image).decode()

def run(parent,second,child,outsider,hh,read,*_):
    missions = read()
    sql((here/'03-images-recettes.sql').read_text(),installer=True)
    ref = {'key':'recipe-media-'+hash_id,'sha256':hash_id,'type':'image/png'}
    payload = {'customRecipes':[{'id':'TEST','localMedia':ref,'importDetails':
        {'stepDetails':[{'method':'classic','stepIndex':0,'images':[ref]}]}}]}
    get = lambda actor,home=hh,**kwargs:rpc('dobby_recipe_media_read',actor,home,hash_id,**kwargs)
    def stage(actor,mime='image/png',digest=hash_id,**kwargs):
        args=','.join(map(quote,(hh,digest,mime,binary)))
        return sql(f'SELECT public.dobby_recipe_media_stage({args});',actor,**kwargs)=='t'
    missing = lambda actor:sql(f"SELECT to_json(public.dobby_recipe_media_missing({quote(hh)},ARRAY[{quote(hash_id)}]));",actor)
    assert hash_id in missing(parent)
    assert not stage(parent,error='22023',digest='0'*64)
    assert not stage(parent,error='22023',mime='image/jpeg')
    for actor in (child,outsider,uid(5)):
        stage(actor,error='42501')
    get(outsider,error='42501')
    get(uid(5),error='42501')
    get(parent,uid(99),error='42501')
    get(parent,role='anon',error='42501')
    sql('SELECT * FROM dobby_socle_private.recipe_media;',parent,error='42501')
    assert stage(parent) is True and stage(second) is True and missing(parent)=='[]'
    assert sql('BEGIN; GRANT dobby_socle_writer TO postgres WITH INHERIT FALSE,SET TRUE; SET LOCAL ROLE dobby_socle_writer; SELECT count(*) FROM dobby_socle_private.recipe_media; ROLLBACK;',installer=True)=='1'
    assert get(second) is None
    print('PASS empreinte, droits canoniques, isolement, dédoublonnage serveur et image en attente invisible')

    where = f"household_id={quote(hh)} AND module='recipes'"
    sql(f"INSERT INTO public.dobby_v2_modules(household_id,module,payload) VALUES ({quote(hh)},'recipes','{{}}');",parent)
    sql(f"UPDATE public.dobby_v2_modules SET payload={encode(payload)} WHERE {where} AND revision=2;",second)
    assert get(second) is None
    sql(f"UPDATE public.dobby_v2_modules SET payload={encode(payload)} WHERE {where} AND revision=1;",parent)
    downloaded=get(second)
    assert downloaded==get(child) and downloaded['type']=='image/png' and downloaded['base64'].replace('\n','')==binary
    assert sql(f"SELECT revision FROM public.dobby_v2_modules WHERE {where};",second)=='2'
    assert read()==missions
    print('PASS lecture des octets après CAS natif, cache indépendant et Missions intactes')

if __name__=='__main__':
    base['run_fixture'](run)

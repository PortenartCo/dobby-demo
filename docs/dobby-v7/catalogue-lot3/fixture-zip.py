"""Fictional, colored 1×1 PNG fixtures and DOBBY transport metadata."""
import json
import struct
import sys
import zlib
from zipfile import ZipFile, ZIP_DEFLATED

def png(rgb):
    def chunk(kind, data):
        return (struct.pack('>I', len(data)) + kind + data
                + struct.pack('>I', zlib.crc32(kind + data)))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(bytes([0, *rgb]))) + chunk(b'IEND', b''))

def fixture(variant):
    diet = variant == 'diet'
    ingredients = [{'id':'riz','canonicalId':'riz','name':'Riz','quantity':240+(40 if diet else 0),'unit':'g','optional':False},
                   {'id':'courgette','canonicalId':'courgette','name':'Courgette','quantity':2,'unit':'pièce','optional':False}]
    steps = ['Rincer le riz et couper les courgettes.', 'Cuire le riz et servir avec les courgettes.']
    if diet:
        steps[0] = 'Rincer le riz. Détailler les courgettes en lamelles.'
    ref = lambda p: {'path':f'images/{p}.png','provenance':'illustration-IA','description':'Image de test, couleur unie'}
    recipe = {'importKey':f'test-{variant}','name':f'TEST — Catalogue {variant}','servings':4,'device':'classic',
      'category':'Végétarien','ingredients':ingredients,'steps':steps,
      'source':'Fixture synthétique de transport','reviewed':True,
      'durations':{'preparation':5,'cooking':15,'rest':0,'total':20},
      'image':ref('cover'),'stepDetails':[{'method':'classic','stepIndex':0,'images':[ref('first')]},
      {'method':'classic','stepIndex':1,'images':[ref('second')]}],
      'catalogue':{'collection':'diet' if diet else 'classic','course':'main','description':'Fiche de test sans données réelles.',
                   'difficulty':'facile','tags':['test'],'allergens':[]}}
    if variant == 'classic':
        recipe['tm5'] = {'portions':4,'steps':[{'text':'Étape TM5 fictive.','time':'5 min','temp':'100 °C','speed':'1','reverse':False}]}
        recipe['stepDetails'].append({'method':'tm5','stepIndex':0,'images':[ref('tm-five')]})
    return recipe

def write(path, variant):
    recipe = fixture(variant)
    if variant == 'duplicate':
        recipe = fixture('classic')
        recipe.update(importKey='test-duplicate',name='TEST — Doublon sous un nouveau titre')
    with ZipFile(path,'w',compression=ZIP_DEFLATED) as z:
        z.writestr('recipes.json',json.dumps({'format':'dobby-recipes','version':2,'recipes':[recipe]}))
        for name, color in [('cover',(135,52,40)),('first',(25,121,80)),('second',(44,70,158)),('tm-five',(155,125,18))]:
            if name!='tm-five' or recipe.get('tm5'):
                z.writestr(f'images/{name}.png',png(color))

if __name__=='__main__':
    write(sys.argv[1],sys.argv[2])

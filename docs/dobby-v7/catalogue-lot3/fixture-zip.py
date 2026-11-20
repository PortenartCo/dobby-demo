"""Synthetic gradient plates with unique test pixels and indexed instructions."""
import json
import random
import struct
import sys
import zlib
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

def png(seed, texture, width=680, height=500):
    def chunk(kind, data):
        return (struct.pack('>I', len(data)) + kind + data
                + struct.pack('>I', zlib.crc32(kind + data)))
    rand = random.Random(seed)
    scanlines = bytearray()
    for y in range(height):
        scanlines.append(0)
        noise = rand.randbytes(width)
        for x in range(width):
            grain = noise[x] % texture
            scanlines.extend(((x//4 + seed*17 + grain) % 256,
                              (y//3 + seed*31 + grain) % 256,
                              (x//5 + y//6 + seed*13) % 256))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(scanlines, 1)) + chunk(b'IEND', b''))

def fixture(variant):
    diet = variant == 'diet'
    ingredients = [{'id':'riz','canonicalId':'riz','name':'Riz','quantity':240+(40 if diet else 0),'unit':'g','optional':False},
                   {'id':'courgette','canonicalId':'courgette','name':'Courgette','quantity':2,'unit':'pièce','optional':False}]
    count = 12 if diet else 6
    instructions = [f'Procédure de test {variant}, étape {i+1}.' for i in range(count)]
    ref = lambda name: {'path':f'images/{name}.png','provenance':'illustration-IA',
                       'description':f'Image fictive {variant} {name}'}
    recipe = {'importKey':f'test-{variant}','name':f'TEST — Catalogue {variant}','servings':4,'device':'classic',
      'category':'Végétarien','ingredients':ingredients,'steps':instructions,
      'source':'Fixture synthétique de transport','reviewed':False,'mediaProfile':'per-step',
      'durations':{'preparation':5,'cooking':15,'rest':0,'total':20},
      'image':ref('cover'),'stepDetails':[{'method':'classic','stepIndex':i,'images':[ref(f'classic-{i}')]} for i in range(count)],
      'catalogue':{'collection':'diet' if diet else 'classic','course':'main','description':'Fiche de test sans données réelles.',
                   'difficulty':'facile','tags':['test'],'allergens':[]}}
    if variant=='classic':
        recipe['tm5'] = {'portions':4,'steps':[{'text':f'Étape TM5 fictive {i+1}.','time':'5 min','temp':'100 °C','speed':'1','reverse':False}
                                                for i in range(2)]}
        recipe['stepDetails'] += [{'method':'tm5','stepIndex':i,'images':[ref(f'tm5-{i}')]} for i in range(2)]
    return recipe

def write(path, variant):
    recipe = fixture('six' if variant in ('duplicate','missing','shared','renamed-copy') else variant)
    origin = {'classic':1,'diet':80,'six':160}.get(variant,160)
    media = [recipe['image']['path']] + [row['images'][0]['path'] for row in recipe['stepDetails']]
    if variant=='duplicate':
        recipe.update(importKey='test-duplicate',name='TEST — Doublon sous un nouveau titre')
    elif variant=='missing':
        media.pop()
    elif variant=='shared':
        recipe['stepDetails'][0]['images'] = [recipe['image']]
        media.remove('images/classic-0.png')
    elif variant=='renamed-copy':
        recipe['stepDetails'][0]['images'][0]['description']='Fichier distinct, contenu identique'
    with ZipFile(path,'w',compression=ZIP_DEFLATED) as z:
        def append(name, data):
            info = ZipInfo(name)
            info.compress_type = ZIP_DEFLATED
            z.writestr(info, data)
        append('recipes.json',json.dumps({'format':'dobby-recipes','version':2,'recipes':[recipe]}))
        texture = {'classic':33,'diet':15}.get(variant,5)
        for i,name in enumerate(media):
            seed=origin if i==1 and variant=='renamed-copy' else origin+i
            append(name,png(seed,texture))

if __name__=='__main__':
    write(sys.argv[1],sys.argv[2])

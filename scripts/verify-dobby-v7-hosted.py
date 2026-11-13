#!/usr/bin/env python3
"""Read-only GitHub Pages byte verification. Never runs application JavaScript."""
import argparse,concurrent.futures,hashlib,json,subprocess,urllib.request,urllib.parse
from html.parser import HTMLParser
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--sha',required=True);parser.add_argument('--output',required=True);args=parser.parse_args()
sha=subprocess.check_output(['git','rev-parse',args.sha+'^{commit}'],text=True).strip()
files=subprocess.check_output(['git','ls-tree','-r','--name-only',sha],text=True).splitlines()
selected=['index.html','index-v2.9.2.html']+[f for f in files if f.startswith(('essai-stitch-v7/','essai-stitch-v5-famille/')) and '/tests/' not in f and '/node_modules/' not in f and f.endswith(('.js','.mjs','.css','.html')) and '/templates/' not in f]
selected+=['essai-stitch-v7/assets/magic/portraits-09-24.png','essai-stitch-v7/assets/cuisine/e07-taverne.png','essai-stitch-v7/assets/cuisine/e07-courses.png']
selected=sorted(set(selected))
base='https://portenartco.github.io/dobby-demo/'
preferred={}
class Resources(HTMLParser):
 def __init__(self,page):super().__init__();self.page=page
 def handle_starttag(self,tag,attrs):
  for name,value in attrs:
   if name in ('src','href') and value:
    url=urllib.parse.urljoin(base+self.page,value)
    if url.startswith(base):
     file=urllib.parse.urlsplit(url).path.removeprefix('/dobby-demo/')
     if file in selected:preferred.setdefault(file,url)
for page in ['index.html','essai-stitch-v7/famille.html','essai-stitch-v7/index.html','essai-stitch-v5-famille/index.html']:
 Resources(page).feed(subprocess.check_output(['git','show',sha+':'+page],text=True))
def check(file):
 expected=subprocess.check_output(['git','show',sha+':'+file]);url=preferred.get(file,base+file)
 with urllib.request.urlopen(url,timeout=30) as response:data=response.read();status=response.status
 return {'file':file,'url':url,'http':status,'sha256':hashlib.sha256(data).hexdigest(),'matchesCommit':data==expected,'bytes':len(data)}
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
 for future in concurrent.futures.as_completed([executor.submit(check,file) for file in selected]):results.append(future.result())
result={'sourceSha':sha,'canonicalUrl':'https://portenartco.github.io/dobby-demo/','supabaseContacted':False,'javascriptExecuted':False,'passed':all(r['http']==200 and r['matchesCommit'] for r in results),'results':sorted(results,key=lambda r:r['file'])}
Path(args.output).write_text(json.dumps(result,indent=2)+'\n')
assert result['passed'],'Hosted bytes differ or resources unavailable; do not claim publication verified'
print('HOSTED_BYTES_PASS',sha,len(results),'HTTP200 resources identical to immutable commit')

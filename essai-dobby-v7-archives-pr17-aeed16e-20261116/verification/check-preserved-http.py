from pathlib import Path
import concurrent.futures,datetime,hashlib,json,subprocess,sys,urllib.request
repo=Path('/workspace/dobby-demo');evidence=Path('/workspace/scratch/pr17-preview-20261116');site='https://portenartco.github.io/dobby-demo/'
mode=sys.argv[1];parent='a4190bb3b1b2fd95995e33dbce09ffb31c77614c'
git=lambda *args:subprocess.check_output(['git','-C',str(repo),*args])
sha=lambda b:hashlib.sha256(b).hexdigest()
if mode=='before':
 files=set(git('ls-tree','-r','--name-only',parent).decode().splitlines());paths={'index.html','index-v2.9.2.html','.nojekyll'}
 for file in files:
  if file.startswith('essai-stitch-v7/') and '/' not in file[len('essai-stitch-v7/'):] and file.endswith(('.html','.js','.css','.json','.mjs')):paths.add(file)
  if file.startswith('essai-stitch-v5-famille/') and file.endswith(('index.html','family-v2.js','family-access.mjs','family-modules.js','family-house.js','stitch-v5.js')):paths.add(file)
  parts=file.split('/')
  if len(parts)==2 and parts[0].startswith(('essai-dobby','essai-v6-preview','essai-v7-preview','essai-e01','essai-e02')) and parts[1] in ('index.html','review-manifest.json'):paths.add(file)
 expected={file:sha(git('show',parent+':'+file)) for file in sorted(paths)}
else:
 previous=json.loads((evidence/'published-before.json').read_text());expected={row['path']:row['sha256'] for row in previous['files']}
def check(item):
 file,digest=item;request=urllib.request.Request(site+file,headers={'Cache-Control':'no-cache','User-Agent':'DOBBY-PR17-Preservation-Receipt'})
 with urllib.request.urlopen(request,timeout=30) as response:body=response.read();status=response.status
 result={'path':file,'status':status,'sha256':sha(body),'bytes':len(body)}
 if status!=200 or result['sha256']!=digest:raise RuntimeError('Published byte mismatch '+file)
 return result
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:rows=list(pool.map(check,expected.items()))
result={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'site':site,'parentMain':parent,'mode':mode,'passed':True,'comparedFiles':len(rows),'allComparedBytesUnchanged':True,'files':rows}
(evidence/('published-'+mode+'.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('PUBLISHED_PRESERVATION_PASS',mode,len(rows),'files')

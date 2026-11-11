#!/usr/bin/env python3
"""Read-only publication proof: immutable Git trees, source blobs and HTTP bytes."""
import argparse, concurrent.futures, hashlib, json, pathlib, subprocess, time, urllib.parse, urllib.request
p=argparse.ArgumentParser();p.add_argument('--repo',required=True);p.add_argument('--bundle',required=True);p.add_argument('--base',required=True);p.add_argument('--source',required=True);p.add_argument('--publication',required=True);p.add_argument('--output',required=True);a=p.parse_args()
repo=pathlib.Path(a.repo);bundle=pathlib.Path(a.bundle);base=a.base.rstrip('/')+'/'
def git(*args):return subprocess.check_output(['git',*args],cwd=repo)
def digest(b):return hashlib.sha256(b).hexdigest()
def tree(ref):
 result={}
 for line in git('ls-tree',ref).decode().splitlines():
  meta,name=line.split('\t',1);result[name]=meta
 return result
m=json.loads((bundle/'review-manifest.json').read_bytes());assert m['sourceSha']==a.source and m['sourceState']=='committed' and m['realBackend'] is False
parents=git('rev-list','--parents','-n','1',a.publication).decode().split();assert len(parents)==2
parent=parents[1];before=tree(parent);after=tree(a.publication);assert all(after.get(k)==v for k,v in before.items())
root='essai-dobby-e07-consolidation-review-20261111';assert set(after)-set(before)=={root}
changes=git('diff','--name-status',parent,a.publication).decode().splitlines();assert len(changes)==283 and all(row.startswith('A\t'+root+'/') for row in changes)
for f in m['files']:assert digest(git('show',a.source+':'+f['path']))==f['sourceSha256'],f['path']
assert digest(git('show',a.source+':scripts/review/e074-config.js'))==m['configSha256']
assert digest(git('show',a.source+':scripts/review/review-runtime.js'))==m['runtimeSha256']
def fetch(url):
 for attempt in range(3):
  try:
   req=urllib.request.Request(url,headers={'Accept-Encoding':'identity','Cache-Control':'no-cache','User-Agent':'DOBBY-E074-publication-verification'})
   with urllib.request.urlopen(req,timeout=30) as r:return r.status,r.read()
  except Exception:
   if attempt==2:raise
   time.sleep(.5*(attempt+1))
status,remote=fetch(base+'review-manifest.json');assert status==200 and remote==(bundle/'review-manifest.json').read_bytes(),'HTTP manifest differs'
paths=[f['path'] for f in m['files']]+['review-runtime.js','review-config.js','review-manifest.json','index.html','.nojekyll']
def check(file):
 expected=(bundle/file).read_bytes();status,body=fetch(base+urllib.parse.quote(file,safe='/'));assert status==200 and body==expected,file
 return {'path':file,'status':status,'bytes':len(body),'sha256':digest(body)}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:files=list(pool.map(check,paths))
old=[];repository_base=base.rsplit(root+'/',1)[0]
for name,meta in before.items():
 if name.startswith('.') or ' tree ' not in ' '+meta+' ':continue
 file=name+'/index.html'
 exists=subprocess.run(['git','cat-file','-e',parent+':'+file],cwd=repo,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
 if not exists:continue
 expected=git('show',parent+':'+file);status,body=fetch(repository_base+urllib.parse.quote(file,safe='/'));assert status==200 and body==expected,'Old preview HTTP changed: '+file
 old.append({'path':file,'status':status,'sha256':digest(body)})
result={'status':'PASS','sourceSha':a.source,'publicationSha':a.publication,'publicationParent':parent,'publicationTree':git('rev-parse',a.publication+'^{tree}').decode().strip(),'sourceState':m['sourceState'],'base':base,'manifestSha256':digest(remote),'newHTTPFilesVerified':len(files),'sourceGitBlobsVerified':len(m['files']),'unchangedOldGitEntries':len(before),'oldHTTPIndexesVerified':len(old),'applicationBranchMerged':False,'sourceCI':'69ef361ad139356c2d1473d825f9231e7610b0e4','newFiles':files,'oldIndexes':old}
pathlib.Path(a.output).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print('E074_HTTP_GIT_PUBLICATION_PASS',json.dumps({k:v for k,v in result.items() if k not in ['newFiles','oldIndexes']}))

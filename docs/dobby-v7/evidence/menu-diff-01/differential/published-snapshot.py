import argparse,subprocess,json,hashlib,urllib.request,urllib.parse,concurrent.futures
from pathlib import Path
from datetime import datetime,timezone
p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--ref',default='origin/main');a=p.parse_args()
repo='/workspace/dobby-v7-menu-simplification';base='https://portenartco.github.io/dobby-demo/'
files=subprocess.check_output(['git','ls-tree','-r','--name-only',a.ref],cwd=repo,text=True).splitlines()
selected=[f for f in files if f.endswith('/review-manifest.json')]
selected += ['index.html','essai-dobby-v7-famille-review-20261112/essai-stitch-v7/famille.html','essai-dobby-v7-global-review-20261112/essai-stitch-v7/chat-engine.js']
def check(f):
 expected=hashlib.sha256(subprocess.check_output(['git','show',a.ref+':'+f],cwd=repo)).hexdigest()
 req=urllib.request.Request(base+urllib.parse.quote(f),headers={'Cache-Control':'no-cache'})
 with urllib.request.urlopen(req,timeout=45) as response:
  content=response.read();actual=hashlib.sha256(content).hexdigest();assert response.status==200 and expected==actual,(f,expected,actual)
  return {'path':f,'sha256':actual,'bytes':len(content),'status':response.status}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:rows=list(pool.map(check,selected))
sha=subprocess.check_output(['git','rev-parse',a.ref],cwd=repo,text=True).strip()
Path(a.output).parent.mkdir(parents=True,exist_ok=True)
Path(a.output).write_text(json.dumps({'mainSha':sha,'checkedAt':datetime.now(timezone.utc).isoformat(),'resources':rows,'status':'PASS'},indent=2)+'\n')
print('EXISTING_PREVIEWS_HTTP_PASS',len(rows),sha)

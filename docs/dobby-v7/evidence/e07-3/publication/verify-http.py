from pathlib import Path
import sys,json,hashlib,urllib.request,concurrent.futures,datetime
folder=Path(sys.argv[1]);base=sys.argv[2].rstrip('/')+'/';out=Path(sys.argv[3]);expected=json.loads((folder/'review-manifest.json').read_text());served=urllib.request.urlopen(base+'review-manifest.json',timeout=30).read();assert served==(folder/'review-manifest.json').read_bytes(),'Served manifest differs';assert json.loads(served)['sourceSha']==expected['sourceSha']
files=sorted(p for p in folder.rglob('*') if p.is_file())
def check(p):
 rel=p.relative_to(folder).as_posix();response=urllib.request.urlopen(base+rel,timeout=30);raw=response.read();digest=hashlib.sha256(raw).hexdigest();wanted=hashlib.sha256(p.read_bytes()).hexdigest();assert digest==wanted,rel
 return {'path':rel,'status':response.status,'bytes':len(raw),'sha256':digest}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:rows=list(pool.map(check,files))
report={'checkedAtUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'PASS','base':base,'sourceSha':expected['sourceSha'],'manifestSha256':hashlib.sha256(served).hexdigest(),'fileCount':len(rows),'applicativeRecords':len(expected['files']),'allBytesMatch':True,'files':rows};out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('E073_HOSTED_ALL_BYTES_PASS',len(rows),'files',report['sourceSha'])

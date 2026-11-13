#!/usr/bin/env python3
"""Read-only release gate. Does not push, merge, deploy or contact Supabase."""
import argparse,json,subprocess
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--expected-main',required=True);parser.add_argument('--output',required=True);parser.add_argument('--refs',default='docs/dobby-v7/revue-generale/evidence/previous-mission-refs.json');args=parser.parse_args()
def run(*args):return subprocess.check_output(args,text=True).strip()
def gh(path):return json.loads(run('gh','api','repos/PortenartCo/dobby-demo/'+path))
initial=json.loads(Path(args.refs).read_text())
remote={ref.removeprefix('refs/heads/'):sha for sha,ref in (line.split() for line in run('git','ls-remote','--heads','origin').splitlines())}
assert remote.get('main')==args.expected_main,'Main advanced; reconcile and test before integration'
current={n:s for n,s in remote.items() if n=='feat/dobby-v7-stitch19-20-integration-20261112' or n.startswith('fix/dobby-v7-')}
assert current==initial,'Previous mission/fix refs changed or new fix branch appeared; reconcile before integration'
runs=gh('actions/runs?head_sha='+args.expected_main+'&per_page=100')['workflow_runs']
latest={}
for r in runs:
 if r['name'] in ['Dobby V7 - Stitch functional UI','pages build and deployment'] and r['head_branch']=='main':
  key=(r['name'],r['event']);latest.setdefault(key,r)
assert any(k[0]=='Dobby V7 - Stitch functional UI' for k in latest),'No main functional CI found'
for r in latest.values():assert r['status']=='completed' and r['conclusion']=='success',(r['name'],r['status'],r['conclusion'])
page=gh('pages/builds/latest');assert page['status']=='built' and page['commit']==args.expected_main,('Previous Pages deployment not settled on current main',page.get('status'),page.get('commit'))
result={'passed':True,'main':args.expected_main,'previousMissionRefs':current,'ci':[{'id':r['id'],'name':r['name'],'status':r['status'],'conclusion':r['conclusion'],'url':r['html_url']} for r in latest.values()],'pages':{'status':page['status'],'commit':page['commit'],'updated_at':page['updated_at']}}
Path(args.output).write_text(json.dumps(result,indent=2)+'\n');print('INTEGRATION_GATE_PASS',args.expected_main)

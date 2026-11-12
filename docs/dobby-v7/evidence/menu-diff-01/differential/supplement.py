import collections, hashlib, json, pathlib, subprocess
BASE=pathlib.Path('/tmp/dobby-menu-diff-01')
manifest=json.loads((BASE/'manifest.json').read_text())
comparison=json.loads((BASE/'comparison.json').read_text())
network={};eventcounts={}
for side in ['famille','menu']:
 events=[json.loads(line) for line in (BASE/side/'register-review/calls.jsonl').read_text().splitlines()]
 mapping={};page=None
 for event in events:
  if event['event']=='page_created':page=event['page']
  if event['event'] in ['console_log','console_error'] and event.get('args') and event['args'][0] in ['REGISTER_REVIEW_PASS','REGISTER_REVIEW_FAIL']:mapping[page]={'case':event['args'][1],'width':event['args'][2]}
 counts=collections.Counter((event['page'],event['url'],event['failure']['errorText']) for event in events if event['event']=='request_failed')
 network[side]=[{'page':page,**mapping[page],'url':url,'failure':error,'count':count} for (page,url,error),count in counts.items()]
 eventcounts[side]=dict(collections.Counter(event['event'] for event in events))
root=manifest['worktrees']['menu']['root']
legacy='essai-stitch-v5-famille/index.html'
blobs={side:subprocess.check_output(['git','-C',root,'rev-parse',tree['sha']+':'+legacy],text=True).strip() for side,tree in manifest['worktrees'].items()}
assert len(set(blobs.values()))==1
network_summary={'eventCountsRegisterReview':eventcounts,'requestsByCase':network,'variableAsset':{'source':legacy,'line':1901,'sameBlob':True,'gitBlobs':blobs,'description':'Existing native engine Dobby hero image, AB6AXuAyNV2AVHtb…; no newly introduced URL. Counts vary in both directions across cases, including stale editor cases before any Menu navigation. All observed failed requests have net::ERR_FAILED and are external assets aborted by the tests same-origin route. The exact scheduling/retry cause was not traced.'},'limitation':'The runs are not byte-identical raw executions: elapsed times, pre-call diagnostic scheduler frames, and external asset abort counts/order can differ. These differences are preserved, not normalized away.'}
(BASE/'network-comparison.json').write_text(json.dumps(network_summary,indent=2,ensure_ascii=False)+'\n')
checks=[]
for side,tree in manifest['worktrees'].items():
 assert subprocess.check_output(['git','-C',tree['root'],'rev-parse','HEAD'],text=True).strip()==tree['sha']
 status=subprocess.check_output(['git','-C',tree['root'],'status','--porcelain','--untracked-files=no'],text=True)
 assert status==''
 for name,info in tree['tests'].items():
  assert hashlib.sha256((pathlib.Path(tree['root'])/'essai-stitch-v7/tests'/name).read_bytes()).hexdigest()==info['sha256']
 checks.append({'side':side,'sha':tree['sha'],'trackedStatus':'','testHashesUnchanged':True})
for script,value in comparison['scripts'].items():
 assert value['exitCodes']=={'famille':1,'menu':1}
 assert value['sameNumberFailures'] and value['sameCasePattern'] and value['sameContexts']
 assert all(item['sameFullMessageRootNormalized'] and item['sameFullStackRootNormalized'] and item['sameStableCauseAndFrames'] for item in value['failureComparisons'])
assert comparison['scripts']['register-review']['cases']=={'famille':{'pass':24,'fail':4},'menu':{'pass':24,'fail':4}}
assert json.loads((BASE/'dom-comparison.json').read_text())['sameDOM']
metadata={'playwrightVersion':json.loads(pathlib.Path('/workspace/dobby-v7-menu-simplification/essai-stitch-v7/tests/node_modules/playwright/package.json').read_text())['version'],'frozenWorktreeChecks':checks,'fixtureIdentityReference':'../fixture-identity.json','readOnlyDOMComparison':'dom-comparison.json','networkComparison':'network-comparison.json','verification':'PASS: six exact-SHA executions, matching full root-normalized failure messages and error stacks, identical register case pattern, unchanged frozen test hashes/HEAD/tracked status.'}
(BASE/'verification.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(json.dumps(metadata,indent=2))

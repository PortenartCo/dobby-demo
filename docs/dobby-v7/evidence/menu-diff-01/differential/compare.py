import difflib, json, pathlib, re
BASE=pathlib.Path('/tmp/dobby-menu-diff-01')
manifest=json.loads((BASE/'manifest.json').read_text())
ROOTS=[value['root'] for value in manifest['worktrees'].values()]
def normalize(text):
 for root in ROOTS:text=text.replace(root,'<WORKTREE>')
 return text
def extract(side,script):
 folder=BASE/side/script
 events=[json.loads(line) for line in (folder/'calls.jsonl').read_text().splitlines()]
 cases=[]
 for event in events:
  if event['event'] not in ('console_log','console_error'):continue
  args=event.get('args',[])
  if args and args[0] in ('REGISTER_REVIEW_PASS','REGISTER_REVIEW_FAIL'):
   cases.append({'name':args[1],'width':args[2],'status':'PASS' if args[0].endswith('_PASS') else 'FAIL','message':args[3] if len(args)>3 else None,'eventSequence':event['sequence']})
 failures=[]
 for event in events:
  if event['event'] not in ('api_error','assertion_error'):continue
  later=next((case for case in cases if case['eventSequence']>event['sequence']),None)
  message=normalize(event.get('message',''))
  stack=normalize(event.get('stack',''))
  failures.append({'case':later['name'] if later else script,'width':event.get('viewport',{}).get('width',later['width'] if later else None),'event':event['event'],'method':event.get('method'),'selector':event.get('selector'),'name':event.get('name'),'messageNormalizedRootOnly':message,'stackNormalizedRootOnly':stack,'callsiteNormalizedRootOnly':normalize(event.get('callsite','')),'errorHeader':message.split('\nCall log:\n')[0],'stackFrames':[line for line in stack.splitlines() if re.match(r'^\s+at ',line)],'dom':event.get('dom'),'elapsedMs':event.get('elapsedMs'),'eventSequence':event['sequence']})
 output={'exitCode':json.loads((folder/'result.json').read_text())['exitCode'],'cases':cases,'passCount':sum(case['status']=='PASS' for case in cases),'failCount':sum(case['status']=='FAIL' for case in cases),'failures':failures,'browserVersions':[event['version'] for event in events if event['event']=='browser_version'],'contexts':[event['options'] for event in events if event['event']=='context_created'],'pageErrors':[event for event in events if event['event']=='page_error'],'failedRequests':[event for event in events if event['event']=='request_failed']}
 (folder/'analysis.json').write_text(json.dumps(output,indent=2,ensure_ascii=False)+'\n')
 for filename in ['stdout.log','stderr.log']:
  (folder/filename.replace('.log','.normalized-root-only.log')).write_text(normalize((folder/filename).read_text()))
 return output
summary={'normalization':'Only the two absolute frozen worktree roots are replaced with <WORKTREE>. No timing, retry counts, content, ANSI escapes, fixture IDs, paths outside those roots, or stack frames are masked. Stable cause fields are secondary comparisons and full raw/normalized messages and stacks remain available.','scripts':{}}
for script in ['family','e05-edge','register-review']:
 left=extract('famille',script);right=extract('menu',script)
 comparisons=[]
 for a,b in zip(left['failures'],right['failures']):
  stable=['case','width','event','method','selector','name','errorHeader','stackFrames','dom']
  comparisons.append({'case':a['case'],'width':a['width'],'sameStableCauseAndFrames':all(a.get(key)==b.get(key) for key in stable),'stableFieldDifferences':{key:{'famille':a.get(key),'menu':b.get(key)} for key in stable if a.get(key)!=b.get(key)},'sameFullMessageRootNormalized':a['messageNormalizedRootOnly']==b['messageNormalizedRootOnly'],'sameFullStackRootNormalized':a['stackNormalizedRootOnly']==b['stackNormalizedRootOnly'],'sameCallsiteRootNormalized':a['callsiteNormalizedRootOnly']==b['callsiteNormalizedRootOnly'],'elapsedMs':{'famille':a['elapsedMs'],'menu':b['elapsedMs']},'messageDiffRootNormalized':list(difflib.unified_diff(a['messageNormalizedRootOnly'].splitlines(),b['messageNormalizedRootOnly'].splitlines(),fromfile='famille',tofile='menu',lineterm='')),'stackDiffRootNormalized':list(difflib.unified_diff(a['stackNormalizedRootOnly'].splitlines(),b['stackNormalizedRootOnly'].splitlines(),fromfile='famille',tofile='menu',lineterm='')),'callsiteDiffRootNormalized':list(difflib.unified_diff(a['callsiteNormalizedRootOnly'].splitlines(),b['callsiteNormalizedRootOnly'].splitlines(),fromfile='famille',tofile='menu',lineterm=''))})
 rawcomparisons={}
 for filename in ['stdout.log','stderr.log']:
  a=(BASE/'famille'/script/filename).read_text();b=(BASE/'menu'/script/filename).read_text()
  delta='\n'.join(difflib.unified_diff(normalize(a).splitlines(),normalize(b).splitlines(),fromfile='famille/'+filename,tofile='menu/'+filename,lineterm=''))+'\n'
  (BASE/(script+'.'+filename+'.normalized-root-only.diff')).write_text(delta)
  rawcomparisons[filename]={'sameRaw':a==b,'sameRootNormalized':normalize(a)==normalize(b),'rootNormalizedDiffFile':script+'.'+filename+'.normalized-root-only.diff'}
 summary['scripts'][script]={'exitCodes':{'famille':left['exitCode'],'menu':right['exitCode']},'cases':{'famille':{'pass':left['passCount'],'fail':left['failCount']},'menu':{'pass':right['passCount'],'fail':right['failCount']}},'sameCasePattern':[(c['name'],c['width'],c['status']) for c in left['cases']]==[(c['name'],c['width'],c['status']) for c in right['cases']],'failureCounts':{'famille':len(left['failures']),'menu':len(right['failures'])},'sameNumberFailures':len(left['failures'])==len(right['failures']),'failureComparisons':comparisons,'streamComparisons':rawcomparisons,'browserVersions':{'famille':left['browserVersions'],'menu':right['browserVersions']},'sameContexts':left['contexts']==right['contexts'],'pageErrorCounts':{'famille':len(left['pageErrors']),'menu':len(right['pageErrors'])},'failedRequestCounts':{'famille':len(left['failedRequests']),'menu':len(right['failedRequests'])}}
(BASE/'comparison.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({script:{'exitCodes':value['exitCodes'],'cases':value['cases'],'sameCasePattern':value['sameCasePattern'],'sameNumberFailures':value['sameNumberFailures'],'failureComparisons':[{key:comp[key] for key in ['case','width','sameStableCauseAndFrames','sameFullMessageRootNormalized','sameFullStackRootNormalized','elapsedMs']} for comp in value['failureComparisons']],'streamComparisons':value['streamComparisons']} for script,value in summary['scripts'].items()},indent=2))

import json, os, pathlib, subprocess, time, urllib.request
BASE=pathlib.Path('/tmp/dobby-menu-diff-01')
manifest=json.loads((BASE/'manifest.json').read_text())
env={key:value for key,value in os.environ.items() if not key.startswith(('DOBBY_','DIFF_','NODE_OPTIONS','NODE_PATH','CHROMIUM_PATH','TZ','LANG','LC_ALL'))}
env.update(manifest['commonEnvironment'])
observations={}
for side,tree in manifest['worktrees'].items():
 with (BASE/side/'dom-server.stdout.log').open('wb') as stdout,(BASE/side/'dom-server.stderr.log').open('wb') as stderr:
  server=subprocess.Popen(['python3',str(BASE/'serve.py'),tree['root']],stdout=stdout,stderr=stderr,env=env)
  try:
   for _ in range(100):
    if server.poll() is not None:raise RuntimeError('DOM server exited')
    try:
     with urllib.request.urlopen(env['DOBBY_TEST_ORIGIN']+'/essai-stitch-v7/famille.html',timeout=1) as response:response.read()
     break
    except OSError:time.sleep(.1)
   else:raise RuntimeError('DOM server not ready')
   result=subprocess.run(['node',str(BASE/'observe-dom.cjs')],cwd=tree['root'],env=env|{'DIFF_WORKTREE_ROOT':tree['root']},capture_output=True,text=True,timeout=90)
   (BASE/side/'dom-observation.stdout.json').write_text(result.stdout)
   (BASE/side/'dom-observation.stderr.log').write_text(result.stderr)
   assert result.returncode==0,result.stderr
   observations[side]=json.loads(result.stdout)
  finally:
   server.terminate();server.wait(timeout=10)
  status=subprocess.check_output(['git','-C',tree['root'],'status','--porcelain','--untracked-files=no'],text=True)
  assert status==''
summary={'sameDOM':observations['famille']==observations['menu'],'observations':observations,'note':'Separate read-only DOM observation using the identical synthetic seeds from the failing tests. The underlying tests were not edited, bypassed or permission-enabled. Member input is effectively disabled by its enclosing fieldset even if its own disabled property is false.','trackedStatusAfterDOM':{'famille':'','menu':''}}
(BASE/'dom-comparison.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(summary,indent=2,ensure_ascii=False))

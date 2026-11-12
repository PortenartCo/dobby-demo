import hashlib, json, os, pathlib, subprocess, sys, time, urllib.request

BASE=pathlib.Path('/tmp/dobby-menu-diff-01')
WORKTREES={
 'famille':('/workspace/dobby-v7-menu-diff-famille','5b764ef367553e9945fb72a6b563b55adc41e040'),
 'menu':('/workspace/dobby-v7-menu-diff-menu','3f7fe0e36e1e142cefaada5d575196c436b444e4'),
}
SCRIPTS=['family.cjs','e05-edge.cjs','register-review.cjs']
COMMON={'NODE_PATH':'/workspace/dobby-v7-menu-simplification/essai-stitch-v7/tests/node_modules','CHROMIUM_PATH':'/usr/bin/chromium','DOBBY_TEST_ORIGIN':'http://127.0.0.1:8771','TZ':'Europe/Paris','LANG':'C.UTF-8','LC_ALL':'C.UTF-8'}
ENV={key:value for key,value in os.environ.items() if not key.startswith(('DOBBY_','DIFF_','NODE_OPTIONS','NODE_PATH','CHROMIUM_PATH','TZ','LANG','LC_ALL'))}
ENV.update(COMMON)
def git(root,*args):
 return subprocess.check_output(['git','-C',root,*args],text=True)
def digest(path):
 return hashlib.sha256(path.read_bytes()).hexdigest()
manifest={'commonEnvironment':COMMON,'commands':[],'worktrees':{},'nodeVersion':subprocess.check_output(['node','--version'],text=True).strip(),'chromiumVersion':subprocess.check_output(['/usr/bin/chromium','--version'],text=True).strip(),'preloadSha256':digest(BASE/'preload.cjs'),'serverSha256':digest(BASE/'serve.py'),'startedUTC':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
for side,(root,sha) in WORKTREES.items():
 assert git(root,'rev-parse','HEAD').strip()==sha
 status=git(root,'status','--porcelain','--untracked-files=no')
 assert status=='',status
 manifest['worktrees'][side]={'root':root,'sha':sha,'trackedStatusBefore':status,'tests':{name:{'sha256':digest(pathlib.Path(root)/'essai-stitch-v7/tests'/name),'gitBlob':git(root,'rev-parse','HEAD:essai-stitch-v7/tests/'+name).strip()} for name in SCRIPTS}}
(BASE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
for side,(root,sha) in WORKTREES.items():
 sideout=BASE/side
 sideout.mkdir(exist_ok=True)
 with (sideout/'server.stdout.log').open('wb') as sout,(sideout/'server.stderr.log').open('wb') as serr:
  server=subprocess.Popen(['python3',str(BASE/'serve.py'),root],stdout=sout,stderr=serr,env=ENV)
  try:
   for _ in range(100):
    if server.poll() is not None: raise RuntimeError('Server exited')
    try:
     with urllib.request.urlopen(COMMON['DOBBY_TEST_ORIGIN']+'/essai-stitch-v7/famille.html',timeout=1) as response:
      served=response.read()
     assert hashlib.sha256(served).hexdigest()==digest(pathlib.Path(root)/'essai-stitch-v7/famille.html')
     break
    except OSError: time.sleep(.1)
   else: raise RuntimeError('Server not ready')
   for name in SCRIPTS:
    out=sideout/name.removesuffix('.cjs');out.mkdir(exist_ok=True)
    env=ENV|{'DIFF_OUTPUT_DIR':str(out),'DIFF_WORKTREE_ROOT':root}
    command=['node','--require',str(BASE/'preload.cjs'),'essai-stitch-v7/tests/'+name]
    print(side,name,'START',flush=True)
    started=time.monotonic()
    with (out/'stdout.log').open('wb') as stdout,(out/'stderr.log').open('wb') as stderr:
     result=subprocess.run(command,cwd=root,env=env,stdout=stdout,stderr=stderr,timeout=240)
    run={'side':side,'script':name,'cwd':root,'command':command,'exitCode':result.returncode,'elapsedSeconds':time.monotonic()-started,'stdoutSha256':digest(out/'stdout.log'),'stderrSha256':digest(out/'stderr.log')}
    manifest['commands'].append(run)
    (out/'result.json').write_text(json.dumps(run,indent=2)+'\n')
    (BASE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(side,name,'EXIT',result.returncode,round(run['elapsedSeconds'],2),flush=True)
  finally:
   server.terminate()
   try:server.wait(timeout=10)
   except subprocess.TimeoutExpired:server.kill();server.wait()
 manifest['worktrees'][side]['trackedStatusAfter']=git(root,'status','--porcelain','--untracked-files=no')
 assert manifest['worktrees'][side]['trackedStatusAfter']==''
manifest['finishedUTC']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
(BASE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('ALL SIX EXECUTIONS FINISHED',flush=True)

const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path'),cp=require('node:child_process');
const root=process.env.DOBBY_REPO_ROOT||path.resolve(__dirname,'../../../..'),dirname=path.join(root,'essai-stitch-v7/tests'),scope=JSON.parse(fs.readFileSync(path.join(root,'essai-stitch-v7/ci-scope.json'))),head=cp.execFileSync('git',['ls-tree','-r','HEAD'],{cwd:root,encoding:'utf8'});
const header=fs.readFileSync(path.join(dirname,'ci.cjs'),'utf8').split('// E06-01 mission:')[0];
function scenario({tree=head,force=false,fail=false}={}){const calls=[],logs=[],processMock={env:force?{DOBBY_FINAL:'1'}:{},execPath:process.execPath,exit:code=>{throw Error('EXIT '+code);}};
 const req=name=>name==='../ci-scope.json'?scope:name==='node:child_process'?{spawnSync:(exe,args)=>{if(exe==='git')return {status:0,stdout:tree};calls.push(path.basename(args[0]));return{status:fail?7:0};}}:require(name);
 const ctx={require:req,__dirname:dirname,console:{log:(...a)=>logs.push(a)},process:processMock};vm.runInNewContext(header+"\nglobalThis.check={run,pending:()=>resumePending};",ctx);return {...ctx.check,calls,logs};}
const ok=scenario();assert.equal(ok.pending(),true);ok.run('e06-art.cjs');assert.deepEqual(ok.calls,[]);ok.run(scope.continuation.from);ok.run('register-visual.cjs');assert.deepEqual(ok.calls,[scope.continuation.from,'register-visual.cjs']);assert.equal(ok.pending(),false);
const changed=scenario({tree:head+'100644 blob deadbeef\tessai-stitch-v7/chrome.js\n'});assert.equal(changed.pending(),false);changed.run('e06-art.cjs');assert.deepEqual(changed.calls,['e06-art.cjs']);
const forced=scenario({force:true});assert.equal(forced.pending(),false);forced.run('e06-art.cjs');assert.deepEqual(forced.calls,['e06-art.cjs']);
const failed=scenario({fail:true});assert.throws(()=>failed.run(scope.continuation.from),/EXIT 7/);
const unresolved=scenario();assert.equal(unresolved.pending(),true);assert.throws(()=>vm.runInNewContext(fs.readFileSync(path.join(dirname,'ci.cjs'),'utf8').trim().split('\n').at(-1),{resumePending:unresolved.pending()}),/checkpoint not found/);
const passedChanged=scenario({tree:head+'100644 blob deadbeef\tessai-stitch-v7/tests/e06-art.cjs\n'});assert.equal(passedChanged.pending(),false);passedChanged.run('e06-art.cjs');assert.deepEqual(passedChanged.calls,['e06-art.cjs']);
const failedChanged=scenario({tree:head+'100644 blob deadbeef\tessai-stitch-v7/tests/register-tools.cjs\n'});assert.equal(failedChanged.pending(),true);
const docsChanged=scenario({tree:head+'100644 blob deadbeef\tdocs/dobby-v7/review-note.md\n'});assert.equal(docsChanged.pending(),true);
console.log('CI_CONTINUATION_GUARD_PASS matching fingerprint skips only earlier passed files; changed tree/forced full run all; child failure propagates; missing checkpoint fails');

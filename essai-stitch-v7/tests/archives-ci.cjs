const {spawnSync}=require('node:child_process'),path=require('node:path');
const repo=path.resolve(__dirname,'../..');
function run(args){const r=spawnSync(process.execPath,args,{cwd:repo,stdio:'inherit',env:process.env});if(r.status!==0)process.exit(r.status||1);}
run(['--test','essai-stitch-v5-famille/tests/archives-writer.test.cjs','essai-stitch-v5-famille/tests/archives-sync.test.mjs']);
for(const name of ['archives-ui','archives-sources','archives-review','register-documents-sync'])run([path.join(__dirname,name+'.cjs')]);
console.log('ARCHIVES_ACCEPTANCE_PASS — local and HTTP fixtures; real family A/B deferred');

/* Current native contracts acceptance; fixture sync never certifies live backend. */
const {spawnSync}=require('node:child_process'),path=require('node:path');
const repo=path.resolve(__dirname,'../..');
const unit=['essai-stitch-v7/tests/contracts-model.test.mjs','essai-stitch-v7/tests/contracts-import.test.mjs','essai-stitch-v5-famille/tests/contracts-writer.test.cjs','essai-stitch-v5-famille/tests/contracts-sync.test.mjs'];
function run(args){const result=spawnSync(process.execPath,args,{cwd:repo,stdio:'inherit',env:process.env});if(result.status!==0)process.exit(result.status||1);}
run(['--test',...unit]);
for(const file of ['contracts-ui.cjs','contracts-import-ui.cjs','contracts-source-ui.cjs','contracts-archives-permissions.cjs','contracts-edge-ui.cjs'])run([path.join(__dirname,file)]);
console.log('CONTRACTS_ACCEPTANCE_PASS — native local persistence and labelled family fixtures; live backend unverified');

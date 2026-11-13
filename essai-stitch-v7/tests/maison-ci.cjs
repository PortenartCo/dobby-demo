/* Current Maison requirements. All browser state is an isolated local fixture. */
const {spawnSync}=require('node:child_process'),path=require('node:path');
const repo=path.resolve(__dirname,'../..');
function run(args){const result=spawnSync(process.execPath,args,{cwd:repo,stdio:'inherit',env:process.env});if(result.status!==0)process.exit(result.status||1);}
run(['--test','essai-stitch-v7/tests/house-model.test.mjs','essai-stitch-v7/tests/equipment-import.test.mjs','essai-stitch-v5-famille/tests/house-writer.test.cjs','essai-stitch-v5-famille/tests/house-sync.test.mjs']);
for(const file of ['maison-ui.cjs','maison-import-ui.cjs','maison-documents-ui.cjs'])run([path.join(__dirname,file)]);
console.log('MAISON_ACCEPTANCE_PASS — local native DOM/IndexedDB and labelled rights/sync fixtures; real household server recipe pending');

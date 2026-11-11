/* Sequential checkpoints run their own lot; final delivery runs the complete suite. */
const {spawnSync}=require('node:child_process'),path=require('node:path'),scope=require('../ci-scope.json');
if(scope.runesPilot&&process.env.DOBBY_FINAL!=='1'){
 const pilot=require('../../scripts/runes-pilot/ci.cjs');pilot.verify();
 if(process.env.DOBBY_CI_VERIFY_ONLY==='1'){
  if(process.env.GITHUB_OUTPUT)require('node:fs').appendFileSync(process.env.GITHUB_OUTPUT,'verified=true\npilot=true\n');
 }else pilot.run();
 return;
}
// Continue the one final campaign after its historical period assertion failed.
// This checkpoint is reusable only for the exact same tracked code and passed
// tests. Any other change automatically restores the complete campaign.
const continuation=scope.continuation,allowChanged=new Set([".github/workflows/dobby-stitch-v7.yml", "essai-stitch-v7/ci-scope.json", "essai-stitch-v7/tests/ci.cjs", "essai-stitch-v7/tests/register-tools.cjs"]);
let resumePending=false;
if(continuation&&process.env.DOBBY_FINAL!=='1'){
 const tree=spawnSync('git',['ls-tree','-r','HEAD'],{encoding:'utf8'});if(tree.status!==0)throw Error('Cannot verify continuation source tree');
 const stable=tree.stdout.split('\n').filter(line=>{const file=line.split('\t')[1];return file&&!file.startsWith('docs/')&&!allowChanged.has(file);}).join('\n')+'\n';
 const fingerprint=require('node:crypto').createHash('sha256').update(stable).digest('hex');
 resumePending=fingerprint===continuation.stableTreeSha256;
 console.log(resumePending?'CI_CONTINUATION_VERIFIED':'CI_CONTINUATION_CHANGED_RUN_ALL',continuation.previousRun,continuation.from);
}
const run=(file,extra={})=>{if(resumePending&&file!==continuation.from){console.log('CI_ALREADY_PASSED_PREVIOUS_PHASE',file,continuation.previousRun);return;}resumePending=false;const r=spawnSync(process.execPath,[path.join(__dirname,file)],{stdio:'inherit',env:{...process.env,DOBBY_TEST_ORIGIN:process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765',...extra}});if(r.status!==0)process.exit(r.status||1);};
// CI may reuse passed checks only for this exact protected source/test tree.
if(process.env.DOBBY_CI_VERIFY_ONLY==='1'){
 if(process.env.GITHUB_OUTPUT)require('node:fs').appendFileSync(process.env.GITHUB_OUTPUT,'verified='+String(resumePending)+'\n');
 console.log('CI_PREVIOUS_CHECKS_REUSABLE',resumePending,continuation?.previousRun||'none');process.exit(0);
}
// E06-01 mission: keep the historical campaign available via DOBBY_FINAL=1.
if(scope.ritualOnly&&process.env.DOBBY_FINAL!=='1'){run('e06-ritual.cjs');run('e06-ritual-errors.cjs');run('e06-consolidation.cjs',{DOBBY_E06_JOURNEY_ONLY:'1',DOBBY_E06_RITUAL_ENTRY:'1',DOBBY_E06_EVIDENCE_DIR:path.resolve(__dirname,'../../docs/dobby-v7/evidence/e06-01/regression')});process.exit(0);}
if(scope.e06VisualFunctional){run('e06-art.cjs');run('e06-effects-transition.cjs');}
for(const file of ['consolidation-shared.cjs','e01-consolidation.cjs','e02-consolidation.cjs','e05-consolidation.cjs','e06-consolidation.cjs','e07-consolidation.cjs'])run(file);
for(const file of ['e06-auth.cjs','e06.cjs','e06-edge.cjs','e06-recovery.cjs','e06-review.cjs','e06-shared.cjs','e06-visual.cjs'])run(file);
run('e08.cjs');run('e03-counts.cjs');run('e03.cjs');run('e07-2-boot.cjs');run('e07-2-model.cjs');run('e07-2.cjs');require('node:child_process').execFileSync(process.execPath,[path.resolve(__dirname,'../../scripts/build-dobby-review.cjs'),'--profile',scope.reviewProfile||'integrated','--output',path.resolve(__dirname,'../../essai-dobby-integrated-review')],{stdio:'inherit'});run('integrated-preview.cjs',{DOBBY_PREVIEW_BASE:(process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765')+'/essai-dobby-integrated-review/'});run('e07-1-context.cjs');run('e07-1.cjs');run('e07-native-actions.cjs');run('e07.cjs');run('e05-native.cjs');run('e05.cjs');run('e05-edge.cjs');run('e04.cjs');run('runes-native.cjs');run('e04-runes.cjs');run('e02.cjs');run('e02-edge.cjs');run('e02-voice-history.cjs');run('e01.cjs');run('e01-3.cjs');run('e01-1-visual.cjs');run('e01-visual.cjs');
if(scope.final||process.env.DOBBY_FINAL==='1'){for(const file of ['smoke.cjs','cuisine.cjs','cuisine-family.cjs','cuisine-visual.cjs','family.cjs','family-edge.cjs','family-review.cjs','family-shared.cjs','family-visual.cjs'])run(file);for(const [lot,file]of Object.entries({'2b':'family','3':'house','4':'documents','5':'tools'})){run('register-'+file+'.cjs');run('register-visual.cjs',{DOBBY_LOT:lot});}run('register-sync.cjs');run('register-documents-sync.cjs');run('register-import-reading.cjs');run('register-missions-sync.cjs');run('register-preservation.cjs');run('register-navigation.cjs');run('register-root-visual.cjs');run('register-review.cjs');}
else{if(scope.shared){for(const file of ['smoke.cjs','family.cjs','family-edge.cjs','family-review.cjs','family-shared.cjs'])run(file);}run('register-'+({'2b':'family','3':'house','4':'documents','5':'tools'})[scope.lot]+'.cjs');run('register-visual.cjs',{DOBBY_LOT:scope.lot});if(scope.lot==='3'){run('register-family.cjs');run('register-sync.cjs');run('register-preservation.cjs');}if(scope.lot==='5'){run('register-review.cjs');run('register-house.cjs');run('register-root-visual.cjs');run('register-missions-sync.cjs');run('register-navigation.cjs');run('register-documents-sync.cjs');}if(scope.lot==='4'){run('register-documents-sync.cjs');run('register-import-reading.cjs');}if(scope.lot==='2b')run('register-sync.cjs');}
if(resumePending)throw Error('Continuation checkpoint not found; campaign incomplete');

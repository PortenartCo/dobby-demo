/* E07.3 causal regression campaign. The historical full campaign remains in ci.cjs. */
const {spawnSync}=require('node:child_process'),path=require('node:path');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
const run=(name,extra={})=>{console.log('E073_CI_START',name);const result=spawnSync(process.execPath,[path.join(__dirname,name)],{stdio:'inherit',env:{...process.env,DOBBY_TEST_ORIGIN:origin,...extra}});if(result.status!==0)process.exit(result.status||1);console.log('E073_CI_PASS',name);};
for(const name of ['e07-3-taverne.cjs','e07-3-catalogue.cjs','e07-3-effects.cjs','e07-3-import.cjs','e07-3-visual.cjs'])run(name);
for(const name of ['e07.cjs','e07-1.cjs','e07-native-actions.cjs','e07-consolidation.cjs','e07-2-boot.cjs','e07-2-model.cjs','e07-2.cjs','cuisine.cjs','cuisine-family.cjs','smoke.cjs'])run(name,name==='smoke.cjs'?{DOBBY_SMOKE_EVIDENCE_DIR:path.resolve(__dirname,'../../docs/dobby-v7/evidence/e07-3/ci/smoke')}:{});
// Shared chrome changed only on added library routes; verify its existing home,
// chat, native action, navigation and preference boundaries across E01–E08.
for(const name of ['consolidation-shared.cjs','e01-consolidation.cjs','e01.cjs','e01-3.cjs','e02-edge.cjs','e02-voice-history.cjs','e03-counts.cjs','e04-runes.cjs','e05-native.cjs','e06-edge.cjs','e08.cjs'])run(name);
const build=spawnSync(process.execPath,[path.resolve(__dirname,'../../scripts/build-dobby-review.cjs'),'--profile','e073'],{stdio:'inherit'});if(build.status!==0)process.exit(build.status||1);
run('e07-3-preview.cjs',{DOBBY_E073_PREVIEW_BASE:origin+'/essai-dobby-e07-review-20261111/'});
console.log('E073_CAUSAL_CAMPAIGN_PASS source/UI/native sync fixtures/common boundaries/isolated bundle');

/* Targeted correction checkpoints, plus the prior contextual/voice contracts. */
const fs=require('node:fs'),path=require('node:path'),{spawnSync,execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'../..'),origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
const run=(file,extra={})=>{console.log('INTEGRATED_REVIEW_START',file,extra.DOBBY_REVIEW_PATH||'canonical');const result=spawnSync(process.execPath,[path.join(__dirname,file)],{stdio:'inherit',env:{...process.env,DOBBY_TEST_ORIGIN:origin,...extra}});if(result.status!==0)throw Error(file+' failed with status '+result.status);};
const evidence=path.join(repo,'docs/dobby-v7/evidence/integrated-e03-e06-20261111/ci');
fs.mkdirSync(evidence,{recursive:true});
const checkpoints=['review-integrated-rewards.cjs','review-integrated-rewards-writer.cjs','review-integrated-rewards-preset.cjs','review-integrated-rewards-large-amount.cjs','review-integrated-missions.cjs','review-integrated-ceremony.cjs','review-integrated-ceremony-compat.cjs','review-integrated-ceremony-extras.cjs','review-integrated-effects.cjs','review-voice-20261111.cjs','review-context-20261111.cjs'];
for(const file of checkpoints)run(file);
const temp=fs.mkdtempSync(path.join(repo,'.review-e03-e06-ci-'));
try{
 const bundle=path.join(temp,'bundle');
 execFileSync(process.execPath,[path.join(repo,'scripts/build-dobby-review.cjs'),'--profile','integrated-e03-e06','--output',bundle],{cwd:repo,stdio:'inherit'});
 const reviewPath='/'+path.relative(repo,bundle).split(path.sep).join('/')+'/essai-stitch-v7';
 run('review-integrated-effects.cjs',{DOBBY_REVIEW_PATH:reviewPath,DOBBY_EFFECTS_EVIDENCE:path.join(evidence,'preview-effects')});
 fs.copyFileSync(path.join(bundle,'review-manifest.json'),path.join(evidence,'preview-manifest.json'));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log('INTEGRATED_REVIEW_CHECKPOINTS_PASS',checkpoints.length+1,'browser scripts including isolated preview');

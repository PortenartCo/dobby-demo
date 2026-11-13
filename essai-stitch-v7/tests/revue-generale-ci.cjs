/* Current 60-point acceptance campaign; local native writers, labelled fixtures,
 * no live backend certification. Historical campaigns remain available in ci.cjs. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync,execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'../..');
const origin=new URL(process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765');
if(origin.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(origin.hostname))throw Error('Local checkout HTTP origin required');
const output=path.resolve(process.env.DOBBY_REVIEW_EVIDENCE||path.join(repo,'docs/dobby-v7/evidence/revue-generale/ci-current'));
fs.mkdirSync(output,{recursive:true});
const tracked=execFileSync('git',['ls-files','essai-stitch-v7','essai-stitch-v5-famille'],{cwd:repo,encoding:'utf8'}).trim().split('\n').filter(f=>/\.(js|mjs|css|html)$/.test(f)&&!f.includes('/tests/'));
const hash=()=>Object.fromEntries(tracked.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,f))).digest('hex')]));
const before=hash(),summary={sourceSha:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),startedAt:new Date().toISOString(),liveBackendVerified:false,speechHardwareVerified:false,results:[]};
const env={...process.env,DOBBY_TEST_ORIGIN:origin.origin,DOBBY_MISSIONS_EVIDENCE_DIR:path.join(output,'missions'),DOBBY_MEALS_EVIDENCE:path.join(output,'meals'),DOBBY_SHOPPING_EVIDENCE:path.join(output,'shopping'),DOBBY_FAM_EVIDENCE:path.join(output,'family'),DOBBY_TRANSVERSAL_EVIDENCE:path.join(output,'transversal'),DOBBY_E05_EVIDENCE_DIR:path.join(output,'profile'),NODE_PATH:path.join(__dirname,'node_modules')};
const cases=['missions-review.cjs','missions-unassigned-review.cjs','v7-meals-model.cjs','v7-meals-ui.cjs','v7-meals-child.cjs','review-shopping.cjs','review-shopping-settings.cjs','review-shopping-role.cjs','v7-family-review.cjs','v7-transversal.cjs','v7-home-review.cjs','v7-connected-ceremony-dock.cjs','e08.cjs','e05-native.cjs','e05.cjs','e05-edge.cjs'];
try{
 for(const name of cases){const start=Date.now();console.log('REVIEW60_START',name);const r=spawnSync(process.execPath,[path.join(__dirname,name)],{cwd:repo,env,encoding:'utf8',maxBuffer:32*1024*1024});fs.writeFileSync(path.join(output,name+'.log'),(r.stdout||'')+(r.stderr||''));summary.results.push({name,exitCode:r.status,durationMs:Date.now()-start});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');if(r.status!==0)throw Error('Review acceptance failed: '+name);}
 if(JSON.stringify(before)!==JSON.stringify(hash()))throw Error('Runtime source changed during campaign');
 summary.passed=true;console.log('REVIEW60_PASS '+cases.length+' native campaigns; immutable source; fixture/backend distinction retained');
}catch(error){summary.passed=false;summary.error=error.message;throw error;}finally{summary.completedAt=new Date().toISOString();summary.sourceSha256=before;fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(summary,null,2)+'\n');}

/* E07-P01 only: the changed meal journey and its immediate E07.4 boundaries. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync,execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'../..'),out=path.join(repo,'docs/dobby-v7/evidence/e07-p01/ci'),origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765',results=[];
fs.mkdirSync(out,{recursive:true});
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,file))).digest('hex');
const sources=['essai-stitch-v7/cuisine-p01.js','essai-stitch-v7/cuisine-p01.css','essai-stitch-v7/cuisine.js','essai-stitch-v7/cuisine-e07.js','essai-stitch-v7/cuisine-engine.js','essai-stitch-v7/cuisine-e074.js','essai-stitch-v7/cuisine-list.js','essai-stitch-v5-famille/index.html','scripts/build-dobby-review.cjs','scripts/review/e07-p01-config.js'];
const before=Object.fromEntries(sources.map(f=>[f,sha(f)])),boundariesOnly=process.argv.includes('--boundaries-only'),files=['e07-p01.cjs','e07-p01-visual.cjs','e07-3-taverne.cjs','e07-3-catalogue.cjs','e07-4-b-ui.cjs','e07-4-engine.cjs','e07-4-render-race.cjs','v7-meals-model.cjs','v7-meals-ui.cjs','v7-meals-child.cjs','v7-dessert-preparations.cjs','v7-dessert-batch-edges.cjs'],report=boundariesOnly?'boundaries-results.json':'results.json';
for(const file of boundariesOnly?files.slice(2):files){
 console.log('E07_P01_CI_START',file);
 const result=spawnSync(process.execPath,[path.join(__dirname,file)],{cwd:repo,encoding:'utf8',maxBuffer:20*1024*1024,env:{...process.env,DOBBY_TEST_ORIGIN:origin,DOBBY_E074:'1',DOBBY_E074_ENGINE_WIDTHS:'390',DOBBY_E073_TAVERNE_EVIDENCE:path.join(out,'taverne'),DOBBY_E073_CATALOGUE_EVIDENCE:path.join(out,'catalogue')}});
 fs.writeFileSync(path.join(out,file+'.log'),(result.stdout||'')+(result.stderr||''));
 results.push({test:file,status:result.status===0?'PASS':'FAIL'});
 if(result.status!==0){console.error(result.stdout,result.stderr);fs.writeFileSync(path.join(out,report),JSON.stringify({status:'FAIL',results,sourceSha256:before},null,2)+'\n');process.exit(result.status||1);}
 console.log('E07_P01_CI_PASS',file);
}
for(const [file,digest]of Object.entries(before))if(sha(file)!==digest)throw Error('Source changed during targeted verification: '+file);
fs.writeFileSync(path.join(out,report),JSON.stringify({status:'PASS',sourceSha:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),sourceSha256:before,results,scope:boundariesOnly?'E07.4 boundaries only; new P01 tests executed separately.':'P01 calendar, slots, guests, filters, reserve, native planning and immediate E07.4 boundaries; no exhaustive E01–E08 campaign.'},null,2)+'\n');
console.log('E07_P01_TARGETED_CI_PASS',results.length,'browser scripts; source fingerprints unchanged');

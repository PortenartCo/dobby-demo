/* Independent review lot: no changes to the E06-owned common campaign registry. */
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const origin=process.env.DOBBY_TEST_ORIGIN||'http://127.0.0.1:8765';
const targeted=['review-home-20261111.cjs','review-voice-20261111.cjs','review-context-20261111.cjs','review-recurrence-20261111.cjs','review-recurrence-20261111-date.cjs','review-recurrence-20261111-writer.cjs','review-avatars-20261111.cjs'];
const regressions=['e01-consolidation.cjs','e02-consolidation.cjs','e02.cjs','e02-edge.cjs','e02-voice-history.cjs','e03-counts.cjs','e03.cjs','e04.cjs','runes-native.cjs','e04-runes.cjs','e05-native.cjs','e05.cjs','e05-edge.cjs','e07-2-model.cjs','e07-2.cjs','cuisine-family.cjs','e08.cjs'];
const files=process.env.REVIEW_TARGETED_ONLY==='1'?targeted:[...targeted,...regressions];
const resume=process.env.REVIEW_RESUME_FROM,index=resume?files.indexOf(resume):0;if(index<0)throw Error('Unknown resume checkpoint');
let passed=0;
for(const file of files.slice(index)){if(!fs.existsSync(path.join(__dirname,file)))throw Error('Missing review test: '+file);console.log('REVIEW_TEST_START',file);const r=spawnSync(process.execPath,[path.join(__dirname,file)],{stdio:'inherit',env:{...process.env,DOBBY_TEST_ORIGIN:origin}});if(r.status!==0)process.exit(r.status||1);passed++;}
console.log('REVIEW_E01_E05_CAMPAIGN_PASS',passed,'scripts',resume?'resumed from '+resume:'complete');

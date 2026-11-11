/* Targeted pilot campaign; never substitutes for an application-code change. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'../..');
const allowed=new Set(['.gitignore','.github/workflows/dobby-stitch-v7.yml','essai-stitch-v7/ci-scope.json','essai-stitch-v7/tests/ci.cjs','essai-stitch-v5-famille/tests/helpers/modules-harness.mjs','scripts/build-dobby-runes-pilot.cjs']);
function fingerprint(ref='HEAD'){
 const tree=execFileSync('git',['ls-tree','-r',ref],{cwd:repo,encoding:'utf8'}).split('\n').filter(line=>{const file=line.split('\t')[1];return file&&!file.startsWith('docs/')&&!file.startsWith('scripts/runes-pilot/')&&!allowed.has(file);}).join('\n')+'\n';
 return crypto.createHash('sha256').update(tree).digest('hex');
}
function verify(){const expected=require('../../essai-stitch-v7/ci-scope.json').runesPilot?.protectedTreeSha256;if(!expected||fingerprint()!==expected)throw Error('Pilot scope changed: full application review required');console.log('RUNES_PILOT_PROTECTED_APPLICATION_UNCHANGED',expected);}
function run(){
 verify();
 const call=(args)=>execFileSync(process.execPath,args,{cwd:repo,stdio:'inherit'});
 const tests=fs.readdirSync(path.join(repo,'essai-stitch-v5-famille/tests')).filter(x=>x.endsWith('.test.mjs')).map(x=>'essai-stitch-v5-famille/tests/'+x);
 for(const dir of ['essai-sync-v1/tests','essai-sync-v2/tests'])tests.push(...fs.readdirSync(path.join(repo,dir)).filter(x=>x.endsWith('.test.mjs')).map(x=>dir+'/'+x));
 tests.push(...fs.readdirSync(path.join(repo,'essai-stitch-v7/tests')).filter(x=>/^e06-.*\.test\.mjs$/.test(x)).map(x=>'essai-stitch-v7/tests/'+x));
 call(['--test',...tests,'scripts/runes-pilot/guard.test.mjs','scripts/runes-pilot/build.test.cjs']);
 call(['scripts/build-dobby-runes-pilot.cjs']);
 call(['scripts/runes-pilot/browser.cjs']);
}
module.exports={fingerprint,verify,run};

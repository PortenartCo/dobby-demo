const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {withIntegratedPreview}=require('./integrated-preview-fixture.cjs');
test('integrated fixture uses a unique served directory and preserves the existing archive',()=>{
 const repo=fs.mkdtempSync(path.join(os.tmpdir(),'dobby-ci-fixture-test-'));let built;
 try{
  const archive=path.join(repo,'essai-dobby-integrated-review');fs.mkdirSync(archive);fs.writeFileSync(path.join(archive,'original'),'ORIGINAL ARCHIVE');
  const result=withIntegratedPreview({repo,origin:'http://127.0.0.1:8819',build:output=>{built=output;assert.ok(!fs.existsSync(output));fs.mkdirSync(output);},test:base=>{assert.equal(base,'http://127.0.0.1:8819/'+path.relative(repo,built).split(path.sep).join('/')+'/');assert.equal(fs.existsSync(built),true);return 'PASS';}});
  assert.equal(result,'PASS');assert.equal(fs.existsSync(path.dirname(built)),false);assert.equal(fs.readFileSync(path.join(archive,'original'),'utf8'),'ORIGINAL ARCHIVE');
 }finally{fs.rmSync(repo,{recursive:true,force:true});}
});
test('integrated fixture removes only its temporary output when build or test throws',()=>{
 const repo=fs.mkdtempSync(path.join(os.tmpdir(),'dobby-ci-fixture-test-'));
 try{
  const archive=path.join(repo,'essai-dobby-integrated-review');fs.mkdirSync(archive);fs.writeFileSync(path.join(archive,'original'),'ORIGINAL ARCHIVE');
  for(const stage of ['build','test']){
   let built;
   assert.throws(()=>withIntegratedPreview({repo,origin:'http://127.0.0.1:8819',build:output=>{built=output;fs.mkdirSync(output);if(stage==='build')throw Error('TEST build failure');},test:()=>{throw Error('TEST test failure');}}),new RegExp('TEST '+stage+' failure'));
   assert.equal(fs.existsSync(path.dirname(built)),false);assert.equal(fs.readFileSync(path.join(archive,'original'),'utf8'),'ORIGINAL ARCHIVE');
  }
 }finally{fs.rmSync(repo,{recursive:true,force:true});}
});
test('integrated fixture exit cleanup also runs when the CI child runner calls process.exit',()=>{
 const repo=fs.mkdtempSync(path.join(os.tmpdir(),'dobby-ci-fixture-test-'));
 try{
  const script='const fs=require("node:fs"),{withIntegratedPreview}=require(process.argv[1]);withIntegratedPreview({repo:process.argv[2],origin:"http://127.0.0.1:8819",build:output=>fs.mkdirSync(output),test:()=>process.exit(7)});';
  const child=spawnSync(process.execPath,['-e',script,require.resolve('./integrated-preview-fixture.cjs'),repo],{encoding:'utf8'});
  assert.equal(child.status,7,child.stderr);assert.deepEqual(fs.readdirSync(repo),[],'The exit path leaves no temporary fixture');
 }finally{fs.rmSync(repo,{recursive:true,force:true});}
});

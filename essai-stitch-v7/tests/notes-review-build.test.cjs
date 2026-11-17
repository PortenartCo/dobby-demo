'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const repo=path.resolve(__dirname,'../..'),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
test('Notes preview preserves native bytes, records every asset, isolates storage and refuses replacement',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dobby-notes-')),out=path.join(temp,'bundle');
 const run=args=>spawnSync(process.execPath,['scripts/build-dobby-notes-review.cjs',...args],{cwd:repo,encoding:'utf8'});
 try{
  const built=run(['--allow-dirty','--output',out]);assert.equal(built.status,0,built.stderr);
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'review-manifest.json')));
  assert.equal(manifest.version,'V7-NOTES-STITCH23');assert.equal(manifest.entry,'essai-stitch-v7/famille.html?client=A#memos');
  assert.equal(manifest.realBackend,false);assert.equal(manifest.realAuth,false);assert.equal(manifest.realAccountsTested,false);assert.equal(manifest.migrationsApplied,false);
  assert.equal(manifest.storagePrefix,'dobby-review-v7-notes-stitch23-20261116|client-{A|B}|');
  for(const row of manifest.files)assert.equal(hash(fs.readFileSync(path.join(out,row.path))),row.sha256,row.path);
  for(const file of ['essai-stitch-v7/family-register.js','essai-stitch-v7/family-agenda-review.css','essai-stitch-v7/family-engine.js','essai-stitch-v5-famille/family-modules.js','essai-stitch-v7/assets/notes-stitch23.png'])assert.equal(hash(fs.readFileSync(path.join(out,file))),hash(fs.readFileSync(path.join(repo,file))),file+' native bytes');
  assert.equal(manifest.illustration.sha256,'51372431f4b460278e9f287de40f4079dcfd26cd5e6a7fb53ee968548abc149d');
  for(const file of ['review-config.js','global-demo.js','family-config.js']){
   const code=fs.readFileSync(path.join(out,file),'utf8');
   assert.match(code,/dobby-review-v7-notes-stitch23-20261116\|/);
   assert.doesNotMatch(code,/dobby-review-v7-(?:famille|global|menu)-20261112\|/);
  }
  const html=fs.readFileSync(path.join(out,'essai-stitch-v7/famille.html'),'utf8');assert.match(html,/connect-src 'self'/);
  assert.match(fs.readFileSync(path.join(out,'essai-stitch-v5-famille/family-v2.js'),'utf8'),/Connexion réelle désactivée/);
  const before=fs.readFileSync(path.join(out,'review-manifest.json'));const again=run(['--allow-dirty','--output',out]);assert.notEqual(again.status,0);assert.match(again.stderr,/Output must be a new directory/);assert.deepEqual(fs.readFileSync(path.join(out,'review-manifest.json')),before);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

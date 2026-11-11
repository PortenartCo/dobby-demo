/* Corrected review must have its own reproducible, backend-free storage realm. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
test('E03–E06 corrected preview uses canonical sources and a fresh isolated namespace',()=>{
 const repo=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'dobby-e03-e06-build-'));
 try{
  const build=dir=>{execFileSync(process.execPath,[path.join(repo,'scripts/build-dobby-review.cjs'),'--profile','integrated-e03-e06','--output',dir],{cwd:repo});return JSON.parse(fs.readFileSync(path.join(dir,'review-manifest.json')));};
  const a=path.join(temp,'first'),b=path.join(temp,'second'),manifest=build(a);
  assert.equal(manifest.storagePrefix,'dobby-review-e03-e06-20261111|');
  assert.equal(manifest.reviewScope,'E03-E06-20261111');assert.equal(manifest.realBackend,false);
  assert.equal(manifest.entry,'essai-stitch-v7/traverse.html');
  assert.equal(manifest.sourceReferences.e06,'73861879625615c358cf4de181189a9f5acbdff6');
  assert.equal(manifest.sourceReferences.e01e05,'e2a8e1d830d76b5e2bcccf40bbe46c6eb88a8a7d');
  const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(a,'review-config.js'),'utf8'),context);
  const config=context.window.DobbyReviewConfig,state=config.initialState('2026-11-11');
  assert.equal(config.storagePrefix,manifest.storagePrefix);assert.equal(state.stitchPreferences,undefined,'Default remains the actual native reader, no stored preference is forged');
  assert.match(config.info,/compensation|annulation/i);assert.doesNotMatch(config.info,/récurrences restent des dépendances/);
  for(const file of ['essai-stitch-v7/missions.js','essai-stitch-v7/chat.js','essai-stitch-v7/cuisine-list.js','essai-stitch-v7/onboarding.js'])assert.deepEqual(fs.readFileSync(path.join(a,file)),fs.readFileSync(path.join(repo,file)),file+' is canonical');
  const second=build(b);assert.deepEqual(manifest,second,'Two generated manifests are identical');
  assert.deepEqual(fs.readFileSync(path.join(a,'review-config.js')),fs.readFileSync(path.join(b,'review-config.js')));
  assert.match(fs.readFileSync(path.join(a,'review-runtime.js'),'utf8'),/connexion externe désactivée/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

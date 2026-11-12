/* Isolated P01 review profile; no server, account or application writer. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
test('E07-P01 builds a fresh namespace while retaining E07.4 demo meals and provenance',()=>{
 const repo=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'dobby-p01-build-')),out=path.join(temp,'preview'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
 const config=source=>{const context={window:{}};vm.runInNewContext(source,context);return context.window.DobbyReviewConfig;};
 try{
  const build=()=>execFileSync(process.execPath,[path.join(repo,'scripts/build-dobby-review.cjs'),'--profile','e07-p01','--output',out],{cwd:repo,stdio:'pipe'});build();
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'review-manifest.json'))),cfg=config(fs.readFileSync(path.join(out,'review-config.js'),'utf8')),base=config(fs.readFileSync(path.join(repo,'scripts/review/e074-config.js'),'utf8'));
  assert.equal(manifest.version,'E07-P01');assert.equal(manifest.base,'69ef361ad139356c2d1473d825f9231e7610b0e4');assert.equal(manifest.storagePrefix,'dobby-review-e07-p01-20261112|');assert.equal(cfg.storagePrefix,manifest.storagePrefix);assert.notEqual(cfg.storagePrefix,base.storagePrefix);assert.equal(manifest.realBackend,false);assert.ok(['working-tree','committed'].includes(manifest.sourceState));assert.equal(manifest.entry,'essai-stitch-v7/index.html#taverne');
  assert.deepEqual(JSON.parse(JSON.stringify(cfg.initialState('2026-11-12'))),JSON.parse(JSON.stringify(base.initialState('2026-11-12'))),'P01 reuses the two existing fictional meals without inventing a catalogue');
  const html=fs.readFileSync(path.join(out,'essai-stitch-v7/index.html'),'utf8'),native=fs.readFileSync(path.join(out,'essai-stitch-v5-famille/family-v2.js'),'utf8'),notes=fs.readFileSync(path.join(out,'README.md'),'utf8');
  assert.ok(html.indexOf('review-config.js')<html.indexOf('review-runtime.js'));assert.match(html,/connect-src 'self'/);assert.match(native,/Connexion réelle désactivée/);assert.match(notes,/200 recettes générales.*200 recettes diététiques/);assert.match(notes,/E07-P02.*hors périmètre/);assert.equal(hash(Buffer.from(notes)),manifest.readmeSha256);assert.equal(hash(fs.readFileSync(path.join(out,'review-config.js'))),manifest.configSha256);
  for(const row of manifest.files){assert.equal(hash(fs.readFileSync(path.join(out,row.path))),row.sha256,row.path);assert.equal(hash(fs.readFileSync(path.join(repo,row.path))),row.sourceSha256,row.path+' source');if(/\.(html|js)$/.test(row.path))assert.doesNotMatch(fs.readFileSync(path.join(out,row.path),'utf8'),/https:\/\/lh3\.googleusercontent\.com\/aida-public\//);}
  assert.throws(build,/Command failed/,'An existing preview is never overwritten');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

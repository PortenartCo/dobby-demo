/* Building an isolated review must leave every native input untouched. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process'),vm=require('node:vm');
const repo=path.resolve(__dirname,'../..'),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
test('global preview runs native modules from an independently verifiable, offline-only bundle',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dobby-global-build-')),out=path.join(temp,'bundle');
 const inputs=['scripts/build-dobby-review.cjs','scripts/review/review-runtime.js','essai-stitch-v5-famille/family-v2.js','essai-stitch-v5-famille/family-modules.js','essai-stitch-v5-famille/family-runes-core.mjs','essai-stitch-v7/register.js'];
 const before=Object.fromEntries(inputs.map(file=>[file,hash(fs.readFileSync(path.join(repo,file)))]));
 try{
  const result=spawnSync(process.execPath,[path.join(repo,'scripts/build-dobby-global-review.cjs'),'--allow-dirty','--output',out],{cwd:repo,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'review-manifest.json')));
  assert.equal(manifest.realBackend,false);assert.equal(manifest.version,'V7-GLOBAL');
  assert.equal(manifest.entry,'essai-stitch-v7/traverse.html?client=A');
  assert.equal(manifest.base,'c510ded81ee075c9b180e2551257351c557e541a');
  assert.equal(manifest.simulatedOrigin,'https://dobby-global-demo.invalid');
  assert.equal(manifest.storagePrefix,'dobby-review-v7-global-20261112|client-{A|B}|');
  const outputFiles=[];function visit(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())visit(file);else if(entry.name!=='review-manifest.json')outputFiles.push(path.relative(out,file).split(path.sep).join('/'));}}visit(out);
  assert.deepEqual(manifest.files.map(record=>record.path).sort(),outputFiles.sort(),'Every shipped resource has an integrity hash');
  for(const record of manifest.files){
   const output=fs.readFileSync(path.join(out,record.path));assert.equal(hash(output),record.sha256,record.path+' output hash');
   if(record.sourcePath||!record.generated&&fs.existsSync(path.join(repo,record.path)))assert.equal(hash(fs.readFileSync(path.join(repo,record.sourcePath||record.path))),record.sourceSha256,record.path+' input hash');
  }
  for(const file of ['essai-stitch-v5-famille/family-modules.js','essai-stitch-v5-famille/family-runes-core.mjs','essai-stitch-v7/register.js'])assert.deepEqual(fs.readFileSync(path.join(out,file)),fs.readFileSync(path.join(repo,file)),file+' writer bytes retained');
  const adapter=fs.readFileSync(path.join(out,'essai-stitch-v5-famille/family-v2.js'),'utf8');
  assert.match(adapter,/https:\/\/dobby-global-demo\.invalid/);assert.doesNotMatch(adapter,/https:\/\/pqcdkrwljgvgagzwrcmg\.supabase\.co/);
  for(const file of ['essai-stitch-v7/index.html','essai-stitch-v7/traverse.html','essai-stitch-v7/famille.html','essai-stitch-v5-famille/index.html']){
   const html=fs.readFileSync(path.join(out,file),'utf8');assert.ok(html.indexOf('review-config.js')<html.indexOf('review-runtime.js'));assert.ok(html.indexOf('review-runtime.js')<html.indexOf('global-demo.js'));assert.match(html,/connect-src 'self'/);
  }
  const top={location:{href:'https://preview.example.test/essai-stitch-v7/traverse.html?client=B',search:'?client=B'}},session=new Map();
  const context={URL,URLSearchParams,Date,Object,window:top,top,location:top.location,history:{replaceState(){}},sessionStorage:{getItem:key=>session.get(key)||null,setItem:(key,value)=>session.set(key,value)}};vm.runInNewContext(fs.readFileSync(path.join(out,'review-config.js'),'utf8'),context);
  assert.equal(top.DobbyReviewConfig.demoMemberId,'review-person-b');assert.match(top.DobbyReviewConfig.storagePrefix,/client-B\|$/);
  const seed=top.DobbyReviewConfig.initialState('2026-11-12');assert.equal(seed.familyMembers.length,2);assert.ok(Array.isArray(seed.sharedFamilyNotes));assert.equal(seed.customRecipes.length,2);assert.equal(seed.manualMissions.length,2);
  const again=spawnSync(process.execPath,[path.join(repo,'scripts/build-dobby-global-review.cjs'),'--output',out],{cwd:repo,encoding:'utf8'});assert.notEqual(again.status,0,'An existing preview is never overwritten');assert.match(again.stderr,/Output must be a new directory/);
  assert.deepEqual(Object.fromEntries(inputs.map(file=>[file,hash(fs.readFileSync(path.join(repo,file)))])),before);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

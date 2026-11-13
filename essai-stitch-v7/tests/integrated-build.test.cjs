/* Historical review-builder regression; temporary fixtures only, never publish. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process'),crypto=require('node:crypto'),vm=require('node:vm');
const repo=path.resolve(__dirname,'../..');
const identity=(source,review)=>{const context={window:review?{DobbyReview:review}:{}};vm.runInNewContext(source,context);return context.window.DobbyMagicIdentity;};
test('integrated bundle uses the actual modules, isolated persona and guarded native client',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dobby-integrated-build-')),out=path.join(temp,'bundle');
 try{
  const originalProfile=fs.readFileSync(path.join(repo,'essai-stitch-v5-famille/family-profile.js'),'utf8');
  execFileSync(process.execPath,[path.join(repo,'scripts/build-dobby-review.cjs'),'--profile','integrated','--output',out],{cwd:repo});
  const m=JSON.parse(fs.readFileSync(path.join(out,'review-manifest.json')));
  assert.equal(m.version,'E01-E08');assert.equal(m.entry,'essai-stitch-v7/traverse.html');assert.equal(m.storagePrefix,'dobby-review-integrated-v1|');assert.equal(m.realBackend,false);
  for(const file of ['essai-stitch-v7/missions.js','essai-stitch-v7/onboarding.js','essai-stitch-v7/assets/contracts/screen.png','essai-stitch-v7/cuisine-list.js'])assert.ok(m.files.some(r=>r.path===file),file+' is an actual included module');
  const html=fs.readFileSync(path.join(out,'essai-stitch-v7/famille.html'),'utf8');assert.ok(html.indexOf('review-config.js')<html.indexOf('review-runtime.js'));assert.match(html,/Content-Security-Policy/);
  const generatedProfile=fs.readFileSync(path.join(out,'essai-stitch-v5-famille/family-profile.js'),'utf8');
  const members=[{id:'TEST-CANONICAL'},{id:'TEST-FICTIONAL'}],real=identity(originalProfile),review=identity(generatedProfile,{demoMemberId:'TEST-FICTIONAL'});
  assert.equal(real.linkedMember(members,{identityVerified:true,memberId:'TEST-CANONICAL'}),members[0],'Native profile association uses the verified canonical member');
  assert.equal(real.linkedMember(members,{identityVerified:false,memberId:'TEST-CANONICAL'}),null);
  assert.equal(real.linkedMember(members,{memberId:'TEST-CANONICAL'}),null);
  assert.equal(review.linkedMember(members,{identityVerified:true,memberId:'TEST-CANONICAL'}),members[1],'Only the generated review copy uses its explicit fictional persona');
  assert.equal(identity(generatedProfile).linkedMember(members,{identityVerified:true,memberId:'TEST-CANONICAL'}),null,'Review copy cannot associate a real account');
  assert.equal(identity(generatedProfile,{demoMemberId:'TEST-MISSING'}).linkedMember(members),null,'No fallback to an array position');
  assert.equal(fs.readFileSync(path.join(repo,'essai-stitch-v5-famille/family-profile.js'),'utf8'),originalProfile,'The builder leaves product source unchanged');
  const native=fs.readFileSync(path.join(out,'essai-stitch-v5-famille/family-v2.js'),'utf8');assert.match(native,/Connexion réelle désactivée/);assert.match(native,/grocery: Object.freeze/);assert.match(native,/function updateMeta/);
  const runtime=fs.readFileSync(path.join(out,'review-runtime.js'),'utf8');assert.match(runtime,/connexion externe désactivée/);assert.match(runtime,/window\.fetch=.*allowed\(input\)/);
  for(const row of m.files){const bytes=fs.readFileSync(path.join(out,row.path));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),row.sha256,row.path);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,row.path))).digest('hex'),row.sourceSha256,row.path+' source provenance');}
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(out,'review-config.js'))).digest('hex'),m.configSha256);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('historical review association transform rejects changed or duplicate native implementations',()=>{
 const source=fs.readFileSync(path.join(repo,'essai-stitch-v5-famille/family-profile.js'),'utf8');
 const marker="const linkedMember=(members,context)=>context?.identityVerified===true&&typeof context.memberId==='string'?members.find(member=>member.id===context.memberId)||null:null;";
 const builder=fs.readFileSync(path.join(repo,'scripts/build-dobby-review.cjs'),'utf8');
 for(const changed of [source.replace(marker,marker.replace('identityVerified===true','identityVerified===false')),source+'\n'+marker]){
  // Exercise the real builder guard with an in-memory source filesystem. This
  // produces no bundle and never mutates the actual native implementation.
  const fakeFs={existsSync:()=>false,mkdirSync:()=>{},readdirSync:dir=>dir.endsWith('essai-stitch-v5-famille')?[{name:'family-profile.js',isDirectory:()=>false}]:[],readFileSync:()=>Buffer.from(changed)};
  const context={Buffer,__dirname:path.join(repo,'scripts'),process:{argv:['node','builder','--profile','integrated','--output','/tmp/TEST-in-memory-review']},require:name=>name==='node:fs'?fakeFs:name==='node:child_process'?{execFileSync:()=> 'TEST-SHA\n'}:require(name)};
  assert.throws(()=>vm.runInNewContext(builder,context),/Verified profile association implementation changed; review required\./);
 }
});

/* The family preview must preserve its inherited engine and isolate every fixture. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),vm=require('node:vm'),{spawnSync,execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'../..'),builder=path.join(repo,'scripts/build-dobby-family-review.cjs');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const prefix='dobby-review-v7-famille-20261112|',oldPrefix='dobby-review-v7-global-20261112|';
const run=(args,cwd=repo)=>spawnSync(process.execPath,[cwd===repo?builder:path.join(cwd,'scripts/build-dobby-family-review.cjs'),...args],{cwd,encoding:'utf8'});

test('family bundle preserves global semantics and records exact source and namespace provenance',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dobby-family-build-')),out=path.join(temp,'bundle');
 const inputs=['scripts/build-dobby-review.cjs','scripts/build-dobby-global-review.cjs','scripts/review/global-config.js','scripts/review/global-demo.js','scripts/review/review-runtime.js','essai-stitch-v5-famille/family-v2.js','essai-stitch-v7/chat.js'];
 const before=Object.fromEntries(inputs.map(file=>[file,hash(fs.readFileSync(path.join(repo,file)))]));
 try{
  const built=run(['--allow-dirty','--output',out]);assert.equal(built.status,0,built.stderr||built.stdout);
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'review-manifest.json')));
  assert.equal(manifest.version,'V7-FAMILLE');assert.equal(manifest.base,'6a6fcd9bcee522da7342de391e5c3d7bfe1955b3');assert.equal(manifest.familySource,'a28a1e74e6fd6fcb0db8b154002ce032ae10f130');
  assert.equal(manifest.sourceSha,execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim());
  assert.equal(manifest.entry,'essai-stitch-v7/famille.html?client=A');assert.equal(manifest.storagePrefix,prefix+'client-{A|B}|');assert.equal(manifest.sharedFixtureKey,prefix+'backend-v1');assert.equal(manifest.resetKey,prefix+'reset-in-progress');
  assert.equal(manifest.realBackend,false);assert.equal(manifest.simulatedOrigin,'https://dobby-global-demo.invalid');assert.equal(manifest.publication,'new-directory-only');
  assert.equal(manifest.builderSource.path,'scripts/build-dobby-family-review.cjs');assert.equal(manifest.builderSource.sha256,hash(fs.readFileSync(builder)));
  assert.ok(manifest.inheritedBuilders.some(row=>row.path==='scripts/build-dobby-global-review.cjs'&&row.sha256===before[row.path]));
  const files=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(entry.name!=='review-manifest.json')files.push(path.relative(out,file).split(path.sep).join('/'));}}walk(out);
  assert.deepEqual(manifest.files.map(row=>row.path).sort(),files.sort(),'Every resource is covered once by the manifest');
  for(const row of manifest.files){assert.equal(hash(fs.readFileSync(path.join(out,row.path))),row.sha256,row.path+' output');if(row.sourceSha256)assert.equal(hash(fs.readFileSync(path.join(repo,row.sourcePath||row.path))),row.sourceSha256,row.path+' source');}
  for(const [output,source]of [['review-config.js','scripts/review/global-config.js'],['global-demo.js','scripts/review/global-demo.js']]){
   const sourceBytes=fs.readFileSync(path.join(repo,source),'utf8'),generated=fs.readFileSync(path.join(out,output),'utf8');assert.equal(generated,sourceBytes.replaceAll(oldPrefix,prefix),output+' retains every global correction');
   const record=manifest.files.find(row=>row.path===output);assert.equal(record.sourcePath,source);assert.equal(record.transformed,true);assert.deepEqual(record.transforms,[{type:'namespace-substitution',from:oldPrefix,to:prefix,occurrences:sourceBytes.split(oldPrefix).length-1}]);
  }
  assert.deepEqual(fs.readFileSync(path.join(out,'family-config.js')),fs.readFileSync(path.join(repo,'scripts/review/family-config.js')));
  assert.deepEqual(fs.readFileSync(path.join(out,'review-runtime.js')),fs.readFileSync(path.join(repo,'scripts/review/review-runtime.js')));
  for(const file of ['essai-stitch-v5-famille/family-modules.js','essai-stitch-v5-famille/family-runes-core.mjs','essai-stitch-v7/chat.js'])assert.deepEqual(fs.readFileSync(path.join(out,file)),fs.readFileSync(path.join(repo,file)),file+' native bytes');
  for(const file of ['essai-stitch-v7/index.html','essai-stitch-v7/traverse.html','essai-stitch-v7/famille.html','essai-stitch-v5-famille/index.html']){
   const html=fs.readFileSync(path.join(out,file),'utf8');const order=['review-config.js','family-config.js','review-runtime.js','global-demo.js'].map(script=>html.indexOf(script));assert.ok(order.every(index=>index>=0)&&order.every((index,i)=>!i||index>order[i-1]),file+' config is composed before startup');assert.match(html,/connect-src 'self'/);
  }
  const prior=fs.readFileSync(path.join(out,'review-manifest.json'));const again=run(['--allow-dirty','--output',out]);assert.notEqual(again.status,0);assert.match(again.stderr,/Output must be a new directory/);assert.deepEqual(fs.readFileSync(path.join(out,'review-manifest.json')),prior,'An existing bundle is untouched');
  assert.deepEqual(Object.fromEntries(inputs.map(file=>[file,hash(fs.readFileSync(path.join(repo,file)))])),before);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('V7 composed fictional A/B parents can manage all current household members through the native policy',()=>{
 const source=fs.readFileSync(path.join(repo,'scripts/review/global-config.js'),'utf8').replaceAll(oldPrefix,prefix),family=fs.readFileSync(path.join(repo,'scripts/review/family-config.js'),'utf8');
 for(const client of ['A','B']){
  const top={location:{href:'https://preview.example.test/essai-stitch-v7/famille.html?client='+client,search:'?client='+client}},session=new Map();
  const context={URL,URLSearchParams,Date,Object,window:top,top,location:top.location,history:{replaceState(){}},sessionStorage:{getItem:key=>session.get(key)||null,setItem:(key,value)=>session.set(key,value)}};
  vm.runInNewContext(source,context);const original=top.DobbyReviewConfig;vm.runInNewContext(family,context);vm.runInNewContext(fs.readFileSync(path.join(repo,'essai-stitch-v5-famille/family-member-policy.js'),'utf8'),context);vm.runInNewContext(fs.readFileSync(path.join(repo,'essai-stitch-v5-famille/family-profile.js'),'utf8'),context);
  const cfg=top.DobbyReviewConfig,seed=cfg.initialState('2026-11-12'),members=seed.familyMembers,policy=top.DobbyFamilyMemberPolicy;
  assert.equal(cfg.version,'V7-FAMILLE');assert.equal(cfg.demoMemberId,client==='B'?'review-person-b':'review-person');assert.equal(cfg.storagePrefix,prefix+'client-'+client+'|');assert.equal(session.get(prefix+'selected-client'),client);
  assert.equal(members.length,5);assert.deepEqual(Array.from(members.map(row=>row.memberCategory)).sort(),['baby','child','parent','parent','pet']);
  const actor=members.find(row=>row.id===cfg.demoMemberId),other=members.find(row=>row.memberCategory==='parent'&&row!==actor),permissionContext={demo:true,actorId:actor.id,members};
  assert.equal(policy.permissions(actor,permissionContext).canEdit,true);assert.equal(policy.permissions(other,permissionContext).canEdit,true);assert.equal(policy.permissions(null,permissionContext).canCreate,true);assert.equal(policy.permissions({id:'foreign-child',memberCategory:'child'},permissionContext).canEdit,false,'A parent cannot manage a member absent from this household');
  for(const member of members){assert.match(member.name,/DÉMO/);assert.equal(member.name,[member.firstName,member.lastName].filter(Boolean).join(' '));if(['baby','child','pet'].includes(member.memberCategory))assert.equal(policy.permissions(member,permissionContext).canEdit,true);if(member.magicProfile){const magic=member.magicProfile;assert.equal(magic.version,1);for(const[key,rows]of [['houseId','houses'],['patronusId','patronuses'],['avatarId','avatars']])assert.ok(top.DobbyMagicIdentity[rows].some(row=>row.id===magic[key]),member.id+' '+key);}}
  assert.equal(seed.customRecipes.length,2);assert.equal(seed.manualMissions.length,2);assert.equal(original.initialState('2026-11-12').familyMembers.length,2,'Composition never mutates the base config');assert.ok(Object.isFrozen(cfg));
 }
});

test('uncommitted family builder or configuration is rejected before creating a bundle',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dobby-family-guard-'));
 try{
  fs.mkdirSync(path.join(temp,'scripts/review'),{recursive:true});for(const file of ['scripts/build-dobby-family-review.cjs','scripts/review/family-config.js'])fs.copyFileSync(path.join(repo,file),path.join(temp,file));
  const git=args=>execFileSync('git',args,{cwd:temp,encoding:'utf8'});git(['init','-q']);git(['add','.']);git(['-c','user.name=Local fixture','-c','user.email=fixture@example.test','commit','-qm','Local fixture']);
  for(const file of ['scripts/build-dobby-family-review.cjs','scripts/review/family-config.js']){
   const original=fs.readFileSync(path.join(temp,file));fs.appendFileSync(path.join(temp,file),'\n/* uncommitted fixture */\n');const out=path.join(temp,path.basename(file)+'-output'),result=run(['--output',out],temp);assert.notEqual(result.status,0);assert.match(result.stderr,/Production sources are uncommitted/);assert.ok(result.stderr.includes(file));assert.equal(fs.existsSync(out),false,'Guard runs before any output mutation');fs.writeFileSync(path.join(temp,file),original);
  }
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

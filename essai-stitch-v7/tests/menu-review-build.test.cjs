/* Publication boundaries for the additive Menu preview; no browser or remote writes. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),vm=require('node:vm'),{spawnSync,execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'../..'),builderPath='scripts/build-dobby-menu-review.cjs';
const prefix='dobby-review-v7-menu-20261112|',familyPrefix='dobby-review-v7-famille-20261112|',globalPrefix='dobby-review-v7-global-20261112|';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const run=(args,cwd=repo)=>spawnSync(process.execPath,[path.join(cwd,builderPath),...args],{cwd,encoding:'utf8'});
const read=(root,file)=>fs.readFileSync(path.join(root,file),'utf8');

test('Menu bundle isolates Family storage and preserves native bytes with complete provenance',async t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dobby-menu-review-')),out=path.join(temp,'bundle');
 const paths=execFileSync('git',['ls-files','--','essai-stitch-v7','essai-stitch-v5-famille','essai-v6-preview/assets','scripts/build-dobby-review.cjs','scripts/build-dobby-global-review.cjs','scripts/build-dobby-family-review.cjs','scripts/review'],{cwd:repo,encoding:'utf8'}).trim().split('\n').filter(file=>file&&!file.includes('/tests/'));
 const before=Object.fromEntries(paths.map(file=>[file,hash(fs.readFileSync(path.join(repo,file)))]));
 try{
  const built=run(['--allow-dirty','--output',out]);assert.equal(built.status,0,'Menu preview must build: '+built.stderr);
  const manifest=JSON.parse(read(out,'review-manifest.json'));
  await t.test('new Menu entry, source state, namespaces and builder chain are explicit',()=>{
   assert.equal(manifest.version,'V7-MENU');assert.equal(manifest.entry,'essai-stitch-v7/famille.html?client=A#menu');
   assert.equal(manifest.sourceSha,execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim());
   assert.equal(manifest.sourceState,manifest.sourceDirtyPaths.length?'working-tree':'committed');
   assert.deepEqual(manifest.comparison,{baselineSha:'5b764ef367553e9945fb72a6b563b55adc41e040',candidateSha:'3f7fe0e36e1e142cefaada5d575196c436b444e4'});
   for(const[key,suffix]of [['storagePrefix','client-{A|B}|'],['sharedFixtureKey','backend-v1'],['selectedClientKey','selected-client'],['resetKey','reset-in-progress'],['resetChannel','reset'],['backendLock','backend-v1']])assert.equal(manifest[key],prefix+suffix,key);
   assert.equal(manifest.realBackend,false);assert.equal(manifest.realAuth,false);assert.equal(manifest.migrationsApplied,false);assert.equal(manifest.publication,'new-directory-only');
   assert.deepEqual(manifest.builderSource,{path:builderPath,sha256:hash(fs.readFileSync(path.join(repo,builderPath)))});
   for(const file of ['scripts/build-dobby-family-review.cjs','scripts/build-dobby-global-review.cjs','scripts/build-dobby-review.cjs'])assert.ok(manifest.inheritedBuilders.some(row=>row.path===file&&row.sha256===before[file]),file+' provenance');
   const index=read(out,'index.html');assert.ok(index.includes('url=./'+manifest.entry));assert.ok(index.includes('famille.html?client=B#menu'));
  });
  await t.test('every shipped resource and source has its actual hash; no source is changed',()=>{
   const files=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(entry.name!=='review-manifest.json')files.push(path.relative(out,file).split(path.sep).join('/'));}}walk(out);
   assert.deepEqual(manifest.files.map(row=>row.path).sort(),files.sort());
   for(const row of manifest.files){assert.equal(hash(fs.readFileSync(path.join(out,row.path))),row.sha256,row.path+' shipped');if(row.sourceSha256)assert.equal(hash(fs.readFileSync(path.join(repo,row.sourcePath||row.path))),row.sourceSha256,row.path+' source');}
   for(const[file,field]of [['review-config.js','configSha256'],['family-config.js','familyConfigSha256'],['global-demo.js','fixtureSha256'],['review-runtime.js','runtimeSha256'],['README.md','readmeSha256']])assert.equal(hash(fs.readFileSync(path.join(out,file))),manifest[field],field);
   for(const file of ['essai-stitch-v5-famille/family-modules.js','essai-stitch-v5-famille/family-runes-core.mjs','essai-stitch-v7/chat.js','essai-stitch-v7/house-register.js'])assert.equal(hash(fs.readFileSync(path.join(out,file))),before[file],file+' native bytes');
   assert.deepEqual(Object.fromEntries(paths.map(file=>[file,hash(fs.readFileSync(path.join(repo,file)))])),before);
  });
  await t.test('transport changes only its namespace and inherited loading stays local',()=>{
   for(const[file,source]of [['review-config.js','scripts/review/global-config.js'],['global-demo.js','scripts/review/global-demo.js']]){
    assert.equal(read(out,file),read(repo,source).replaceAll(globalPrefix,prefix),file+' exact namespace-only transformation');
    const row=manifest.files.find(row=>row.path===file);assert.ok(row.transforms.some(change=>change.type==='namespace-substitution'&&change.from===familyPrefix&&change.to===prefix));
   }
   for(const row of manifest.files.filter(row=>row.path.endsWith('.html'))){
    const html=read(out,row.path).replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi,'$1</script>');
    for(const match of html.matchAll(/<(?:script|link|img|iframe)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)){
     const ref=match[1];if(/^(?:data:|blob:|#)/.test(ref))continue;
     const target=new URL(ref,new URL(row.path,'https://menu.invalid/'));
     assert.equal(target.origin,'https://menu.invalid',row.path+' resource '+ref);assert.ok(fs.existsSync(path.join(out,decodeURIComponent(target.pathname))),row.path+' local resource '+ref);
    }
   }
   for(const file of ['essai-stitch-v7/famille.html','essai-stitch-v5-famille/index.html']){
    const html=read(out,file),order=['review-config.js','family-config.js','review-runtime.js','global-demo.js'].map(script=>html.indexOf(script));assert.ok(order.every((n,i)=>n>=0&&(!i||n>order[i-1])));assert.match(html,/connect-src 'self'/);
   }
  });
  await t.test('Menu retains both fictional Family personas and rejects a mismatched namespace',()=>{
   for(const client of ['A','B']){
    function config(global,family){const top={location:{href:'https://menu.invalid/essai-stitch-v7/famille.html?client='+client,search:'?client='+client}},session=new Map();const context={URL,URLSearchParams,Date,Object,window:top,top,location:top.location,history:{replaceState(){}},sessionStorage:{getItem:key=>session.get(key)||null,setItem:(key,value)=>session.set(key,value)}};vm.runInNewContext(global,context);vm.runInNewContext(family,context);return{cfg:top.DobbyReviewConfig,session};}
    const menu=config(read(out,'review-config.js'),read(out,'family-config.js')),family=config(read(repo,'scripts/review/global-config.js').replaceAll(globalPrefix,familyPrefix),read(repo,'scripts/review/family-config.js'));
    assert.equal(menu.cfg.version,'V7-MENU');assert.equal(menu.cfg.storagePrefix,prefix+'client-'+client+'|');assert.equal(menu.session.get(prefix+'selected-client'),client);assert.equal(menu.cfg.demoMemberId,client==='B'?'review-person-b':'review-person');
    assert.deepEqual(JSON.parse(JSON.stringify(menu.cfg.initialState('2026-11-12'))),JSON.parse(JSON.stringify(family.cfg.initialState('2026-11-12'))),'No fictional fixture or native permission input changes');
    assert.throws(()=>config(read(repo,'scripts/review/global-config.js').replaceAll(globalPrefix,familyPrefix),read(out,'family-config.js')),/isolated global configuration/);
   }
  });
  await t.test('an existing output is never replaced',()=>{
   const prior=read(out,'review-manifest.json'),again=run(['--allow-dirty','--output',out]);assert.notEqual(again.status,0);assert.match(again.stderr,/Output must be a new directory/);assert.equal(read(out,'review-manifest.json'),prior);
  });
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('Menu guard rejects its own uncommitted builder and inherited fixture before output creation',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dobby-menu-guard-'));
 try{
  fs.mkdirSync(path.join(temp,'scripts/review'),{recursive:true});
  for(const file of [builderPath,'scripts/build-dobby-family-review.cjs','scripts/review/family-config.js'])fs.copyFileSync(path.join(repo,file),path.join(temp,file));
  const git=args=>execFileSync('git',args,{cwd:temp,encoding:'utf8'});git(['init','-q']);git(['add','.']);git(['-c','user.name=Local fixture','-c','user.email=fixture@example.test','commit','-qm','Local fixture']);
  for(const file of [builderPath,'scripts/review/family-config.js']){
   const previous=fs.readFileSync(path.join(temp,file));fs.appendFileSync(path.join(temp,file),'\n/* uncommitted fixture */\n');const out=path.join(temp,path.basename(file)+'-output'),result=run(['--output',out],temp);assert.notEqual(result.status,0);assert.match(result.stderr,/Production sources are uncommitted/);assert.ok(result.stderr.includes(file));assert.equal(fs.existsSync(out),false);fs.writeFileSync(path.join(temp,file),previous);
  }
  const invalid=run(['--output'],temp);assert.notEqual(invalid.status,0);assert.match(invalid.stderr,/--output requires a new directory path/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

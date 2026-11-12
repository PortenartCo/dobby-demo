/* Additive family preview: reuse the current global isolation/backend/reset pipeline. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..'),arg=process.argv.indexOf('--output');
if(arg>=0&&(!process.argv[arg+1]||process.argv[arg+1].startsWith('--')))throw Error('--output requires a new directory path.');
const out=arg<0?path.join(repo,'essai-dobby-v7-famille-review-20261112'):path.resolve(process.argv[arg+1]);
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const prefix='dobby-review-v7-famille-20261112|',oldPrefix='dobby-review-v7-global-20261112|';
if(fs.existsSync(out))throw Error('Output must be a new directory: '+out);
const sourcePaths=['essai-stitch-v7','essai-stitch-v5-famille','essai-v6-preview/assets','scripts/build-dobby-review.cjs','scripts/build-dobby-global-review.cjs','scripts/build-dobby-family-review.cjs','scripts/review'];
const dirty=execFileSync('git',['status','--porcelain','--untracked-files=all','--',...sourcePaths],{cwd:repo,encoding:'utf8'}).split('\n').filter(Boolean).map(line=>line.slice(3)).filter(file=>!file.includes('/tests/'));
const allowDirty=process.argv.includes('--allow-dirty');
if(dirty.length&&!allowDirty)throw Error('Production sources are uncommitted; commit them or explicitly use --allow-dirty for local evidence: '+dirty.join(', '));
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
execFileSync(process.execPath,[path.join(__dirname,'build-dobby-global-review.cjs'),'--output',out,...(allowDirty?['--allow-dirty']:[])],{cwd:repo,stdio:'inherit'});
const manifestPath=path.join(out,'review-manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath));
const inheritedBuilders=[manifest.builderSource,{path:'scripts/build-dobby-review.cjs',sha256:hash(fs.readFileSync(path.join(__dirname,'build-dobby-review.cjs')))}];
function recordBytes(file,bytes){
 fs.writeFileSync(path.join(out,file),bytes);
 const record=manifest.files.find(row=>row.path===file);
 if(!record)throw Error('Inherited manifest resource missing: '+file);
 record.sha256=hash(bytes);if(record.sourceSha256)record.transformed=record.sha256!==record.sourceSha256;
 return record;
}
for(const file of ['review-config.js','global-demo.js']){
 const source=fs.readFileSync(path.join(out,file),'utf8'),occurrences=source.split(oldPrefix).length-1;
 if(!occurrences)throw Error('Global namespace marker changed; review required: '+file);
 const record=recordBytes(file,source.replaceAll(oldPrefix,prefix));
 record.transforms=[{type:'namespace-substitution',from:oldPrefix,to:prefix,occurrences}];
}
const familyConfig=fs.readFileSync(path.join(__dirname,'review/family-config.js'));
fs.writeFileSync(path.join(out,'family-config.js'),familyConfig);
manifest.files.push({path:'family-config.js',sourcePath:'scripts/review/family-config.js',sourceSha256:hash(familyConfig),sha256:hash(familyConfig),transformed:false});
for(const record of manifest.files){
 if(!record.path.endsWith('.html')||record.path==='index.html')continue;
 const file=path.join(out,record.path),source=fs.readFileSync(file,'utf8'),marker=/(<script src="[^"]*review-config\.js"><\/script>)/;
 if(!/<head>/.test(source))continue;
 if(!marker.test(source))throw Error('Inherited review configuration missing: '+record.path);
 const relative=path.relative(path.dirname(file),path.join(out,'family-config.js')).split(path.sep).join('/');
 recordBytes(record.path,source.replace(marker,'$1<script src="'+relative+'"></script>'));
 record.transforms=[...(record.transforms||[]),{type:'script-injection',script:'family-config.js',after:'review-config.js',before:'review-runtime.js'}];
}
const entry='essai-stitch-v7/famille.html?client=A';
recordBytes('index.html','<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./'+entry+'"><title>DOBBY V7 — Revue Famille</title></head><body><p>Foyer fictif Famille : deux parents et trois profils dépendants, aucun compte réel.</p><a href="./'+entry+'">Commencer avec A</a> · <a href="./essai-stitch-v7/famille.html?client=B">Ouvrir B</a></body></html>\n');
recordBytes('README.md','# DOBBY V7 — Revue Famille isolée\n\nEntrée : `index.html`, puis `essai-stitch-v7/famille.html?client=A` ou `?client=B`. Deux parents fictifs et trois profils dépendants (bébé, enfant, animal) permettent de parcourir les écrans Famille et leur politique native de démonstration. Les identités et les résultats magiques E05 préremplis sont fictifs. Les autorisations ne représentent pas une association de compte vérifiée par un serveur.\n\nLes clients A et B partagent uniquement le backend simulé de cet essai dans le même navigateur. Le constructeur réutilise le pipeline global courant et conserve ses corrections de synchronisation, de restauration des documents et de réinitialisation. Le script du backend reste identique, à la substitution exacte de son espace de stockage près. Les formulaires, modules et writers restent natifs.\n\nAucun compte réel, aucune connexion à Supabase, aucune migration SQL, aucune invitation réelle ni appel IA payant. La politique CSP bloque les connexions externes. HTTPS ou localhost, IndexedDB et Web Locks sont nécessaires à la simulation A/B. Le manifeste retrace les sources, transformations et empreintes SHA-256. Le constructeur exige des sources commises par défaut ; `--allow-dirty` sert uniquement aux preuves locales. Chaque construction crée un nouveau répertoire et refuse de remplacer un essai existant.\n');
Object.assign(manifest,{
 version:'V7-FAMILLE',base:'6a6fcd9bcee522da7342de391e5c3d7bfe1955b3',familySource:'a28a1e74e6fd6fcb0db8b154002ce032ae10f130',sourceSha,entry,
 sourceState:dirty.length?'working-tree':'committed',sourceDirtyPaths:dirty,
 storagePrefix:prefix+'client-{A|B}|',sharedFixtureKey:prefix+'backend-v1',selectedClientKey:prefix+'selected-client',resetKey:prefix+'reset-in-progress',resetChannel:prefix+'reset',backendLock:prefix+'backend-v1',
 realBackend:false,realAuth:false,migrationsApplied:false,configSha256:hash(fs.readFileSync(path.join(out,'review-config.js'))),familyConfigSha256:hash(familyConfig),fixtureSha256:hash(fs.readFileSync(path.join(out,'global-demo.js'))),
 builderSource:{path:'scripts/build-dobby-family-review.cjs',sha256:hash(fs.readFileSync(__filename))},inheritedBuilders,
 familyFixture:{parents:['review-person','review-person-b'],dependents:['review-baby','review-child','review-pet'],permissionPolicy:'native-demo-only; explicit-parent-category; no-server-authorization-claim',magicProfile:'native E05 version-1 catalogue IDs; fictional prefilled results'},
 publication:'new-directory-only',readmeSha256:hash(fs.readFileSync(path.join(out,'README.md')))
});
manifest.files.sort((a,b)=>a.path.localeCompare(b.path));
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log('FAMILY_REVIEW_BUILD',manifest.sourceSha,manifest.sourceState,out);

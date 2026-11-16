/* Additive partial review: reuse Notes -> Family -> Global; never alter native sources. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..'),arg=process.argv.indexOf('--output');
if(arg>=0&&(!process.argv[arg+1]||process.argv[arg+1].startsWith('--')))throw Error('--output requires a new directory path.');
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8'}).trim();
const sourceSha=git('rev-parse','HEAD'),prefix='dobby-review-v7-consolidated-'+sourceSha+'|',oldPrefix='dobby-review-v7-notes-stitch23-20261116|';
const sourceComponents={archives:git('rev-parse','f8c7876'),notes:git('rev-parse','1913e98'),settings:git('rev-parse','b6864bb')};
for(const [component,commit]of Object.entries(sourceComponents))try{git('merge-base','--is-ancestor',commit,sourceSha);}catch{throw Error('Merge the reviewed '+component+' source before generating this partial consolidation: '+commit);}
const out=arg<0?path.join(repo,'essai-dobby-v7-consolidated-partial-'+sourceSha.slice(0,12)):path.resolve(process.argv[arg+1]);
if(fs.existsSync(out))throw Error('Output must be a new directory: '+out);
const sourcePaths=['essai-stitch-v7','essai-stitch-v5-famille','essai-v6-preview/assets','scripts/build-dobby-review.cjs','scripts/build-dobby-global-review.cjs','scripts/build-dobby-family-review.cjs','scripts/build-dobby-notes-review.cjs','scripts/build-dobby-consolidated-review.cjs','scripts/review'];
const dirty=execFileSync('git',['status','--porcelain','--untracked-files=all','--',...sourcePaths],{cwd:repo,encoding:'utf8'}).split('\n').filter(Boolean).map(line=>line.slice(3)).filter(file=>!file.includes('/tests/'));
const allowDirty=process.argv.includes('--allow-dirty');
if(dirty.length&&!allowDirty)throw Error('Production sources are uncommitted; commit them or use --allow-dirty for local evidence: '+dirty.join(', '));
const builder=path.join(__dirname,'build-dobby-notes-review.cjs');
if(!fs.existsSync(builder))throw Error('Merge the reviewed Notes builder before generating this partial consolidation.');
const illustrations=[
 {stitch:22,path:'essai-stitch-v7/assets/archives/stitch22.png',sourceArchive:'DOBBY_V7_ARCHIVES_STITCH22_CODEX_20261113.zip',sourceEntry:'assets/Stitch22-screen.png'},
 {stitch:23,path:'essai-stitch-v7/assets/notes-stitch23.png',sourceArchive:'stitch_dobby_assistant_mobile_app (23).zip',sourceEntry:'screen.png'}
];
for(const art of illustrations)if(!fs.existsSync(path.join(repo,art.path)))throw Error('Reviewed illustration missing: '+art.path);
execFileSync(process.execPath,[builder,'--output',out,...(allowDirty?['--allow-dirty']:[])],{cwd:repo,stdio:'inherit'});
const manifestPath=path.join(out,'review-manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath));
const inheritedBuilders=[manifest.builderSource,...manifest.inheritedBuilders],hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function recordBytes(file,bytes,transforms=[]){
 const record=manifest.files.find(row=>row.path===file);if(!record)throw Error('Inherited resource missing: '+file);
 fs.writeFileSync(path.join(out,file),bytes);record.sha256=hash(bytes);if(record.sourceSha256)record.transformed=record.sha256!==record.sourceSha256;
 record.transforms=[...(record.transforms||[]),...transforms];return record;
}
const scope='Consolidation partielle Archives + Notes + Paramètres. Contacts historiques seulement : source Stitch 24 non retrouvée. Aucune promotion générale. Deux clients fictifs A/B partagent uniquement la simulation de cet aperçu dans le même navigateur ; aucun compte réel, serveur distant, invitation réelle, migration SQL ou appel IA payant. Les droits parentaux de la fixture ne prouvent aucune autorisation serveur. La recette familiale réelle reste différée.';
for(const file of ['review-config.js','global-demo.js','family-config.js']){
 const source=fs.readFileSync(path.join(out,file),'utf8'),occurrences=source.split(oldPrefix).length-1;
 if(!occurrences)throw Error('Notes namespace marker changed: '+file);
 let output=source.replaceAll(oldPrefix,prefix);
 const transforms=[{type:'namespace-substitution',from:oldPrefix,to:prefix,occurrences}];
 const replaceOnce=(from,to,type='review-label-substitution')=>{if(output.split(from).length!==2)throw Error('Review marker changed: '+from);output=output.replace(from,to);transforms.push({type,from,to,occurrences:1});};
 if(file==='family-config.js'){
  replaceOnce("version:'V7-NOTES-STITCH23'","version:'V7-CONSOLIDATED-PARTIAL'");
  replaceOnce('DOBBY V7 · Notes fictives · ','DOBBY V7 · Archives + Notes + Paramètres · partiel · ');
  const info=output.match(/^  info:'.*',$/m);if(!info)throw Error('Notes review scope marker changed.');
  replaceOnce(info[0],'  info:'+JSON.stringify(scope)+',','partial-review-scope');
 }
 if(file==='global-demo.js')replaceOnce("label.textContent='DOBBY V7 · foyer fictif · Client '+client;","label.textContent='DOBBY V7 · Archives + Notes + Paramètres · partiel · '+client;label.title="+JSON.stringify(scope)+';');
 recordBytes(file,output,transforms);
}
const entry='essai-stitch-v7/famille.html?client=A#settings';
recordBytes('index.html','<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./'+entry+'"><title>DOBBY V7 — Consolidation partielle</title></head><body><p>'+scope+'</p><a href="./'+entry+'">Ouvrir les Paramètres — client A</a> · <a href="./essai-stitch-v7/famille.html?client=B#settings">Ouvrir le client B</a></body></html>\n',[{type:'partial-review-entry',entry}]);
recordBytes('README.md','# DOBBY V7 — Consolidation partielle Archives + Notes + Paramètres\n\n'+scope+'\n\nEntrée : `'+entry+'`. Sources natives actuelles, enveloppe Notes → Famille → Global réutilisée ; aucun moteur modifié par ce constructeur. Menu, Maison, Contrats, Famille, Courses et Repas restent des parcours historiques présents dans cette composition. Leur présence ne constitue aucune nouvelle validation générale. Contacts reste son implémentation historique ; aucun comportement, visuel ou droit Contacts/Stitch 24 n’est revendiqué.\n\nLes illustrations Stitch 22 et 23 sont copiées sans modification artistique. Le manifeste contient les empreintes SHA-256 de toutes les ressources, les sources et les transformations. Le namespace de stockage, les clients A/B, le backend fictif, les clés, le canal de réinitialisation et le verrou sont propres au SHA source de cette consolidation. Les anciens aperçus restent indépendants. `--allow-dirty` est réservé aux preuves locales, identifiées par `sourceState: working-tree`.\n\nAucun compte réel, accès Supabase, migration SQL, activation de droit réel, invitation réelle, nouveau service ou appel IA payant. La CSP et le runtime bloquent les connexions externes ; le backend HTTP est une fixture dans le navigateur. HTTPS ou localhost, IndexedDB et Web Locks sont nécessaires. La simulation A/B entre onglets d’un même navigateur ne valide pas deux comptes réels ni deux appareils. La recette familiale réelle, les limites natives de chaque module et la validation physique iPhone restent différées.\n\nLa réinitialisation A/B ne vise que le namespace de cet aperçu. Ce constructeur crée un nouveau répertoire et refuse tout remplacement.\n',[{type:'partial-review-documentation'}]);
Object.assign(manifest,{
 version:'V7-CONSOLIDATED-PARTIAL',sourceSha,entry,sourceState:dirty.length?'working-tree':'committed',sourceDirtyPaths:dirty,
 storageNamespace:prefix,storagePrefix:prefix+'client-{A|B}|',sharedFixtureKey:prefix+'backend-v1',selectedClientKey:prefix+'selected-client',resetKey:prefix+'reset-in-progress',resetChannel:prefix+'reset',backendLock:prefix+'backend-v1',
 composition:{status:'partial',included:['Archives / Stitch 22','Notes du foyer / Stitch 23','Paramètres'],archivesSourceSha:sourceComponents.archives,notesSourceSha:sourceComponents.notes,settingsSourceSha:sourceComponents.settings,contacts:{status:'historical-only',stitch24SourceAvailable:false,stitch24FeaturesClaimed:false,stitch24PermissionsClaimed:false},generalPromotion:false},
 limits:[scope,'Simulation A/B : onglets du même navigateur seulement ; recette deux comptes réels et validation physique iPhone différées.','Limites et permissions natives de chaque module conservées ; aucune certification générale.'],
 realBackend:false,realAuth:false,realAccountsTested:false,migrationsApplied:false,newServices:false,
 configSha256:hash(fs.readFileSync(path.join(out,'review-config.js'))),familyConfigSha256:hash(fs.readFileSync(path.join(out,'family-config.js'))),fixtureSha256:hash(fs.readFileSync(path.join(out,'global-demo.js'))),runtimeSha256:hash(fs.readFileSync(path.join(out,'review-runtime.js'))),readmeSha256:hash(fs.readFileSync(path.join(out,'README.md'))),
 builderSource:{path:'scripts/build-dobby-consolidated-review.cjs',sha256:hash(fs.readFileSync(__filename))},inheritedBuilders,
 illustrations:illustrations.map(art=>{const original=hash(fs.readFileSync(path.join(repo,art.path))),copied=hash(fs.readFileSync(path.join(out,art.path)));if(original!==copied)throw Error('Illustration changed: '+art.path);return {...art,sourceSha256:original,sha256:copied,artisticChanges:false};}),
 publication:'new-directory-only; immutable-source-SHA URL required for hosted review'
});
for(const file of ['review-config.js','global-demo.js','family-config.js']){
 const source=fs.readFileSync(path.join(out,file),'utf8');
 if(source.includes(oldPrefix)||!source.includes(prefix))throw Error('Incomplete consolidated namespace: '+file);
}
if(new Set(manifest.files.map(row=>row.path)).size!==manifest.files.length)throw Error('Duplicate manifest resource.');
for(const row of manifest.files)if(hash(fs.readFileSync(path.join(out,row.path)))!==row.sha256)throw Error('Manifest mismatch: '+row.path);
manifest.files.sort((a,b)=>a.path.localeCompare(b.path));fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log('CONSOLIDATED_PARTIAL_REVIEW_BUILD',sourceSha,manifest.sourceState,out);

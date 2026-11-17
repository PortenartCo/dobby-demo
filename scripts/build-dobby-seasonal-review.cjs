/* Extend the existing consolidated builder; no new deployment infrastructure. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..'),arg=process.argv.indexOf('--output');
if(arg>=0&&(!process.argv[arg+1]||process.argv[arg+1].startsWith('--')))throw Error('--output requires a new directory');
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
const out=arg<0?path.join(repo,'essai-dobby-v7-seasonal-'+sourceSha.slice(0,12)):path.resolve(process.argv[arg+1]);
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const allowDirty=process.argv.includes('--allow-dirty');
const sourcePaths=['scripts/build-dobby-seasonal-review.cjs','scripts/review/seasonal-preview.js'];
const dirty=execFileSync('git',['status','--porcelain','--',...sourcePaths],{cwd:repo,encoding:'utf8'}).trim();
if(dirty&&!allowDirty)throw Error('Commit the seasonal review builder before publishing');
execFileSync(process.execPath,[path.join(__dirname,'build-dobby-consolidated-review.cjs'),'--output',out,...(allowDirty?['--allow-dirty']:[])],{cwd:repo,stdio:'inherit'});
const manifestPath=path.join(out,'review-manifest.json'),m=JSON.parse(fs.readFileSync(manifestPath));
const from=m.storageNamespace,to='dobby-review-v7-seasonal-'+sourceSha+'|';
function write(file,bytes,type){
 fs.writeFileSync(path.join(out,file),bytes);let row=m.files.find(value=>value.path===file);
 if(!row){row={path:file,generated:true};m.files.push(row);}
 row.sha256=hash(bytes);if(row.sourceSha256)row.transformed=row.sha256!==row.sourceSha256;
 row.transforms=[...(row.transforms||[]),{type}];
}
for(const row of [...m.files]){
 const file=row.path;
 if(['review-config.js','global-demo.js','family-config.js'].includes(file))write(file,fs.readFileSync(path.join(out,file),'utf8').replaceAll(from,to),'seasonal-review-namespace');
 if(/^essai-stitch-v7\/(index|traverse|missions|famille)\.html$/.test(file))write(file,fs.readFileSync(path.join(out,file),'utf8').replace('</head>','<script src="../seasonal-preview.js"></script></head>'),'seasonal-review-controls-only');
}
const reviewSource=fs.readFileSync(path.join(__dirname,'review/seasonal-preview.js'));
write('seasonal-preview.js',reviewSource,'review-only-date-controller');
Object.assign(m.files.find(row=>row.path==='seasonal-preview.js'),{sourcePath:'scripts/review/seasonal-preview.js',sourceSha256:hash(reviewSource),transformed:false});
const entry='essai-stitch-v7/traverse.html?client=A';
write('index.html','<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./'+entry+'"><title>DOBBY — Revue des saisons</title></head><body><a href="./'+entry+'">Ouvrir l’aperçu saisonnier isolé</a></body></html>\n','seasonal-review-entry');
write('README.md','# DOBBY — Ambiances saisonnières\n\nSource : '+sourceSha+'. Entrée : '+entry+'. Ouvrir « Revue des saisons » pour choisir Noël 2026, les autres périodes ou une date fictive. Le volet peut être refermé. La date réelle des tâches et l’horloge ne changent jamais. La date de revue persiste uniquement dans la session de cet aperçu ; le bouton Date réelle la retire.\n\nParamètres > Ambiance magique : Décorations saisonnières, Effets magiques et Sons. Les décors restent statiques avec les effets OFF ou les animations réduites. Le 31 janvier : une seule séquence de runes de cinq secondes par session et année.\n\nLa composition, la CSP, les comptes fictifs et le blocage des connexions externes proviennent du constructeur de revue consolidée existant. Namespace propre à cet aperçu. Aucun compte réel, changement Supabase, appel IA, migration ni nouveau service. Publication additive du seul dossier ; aucun fichier applicatif principal promu.\n','seasonal-review-documentation');
for(const key of ['storageNamespace','storagePrefix','sharedFixtureKey','selectedClientKey','resetKey','resetChannel','backendLock'])if(typeof m[key]==='string')m[key]=m[key].replaceAll(from,to);
Object.assign(m,{version:'V7-SEASONAL',entry,sourceSha,sourceState:dirty?'working-tree':m.sourceState,seasonal:{timezone:'Europe/Brussels',calendar:'essai-stitch-v7/seasonal-calendar.js',previewController:'seasonal-preview.js',dateOverride:'review-only; business-clock-unchanged',preference:'st.stitchPreferences.seasonalDecorations',valentinePriority:true,magicBurst:'once-per-session-year; 5 seconds'},builderSource:{path:'scripts/build-dobby-seasonal-review.cjs',sha256:hash(fs.readFileSync(__filename))},inheritedBuilders:[m.builderSource,...m.inheritedBuilders]});
for(const [field,file]of Object.entries({configSha256:'review-config.js',familyConfigSha256:'family-config.js',fixtureSha256:'global-demo.js',runtimeSha256:'review-runtime.js',readmeSha256:'README.md'}))m[field]=hash(fs.readFileSync(path.join(out,file)));
for(const row of m.files)if(hash(fs.readFileSync(path.join(out,row.path)))!==row.sha256)throw Error('Manifest mismatch: '+row.path);
m.files.sort((a,b)=>a.path.localeCompare(b.path));fs.writeFileSync(manifestPath,JSON.stringify(m,null,2)+'\n');console.log('SEASONAL_REVIEW_BUILD',sourceSha,m.sourceState,out);

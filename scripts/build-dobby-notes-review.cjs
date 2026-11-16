/* Notes preview envelope; native sources and all earlier previews stay intact. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..'),arg=process.argv.indexOf('--output');
if(arg>=0&&(!process.argv[arg+1]||process.argv[arg+1].startsWith('--')))throw Error('--output requires a new directory path.');
const out=arg<0?path.join(repo,'essai-dobby-v7-notes-stitch23-review-20261116'):path.resolve(process.argv[arg+1]);
if(fs.existsSync(out))throw Error('Output must be a new directory: '+out);
const sourcePaths=['essai-stitch-v7','essai-stitch-v5-famille','essai-v6-preview/assets','scripts/build-dobby-review.cjs','scripts/build-dobby-global-review.cjs','scripts/build-dobby-family-review.cjs','scripts/build-dobby-notes-review.cjs','scripts/review'];
const dirty=execFileSync('git',['status','--porcelain','--untracked-files=all','--',...sourcePaths],{cwd:repo,encoding:'utf8'}).split('\n').filter(Boolean).map(line=>line.slice(3)).filter(file=>!file.includes('/tests/'));
const allowDirty=process.argv.includes('--allow-dirty');
if(dirty.length&&!allowDirty)throw Error('Production sources are uncommitted; commit them or use --allow-dirty for local evidence: '+dirty.join(', '));
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
execFileSync(process.execPath,[path.join(__dirname,'build-dobby-family-review.cjs'),'--output',out,...(allowDirty?['--allow-dirty']:[])],{cwd:repo,stdio:'inherit'});
const manifestPath=path.join(out,'review-manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath));
const inheritedBuilders=[manifest.builderSource,...manifest.inheritedBuilders];
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const prefix='dobby-review-v7-notes-stitch23-20261116|',oldPrefix='dobby-review-v7-famille-20261112|';
function recordBytes(file,bytes){const record=manifest.files.find(row=>row.path===file);if(!record)throw Error('Inherited resource missing: '+file);fs.writeFileSync(path.join(out,file),bytes);record.sha256=hash(bytes);if(record.sourceSha256)record.transformed=record.sha256!==record.sourceSha256;return record;}
for(const file of ['review-config.js','global-demo.js','family-config.js']){
 const source=fs.readFileSync(path.join(out,file),'utf8'),occurrences=source.split(oldPrefix).length-1;
 if(!occurrences)throw Error('Family namespace marker changed: '+file);
 let output=source.replaceAll(oldPrefix,prefix);
 const transforms=[{type:'namespace-substitution',from:oldPrefix,to:prefix,occurrences}];
 if(file==='family-config.js'){
  for(const[from,to]of [["version:'V7-FAMILLE'","version:'V7-NOTES-STITCH23'"],['DOBBY V7 · Famille fictive · ','DOBBY V7 · Notes fictives · '],['Revue Famille fictive :','Revue Notes du foyer ; données fictives :']]){if(output.split(from).length!==2)throw Error('Family review marker changed: '+from);output=output.replace(from,to);transforms.push({type:'review-label-substitution',from,to,occurrences:1});}
  const from='   return state;',to="   state.sharedFamilyNotes=[{id:'review-notes-stitch23',title:'DÉMO — Préparer la soirée en famille',body:'Prévoir les jeux, les couvertures et une boisson chaude.\\nLe carnet des idées se trouve dans le salon.',tags:'famille, soirée, idées'}];\n"+from;
  if(output.split(from).length!==2)throw Error('Family fixture return changed.');
  output=output.replace(from,to);transforms.push({type:'fictional-notes-fixture',from,to,occurrences:1});
 }
 const record=recordBytes(file,output);record.transforms=[...(record.transforms||[]),...transforms];
}
const entry='essai-stitch-v7/famille.html?client=A#memos';
recordBytes('index.html','<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./'+entry+'"><title>DOBBY V7 — Notes du foyer</title></head><body><p>Notes fictives ; aucun compte réel.</p><a href="./'+entry+'">Ouvrir les Notes du foyer</a></body></html>\n');
recordBytes('README.md','# DOBBY V7 — Notes du foyer / Stitch 23\n\nEntrée : `index.html`. Pour une consultation locale : lancer `python3 -m http.server 8873 --bind 127.0.0.1` dans ce répertoire, puis ouvrir http://127.0.0.1:8873/.\n\nAperçu autonome, données fictives, stockage et backend simulé propres à cet essai. Formulaires et writers natifs. Le PNG Stitch 23 est copié sans modification. Les anciens mémos locaux restent accessibles et ne sont partagés que sur confirmation. Les commandes de simulation de la barre de revue sont extérieures au module produit.\n\nAucun compte réel, connexion à Supabase, migration SQL, activation de droits supplémentaires ou modification du site principal. La CSP bloque les connexions externes. Les scénarios A/B ne valident pas une synchronisation entre deux comptes réels. La recette familiale réelle reste différée.\n');
Object.assign(manifest,{
 version:'V7-NOTES-STITCH23',sourceSha,entry,sourceState:dirty.length?'working-tree':'committed',sourceDirtyPaths:dirty,
 storagePrefix:prefix+'client-{A|B}|',sharedFixtureKey:prefix+'backend-v1',selectedClientKey:prefix+'selected-client',resetKey:prefix+'reset-in-progress',resetChannel:prefix+'reset',backendLock:prefix+'backend-v1',
 configSha256:hash(fs.readFileSync(path.join(out,'review-config.js'))),familyConfigSha256:hash(fs.readFileSync(path.join(out,'family-config.js'))),fixtureSha256:hash(fs.readFileSync(path.join(out,'global-demo.js'))),readmeSha256:hash(fs.readFileSync(path.join(out,'README.md'))),
 builderSource:{path:'scripts/build-dobby-notes-review.cjs',sha256:hash(fs.readFileSync(__filename))},inheritedBuilders,
 illustration:{path:'essai-stitch-v7/assets/notes-stitch23.png',sourceArchive:'stitch_dobby_assistant_mobile_app (23).zip',sourceEntry:'screen.png',sha256:hash(fs.readFileSync(path.join(out,'essai-stitch-v7/assets/notes-stitch23.png'))),artisticChanges:false},realAccountsTested:false
});
manifest.files.sort((a,b)=>a.path.localeCompare(b.path));fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log('NOTES_REVIEW_BUILD',sourceSha,manifest.sourceState,out);

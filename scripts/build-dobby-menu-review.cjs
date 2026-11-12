/* Additive Menu envelope; the Family builder and native application stay unchanged. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..'),arg=process.argv.indexOf('--output');
if(arg>=0&&(!process.argv[arg+1]||process.argv[arg+1].startsWith('--')))throw Error('--output requires a new directory path.');
const out=arg<0?path.join(repo,'essai-dobby-v7-menu-review-20261112'):path.resolve(process.argv[arg+1]);
if(fs.existsSync(out))throw Error('Output must be a new directory: '+out);
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const prefix='dobby-review-v7-menu-20261112|',oldPrefix='dobby-review-v7-famille-20261112|';
const sourcePaths=['essai-stitch-v7','essai-stitch-v5-famille','essai-v6-preview/assets','scripts/build-dobby-review.cjs','scripts/build-dobby-global-review.cjs','scripts/build-dobby-family-review.cjs','scripts/build-dobby-menu-review.cjs','scripts/review'];
const dirty=execFileSync('git',['status','--porcelain','--untracked-files=all','--',...sourcePaths],{cwd:repo,encoding:'utf8'}).split('\n').filter(Boolean).map(line=>line.slice(3)).filter(file=>!file.includes('/tests/'));
const allowDirty=process.argv.includes('--allow-dirty');
if(dirty.length&&!allowDirty)throw Error('Production sources are uncommitted; commit them or explicitly use --allow-dirty for local evidence: '+dirty.join(', '));
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
execFileSync(process.execPath,[path.join(__dirname,'build-dobby-family-review.cjs'),'--output',out,...(allowDirty?['--allow-dirty']:[])],{cwd:repo,stdio:'inherit'});
const manifestPath=path.join(out,'review-manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath));
const inheritedBuilders=[manifest.builderSource,...manifest.inheritedBuilders];
function recordBytes(file,bytes){
 const record=manifest.files.find(row=>row.path===file);
 if(!record)throw Error('Inherited manifest resource missing: '+file);
 fs.writeFileSync(path.join(out,file),bytes);record.sha256=hash(bytes);
 if(record.sourceSha256)record.transformed=record.sha256!==record.sourceSha256;
 return record;
}
for(const file of ['review-config.js','global-demo.js','family-config.js']){
 const source=fs.readFileSync(path.join(out,file),'utf8'),occurrences=source.split(oldPrefix).length-1;
 if(!occurrences)throw Error('Family namespace marker changed; review required: '+file);
 let output=source.replaceAll(oldPrefix,prefix);
 const transforms=[{type:'namespace-substitution',from:oldPrefix,to:prefix,occurrences}];
 if(file==='family-config.js'){
  for(const[from,to]of [["version:'V7-FAMILLE'","version:'V7-MENU'"],['DOBBY V7 · Famille fictive · ','DOBBY V7 · Menu · foyer fictif · '],['Revue Famille fictive :','Revue Menu ; foyer fictif :']]){
   if(output.split(from).length!==2)throw Error('Family review label changed; review required: '+from);
   output=output.replace(from,to);transforms.push({type:'review-label-substitution',from,to,occurrences:1});
  }
 }
 const record=recordBytes(file,output);record.transforms=[...(record.transforms||[]),...transforms];
}
const entry='essai-stitch-v7/famille.html?client=A#menu';
recordBytes('index.html','<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./'+entry+'"><title>DOBBY V7 — Revue Menu</title></head><body><p>Menu sur un foyer fictif ; aucun compte réel.</p><a href="./'+entry+'">Commencer avec A</a> · <a href="./essai-stitch-v7/famille.html?client=B#menu">Ouvrir B</a></body></html>\n');
recordBytes('README.md','# DOBBY V7 — Revue Menu isolée\n\nEntrée : `index.html`, puis `essai-stitch-v7/famille.html?client=A#menu` ou `?client=B#menu`. Le Menu utilise les pages, formulaires et writers natifs de la candidate. Les données fictives Famille et les clients A/B proviennent du constructeur Famille inchangé. Les autorisations de démonstration ne représentent aucune association de compte vérifiée par un serveur.\n\nLe backend simulé, son verrou, les stockages A/B et la réinitialisation utilisent un espace Menu distinct des aperçus Famille et global publiés. Le transport conserve exactement le code hérité, à la substitution de cet espace près. Les anciennes démonstrations ne sont pas modifiées.\n\nAucun compte réel, connexion à Supabase, migration SQL, invitation réelle ni appel IA payant. La politique CSP bloque les connexions externes. HTTPS ou localhost, IndexedDB et Web Locks sont nécessaires à la simulation A/B. Chaque construction exige des sources commises et un nouveau répertoire ; `--allow-dirty` est réservé aux preuves locales. Le manifeste consigne la comparaison source, les constructeurs hérités, les transformations et les empreintes SHA-256 de chaque ressource.\n');
Object.assign(manifest,{
 version:'V7-MENU',sourceSha,entry,sourceState:dirty.length?'working-tree':'committed',sourceDirtyPaths:dirty,
 comparison:{baselineSha:'5b764ef367553e9945fb72a6b563b55adc41e040',candidateSha:'3f7fe0e36e1e142cefaada5d575196c436b444e4'},
 storagePrefix:prefix+'client-{A|B}|',sharedFixtureKey:prefix+'backend-v1',selectedClientKey:prefix+'selected-client',resetKey:prefix+'reset-in-progress',resetChannel:prefix+'reset',backendLock:prefix+'backend-v1',
 configSha256:hash(fs.readFileSync(path.join(out,'review-config.js'))),familyConfigSha256:hash(fs.readFileSync(path.join(out,'family-config.js'))),fixtureSha256:hash(fs.readFileSync(path.join(out,'global-demo.js'))),readmeSha256:hash(fs.readFileSync(path.join(out,'README.md'))),
 builderSource:{path:'scripts/build-dobby-menu-review.cjs',sha256:hash(fs.readFileSync(__filename))},inheritedBuilders
});
manifest.files.sort((a,b)=>a.path.localeCompare(b.path));
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log('MENU_REVIEW_BUILD',manifest.sourceSha,manifest.sourceState,out);

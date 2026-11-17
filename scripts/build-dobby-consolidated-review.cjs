/* Additive integration candidate: reuse Notes -> Family -> Global; never alter native sources. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..'),arg=process.argv.indexOf('--output');
if(arg>=0&&(!process.argv[arg+1]||process.argv[arg+1].startsWith('--')))throw Error('--output requires a new directory path.');
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8'}).trim();
const sourceSha=git('rev-parse','HEAD'),prefix='dobby-review-v7-consolidated-candidate-'+sourceSha+'|',oldPrefix='dobby-review-v7-notes-stitch23-20261116|';
const sourceComponents={archives:git('rev-parse','aafdded'),contacts:git('rev-parse','27b9f9cd9a53492887ddd32047a07f588b2d3192'),notes:git('rev-parse','1913e98'),settings:git('rev-parse','b6864bb')};
for(const [component,commit]of Object.entries(sourceComponents))try{git('merge-base','--is-ancestor',commit,sourceSha);}catch{throw Error('Merge the reviewed '+component+' source before generating this integration candidate: '+commit);}
const out=arg<0?path.join(repo,'essai-dobby-v7-consolidated-candidate-'+sourceSha.slice(0,12)):path.resolve(process.argv[arg+1]);
if(fs.existsSync(out))throw Error('Output must be a new directory: '+out);
const sourcePaths=['essai-stitch-v7','essai-stitch-v5-famille','essai-v6-preview/assets','scripts/build-dobby-review.cjs','scripts/build-dobby-global-review.cjs','scripts/build-dobby-family-review.cjs','scripts/build-dobby-notes-review.cjs','scripts/build-dobby-consolidated-review.cjs','scripts/review'];
const dirty=execFileSync('git',['status','--porcelain','--untracked-files=all','--',...sourcePaths],{cwd:repo,encoding:'utf8'}).split('\n').filter(Boolean).map(line=>line.slice(3)).filter(file=>!file.includes('/tests/'));
const allowDirty=process.argv.includes('--allow-dirty');
if(dirty.length&&!allowDirty)throw Error('Production sources are uncommitted; commit them or use --allow-dirty for local evidence: '+dirty.join(', '));
const builder=path.join(__dirname,'build-dobby-notes-review.cjs');
if(!fs.existsSync(builder))throw Error('Merge the reviewed Notes builder before generating this integration candidate.');
const illustrations=[
 {stitch:22,path:'essai-stitch-v7/assets/archives/stitch22.png',sourceArchive:'DOBBY_V7_ARCHIVES_STITCH22_CODEX_20261113.zip',sourceEntry:'assets/Stitch22-screen.png'},
 {stitch:23,path:'essai-stitch-v7/assets/notes-stitch23.png',sourceArchive:'stitch_dobby_assistant_mobile_app (23).zip',sourceEntry:'screen.png'},
 {stitch:24,path:'essai-stitch-v7/assets/contacts/stitch24.png',sourceSha:sourceComponents.contacts}
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
const scope='Candidat intégré Archives + Contacts + Notes + Paramètres ; quatre sources présentes, aucune promotion générale ni déploiement applicatif. Deux clients fictifs A/B partagent uniquement la simulation de cet aperçu dans le même navigateur ; aucun compte réel, serveur distant, invitation réelle, migration SQL ou appel IA payant. Le contexte canonique fictif utilise le contrat natif dobby_v7_context ; ses permissions restent contrôlées par les modules natifs et ne prouvent aucune autorisation serveur réelle. La recette familiale réelle reste différée.';
for(const file of ['review-config.js','global-demo.js','family-config.js']){
 const source=fs.readFileSync(path.join(out,file),'utf8'),occurrences=source.split(oldPrefix).length-1;
 if(!occurrences)throw Error('Notes namespace marker changed: '+file);
 let output=source.replaceAll(oldPrefix,prefix);
 const transforms=[{type:'namespace-substitution',from:oldPrefix,to:prefix,occurrences}];
 const replaceOnce=(from,to,type='review-label-substitution')=>{if(output.split(from).length!==2)throw Error('Review marker changed: '+from);output=output.replace(from,to);transforms.push({type,from,to,occurrences:1});};
 if(file==='family-config.js'){
  replaceOnce("version:'V7-NOTES-STITCH23'","version:'V7-CONSOLIDATED-CANDIDATE'");
  replaceOnce('DOBBY V7 · Notes fictives · ','Aperçu intégré · données fictives · ');
  const info=output.match(/^  info:'.*',$/m);if(!info)throw Error('Notes review scope marker changed.');
  replaceOnce(info[0],'  info:'+JSON.stringify(scope)+',','integration-candidate-scope');
 }
 if(file==='global-demo.js'){
  replaceOnce("label.textContent='DOBBY V7 · foyer fictif · Client '+client;","label.textContent='Aperçu intégré · données fictives · '+client;");
  replaceOnce('const paths=new Set([',"const paths=new Set(['/rest/v1/rpc/dobby_v7_context',",'fictional-canonical-context-route');
  const marker=" if(url.pathname.startsWith('/rest/v1/rpc/')){",context=" if(url.pathname==='/rest/v1/rpc/dobby_v7_context'){\n  if(method!=='POST')return denied();\n  return locked(()=>{const state=read(),row=state.modules.family,member=row.payload.familyMembers.find(value=>value.id===(client==='B'?'review-person-b':'review-person'));if(!member||member.memberCategory!=='parent')return denied();state.requests.push({client,method,path:url.pathname,module:'family',revision:row.revision,simulation:'fictional-context'});write(state);return respond({protocol:1,phase:'active',userId:user,householdId:household,memberId:member.id,profile:clone(member),permissions:{canEdit:true,canMagic:true,canCreate:true,canManageDependents:true,canInvite:false},familyRevision:row.revision,pendingCeremony:false});});\n }\n";
  replaceOnce(marker,context+marker,'fictional-canonical-context-response');
 }
 recordBytes(file,output,transforms);
}
const entry='essai-stitch-v7/famille.html?client=A#settings';
recordBytes('index.html','<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./'+entry+'"><title>DOBBY V7 — Aperçu intégré</title></head><body><p>'+scope+'</p><a href="./'+entry+'">Ouvrir les Paramètres — client A</a> · <a href="./essai-stitch-v7/famille.html?client=B#settings">Ouvrir le client B</a></body></html>\n',[{type:'integration-candidate-entry',entry}]);
recordBytes('README.md','# DOBBY V7 — Candidat intégré Archives + Contacts + Notes + Paramètres\n\n'+scope+'\n\nEntrée : `'+entry+'`. Sources natives actuelles, enveloppe Notes → Famille → Global réutilisée ; aucun moteur modifié par ce constructeur. Menu, Maison, Contrats, Famille, Courses et Repas restent présents dans cette composition. Leur présence ne constitue aucune nouvelle validation générale. Les quatre sources sont incluses ; la promotion générale et tout déploiement applicatif restent désactivés dans le manifeste.\n\nLes illustrations Stitch 22, 23 et 24 sont copiées sans modification artistique. Le manifeste contient les empreintes SHA-256 de toutes les ressources, les sources et les transformations. Le namespace de stockage, les clients A/B, le backend fictif, les clés, le canal de réinitialisation et le verrou sont propres au SHA source de cette consolidation. Les anciens aperçus restent indépendants. `--allow-dirty` est réservé aux preuves locales, identifiées par `sourceState: working-tree`.\n\nLa seule extension de la fixture HTTP héritée répond au RPC natif dobby_v7_context pour les deux parents fictifs déjà présents. Le contrat est celui des tests natifs family-access-bootstrap et family-access-native ; le moteur, les contrôles de permissions et les capacités publiées restent inchangés. Les invitations simulées sont interdites ; les rôles étendus et rattachements enfant restent fermés. Cette réponse fictive ne prouve aucune liaison de compte réelle.\n\nAucun compte réel, accès Supabase, migration SQL, activation de droit réel, invitation réelle, nouveau service ou appel IA payant. La CSP et le runtime bloquent les connexions externes ; le backend HTTP est une fixture dans le navigateur. HTTPS ou localhost, IndexedDB et Web Locks sont nécessaires. La simulation A/B entre onglets d’un même navigateur ne valide pas deux comptes réels ni deux appareils. La recette familiale réelle, les limites natives de chaque module et la validation physique iPhone restent différées.\n\nLa réinitialisation A/B ne vise que le namespace de cet aperçu. Ce constructeur crée un nouveau répertoire et refuse tout remplacement.\n',[{type:'integration-candidate-documentation'}]);
Object.assign(manifest,{
 version:'V7-CONSOLIDATED-CANDIDATE',status:'candidate',completeSources:true,deployment:false,sourceSha,entry,sourceState:dirty.length?'working-tree':'committed',sourceDirtyPaths:dirty,
 storageNamespace:prefix,storagePrefix:prefix+'client-{A|B}|',sharedFixtureKey:prefix+'backend-v1',selectedClientKey:prefix+'selected-client',resetKey:prefix+'reset-in-progress',resetChannel:prefix+'reset',backendLock:prefix+'backend-v1',
 composition:{status:'candidate',completeSources:true,deployment:false,included:['Archives / Stitch 22','Contacts / Stitch 24','Notes du foyer / Stitch 23','Paramètres'],archivesSourceSha:sourceComponents.archives,notesSourceSha:sourceComponents.notes,settingsSourceSha:sourceComponents.settings,contacts:{status:'included',sourceSha:sourceComponents.contacts,stitch24SourceAvailable:true},generalPromotion:false},
 fixtureCompatibility:{canonicalContext:'browser-only-fictional-parents',rpc:'dobby_v7_context',protocol:1,permissions:{canEdit:true,canMagic:true,canCreate:true,canManageDependents:true,canInvite:false},nativePermissionsUnchanged:true,releaseFlagsUnchanged:true,contractSources:['essai-stitch-v5-famille/tests/family-access-bootstrap.test.mjs','essai-stitch-v5-famille/tests/family-access-native.test.mjs'].map(file=>({path:file,sha256:hash(fs.readFileSync(path.join(repo,file)))}))},
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
console.log('CONSOLIDATED_CANDIDATE_REVIEW_BUILD',sourceSha,manifest.sourceState,out);

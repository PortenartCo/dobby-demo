/* Isolated 14h course demo: compose canonical Menu+Famille+PREP without changing previous reviews. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..');
const arg=process.argv.indexOf('--output');
const out=arg>=0?path.resolve(process.argv[arg+1]):path.join(repo,'essai-dobby-v7-cours-14h-correctif-20261112');
if(fs.existsSync(out))throw Error('Course preview must use a NEW output folder: '+out);
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const from='dobby-review-v7-menu-20261112|',to='dobby-review-v7-cours-14h-correctif-20261112|';
execFileSync(process.execPath,[path.join(__dirname,'build-dobby-menu-review.cjs'),'--output',out],{cwd:repo,stdio:'inherit'});
const manifestPath=path.join(out,'review-manifest.json'),m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
function replace(file,value,transform){
 const full=path.join(out,file),buf=Buffer.from(value,'utf8'),entry=m.files.find(row=>row.path===file);
 if(!entry)throw Error('Inherited resource missing in manifest: '+file);
 fs.writeFileSync(full,buf);entry.sha256=hash(buf);entry.transformed=entry.sourceSha256?entry.sha256!==entry.sourceSha256:true;
 entry.transforms=[...(entry.transforms||[]),transform];
}
// Only in the isolated course preview: selecting a child as the subject of the
// ceremony must never silently replace the authorized fictive adult actor.
const runtimePath='review-runtime.js',runtime=fs.readFileSync(path.join(out,runtimePath),'utf8');
const previousActor="get demoMemberId(){return localStorage.getItem('reviewActiveMemberId')||config.demoMemberId||null;}";
const fixedActor="get demoMemberId(){return config.demoMemberId||null;}";
const previousSelection="localStorage.setItem('reviewActiveMemberId',id);";
const fixedSelection="localStorage.setItem('reviewSelectedProfileId',id);";
if(!runtime.includes(previousActor)||!runtime.includes(previousSelection))throw Error('Course actor-isolation source changed');
replace(runtimePath,runtime.replace(previousActor,fixedActor).replace(previousSelection,fixedSelection),{type:'course-fictional-actor-separate-from-selected-subject'});
for(const file of ['review-config.js','global-demo.js','family-config.js']){
 const before=fs.readFileSync(path.join(out,file),'utf8'),count=before.split(from).length-1;
 if(!count)throw Error('Menu namespace not found in '+file);
 replace(file,before.replaceAll(from,to),{type:'course-namespace-substitution',from,to,occurrences:count});
}
const entry='essai-stitch-v7/famille.html?client=A#onboarding-ritual?record=replay';
replace('index.html','<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./'+entry+'"><title>DOBBY — Démo du cours, 14 h</title></head><body><p>Démo fictive, sans compte ni donnée réelle.</p><a href="./'+entry+'">Commencer le Rituel</a> · <a href="./essai-stitch-v7/traverse.html?client=A">Passer à l’application</a> · <a href="./essai-stitch-v7/famille.html?client=A#models">Mes modèles</a></body></html>\n',{type:'course-entry',entry});
replace('README.md','# DOBBY V7 — Démonstration du cours de 14 h (12 novembre 2026)\n\nVersion isolée basée sur Famille, Menu (cinq rubriques), Agenda natif et Listes de préparation (quatre parcours du ZIP Stitch corrigé). Départ : feu de Cheminette → foyer → identité → Choixpeau → Patronus → identité magique → Chemin de Traverse (rituel rejouable, effets visuels activés dans la démo). Les listes sont accessibles depuis le Salon des Curiosités ; un modèle peut être associé au formulaire Agenda existant puis consulté depuis Préparatifs. La refonte distincte de la fiche Événement n’est PAS encore intégrée.\n\nDonnées fictives de démonstration, clients A/B simulés dans le même navigateur, backend factice et espace de stockage autonome. Aucun compte réel, aucun backend Supabase, aucune IA payante, aucun envoi réel. Préserver les autres aperçus et vérifier l\'URL hébergée avant présentation.\n',{type:'course-readme'});
const previousBuilder=m.builderSource;
Object.assign(m,{
 version:'V7-COURS-14H-CORRECTIF',entry,sourceSha:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),
 storagePrefix:to+'client-{A|B}|',sharedFixtureKey:to+'backend-v1',selectedClientKey:to+'selected-client',resetKey:to+'reset-in-progress',resetChannel:to+'reset',backendLock:to+'backend-v1',
 sourceComponents:{familyBase:'5b764ef367553e9945fb72a6b563b55adc41e040',menu:'01d1dbce4b6aa9097f88e6b5bb164f2de82648b6',preparations:'ad7d6b7645345cb5eaab4db9ec32994445b6dbca',eventsRedesign:'not-included'},
 realBackend:false,realAuth:false,publication:'new-directory-only',configSha256:hash(fs.readFileSync(path.join(out,'review-config.js'))),
 familyConfigSha256:hash(fs.readFileSync(path.join(out,'family-config.js'))),fixtureSha256:hash(fs.readFileSync(path.join(out,'global-demo.js'))),
 readmeSha256:hash(fs.readFileSync(path.join(out,'README.md'))),
 builderSource:{path:'scripts/build-dobby-course-14h-review.cjs',sha256:hash(fs.readFileSync(__filename))},
 inheritedBuilders:[previousBuilder,...(m.inheritedBuilders||[])]
});
fs.writeFileSync(manifestPath,JSON.stringify(m,null,2)+'\n');
console.log('COURSE_DEMO_READY',out,m.sourceSha,m.storagePrefix,'FILES',m.files.length);

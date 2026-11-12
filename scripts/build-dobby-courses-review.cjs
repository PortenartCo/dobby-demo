/* E07-P02 uses the existing E07.4 isolated builder, never publishes by itself. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..'),arg=process.argv.indexOf('--output');
const out=arg<0?path.join(repo,'essai-dobby-e07-p02-courses-review-20261112'):path.resolve(process.argv[arg+1]);
execFileSync(process.execPath,[path.join(__dirname,'build-dobby-review.cjs'),'--profile','e074','--output',out],{stdio:'inherit'});
const configPath=path.join(out,'review-config.js');let config=fs.readFileSync(configPath,'utf8');
config=config.replace("version:'E07.4',storagePrefix:'dobby-review-e074-20261111|'","version:'E07-P02',storagePrefix:'dobby-review-e07-p02-courses-20261112|'").replace("label:'Démo E07.4'","label:'Démo E07-P02 · Courses'");
config=config.replace(/info:'[^']*'/,"info:'Aperçu Courses E07-P02 fictif et isolé. Données et déclarations de disponibilité sur cet appareil. Aucun compte familial réel, aucune écriture distante, aucun inventaire permanent. Les autres aperçus restent indépendants.'");
fs.writeFileSync(configPath,config);
const index=path.join(out,'index.html');fs.writeFileSync(index,fs.readFileSync(index,'utf8').replaceAll('#taverne','#shop'));
const manifestPath=path.join(out,'review-manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath));
Object.assign(manifest,{version:'E07-P02',base:'69ef361ad139356c2d1473d825f9231e7610b0e4',entry:'essai-stitch-v7/index.html#shop',storagePrefix:'dobby-review-e07-p02-courses-20261112|',configSha256:crypto.createHash('sha256').update(config).digest('hex'),homeAvailabilityScope:'current-list-on-this-device',publication:'new-directory-only'});
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log('COURSES_REVIEW_BUILD',manifest.sourceSha,out);

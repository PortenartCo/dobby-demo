/* Local, fictional A/B review. No publishing or production configuration changes. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..'),arg=process.argv.indexOf('--output');
const out=arg<0?'/workspace/scratch/essai-dobby-e07-p02-shared-home-review-20261112':path.resolve(process.argv[arg+1]);
if(fs.existsSync(out))throw Error('Output must be a new directory: '+out);
execFileSync(process.execPath,[path.join(__dirname,'build-dobby-review.cjs'),'--profile','e074','--output',out],{stdio:'inherit'});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const manifestPath=path.join(out,'review-manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath));
const prefix='dobby-review-e07-p02-shared-home-20261112|';
const configPath=path.join(out,'review-config.js');let config=fs.readFileSync(configPath,'utf8');
const configMarker="version:'E07.4',storagePrefix:'dobby-review-e074-20261111|'";
if(!config.includes(configMarker))throw Error('E07.4 review config changed; review required.');
config=config.replace(configMarker,`version:'E07-P02-SHARED-HOME',storagePrefix:'${prefix}client-'+(new URLSearchParams(top.location.search).get('client')==='B'?'B':'A')+'|'`)
 .replace("label:'Démo E07.4'","label:'Simulation navigateur · foyer fictif'")
 .replace(/info:'[^']*'/,"info:'Simulation dans ce navigateur : deux clients fictifs A et B utilisent le client familial natif, avec des réponses HTTP simulées et un stockage partagé local. Aucun compte réel ni serveur distant. La migration SQL proposée reste à appliquer sur un vrai backend. Ouvrez A et B dans deux onglets du même navigateur, déclarez une disponibilité puis synchronisez l’autre onglet.'")
 .replace("styles:'body.e06-active>header{top:44px!important}'","styles:'body{padding-top:104px!important}html body>header[data-e01-chrome],body.e06-active>header{top:104px!important}[data-review-banner]{height:104px!important;padding:6px 10px;box-sizing:border-box;flex-direction:column;gap:4px!important}[data-review-banner] button,[data-review-banner] a{min-height:30px!important;padding:4px 8px!important}[data-shared-controls]{display:flex;align-items:center;gap:6px}[data-shared-status]{font-size:10px;text-align:center}[data-review-banner] a{color:inherit;border:1px solid #d49b4266;border-radius:6px;text-decoration:none}[data-review-banner] a[aria-current]{background:#70491f}[data-shared-label]{font-weight:bold;text-align:center}'");
// Native navigation omits query parameters. Retain this fictional persona in
// this tab only, before the storage envelope and iframe choose their prefixes.
config=`(()=>{if(window!==top)return;const u=new URL(location.href),k='${prefix}selected-client',q=u.searchParams.get('client'),c=q==='A'||q==='B'?q:sessionStorage.getItem(k)==='B'?'B':'A';sessionStorage.setItem(k,c);if(q!==c){u.searchParams.set('client',c);history.replaceState(history.state,'',u.href);}})();\n`+config;
fs.writeFileSync(configPath,config);
const demoSource=path.join(__dirname,'review/shared-home-demo.js'),demo=fs.readFileSync(demoSource);
fs.writeFileSync(path.join(out,'shared-home-demo.js'),demo);
for(const record of manifest.files){
 const file=path.join(out,record.path);let bytes=fs.readFileSync(file);
 if(record.path.endsWith('.html')){
  const html=bytes.toString(),runtime=path.relative(path.dirname(file),path.join(out,'shared-home-demo.js')).split(path.sep).join('/');
  bytes=Buffer.from(html.replace(/(<script src="[^"]*review-runtime\.js"><\/script>)/,'$1<script src="'+runtime+'"></script>'));
 }
 if(record.path==='essai-stitch-v5-famille/family-v2.js'){
  const source=bytes.toString(),marker='void boot();';
  if(source.split(marker).length!==2)throw Error('Native family boot changed; review required.');
  // The adapter/core/writer are unchanged; only this generated copy waits for
  // isolated fictional metadata before its original boot routine starts.
  bytes=Buffer.from(source.replace(marker,'void window.DobbySharedHomeDemo.ready.then(boot);'));
 }
 fs.writeFileSync(file,bytes);record.sha256=hash(bytes);record.transformed=record.sha256!==record.sourceSha256;
}
manifest.files.push({path:'shared-home-demo.js',sourcePath:'scripts/review/shared-home-demo.js',sourceSha256:hash(demo),sha256:hash(demo),transformed:false});
manifest.files.sort((a,b)=>a.path.localeCompare(b.path));
fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./essai-stitch-v7/index.html?client=A#shop"><title>DOBBY — Simulation A/B du foyer</title></head><body><p>Simulation navigateur, aucun compte réel.</p><a href="./essai-stitch-v7/index.html?client=A#shop">Ouvrir le client fictif A</a> · <a href="./essai-stitch-v7/index.html?client=B#shop">Ouvrir le client fictif B</a></body></html>\n');
Object.assign(manifest,{version:'E07-P02-SHARED-HOME',base:'d3fa29167f0494fbaaece76553100e5144dc8c52',entry:'essai-stitch-v7/index.html?client=A#shop',storagePrefix:prefix+'client-{A|B}|',sharedFixtureKey:prefix+'backend-v1',realBackend:false,schemaStatus:'proposed-not-applied',homeAvailabilityScope:'fictional-shared-current-list-browser-only',simulation:'native-family-client-core-writer; browser-only HTTP fixture; same-origin A/B tabs',simulationRequires:'Web Locks, IndexedDB, localStorage; localhost or HTTPS',configSha256:hash(config),fixtureSha256:hash(demo),builderSource:{path:'scripts/build-dobby-shared-home-review.cjs',sha256:hash(fs.readFileSync(__filename))},publication:'local-new-directory-only'});
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log('SHARED_HOME_REVIEW_BUILD',manifest.sourceSha,out);

/* Additive Archives preview, using the established DOBBY isolated review envelope. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {records}=require('../essai-stitch-v7/tests/helpers/archives-final-fixture.cjs'),{pdf}=require('../essai-stitch-v7/tests/contracts-fixtures.cjs');
const repo=path.resolve(__dirname,'..'),arg=process.argv.indexOf('--output');
if(arg<0)throw Error('A new --output directory is required.');
const out=path.resolve(process.argv[arg+1]),sourceSha=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
const name=path.basename(out),prefix='dobby-review-'+name+'|',hash=b=>crypto.createHash('sha256').update(b).digest('hex');
if(!name.startsWith('essai-dobby-v7-archives-native-pr17-'+sourceSha.slice(0,7)+'-'))throw Error('Directory must identify the exact PR17 source commit.');
const dirty=execFileSync('git',['status','--porcelain','--','essai-stitch-v7','essai-stitch-v5-famille','scripts/build-archives-review.cjs'],{cwd:repo,encoding:'utf8'});
if(dirty.trim())throw Error('Commit the reviewed source before building an exact-SHA preview.');
execFileSync(process.execPath,[path.join(__dirname,'build-dobby-review.cjs'),'--profile','integrated','--output',out],{stdio:'inherit'});
const manifestPath=path.join(out,'review-manifest.json'),m=JSON.parse(fs.readFileSync(manifestPath));
function put(file,bytes,transform){bytes=Buffer.from(bytes);fs.mkdirSync(path.dirname(path.join(out,file)),{recursive:true});fs.writeFileSync(path.join(out,file),bytes);let row=m.files.find(r=>r.path===file);if(!row){row={path:file,generated:true};m.files.push(row);}Object.assign(row,{sha256:hash(bytes),transformed:true,transforms:[...(row.transforms||[]),transform]});}
put('review-config.js',fs.readFileSync(path.join(out,'review-config.js'),'utf8').replaceAll('dobby-review-integrated-v1|',prefix),'unique-preview-storage-namespace');
const photo=fs.readFileSync(path.join(repo,'essai-stitch-v7/assets/cuisine/e07-taverne.png')),photoHash=hash(photo);
put('fixtures/original-fictif.pdf',Buffer.from(pdf()),'valid-fictional-pdf');
// Reuse the already-copied artwork for the fictional recipe photo fixture.
const config=`/* Fictional records only. Source writers and renderers remain native. */
(()=>{'use strict';const base=window.DobbyReviewConfig;if(base.storagePrefix!==${JSON.stringify(prefix)})throw Error('Isolated namespace required.');
const records=${records.toString()};
window.DobbyReviewConfig=Object.freeze({...base,version:'V7-ARCHIVES-NATIVE-PR17',demoMemberId:'final-parent',label:'Archives PR17 · données fictives',reviewEntry:null,mount(){},
info:'Aperçu corrigé de la PR17 (${sourceSha.slice(0,7)}). Données entièrement fictives. Consultez les fiches natives archivées, leurs PDF, les entretiens et les photos, puis réactivez-les après confirmation. Depuis Menu, archivez une fiche active. Réinitialiser restaure seulement cet aperçu. Aucun compte réel ni service familial distant.',
initialState(day){const state={...base.initialState(day),...records(${JSON.stringify(photoHash)})};state.previewFixture=${JSON.stringify(name)};state.manualMissions=[];state.runeCredits=[];state.runeRequests=[];state.runeSyncRequired=false;
const archive={version:1,archivedAt:'2026-11-15T08:00:00.000Z',updatedAt:'2026-11-15T08:00:00.000Z'};
for(const [key,id]of [['familyDocs','final-contract'],['familyDocs','final-document'],['houseItems','final-equipment'],['customRecipes','final-recipe']])state[key].find(r=>r.id===id).archive={...archive};return state;}});
})();
`;
put('archives-demo-config.js',config,'fictional-source-records');
const init=`/* Preview-only binary fixtures. The native engine starts after their first installation. */
(()=>{'use strict';if(window.DobbyArchiveFixtureReady)return;const root=new URL('.',document.currentScript.src),marker='archives-binary-fixtures-v1';
window.DobbyArchiveFixtureReady=(async()=>{if(localStorage.getItem(marker))return;
const response=await fetch(new URL('fixtures/original-fictif.pdf',root));if(!response.ok)throw Error('PDF fictif indisponible.');const pdf=await response.blob();
const image=await fetch(new URL('essai-stitch-v7/assets/cuisine/e07-taverne.png',root));if(!image.ok)throw Error('Photo fictive indisponible.');const photo=await image.blob();
await new Promise((resolve,reject)=>{const request=indexedDB.open('dobby-v5-familial-files-20261108',1);request.onupgradeneeded=()=>request.result.createObjectStore('docs');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('docs','readwrite'),store=tx.objectStore('docs');
for(const key of ['family-contract-final-contract-final-original','family-contract-final-contract-final-amendment','family-final-document','final-house-pdf'])store.put(pdf,key);store.put(photo,${JSON.stringify('recipe-media-'+photoHash)});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};};});localStorage.setItem(marker,'complete');})();
document.addEventListener('DOMContentLoaded',()=>void window.DobbyArchiveFixtureReady.then(()=>{const frame=document.querySelector('#dv7-engine[data-archive-engine-src]');if(frame){frame.src=frame.dataset.archiveEngineSrc;frame.removeAttribute('data-archive-engine-src');}}).catch(error=>{const p=document.createElement('p');p.setAttribute('role','alert');p.textContent=error.message;document.body.prepend(p);}));
})();
`;
put('archives-fixtures-init.js',init,'preview-only-initial-binary-installation');
for(const row of [...m.files])if(row.path.endsWith('.html')){
 const target=path.join(out,row.path),html=fs.readFileSync(target,'utf8');if(!html.includes('<head>'))continue;
 const relative=file=>path.relative(path.dirname(target),path.join(out,file)).split(path.sep).join('/');
 let copy=html.replace(/(<script src="[^"]*review-config\.js"><\/script>)/,'$1<script src="'+relative('archives-demo-config.js')+'"></script>');
 copy=copy.replace(/(<script src="[^"]*review-runtime\.js"><\/script>)/,'$1<script src="'+relative('archives-fixtures-init.js')+'"></script>');
 copy=copy.replace(/(<iframe[^>]*id="dv7-engine"[^>]*?)src="([^"]+)"/,'$1data-archive-engine-src="$2"');
 copy=copy.replace("frame-src 'self'; object-src 'none'","frame-src 'self' blob:; object-src 'self' blob:");
 put(row.path,copy,'fictional-config-fixtures-engine-gate-and-local-blob-document-reading');
}
const native='essai-stitch-v5-famille/family-v2.js',text=fs.readFileSync(path.join(out,native),'utf8'),marker="const PROJECT = 'https://pqcdkrwljgvgagzwrcmg.supabase.co';";
if(text.split(marker).length!==2)throw Error('Native backend marker changed.');
put(native,text.replace(marker,"const PROJECT = 'https://dobby-archives-pr17.invalid';"),'no-real-backend-in-generated-copy');
put('essai-stitch-v7/access-config.js','window.DobbyPublicConfig=Object.freeze({});\n','no-real-auth-configuration');
const entry='essai-stitch-v7/famille.html#documents';
put('index.html','<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./'+entry+'"><title>DOBBY — Archives PR17 corrigées</title></head><body><a href="./'+entry+'">Ouvrir les Archives fictives</a></body></html>\n','archive-entry');
put('README.md','# DOBBY — Archives natives PR17\n\nSource : `'+sourceSha+'`. Entrée : `'+entry+'`.\n\nDémo fictive : contrat avec PDF et avenant, assurance active, document autonome, contrat ancien typé, équipement avec deux programmes et historique/PDF, recette avec photo et modes classique/TM5, contact et mémos local/familial. Consulter, Réactiver et les confirmations utilisent les composants et writers de la PR17. Les pièces fictives sont installées avant le démarrage du moteur.\n\nRéinitialiser ne concerne que cet aperçu. Stockage et IndexedDB distincts, authentification et backend réels désactivés, requêtes externes bloquées par le runtime et la CSP. Aucun SQL, changement Supabase, Missions V3 ou droits enfant étendus. Publication exclusivement dans un nouveau dossier ; les versions existantes sont préservées.\n','preview-instructions');
Object.assign(m,{version:'V7-ARCHIVES-NATIVE-PR17',sourceSha,sourceState:'committed',entry,previewDirectory:name,storagePrefix:prefix,realBackend:false,realAuth:false,migrationsApplied:false,missionsV3Activated:false,extendedChildRightsActivated:false,publication:'new-directory-only',inheritedBuilder:{path:'scripts/build-dobby-review.cjs',profile:'integrated'},configSha256:hash(fs.readFileSync(path.join(out,'review-config.js'))),runtimeSha256:hash(fs.readFileSync(path.join(out,'review-runtime.js'))),fixtureSha256:hash(config)});
for(const file of ['.nojekyll','review-runtime.js'])if(!m.files.some(r=>r.path===file))m.files.push({path:file,generated:true,sha256:hash(fs.readFileSync(path.join(out,file)))});
m.files.sort((a,b)=>a.path.localeCompare(b.path));for(const row of m.files)if(hash(fs.readFileSync(path.join(out,row.path)))!==row.sha256)throw Error('Manifest mismatch: '+row.path);
fs.writeFileSync(manifestPath,JSON.stringify(m,null,2)+'\n');console.log('ARCHIVES_NATIVE_PREVIEW_READY',sourceSha,m.files.length,prefix);

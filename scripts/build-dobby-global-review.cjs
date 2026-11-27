/* New static directory only. All transformations are recorded in its manifest. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
function argument(name) {
 const index = process.argv.indexOf(name);
 if (index < 0) return undefined;
 const value = process.argv[index + 1];
 if (!value || value.startsWith('--')) throw Error(`Valeur manquante pour ${name}`);
 return value;
}
const scenario = argument('--scenario');
if (scenario && scenario !== 'launch') throw Error(`Scénario inconnu : ${scenario}`);
const launch = scenario === 'launch';
const requestedOutput = argument('--output');
if (launch && !requestedOutput) throw Error('Indiquez un nouveau dossier avec --output pour le scénario launch.');
const repo=path.resolve(__dirname,'..'),destination=requestedOutput?path.resolve(requestedOutput):path.join(repo,'essai-dobby-v7-global-review-20261112');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),prefix='dobby-review-v7-global-20261112|',origin='https://dobby-global-demo.invalid';
if(fs.existsSync(destination))throw Error('Output must be a new directory: '+destination);
const dirty=execFileSync('git',['status','--porcelain','--untracked-files=all','--','essai-stitch-v7','essai-stitch-v5-famille','essai-v6-preview/assets','scripts/build-dobby-review.cjs','scripts/build-dobby-global-review.cjs','scripts/review'],{cwd:repo,encoding:'utf8'}).split('\n').filter(Boolean).map(line=>line.slice(3)).filter(file=>!file.includes('/tests/'));
if(dirty.length&&!process.argv.includes('--allow-dirty'))throw Error('Production sources are uncommitted; commit them or explicitly use --allow-dirty for local evidence: '+dirty.join(', '));

const launchAssets = launch ? [
 ['launch-scenario.js','scripts/review/global-scenario.js'],
 ['global-roles.js','scripts/review/global-roles.js'],
 ['global-lifecycle.js','scripts/review/global-lifecycle.js'],
 ['global-controls.js','scripts/review/global-controls.js'],
 ['global-controls.css','scripts/review/global-controls.css'],
].map(([file, sourcePath]) => [file, sourcePath, fs.readFileSync(path.join(repo, sourcePath))]) : [];
const transform = launch ? require('./review/global-launch-transform.cjs') : null;
const dataManifest = launch ? require('./review/global-scenario.js') : null;
if (launch && ['config', 'demo', 'review', 'nativeResource'].some(name => typeof transform?.[name] !== 'function')) {
 throw Error('Transformations launch incomplètes.');
}
const configSource = 'scripts/review/global-config.js', demoSource = 'scripts/review/global-demo.js';
const runtimeSource = 'scripts/review/review-runtime.js';
const configuredFiles = [[ 'review-config.js', configSource, transform?.config ],
 [ 'global-demo.js', demoSource, transform?.demo ], [ 'review-runtime.js', runtimeSource, transform?.review ]]
 .map(([file, sourcePath, edit]) => {
  const input = fs.readFileSync(path.join(repo, sourcePath));
  const output = edit ? Buffer.from(edit(input.toString('utf8'))) : input;
  return { file, sourcePath, input, output };
 });

let out = destination;
if (launch) {
 const parent = path.dirname(destination);
 for (const input of ['essai-stitch-v7', 'essai-stitch-v5-famille', 'essai-v6-preview/assets']) {
  const source = path.join(repo, input);
  if (parent === source || parent.startsWith(source + path.sep)) throw Error('Placez le bundle hors des sources natives.');
 }
 fs.mkdirSync(parent, { recursive: true });
 const staging = fs.mkdtempSync(path.join(parent, '.dobby-launch-'));
 process.once('exit', () => fs.rmSync(staging, { recursive: true, force: true }));
 out = path.join(staging, 'bundle');
}

execFileSync(process.execPath,[path.join(__dirname,'build-dobby-review.cjs'),'--profile','e074','--output',out],{cwd:repo,stdio:'inherit'});
const manifestFile=path.join(out,'review-manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestFile));
const pwaFiles = /(?:^|\/)pwa-[^/]+$|\/assets\/pwa\/|\/manifest\.webmanifest$/;
if (launch) {
 manifest.files = manifest.files.filter(record => {
  if (!pwaFiles.test(record.path)) return true;
  fs.unlinkSync(path.join(out, record.path));
  return false;
 });
}

function localAsset(tag, relative) {
 return tag === 'link' ? `<link rel="stylesheet" href="${relative}">` : `<script src="${relative}"></script>`;
}

function launchHTML(html, file) {
 const asset = (name, tag = 'script') => localAsset(tag, path.relative(path.dirname(file), path.join(out, name)).split(path.sep).join('/'));
 const config = /(<script src="[^"]*review-config\.js"><\/script>)/;
 const runtime = /(<script src="[^"]*review-runtime\.js"><\/script>)/;
 if (html.includes('<head>') && (!config.test(html) || !runtime.test(html))) throw Error(`Missing launch configuration: ${file}`);
 return html
  .replace(config, `${asset('launch-scenario.js')}$1`)
  .replace(runtime, `$1${asset('global-roles.js')}${asset('global-lifecycle.js')}${asset('global-demo.js')}${asset('global-controls.js')}${asset('global-controls.css', 'link')}`)
  .replace(/<script\b[^>]*\bsrc=["'][^"']*\/pwa-install\.js["'][^>]*>\s*<\/script>/gi, '')
  .replace(/<link\b[^>]*(?:\brel=["'](?:manifest|apple-touch-icon)["']|\bhref=["'][^"']*\/pwa-install\.css["'])[^>]*>/gi, '')
  .replace(/<meta\b[^>]*\bname=["']apple-mobile-web-app-[^"']+["'][^>]*>/gi, '')
  .replace("frame-src 'self';", "frame-src 'self' blob:;")
  .replace("base-uri 'self'", "base-uri 'none'; manifest-src 'none'; worker-src 'self' blob:");
}

for(const record of manifest.files){const file=path.join(out,record.path);let bytes=fs.readFileSync(file);
 if(record.path.endsWith('.html')){const relative=path.relative(path.dirname(file),path.join(out,'global-demo.js')).split(path.sep).join('/');let html=bytes.toString();const marker=/(<script src="[^"]*review-runtime\.js"><\/script>)/;if(/<head>/.test(html)&&!marker.test(html))throw Error('Missing isolation runtime: '+record.path);html=launch?launchHTML(html,file):html.replace(marker,'$1<script src="'+relative+'"></script>');
  if(/^essai-stitch-v7\/(index|traverse|missions|famille)\.html$/.test(record.path)){
   const frames=[
    'id="dv7-engine" referrerpolicy="same-origin" src="../essai-stitch-v5-famille/index.html#dobby-v7-engine"',
    'id="dv7-engine" src="../essai-stitch-v5-famille/index.html"',
   ];
   const matches=frames.flatMap(frame=>Array(html.split(frame).length-1).fill(frame));
   if(matches.length!==1)throw Error('Native review iframe changed: '+record.path);
   html=html.replace(matches[0],'id="dv7-engine" data-global-engine-src="../essai-stitch-v5-famille/index.html"');
  }
  if (launch && record.path === 'essai-stitch-v5-famille/index.html') {
   const context = 'if(window.DobbyReview)return{demo:true,actorId:';
   if (html.split(context).length !== 2) throw Error('Le contexte membre natif V5 a changé.');
   html = html.replace(context, 'if(window.DobbyReview&&!window.DobbyGlobalLaunch)return{demo:true,actorId:');
  }
  bytes=Buffer.from(html);
 }
 if (record.path === 'essai-stitch-v5-famille/family-v2.js') {
  const projectRef = 'pqcdkrwljgvgagzwrcmg';
  const project = `const PROJECT = 'https://${projectRef}.supabase.co';`, boot = 'void boot();';
  let source = bytes.toString();
  if (!source.includes(project) || source.split(boot).length !== 2) throw Error('Native family adapter changed; review required.');
  source = source.replace(project, `const PROJECT = '${origin}';`).replace(boot, 'void window.DobbyGlobalDemo.ready.then(boot);');
  if (launch) {
   const compare = `config.projectRef!=='${projectRef}'`;
   const repaint = '    repaintQueued = false;';
   if (source.split(compare).length !== 2 || source.split(repaint).length !== 2) throw Error('L’adaptateur launch doit être réexaminé.');
   source = source.replace(compare, "config.projectRef!=='dobby-global-demo'")
    .replace(repaint, `${repaint}\n    if(window.DobbyGlobalDemo.resetPending())return;`);
  }
  bytes = Buffer.from(source);
 }
 if (launch && ['essai-stitch-v7/chrome.js', 'essai-stitch-v7/cuisine-e074.js'].includes(record.path)) {
  bytes = Buffer.from(transform.nativeResource(record.path, bytes.toString()));
 }
 if(launch&&record.path==='essai-stitch-v7/access-config.js'){
  bytes = Buffer.from('/* Capacités de démonstration, transport et comptes fictifs. */\nwindow.DobbyPublicConfig = Object.freeze({ childAccountsAvailable: true, healthEssentialAvailable: false, projectRef: null, publicKey: null });\n');
 }
 fs.writeFileSync(file,bytes);record.sha256=hash(bytes);record.transformed=record.sha256!==record.sourceSha256;
}
for (const { file, sourcePath, input, output } of configuredFiles) {
 fs.writeFileSync(path.join(out, file), output);
 manifest.files.push({ path: file, sourcePath, sourceSha256: hash(input), sha256: hash(output), transformed: !input.equals(output) });
}
for (const [file, sourcePath, bytes] of launchAssets) {
 fs.writeFileSync(path.join(out, file), bytes);
 manifest.files.push({ path: file, sourcePath, sourceSha256: hash(bytes), sha256: hash(bytes), transformed: false });
}
const entry='essai-stitch-v7/traverse.html?client=A';
fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./'+entry+'"><title>DOBBY V7 — Revue globale</title></head><body><p>Deux clients fictifs, aucun compte réel.</p><a href="./'+entry+'">Commencer avec A</a> · <a href="./essai-stitch-v7/traverse.html?client=B">Ouvrir B</a></body></html>\n');
fs.writeFileSync(path.join(out,'README.md'),'# DOBBY V7 — Revue globale isolée\n\nEntrée : `index.html`. Deux clients fictifs A et B dans des onglets du même navigateur, avec stockage indépendant et backend simulé commun. Les formulaires et writers sont ceux de l’application. Les contrôles de simulation permettent de synchroniser, de couper les réponses simulées et de réinitialiser ce seul essai.\n\nAucun compte réel, requête vers Supabase, migration SQL ou appel IA payant. La disponibilité partagée est simulée, sa migration réelle n’est pas appliquée. Les mémos partagés et les crédits de runes passent par leurs protocoles natifs ; les anciens mémos locaux nécessitent un import explicite. Les dépendances connues et les validations physiques iPhone sont décrites dans le rapport de livraison.\n\nLa simulation A/B nécessite HTTPS ou localhost, IndexedDB et Web Locks. Un manifeste retrace les sources, les transformations et les empreintes.\n');
if (launch) {
 const links = dataManifest.profiles.map(({ code, firstName }) => `<a href="./essai-stitch-v7/traverse.html?client=${code}">${firstName} (${code})</a>`).join(' · ');
 fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./${entry}"><title>DOBBY V7 — Démonstration</title></head><body><p>Foyer et profils fictifs.</p>${links}</body></html>\n`);
 fs.writeFileSync(path.join(out, 'README.md'), '# DOBBY V7 — Démonstration locale\n\nDepuis le dépôt, lancez `node scripts/serve-dobby-global-demo.cjs --bundle <dossier>` et ouvrez l’adresse loopback affichée. Les profils A, B, C et D partagent un foyer fictif via une simulation dans le navigateur. Les actions font appel aux formulaires et writers natifs.\n\nLa démo requiert Web Locks, IndexedDB et le stockage local. Les données de scénario sont décrites dans `demo-data-manifest.json`. `review-manifest.json` indique les fichiers, leurs empreintes et les transformations appliquées à la copie.\n');
}
const [config,demo,runtime] = configuredFiles.map(record => record.output);
Object.assign(manifest,{version:'V7-GLOBAL',base:'c510ded81ee075c9b180e2551257351c557e541a',entry,sourceState:dirty.length?'working-tree':'committed',sourceDirtyPaths:dirty,storagePrefix:prefix+'client-{A|B}|',sharedFixtureKey:prefix+'backend-v1',realBackend:false,simulatedOrigin:origin,simulation:'native-family-client/core/writers; browser-only HTTP fixture; same-browser A/B clients',simulationRequires:'HTTPS or localhost; Web Locks, IndexedDB, localStorage',schemaStatus:'simulated-only; grocery migration proposed-not-applied',configSha256:hash(config),fixtureSha256:hash(demo),runtimeSha256:hash(runtime),builderSource:{path:'scripts/build-dobby-global-review.cjs',sha256:hash(fs.readFileSync(__filename))},publication:'new-directory-only',readmeSha256:hash(fs.readFileSync(path.join(out,'README.md')))});
const generated = ['index.html', 'README.md', '.nojekyll'];
if (launch) {
 const file = 'demo-data-manifest.json';
 const bytes = JSON.stringify(dataManifest, null, 2) + '\n';
 fs.writeFileSync(path.join(out, file), bytes);
 generated.push(file);
 Object.assign(manifest, {
  scenario, publication: 'local-only', base: '88278faa26568cf6ca8348baf8008401712161fb',
  storagePrefix: dataManifest.namespace + 'client-{A|B|C|D}|', sharedFixtureKey: dataManifest.namespace + 'backend-v1',
  sharedFixtureDatabase: dataManifest.namespace + 'shared-fixture',
  syntheticDataManifest: { path: file, sha256: hash(bytes) },
  simulation: 'native-family-client/core/writers; browser-only HTTP fixture; same-browser A/B/C/D clients',
  simulationRequires: 'isolated loopback origin; Web Locks, IndexedDB, localStorage',
  launchTransformer: { path: 'scripts/review/global-launch-transform.cjs', sha256: hash(fs.readFileSync(path.join(__dirname,'review/global-launch-transform.cjs'))) },
 });
}
for(const file of generated)manifest.files.push({path:file,generated:true,sha256:hash(fs.readFileSync(path.join(out,file)))});
manifest.files.sort((a,b)=>a.path.localeCompare(b.path));fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
if (launch) {
 if (fs.existsSync(destination)) throw Error('Output must be a new directory: '+destination);
 fs.renameSync(out, destination);
}
console.log('GLOBAL_REVIEW_BUILD',manifest.sourceSha,manifest.sourceState,destination);

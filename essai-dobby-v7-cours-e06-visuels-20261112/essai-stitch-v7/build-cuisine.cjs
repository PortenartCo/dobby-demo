/* Reproducible derivation: preserve the original DOM, classes, images and styles.
   The original scripts and inline handlers contain demo writers, so replace those
   behaviours with the V7 adapters calling the existing DOBBY engine. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const routes = require('./cuisine-routes.json');
const root = path.resolve(__dirname, '..');
const assetsPath = path.join(__dirname, 'assets/cuisine/provenance.json');
const assets = fs.existsSync(assetsPath) ? JSON.parse(fs.readFileSync(assetsPath, 'utf8')) : [];
fs.mkdirSync(path.join(__dirname, 'templates'), { recursive: true });
const provenance = [];
for (const route of routes) {
  const source = route.source || `design/stitch-53/${route.id}/code.html`;
  const original = fs.readFileSync(path.join(root, source), 'utf8');
  let html = original.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link\b[^>]*href="https:\/\/fonts\.(?:googleapis|gstatic)\.com[^"]*"[^>]*>/gi, '')
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '');
  for (const asset of assets) if (asset.file || asset.fallback) html = html.replaceAll(asset.url, '../assets/cuisine/' + (asset.file || asset.fallback)).replaceAll(asset.url.replaceAll('&','&amp;'), '../assets/cuisine/' + (asset.file || asset.fallback));
  if(route.asset){
    fs.copyFileSync(path.join(root,route.imageSource),path.join(__dirname,'assets/cuisine',route.asset));
    html=html.replace(/(<img\b[^>]*\bsrc=")[^"]*"/gi,'$1../assets/cuisine/'+route.asset+'"');
  }
  html = html.replace(/<body\b/, `<body data-stitch-source="${route.presentationId || route.id}"`);
  fs.writeFileSync(path.join(__dirname, 'templates', route.view + '.html'), html);
  provenance.push({ view: route.view, source, sha256: crypto.createHash('sha256').update(original).digest('hex') });
}
fs.writeFileSync(path.join(__dirname, 'templates/provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
const file = path.join(__dirname, 'route-manifest.json');
const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const route of routes) {
  const screen = manifest.screens.find(screen => screen.id === route.id);
  Object.assign(screen, { domain: 'cuisine', route: 'index.html#' + route.view,
    template: 'templates/' + route.view + '.html', integration: route.integrated ? 'verified-functional' : 'template-prepared' });
  if(route.source)screen.presentation={source:route.source,id:route.presentationId,sha256:provenance.find(entry=>entry.view===route.view).sha256,supersedes:screen.source};
  if (route.integrated) Object.assign(screen, { verification: { tests: ['tests/cuisine.cjs','tests/cuisine-family.cjs','tests/cuisine-visual.cjs'], widths: [320,390], captures: [320,390].map(width => ({reference: `docs/dobby-v7/evidence/cuisine/before/${route.view}-${width}.png`, integrated: `docs/dobby-v7/evidence/cuisine/after/${route.view}-${width}.png`})) }, linked: true, mode: route.canonical ? 'functional-variant' : 'functional-adapter', canonical: route.canonical || route.view });
}
manifest.cuisine = { sources: routes.length, integrated: routes.filter(route => route.integrated).length, e07: {sourceManifest:'design/stitch-e07/manifest.json',overrides:routes.filter(route=>route.source).map(route=>({view:route.view,source:route.source,id:route.presentationId}))} };
manifest.templatesUsedInActiveUI = manifest.screens.filter(screen => screen.linked).length;
manifest.activeFunctionalScreens = manifest.templatesUsedInActiveUI;
fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
console.log('CUISINE_TEMPLATES=' + routes.length);

/* Seven original Family sources; the native engine remains the sole writer. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const routes=require('./family-routes.json'),root=path.resolve(__dirname,'..');
const assets=JSON.parse(fs.readFileSync(path.join(__dirname,'assets/family/provenance.json')));
const target=path.join(__dirname,'templates/family');fs.mkdirSync(target,{recursive:true});
const provenance=[];
for(const route of routes){
 const source=`design/stitch-53/${route.id}/code.html`,original=fs.readFileSync(path.join(root,source),'utf8');
 let html=original.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*href="https:\/\/fonts\.(?:googleapis|gstatic)\.com[^"]*"[^>]*>/gi,'').replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*')/gi,'');
 for(const asset of assets)html=html.replaceAll(asset.url,'../../assets/family/'+(asset.file||asset.fallback)).replaceAll(asset.url.replaceAll('&','&amp;'),'../../assets/family/'+(asset.file||asset.fallback));
 html=html.replace(/<body\b/,`<body data-stitch-source="${route.id}"`);
 fs.writeFileSync(path.join(target,route.view+'.html'),html);
 provenance.push({view:route.view,source,sha256:crypto.createHash('sha256').update(original).digest('hex')});
}
fs.writeFileSync(path.join(target,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
const manifestPath=path.join(__dirname,'route-manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath));
for(const route of routes){
 const active=route.status!=='prepared',record=manifest.screens.find(x=>x.id===route.id);
 Object.assign(record,{domain:'family-2a',route:'famille.html#'+route.view,template:'templates/family/'+route.view+'.html',linked:active,mode:active?'functional-adapter':'source-only',integration:route.status,unsupported:route.unsupported||[]});
 if(active)record.verification={tests:['tests/family.cjs','tests/family-shared.cjs','tests/family-visual.cjs'],widths:[320,390],captures:[320,390].map(width=>({reference:`docs/dobby-v7/evidence/family-2a/before/${route.view}-${width}.png`,integrated:`docs/dobby-v7/evidence/family-2a/after/${route.view}-${width}.png`}))};
}
manifest.family2a={sources:routes.length,functional:routes.filter(x=>x.status==='verified-functional').length,partial:routes.filter(x=>x.status==='verified-partial').length};
manifest.templatesUsedInActiveUI=manifest.screens.filter(x=>x.linked).length;manifest.activeFunctionalScreens=manifest.templatesUsedInActiveUI;
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');console.log('FAMILY_TEMPLATES='+routes.length);

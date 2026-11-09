const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'design','stitch-53','manifest.json'),'utf8').replace(/^\uFEFF/,''));
if(manifest.html_pages!==53||manifest.designs.length!==53)throw Error('53 sources expected');
const roots=[
{screen:'taverne',file:'index.html',id:'dobby_la_taverne_gourmande_repas_menus'},
{screen:'traverse',file:'traverse.html',id:'dobby_l_choppe_du_chemin_de_traverse'},
{screen:'missions',file:'missions.html',id:'dobby_la_biblioth_que_des_missions_t_ches_magiques'},
{screen:'famille',file:'famille.html',id:'dobby_le_salon_des_curiosit_s_famille_organisation'}];
for(const {screen,file,id} of roots){
const source=fs.readFileSync(path.join(root,'design','stitch-53',id,'code.html'),'utf8');
let html=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*href="https:\/\/fonts\.googleapis\.com[^"]*"[^>]*>/gi,'').replace(/<link\b[^>]*href="https:\/\/fonts\.gstatic\.com[^"]*"[^>]*>/gi,'');
html=html.replace(/\s+on(?:click|change|input|load|error|submit)\s*=\s*(?:"[^"]*"|'[^']*')/gi,'');
html=html.replace(/<html class="dark"/,'<html class="dark dv7-loading"');
html=html.replace(/<body\b([^>]*)>/,(all,attrs)=>`<body${attrs} data-dv7-screen="${screen}">`);
html=html.replace('</head>',`<link rel="stylesheet" href="./stitch-tailwind.css"><link rel="stylesheet" href="../essai-v6-preview/assets/v6/fonts.css"><style>
@font-face{font-family:"Material Symbols Outlined";src:url("./assets/material-symbols-full.ttf") format("truetype");font-style:normal;font-weight:100 700;font-display:block}.material-symbols-outlined{font-family:"Material Symbols Outlined"!important;font-weight:normal;font-style:normal;font-size:24px;line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;-webkit-font-smoothing:antialiased;font-feature-settings:"liga"}[hidden]{display:none!important}html,body{max-width:100%;overflow-x:clip}.dv7-loading main{visibility:hidden}#dv7-loading{position:fixed;z-index:999;top:45%;left:10%;width:80%;text-align:center;color:#f9bb5f;font:18px Georgia}body:not(.dv7-loading) #dv7-loading{display:none!important}
#dv7-engine{position:fixed;left:-200vw;top:0;width:390px;height:844px;border:0;pointer-events:none}
#dv7-panel[hidden]{display:none!important}#dv7-panel{position:fixed;z-index:9999;inset:0;background:#180b07;display:flex;flex-direction:column}#dv7-panel-top{height:56px;flex-shrink:0;padding:7px 12px;background:#271814;border-bottom:1px solid #d49b42;display:flex;align-items:center;gap:12px;color:#fadcd5;font:16px Georgia}
body.dv7-panel-visible{overflow:hidden}body.dv7-panel-visible #dv7-engine{position:fixed;z-index:10000;left:0;top:56px;width:100%;height:calc(100dvh - 56px);pointer-events:auto}#dv7-panel-top{position:relative;z-index:10001}
#dv7-close{background:#f9bb5f;color:#180b07;padding:10px 15px;border-radius:10px;min-height:42px;font-weight:bold}
.dv7-empty{padding:16px;border:1px dashed #d49b42;border-radius:12px;color:#d4c4b1}.dv7-meal-visual{background:radial-gradient(circle at 50% 30%,#594025,#271814 75%);display:flex;align-items:center;justify-content:center;font-size:64px}.dv7-action{cursor:pointer}.dv7-focus:focus-visible{outline:3px solid #f9bb5f;outline-offset:2px}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;transition-duration:0.01ms!important}}
</style></head>`);
html=html.replace(/(<main\b)/,'<div id="dv7-loading" role="status">Chargement des données du foyer…</div>$1');
html=html.replace('</body>',`<iframe title="Moteur fonctionnel DOBBY" id="dv7-engine" src="../essai-stitch-v5-famille/index.html" aria-hidden="true" tabindex="-1"></iframe><div id="dv7-panel" hidden><div id="dv7-panel-top"><button id="dv7-close" type="button">← Retour à DOBBY</button><span id="dv7-panel-title">Dobby</span></div></div><link rel="stylesheet" href="./cuisine.css"><script src="./root-adapters.js"></script><script src="./cuisine-engine.js"></script><script src="./cuisine.js"></script><link rel="stylesheet" href="./family.css"><script src="./family-engine.js"></script><link rel="stylesheet" href="./register.css"><script src="./register-route-data.js"></script><script src="./register.js"></script><script src="./family-register.js"></script><script src="./house-register.js"></script><script src="./import-runtime.js"></script><script src="./documents-register.js"></script><script src="./family.js"></script><script src="./bridge.js"></script></body>`);
fs.writeFileSync(path.join(__dirname,file),html);console.log('STITCH_ROOT_BUILD='+screen+' SOURCE='+id);
}
const screens=manifest.designs.map(({id,html,screenshot})=>({id,source:html,hasScreenshot:screenshot,linked:false,mode:'source-only'}));
for(const r of roots){const record=screens.find(x=>x.id===r.id);record.linked=true;record.mode='functional-adapter';}
fs.writeFileSync(path.join(__dirname,'route-manifest.json'),JSON.stringify({screenSources:screens.length,templatesUsedInActiveUI:roots.length,activeFunctionalScreens:roots.length,roots,screens},null,2));

require('./build-cuisine.cjs');
require('./build-family.cjs');

require('./build-register.cjs');

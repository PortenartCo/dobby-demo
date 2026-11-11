const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'design','stitch-53','manifest.json'),'utf8').replace(/^\uFEFF/,''));
if(manifest.html_pages!==53||manifest.designs.length!==53)throw Error('53 sources expected');
const roots=[
{screen:'taverne',file:'index.html',id:'dobby_la_taverne_gourmande_repas_menus'},
{screen:'traverse',file:'traverse.html',id:'dobby_l_choppe_du_chemin_de_traverse'},
{screen:'missions',file:'missions.html',id:'dobby_la_biblioth_que_des_missions_t_ches_magiques'},
{screen:'famille',file:'famille.html',id:'dobby_le_salon_des_curiosit_s_famille_organisation'}];
const homeSource=fs.readFileSync(path.join(root,'design/stitch-53/dobby_l_choppe_du_chemin_de_traverse/code.html'),'utf8');
const ripple=homeSource.slice(homeSource.indexOf('.magical-ripple {'),homeSource.indexOf('.haptic-pulse-active {'));
if(!ripple.includes('@keyframes magicPulse')||!ripple.includes('@keyframes sparkleFly'))throw Error('Original Traverse ripple CSS missing');
fs.writeFileSync(path.join(__dirname,'chrome-source.html'),'<style>'+ripple+'</style>'+homeSource.match(/<header[\s\S]*?<\/header>/)[0]+homeSource.match(/<nav[\s\S]*?<\/nav>/)[0]);
for(const {screen,file,id} of roots){
const cuisineRoute=screen==='taverne'?require('./cuisine-routes.json').find(r=>r.view==='taverne'):null;
const source=fs.readFileSync(cuisineRoute?.source?path.join(root,cuisineRoute.source):path.join(root,'design','stitch-53',id,'code.html'),'utf8');
let html=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*href="https:\/\/fonts\.googleapis\.com[^"]*"[^>]*>/gi,'').replace(/<link\b[^>]*href="https:\/\/fonts\.gstatic\.com[^"]*"[^>]*>/gi,'');
html=html.replace(/\s+on(?:click|change|input|load|error|submit)\s*=\s*(?:"[^"]*"|'[^']*')/gi,'');
html=html.replace(/<html class="dark"/,'<html class="dark dv7-loading"');
html=html.replace(/<body\b([^>]*)>/,(all,attrs)=>`<body${attrs} data-dv7-screen="${screen}">`);
html=html.replace('</head>',`<script src="./engine-policy.js"></script><link rel="stylesheet" href="./stitch-tailwind.css"><link rel="stylesheet" href="../essai-v6-preview/assets/v6/fonts.css"><style>
@font-face{font-family:"Material Symbols Outlined";src:url("./assets/material-symbols-full.ttf") format("truetype");font-style:normal;font-weight:100 700;font-display:block}.material-symbols-outlined{font-family:"Material Symbols Outlined"!important;font-weight:normal;font-style:normal;font-size:24px;line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;-webkit-font-smoothing:antialiased;font-feature-settings:"liga"}[hidden]{display:none!important}html,body{max-width:100%;overflow-x:clip}.dv7-loading main{visibility:hidden}#dv7-loading{position:fixed;z-index:999;top:45%;left:10%;width:80%;text-align:center;color:#f9bb5f;font:18px Georgia}body:not(.dv7-loading) #dv7-loading{display:none!important}
#dv7-engine{position:fixed;left:-200vw;top:0;width:390px;height:844px;border:0;pointer-events:none}
#dv7-panel[hidden]{display:none!important}#dv7-panel{position:fixed;z-index:9999;inset:0;background:#180b07;display:flex;flex-direction:column}#dv7-panel-top{height:56px;flex-shrink:0;padding:7px 12px;background:#271814;border-bottom:1px solid #d49b42;display:flex;align-items:center;gap:12px;color:#fadcd5;font:16px Georgia}
body.dv7-panel-visible{overflow:hidden}body.dv7-panel-visible #dv7-engine{position:fixed;z-index:10000;left:0;top:56px;width:100%;height:calc(100dvh - 56px);pointer-events:auto}#dv7-panel-top{position:relative;z-index:10001}
#dv7-close{background:#f9bb5f;color:#180b07;padding:10px 15px;border-radius:10px;min-height:42px;font-weight:bold}
.dv7-empty{padding:16px;border:1px dashed #d49b42;border-radius:12px;color:#d4c4b1}.dv7-meal-visual{background:radial-gradient(circle at 50% 30%,#594025,#271814 75%);display:flex;align-items:center;justify-content:center;font-size:64px}.dv7-action{cursor:pointer}.dv7-focus:focus-visible{outline:3px solid #f9bb5f;outline-offset:2px}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;transition-duration:0.01ms!important}}
</style></head>`);
html=html.replace(/(<main\b)/,'<div id="dv7-loading" role="status">Chargement des données du foyer…</div>$1');
html=html.replace('</body>',`<iframe title="Moteur fonctionnel DOBBY" id="dv7-engine" src="../essai-stitch-v5-famille/index.html" aria-hidden="true" tabindex="-1"></iframe><div id="dv7-panel" hidden><div id="dv7-panel-top"><button id="dv7-close" type="button">← Retour à DOBBY</button><span id="dv7-panel-title">Dobby</span></div></div><link rel="stylesheet" href="./cuisine.css"><link rel="stylesheet" href="./cuisine-e073.css"><link rel="stylesheet" href="./recipe-import.css"><script src="./root-adapters.js"></script><script src="./cuisine-engine.js"></script><script src="./cuisine-list.js"></script><script src="./recipe-import.js"></script><script src="./cuisine.js"></script><link rel="stylesheet" href="./family.css"><script src="./family-engine.js?v=20261110-e06-1"></script><link rel="stylesheet" href="./member-avatar.css"><script src="../essai-stitch-v5-famille/family-profile.js?v=20261110-e06-1"></script><script src="./member-avatar.js"></script><link rel="stylesheet" href="./magic-profile.css"><script src="./magic-content.js"></script><script src="./magic-profile.js?v=20261110-e06-1"></script><link rel="stylesheet" href="./register.css"><script src="./register-route-data.js"></script><script src="./register.js"></script><script src="./family-register.js"></script><script src="./house-register.js"></script><script src="./import-runtime.js"></script><script src="./documents-register.js"></script><script src="./tools-register.js"></script><link rel="stylesheet" href="./chat.css"><script src="./chat-engine.js"></script><script src="./chat.js"></script><script src="./onboarding-route-data.js"></script><script src="./onboarding-engine.js"></script><link rel="stylesheet" href="./onboarding.css"><link rel="stylesheet" href="./ritual.css"><script src="./ritual-effects.js"></script><script src="./ritual.js"></script><script src="./onboarding.js"></script><script src="./family.js?v=20261110-e06-1"></script><link rel="stylesheet" href="./chrome.css"><link rel="stylesheet" href="./consolidation.css"><script src="./chrome.js?v=20261110-e06-1"></script><link rel="stylesheet" href="./home-consolidation.css"><script src="./home.js"></script><script src="./bridge.js"></script></body>`);
if(screen==='taverne'){
 html=html.replace(/(<img\b[^>]*\bsrc=")[^"]*"/gi,'$1./assets/cuisine/'+cuisineRoute.asset+'"');
 html=html.replace('<script src="./cuisine.js">','<link rel="stylesheet" href="./cuisine-e07.css"><script src="./cuisine-e07.js"></script><script src="./cuisine.js">');
}
// Preserve the reviewed E03 composition when rebuilding the original sources.
if(screen==='missions'){
 html=html.replace(/<main\b[\s\S]*?<\/main>/,()=>fs.readFileSync(path.join(__dirname,'missions-layout.html'),'utf8').trimEnd());
 html=html.replace('<script src="./root-adapters.js">','<link rel="stylesheet" href="./missions.css"><script src="./missions.js"></script><script src="./root-adapters.js">');
}
fs.writeFileSync(path.join(__dirname,file),html);console.log('STITCH_ROOT_BUILD='+screen+' SOURCE='+id);
}
const screens=manifest.designs.map(({id,html,screenshot})=>({id,source:html,hasScreenshot:screenshot,linked:false,mode:'source-only'}));
for(const r of roots){const record=screens.find(x=>x.id===r.id);record.linked=true;record.mode='functional-adapter';record.integration='verified-functional';record.route=r.file;record.verification={tests:['tests/smoke.cjs','tests/register-root-visual.cjs','tests/register-navigation.cjs'],widths:[320,390],captures:[320,390].map(width=>({reference:`docs/dobby-v7/evidence/roots/before/${r.screen}-${width}.png`,integrated:`docs/dobby-v7/evidence/roots/after/${r.screen}-${width}.png`}))};}
fs.writeFileSync(path.join(__dirname,'route-manifest.json'),JSON.stringify({screenSources:screens.length,templatesUsedInActiveUI:roots.length,activeFunctionalScreens:roots.length,roots,screens},null,2));

require('./build-cuisine.cjs');
require('./build-family.cjs');

require('./build-register.cjs');

// E01 changes the home contract and shared navigation, not the source census.
{
const file=path.join(__dirname,'route-manifest.json'),m=JSON.parse(fs.readFileSync(file));
m.homeContract={mission:'E01',document:'docs/dobby-v7/E01-ACCUEIL.md',tests:['tests/e01.cjs','tests/e01-visual.cjs'],widths:[390,1440],navigation:['traverse.html','missions.html','index.html','famille.html','famille.html#menu'],preferences:'native st.stitchPreferences / native save()',account:'E05 member profile or explicit member choice; native account settings in secondary disclosure',automaticMission:'source equipment/document fiche by originId; no independent mission fiche',captures:[390,1440].map(width=>({width,reference:`docs/dobby-v7/evidence/e01/source/traverse-${width}.png`,baseline:`docs/dobby-v7/evidence/e01/before/traverse-${width}.png`,empty:`docs/dobby-v7/evidence/e01/empty-${width}.png`,populated:`docs/dobby-v7/evidence/e01/populated-${width}.png`}))};
m.magicProfileContract={mission:'E05',document:'docs/dobby-v7/E05-PROFIL-MAGIQUE.md',route:'famille.html#personal?person=<member-id>',identity:'native familyMembers[].magicProfile via v23MemberForm',source:'latest four-profile Stitch export missing; visual fidelity NOT verified',photos:'NOT DELIVERED',accountMemberAssociation:'NOT DELIVERED',parentalPermissions:'NOT DELIVERED',interversionIntegrity:'NOT DELIVERED',tests:['tests/e05-native.cjs','tests/e05.cjs','tests/e05-edge.cjs'],widths:[320,390,1440],captures:'docs/dobby-v7/evidence/e05/'};
m.chatContract={mission:'E02',document:'docs/dobby-v7/E02-PARLER-A-DOBBY.md',primarySource:'dobby_conversation_avec_dobby_1',route:'famille.html#chat',tests:['tests/e02.cjs','tests/e02-edge.cjs','tests/e02-voice-history.cjs'],widths:[320,390,1440],history:'native IndexedDB meta by authenticated userId; anonymous runtime only; legacy unowned history preserved and not attributed',remoteSync:'blocked: no validated author-only backend',speech:'native browser APIs; logic tested with simulated API boundaries; physical iPhone pending',captures:'docs/dobby-v7/evidence/e02/README.md'};for(const row of m.screens.filter(s=>s.id==='dobby_conversation_avec_dobby_1'||s.id==='dobby_conversation_avec_dobby_2'))row.verification.e02=m.chatContract;
const home=m.screens.find(s=>s.id==='dobby_l_choppe_du_chemin_de_traverse');home.verification.e01=m.homeContract;
fs.writeFileSync(file,JSON.stringify(m,null,2)+'\n');
}

require('./build-onboarding.cjs');

// The historical source census is distinct from the current review decisions.
{
 const file=path.join(__dirname,'route-manifest.json'),m=JSON.parse(fs.readFileSync(file));
 m.reviewConsolidation={reference:'a84f67acf8f5cbfd59475c2137ec70e1a20732f7',matrix:'docs/dobby-v7/CONSOLIDATION-MATRIX.json',report:'docs/dobby-v7/CONSOLIDATION.md',protected:['E03','E08 design'],blocked:['E04-02 native series/occurrence protocol','E05-01 official crest publication rights','E06-04 official crest dependency only'],deferred:['E06-08 server operations','E07-01','E07-02','E07-03','E07-09','Menu reconstruction','Family reconstruction'],sortingHat:{type:'original substitute; not original Stitch media',asset:'assets/onboarding/sorting-hat-original.svg',provenance:'assets/onboarding/sorting-hat-original.provenance.json'},speech:'explicit send; browser natural end pauses and keeps transcript; physical Safari not verified',preferences:'one native st.stitchPreferences record including ceremony'};
 m.e073Review={sourceBase:'66a1395bb95ff7b9a7e2d1b981f5a8773070c03e',scope:['taverne','recipes','recipe-entry','recipe-ai'],sourceCountUnchanged:true,workflowRoutes:[{view:'recipe-entry',templateAlias:'recipe-add',type:'choice-and-management'},{view:'recipe-ai',templateAlias:'batch',type:'guided-external-AI-import'}],contract:'dobby-recipes V1 retained, V2 enriched; native validator/writer',recipePhotos:'existing native local blob store; family transfer not connected',subpagesNotReviewed:['recipe','pick','cook','tm5','shop'],report:'docs/dobby-v7/E07-3-TAVERNE-GRIMOIRE.md'};
 fs.writeFileSync(file,JSON.stringify(m,null,2)+'\n');
}

/* Real-account pilot packaging. No demo runtime, seed, storage fork or backend. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..');
const SOURCE='0a8e1ed674bc4abdbfaca29435fa495b19b32df4',TESTED='3ceb14bbf76c7534f6862a7cb1921c894ea3f325';
const PROJECT='https://pqcdkrwljgvgagzwrcmg.supabase.co';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function replaceOnce(source,marker,replacement){if(source.split(marker).length!==2)throw Error('Native pilot anchor changed: '+marker);return source.replace(marker,replacement);}
function transformMissions(source){
 const blocked="if(id==='missions'&&window.DobbyRunesPilot?.requireMissionsV2)throw Error('RPC Runes V2 indisponibles. Missions, historique et demandes locales conservés en attente.');";
 source=replaceOnce(source,'function assertLocalRewardSharing(){if(runesV2Available())return;',"function assertLocalRewardSharing(){if(runesV2Available())return;if(window.DobbyRunesPilot?.requireMissionsV2)throw Error('RPC Runes V2 indisponibles. Missions, historique et demandes locales conservés en attente.');");
 // Recheck after async reads: capability may disappear during activation.
 for(const marker of ["if(id==='missions'&&runesV2Available()){await activateMissionsV2(remote);api.repaint();api.openModal();onSave();return;}","if(id==='missions'&&runesV2Available()){await activateMissionsV2(remote);activated++;continue;}"])source=replaceOnce(source,marker,marker+'\n'+blocked);
 source=replaceOnce(source,'function applyShared(id, payload) {',"function applyShared(id, payload) {\n  if(id==='missions'&&window.DobbyRunesPilot?.requireMissionsV2)assertLocalRewardSharing();");
 source=replaceOnce(source,"const remote=await readRow(id);if(!remote)throw Error('Version familiale inaccessible');verifyProtocol(state,remote);","const remote=await readRow(id);if(window.DobbyRunesPilot?.requireMissionsV2)assertLocalRewardSharing();if(!remote)throw Error('Version familiale inaccessible');verifyProtocol(state,remote);");
 source=replaceOnce(source,'async function syncOne(id) {',"async function syncOne(id) {\n  if(id==='missions'&&window.DobbyRunesPilot?.requireMissionsV2&&!runesV2Available())return;");
 source=replaceOnce(source,"  const info = states[def.id];\n  if (!info?.active)","  if(def.id==='missions'&&window.DobbyRunesPilot?.requireMissionsV2&&!runesV2Available())return 'RPC Runes V2 indisponibles — opérations locales en attente';\n  const info = states[def.id];\n  if (!info?.active)");
 // Protection belongs to the copied client, even when the notice fails to load.
 source=replaceOnce(source,"'use strict';","'use strict';\nconst dobbyPilotRequiresV2=true;");
 return source.replaceAll('window.DobbyRunesPilot?.requireMissionsV2','dobbyPilotRequiresV2');
}
function transformMissionActions(source){return replaceOnce(source,'function requiresSync(){',"function requiresSync(){return true; // Pilot: native queue is mandatory, independently of the notice.\n");}
function build({output,sourceSha}={}){
 const out=path.resolve(output||path.join(repo,'essai-dobby-runes-v2-pilot-20261111'));
 if(fs.existsSync(out))throw Error('Output must be a new directory: '+out);
 sourceSha=sourceSha||execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
 const csp="default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://lh3.googleusercontent.com; font-src 'self' data:; connect-src 'self' "+PROJECT+"; frame-src 'self'; object-src 'none'; form-action 'none'; base-uri 'self'";
 const records=[];
 function copy(file){
  const rel=path.relative(repo,file).split(path.sep).join('/'),target=path.join(out,rel),raw=fs.readFileSync(file);let bytes=raw;
  if(/\.html$/.test(file)){
   const runtime=path.relative(path.dirname(target),path.join(out,'pilot-runtime.js')).split(path.sep).join('/');
   let text=raw.toString().replace(/<link\b[^>]*href=["']https?:[^>]*>/gi,'');
   const heads=text.match(/<head\b[^>]*>/gi)||[];
   if(heads.length>1)throw Error('Multiple document heads: '+rel);
   if(heads.length===1)text=text.replace(heads[0],`${heads[0]}<meta http-equiv="Content-Security-Policy" content="${csp}"><script src="${runtime}"></script>`);
   else if(/<html\b|<!doctype/i.test(text))throw Error('Document head missing: '+rel);
   bytes=Buffer.from(text);
  }
  if(rel==='essai-stitch-v5-famille/family-modules.js')bytes=Buffer.from(transformMissions(raw.toString()));
  if(rel==='essai-stitch-v5-famille/family-missions.js')bytes=Buffer.from(transformMissionActions(raw.toString()));
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
  records.push({path:rel,sourceSha256:sha(raw),sha256:sha(bytes),transformed:!bytes.equals(raw)});
 }
 function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','tests','.git'].includes(entry.name))continue;const file=path.join(dir,entry.name);entry.isDirectory()?walk(file):copy(file);}}
 fs.mkdirSync(out,{recursive:true});
 for(const dir of ['essai-stitch-v7','essai-stitch-v5-famille','essai-v6-preview/assets'])walk(path.join(repo,dir));
 const runtime=fs.readFileSync(path.join(__dirname,'runes-pilot/pilot-runtime.js'));fs.writeFileSync(path.join(out,'pilot-runtime.js'),runtime);
 const entry='essai-stitch-v7/traverse.html';
 fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./${entry}"><title>DOBBY — Pilote Runes V2</title></head><body><a href="./${entry}">Ouvrir le pilote Runes V2</a></body></html>\n`);
 fs.writeFileSync(path.join(out,'.nojekyll'),'');
 const manifest={version:'Runes V2 pilot',sourceSha,clientSourceSha:SOURCE,previouslyTestedCode:TESTED,entry,supabaseProject:'pqcdkrwljgvgagzwrcmg',realBackendEnabled:true,realBackendVerified:false,storage:'native-existing-keys-no-reset-no-seed',missionsPolicy:'V2 capability required; no V1 fallback; new local rewards pending',sourceDirty:!!execFileSync('git',['status','--porcelain','--','essai-stitch-v7','essai-stitch-v5-famille','essai-v6-preview/assets','scripts/build-dobby-runes-pilot.cjs','scripts/runes-pilot'],{cwd:repo,encoding:'utf8'}).trim(),runtimeSha256:sha(runtime),files:records.sort((a,b)=>a.path.localeCompare(b.path))};
 fs.writeFileSync(path.join(out,'pilot-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('RUNES_PILOT_BUILD',sourceSha,records.length+' files',out);return manifest;
}
module.exports={build,transformMissions,transformMissionActions};
if(require.main===module){const i=process.argv.indexOf('--output');build({output:i<0?undefined:process.argv[i+1]});}
